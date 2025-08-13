/**
 * Controlador de Usuarios
 * Maneja la gestión completa de usuarios y perfiles
 */

const Usuario = require('../models/Usuario');
const { successResponse, errorResponse } = require('../utils/responses');
const { publishProfileUpdated, publishUserUpdated, publishUserDeleted } = require('../config/rabbitmq');
const { Op } = require('sequelize');
const axios = require('axios');
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';


/**
 * Obtiene todos los usuarios con filtros opcionales
 */
const obtenerUsuarios = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      rol, 
      activo, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Construir filtros
    const where = {};
    
    if (rol) {
      where.rol = rol;
    }
    
    if (activo !== undefined) {
      where.activo = activo === 'true';
    }
    
    if (search) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${search}%` } },
        { apellido: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { cedula: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Calcular offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Obtener usuarios con paginación
    const { count, rows: usuarios } = await Usuario.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return successResponse(res, 200, 'Usuarios obtenidos exitosamente', {
      usuarios,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return errorResponse(res, 500, 'Error al obtener usuarios');
  }
};

/**
 * Obtiene un usuario por ID
 */
const obtenerUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id, {
      attributes: { exclude: ['password'] }
    });

    if (!usuario) {
      return errorResponse(res, 404, 'Usuario no encontrado');
    }

    return successResponse(res, 200, 'Usuario obtenido exitosamente', {
      usuario
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return errorResponse(res, 500, 'Error al obtener usuario');
  }
};

/**
 * Crea un nuevo usuario
 */
const crearUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol } = req.body;

    // Registrar usuario solo en auth-service
    const registroResponse = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/registro`,
      { nombre, apellido, email, password, rol },
      {
        headers: {
          'Authorization': req.header('Authorization')
        }
      }
    );

    if (!registroResponse.data.success) {
      return errorResponse(res, 400, 'No se pudo crear el usuario en auth-service');
    }

    const usuarioAuth = registroResponse.data.data.usuario;

    // Publicar evento de usuario creado
    await publishUserUpdated(usuarioAuth);

    return successResponse(res, 201, 'Usuario creado exitosamente', {
      usuario: usuarioAuth
    });
  } catch (error) {
    if (error.response && error.response.data) {
      return errorResponse(res, error.response.status, error.response.data.error?.message || 'Error al crear usuario');
    }
    return errorResponse(res, 500, 'Error al crear usuario');
  }
};

/**
 * Actualiza un usuario
 */
const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizacion = req.body;

    // Verificar que el usuario existe
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return errorResponse(res, 404, 'Usuario no encontrado');
    }

    // No permitir actualizar algunos campos sensibles
    delete datosActualizacion.id;
    delete datosActualizacion.email; // El email se actualiza desde auth-service
    delete datosActualizacion.password; // La contraseña se actualiza desde auth-service

    // Actualizar usuario
    await usuario.update(datosActualizacion);

    // Publicar evento de usuario actualizado
    await publishUserUpdated(usuario.toSafeObject());

    return successResponse(res, 200, 'Usuario actualizado exitosamente', {
      usuario: usuario.toSafeObject()
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
 * Elimina un usuario (soft delete)
 */
const eliminarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return errorResponse(res, 404, 'Usuario no encontrado');
    }

    // Realizar soft delete desactivando el usuario
    await usuario.update({ activo: false });

    // Publicar evento de usuario eliminado
    await publishUserDeleted(id);

    return successResponse(res, 200, 'Usuario eliminado exitosamente');
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return errorResponse(res, 500, 'Error al eliminar usuario');
  }
};


/**
 * Obtiene un usuario por email
 */
const obtenerUsuarioPorEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const usuario = await Usuario.findOne({
      where: { email },
      attributes: { exclude: ['password'] }
    });

    if (!usuario) {
      return errorResponse(res, 404, 'Usuario no encontrado');
    }

    return successResponse(res, 200, 'Usuario obtenido exitosamente', {
      usuario
    });
  } catch (error) {
    console.error('Error al obtener usuario por email:', error);
    return errorResponse(res, 500, 'Error al obtener usuario');
  }
};

/**
 * Crea un usuario internamente (para sincronización con auth-service)
 */
const crearUsuarioInterno = async (req, res) => {
  try {
    const userData = req.body;

    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findOne({ 
      where: { email: userData.email } 
    });

    if (usuarioExistente) {
      return errorResponse(res, 400, 'El usuario ya existe');
    }

    // Crear usuario con el ID proporcionado (para mantener sincronización)
    const nuevoUsuario = await Usuario.create(userData);

    return successResponse(res, 201, 'Usuario creado internamente', {
      usuario: nuevoUsuario.toSafeObject()
    });
  } catch (error) {
    console.error('Error al crear usuario interno:', error);

    if (error.name === 'SequelizeValidationError') {
      const errores = error.errors.map(err => ({
        campo: err.path,
        mensaje: err.message
      }));
      return errorResponse(res, 400, 'Error de validación', errores);
    }

    return errorResponse(res, 500, 'Error al crear usuario interno');
  }
};

/**
 * Completa el perfil de un usuario
 */
const completarPerfil = async (req, res) => {
  try {
    const { id } = req.params;
    const { cedula, fechaNacimiento, celular, direccion } = req.body;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return errorResponse(res, 404, 'Usuario no encontrado');
    }

    // Verificar si la cédula ya está en uso por otro usuario
    if (cedula) {
      const usuarioConCedula = await Usuario.findOne({ 
        where: { 
          cedula,
          id: { [Op.ne]: id }
        } 
      });
      if (usuarioConCedula) {
        return errorResponse(res, 400, 'La cédula ya está registrada por otro usuario');
      }
    }

    // Actualizar usuario
    await usuario.update({
      cedula,
      fechaNacimiento,
      celular,
      direccion,
      perfilCompleto: true
    });

    // Publicar evento de perfil actualizado
    await publishProfileUpdated(usuario.toSafeObject());

    return successResponse(res, 200, 'Perfil completado exitosamente', {
      usuario: usuario.toSafeObject()
    });
  } catch (error) {
    console.error('Error al completar perfil:', error);

    if (error.name === 'SequelizeValidationError') {
      const errores = error.errors.map(err => ({
        campo: err.path,
        mensaje: err.message
      }));
      return errorResponse(res, 400, 'Error de validación', errores);
    }

    return errorResponse(res, 500, 'Error al completar perfil');
  }
};

/**
 * Actualiza el estado de perfil completo
 */
const actualizarPerfilCompleto = async (req, res) => {
  try {
    const { id } = req.params;
    const { perfilCompleto } = req.body;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return errorResponse(res, 404, 'Usuario no encontrado');
    }

    await usuario.update({ perfilCompleto });

    // Publicar evento de usuario actualizado
    await publishUserUpdated(usuario.toSafeObject());

    return successResponse(res, 200, 'Estado de perfil actualizado', {
      usuario: usuario.toSafeObject()
    });
  } catch (error) {
    console.error('Error al actualizar perfil completo:', error);
    return errorResponse(res, 500, 'Error al actualizar perfil completo');
  }
};

/**
 * Sincroniza un usuario desde auth-service por ID
 */
const sincronizarUsuarioPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.header('Authorization');

    // Verificar si el usuario ya existe
    const usuarioExistente = await Usuario.findByPk(id);
    if (usuarioExistente) {
      return successResponse(res, 200, 'Usuario ya existe', {
        usuario: usuarioExistente.toSafeObject()
      });
    }

    // Obtener usuario desde auth-service
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
    
    try {
      const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/usuarios-internos`, {
        headers: {
          'x-internal-service': 'usuario-service',
          'Authorization': token
        }
      });

      if (response.data.success) {
        const usuarios = response.data.data.usuarios;
        const usuarioAuth = usuarios.find(u => u.id.toString() === id.toString());
        
        if (usuarioAuth) {
          // Crear usuario en usuario-service
          const nuevoUsuario = await Usuario.create({
            id: usuarioAuth.id,
            nombre: usuarioAuth.nombre,
            apellido: usuarioAuth.apellido,
            email: usuarioAuth.email,
            rol: usuarioAuth.rol,
            cedula: usuarioAuth.cedula,
            fechaNacimiento: usuarioAuth.fechaNacimiento,
            celular: usuarioAuth.celular,
            direccion: usuarioAuth.direccion,
            perfilCompleto: usuarioAuth.perfilCompleto || false,
            activo: usuarioAuth.activo !== false
          });

          return successResponse(res, 201, 'Usuario sincronizado exitosamente', {
            usuario: nuevoUsuario.toSafeObject()
          });
        } else {
          return errorResponse(res, 404, 'Usuario no encontrado en auth-service');
        }
      } else {
        return errorResponse(res, 500, 'Error al obtener usuarios de auth-service');
      }
    } catch (authError) {
      console.error('Error al consultar auth-service:', authError.message);
      return errorResponse(res, 500, 'Error al sincronizar con auth-service');
    }
  } catch (error) {
    console.error('Error al sincronizar usuario:', error);
    return errorResponse(res, 500, 'Error al sincronizar usuario');
  }
};

module.exports = {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  obtenerUsuarioPorEmail,
  crearUsuario,
  crearUsuarioInterno,
  actualizarUsuario,
  eliminarUsuario,
  completarPerfil,
  actualizarPerfilCompleto,
  sincronizarUsuarioPorId
};
