/**
 * Servidor del Microservicio de Usuarios
 * Maneja la gestión completa de perfiles de usuario
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { sequelize, testDbConnection } = require('./config/database');
const { initializeRabbitMQ, subscribeToEvents } = require('./config/rabbitmq');
const usuarioRoutes = require('./routes/usuarioRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3002;

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
    service: 'usuario-service',
    timestamp: new Date().toISOString()
  });
});

// Rutas
app.use('/api/usuarios', usuarioRoutes);

// Middleware de manejo de errores
app.use(errorHandler);

// Inicializar el servidor
const startServer = async () => {
  try {
    // Probar conexión a la base de datos
    await testDbConnection();
    console.log('✅ Conexión a CockroachDB establecida');

    // Sincronizar modelos (force: false para no perder datos)
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Modelos sincronizados con la base de datos');

    // Inicializar RabbitMQ
    await initializeRabbitMQ();
    console.log('✅ Conexión a RabbitMQ establecida');

    // Suscribirse a eventos
    await subscribeToEvents();
    console.log('✅ Suscripciones a eventos configuradas');

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Usuario Service ejecutándose en puerto ${PORT}`);
      console.log(`📚 API disponible en http://localhost:${PORT}/api/usuarios`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
