/**
 * Middleware global para manejo de errores
 */

const { errorResponse } = require('../utils/responses');

const errorHandler = (err, req, res, next) => {
  console.error('Error capturado por errorHandler:', err);

  // Error de validación de Sequelize
  if (err.name === 'SequelizeValidationError') {
    const errores = err.errors.map(error => ({
      campo: error.path,
      mensaje: error.message
    }));
    return errorResponse(res, 400, 'Error de validación', errores);
  }

  // Error de constraint único de Sequelize
  if (err.name === 'SequelizeUniqueConstraintError') {
    return errorResponse(res, 400, 'El recurso ya existe', {
      campo: err.errors[0]?.path,
      valor: err.errors[0]?.value
    });
  }

  // Error de clave foránea de Sequelize
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return errorResponse(res, 400, 'Referencia inválida en base de datos');
  }

  // Error de conexión a base de datos
  if (err.name === 'SequelizeConnectionError') {
    return errorResponse(res, 503, 'Error de conexión a la base de datos');
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 401, 'Token inválido');
  }

  // Error de token expirado
  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 401, 'Token expirado');
  }

  // Error por defecto
  return errorResponse(res, 500, 'Error interno del servidor');
};

module.exports = {
  errorHandler
};
