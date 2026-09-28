// =====================================================
//  PM2 ecosystem untuk Habibi Bot ID API
//  Jalankan: pm2 start ecosystem.config.js
//  Env (API_KEY dll.) dibaca dari file .env di folder ini
//  atau dari environment shell saat pm2 start.
// =====================================================
module.exports = {
  apps: [
    {
      name: 'habibi-api',
      script: './server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
