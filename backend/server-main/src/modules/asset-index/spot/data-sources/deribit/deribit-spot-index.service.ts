import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { DeribitSpotIndexRes } from './deribit-spot-index.interface';
import { Cron } from '@nestjs/schedule';
import { EVERY_0_15_30_45_SECONDS } from 'src/common/constants';
import { BaseAssetIndexService } from 'src/modules/asset-index/common/base/base-asset-index.service';
import { AssetIndexData } from 'src/modules/asset-index/common/base/base-asset-index.interface';
import {
  API_REQUEST_TIMEOUT_MS,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY,
} from 'src/modules/asset-index/common/utils/constants';
import { AssetIndexSource } from 'src/modules/asset-index/common/entities/asset-index-source.entity';
import { Repository } from 'typeorm';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { NormalizedAssetType, NormalizedSpotAsset } from '@callput/shared';

@Injectable()
export class DeribitSpotIndexService extends BaseAssetIndexService<NormalizedSpotAsset> {
  protected readonly logger = new Logger(DeribitSpotIndexService.name);
  protected readonly sourceName = 'deribit';
  protected readonly normalizedAssetType = NormalizedAssetType.SPOT;
  protected readonly assets: NormalizedSpotAsset[] = ['BTC', 'ETH', 'USDC'];
  private readonly DERIBIT_SPOT_INDEX_URL = 'https://deribit.com/api/v2/public/ticker?instrument_name=';

  protected readonly MAX_CONCURRENT_JOBS = 2;

  constructor(sourceRepository: Repository<AssetIndexSource>, redisService: RedisService) {
    super(sourceRepository, redisService);
  }

  protected async fetchAndTransform(asset: NormalizedSpotAsset, retryCount = 0): Promise<AssetIndexData> {
    try {
      const symbol = `${asset}_USDT`;
      const response = await axios.get<{ result: DeribitSpotIndexRes }>(
        this.DERIBIT_SPOT_INDEX_URL + symbol,
        { timeout: API_REQUEST_TIMEOUT_MS },
      );

      if (!response.data?.result?.mark_price) {
        throw new Error(`Invalid response format for ${this.normalizedAssetType} index`);
      }

      const result = response.data.result;

      return {
        name: asset,
        price: result.mark_price,
        timestamp: result.timestamp,
      };
    } catch (error) {
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        this.logger.warn(`Retry attempt ${retryCount + 1} for ${asset}`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return this.fetchAndTransform(asset, retryCount + 1);
      }

      if (error instanceof AxiosError) {
        this.logger.error(
          `Network error fetching ${this.normalizedAssetType} index for ${asset}: ${error.message}`,
        );
      } else {
        this.logger.error(`Error fetching ${this.normalizedAssetType} index for ${asset}: ${error.message}`);
      }
      throw error;
    }
  }

  /*
   *  Cron Jobs
   */

  @Cron(EVERY_0_15_30_45_SECONDS, {
    name: 'process-deribit-spot-index',
    timeZone: 'UTC',
  })
  private async processDeribitSpotIndex() {
    try {
      await this.executeJob(async () => {
        await Promise.all(this.assets.map((asset) => this.updateAssetIndex(asset)));
      });
    } catch (error) {
      this.logger.error(
        'Failed to process deribit spot index:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /*
   *  Lifecycle Hooks
   */

  async onModuleInit() {
    await this.ensureAssetIndexSourceExists();
    await this.processDeribitSpotIndex();
  }
}
