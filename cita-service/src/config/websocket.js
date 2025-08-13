/**
 * Configuración de WebSocket para el microservicio de citas
 */

const { Server } = require('socket.io');

let io = null;

/**
 * Inicializa WebSocket
 */
const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log('Cliente conectado al WebSocket de Citas:', socket.id);

    // Manejo de salas para fechas específicas
    socket.on('join_date_room', (fecha) => {
      socket.join(`date_${fecha}`);
      console.log(`Cliente ${socket.id} se unió a la sala de fecha: ${fecha}`);
    });

    socket.on('leave_date_room', (fecha) => {
      socket.leave(`date_${fecha}`);
      console.log(`Cliente ${socket.id} salió de la sala de fecha: ${fecha}`);
    });

    // Manejo de salas para recepcionistas
    socket.on('join_recepcionista_room', () => {
      socket.join('recepcionistas');
      console.log(`Recepcionista ${socket.id} se unió a la sala de recepcionistas`);
    });

    socket.on('leave_recepcionista_room', () => {
      socket.leave('recepcionistas');
      console.log(`Recepcionista ${socket.id} salió de la sala de recepcionistas`);
    });

    // Manejo de salas para clientes específicos
    socket.on('join_cliente_room', (clienteId) => {
      socket.join(`cliente_${clienteId}`);
      console.log(`Cliente ${socket.id} se unió a la sala del cliente: ${clienteId}`);
    });

    socket.on('leave_cliente_room', (clienteId) => {
      socket.leave(`cliente_${clienteId}`);
      console.log(`Cliente ${socket.id} salió de la sala del cliente: ${clienteId}`);
    });

    // Manejo de salas para odontólogos específicos
    socket.on('join_odontologo_room', (odontologoId) => {
      socket.join(`odontologo_${odontologoId}`);
      console.log(`Odontólogo ${socket.id} se unió a la sala del odontólogo: ${odontologoId}`);
    });

    socket.on('leave_odontologo_room', (odontologoId) => {
      socket.leave(`odontologo_${odontologoId}`);
      console.log(`Odontólogo ${socket.id} salió de la sala del odontólogo: ${odontologoId}`);
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado del WebSocket de Citas:', socket.id);
    });
  });

  console.log('✅ WebSocket inicializado para Cita Service');
};

/**
 * Emite una actualización de cita a todos los clientes conectados
 */
const emitCitaUpdate = (eventType, citaData) => {
  if (io) {
    console.log(`Emitiendo evento WebSocket: ${eventType}`, citaData);
    io.emit('citaUpdate', {
      type: eventType,
      data: citaData,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Emite actualización de horarios para una fecha específica
 */
const emitHorariosUpdated = (fecha, horariosData) => {
  if (io) {
    console.log(`Emitiendo horarios actualizados para fecha: ${fecha}`);
    // Emitir a todos los clientes en la sala de esa fecha
    io.to(`date_${fecha}`).emit('horarios_updated', {
      fecha,
      horarios: horariosData,
      timestamp: new Date().toISOString()
    });
    // También emitir a todas las recepcionistas
    io.to('recepcionistas').emit('horarios_updated', {
      fecha,
      horarios: horariosData,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Emite nueva cita a las recepcionistas
 */
const emitNuevaCita = (citaData) => {
  if (io) {
    console.log('Emitiendo nueva cita a recepcionistas:', citaData);
    io.to('recepcionistas').emit('nueva_cita', {
      cita: citaData,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Emite asignación de odontólogo a un cliente específico
 */
const emitCitaAsignada = (clienteId, citaData) => {
  if (io) {
    console.log(`Emitiendo cita asignada al cliente: ${clienteId}`);
    io.to(`cliente_${clienteId}`).emit('cita_asignada', {
      cita: citaData,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Emite actualización de cita a un cliente específico
 */
const emitCitaActualizada = (clienteId, citaData) => {
  if (io) {
    console.log(`Emitiendo cita actualizada al cliente: ${clienteId}`);
    io.to(`cliente_${clienteId}`).emit('cita_actualizada', {
      cita: citaData,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Emite cita cancelada a recepcionistas
 */
const emitCitaCancelada = (citaData) => {
  if (io) {
    console.log('Emitiendo cita cancelada a recepcionistas:', citaData);
    io.to('recepcionistas').emit('cita_cancelada', {
      cita: citaData,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Emite una notificación específica a un usuario
 */
const emitNotificationToUser = (userId, notification) => {
  if (io) {
    console.log(`Emitiendo notificación al usuario: ${userId}`);
    io.to(`cliente_${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  initializeWebSocket,
  emitCitaUpdate,
  emitHorariosUpdated,
  emitNuevaCita,
  emitCitaAsignada,
  emitCitaActualizada,
  emitCitaCancelada,
  emitNotificationToUser,
  getIO: () => io
};
