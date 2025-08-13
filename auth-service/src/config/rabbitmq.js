/**
 * Configuración de RabbitMQ para el microservicio de autenticación
 */

const amqp = require('amqplib');

let connection = null;
let channel = null;

/**
 * Suscribirse a eventos de usuario-service
 */
const subscribeToUserEvents = async () => {
  try {
    // Escuchar eventos de usuario actualizado
    await channel.assertQueue('auth.user.updated', { durable: true });
    await channel.bindQueue('auth.user.updated', 'user.events', 'user.updated');

    await channel.consume('auth.user.updated', async (msg) => {
      if (msg) {
        const eventData = JSON.parse(msg.content.toString());
        console.log('📥 Evento USER_UPDATED recibido en auth-service:', eventData.data);

        // Actualizar usuario en auth-service
        const Usuario = require('../models/Usuario');
        const { id, nombre, apellido, rol, cedula, fechaNacimiento, celular, direccion, perfilCompleto, activo } = eventData.data;
        const usuario = await Usuario.findByPk(id);
        if (usuario) {
          await usuario.update({
            nombre, apellido, rol, cedula, fechaNacimiento, celular, direccion, perfilCompleto, activo
          });
        }
        channel.ack(msg);
      }
    });

    // Escuchar eventos de usuario eliminado
    await channel.assertQueue('auth.user.deleted', { durable: true });
    await channel.bindQueue('auth.user.deleted', 'user.events', 'user.deleted');

    await channel.consume('auth.user.deleted', async (msg) => {
      if (msg) {
        const eventData = JSON.parse(msg.content.toString());
        console.log('📥 Evento USER_DELETED recibido en auth-service:', eventData.data);

        // Desactivar usuario en auth-service
        const Usuario = require('../models/Usuario');
        const { userId } = eventData.data;
        const usuario = await Usuario.findByPk(userId);
        if (usuario) {
          await usuario.update({ activo: false });
        }
        channel.ack(msg);
      }
    });

    console.log('✅ Suscripción a eventos de usuario-service configurada en auth-service');
  } catch (error) {
    console.error('❌ Error al suscribirse a eventos de usuario-service:', error);
  }
};

/**
 * Inicializa la conexión a RabbitMQ
 */
const initializeRabbitMQ = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    // Declarar exchanges
    await channel.assertExchange('auth.events', 'topic', { durable: true });
    await channel.assertExchange('user.events', 'topic', { durable: true });

    // Declarar colas para este servicio
    await channel.assertQueue('auth.user.created', { durable: true });
    await channel.assertQueue('auth.user.login', { durable: true });

    console.log('✅ RabbitMQ configurado para Auth Service');
  } catch (error) {
    console.error('❌ Error al conectar con RabbitMQ:', error);
    throw error;
  }
};

/**
 * Publica un evento de usuario creado
 */
const publishUserCreated = async (userData) => {
  try {
    const message = {
      eventType: 'USER_CREATED',
      timestamp: new Date().toISOString(),
      data: userData
    };

    await channel.publish(
      'user.events',
      'user.created',
      Buffer.from(JSON.stringify(message))
    );

    console.log('📤 Evento USER_CREATED publicado:', userData.id);
  } catch (error) {
    console.error('❌ Error al publicar evento USER_CREATED:', error);
  }
};

/**
 * Publica un evento de usuario actualizado
 */
const publishUserUpdated = async (userData) => {
  try {
    const message = {
      eventType: 'USER_UPDATED',
      timestamp: new Date().toISOString(),
      data: userData
    };

    await channel.publish(
      'user.events',
      'user.updated',
      Buffer.from(JSON.stringify(message))
    );

    console.log('📤 Evento USER_UPDATED publicado desde auth-service:', userData.id);
  } catch (error) {
    console.error('❌ Error al publicar evento USER_UPDATED:', error);
  }
};

/**
 * Publica un evento de usuario eliminado
 */
const publishUserDeleted = async (userId) => {
  try {
    const message = {
      eventType: 'USER_DELETED',
      timestamp: new Date().toISOString(),
      data: { userId }
    };

    await channel.publish(
      'user.events',
      'user.deleted',
      Buffer.from(JSON.stringify(message))
    );

    console.log('📤 Evento USER_DELETED publicado desde auth-service:', userId);
  } catch (error) {
    console.error('❌ Error al publicar evento USER_DELETED:', error);
  }
};

/**
 * Publica un evento de login de usuario
 */
const publishUserLogin = async (userId, loginData) => {
  try {
    const message = {
      eventType: 'USER_LOGIN',
      timestamp: new Date().toISOString(),
      data: {
        userId,
        ...loginData
      }
    };

    await channel.publish(
      'auth.events',
      'auth.login',
      Buffer.from(JSON.stringify(message))
    );

    console.log('📤 Evento USER_LOGIN publicado:', userId);
  } catch (error) {
    console.error('❌ Error al publicar evento USER_LOGIN:', error);
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
  subscribeToUserEvents,
  initializeRabbitMQ,
  publishUserCreated,
  publishUserUpdated,
  publishUserDeleted,
  publishUserLogin,
  closeRabbitMQ,
  getChannel: () => channel
};
