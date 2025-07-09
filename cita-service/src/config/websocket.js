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
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Cliente conectado al WebSocket de Citas:', socket.id);

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
    io.emit('citaUpdate', {
      type: eventType,
      data: citaData,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Emite una notificación específica a un usuario
 */
const emitNotificationToUser = (userId, notification) => {
  if (io) {
    io.emit(`notification_${userId}`, notification);
  }
};

module.exports = {
  initializeWebSocket,
  emitCitaUpdate,
  emitNotificationToUser,
  getIO: () => io
};
