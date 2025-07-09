require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('./src/config/database');
const Usuario = require('./src/models/Usuario');

async function createAdmin() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    // Verificar si ya existe un admin
    const adminExistente = await Usuario.findOne({
      where: { email: 'admin@seledental.com' }
    });

    if (adminExistente) {
      console.log('⚠️ El administrador ya existe');
      console.log('Email:', adminExistente.email);
      process.exit(0);
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

    console.log('✅ Administrador creado exitosamente:');
    console.log('Email:', nuevoAdmin.email);
    console.log('Rol:', nuevoAdmin.rol);
    console.log('ID:', nuevoAdmin.id);

  } catch (error) {
    console.error('❌ Error al crear administrador:', error);
  } finally {
    process.exit(0);
  }
}

createAdmin();