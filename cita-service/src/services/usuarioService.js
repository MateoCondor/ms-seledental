/**
 * Servicio para comunicación con el microservicio de usuarios
 */

const axios = require('axios');

const USUARIO_SERVICE_URL = process.env.USUARIO_SERVICE_URL || 'http://usuario-service:3002';

/**
 * Obtiene información de un usuario por ID
 */
const obtenerUsuarioPorId = async (userId) => {
  try {
    const response = await axios.get(`${USUARIO_SERVICE_URL}/api/usuarios/${userId}`);
    return response.data.success ? response.data.data.usuario : null;
  } catch (error) {
    console.error('Error al obtener usuario:', error.message);
    return null;
  }
};

/**
 * Obtiene información de un usuario por authId
 */
const obtenerUsuarioPorAuthId = async (authId) => {
  try {
    const response = await axios.get(`${USUARIO_SERVICE_URL}/api/usuarios/auth/${authId}`);
    return response.data.success ? response.data.data.usuario : null;
  } catch (error) {
    console.error('Error al obtener usuario por authId:', error.message);
    return null;
  }
};

/**
 * Obtiene la lista de odontólogos disponibles
 */
const obtenerOdontologosDisponibles = async () => {
  try {
    const response = await axios.get(`${USUARIO_SERVICE_URL}/api/usuarios/odontologos/disponibles`);
    return response.data.success ? response.data.data.odontologos : [];
  } catch (error) {
    console.error('Error al obtener odontólogos:', error.message);
    return [];
  }
};

/**
 * Obtiene usuarios por rol
 */
const obtenerUsuariosPorRol = async (rol) => {
  try {
    const response = await axios.get(`${USUARIO_SERVICE_URL}/api/usuarios/rol/${rol}`);
    return response.data.success ? response.data.data.usuarios : [];
  } catch (error) {
    console.error('Error al obtener usuarios por rol:', error.message);
    return [];
  }
};

module.exports = {
  obtenerUsuarioPorId,
  obtenerUsuarioPorAuthId,
  obtenerOdontologosDisponibles,
  obtenerUsuariosPorRol
};
