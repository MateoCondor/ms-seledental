/**
 * Rutas del microservicio de autenticación
 */

const express = require('express');
const { 
  registroCliente, 
  registro, 
  login, 
  validarToken, 
  obtenerPerfil,
  obtenerUsuariosInternos
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { validarAdmin } = require('../middleware/checkRol');

const router = express.Router();

// Rutas públicas
router.post('/registro-cliente', registroCliente);
router.post('/login', login);
router.post('/validar-token', validarToken);

// Rutas internas (para otros microservicios)
router.get('/usuarios-internos', obtenerUsuariosInternos);

// Rutas protegidas
router.get('/perfil', auth, obtenerPerfil);

// Rutas solo para administradores
router.post('/registro', auth, validarAdmin, registro);

module.exports = router;
