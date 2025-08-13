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
  obtenerUsuariosInternos,
  completarPerfil,
  actualizarUsuario,
  eliminarUsuario
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { validarRoles } = require('../middleware/checkRol')

const router = express.Router();

// Rutas públicas
router.post('/registro-cliente', registroCliente);

// Rutas solo para administradores
router.post('/registro', auth, validarRoles(['administrador', 'recepcionista']), registro);

// Ruta para iniciar sesión
router.post('/login', login);

// Rutas protegidas
router.get('/perfil', auth, obtenerPerfil);

// Ruta para completar el perfil de un cliente
router.put('/completar-perfil', auth, completarPerfil);

// Ruta para actualizar usuario
router.put('/usuario/:id', auth, actualizarUsuario);

// Ruta para eliminar usuario (solo administradores)
router.delete('/usuario/:id', auth, validarRoles(['administrador']), eliminarUsuario);

// ---

// Ruta para validar token
router.post('/validar-token', validarToken);

// Rutas internas (para otros microservicios)
router.get('/usuarios-internos', obtenerUsuariosInternos);

module.exports = router;
