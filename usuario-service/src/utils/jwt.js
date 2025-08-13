/**
 * Utilidades para la gestión de JWT (JSON Web Tokens)
 * Estas funciones permiten generar y verificar tokens de autenticación
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

// Clave secreta para firmar los tokens
const JWT_SECRET = process.env.JWT_SECRET;
// Tiempo de expiración del token
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

/**
 * Genera un token JWT para un usuario
 * @param {Object} usuario - Datos del usuario a incluir en el token
 * @returns {String} Token JWT generado
 */
const generarJWT = (usuario) => {
  // Payload del token (datos del usuario)
  const payload = {
    id: usuario.id,
    email: usuario.email,
    rol: usuario.rol
  };

  // Generar y devolver el token firmado
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

/**
 * Verifica la validez de un token JWT
 * @param {String} token - Token JWT a verificar
 * @returns {Object|null} Datos del usuario contenidos en el token o null si es inválido
 */
const verificarJWT = (token) => {
  try {
    // Verificar y decodificar el token
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    // Si hay algún error (token inválido, expirado, etc.), devolver null
    return null;
  }
};

module.exports = {
  generarJWT,
  verificarJWT
};
