// Konfigurasi PM2 untuk Habibi Bot ID.
// Jalankan dari folder bot/:  pm2 start ecosystem.config.js
import { fileURLToPath } from 'node:url';

const BOT_DIR = fileURLToPath(new URL('.', import.meta.url));

export default {
  apps: [
    {
      name: 'habibi-bot',
      script: 'index.js',
      cwd: BOT_DIR,
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,
      // Variabel env dibaca dari file .env oleh aplikasi (dotenv).
      // Tambahkan override khusus PM2 di sini bila perlu:
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
