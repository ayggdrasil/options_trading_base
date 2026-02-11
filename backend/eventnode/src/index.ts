import { LogLevel } from './utils/enums';
import { MESSAGE_TYPE } from './utils/messages';
import fs from 'fs';
import path from 'path';

const ALLOWED_NETWORKS = ['base', 'arbitrumOne'];

const requiredKeys = [
  'PORT',
  'CHAIN_ID',
  'START_BLOCK',
  'BLOCK_BATCH_SIZE',
  'RPC_URL',

  'AWS_RDS_DB_HOST',
  'AWS_RDS_DB_PORT',
  'AWS_RDS_DB_USER',
  'AWS_RDS_DB_PASSWORD',
  'AWS_RDS_DB_NAME',

  'REDIS_HOST',
  'REDIS_PASSWORD',

  'SLACK_WEBHOOK_URL',
  'SLACK_BOT_TOKEN',
  'SLACK_NOTIFICATION_CHANNEL_ID',
  'SLACK_ALERT_CHANNEL_ID',
] as const;

const loadEnv = (network: string) => {
  if (!ALLOWED_NETWORKS.includes(network)) {
    console.error(`Invalid network: ${network}. Allowed networks are: ${ALLOWED_NETWORKS.join(', ')}`);
    process.exit(1);
  }

  const configPath = path.join(__dirname, '..', 'environments', network, 'env.json');

  try {
    const rawData = fs.readFileSync(configPath, 'utf8');
    const parsedData = JSON.parse(rawData);

    const missingKeys = requiredKeys.filter((key) => !(key in parsedData));
    if (missingKeys.length > 0) {
      throw new Error(`Missing required keys in config: ${missingKeys.join(', ')}`);
    }

    process.env = {
      ...process.env,
      ...parsedData,
    };
  } catch (error) {
    console.error(`Error loading config for network ${network}:`, error);
    process.exit(1);
  }
};

loadEnv(process.env.NETWORK);

import { sendMessage } from './slack';

process.on('uncaughtException', async (err: Error) => {
  console.error('Uncaught Exception:', err);
  await sendMessage(`\`[Eventnode][index.ts]\` ${MESSAGE_TYPE.UNCAUGHT_EXCEPTION}.`, LogLevel.ERROR, {
    description: err.message,
    disableThreading: true,
  });
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled Rejection:', reason);
  await sendMessage(`\`[Eventnode][index.ts]\` ${MESSAGE_TYPE.UNHANDLED_REJECTION}.`, LogLevel.ERROR, {
    description: reason,
    disableThreading: true,
  });
  process.exit(1);
});

process.on('SIGINT', async () => {
  await sendMessage(
    `\`[Eventnode][index.ts]\` ${MESSAGE_TYPE.PROCESS_TERMINATED_SIGINT}.`,
    LogLevel.CRITICAL,
    {
      disableThreading: true,
    },
  );
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await sendMessage(
    `\`[Eventnode][index.ts]\` ${MESSAGE_TYPE.PROCESS_TERMINATED_SIGTERM}.`,
    LogLevel.CRITICAL,
    {
      disableThreading: true,
    },
  );
  process.exit(0);
});

import { AppDataSource } from './data-source';
import { SyncedBlock } from './entity/syncedBlock';
import { runServer } from './server';
import { sync } from './sync';

export const main = async () => {
  await sendMessage(`\`[Eventnode][index.ts]\` ${MESSAGE_TYPE.EVENT_NODE_STARTING}`, LogLevel.WARN, {
    disableThreading: true,
  });

  await AppDataSource.initialize();

  runServer(); // run express(postgraphile) server

  const syncedBlock: SyncedBlock = await SyncedBlock.get(0);

  const fromBlock = syncedBlock ? Number(syncedBlock.blockNumber) + 1 : Number(process.env.START_BLOCK);

  // sync script
  sync(fromBlock);
};

(() => {
  main();
})();
