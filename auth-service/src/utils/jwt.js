/**
 * Utilidades para manejo de JWT
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tu_jwt_secret_muy_seguro_aqui';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Genera un JWT para un usuario
 * @param {Object} usuario - Objeto usuario de Sequelize
 * @returns {string} Token JWT
 */
const generarJWT = (usuario) => {
  const payload = {
    id: usuario.id,
    email: usuario.email,
    rol: usuario.rol,
    nombre: usuario.nombre,
    apellido: usuario.apellido
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'seledental-auth-service',
    audience: 'seledental-app'
  });
};

/**
 * Verifica y decodifica un JWT
 * @param {string} token - Token JWT a verificar
 * @returns {Object} Payload decodificado
 */
const verificarJWT = (token) => {
  return jwt.verify(token, JWT_SECRET, {
    issuer: 'seledental-auth-service',
    audience: 'seledental-app'
  });
};

/**
 * Decodifica un JWT sin verificar (útil para debugging)
 * @param {string} token - Token JWT a decodificar
 * @returns {Object} Payload decodificado
 */
const decodificarJWT = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generarJWT,
  verificarJWT,
  decodificarJWT
};
