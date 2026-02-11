module.exports = {
  apps: [
    {
      name: 'server-main-dev',
      script: 'nest start',
      env: {
        MODE: 'dev',
      },
      kill_timeout: 3000, // 강제 종료 전 대기 시간 (ms)
    },
    {
      name: 'server-main-prod',
      script: 'nest start',
      env: {
        MODE: 'prod',
      },
      kill_timeout: 3000, // 강제 종료 전 대기 시간 (ms)
    },
  ],
};
