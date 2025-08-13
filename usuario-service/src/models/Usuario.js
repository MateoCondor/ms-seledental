/**
 * Modelo de Usuario para el microservicio de usuarios
 * Contiene la información completa del perfil del usuario
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: false, // Ahora se establecerá manualmente desde auth-service
    allowNull: false
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  apellido: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true, // Opcional, se maneja en auth-service
    validate: {
      len: [6, 100]
    }
  },
  rol: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'cliente',
    validate: {
      isIn: [['administrador', 'recepcionista', 'cliente', 'odontologo']]
    }
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  // Campos adicionales para el perfil completo
  cedula: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      len: [8, 20]
    }
  },
  fechaNacimiento: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  celular: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [8, 15]
    }
  },
  direccion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  perfilCompleto: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
}, {
  tableName: 'usuarios',
  timestamps: true,
  hooks: {
    beforeCreate: async (usuario) => {
      if (usuario.password) {
        const salt = await bcrypt.genSalt(12);
        usuario.password = await bcrypt.hash(usuario.password, salt);
      }
    },
    beforeUpdate: async (usuario) => {
      if (usuario.changed('password')) {
        const salt = await bcrypt.genSalt(12);
        usuario.password = await bcrypt.hash(usuario.password, salt);
      }
    }
  }
});

// Método de instancia para verificar contraseña
Usuario.prototype.verificarPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Método de instancia para obtener datos sin contraseña
Usuario.prototype.toSafeObject = function() {
  const { password, ...userData } = this.toJSON();
  return userData;
};

module.exports = Usuario;