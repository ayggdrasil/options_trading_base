import Redis from "ioredis";
import { sendMessage } from "./utils/slack";
import { LogLevel } from "./utils/enums";
import { MESSAGE_TYPE } from "./utils/messages";
import { promisify } from "util";
import { gunzip, gzip } from "zlib";
import { getDateISOString } from "./utils/date";

interface Daily {
    data: {
        [key: string]: any;
    };
    lastUpdatedAt: number;
}

const RETRY_THRESHOLD = 3;
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

let retryCount = 0;

let prevRedis = null;
let prevRedisGlobal = null;

export const initializeRedis = async () => {
    const redis: Redis =
        prevRedis ||
        new Redis({
            host: process.env.APP_REDIS_HOST,
            port: 6379,
            password: process.env.APP_REDIS_PASSWORD,
            connectTimeout: 10 * 1000, // 10 seconds
            retryStrategy: (times) => {
                retryCount++;

                if (retryCount > RETRY_THRESHOLD) {
                    sendMessage(
                        `\`[Lambda][redis.ts]\` ${MESSAGE_TYPE.RECONNECING_TO_REDIS_FAILED}`,
                        LogLevel.WARN,
                        {
                            description: "failed " + retryCount + "times",
                        }
                    ).catch(console.error);
                }

                return Math.min(times * 50, 2000);
            },
        });

    const redisGlobal: Redis =
        prevRedisGlobal ||
            new Redis({
                host: process.env.APP_REDIS_GLOBAL_HOST,
                port: 6379,
                password: process.env.APP_REDIS_GLOBAL_PASSWORD,
                connectTimeout: 10 * 1000, // 10 seconds
                retryStrategy: (times) => {
                    retryCount++;

                    if (retryCount > RETRY_THRESHOLD) {
                        sendMessage(
                            `\`[Lambda][redis.ts]\` ${MESSAGE_TYPE.RECONNECING_TO_REDIS_FAILED}`,
                            LogLevel.WARN,
                            {
                                description: "failed " + retryCount + "times",
                            }
                        ).catch(console.error);
                    }

                    return Math.min(times * 50, 2000);
                },
            });

    prevRedis = redis;
    prevRedisGlobal = redisGlobal;

    if (!prevRedis) {
        redis.on("error", (err) => {
            console.log("Redis error", err);
        });
    
        redis.on("connect", () => {
            // console.log('Connected to Redis');
            retryCount = 0;
        });
    
        redis.on("reconnecting", (delay) => {
            console.log(`Reconnecting to Redis in ${delay} ms`);
        });
    }

    if (!prevRedisGlobal) {
        redisGlobal.on("error", (err) => {
            console.log("Redis error", err);
        });
        
        redisGlobal.on("connect", () => {
            // console.log('Connected to Redis');
            retryCount = 0;
        });
    
        redisGlobal.on("reconnecting", (delay) => {
            console.log(`Reconnecting to Redis in ${delay} ms`);
        });
    }

    return {
        redis,
        redisGlobal,
    };
};

export const updateLastUpdatedTime = async (key: string) => {
    const { redis } = await initializeRedis();
    const lastUpdatedTime = Date.now();
    await redis.set(key, lastUpdatedTime.toString());
}

export const compressData = async (data: any): Promise<Buffer> => {
    return gzipAsync(JSON.stringify(data));
};

export const decompressData = async (buffer: Buffer): Promise<any> => {
    if (!buffer) return null;
    const decompressed = await gunzipAsync(buffer);
    return JSON.parse(decompressed.toString());
};

export const getDailyRedis = async (dailyKey: string, isRedisGlobal: boolean = false): Promise<{ data: any, lastUpdatedAt: number }> => {
    const redisInstances = await initializeRedis();
    const redis = isRedisGlobal ? redisInstances.redisGlobal : redisInstances.redis;

    const buffer = await redis.getBuffer(dailyKey);

    if (!buffer) {
        return null; // 데이터가 없으면 null 반환
    }

    const daily = await decompressData(buffer);

    if (!daily?.data || Object.keys(daily.data).length === 0 || daily.lastUpdatedAt <= 0) {
        throw new Error(`Invalid daily data format: ${JSON.stringify(daily)}`);
    }

    return daily;
}

export const setDailyRedis = async (redisKey: string, currDaily: Daily, alertThreshold: number) => {
    const { redis } = await initializeRedis();

    const timestamp = Date.now();
    const dateISOString = getDateISOString();
    const dailyKey = `${redisKey}:${dateISOString}`;

    try {
        const prevDaily = await redis.getBuffer(dailyKey);

        console.log("prevDaily ", prevDaily);
        
        const decompressedPrevDaily = await decompressData(prevDaily) || {
            data: {},
            lastUpdatedAt: timestamp
        };

        console.log("decompressedPrevDaily ", decompressedPrevDaily);
    
        if (timestamp - decompressedPrevDaily.lastUpdatedAt > alertThreshold) { 
            await sendMessage(
                `\`[Lambda][redis.ts]\` ${MESSAGE_TYPE.REDIS_DATA_UPDATED_TOO_LONG_AGO}: ${redisKey}`,
                LogLevel.WARN,
                {
                    description: `Redis data updated too long ago: ${timestamp - decompressedPrevDaily.lastUpdatedAt}ms`,
                }
            )
        }
    
        const newData = {
            data: {
                ...decompressedPrevDaily.data,
                [currDaily.lastUpdatedAt]: currDaily.data,
            },
            lastUpdatedAt: timestamp,
        };

        console.log("newData ", newData);
    
        await redis.set(dailyKey, await compressData(newData));
    } catch (error) {
        console.log('redis.ts: error during setting daily redis ', error);
        throw error;
    }
    
};