/**
 * Configuración de la base de datos CockroachDB para Cita Service
 */

const { Sequelize } = require('sequelize');

// URL de conexión específica para Cita Service
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://root@localhost:26259/cita_db?sslmode=disable';

// Configuración de la conexión
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 15,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    ssl: false,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
});

/**
 * Función para probar la conexión a la base de datos
 */
const testDbConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a CockroachDB Cita establecida correctamente');
    
    // Crear la base de datos si no existe
    await sequelize.query('CREATE DATABASE IF NOT EXISTS cita_db');
    console.log('✅ Base de datos cita_db verificada');
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos cita:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testDbConnection,
};
