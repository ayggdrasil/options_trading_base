

import Redis from "ioredis";

export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  connectTimeout: 10 * 1000, // 10 seconds
  retryStrategy: (times) => {
    return Math.min(times * 50, 2000);
  }
})

redis.on('error', (err) => {
  console.error('Redis error', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('reconnecting', (delay) => {
  console.log(`Reconnecting to Redis in ${delay} ms`);
});