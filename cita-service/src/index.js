/**
 * Servidor del Microservicio de Citas
 * Maneja la gestión completa de citas médicas
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const http = require('http');
const { sequelize, testDbConnection } = require('./config/database');
const { initializeRabbitMQ, subscribeToEvents } = require('./config/rabbitmq');
const { initializeWebSocket } = require('./config/websocket');
const citaRoutes = require('./routes/citaRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3003;

// Configurar trust proxy para Kong Gateway
app.set('trust proxy', 1);

// Inicializar WebSocket
initializeWebSocket(server);

// Configuración de seguridad
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // máximo 200 requests por ventana de tiempo
  message: 'Demasiadas solicitudes desde esta IP, inténtelo de nuevo más tarde.'
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Middlewares básicos
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'cita-service',
    timestamp: new Date().toISOString()
  });
});

// Rutas
app.use('/api/citas', citaRoutes);

// Middleware de manejo de errores
app.use(errorHandler);

// Inicializar el servidor
const startServer = async () => {
  try {
    // Probar conexión a la base de datos
    await testDbConnection();
    console.log('✅ Conexión a CockroachDB establecida');

    // Sincronizar modelos (force: false para no perder datos, alter: true para ajustar cambios)
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Modelos sincronizados con la base de datos');

    // Inicializar RabbitMQ
    await initializeRabbitMQ();
    console.log('✅ Conexión a RabbitMQ establecida');

    // Suscribirse a eventos
    await subscribeToEvents();
    console.log('✅ Suscripciones a eventos configuradas');

    // Iniciar servidor
    server.listen(PORT, () => {
      console.log(`🚀 Cita Service ejecutándose en puerto ${PORT}`);
      console.log(`📚 API disponible en http://localhost:${PORT}/api/citas`);
      console.log(`🔌 WebSocket disponible en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
