/**
 * Middleware de autenticación para verificar tokens JWT
 */

const { verificarJWT } = require('../utils/jwt');
const { errorResponse } = require('../utils/responses');
const Usuario = require('../models/Usuario');

/**
 * Middleware para verificar la autenticación del usuario
 */
const auth = async (req, res, next) => {
  try {
    // Obtener el token del header Authorization
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return errorResponse(res, 401, 'Acceso denegado. Token no proporcionado');
    }
    

    // Verificar la validez del token
    const decoded = verificarJWT(token);
    if (!decoded) {
      return errorResponse(res, 401, 'Acceso no autorizado. Token inválido o expirado');
    }

    // Buscar el usuario en la base de datos
    const usuario = await Usuario.findByPk(decoded.id);
    if (!usuario) {
      return errorResponse(res, 404, 'Acceso no autorizado. Usuario no encontrado');
    }

    // Verificar si el usuario está activo
    if (!usuario.activo) {
      return errorResponse(res, 403, 'Acceso denegado. Usuario desactivado');
    }

    // Agregar el usuario al objeto request
    req.usuario = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
      apellido: usuario.apellido
    };

    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);

    if (error.name === 'JsonWebTokenError') {
      return errorResponse(res, 401, 'Token inválido');
    }

    if (error.name === 'TokenExpiredError') {
      return errorResponse(res, 401, 'Token expirado');
    }

    return errorResponse(res, 500, 'Error del servidor al verificar autenticación');
  }
};

module.exports = {
  auth
};
