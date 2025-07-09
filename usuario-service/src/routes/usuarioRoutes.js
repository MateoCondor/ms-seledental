/**
 * Rutas del microservicio de usuarios
 */

const express = require('express');
const {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  completarPerfil,
  toggleUsuarioActivo,
  eliminarUsuario,
  obtenerUsuariosPorRol,
  obtenerOdontologosDisponibles,
  obtenerUsuarioPorAuthId
} = require('../controllers/usuarioController');
const { auth } = require('../middleware/auth');
const { validarAdmin, validarRecepcionista, validarRoles } = require('../middleware/checkRol');

const router = express.Router();

// Rutas públicas (accesibles desde otros microservicios)
router.get('/odontologos/disponibles', obtenerOdontologosDisponibles);
router.get('/rol/:rol', obtenerUsuariosPorRol);
router.get('/auth/:authId', obtenerUsuarioPorAuthId); // Nueva ruta para buscar por authId

// Rutas protegidas
router.use(auth); // Todas las rutas siguientes requieren autenticación

// Rutas generales
router.get('/', validarRoles(['administrador', 'recepcionista']), obtenerUsuarios);
router.get('/:id', obtenerUsuarioPorId);

// Rutas de actualización
router.put('/:id', actualizarUsuario);
router.put('/:id/completar-perfil', completarPerfil);

// Rutas administrativas
router.patch('/:id/toggle-activo', validarAdmin, toggleUsuarioActivo);
router.delete('/:id', validarAdmin, eliminarUsuario);

module.exports = router;
