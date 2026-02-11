module.exports = {
  apps: [
    {
      name: "eventnode-base",
      script: "npx",
      args: "ts-node src/index.ts",
      env: {
        NETWORK: "base",
      },
    },
    {
      name: "eventnode-arbitrumOne",
      script: "npx",
      args: "ts-node src/index.ts",
      env: {
        NETWORK: "arbitrumOne",
      },
    },
  ],
};