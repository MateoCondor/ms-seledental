/**
 * Configuración de RabbitMQ para el microservicio de autenticación
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
  initializeRabbitMQ,
  publishUserCreated,
  publishUserLogin,
  closeRabbitMQ,
  getChannel: () => channel
};
