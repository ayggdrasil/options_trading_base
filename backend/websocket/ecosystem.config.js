// npm install -g ts-node typescript @types/node
module.exports = {
  apps: [{
    name: 'websocket',
    script: 'npx',
    args: 'ts-node src/index.ts',
    watch: true
  }]
};