import { LoggerService, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AssetIndexData } from './base-asset-index.interface';
import { AssetIndexSource } from '../entities/asset-index-source.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import {
  AssetIndexMap,
  AssetIndexMapRes,
  FuturesAssetNumberMap,
  NormalizedAssetType,
  NormalizedFuturesAsset,
  NormalizedSpotAsset,
  SpotAssetIndexMap,
} from '@callput/shared';

export abstract class BaseAssetIndexService<TAsset extends NormalizedSpotAsset | NormalizedFuturesAsset>
  implements OnModuleInit
{
  protected abstract readonly logger: LoggerService;
  protected abstract readonly sourceName: string;
  protected abstract readonly normalizedAssetType: NormalizedAssetType;
  protected abstract readonly assets: TAsset[];
  protected readonly redis: Redis;

  protected abstract readonly MAX_CONCURRENT_JOBS: number;
  protected runningJobs = 0;

  protected assetIndexMapRes: AssetIndexMapRes<TAsset> = {
    data: {} as TAsset extends NormalizedSpotAsset ? SpotAssetIndexMap : FuturesAssetNumberMap,
    lastUpdatedAt: 0,
  };

  constructor(
    @InjectRepository(AssetIndexSource)
    protected readonly sourceRepository: Repository<AssetIndexSource>,
    protected readonly redisService: RedisService,
  ) {
    this.redis = this.redisService.getOrThrow();
  }

  public getInitialized(): boolean {
    return this.assetIndexMapRes.lastUpdatedAt > 0;
  }

  public getAssetIndexMapRes(): AssetIndexMapRes<TAsset> {
    if (!this.getInitialized()) {
      throw new Error(`${this.normalizedAssetType} index not initialized`);
    }
    return {
      data: { ...this.assetIndexMapRes.data },
      lastUpdatedAt: this.assetIndexMapRes.lastUpdatedAt,
    };
  }

  public getAssetIndexMap(): AssetIndexMap<TAsset> {
    if (!this.getInitialized()) {
      throw new Error(`${this.normalizedAssetType} index not initialized`);
    }
    return {
      ...this.assetIndexMapRes.data,
    };
  }

  protected async ensureAssetIndexSourceExists() {
    const existingSource = await this.sourceRepository.findOne({
      where: {
        name: this.sourceName,
        type: this.normalizedAssetType,
      },
    });

    if (!existingSource) {
      await this.sourceRepository.save(
        this.sourceRepository.create({
          name: this.sourceName,
          type: this.normalizedAssetType,
        }),
      );
      this.logger.log(`Created ${this.normalizedAssetType} index source`);
    } else {
      this.logger.log(`${this.normalizedAssetType} index source already exists`);
    }
  }

  protected async updateAssetIndex(asset: TAsset) {
    try {
      const transformedData = await this.fetchAndTransform(asset, 0);

      // Update asset index with transformed data
      this.assetIndexMapRes.data[asset.toUpperCase() as TAsset] = transformedData.price;
      this.assetIndexMapRes.data[asset.toLowerCase() as TAsset] = transformedData.price;
      this.assetIndexMapRes.lastUpdatedAt = transformedData.timestamp;
    } catch (error) {
      this.logger.error(`Failed to update ${this.normalizedAssetType} index for ${asset}: `, error);
      // Don't throw to allow other assets to update
    }
  }

  protected async executeJob<T>(job: () => Promise<T>): Promise<T | void> {
    if (this.runningJobs >= this.MAX_CONCURRENT_JOBS) {
      this.logger.log('Too many jobs running, skipping this execution.');
      return;
    }

    this.runningJobs++;
    try {
      return await job();
    } catch (error) {
      this.logger.error(`Failed to execute job:`, error);
    } finally {
      this.runningJobs--;
    }
  }

  /*
   *  Unimplemented Function
   */

  protected fetchAndTransform?(asset: TAsset, retryCount: number): Promise<AssetIndexData>;

  /*
   *  Generic Related Function
   */

  abstract onModuleInit(): Promise<void>;
}
