/**
 * Trabajos programados (cron jobs) para el microservicio de citas
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const Cita = require('../models/Cita');
const { publishCitaReminder } = require('../config/rabbitmq');

/**
 * Envía recordatorios de citas
 */
const enviarRecordatoriosCitas = async () => {
  try {
    console.log('🔄 Ejecutando job de recordatorios de citas...');

    const ahora = new Date();
    const en24Horas = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    const en2Horas = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);

    // Recordatorios 24 horas antes
    const citasEn24H = await Cita.findAll({
      where: {
        fechaHora: {
          [Op.between]: [ahora, en24Horas]
        },
        estado: {
          [Op.in]: ['pendiente', 'confirmada']
        },
        recordatorioEnviado: false
      }
    });

    for (const cita of citasEn24H) {
      await publishCitaReminder(cita, '24h');
      await cita.update({ recordatorioEnviado: true });
    }

    // Recordatorios 2 horas antes
    const citasEn2H = await Cita.findAll({
      where: {
        fechaHora: {
          [Op.between]: [ahora, en2Horas]
        },
        estado: {
          [Op.in]: ['pendiente', 'confirmada']
        }
      }
    });

    for (const cita of citasEn2H) {
      await publishCitaReminder(cita, '2h');
    }

    console.log(`✅ Recordatorios enviados: ${citasEn24H.length} (24h), ${citasEn2H.length} (2h)`);
  } catch (error) {
    console.error('❌ Error en job de recordatorios:', error);
  }
};

/**
 * Actualiza automáticamente citas vencidas
 */
const actualizarCitasVencidas = async () => {
  try {
    console.log('🔄 Ejecutando job de actualización de citas vencidas...');

    const ahora = new Date();
    const hace2Horas = new Date(ahora.getTime() - 2 * 60 * 60 * 1000);

    // Marcar como "no_asistio" las citas que pasaron hace más de 2 horas
    const citasVencidas = await Cita.update(
      { estado: 'no_asistio' },
      {
        where: {
          fechaHora: {
            [Op.lt]: hace2Horas
          },
          estado: {
            [Op.in]: ['pendiente', 'confirmada']
          }
        }
      }
    );

    console.log(`✅ Citas marcadas como "no_asistio": ${citasVencidas[0]}`);
  } catch (error) {
    console.error('❌ Error en job de citas vencidas:', error);
  }
};

/**
 * Limpia registros antiguos (opcional)
 */
const limpiarRegistrosAntiguos = async () => {
  try {
    console.log('🔄 Ejecutando job de limpieza de registros antiguos...');

    const hace6Meses = new Date();
    hace6Meses.setMonth(hace6Meses.getMonth() - 6);

    // Eliminar citas canceladas de hace más de 6 meses
    const citasEliminadas = await Cita.destroy({
      where: {
        estado: 'cancelada',
        createdAt: {
          [Op.lt]: hace6Meses
        }
      }
    });

    console.log(`✅ Registros antiguos eliminados: ${citasEliminadas}`);
  } catch (error) {
    console.error('❌ Error en job de limpieza:', error);
  }
};

/**
 * Inicia todos los trabajos programados
 */
const startCronJobs = () => {
  // Recordatorios cada 30 minutos
  cron.schedule('*/30 * * * *', enviarRecordatoriosCitas);

  // Actualizar citas vencidas cada hora
  cron.schedule('0 * * * *', actualizarCitasVencidas);

  // Limpieza de registros antiguos cada domingo a las 2:00 AM
  cron.schedule('0 2 * * 0', limpiarRegistrosAntiguos);

  console.log('✅ Trabajos programados iniciados');
};

module.exports = {
  startCronJobs,
  enviarRecordatoriosCitas,
  actualizarCitasVencidas,
  limpiarRegistrosAntiguos
};
