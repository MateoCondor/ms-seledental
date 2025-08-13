/**
 * Rutas del microservicio de citas
 */

const express = require('express');
const {
  crearCita,
  reagendarCita,
  cancelarCita,
  obtenerCitasCliente,
  obtenerCitasPendientes,
  obtenerOdontologos,
  asignarOdontologo,
  obtenerCategorias,
  obtenerHorariosDisponibles
} = require('../controllers/citaController');
const { auth } = require('../middleware/auth');
const { validarRoles } = require('../middleware/checkRol');

const router = express.Router();


// Obtener categorías de consulta
router.get('/categorias', obtenerCategorias);

// Obtener horarios disponibles para una fecha
router.get('/horarios-disponibles', obtenerHorariosDisponibles);

// Todas las rutas requieren autenticación
router.use(auth);

// Rutas para clientes
router.post('/', validarRoles(['cliente', 'recepcionista', 'administrador']), crearCita);
router.get('/mis-citas', validarRoles(['cliente']), obtenerCitasCliente);
router.put('/:id/reagendar', reagendarCita);
router.put('/:id/cancelar', cancelarCita);

// Rutas para recepcionista
router.get('/pendientes', validarRoles(['recepcionista', 'administrador']), obtenerCitasPendientes);
router.get('/odontologos', validarRoles(['recepcionista', 'administrador']), obtenerOdontologos);
router.put('/:id/asignar-odontologo', validarRoles(['recepcionista', 'administrador']), asignarOdontologo);


module.exports = router;
