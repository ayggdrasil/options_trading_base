interface EnvConfig {
  CHAIN: string;
  DEPLOYER_KEY: string;
  TEST_USER1_KEY: string;
  RPC_URL: string;
  GAS_LIMIT: string;
  GRAPHQL_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
  REDIS_PASSWORD: string;
  OLD_GRAPHQL_URL?: string; // 선택적 필드
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends EnvConfig {}
  }
}

export {};
