/**
 * Limpieza semanal de la base de datos (PostgreSQL en el VPS).
 * - Borra youtube_resolutions con más de 30 días (cache viejo)
 * - Borra queue_items played/skipped con más de 7 días (histórico viejo)
 *
 * Ejecutar manualmente: node scripts/cleanup.mjs
 * Cron semanal (domingos 3am): 0 3 * * 0 node /ruta/al/proyecto/scripts/cleanup.mjs
 */

import 'dotenv/config';
import { pool } from '../db.mjs';

async function cleanYoutubeCache() {
  const { rowCount } = await pool.query(
    `delete from youtube_resolutions where resolved_at < now() - interval '30 days'`,
  );
  console.log(`[cleanup] youtube_resolutions: ${rowCount ?? 0} entradas eliminadas (>30 días)`);
}

async function cleanQueueHistory() {
  const { rowCount } = await pool.query(
    `delete from queue_items
      where status in ('played','skipped') and created_at < now() - interval '7 days'`,
  );
  console.log(`[cleanup] queue_items: ${rowCount ?? 0} items eliminados (played/skipped >7 días)`);
}

const start = Date.now();
console.log(`[cleanup] Iniciando — ${new Date().toISOString()}`);

try {
  await cleanYoutubeCache();
  await cleanQueueHistory();
  console.log(`[cleanup] Listo en ${Date.now() - start}ms`);
} catch (e) {
  console.error('[cleanup] ERROR:', e);
  process.exitCode = 1;
} finally {
  await pool.end();
}
