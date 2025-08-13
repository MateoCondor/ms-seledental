/**
 * Controlador de Autenticación
 * Maneja registro, login y validación de usuarios
 */

const Usuario = require('../models/Usuario');
const { generarJWT, verificarJWT } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/responses');
const { publishUserCreated, publishUserLogin, publishUserUpdated, publishUserDeleted } = require('../config/rabbitmq');
const { Op } = require('sequelize');

/**
 * Registra un nuevo cliente (registro público)
 */
const registroCliente = async (req, res) => {
  try {
    const { nombre, apellido, email, password, confirmarPassword } = req.body;
    
    // Validar que las contraseñas coincidan
    if (password !== confirmarPassword) {
      return errorResponse(res, 400, 'Las contraseñas no coinciden');
    }
    
    // Verificar si el correo ya está registrado
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return errorResponse(res, 400, 'El correo electrónico ya está registrado');
    }
    
    // Crear el nuevo usuario cliente
    const nuevoUsuario = await Usuario.create({
      nombre,
      apellido,
      email,
      password,
      rol: 'cliente',
      perfilCompleto: false
    });
    
    // Generar JWT para el nuevo usuario
    const token = generarJWT(nuevoUsuario);
    
    // Publicar evento de usuario creado
    await publishUserCreated({
      id: nuevoUsuario.id,
      nombre: nuevoUsuario.nombre,
      apellido: nuevoUsuario.apellido,
      email: nuevoUsuario.email,
      rol: nuevoUsuario.rol,
      perfilCompleto: nuevoUsuario.perfilCompleto
    });
    
    // Responder con los datos del usuario
    return successResponse(res, 201, 'Cliente registrado exitosamente', {
      usuario: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        apellido: nuevoUsuario.apellido,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
        perfilCompleto: nuevoUsuario.perfilCompleto
      },
      token
    });
  } catch (error) {
    console.error('Error en registro de cliente:', error);
    
    if (error.name === 'SequelizeValidationError') {
      const errores = error.errors.map(err => ({
        campo: err.path,
        mensaje: err.message
      }));
      return errorResponse(res, 400, 'Error de validación', errores);
    }
    
    return errorResponse(res, 500, 'Error al registrar cliente');
  }
};

/**
 * Registra un nuevo usuario en el sistema (para administradores)
 */
const registro = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol } = req.body;
    
    // Verificar si el correo ya está registrado
    const usuarioExistente = await Usuario.findOne({ where: { email } });
    if (usuarioExistente) {
      return errorResponse(res, 400, 'El correo electrónico ya está registrado');
    }
    
    // Validar el rol
    const rolesValidos = ['administrador', 'recepcionista', 'cliente', 'odontologo'];
    if (rol && !rolesValidos.includes(rol)) {
      return errorResponse(res, 400, 'Rol no válido', { rolesValidos });
    }
    
    // Crear el nuevo usuario
    const nuevoUsuario = await Usuario.create({
      nombre,
      apellido,
      email,
      password,
      rol: rol || 'cliente',
      perfilCompleto: rol === 'cliente' ? false : true
    });
    
    // Generar JWT para el nuevo usuario
    const token = generarJWT(nuevoUsuario);
    
    // Publicar evento de usuario creado
    await publishUserCreated({
      id: nuevoUsuario.id,
      nombre: nuevoUsuario.nombre,
      apellido: nuevoUsuario.apellido,
      email: nuevoUsuario.email,
      rol: nuevoUsuario.rol,
      perfilCompleto: nuevoUsuario.perfilCompleto
    });
    
    // Responder con los datos del usuario
    return successResponse(res, 201, 'Usuario registrado exitosamente', {
      usuario: {
        id: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        apellido: nuevoUsuario.apellido,
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
        perfilCompleto: nuevoUsuario.perfilCompleto
      },
      token
    });
  } catch (error) {
    console.error('Error en registro de usuario:', error);
    
    if (error.name === 'SequelizeValidationError') {
      const errores = error.errors.map(err => ({
        campo: err.path,
        mensaje: err.message
      }));
      return errorResponse(res, 400, 'Error de validación', errores);
    }
    
    return errorResponse(res, 500, 'Error al registrar usuario');
  }
};

/**
 * Inicia sesión para un usuario existente
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Verificar que se proporcionaron email y password
    if (!email || !password) {
      return errorResponse(res, 400, 'Por favor, proporcione email y contraseña');
    }

    // Buscar el usuario por email
    const usuario = await Usuario.findOne({ where: { email } });
    if (!usuario) {
      return errorResponse(res, 401, 'Correo electrónico no registrado');
    }
    
    // Verificar si el usuario está activo
    if (!usuario.activo) {
      return errorResponse(res, 403, 'Usuario desactivado. Contacte al administrador');
    }
    
    // Verificar la contraseña
    const passwordCorrecta = await usuario.verificarPassword(password);
    if (!passwordCorrecta) {
      return errorResponse(res, 401, 'Contraseña incorrecta');
    }
    
    // Generar JWT
    const token = generarJWT(usuario);
    
    // Publicar evento de login
    await publishUserLogin(usuario.id, {
      email: usuario.email,
      rol: usuario.rol,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Responder con los datos del usuario y el token
    return successResponse(res, 200, 'Inicio de sesión exitoso', {
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        perfilCompleto: usuario.perfilCompleto || true
      },
      token
    });
  } catch (error) {
    console.error('Error en login de usuario:', error);
    return errorResponse(res, 500, 'Error al iniciar sesión');
  }
};

/**
 * Valida un token JWT
 */
const validarToken = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return errorResponse(res, 401, 'Token no proporcionado');
    }
    
    const decoded = verificarJWT(token);
    const usuario = await Usuario.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!usuario) {
      return errorResponse(res, 401, 'Usuario no encontrado');
    }
    
    if (!usuario.activo) {
      return errorResponse(res, 403, 'Usuario desactivado');
    }
    
    return successResponse(res, 200, 'Token válido', {
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        perfilCompleto: usuario.perfilCompleto || true
      }
    });
  } catch (error) {
    console.error('Error al validar token:', error);
    return errorResponse(res, 401, 'Token inválido');
  }
};

/**
 * Obtiene el perfil del usuario autenticado
 */
const obtenerPerfil = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    
    const usuario = await Usuario.findByPk(usuarioId, {
      attributes: { exclude: ['password'] }
    });
    
    if (!usuario) {
      return errorResponse(res, 404, 'Usuario no encontrado');
    }
    
    return successResponse(res, 200, 'Perfil obtenido exitosamente', {
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        perfilCompleto: usuario.perfilCompleto || true,
        activo: usuario.activo,
        fechaUltimoLogin: usuario.fechaUltimoLogin,
        createdAt: usuario.createdAt,
        updatedAt: usuario.updatedAt
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return errorResponse(res, 500, 'Error al obtener perfil');
  }
};

/**
 * Endpoint interno para obtener todos los usuarios (solo para otros microservicios)
 */
const obtenerUsuariosInternos = async (req, res) => {
  try {
    // Verificar que sea una llamada interna
    const internalService = req.headers['x-internal-service'];
    if (!internalService) {
      return errorResponse(res, 403, 'Acceso denegado - Solo servicios internos');
    }

    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['password'] },
      order: [['id', 'ASC']]
    });

    return successResponse(res, 200, 'Usuarios obtenidos exitosamente', {
      usuarios,
      total: usuarios.length
    });
  } catch (error) {
    console.error('Error al obtener usuarios internos:', error);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
};

/**
 * Completa el perfil de un cliente
 */
const completarPerfil = async (req, res) => {
  try {
    const { cedula, fechaNacimiento, celular, direccion } = req.body;
    const usuarioId = req.usuario.id;
    
    // Buscar el usuario
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      return errorResponse(res, 404, 'Usuario no encontrado');
    }
    
    // Verificar que sea un cliente
    if (usuario.rol !== 'cliente') {
      return errorResponse(res, 403, 'Solo los clientes pueden completar este perfil');
    }
    
    // Verificar si la cédula ya está en uso por otro usuario
    if (cedula) {
      const usuarioConCedula = await Usuario.findOne({ 
        where: { 
          cedula,
          id: { [Op.ne]: usuarioId } // Excluir el usuario actual
        } 
      });
      if (usuarioConCedula) {
        return errorResponse(res, 400, 'La cédula ya está registrada por otro usuario');
      }
    }
    
    // Actualizar el usuario
    await usuario.update({
      cedula,
      fechaNacimiento,
      celular,
      direccion,
      perfilCompleto: true
    });

    // Publicar evento de usuario actualizado
    await publishUserUpdated({
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
      cedula: usuario.cedula,
      fechaNacimiento: usuario.fechaNacimiento,
      celular: usuario.celular,
      direccion: usuario.direccion,
      perfilCompleto: usuario.perfilCompleto,
      activo: usuario.activo
    });
    
    // Obtener el usuario actualizado sin la contraseña
    const usuarioActualizado = await Usuario.findByPk(usuarioId, {
      attributes: { exclude: ['password'] }
    });
    
    return successResponse(res, 200, 'Perfil completado correctamente', {
      usuario: {
        id: usuarioActualizado.id,
        nombre: usuarioActualizado.nombre,
        apellido: usuarioActualizado.apellido,
        email: usuarioActualizado.email,
        cedula: usuarioActualizado.cedula,
        fechaNacimiento: usuarioActualizado.fechaNacimiento,
        celular: usuarioActualizado.celular,
        direccion: usuarioActualizado.direccion,
        rol: usuarioActualizado.rol,
        perfilCompleto: usuarioActualizado.perfilCompleto
      }
    });
  } catch (error) {
    console.error('Error al completar perfil:', error);
    
    // Manejar errores de validación de Sequelize
    if (error.name === 'SequelizeValidationError') {
      const errores = error.errors.map(err => ({
        campo: err.path,
        mensaje: err.message
      }));
      return errorResponse(res, 400, 'Error de validación', errores);
    }
    
    return errorResponse(res, 500, 'Error al completar el perfil');
  }
};

/**
 * Actualiza un usuario (solo para administradores o el propio usuario)
 */
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizacion = req.body;

    // Buscar usuario a actualizar
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return errorResponse(res, 404, 'Usuario no encontrado');
    }

    // Solo el propio usuario o un administrador puede actualizar
    if (
      req.usuario.rol !== 'administrador' &&
      req.usuario.id !== usuario.id
    ) {
      return errorResponse(res, 403, 'No autorizado para actualizar este usuario');
    }

    // No permitir actualizar campos sensibles
    delete datosActualizacion.id;
    delete datosActualizacion.email;
    delete datosActualizacion.password;
    delete datosActualizacion.rol; // Solo admin puede cambiar rol (opcional, refuerza seguridad)

    // Si es admin y quiere cambiar el rol, permitirlo
    if (req.usuario.rol === 'administrador' && datosActualizacion.rol) {
      usuario.rol = datosActualizacion.rol;
    }

    // Actualizar usuario
    await usuario.update(datosActualizacion);

    // Publicar evento de usuario actualizado
    await publishUserUpdated({
      id: usuario.id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
      cedula: usuario.cedula,
      fechaNacimiento: usuario.fechaNacimiento,
      celular: usuario.celular,
      direccion: usuario.direccion,
      perfilCompleto: usuario.perfilCompleto,
      activo: usuario.activo
    });

    // Responder con usuario actualizado (sin password)
    return successResponse(res, 200, 'Usuario actualizado exitosamente', {
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        rol: usuario.rol,
        perfilCompleto: usuario.perfilCompleto,
        activo: usuario.activo,
        cedula: usuario.cedula,
        fechaNacimiento: usuario.fechaNacimiento,
        celular: usuario.celular,
        direccion: usuario.direccion,
        createdAt: usuario.createdAt,
        updatedAt: usuario.updatedAt
      }
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);

    if (error.name === 'SequelizeValidationError') {
      const errores = error.errors.map(err => ({
        campo: err.path,
        mensaje: err.message
      }));
      return errorResponse(res, 400, 'Error de validación', errores);
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return errorResponse(res, 400, 'Ya existe un usuario con esos datos únicos');
    }

    return errorResponse(res, 500, 'Error al actualizar usuario');
  }
};

/**
 * Elimina un usuario (desactivación lógica)
 */
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return errorResponse(res, 404, 'Usuario no encontrado');
    }

    // Solo administradores pueden eliminar usuarios
    if (req.usuario.rol !== 'administrador') {
      return errorResponse(res, 403, 'No autorizado para eliminar usuarios');
    }

    // No permitir que un administrador se elimine a sí mismo
    if (req.usuario.id === usuario.id) {
      return errorResponse(res, 400, 'No puedes eliminarte a ti mismo');
    }

    // Desactivar usuario (eliminación lógica)
    await usuario.update({ activo: false });

    // Publicar evento de usuario eliminado
    await publishUserDeleted(usuario.id);

    return successResponse(res, 200, 'Usuario eliminado exitosamente', {
      usuario: {
        id: usuario.id,
        email: usuario.email,
        activo: usuario.activo
      }
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return errorResponse(res, 500, 'Error al eliminar usuario');
  }
};

module.exports = {
  registroCliente,
  registro,
  login,
  completarPerfil,
  validarToken,
  obtenerPerfil,
  obtenerUsuariosInternos,
  actualizarUsuario,
  eliminarUsuario
};
