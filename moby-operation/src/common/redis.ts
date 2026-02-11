import Redis from "ioredis";

class RedisClient {
  private static instance: Redis | null = null;

  static initialize() {
    if (this.instance) return this.instance;

    this.instance = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
      connectTimeout: 10 * 1000,
      retryStrategy: (times: number) => {
        return Math.min(times * 50, 2000);
      },
    });

    this.instance.on("error", (err) => {
      console.error("Redis error", err);
    });

    this.instance.on("connect", () => {
      console.log("Connected to Redis");
    });

    return this.instance;
  }

  static getInstance(): Redis {
    if (!this.instance) {
      throw new Error("Redis client not initialized");
    }
    return this.instance;
  }
}

export const redis = {
  initialize: RedisClient.initialize.bind(RedisClient),
  getInstance: RedisClient.getInstance.bind(RedisClient),
};
