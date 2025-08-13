/**
 * Servicio para comunicación con el microservicio de usuarios
 */

const axios = require('axios');

const USUARIO_SERVICE_URL = process.env.USUARIO_SERVICE_URL || 'http://localhost:3002';

/**
 * Crea un usuario en el microservicio de usuarios
 */
const crearUsuario = async (datosUsuario, authToken = null) => {
  try {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await axios.post(`${USUARIO_SERVICE_URL}/api/usuarios/internal/create`, datosUsuario, {
      headers
    });
    
    return response.data.success ? response.data.data.usuario : null;
  } catch (error) {
    console.error('Error al crear usuario en usuario-service:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
};

/**
 * Crea un usuario con ID específica (para sincronización)
 */
const crearUsuarioConId = async (datosUsuario, authToken = null) => {
  try {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Usar endpoint especial para crear con ID específica
    const response = await axios.post(`${USUARIO_SERVICE_URL}/api/usuarios/internal/create-with-id`, datosUsuario, {
      headers
    });
    
    return response.data.success ? response.data.data.usuario : null;
  } catch (error) {
    console.error('Error al crear usuario con ID en usuario-service:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
};

/**
 * Elimina un usuario del microservicio de usuarios
 */
const eliminarUsuario = async (userId, authToken = null) => {
  try {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await axios.delete(`${USUARIO_SERVICE_URL}/api/usuarios/${userId}`, {
      headers
    });
    
    return response.data.success;
  } catch (error) {
    console.error('Error al eliminar usuario en usuario-service:', error.message);
    return false;
  }
};

/**
 * Obtiene información de un usuario por ID
 */
const obtenerUsuarioPorId = async (userId, authToken = null) => {
  try {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await axios.get(`${USUARIO_SERVICE_URL}/api/usuarios/${userId}`, {
      headers
    });
    
    return response.data.success ? response.data.data.usuario : null;
  } catch (error) {
    console.error('Error al obtener usuario:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
};

/**
 * Obtiene información de un usuario por email desde usuario-service
 */
const obtenerUsuarioPorEmail = async (email, authToken = null) => {
  try {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await axios.get(`${USUARIO_SERVICE_URL}/api/usuarios/by-email/${email}`, {
      headers
    });
    
    return response.data.success ? response.data.data.usuario : null;
  } catch (error) {
    console.error('Error al obtener usuario por email:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return null;
  }
};

/**
 * Actualiza el estado de perfil completo de un usuario
 */
const actualizarPerfilCompleto = async (userId, perfilCompleto, authToken = null) => {
  try {
    const headers = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await axios.patch(`${USUARIO_SERVICE_URL}/api/usuarios/${userId}/perfil-completo`, {
      perfilCompleto
    }, {
      headers
    });
    
    return response.data.success;
  } catch (error) {
    console.error('Error al actualizar perfil completo:', error.message);
    return false;
  }
};

module.exports = {
  crearUsuario,
  crearUsuarioConId,
  eliminarUsuario,
  obtenerUsuarioPorId,
  obtenerUsuarioPorEmail,
  actualizarPerfilCompleto
};
