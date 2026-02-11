import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BinanceSpotIndexService } from './data-sources/binance/binance-spot-index.service';
import { BitfinexSpotIndexService } from './data-sources/bitfinex/bitfinex-spot-index.service';
import { DeribitSpotIndexService } from './data-sources/deribit/deribit-spot-index.service';
import { ASSET_INDEX_UPDATE_THRESHOLD } from '../common/utils/constants';
import { MESSAGE_TYPE } from 'src/common/messages';
import { SlackService } from 'src/providers/slack/slack.service';
import { LogLevel } from 'src/common/enums';
import { AssetIndexSource } from '../common/entities/asset-index-source.entity';
import { Repository } from 'typeorm';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { REDIS_KEYS } from 'src/common/redis-keys';
import { EVERY_5_20_35_50_SECONDS } from 'src/common/constants';
import { WeightedAssetIndexService } from '../common/base/base-weighted-asset-index.service';
import { NormalizedSpotAsset, MultipleAssetIndexMapRes, NormalizedAssetType } from '@callput/shared';

@Injectable()
export class SpotIndexService extends WeightedAssetIndexService<NormalizedSpotAsset> {
  protected readonly logger = new Logger(SpotIndexService.name);
  protected readonly sourceName = 'callput';
  protected readonly normalizedAssetType = NormalizedAssetType.SPOT;
  protected readonly assets: NormalizedSpotAsset[] = ['BTC', 'ETH', 'USDC'];

  protected readonly MAX_CONCURRENT_JOBS = 2;

  protected sourceAssetIndexMapRes: MultipleAssetIndexMapRes<NormalizedSpotAsset> = {};

  constructor(
    sourceRepository: Repository<AssetIndexSource>,
    redisService: RedisService,
    private binanceSpotIndexService: BinanceSpotIndexService,
    private bitfinexSpotIndexService: BitfinexSpotIndexService,
    private deribitSpotIndexService: DeribitSpotIndexService,
    private slackService: SlackService,
  ) {
    super(sourceRepository, redisService);
  }

  private async getSourceSpotAssetIndexMap(): Promise<MultipleAssetIndexMapRes<NormalizedSpotAsset>> {
    try {
      const multipleAssetIndexMapRes: MultipleAssetIndexMapRes<NormalizedSpotAsset> = {
        binance: this.binanceSpotIndexService.getAssetIndexMapRes(),
        bitfinex: this.bitfinexSpotIndexService.getAssetIndexMapRes(),
        deribit: this.deribitSpotIndexService.getAssetIndexMapRes(),
      };

      Object.keys(multipleAssetIndexMapRes).forEach(
        (exchange) =>
          multipleAssetIndexMapRes[exchange].lastUpdatedAt < Date.now() - ASSET_INDEX_UPDATE_THRESHOLD &&
          delete multipleAssetIndexMapRes[exchange],
      );

      if (Object.keys(multipleAssetIndexMapRes).length < 1) {
        const message = MESSAGE_TYPE.SPOT_FETCHED_FROM_LESS_THAN_ONE_SOURCE;
        this.logger.error(message);
        await this.slackService.sendMessage(`\`[server-main]\` ${message}`, LogLevel.ERROR);
        throw new Error(message);
      }

      this.sourceAssetIndexMapRes = multipleAssetIndexMapRes;
      return multipleAssetIndexMapRes;
    } catch (error) {
      throw new Error(
        `Failed to get source spot indices: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async saveSpotIndexToRedis() {
    try {
      await this.redis.set(REDIS_KEYS.SPOT.MAIN, JSON.stringify(this.assetIndexMapRes));
      this.logger.debug(`Successfully saved ${this.normalizedAssetType} index to Redis`);
    } catch (error) {
      this.logger.error(`Failed to save ${this.normalizedAssetType} index to Redis:`, error);
    }
  }

  /*
   *  Override functions not supported
   */

  protected async updateAssetIndex(asset: NormalizedSpotAsset) {
    throw new Error('updateAssetIndex is not supported in this implementation');
  }

  /*
   *  Cron Jobs
   */

  @Cron(EVERY_5_20_35_50_SECONDS, {
    name: 'process-spot-index',
    timeZone: 'UTC',
  })
  private async processSpotIndex() {
    try {
      await this.executeJob(async () => {
        await this.getSourceSpotAssetIndexMap();
        await Promise.all(this.assets.map((asset) => this.setWeightedAssetIndex(asset)));
        await this.saveSpotIndexToRedis();
      });
    } catch (error) {
      this.logger.error(
        'Failed to process spot index:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /*
   *  Lifecycle Hooks
   */

  async onModuleInit() {
    await this.ensureAssetIndexSourceExists();
    await this.initialProcessSpotIndex();
  }

  // 초기화 시 Spot index 데이터가 준비될 때까지 반복 시도하는 메서드
  private async initialProcessSpotIndex(retryCount = 0, maxRetries = 10, delayMs = 10000) {
    try {
      await this.processSpotIndex();

      // 초기화 성공 여부 확인
      const isInitialized = this.getInitialized();

      if (!isInitialized && retryCount < maxRetries) {
        this.logger.log(
          `Spot index initialization attempt ${retryCount + 1} failed, retrying in ${delayMs / 1000} seconds...`,
        );
        setTimeout(() => this.initialProcessSpotIndex(retryCount + 1, maxRetries, delayMs), delayMs);
      } else if (!isInitialized) {
        this.logger.warn(
          `Failed to initialize Spot index data after ${maxRetries} attempts. Will rely on scheduled cron job.`,
        );
      } else {
        this.logger.log('Successfully initialized Spot index data');
      }
    } catch (error) {
      if (retryCount < maxRetries) {
        this.logger.warn(
          `Spot index initialization attempt ${retryCount + 1} failed with error: ${error instanceof Error ? error.message : String(error)}. Retrying in ${delayMs / 1000} seconds...`,
        );
        setTimeout(() => this.initialProcessSpotIndex(retryCount + 1, maxRetries, delayMs), delayMs);
      } else {
        this.logger.error(
          `Failed to initialize Spot index data after ${maxRetries} attempts. Will rely on scheduled cron job.`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
