import dotenv from 'dotenv';
import path from 'path';
import { readFileSync } from 'fs';
import { AllowedNetworks, EnvVars } from './index';

export function loadEnv(network: AllowedNetworks): EnvVars {
  const envPath = path.join('environments', network, '.env');
  const envFile = readFileSync(envPath);
  const parsedEnv = dotenv.parse(envFile) as any;

  const env: EnvVars = {
    ...parsedEnv,
  }
  
  return env;
}