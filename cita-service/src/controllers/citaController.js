/**
 * Controlador de Citas
 * Maneja la gestión completa de citas médicas
 */

const Cita = require('../models/Cita');
const { successResponse, errorResponse } = require('../utils/responses');
const { 
  publishCitaCreated, 
  publishCitaUpdated, 
  publishCitaCancelled, 
  publishCitaRescheduled 
} = require('../config/rabbitmq');
const { emitCitaUpdate } = require('../config/websocket');
const { obtenerUsuarioPorId, obtenerOdontologosDisponibles, obtenerUsuarioPorAuthId } = require('../services/usuarioService');
const { Op } = require('sequelize');

/**
 * Crea una nueva cita
 */
const crearCita = async (req, res) => {
  try {
    const { 
      clienteId, 
      tipoConsulta, 
      categoria, 
      fechaHora, 
      duracion, 
      detalles,
      prioridad 
    } = req.body;

    let clienteReal = null;

    // Si es un cliente autenticado, usar su ID del token
    if (req.usuario && req.usuario.rol === 'cliente') {
      clienteReal = await obtenerUsuarioPorAuthId(req.usuario.id);
      if (!clienteReal) {
        return errorResponse(res, 400, 'Usuario no encontrado en el sistema');
      }
    } else {
      // Si es admin/recepcionista, pueden especificar el clienteId
      if (!clienteId) {
        return errorResponse(res, 400, 'clienteId es requerido');
      }
      
      clienteReal = await obtenerUsuarioPorId(clienteId);
      if (!clienteReal || clienteReal.rol !== 'cliente') {
        return errorResponse(res, 400, 'Cliente no válido');
      }
    }

    // Verificar que la fecha no esté en el pasado
    const fechaCita = new Date(fechaHora);
    if (fechaCita <= new Date()) {
      return errorResponse(res, 400, 'La fecha de la cita debe ser futura');
    }

    // Verificar disponibilidad (no debe haber otra cita en el mismo horario)
    const citaExistente = await Cita.findOne({
      where: {
        fechaHora,
        estado: {
          [Op.in]: ['pendiente', 'confirmada']
        }
      }
    });

    if (citaExistente) {
      return errorResponse(res, 400, 'Ya existe una cita programada para esa fecha y hora');
    }

    // Crear la cita
    const nuevaCita = await Cita.create({
      clienteId: clienteReal.id,
      tipoConsulta,
      categoria,
      fechaHora,
      duracion: duracion || 60,
      detalles,
      prioridad: prioridad || 'media',
      estado: 'pendiente'
    });

    // Publicar evento de cita creada
    await publishCitaCreated({
      id: nuevaCita.id,
      clienteId: nuevaCita.clienteId,
      tipoConsulta: nuevaCita.tipoConsulta,
      categoria: nuevaCita.categoria,
      fechaHora: nuevaCita.fechaHora,
      estado: nuevaCita.estado,
      prioridad: nuevaCita.prioridad
    });

    // Emitir actualización por WebSocket
    emitCitaUpdate('CITA_CREATED', nuevaCita);

    return successResponse(res, 201, 'Cita creada exitosamente', {
      cita: nuevaCita
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

    return errorResponse(res, 500, 'Error al crear cita');
  }
};

/**
 * Obtiene todas las citas con filtros
 */
const obtenerCitas = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      clienteId,
      odontologoId,
      estado,
      tipoConsulta,
      fechaInicio,
      fechaFin,
      sortBy = 'fechaHora',
      sortOrder = 'ASC'
    } = req.query;

    // Construir filtros
    const where = {};

    if (clienteId) {
      where.clienteId = clienteId;
    }

    if (odontologoId) {
      where.odontologoId = odontologoId;
    }

    if (estado) {
      where.estado = estado;
    }

    if (tipoConsulta) {
      where.tipoConsulta = tipoConsulta;
    }

    if (fechaInicio && fechaFin) {
      where.fechaHora = {
        [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
      };
    } else if (fechaInicio) {
      where.fechaHora = {
        [Op.gte]: new Date(fechaInicio)
      };
    } else if (fechaFin) {
      where.fechaHora = {
        [Op.lte]: new Date(fechaFin)
      };
    }

    // Calcular offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Obtener citas con paginación
    const { count, rows: citas } = await Cita.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return successResponse(res, 200, 'Citas obtenidas exitosamente', {
      citas,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener citas:', error);
    return errorResponse(res, 500, 'Error al obtener citas');
  }
};

/**
 * Obtiene una cita por ID
 */
const obtenerCitaPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const cita = await Cita.findByPk(id);

    if (!cita) {
      return errorResponse(res, 404, 'Cita no encontrada');
    }

    return successResponse(res, 200, 'Cita obtenida exitosamente', {
      cita
    });
  } catch (error) {
    console.error('Error al obtener cita:', error);
    return errorResponse(res, 500, 'Error al obtener cita');
  }
};

/**
 * Asigna un odontólogo a una cita
 */
const asignarOdontologo = async (req, res) => {
  try {
    const { id } = req.params;
    const { odontologoId, observaciones } = req.body;

    const cita = await Cita.findByPk(id);
    if (!cita) {
      return errorResponse(res, 404, 'Cita no encontrada');
    }

    if (!cita.puedeSerReagendada()) {
      return errorResponse(res, 400, 'La cita no puede ser modificada en su estado actual');
    }

    // Verificar que el odontólogo existe y está disponible
    const odontologo = await obtenerUsuarioPorId(odontologoId);
    if (!odontologo || odontologo.rol !== 'odontologo') {
      return errorResponse(res, 400, 'Odontólogo no válido');
    }

    // Verificar que el odontólogo no tenga otra cita en el mismo horario
    const citaConflicto = await Cita.findOne({
      where: {
        odontologoId,
        fechaHora: cita.fechaHora,
        estado: {
          [Op.in]: ['pendiente', 'confirmada']
        },
        id: {
          [Op.ne]: id
        }
      }
    });

    if (citaConflicto) {
      return errorResponse(res, 400, 'El odontólogo ya tiene una cita programada en ese horario');
    }

    // Asignar odontólogo
    await cita.update({
      odontologoId,
      observaciones,
      fechaAsignacion: new Date(),
      estado: 'confirmada'
    });

    // Publicar evento de cita actualizada
    await publishCitaUpdated(cita);

    // Emitir actualización por WebSocket
    emitCitaUpdate('CITA_ASSIGNED', cita);

    return successResponse(res, 200, 'Odontólogo asignado exitosamente', {
      cita
    });
  } catch (error) {
    console.error('Error al asignar odontólogo:', error);
    return errorResponse(res, 500, 'Error al asignar odontólogo');
  }
};

/**
 * Reagenda una cita
 */
const reagendarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevaFechaHora, motivoReagendamiento } = req.body;

    const cita = await Cita.findByPk(id);
    if (!cita) {
      return errorResponse(res, 404, 'Cita no encontrada');
    }

    if (!cita.puedeSerReagendada()) {
      return errorResponse(res, 400, 'La cita no puede ser reagendada en su estado actual');
    }

    // Verificar que la nueva fecha no esté en el pasado
    const nuevaFecha = new Date(nuevaFechaHora);
    if (nuevaFecha <= new Date()) {
      return errorResponse(res, 400, 'La nueva fecha debe ser futura');
    }

    // Verificar disponibilidad en la nueva fecha
    const citaExistente = await Cita.findOne({
      where: {
        fechaHora: nuevaFecha,
        estado: {
          [Op.in]: ['pendiente', 'confirmada']
        },
        id: {
          [Op.ne]: id
        }
      }
    });

    if (citaExistente) {
      return errorResponse(res, 400, 'Ya existe una cita programada para la nueva fecha y hora');
    }

    // Reagendar cita
    const fechaAnterior = cita.fechaHora;
    await cita.update({
      fechaHora: nuevaFecha,
      fechaAnterior,
      motivoReagendamiento,
      fechaReagendamiento: new Date(),
      recordatorioEnviado: false // Reset recordatorio para nueva fecha
    });

    // Publicar evento de cita reagendada
    await publishCitaRescheduled({
      ...cita.toJSON(),
      fechaAnterior
    });

    // Emitir actualización por WebSocket
    emitCitaUpdate('CITA_RESCHEDULED', cita);

    return successResponse(res, 200, 'Cita reagendada exitosamente', {
      cita
    });
  } catch (error) {
    console.error('Error al reagendar cita:', error);
    return errorResponse(res, 500, 'Error al reagendar cita');
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

    if (!cita.puedeSerCancelada()) {
      return errorResponse(res, 400, 'La cita no puede ser cancelada en su estado actual');
    }

    // Cancelar cita
    await cita.update({
      estado: 'cancelada',
      motivoCancelacion
    });

    // Publicar evento de cita cancelada
    await publishCitaCancelled(cita);

    // Emitir actualización por WebSocket
    emitCitaUpdate('CITA_CANCELLED', cita);

    return successResponse(res, 200, 'Cita cancelada exitosamente', {
      cita
    });
  } catch (error) {
    console.error('Error al cancelar cita:', error);
    return errorResponse(res, 500, 'Error al cancelar cita');
  }
};

/**
 * Actualiza el estado de una cita
 */
const actualizarEstadoCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, notasOdontologo } = req.body;

    const cita = await Cita.findByPk(id);
    if (!cita) {
      return errorResponse(res, 404, 'Cita no encontrada');
    }

    const estadosValidos = ['pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada', 'no_asistio'];
    if (!estadosValidos.includes(estado)) {
      return errorResponse(res, 400, 'Estado no válido');
    }

    // Actualizar estado
    await cita.update({
      estado,
      notasOdontologo: notasOdontologo || cita.notasOdontologo
    });

    // Publicar evento de cita actualizada
    await publishCitaUpdated(cita);

    // Emitir actualización por WebSocket
    emitCitaUpdate('CITA_STATUS_UPDATED', cita);

    return successResponse(res, 200, 'Estado de cita actualizado exitosamente', {
      cita
    });
  } catch (error) {
    console.error('Error al actualizar estado de cita:', error);
    return errorResponse(res, 500, 'Error al actualizar estado de cita');
  }
};

/**
 * Obtiene citas por cliente
 */
const obtenerCitasPorCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { estado, fechaInicio, fechaFin } = req.query;

    const where = { clienteId };

    if (estado) {
      where.estado = estado;
    }

    if (fechaInicio && fechaFin) {
      where.fechaHora = {
        [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
      };
    }

    const citas = await Cita.findAll({
      where,
      order: [['fechaHora', 'DESC']]
    });

    return successResponse(res, 200, 'Citas del cliente obtenidas exitosamente', {
      citas
    });
  } catch (error) {
    console.error('Error al obtener citas del cliente:', error);
    return errorResponse(res, 500, 'Error al obtener citas del cliente');
  }
};

/**
 * Obtiene citas por odontólogo
 */
const obtenerCitasPorOdontologo = async (req, res) => {
  try {
    const { odontologoId } = req.params;
    const { estado, fechaInicio, fechaFin } = req.query;

    const where = { odontologoId };

    if (estado) {
      where.estado = estado;
    }

    if (fechaInicio && fechaFin) {
      where.fechaHora = {
        [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
      };
    }

    const citas = await Cita.findAll({
      where,
      order: [['fechaHora', 'ASC']]
    });

    return successResponse(res, 200, 'Citas del odontólogo obtenidas exitosamente', {
      citas
    });
  } catch (error) {
    console.error('Error al obtener citas del odontólogo:', error);
    return errorResponse(res, 500, 'Error al obtener citas del odontólogo');
  }
};

module.exports = {
  crearCita,
  obtenerCitas,
  obtenerCitaPorId,
  asignarOdontologo,
  reagendarCita,
  cancelarCita,
  actualizarEstadoCita,
  obtenerCitasPorCliente,
  obtenerCitasPorOdontologo
};
