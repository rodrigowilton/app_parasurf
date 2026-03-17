module.exports = {
  apps: [{
    name: 'instituto-parasurf',
    script: 'npm',
    args: 'run dev', // ou 'start' se tiver script de produção
    cwd: '/var/www/parasurf',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3013
    }
  }]
};
