import { LoggerService, OnModuleInit } from '@nestjs/common';
import { RiskFreeRateSource } from '../entities/rf-rate-source.entity';
import { Repository } from 'typeorm';
import { calculateRiskFreeRate, getDaysToExpiration } from 'src/common/helpers';
import { UnderlyingAsset } from 'src/common/types';
import { parseInstrument } from '../utils/helpers';
import Redis from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { DELAY_MS } from '../utils/constants';
import {
  RiskFreeRateCollection,
  RiskFreeRateCollectionRes,
  UnderlyingAssetExpiryMapRes,
} from '@callput/shared';
export abstract class BaseRiskFreeRateService<T> implements OnModuleInit {
  protected abstract readonly logger: LoggerService;
  protected abstract readonly sourceName: string;
  protected abstract readonly underlyingAssets: UnderlyingAsset[];
  protected readonly redis: Redis;

  protected riskFreeRateCollectionRes: RiskFreeRateCollectionRes = {
    data: {},
    lastUpdatedAt: 0,
  };

  protected underlyingAssetExpiryMapRes: UnderlyingAssetExpiryMapRes = {
    data: {},
    lastUpdatedAt: 0,
  };

  constructor(
    @InjectRepository(RiskFreeRateSource)
    protected readonly sourceRepository: Repository<RiskFreeRateSource>,
    protected readonly redisService: RedisService,
  ) {
    this.redis = this.redisService.getOrThrow();
  }

  public getInitialized(): boolean {
    return this.riskFreeRateCollectionRes.lastUpdatedAt > 0;
  }

  public getRiskFreeRateCollectionRes(): RiskFreeRateCollectionRes {
    if (!this.getInitialized()) throw new Error('Risk-free rate map is not initialized');
    return {
      data: { ...this.riskFreeRateCollectionRes.data },
      lastUpdatedAt: this.riskFreeRateCollectionRes.lastUpdatedAt,
    };
  }

  public getRiskFreeRateCollection(): RiskFreeRateCollection {
    if (!this.getInitialized()) throw new Error('Risk-free rate map is not initialized');
    return { ...this.riskFreeRateCollectionRes.data };
  }

  protected async ensureRiskFreeRateSourceExists() {
    const existingSource = await this.sourceRepository.findOne({
      where: { name: this.sourceName },
    });

    if (!existingSource) {
      await this.sourceRepository.save(this.sourceRepository.create({ name: this.sourceName }));
      this.logger.log(`Created ${this.sourceName} risk free rate source`);
    } else {
      this.logger.log(`${this.sourceName} risk free rate source already exists`);
    }
  }

  // Removes outdated entries from the risk free rate map based on a list of expiries
  protected refreshRiskFreeRateCollection(underlyingAsset: UnderlyingAsset) {
    const validExpiries = new Set(this.underlyingAssetExpiryMapRes.data[underlyingAsset.toUpperCase()]);
    const rateMap = this.riskFreeRateCollectionRes.data[underlyingAsset.toUpperCase()];
    const rateMapLower = this.riskFreeRateCollectionRes.data[underlyingAsset.toLowerCase()];

    if (!rateMap) {
      this.logger.warn(`No risk-free rate map found for ${underlyingAsset}`);
      return;
    }

    Object.keys(rateMap).forEach((expiry) => {
      if (!validExpiries.has(Number(expiry))) {
        delete rateMap[expiry];
        delete rateMapLower[expiry];
        this.logger.debug(`Removed outdated risk-free rate for ${underlyingAsset} at expiry ${expiry}`);
      }
    });

    this.logger.log(`Refreshed risk-free rate map for ${underlyingAsset}`);
  }

  protected fetchOptions?(underlyingAsset: UnderlyingAsset): Promise<any[]>;
  protected fetchFuturesPrice?(underlyingAsset: UnderlyingAsset): Promise<number>;

  /*
   *  Generic Related Function
   */

  protected getExpiries(data: T[]): number[] {
    const now = Date.now();

    return Array.from(
      new Set(
        data
          .map((item) => {
            const instrument = this.getInstrument(item);
            const { expiry } = parseInstrument(this.sourceName, instrument);

            if (expiry < now) return undefined;

            return expiry;
          })
          .filter((expiry) => expiry !== undefined),
      ),
    ).sort((a, b) => a - b);
  }

  protected getUnderlyingPrices(data: T[]): Map<number, number> {
    const expiryPrices = new Map<number, number>();
    const now = Date.now();

    for (const item of data) {
      const instrument = this.getInstrument(item);

      if (this.sourceName === 'deribit' && !this.validateItem(item)) {
        this.logger.warn(`Skipping invalid item for ${instrument}`);
        continue;
      }

      const { expiry } = parseInstrument(this.sourceName, instrument);

      if (expiry < now) continue;

      if (!expiryPrices.has(expiry)) {
        expiryPrices.set(expiry, this.getUnderlyingPrice(item));
      }
    }

    const sortedEntries = Array.from(expiryPrices.entries()).sort((a, b) => a[0] - b[0]);

    return new Map(sortedEntries);
  }

  protected updateRiskFreeRateCollection(
    underlyingAsset: UnderlyingAsset,
    options: T[],
    futuresPrice: number,
  ) {
    const newExpiries = this.getExpiries(options);

    if (newExpiries.length === 0) {
      this.logger.warn(`No valid expiries found for ${underlyingAsset}`);
      return;
    }

    this.logger.log(`Updating ${underlyingAsset} risk free rate expiries...`);

    // If the key doesn't exist, create it
    if (!this.underlyingAssetExpiryMapRes.data[underlyingAsset.toUpperCase()]) {
      this.underlyingAssetExpiryMapRes.data[underlyingAsset.toUpperCase()] = [];
    }
    if (!this.underlyingAssetExpiryMapRes.data[underlyingAsset.toLowerCase()]) {
      this.underlyingAssetExpiryMapRes.data[underlyingAsset.toLowerCase()] = [];
    }

    this.underlyingAssetExpiryMapRes.data[underlyingAsset.toUpperCase()] = newExpiries;
    this.underlyingAssetExpiryMapRes.data[underlyingAsset.toLowerCase()] = newExpiries;
    this.refreshRiskFreeRateCollection(underlyingAsset);

    const newExpiryPrices = this.getUnderlyingPrices(options);

    // If the key doesn't exist, create it
    if (!this.riskFreeRateCollectionRes.data[underlyingAsset.toUpperCase()]) {
      this.riskFreeRateCollectionRes.data[underlyingAsset.toUpperCase()] = {};
    }
    if (!this.riskFreeRateCollectionRes.data[underlyingAsset.toLowerCase()]) {
      this.riskFreeRateCollectionRes.data[underlyingAsset.toLowerCase()] = {};
    }

    for (const [expiry, underlyingFutures] of newExpiryPrices) {
      const daysToExpiration = Math.ceil(getDaysToExpiration(expiry));
      const riskFreeRate = calculateRiskFreeRate(underlyingFutures, futuresPrice, daysToExpiration);
      this.riskFreeRateCollectionRes.data[underlyingAsset.toUpperCase()][expiry] = riskFreeRate;
      this.riskFreeRateCollectionRes.data[underlyingAsset.toLowerCase()][expiry] = riskFreeRate;
    }

    this.riskFreeRateCollectionRes.lastUpdatedAt = Date.now();
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    underlyingAsset: UnderlyingAsset,
    retryCount = 0,
    maxRetries = 5,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error in ${operationName} for ${underlyingAsset} (attempt ${retryCount + 1}/${maxRetries + 1}): ${errorMessage}`,
      );

      if (retryCount < maxRetries) {
        const delayMs = DELAY_MS * Math.pow(2, retryCount); // 지수 백오프: 500ms, 1000ms, 2000ms, 4000ms, 8000ms
        this.logger.log(`Retrying ${operationName} for ${underlyingAsset} in ${delayMs}ms...`);

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return this.withRetry(operation, operationName, underlyingAsset, retryCount + 1, maxRetries);
      }

      throw new Error(`Failed in ${operationName} after ${maxRetries + 1} attempts: ${errorMessage}`);
    }
  }

  protected getInstrument?(item: T): string;
  protected getUnderlyingPrice?(item: T): number;
  protected validateItem?(item: T): boolean;

  abstract onModuleInit(): Promise<void>;
}
