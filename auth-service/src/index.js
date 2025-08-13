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
const { initializeRabbitMQ, publishUserCreated, subscribeToUserEvents} = require('./config/rabbitmq');
const authRoutes = require('./routes/authRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const Usuario = require('./models/Usuario');

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar trust proxy para Kong Gateway
app.set('trust proxy', 1);

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

// Función para crear administrador por defecto
const createDefaultAdmin = async () => {
  try {
    // Verificar si ya existe un admin
    const adminExistente = await Usuario.findOne({
      where: { email: 'admin@seledental.com' }
    });

    if (adminExistente) {
      console.log('⚠️ El administrador ya existe');
      return;
    }

    // Crear nuevo administrador
    const nuevoAdmin = await Usuario.create({
      nombre: 'Administrador',
      apellido: 'Sistema',
      email: 'admin@seledental.com',
      password: 'admin123', // Se hasheará automáticamente
      rol: 'administrador',
      activo: true,
      perfilCompleto: true
    });

    // Publicar evento USER_CREATED para replicar en usuario-service
    await publishUserCreated({
      id: nuevoAdmin.id,
      nombre: nuevoAdmin.nombre,
      apellido: nuevoAdmin.apellido,
      email: nuevoAdmin.email,
      password: nuevoAdmin.password,
      rol: nuevoAdmin.rol,
      activo: nuevoAdmin.activo,
      perfilCompleto: nuevoAdmin.perfilCompleto
    });

    console.log('✅ Administrador creado exitosamente:');
    console.log('Email:', nuevoAdmin.email);
    console.log('Rol:', nuevoAdmin.rol);
    console.log('ID:', nuevoAdmin.id);

  } catch (error) {
    console.error('❌ Error al crear administrador:', error);
  }
};

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

    // Suscribirse a eventos de usuario
    await subscribeToUserEvents();
    console.log('✅ Suscripciones a eventos de usuario configuradas');

    // Crear administrador por defecto
    await createDefaultAdmin();

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
