module.exports = {
  apps: [
    {
      name: 'dmx',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: './logs/dmx-err.log',
      out_file: './logs/dmx-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm Z',
    },
  ],
};