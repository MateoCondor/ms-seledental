/**
 * Controlador de Usuarios
 * Maneja la gestión completa de usuarios y perfiles
 */

const Usuario = require('../models/Usuario');
const { successResponse, errorResponse } = require('../utils/responses');
const { publishProfileUpdated, publishUserUpdated, publishUserDeleted } = require('../config/rabbitmq');
const { Op } = require('sequelize');

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
 * Completa el perfil de un cliente
 */
const completarPerfil = async (req, res) => {
  try {
    const { id } = req.params;
    const { cedula, fechaNacimiento, celular, direccion } = req.body;

    // Verificar que el usuario existe y es un cliente
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return errorResponse(res, 404, 'Usuario no encontrado');
    }

    if (usuario.rol !== 'cliente') {
      return errorResponse(res, 400, 'Solo los clientes pueden completar su perfil de esta manera');
    }

    // Actualizar perfil
    await usuario.update({
      cedula,
      fechaNacimiento,
      celular,
      direccion,
      perfilCompleto: true
    });

    // Publicar evento de perfil completado
    await publishProfileUpdated({
      ...usuario.toSafeObject(),
      perfilCompleto: true
    });

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

    if (error.name === 'SequelizeUniqueConstraintError') {
      return errorResponse(res, 400, 'La cédula ya está registrada');
    }

    return errorResponse(res, 500, 'Error al completar perfil');
  }
};

/**
 * Activa o desactiva un usuario
 */
const toggleUsuarioActivo = async (req, res) => {
  try {
    const { id } = req.params;

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return errorResponse(res, 404, 'Usuario no encontrado');
    }

    // Alternar estado activo
    await usuario.update({ activo: !usuario.activo });

    // Publicar evento de usuario actualizado
    await publishUserUpdated(usuario.toSafeObject());

    return successResponse(res, 200, `Usuario ${usuario.activo ? 'activado' : 'desactivado'} exitosamente`, {
      usuario: usuario.toSafeObject()
    });
  } catch (error) {
    console.error('Error al cambiar estado del usuario:', error);
    return errorResponse(res, 500, 'Error al cambiar estado del usuario');
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
 * Obtiene usuarios por rol
 */
const obtenerUsuariosPorRol = async (req, res) => {
  try {
    const { rol } = req.params;
    const { activo = true } = req.query;

    const usuarios = await Usuario.findAll({
      where: {
        rol,
        activo: activo === 'true'
      },
      attributes: { exclude: ['password'] },
      order: [['nombre', 'ASC'], ['apellido', 'ASC']]
    });

    return successResponse(res, 200, `Usuarios con rol ${rol} obtenidos exitosamente`, {
      usuarios
    });
  } catch (error) {
    console.error('Error al obtener usuarios por rol:', error);
    return errorResponse(res, 500, 'Error al obtener usuarios por rol');
  }
};

/**
 * Obtiene odontólogos disponibles
 */
const obtenerOdontologosDisponibles = async (req, res) => {
  try {
    const odontologos = await Usuario.findAll({
      where: {
        rol: 'odontologo',
        activo: true
      },
      attributes: { exclude: ['password'] },
      order: [['nombre', 'ASC'], ['apellido', 'ASC']]
    });

    return successResponse(res, 200, 'Odontólogos disponibles obtenidos exitosamente', {
      odontologos
    });
  } catch (error) {
    console.error('Error al obtener odontólogos:', error);
    return errorResponse(res, 500, 'Error al obtener odontólogos');
  }
};

/**
 * Obtiene un usuario por su authId (ID del auth-service)
 */
const obtenerUsuarioPorAuthId = async (req, res) => {
  try {
    const { authId } = req.params;
    
    const usuario = await Usuario.findOne({
      where: { authId },
      attributes: { exclude: ['password'] }
    });
    
    if (!usuario) {
      return errorResponse(res, 404, 'Usuario no encontrado');
    }
    
    return successResponse(res, 200, 'Usuario obtenido exitosamente', {
      usuario
    });
  } catch (error) {
    console.error('Error al obtener usuario por authId:', error);
    return errorResponse(res, 500, 'Error interno del servidor');
  }
};

module.exports = {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  completarPerfil,
  toggleUsuarioActivo,
  eliminarUsuario,
  obtenerUsuariosPorRol,
  obtenerOdontologosDisponibles,
  obtenerUsuarioPorAuthId
};
