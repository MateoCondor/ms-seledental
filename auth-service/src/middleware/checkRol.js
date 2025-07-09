/**
 * Middleware para verificar roles de usuario
 */

const { errorResponse } = require('../utils/responses');

/**
 * Middleware para verificar que el usuario sea administrador
 */
const validarAdmin = (req, res, next) => {
  try {
    if (req.usuario.rol !== 'administrador') {
      return errorResponse(res, 403, 'Acceso denegado. Se requieren permisos de administrador');
    }
    next();
  } catch (error) {
    console.error('Error en validación de rol admin:', error);
    return errorResponse(res, 500, 'Error del servidor al verificar permisos');
  }
};

/**
 * Middleware para verificar que el usuario sea recepcionista o administrador
 */
const validarRecepcionista = (req, res, next) => {
  try {
    const rolesPermitidos = ['recepcionista', 'administrador'];
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return errorResponse(res, 403, 'Acceso denegado. Se requieren permisos de recepcionista o administrador');
    }
    next();
  } catch (error) {
    console.error('Error en validación de rol recepcionista:', error);
    return errorResponse(res, 500, 'Error del servidor al verificar permisos');
  }
};

/**
 * Middleware para verificar que el usuario sea odontólogo o administrador
 */
const validarOdontologo = (req, res, next) => {
  try {
    const rolesPermitidos = ['odontologo', 'administrador'];
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return errorResponse(res, 403, 'Acceso denegado. Se requieren permisos de odontólogo o administrador');
    }
    next();
  } catch (error) {
    console.error('Error en validación de rol odontólogo:', error);
    return errorResponse(res, 500, 'Error del servidor al verificar permisos');
  }
};

/**
 * Middleware dinámico para verificar múltiples roles
 */
const validarRoles = (rolesPermitidos) => {
  return (req, res, next) => {
    try {
      if (!rolesPermitidos.includes(req.usuario.rol)) {
        return errorResponse(res, 403, `Acceso denegado. Roles permitidos: ${rolesPermitidos.join(', ')}`);
      }
      next();
    } catch (error) {
      console.error('Error en validación de roles:', error);
      return errorResponse(res, 500, 'Error del servidor al verificar permisos');
    }
  };
};

module.exports = {
  validarAdmin,
  validarRecepcionista,
  validarOdontologo,
  validarRoles
};
