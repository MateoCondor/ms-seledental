/**
 * Controlador de Citas
 * Maneja la gestión completa de citas médicas en arquitectura de microservicios
 */

const Cita = require('../models/Cita');
const { successResponse, errorResponse } = require('../utils/responses');
const { 
  publishCitaCreated, 
  publishCitaUpdated, 
  publishCitaCancelled, 
  publishCitaRescheduled 
} = require('../config/rabbitmq');
const { 
  emitCitaUpdate,
  emitHorariosUpdated,
  emitNuevaCita,
  emitCitaAsignada,
  emitCitaActualizada,
  emitCitaCancelada
} = require('../config/websocket');
const { obtenerUsuarioPorId, obtenerOdontologosDisponibles } = require('../services/usuarioService');
const { Op } = require('sequelize');

/**
 * Obtiene las categorías disponibles según el tipo de consulta
 */
const obtenerCategorias = async (req, res) => {
  try {
    const categorias = {
      general: [
        { value: 'odontologia_general', label: 'Odontología general' },
        { value: 'diagnostico_especialidad', label: 'Diagnóstico por especialidad' }
      ],
      control: [
        { value: 'ortodoncia', label: 'Ortodoncia' },
        { value: 'endodoncia', label: 'Endodoncia' },
        { value: 'cirugia_oral', label: 'Cirugía oral' },
        { value: 'protesis', label: 'Prótesis' },
        { value: 'periodoncia', label: 'Periodoncia' }
      ],
      urgencia: [
        { value: 'cirugia_oral_urgencia', label: 'Cirugía oral' },
        { value: 'endodoncia_urgencia', label: 'Endodoncia' },
        { value: 'rehabilitacion', label: 'Rehabilitación' },
        { value: 'trauma_dental', label: 'Trauma dental' }
      ]
    };

    return successResponse(res, 200, 'Categorías obtenidas correctamente', { categorias });
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    return errorResponse(res, 500, 'Error al obtener las categorías');
  }
};

/**
 * Obtiene los horarios disponibles para una fecha específica
 */
const obtenerHorariosDisponibles = async (req, res) => {
  try {
    const { fecha } = req.query;

    if (!fecha) {
      return errorResponse(res, 400, 'La fecha es requerida');
    }

    // Usar el mismo método de construcción de fecha
    const [año, mes, dia] = fecha.split('-').map(Number);
    const fechaSeleccionada = new Date(año, mes - 1, dia);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaSeleccionada < hoy) {
      return errorResponse(res, 400, 'No se pueden consultar horarios de fechas pasadas');
    }

    // Horarios de trabajo (8:00 AM a 6:00 PM)
    const horariosBase = [
      '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30'
    ];

    // Obtener citas ya agendadas para esa fecha
    const fechaInicio = new Date(año, mes - 1, dia, 0, 0, 0, 0);
    const fechaFin = new Date(año, mes - 1, dia, 23, 59, 59, 999);

    console.log('Buscando citas entre:', fechaInicio, 'y', fechaFin);

    const citasOcupadas = await Cita.findAll({
      where: {
        fechaHora: {
          [Op.between]: [fechaInicio, fechaFin]
        },
        estado: {
          [Op.notIn]: ['cancelada', 'no_asistio']
        }
      },
      attributes: ['fechaHora', 'duracion']
    });

    console.log('Citas ocupadas encontradas:', citasOcupadas.length);

    // Filtrar horarios disponibles considerando la duración de 1 hora
    const horariosDisponibles = horariosBase.filter(horario => {
      const [hora, minuto] = horario.split(':').map(Number);
      const fechaHorario = new Date(año, mes - 1, dia, hora, minuto, 0, 0);
      
      // Verificar si el horario está ocupado
      const estaOcupado = citasOcupadas.some(cita => {
        const inicioCita = new Date(cita.fechaHora);
        const finCita = new Date(inicioCita.getTime() + (cita.duracion * 60000));
        const finHorario = new Date(fechaHorario.getTime() + (60 * 60000));
        
        return (fechaHorario < finCita && finHorario > inicioCita);
      });
      
      return !estaOcupado;
    });

    return successResponse(res, 200, 'Horarios disponibles obtenidos correctamente', {
      fecha,
      horariosDisponibles
    });
  } catch (error) {
    console.error('Error al obtener horarios disponibles:', error);
    return errorResponse(res, 500, 'Error al obtener los horarios disponibles');
  }
};

/**
 * Crea una nueva cita
 */
const crearCita = async (req, res) => {
  try {
    const { 
      tipoConsulta, 
      categoria, 
      fechaHora, 
      detalles 
    } = req.body;

    // Validaciones básicas
    if (!tipoConsulta || !categoria || !fechaHora) {
      return errorResponse(res, 400, 'Tipo de consulta, categoría y fecha/hora son requeridos');
    }

    let clienteReal = null;
    // Obtener el token del header Authorization para pasarlo al usuario-service
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // Si es un cliente autenticado, usar su ID del token
    if (req.usuario && req.usuario.rol === 'cliente') {
      // Usar los datos del token directamente si están completos
      if (req.usuario.perfilCompleto) {
        clienteReal = req.usuario;
      } else {
        // Si no está completo el perfil en el token, consultar el servicio
        clienteReal = await obtenerUsuarioPorId(req.usuario.id, token);
        if (!clienteReal) {
          // Si no se encuentra en los servicios, usar los datos del token
          clienteReal = req.usuario;
        }
      }

      // Validar que el perfil del cliente esté completo
      if (!clienteReal.perfilCompleto) {
        return errorResponse(res, 400, 'Debe completar su perfil antes de agendar una cita');
      }
    } else {
      // Si es admin/recepcionista, pueden especificar el clienteId
      const { clienteId } = req.body;
      if (!clienteId) {
        return errorResponse(res, 400, 'clienteId es requerido');
      }
      
      clienteReal = await obtenerUsuarioPorId(clienteId, token);
      if (!clienteReal || clienteReal.rol !== 'cliente') {
        return errorResponse(res, 400, 'Cliente no válido');
      }
    }

    // Crear la fecha correctamente con timezone local
    // Parsear la fecha del formato "YYYY-MM-DDTHH:mm:ss"
    const [fechaParte, horaParte] = fechaHora.split('T');
    const [año, mes, dia] = fechaParte.split('-').map(Number);
    const [hora, minuto] = horaParte.split(':').map(Number);

    // Crear fecha en timezone local (no UTC)
    const fechaCita = new Date(año, mes - 1, dia, hora, minuto, 0, 0);

    console.log('Fecha recibida:', fechaHora);
    console.log('Fecha procesada:', fechaCita);

    const ahora = new Date();

    if (fechaCita <= ahora) {
      return errorResponse(res, 400, 'La fecha de la cita debe ser futura');
    }

    // Verificar disponibilidad del horario considerando duración de 1 hora
    const fechaInicio = new Date(año, mes - 1, dia, 0, 0, 0, 0);
    const fechaFin = new Date(año, mes - 1, dia, 23, 59, 59, 999);

    const citasExistentes = await Cita.findAll({
      where: {
        fechaHora: {
          [Op.between]: [fechaInicio, fechaFin]
        },
        estado: {
          [Op.notIn]: ['cancelada', 'no_asistio']
        }
      }
    });

    console.log('Citas existentes encontradas:', citasExistentes.length);

    // Verificar conflicto de horario considerando que cada cita dura 1 hora
    const tieneConflicto = citasExistentes.some(citaExistente => {
      const inicioCitaExistente = new Date(citaExistente.fechaHora);
      const finCitaExistente = new Date(inicioCitaExistente.getTime() + (citaExistente.duracion * 60000));
      const finCitaNueva = new Date(fechaCita.getTime() + (60 * 60000));
      
      return (fechaCita < finCitaExistente && finCitaNueva > inicioCitaExistente);
    });

    if (tieneConflicto) {
      return errorResponse(res, 400, 'El horario seleccionado no está disponible');
    }

    console.log('Creando nueva cita para cliente:', clienteReal.id);

    // Crear la cita con duración por defecto de 60 minutos
    const nuevaCita = await Cita.create({
      clienteId: clienteReal.id,
      tipoConsulta,
      categoria,
      fechaHora: fechaCita,
      duracion: 60,
      detalles: detalles || null,
      estado: 'pendiente'
    });

    console.log('Cita creada exitosamente:', nuevaCita.id);

    // Publicar evento de cita creada
    await publishCitaCreated({
      id: nuevaCita.id,
      clienteId: nuevaCita.clienteId,
      tipoConsulta: nuevaCita.tipoConsulta,
      categoria: nuevaCita.categoria,
      fechaHora: nuevaCita.fechaHora,
      estado: nuevaCita.estado
    });

    // Emitir actualización por WebSocket
    emitCitaUpdate('CITA_CREATED', nuevaCita);

    // Notificar cambios en horarios vía WebSocket - usar la fecha original
    emitHorariosUpdated(fechaParte, { fecha: fechaParte });

    // Emitir evento específico para nueva cita con información del cliente
    emitNuevaCita({ 
      cita: nuevaCita,
      cliente: {
        id: clienteReal.id,
        nombre: clienteReal.nombre,
        apellido: clienteReal.apellido,
        email: clienteReal.email,
        celular: clienteReal.celular
      }
    });

    return successResponse(res, 201, 'Cita agendada correctamente', {
      cita: {
        ...nuevaCita.toJSON(),
        cliente: {
          id: clienteReal.id,
          nombre: clienteReal.nombre,
          apellido: clienteReal.apellido,
          email: clienteReal.email,
          celular: clienteReal.celular
        }
      }
    });
  } catch (error) {
    console.error('Error al crear cita:', error);

    if (error.name === 'SequelizeValidationError') {
      const errores = error.errors.map(err => ({
        campo: err.path,
        mensaje: err.message
      }));
      return errorResponse(res, 400, 'Error de validación', errores);
    }

    return errorResponse(res, 500, 'Error al agendar la cita');
  }
};

/**
 * Asigna un odontólogo a una cita
 */
const asignarOdontologo = async (req, res) => {
  try {
    const { id } = req.params;
    const { odontologoId, observaciones } = req.body;

    // Validaciones
    if (!odontologoId) {
      return errorResponse(res, 400, 'El ID del odontólogo es requerido');
    }

    // Buscar la cita
    const cita = await Cita.findByPk(id);
    if (!cita) {
      return errorResponse(res, 404, 'Cita no encontrada');
    }

    // Verificar que la cita esté en estado pendiente (solo pendientes pueden ser asignadas)
    if (cita.estado !== 'pendiente') {
      return errorResponse(res, 400, 'Solo se pueden asignar odontólogos a citas pendientes');
    }

    // Verificar que el odontólogo existe y está activo usando el servicio de usuarios
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const odontologo = await obtenerUsuarioPorId(odontologoId, token);
    if (!odontologo || odontologo.rol !== 'odontologo') {
      return errorResponse(res, 404, 'Odontólogo no encontrado o no válido');
    }

    // Verificar disponibilidad del odontólogo en esa fecha/hora
    const fechaCita = new Date(cita.fechaHora);
    const [año, mes, dia] = [fechaCita.getFullYear(), fechaCita.getMonth(), fechaCita.getDate()];
    const fechaInicio = new Date(año, mes, dia, 0, 0, 0, 0);
    const fechaFin = new Date(año, mes, dia, 23, 59, 59, 999);

    console.log('Verificando disponibilidad del odontólogo:', {
      odontologoId,
      fechaCita: fechaCita,
      fechaInicio,
      fechaFin
    });

    const citasOdontologoMismaFecha = await Cita.findAll({
      where: {
        odontologoId: odontologoId,
        fechaHora: {
          [Op.between]: [fechaInicio, fechaFin]
        },
        estado: {
          [Op.notIn]: ['cancelada', 'no_asistio']
        },
        id: {
          [Op.ne]: id // Excluir la cita actual
        }
      }
    });

    console.log('Citas del odontólogo en la misma fecha:', citasOdontologoMismaFecha.length);

    // Verificar conflictos de horario usando el mismo algoritmo que otras funciones
    const tieneConflicto = citasOdontologoMismaFecha.some(citaExistente => {
      const inicioCitaExistente = new Date(citaExistente.fechaHora);
      const finCitaExistente = new Date(inicioCitaExistente.getTime() + (citaExistente.duracion * 60000));
      const finCitaNueva = new Date(fechaCita.getTime() + (60 * 60000)); // Duración de 1 hora
      
      return (fechaCita < finCitaExistente && finCitaNueva > inicioCitaExistente);
    });

    if (tieneConflicto) {
      return errorResponse(res, 400, 'El odontólogo ya tiene una cita asignada en ese horario');
    }

    console.log('Asignando odontólogo a la cita:', {
      citaId: id,
      odontologoId,
      estadoAnterior: cita.estado
    });

    // Asignar el odontólogo
    await cita.update({
      odontologoId: odontologoId,
      estado: 'confirmada', // Cambiar estado a confirmada
      observaciones: observaciones || null,
      fechaAsignacion: new Date()
    });

    console.log('Odontólogo asignado exitosamente');

    // Publicar evento de cita actualizada
    await publishCitaUpdated(cita);

    // Emitir actualización por WebSocket
    emitCitaUpdate('CITA_ASSIGNED', cita);

    // Emitir evento específico para notificar la asignación al cliente
    emitCitaAsignada(cita.clienteId, { 
      cita: cita,
      odontologo: {
        id: odontologo.id,
        nombre: odontologo.nombre,
        apellido: odontologo.apellido
      }
    });

    return successResponse(res, 200, 'Odontólogo asignado correctamente', {
      cita: {
        ...cita.toJSON(),
        odontologo: {
          id: odontologo.id,
          nombre: odontologo.nombre,
          apellido: odontologo.apellido,
          email: odontologo.email
        }
      }
    });
  } catch (error) {
    console.error('Error al asignar odontólogo:', error);
    return errorResponse(res, 500, 'Error al asignar el odontólogo');
  }
};

/**
 * Reagenda una cita
 */
const reagendarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { fechaHora, motivoReagendamiento } = req.body;

    // Buscar la cita existente
    const cita = await Cita.findByPk(id);
    
    if (!cita) {
      return errorResponse(res, 404, 'Cita no encontrada');
    }

    // Verificar permisos - solo el cliente propietario o personal autorizado
    if (req.usuario.rol === 'cliente') {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      const clienteReal = await obtenerUsuarioPorId(req.usuario.id, token);
      if (!clienteReal || cita.clienteId !== clienteReal.id) {
        return errorResponse(res, 403, 'No tiene permisos para reagendar esta cita');
      }
    }

    // Verificar que la cita se pueda reagendar usando el método del modelo
    if (!cita.puedeSerReagendada()) {
      return errorResponse(res, 400, 'La cita no puede ser reagendada en su estado actual');
    }

    // Validar que la nueva fecha sea válida
    if (!fechaHora) {
      return errorResponse(res, 400, 'La nueva fecha y hora son requeridas');
    }

    // Parsear la nueva fecha usando el mismo método que crearCita
    const [fechaParte, horaParte] = fechaHora.split('T');
    const [año, mes, dia] = fechaParte.split('-').map(Number);
    const [hora, minuto] = horaParte.split(':').map(Number);
    
    // Crear fecha en timezone local (no UTC)
    const nuevaFechaCita = new Date(año, mes - 1, dia, hora, minuto, 0, 0);
    const ahora = new Date();

    console.log('Nueva fecha recibida:', fechaHora);
    console.log('Nueva fecha procesada:', nuevaFechaCita);

    if (nuevaFechaCita <= ahora) {
      return errorResponse(res, 400, 'La nueva fecha y hora debe ser futura');
    }

    // Verificar tiempo mínimo para reagendamiento (24 horas antes de la cita original)
    const fechaOriginal = new Date(cita.fechaHora);
    const horasRestantes = (fechaOriginal - ahora) / (1000 * 60 * 60);
    
    if (horasRestantes < 24 && req.usuario.rol === 'cliente') {
      return errorResponse(res, 400, 'Las citas deben reagendarse con al menos 24 horas de anticipación');
    }

    // Verificar disponibilidad del nuevo horario usando el mismo algoritmo que crearCita
    const fechaInicio = new Date(año, mes - 1, dia, 0, 0, 0, 0);
    const fechaFin = new Date(año, mes - 1, dia, 23, 59, 59, 999);

    const citasExistentes = await Cita.findAll({
      where: {
        fechaHora: {
          [Op.between]: [fechaInicio, fechaFin]
        },
        estado: {
          [Op.notIn]: ['cancelada', 'no_asistio']
        },
        id: {
          [Op.ne]: id // Excluir la cita actual del chequeo
        }
      }
    });

    console.log('Citas existentes encontradas para verificar conflicto:', citasExistentes.length);

    // Verificar conflicto de horario considerando duración de 1 hora
    const tieneConflicto = citasExistentes.some(citaExistente => {
      const inicioCitaExistente = new Date(citaExistente.fechaHora);
      const finCitaExistente = new Date(inicioCitaExistente.getTime() + (citaExistente.duracion * 60000));
      const finNuevaCita = new Date(nuevaFechaCita.getTime() + (60 * 60000));
      
      return (nuevaFechaCita < finCitaExistente && finNuevaCita > inicioCitaExistente);
    });

    if (tieneConflicto) {
      return errorResponse(res, 400, 'El nuevo horario seleccionado no está disponible');
    }

    // Guardar la fecha anterior para histórico
    const fechaAnterior = cita.fechaHora;

    // Actualizar la cita con la nueva fecha
    await cita.update({
      fechaHora: nuevaFechaCita,
      fechaAnterior: fechaAnterior,
      motivoReagendamiento: motivoReagendamiento || 'Reagendada por el usuario',
      fechaReagendamiento: new Date(),
      recordatorioEnviado: false // Reset recordatorio para nueva fecha
    });

    console.log('Cita reagendada exitosamente:', {
      id: cita.id,
      fechaAnterior: fechaAnterior,
      fechaNueva: nuevaFechaCita
    });

    // Publicar evento de cita reagendada
    await publishCitaRescheduled({
      ...cita.toJSON(),
      fechaAnterior
    });

    // Emitir actualización por WebSocket
    emitCitaActualizada(cita.clienteId, cita);

    // Notificar cambios en horarios para ambas fechas
    const fechaAnteriorString = `${fechaAnterior.getFullYear()}-${String(fechaAnterior.getMonth() + 1).padStart(2, '0')}-${String(fechaAnterior.getDate()).padStart(2, '0')}`;
    const fechaNuevaString = fechaParte;

    // Emitir actualización de horarios disponibles para ambas fechas
    emitHorariosUpdated(fechaAnteriorString, { fecha: fechaAnteriorString }); // Liberar horario anterior
    emitHorariosUpdated(fechaNuevaString, { fecha: fechaNuevaString });    // Ocupar nuevo horario

    return successResponse(res, 200, 'Cita reagendada correctamente', {
      cita
    });
  } catch (error) {
    console.error('Error al reagendar cita:', error);
    return errorResponse(res, 500, 'Error al reagendar la cita');
  }
};

/**
 * Cancela una cita
 */
const cancelarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivoCancelacion } = req.body;

    const cita = await Cita.findByPk(id);
    if (!cita) {
      return errorResponse(res, 404, 'Cita no encontrada');
    }

    // Verificar permisos
    if (req.usuario.rol === 'cliente') {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      const clienteReal = await obtenerUsuarioPorId(req.usuario.id, token);
      if (!clienteReal || cita.clienteId !== clienteReal.id) {
        return errorResponse(res, 403, 'No tiene permisos para cancelar esta cita');
      }
    }

    // Verificar que la cita se pueda cancelar usando el método del modelo
    if (!cita.puedeSerCancelada()) {
      return errorResponse(res, 400, 'La cita no puede ser cancelada en su estado actual');
    }

    // Verificar tiempo mínimo para cancelación (24 horas antes)
    const ahora = new Date();
    const fechaCita = new Date(cita.fechaHora);
    const horasRestantes = (fechaCita - ahora) / (1000 * 60 * 60);
    
    if (horasRestantes < 24 && req.usuario.rol === 'cliente') {
      return errorResponse(res, 400, 'Las citas deben cancelarse con al menos 24 horas de anticipación');
    }

    console.log('Cancelando cita:', {
      id: cita.id,
      fechaHora: cita.fechaHora,
      estadoAnterior: cita.estado
    });

    // Cancelar cita - ESTO LIBERA AUTOMÁTICAMENTE LOS HORARIOS
    await cita.update({
      estado: 'cancelada',
      motivoCancelacion: motivoCancelacion || 'Sin motivo especificado',
      fechaCancelacion: new Date()
    });

    console.log('Cita cancelada exitosamente, horarios liberados');

    // Publicar evento de cita cancelada
    await publishCitaCancelled(cita);

    // Emitir actualización por WebSocket
    emitCitaUpdate('CITA_CANCELLED', cita);

    // Obtener solo la fecha para notificación WebSocket
    const fechaSolo = new Date(cita.fechaHora);
    const fechaString = `${fechaSolo.getFullYear()}-${String(fechaSolo.getMonth() + 1).padStart(2, '0')}-${String(fechaSolo.getDate()).padStart(2, '0')}`;
    
    // Notificar cambios en horarios vía WebSocket - ESTO ACTUALIZA LOS HORARIOS DISPONIBLES EN TIEMPO REAL
    console.log('Notificando cambio de horarios para fecha:', fechaString);
    emitHorariosUpdated(fechaString, { fecha: fechaString });

    // Emitir evento específico de cita cancelada con información detallada
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      const clienteReal = await obtenerUsuarioPorId(cita.clienteId, token);
      emitCitaCancelada({ 
        cita: cita,
        cliente: clienteReal ? {
          id: clienteReal.id,
          nombre: clienteReal.nombre,
          apellido: clienteReal.apellido,
          email: clienteReal.email,
          celular: clienteReal.celular
        } : null
      });
    } catch (error) {
      console.warn('Error al obtener información del cliente para notificación:', error);
    }

    return successResponse(res, 200, 'Cita cancelada correctamente. Los horarios han sido liberados y están disponibles nuevamente.', {
      cita
    });
  } catch (error) {
    console.error('Error al cancelar cita:', error);
    return errorResponse(res, 500, 'Error al cancelar cita');
  }
};

/**
 * Obtiene las citas del cliente autenticado
 */
const obtenerCitasCliente = async (req, res) => {
  try {
    const { estado, limite = 50, pagina = 1 } = req.query;

    // Obtener el cliente real del microservicio de usuarios
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const clienteReal = await obtenerUsuarioPorId(req.usuario.id, token);
    if (!clienteReal) {
      return errorResponse(res, 400, 'Usuario no encontrado en el sistema');
    }

    let whereCondition = { clienteId: clienteReal.id };

    if (estado) {
      whereCondition.estado = estado;
    }

    const offset = (pagina - 1) * limite;

    const { count, rows: citas } = await Cita.findAndCountAll({
      where: whereCondition,
      order: [['fechaHora', 'DESC']],
      limit: parseInt(limite),
      offset: parseInt(offset)
    });

    // Obtener información de odontólogos si están asignados
    const citasConOdontologo = await Promise.all(
      citas.map(async (cita) => {
        const citaObj = cita.toJSON();
        if (citaObj.odontologoId) {
          try {
            const odontologo = await obtenerUsuarioPorId(citaObj.odontologoId, token);
            citaObj.odontologo = odontologo ? {
              id: odontologo.id,
              nombre: odontologo.nombre,
              apellido: odontologo.apellido
            } : null;
          } catch (error) {
            console.warn('Error al obtener odontólogo:', error);
            citaObj.odontologo = null;
          }
        }
        return citaObj;
      })
    );

    return successResponse(res, 200, 'Citas obtenidas correctamente', {
      citas: citasConOdontologo,
      totalCitas: count,
      paginaActual: parseInt(pagina),
      totalPaginas: Math.ceil(count / limite)
    });
  } catch (error) {
    console.error('Error al obtener citas del cliente:', error);
    return errorResponse(res, 500, 'Error al obtener las citas');
  }
};

/**
 * Obtiene las citas pendientes de asignación de odontólogo
 */
const obtenerCitasPendientes = async (req, res) => {
  try {
    const { limite = 50, pagina = 1 } = req.query;
    const offset = (pagina - 1) * limite;
    const token = req.header('Authorization')?.replace('Bearer ', '');

    const { count, rows: citas } = await Cita.findAndCountAll({
      where: {
        estado: 'pendiente',
        odontologoId: null
      },
      order: [['fechaHora', 'ASC']],
      limit: parseInt(limite),
      offset: parseInt(offset)
    });

    // Obtener información de clientes
    const citasConCliente = await Promise.all(
      citas.map(async (cita) => {
        const citaObj = cita.toJSON();
        try {
          const cliente = await obtenerUsuarioPorId(citaObj.clienteId, token);
          citaObj.cliente = cliente ? {
            id: cliente.id,
            nombre: cliente.nombre,
            apellido: cliente.apellido,
            email: cliente.email,
            celular: cliente.celular
          } : null;
        } catch (error) {
          console.warn('Error al obtener cliente:', error);
          citaObj.cliente = null;
        }
        return citaObj;
      })
    );

    return successResponse(res, 200, 'Citas pendientes obtenidas correctamente', {
      citas: citasConCliente,
      totalCitas: count,
      paginaActual: parseInt(pagina),
      totalPaginas: Math.ceil(count / limite)
    });
  } catch (error) {
    console.error('Error al obtener citas pendientes:', error);
    return errorResponse(res, 500, 'Error al obtener las citas pendientes');
  }
};

/**
 * Obtiene la lista de odontólogos disponibles
 */
const obtenerOdontologos = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const odontologos = await obtenerOdontologosDisponibles(token);
    
    return successResponse(res, 200, 'Odontólogos obtenidos correctamente', {
      odontologos
    });
  } catch (error) {
    console.error('Error al obtener odontólogos:', error);
    return errorResponse(res, 500, 'Error al obtener los odontólogos');
  }
};

module.exports = {
  obtenerCategorias,
  obtenerHorariosDisponibles,
  crearCita,
  asignarOdontologo,
  reagendarCita,
  cancelarCita,
  obtenerCitasCliente,
  obtenerCitasPendientes,
  obtenerOdontologos,
};
