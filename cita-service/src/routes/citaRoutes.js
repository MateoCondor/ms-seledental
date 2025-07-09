/**
 * Rutas del microservicio de citas
 */

const express = require('express');
const {
  crearCita,
  obtenerCitas,
  obtenerCitaPorId,
  asignarOdontologo,
  reagendarCita,
  cancelarCita,
  actualizarEstadoCita,
  obtenerCitasPorCliente,
  obtenerCitasPorOdontologo
} = require('../controllers/citaController');
const { auth } = require('../middleware/auth');
const { validarRoles } = require('../middleware/checkRol');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(auth);

// Rutas generales de citas
router.get('/', validarRoles(['administrador', 'recepcionista', 'odontologo']), obtenerCitas);
router.post('/', validarRoles(['cliente', 'recepcionista', 'administrador']), crearCita);
router.get('/:id', obtenerCitaPorId);

// Rutas de modificación de citas
router.put('/:id/asignar-odontologo', validarRoles(['recepcionista', 'administrador']), asignarOdontologo);
router.put('/:id/reagendar', reagendarCita);
router.put('/:id/cancelar', cancelarCita);
router.patch('/:id/estado', validarRoles(['odontologo', 'recepcionista', 'administrador']), actualizarEstadoCita);

// Rutas específicas por usuario
router.get('/cliente/:clienteId', obtenerCitasPorCliente);
router.get('/odontologo/:odontologoId', obtenerCitasPorOdontologo);

module.exports = router;
