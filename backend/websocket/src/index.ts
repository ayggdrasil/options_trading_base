import dotenv from 'dotenv';

dotenv.config({ path: '.env', override: true });

import { sendMessage } from './slack';

// Global error handlers
process.on('uncaughtException', async (err: Error) => {
  console.error('Uncaught Exception:', err);
  await sendMessage(
    `\`[${process.env.INSTANCE_NAME}][index.ts]\` ${MESSAGE_TYPE.UNCAUGHT_EXCEPTION}`,
    LogLevel.ERROR,
    {
      description: err.message,
      disableThreading: true,
    },
  );
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled Rejection:', reason);
  await sendMessage(
    `\`[${process.env.INSTANCE_NAME}][index.ts]\` ${MESSAGE_TYPE.UNHANDLED_REJECTION}`,
    LogLevel.ERROR,
    {
      description: reason,
      disableThreading: true,
    },
  );
  process.exit(1);
});

let timeoutHandle;
process.on('SIGINT', async () => {
  clearTimeout(timeoutHandle);
  await sendMessage(
    `\`[${process.env.INSTANCE_NAME}][index.ts]\` ${MESSAGE_TYPE.PROCESS_TERMINATED_SIGINT}`,
    LogLevel.CRITICAL,
    {
      disableThreading: true,
    },
  );
  process.exit(0);
});

process.on('SIGTERM', async () => {
  clearTimeout(timeoutHandle);
  await sendMessage(
    `\`[${process.env.INSTANCE_NAME}][index.ts]\` ${MESSAGE_TYPE.PROCESS_TERMINATED_SIGTERM}`,
    LogLevel.CRITICAL,
    {
      disableThreading: true,
    },
  );
  process.exit(0);
});

import { sendDataToAll } from './server';
import { redis } from './redis';
import { initializeBinanceWss } from './websocket';
import { LogLevel } from '../utils/enums';
import { MESSAGE_TYPE } from './messages';
import { REDIS_KEYS } from '../utils/redis-key';
import { addEventToData } from '../utils/helpers';

const sendAll = async () => {
  try {
    const [futures, btcusdcKline15m, ethusdcKline15m] = await redis.mget(
      REDIS_KEYS.FUTURES.MAIN,
      'klines:BTCUSDC:15m',
      'klines:ETHUSDC:15m'
    );
    const dataToSend = [];

    if (futures) {
      const futuresWithEvent = addEventToData(futures, "futuresIndices");
      dataToSend.push(futuresWithEvent);
    }

    if (btcusdcKline15m) {
      dataToSend.push(btcusdcKline15m);
    }

    if (ethusdcKline15m) {
      dataToSend.push(ethusdcKline15m);
    }

    await Promise.all(dataToSend.map(sendDataToAll));
  } catch (error) {
    console.error('Error in main function:', error);
  } finally {
    timeoutHandle = setTimeout(sendAll, 1 * 1000);
  }
};

const main = async () => {
  sendAll();
  await initializeBinanceWss();
};

main().catch((error) => {
  console.error('Error in main function:', error);
});
