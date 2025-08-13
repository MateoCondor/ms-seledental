/**
 * Middleware para verificar roles de usuario
 */

const { errorResponse } = require('../utils/responses');

/**
 * Middleware dinámico para verificar múltiples roles
 */
const validarRoles = (rolesPermitidos) => {
  return (req, res, next) => {
    try {

      if (!rolesPermitidos.includes(req.usuario.rol)) {
        return errorResponse(res, 403, `Acceso denegado. No tiene permisos suficientes. Roles permitidos: ${rolesPermitidos.join(', ')}`);
      }
      next();
    } catch (error) {
      console.error('Error en validación de roles:', error);
      return errorResponse(res, 500, 'Error del servidor al verificar permisos');
    }
  };
};

module.exports = {
  validarRoles
};
