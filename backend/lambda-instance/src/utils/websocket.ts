import { initializeRedis } from "../redis";

export const connectWebSocket = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const routeKey = event.requestContext.routeKey;

  switch (routeKey) {
    case '$connect':
      return handleConnect(connectionId);
    case '$disconnect':
      return handleDisconnect(connectionId);
    default:
      return { statusCode: 400, body: 'Invalid route' };
  }
};

const handleConnect = async (connectionId) => {
  const { redis } = await initializeRedis()

  try {
    await redis.sadd('connections', connectionId);
    return { statusCode: 200, body: 'Connected..' };
  } catch (error) {
    console.log('Error connecting:', error);
    return { statusCode: 500, body: 'Failed to connect..' };
  }
};

const handleDisconnect = async (connectionId) => {
  const { redis } = await initializeRedis()

  try {
    await redis.srem('connections', connectionId);
    return { statusCode: 200, body: 'Disconnected..' };
  } catch (error) {
    console.log('Error disconnecting:', error);
    return { statusCode: 500, body: 'Failed to disconnect..' };
  }
};