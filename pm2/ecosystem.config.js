// =============================================
// PM2 Ecosystem — Instituto ParaSurf
// =============================================
module.exports = {
  apps: [
    {
      name: 'instituto-parasurf',
      script: 'node_modules/.bin/serve',
      args: '-s dist -l 3015',
      cwd: '/var/www/parasurf',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 3015,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      out_file: '/var/log/pm2/parasurf-out.log',
      error_file: '/var/log/pm2/parasurf-error.log',
      merge_logs: true,
    },
  ],
};
