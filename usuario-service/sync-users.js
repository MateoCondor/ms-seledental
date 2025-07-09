/**
 * Script de sincronización de usuarios entre auth-service y usuario-service
 * Ejecutar una sola vez para sincronizar usuarios existentes
 */

require('dotenv').config();

const { sequelize } = require('./src/config/database');
const Usuario = require('./src/models/Usuario');
const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

/**
 * Sincroniza usuarios del auth-service al usuario-service
 */
const sincronizarUsuarios = async () => {
  try {
    console.log('🔄 Iniciando sincronización de usuarios...');

    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('✅ Conexión a la base de datos establecida');

    // Obtener todos los usuarios del auth-service
    const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/usuarios-internos`, {
      headers: {
        'x-internal-service': 'usuario-service'
      }
    });

    if (!response.data.success) {
      throw new Error('No se pudieron obtener usuarios del auth-service');
    }

    const usuariosAuth = response.data.data.usuarios;
    console.log(`📊 Encontrados ${usuariosAuth.length} usuarios en auth-service`);

    let sincronizados = 0;
    let existentes = 0;

    for (const usuarioAuth of usuariosAuth) {
      // Verificar si ya existe en usuario-service
      const usuarioExistente = await Usuario.findOne({
        where: { email: usuarioAuth.email }
      });

      if (!usuarioExistente) {
        // Crear usuario en usuario-service
        await Usuario.create({
          authId: usuarioAuth.id,
          nombre: usuarioAuth.nombre,
          apellido: usuarioAuth.apellido,
          email: usuarioAuth.email,
          rol: usuarioAuth.rol,
          perfilCompleto: usuarioAuth.perfilCompleto || false,
          activo: usuarioAuth.activo !== false
        });

        sincronizados++;
        console.log(`✅ Usuario sincronizado: ${usuarioAuth.email}`);
      } else {
        // Actualizar authId si no existe
        if (!usuarioExistente.authId) {
          await usuarioExistente.update({ authId: usuarioAuth.id });
          console.log(`🔗 AuthId actualizado para: ${usuarioAuth.email}`);
        }
        existentes++;
      }
    }

    console.log(`\n📊 Resumen de sincronización:`);
    console.log(`   - Usuarios sincronizados: ${sincronizados}`);
    console.log(`   - Usuarios existentes: ${existentes}`);
    console.log(`   - Total procesados: ${usuariosAuth.length}`);
    console.log('🎉 Sincronización completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la sincronización:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

// Ejecutar sincronización
sincronizarUsuarios();
