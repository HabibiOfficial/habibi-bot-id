// Konfigurasi PM2 untuk Habibi Bot ID (CommonJS — kompatibel dengan PM2).
// Jalankan dari folder bot/:  pm2 start ecosystem.config.cjs
// Catatan: file .js tidak dipakai karena bot memakai "type": "module"
// sehingga sintaks ESM (import/export) tidak bisa dibaca PM2.

module.exports = {
  apps: [
    {
      name: 'habibi-bot',
      script: 'index.js',
      cwd: __dirname,
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
