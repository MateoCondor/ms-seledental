/**
 * Configuración de RabbitMQ para el microservicio de citas
 */

const amqp = require('amqplib');

let connection = null;
let channel = null;

/**
 * Inicializa la conexión a RabbitMQ
 */
const initializeRabbitMQ = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    // Declarar exchanges
    await channel.assertExchange('cita.events', 'topic', { durable: true });
    await channel.assertExchange('user.events', 'topic', { durable: true });
    await channel.assertExchange('notification.events', 'topic', { durable: true });

    // Declarar colas para este servicio
    await channel.assertQueue('cita.created', { durable: true });
    await channel.assertQueue('cita.updated', { durable: true });
    await channel.assertQueue('cita.cancelled', { durable: true });
    await channel.assertQueue('cita.rescheduled', { durable: true });
    await channel.assertQueue('cita.reminders', { durable: true });
    
    // Declarar cola para escuchar eventos de usuario
    await channel.assertQueue('cita.user.updated', { durable: true });

    console.log('✅ RabbitMQ configurado para Cita Service');
  } catch (error) {
    console.error('❌ Error al conectar con RabbitMQ:', error);
    throw error;
  }
};

/**
 * Suscribirse a eventos de otros servicios
 */
const subscribeToEvents = async () => {
  try {
    // Escuchar eventos de usuario actualizado
    await channel.bindQueue('cita.user.updated', 'user.events', 'user.updated');
    
    await channel.consume('cita.user.updated', async (msg) => {
      if (msg) {
        const eventData = JSON.parse(msg.content.toString());
        console.log('📥 Evento USER_UPDATED recibido:', eventData);
        
        // Aquí se puede procesar la actualización de usuario
        // Por ejemplo, actualizar información de contacto en citas futuras
        
        channel.ack(msg);
      }
    });

    console.log('✅ Suscripción a eventos configurada');
  } catch (error) {
    console.error('❌ Error al configurar suscripciones:', error);
  }
};

/**
 * Publica un evento de cita creada
 */
const publishCitaCreated = async (citaData) => {
  try {
    const message = {
      eventType: 'CITA_CREATED',
      timestamp: new Date().toISOString(),
      data: citaData
    };

    await channel.publish(
      'cita.events',
      'cita.created',
      Buffer.from(JSON.stringify(message))
    );

    console.log('📤 Evento CITA_CREATED publicado:', citaData.id);
  } catch (error) {
    console.error('❌ Error al publicar evento CITA_CREATED:', error);
  }
};

/**
 * Publica un evento de cita actualizada
 */
const publishCitaUpdated = async (citaData) => {
  try {
    const message = {
      eventType: 'CITA_UPDATED',
      timestamp: new Date().toISOString(),
      data: citaData
    };

    await channel.publish(
      'cita.events',
      'cita.updated',
      Buffer.from(JSON.stringify(message))
    );

    console.log('📤 Evento CITA_UPDATED publicado:', citaData.id);
  } catch (error) {
    console.error('❌ Error al publicar evento CITA_UPDATED:', error);
  }
};

/**
 * Publica un evento de cita cancelada
 */
const publishCitaCancelled = async (citaData) => {
  try {
    const message = {
      eventType: 'CITA_CANCELLED',
      timestamp: new Date().toISOString(),
      data: citaData
    };

    await channel.publish(
      'cita.events',
      'cita.cancelled',
      Buffer.from(JSON.stringify(message))
    );

    console.log('📤 Evento CITA_CANCELLED publicado:', citaData.id);
  } catch (error) {
    console.error('❌ Error al publicar evento CITA_CANCELLED:', error);
  }
};

/**
 * Publica un evento de cita reagendada
 */
const publishCitaRescheduled = async (citaData) => {
  try {
    const message = {
      eventType: 'CITA_RESCHEDULED',
      timestamp: new Date().toISOString(),
      data: citaData
    };

    await channel.publish(
      'cita.events',
      'cita.rescheduled',
      Buffer.from(JSON.stringify(message))
    );

    console.log('📤 Evento CITA_RESCHEDULED publicado:', citaData.id);
  } catch (error) {
    console.error('❌ Error al publicar evento CITA_RESCHEDULED:', error);
  }
};

/**
 * Publica un evento de recordatorio de cita
 */
const publishCitaReminder = async (citaData, reminderType) => {
  try {
    const message = {
      eventType: 'CITA_REMINDER',
      timestamp: new Date().toISOString(),
      data: {
        ...citaData,
        reminderType // '24h', '2h', 'now'
      }
    };

    await channel.publish(
      'notification.events',
      'cita.reminder',
      Buffer.from(JSON.stringify(message))
    );

    console.log('📤 Evento CITA_REMINDER publicado:', citaData.id, reminderType);
  } catch (error) {
    console.error('❌ Error al publicar evento CITA_REMINDER:', error);
  }
};

/**
 * Cierra la conexión a RabbitMQ
 */
const closeRabbitMQ = async () => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch (error) {
    console.error('❌ Error al cerrar conexión RabbitMQ:', error);
  }
};

module.exports = {
  initializeRabbitMQ,
  subscribeToEvents,
  publishCitaCreated,
  publishCitaUpdated,
  publishCitaCancelled,
  publishCitaRescheduled,
  publishCitaReminder,
  closeRabbitMQ,
  getChannel: () => channel
};