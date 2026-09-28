// Entry point Habibi Bot ID.
import { config } from './config.js';
import { info, error } from './lib/logger.js';
import { start, stop } from './lib/connection.js';

async function main() {
  info(`🚀 Memulai ${config.BOT_NAME} (prefix: "${config.PREFIX}", mode: ${config.PAIR_METHOD})...`);
  await start();
}

function gracefulShutdown(signal) {
  return async () => {
    info(`Menerima ${signal}, mematikan bot dengan rapi...`);
    try {
      await stop();
    } catch (err) {
      error(`Error saat shutdown: ${err.message}`);
    }
    process.exit(0);
  };
}

process.on('SIGINT', gracefulShutdown('SIGINT'));
process.on('SIGTERM', gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  error(`Unhandled rejection: ${reason?.message || reason}`);
});

main().catch((err) => {
  error(`Gagal menjalankan bot: ${err.message}`);
  process.exit(1);
});
