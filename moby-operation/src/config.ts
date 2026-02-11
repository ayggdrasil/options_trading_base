import dotenv from "dotenv";
import path from "path";

import { isValidChain } from "./common/helper";

const validateEnv = () => {
  const requiredEnvVars = [
    "CHAIN",
    "DEPLOYER_KEY",
    "TEST_USER1_KEY",
    "RPC_URL",
    "GAS_LIMIT",
    "GRAPHQL_URL",
    "REDIS_HOST",
    "REDIS_PORT",
    "REDIS_PASSWORD",
  ] as const;

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
};

export const initializeConfig = () => {
  const networkIndex = process.argv.indexOf("--network");
  if (networkIndex === -1 || !process.argv[networkIndex + 1]) {
    throw new Error("Please provide --network option");
  }

  const inputChain = process.argv[networkIndex + 1];
  if (!inputChain || !isValidChain(inputChain)) {
    throw new Error("Invalid chain");
  }

  // set chain env
  const envPath = path.resolve(process.cwd(), "environments", inputChain, ".env");
  dotenv.config({ path: envPath });

  process.env.CHAIN = inputChain;
  validateEnv();
};
