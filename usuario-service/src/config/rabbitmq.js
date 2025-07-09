/**
 * Configuración de RabbitMQ para el microservicio de usuarios
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
    await channel.assertExchange('user.events', 'topic', { durable: true });
    await channel.assertExchange('cita.events', 'topic', { durable: true });

    // Declarar colas para este servicio
    await channel.assertQueue('usuario.profile.updated', { durable: true });
    await channel.assertQueue('usuario.user.created', { durable: true });

    console.log('✅ RabbitMQ configurado para Usuario Service');
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
    const Usuario = require('../models/Usuario');
    
    // Escuchar eventos de usuario creado desde auth-service
    await channel.bindQueue('usuario.user.created', 'user.events', 'user.created');
    
    await channel.consume('usuario.user.created', async (msg) => {
      if (msg) {
        try {
          const eventData = JSON.parse(msg.content.toString());
          console.log('📥 Evento USER_CREATED recibido:', eventData.data);
          
          // Verificar si el usuario ya existe en usuario-service
          const usuarioExistente = await Usuario.findOne({ 
            where: { email: eventData.data.email } 
          });
          
          if (!usuarioExistente) {
            // Crear usuario en usuario-service con los datos del auth-service
            const nuevoUsuario = await Usuario.create({
              authId: eventData.data.id, // ID del auth-service
              nombre: eventData.data.nombre,
              apellido: eventData.data.apellido,
              email: eventData.data.email,
              rol: eventData.data.rol,
              perfilCompleto: eventData.data.perfilCompleto || false,
              activo: true
            });
            
            console.log('✅ Usuario replicado en usuario-service:', nuevoUsuario.email);
          } else {
            console.log('ℹ️ Usuario ya existe en usuario-service:', eventData.data.email);
          }
          
          channel.ack(msg);
        } catch (error) {
          console.error('❌ Error procesando evento USER_CREATED:', error);
          // Rechazar mensaje y reenviar a cola (requeue)
          channel.nack(msg, false, true);
        }
      }
    });

    console.log('✅ Suscripción a eventos configurada');
  } catch (error) {
    console.error('❌ Error al configurar suscripciones:', error);
  }
};

/**
 * Publica un evento de perfil actualizado
 */
const publishProfileUpdated = async (userData) => {
  try {
    const message = {
      eventType: 'PROFILE_UPDATED',
      timestamp: new Date().toISOString(),
      data: userData
    };

    await channel.publish(
      'user.events',
      'user.profile.updated',
      Buffer.from(JSON.stringify(message))
    );

    console.log('📤 Evento PROFILE_UPDATED publicado:', userData.id);
  } catch (error) {
    console.error('❌ Error al publicar evento PROFILE_UPDATED:', error);
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

    console.log('📤 Evento USER_UPDATED publicado:', userData.id);
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

    console.log('📤 Evento USER_DELETED publicado:', userId);
  } catch (error) {
    console.error('❌ Error al publicar evento USER_DELETED:', error);
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
  publishProfileUpdated,
  publishUserUpdated,
  publishUserDeleted,
  closeRabbitMQ,
  getChannel: () => channel
};
