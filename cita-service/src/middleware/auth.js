/**
 * Middleware de autenticación para el microservicio de citas
 * Valida tokens con el servicio de autenticación
 */

const axios = require('axios');
const { errorResponse } = require('../utils/responses');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';

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
    

    // Validar el token con el servicio de autenticación
    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/validar-token`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.data.success) {
      return errorResponse(res, 401, 'Acceso no autorizado. Token inválido o expirado');
    }
    
    // Agregar el usuario al objeto request
    req.usuario = response.data.data.usuario;
    
    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    
    if (error.response) {
      // Error de respuesta del servicio de auth
      return errorResponse(res, error.response.status, error.response.data.error?.message || 'Error de autenticación');
    }
    
    // Error de conexión con el servicio de auth
    return errorResponse(res, 503, 'Servicio de autenticación no disponible');
  }
};

module.exports = {
  auth
};
