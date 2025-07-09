/**
 * Utilidades para respuestas HTTP estandarizadas
 */

/**
 * Respuesta exitosa estándar
 * @param {Object} res - Objeto de respuesta Express
 * @param {number} statusCode - Código de estado HTTP
 * @param {string} message - Mensaje de respuesta
 * @param {Object} data - Datos a incluir en la respuesta
 */
const successResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message,
    timestamp: new Date().toISOString()
  };

  if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Respuesta de error estándar
 * @param {Object} res - Objeto de respuesta Express
 * @param {number} statusCode - Código de estado HTTP
 * @param {string} message - Mensaje de error
 * @param {Object} details - Detalles adicionales del error
 */
const errorResponse = (res, statusCode, message, details = null) => {
  const response = {
    success: false,
    error: {
      message,
      code: statusCode
    },
    timestamp: new Date().toISOString()
  };

  if (details) {
    response.error.details = details;
  }

  return res.status(statusCode).json(response);
};

/**
 * Respuesta de error de validación
 * @param {Object} res - Objeto de respuesta Express
 * @param {Array} errors - Array de errores de validación
 */
const validationErrorResponse = (res, errors) => {
  return errorResponse(res, 400, 'Error de validación', {
    fields: errors
  });
};

/**
 * Respuesta de recurso no encontrado
 * @param {Object} res - Objeto de respuesta Express
 * @param {string} resource - Nombre del recurso no encontrado
 */
const notFoundResponse = (res, resource = 'Recurso') => {
  return errorResponse(res, 404, `${resource} no encontrado`);
};

/**
 * Respuesta de acceso no autorizado
 * @param {Object} res - Objeto de respuesta Express
 * @param {string} message - Mensaje personalizado
 */
const unauthorizedResponse = (res, message = 'Acceso no autorizado') => {
  return errorResponse(res, 401, message);
};

/**
 * Respuesta de acceso prohibido
 * @param {Object} res - Objeto de respuesta Express
 * @param {string} message - Mensaje personalizado
 */
const forbiddenResponse = (res, message = 'Acceso prohibido') => {
  return errorResponse(res, 403, message);
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse
};
