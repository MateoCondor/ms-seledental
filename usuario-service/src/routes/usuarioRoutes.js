/**
 * Rutas del microservicio de usuarios
 */

const express = require('express');
const {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  obtenerUsuarioPorEmail,
  crearUsuario,
  crearUsuarioInterno,
  actualizarUsuario,
  eliminarUsuario,
  completarPerfil,
  actualizarPerfilCompleto,
  sincronizarUsuarioPorId
} = require('../controllers/usuarioController');
const { auth } = require('../middleware/auth');
const { validarRoles } = require('../middleware/checkRol');

const router = express.Router();

// Rutas protegidas
router.use(auth); // Todas las rutas requieren autenticación

// Ruta para obtener todos los usuarios
router.get('/', validarRoles(['administrador', 'recepcionista']), obtenerUsuarios);

// Obtener un usuario por ID
router.get('/:id', obtenerUsuarioPorId);

// Obtener un usuario por email
router.get('/by-email/:email', obtenerUsuarioPorEmail);

// Ruta para crear un nuevo usuario
router.post('/', validarRoles(['administrador', 'recepcionista']), crearUsuario);

// Ruta interna para crear usuario (sincronización)
router.post('/internal/create', crearUsuarioInterno);

// Ruta para sincronizar usuario por ID desde auth-service
router.post('/sync/:id', validarRoles(['administrador', 'recepcionista']), sincronizarUsuarioPorId);

// Rutas de actualización
router.put('/:id', actualizarUsuario);

// Completar perfil de usuario
router.put('/:id/completar-perfil', completarPerfil);

// Actualizar estado de perfil completo
router.patch('/:id/perfil-completo', actualizarPerfilCompleto);

// Ruta para eliminar un usuario (desactivación lógica) - solo administradores
router.delete('/:id', validarRoles(['administrador', 'recepcionista']), eliminarUsuario);

module.exports = router;