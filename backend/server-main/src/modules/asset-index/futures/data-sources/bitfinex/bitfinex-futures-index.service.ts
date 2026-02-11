import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BaseAssetIndexService } from 'src/modules/asset-index/common/base/base-asset-index.service';
import { AssetIndexData } from 'src/modules/asset-index/common/base/base-asset-index.interface';
import { NormalizedAssetType, NormalizedFuturesAsset } from '@callput/shared';
import {
  API_REQUEST_TIMEOUT_MS,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY,
} from 'src/modules/asset-index/common/utils/constants';
import { AssetIndexSource } from 'src/modules/asset-index/common/entities/asset-index-source.entity';
import { Repository } from 'typeorm';
import { RedisService } from '@liaoliaots/nestjs-redis';

@Injectable()
export class BitfinexFuturesIndexService extends BaseAssetIndexService<NormalizedFuturesAsset> {
  protected readonly logger = new Logger(BitfinexFuturesIndexService.name);
  protected readonly sourceName = 'bitfinex';
  protected readonly normalizedAssetType = NormalizedAssetType.FUTURES;
  protected readonly assets: NormalizedFuturesAsset[] = ['BTC', 'ETH'];
  private readonly BITFINEX_FUTURES_INDEX_URL = 'https://api-pub.bitfinex.com/v2/status/deriv?keys=';

  protected readonly MAX_CONCURRENT_JOBS = 2;

  constructor(sourceRepository: Repository<AssetIndexSource>, redisService: RedisService) {
    super(sourceRepository, redisService);
  }

  protected async fetchAndTransform(asset: NormalizedFuturesAsset, retryCount = 0): Promise<AssetIndexData> {
    try {
      const keys = `t${asset}F0:USTF0`;
      const response = await axios.get(this.BITFINEX_FUTURES_INDEX_URL + keys, {
        timeout: API_REQUEST_TIMEOUT_MS,
      });

      if (!response.data[0][15]) {
        throw new Error(`Invalid response format for ${this.normalizedAssetType} index`);
      }

      const result = response.data[0];

      return {
        name: asset,
        price: result[15],
        timestamp: result[1],
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

  @Cron(CronExpression.EVERY_SECOND, {
    name: 'process-bitfinex-futures-index',
    timeZone: 'UTC',
  })
  private async processBitfinexFuturesIndex() {
    try {
      await this.executeJob(async () => {
        await Promise.all(this.assets.map((asset) => this.updateAssetIndex(asset)));
      });
    } catch (error) {
      this.logger.error(
        'Failed to process bitfinex futures index:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /*
   *  Lifecycle Hooks
   */

  async onModuleInit() {
    await this.ensureAssetIndexSourceExists();
    await this.processBitfinexFuturesIndex();
  }
}
