module.exports = {
  apps: [
    {
      name: 'qpuc',
      script: 'backend/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        CORS_ORIGIN: 'https://qpuc.pro',
        MAX_ROOMS: 500,
        QUIZ_QUESTION_DURATION_SEC: 20,
      },
    },
  ],
};
