/**
 * Servicio para comunicación con el microservicio de usuarios
 */

const axios = require('axios');

const USUARIO_SERVICE_URL = process.env.USUARIO_SERVICE_URL || 'http://usuario-service:3002';

/**
 * Obtiene información de un usuario por ID
 */
const obtenerUsuarioPorId = async (userId, token = null) => {
  try {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Primero intentar desde usuario-service
    try {
      const response = await axios.get(`${USUARIO_SERVICE_URL}/api/usuarios/${userId}`, {
        headers
      });
      return response.data.success ? response.data.data.usuario : null;
    } catch (error) {
      // Si no se encuentra en usuario-service (404), intentar sincronizar
      if (error.response && error.response.status === 404) {
        console.log(`Usuario ${userId} no encontrado en usuario-service, intentando sincronizar...`);
        
        try {
          // Intentar sincronizar el usuario
          const syncResponse = await axios.post(`${USUARIO_SERVICE_URL}/api/usuarios/sync/${userId}`, {}, {
            headers
          });
          
          if (syncResponse.data.success) {
            console.log(`Usuario ${userId} sincronizado exitosamente`);
            return syncResponse.data.data.usuario;
          }
        } catch (syncError) {
          console.error('Error al sincronizar usuario:', syncError.message);
          
          // Como último recurso, intentar validar token en auth-service
          const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
          try {
            const authResponse = await axios.post(`${AUTH_SERVICE_URL}/api/auth/validar-token`, {}, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (authResponse.data.success && authResponse.data.data.usuario.id == userId) {
              console.log('Usuario encontrado en auth-service mediante token');
              return authResponse.data.data.usuario;
            }
          } catch (authError) {
            console.error('Error al validar en auth-service:', authError.message);
          }
        }
      }
      throw error;
    }
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
 * Obtiene lista de odontólogos disponibles
 */
const obtenerOdontologosDisponibles = async (token = null) => {
  try {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await axios.get(`${USUARIO_SERVICE_URL}/api/usuarios?rol=odontologo&activo=true`, {
      headers
    });
    return response.data.success ? response.data.data.usuarios : [];
  } catch (error) {
    console.error('Error al obtener odontólogos:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return [];
  }
};

module.exports = {
  obtenerUsuarioPorId,
  obtenerOdontologosDisponibles,
};
