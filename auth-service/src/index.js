/**
 * Servidor del Microservicio de Autenticación
 * Maneja registro, login y validación de tokens JWT
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { sequelize, testDbConnection } = require('./config/database');
const { initializeRabbitMQ } = require('./config/rabbitmq');
const authRoutes = require('./routes/authRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuración de seguridad
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana de tiempo
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
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

// Rutas
app.use('/api/auth', authRoutes);

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

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Auth Service ejecutándose en puerto ${PORT}`);
      console.log(`📚 API disponible en http://localhost:${PORT}/api/auth`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

startServer();
