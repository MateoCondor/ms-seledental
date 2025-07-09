/**
 * Modelo de Cita para el microservicio de citas
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Cita = sequelize.define('Cita', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  clienteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'cliente_id', // Mapear al nombre de columna en la BD
    // Removemos la referencia de clave foránea para arquitectura de microservicios
    // La integridad se manejará a nivel de aplicación
  },
  odontologoId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'odontologo_id', // Mapear al nombre de columna en la BD
    // Removemos la referencia de clave foránea para arquitectura de microservicios
    // La integridad se manejará a nivel de aplicación
  },
  tipoConsulta: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'tipo_consulta',
    validate: {
      isIn: [['general', 'control', 'urgencia']]
    }
  },
  categoria: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [[
        // Para consulta general
        'odontologia_general',
        'diagnostico_especialidad',
        // Para consulta de control
        'ortodoncia',
        'endodoncia',
        'cirugia_oral',
        'protesis',
        'periodoncia',
        // Para consulta de urgencia
        'cirugia_oral_urgencia',
        'endodoncia_urgencia',
        'rehabilitacion',
        'trauma_dental'
      ]]
    }
  },
  fechaHora: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'fecha_hora'
  },
  duracion: {
    type: DataTypes.INTEGER, // Duración en minutos
    defaultValue: 60,
    allowNull: false
  },
  detalles: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Síntomas o detalles adicionales proporcionados por el cliente'
  },
  estado: {
    type: DataTypes.STRING,
    defaultValue: 'pendiente',
    allowNull: false,
    validate: {
      isIn: [['pendiente', 'confirmada', 'en_proceso', 'completada', 'cancelada', 'no_asistio']]
    }
  },
  motivoCancelacion: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'motivo_cancelacion'
  },
  motivoReagendamiento: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'motivo_reagendamiento',
    comment: 'Motivo del reagendamiento'
  },
  fechaAnterior: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_anterior',
    comment: 'Fecha anterior antes del reagendamiento'
  },
  fechaReagendamiento: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_reagendamiento',
    comment: 'Fecha en que se realizó el reagendamiento'
  },
  observaciones: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Observaciones de la recepcionista al asignar odontólogo'
  },
  fechaAsignacion: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_asignacion',
    comment: 'Fecha en que se asignó el odontólogo'
  },
  notasOdontologo: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'notas_odontologo',
    comment: 'Notas del odontólogo después de la consulta'
  },
  // Campos adicionales para el microservicio
  prioridad: {
    type: DataTypes.STRING,
    defaultValue: 'media',
    allowNull: false,
    validate: {
      isIn: [['baja', 'media', 'alta', 'urgente']]
    }
  },
  recordatorioEnviado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'recordatorio_enviado'
  },
  fechaRecordatorio: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fecha_recordatorio'
  },
  costoEstimado: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'costo_estimado'
  }
}, {
  tableName: 'citas',
  timestamps: true,
  indexes: [
    {
      fields: ['cliente_id'] // Usar el nombre de columna real
    },
    {
      fields: ['odontologo_id'] // Usar el nombre de columna real
    },
    {
      fields: ['fecha_hora'] // Usar el nombre de columna real
    },
    {
      fields: ['estado']
    },
    {
      fields: ['tipo_consulta'] // Usar el nombre de columna real
    },
    {
      fields: ['prioridad']
    }
  ]
});

// Métodos de instancia
Cita.prototype.esUrgencia = function() {
  return this.tipoConsulta === 'urgencia';
};

Cita.prototype.estaConfirmada = function() {
  return this.estado === 'confirmada';
};

Cita.prototype.puedeSerCancelada = function() {
  return ['pendiente', 'confirmada'].includes(this.estado);
};

Cita.prototype.puedeSerReagendada = function() {
  return ['pendiente', 'confirmada'].includes(this.estado);
};

module.exports = Cita;