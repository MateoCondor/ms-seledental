/**
 * Configuración de la base de datos CockroachDB para Usuario Service
 */

const { Sequelize } = require('sequelize');

// URL de conexión específica para Usuario Service
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://root@localhost:26258/usuario_db?sslmode=disable';

// Configuración de la conexión
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
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
  hooks: {
    afterConnect: async (connection) => {
      // Configurar CockroachDB para usar secuencias normales
      try {
        await connection.query('SET serial_normalization = sql_sequence');
        console.log('✅ Serial normalization configurado para usuario-service');
      } catch (error) {
        console.log('ℹ️ Serial normalization ya configurado o no disponible');
      }
    }
  }
});

/**
 * Función para probar la conexión a la base de datos
 */
const testDbConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a CockroachDB Usuario establecida correctamente');
    
    // Crear la base de datos si no existe
    await sequelize.query('CREATE DATABASE IF NOT EXISTS usuario_db');
    console.log('✅ Base de datos usuario_db verificada');
    
    // Configurar para usar secuencias normales en lugar de unique_rowid()
    await sequelize.query('SET serial_normalization = sql_sequence');
    console.log('✅ Configuración de secuencias normalizada');
    
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos usuario:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testDbConnection,
};
