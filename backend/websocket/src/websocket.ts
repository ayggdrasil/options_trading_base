import axios from 'axios';
import WebSocket from 'ws';
import { sendMessage } from './slack';
import { redis } from './redis';
import { LogLevel } from '../utils/enums';
import { MESSAGE_TYPE } from './messages';

let errorTimeout;

export const initializeBinanceWss = async () => {
  const ws = new WebSocket(`wss://stream.binance.com:9443/ws`);

  ws.on('open', async function open(message) {
    const subscribeInfo = JSON.stringify({
      method: 'SUBSCRIBE',
      params: ['btcusdc@kline_15m', 'ethusdc@kline_15m'],
      id: 1,
    });

    ws.send(subscribeInfo);
  });

  ws.on('message', async function incoming(message) {
    const response = JSON.parse(message.toString());

    if (response.error) {
      console.log('WebSocket error:', response.error.message);

      if (errorTimeout) clearTimeout(errorTimeout);

      errorTimeout = setTimeout(() => {
        exitProcess(null, null);
      }, 60 * 1000);
    }

    if (response.id === 1) {
      console.log('WebSocket successfully subscribed');
    }

    if (response.e === 'kline') {
      try {
        const symbol = response.s; // BTCUSDC or ETHUSDC
        const interval = response.k.i; // 15m

        const newKline = {
          event: 'klines',
          symbol: symbol,
          interval: interval,
          data: [
            response.k.t, // Kline open time
            parseFloat(response.k.o), // Open Price
            parseFloat(response.k.h), // High Price
            parseFloat(response.k.l), // Low Price
            parseFloat(response.k.c), // Close Price
            response.k.T, // Kline close time
            response.k.x, // Is this kline closed?
          ],
          timestamp: Date.now(),
          lastUpdatedAt: new Date().toISOString(),
        };

        console.log(newKline, 'newKline');

        await redis.set(`klines:${symbol}:${interval}`, JSON.stringify(newKline));
      } catch (error) {
        console.error('Error in WebSocket message:', error);
        await sendMessage(
          `\`[WebSocket][websocket.ts]\` ${MESSAGE_TYPE.ERROR_IN_WEBSOCKET_MESSAGE}`,
          LogLevel.ERROR,
          {
            description: error,
          },
        );
      }
    }
  });

  ws.on('close', async function close() {
    exitProcess('ws error', 'WebSocket connection closed');
  });

  ws.on('error', async function error(err) {
    exitProcess('ws error', err);
  });
};

const exitProcess = async (message, error) => {
  if (message) {
    console.error('Process terminated due to ' + message + ':  ', error.message);
    await sendMessage(
      `\`[WebSocket][websocket.ts]\` ${MESSAGE_TYPE.PROCESS_TERMINATED_DUE_TO} ${message}`,
      LogLevel.ERROR,
      {
        description: error,
      },
    );
  }
  process.exit(1); // Exit the process. PM2 will restart it. Use a non-zero exit code to indicate abnormal termination
};
