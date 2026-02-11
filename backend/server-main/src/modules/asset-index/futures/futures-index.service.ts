import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BinanceFuturesIndexService } from './data-sources/binance/binance-futures-index.service';
import { BitfinexFuturesIndexService } from './data-sources/bitfinex/bitfinex-futures-index.service';
import { DeribitFuturesIndexService } from './data-sources/deribit/deribit-futures-index.service';
import { ASSET_INDEX_UPDATE_THRESHOLD } from '../common/utils/constants';
import { MESSAGE_TYPE } from 'src/common/messages';
import { SlackService } from 'src/providers/slack/slack.service';
import { LogLevel } from 'src/common/enums';
import { AssetIndexSource } from '../common/entities/asset-index-source.entity';
import { Repository } from 'typeorm';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { REDIS_KEYS } from 'src/common/redis-keys';
import { WeightedAssetIndexService } from '../common/base/base-weighted-asset-index.service';
import { MultipleAssetIndexMapRes, NormalizedAssetType, NormalizedFuturesAsset } from '@callput/shared';

@Injectable()
export class FuturesIndexService extends WeightedAssetIndexService<NormalizedFuturesAsset> {
  protected readonly logger = new Logger(FuturesIndexService.name);
  protected readonly sourceName = 'callput';
  protected readonly normalizedAssetType = NormalizedAssetType.FUTURES;
  protected readonly assets: NormalizedFuturesAsset[] = ['BTC', 'ETH'];

  protected readonly MAX_CONCURRENT_JOBS = 2;

  protected sourceAssetIndexMapRes: MultipleAssetIndexMapRes<NormalizedFuturesAsset> = {};

  constructor(
    sourceRepository: Repository<AssetIndexSource>,
    redisService: RedisService,
    private binanceFuturesIndexService: BinanceFuturesIndexService,
    private bitfinexFuturesIndexService: BitfinexFuturesIndexService,
    private deribitFuturesIndexService: DeribitFuturesIndexService,
    private slackService: SlackService,
  ) {
    super(sourceRepository, redisService);
  }

  /*
   *  Private Methods
   */

  private async getSourceFuturesAssetIndexMap(): Promise<MultipleAssetIndexMapRes<NormalizedFuturesAsset>> {
    try {
      const multipleAssetIndexMapRes: MultipleAssetIndexMapRes<NormalizedFuturesAsset> = {
        binance: this.binanceFuturesIndexService.getAssetIndexMapRes(),
        bitfinex: this.bitfinexFuturesIndexService.getAssetIndexMapRes(),
        deribit: this.deribitFuturesIndexService.getAssetIndexMapRes(),
      };

      Object.keys(multipleAssetIndexMapRes).forEach(
        (exchange) =>
          multipleAssetIndexMapRes[exchange].lastUpdatedAt < Date.now() - ASSET_INDEX_UPDATE_THRESHOLD &&
          delete multipleAssetIndexMapRes[exchange],
      );

      if (Object.keys(multipleAssetIndexMapRes).length < 1) {
        const message = MESSAGE_TYPE.FUTURES_FETCHED_FROM_LESS_THAN_ONE_SOURCE;
        this.logger.error(message);
        await this.slackService.sendMessage(`\`[server-main]\` ${message}`, LogLevel.ERROR);
        throw new Error(message);
      }

      this.sourceAssetIndexMapRes = multipleAssetIndexMapRes;
      return multipleAssetIndexMapRes;
    } catch (error) {
      throw new Error(
        `Failed to get source futures indices: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async saveFuturesIndexToRedis() {
    try {
      await this.redis.set(REDIS_KEYS.FUTURES.MAIN, JSON.stringify(this.assetIndexMapRes));
      this.logger.debug(`Successfully saved ${this.normalizedAssetType} index to Redis`);
    } catch (error) {
      this.logger.error(`Failed to save ${this.normalizedAssetType} index to Redis:`, error);
    }
  }

  /*
   *  Override functions not supported
   */

  protected async updateAssetIndex(asset: NormalizedFuturesAsset) {
    throw new Error('updateAssetIndex is not supported in this implementation');
  }

  /*
   *  Cron Jobs
   */

  @Cron(CronExpression.EVERY_SECOND, {
    name: 'process-futures-index',
    timeZone: 'UTC',
  })
  private async processFuturesIndex() {
    try {
      await this.executeJob(async () => {
        await this.getSourceFuturesAssetIndexMap();
        await Promise.all(this.assets.map((asset) => this.setWeightedAssetIndex(asset)));
        await this.saveFuturesIndexToRedis();
      });
    } catch (error) {
      this.logger.error(
        'Failed to process futures index:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /*
   *  Lifecycle Hooks
   */

  async onModuleInit() {
    await this.ensureAssetIndexSourceExists();
    await this.initialProcessFuturesIndex();
  }

  // 초기화 시 Futures index 데이터가 준비될 때까지 반복 시도하는 메서드
  private async initialProcessFuturesIndex(retryCount = 0, maxRetries = 10, delayMs = 10000) {
    try {
      await this.processFuturesIndex();

      // 초기화 성공 여부 확인
      const isInitialized = this.getInitialized();

      if (!isInitialized && retryCount < maxRetries) {
        this.logger.log(
          `Futures index initialization attempt ${retryCount + 1} failed, retrying in ${delayMs / 1000} seconds...`,
        );
        setTimeout(() => this.initialProcessFuturesIndex(retryCount + 1, maxRetries, delayMs), delayMs);
      } else if (!isInitialized) {
        this.logger.warn(
          `Failed to initialize Futures index data after ${maxRetries} attempts. Will rely on scheduled cron job.`,
        );
      } else {
        this.logger.log('Successfully initialized Futures index data');
      }
    } catch (error) {
      if (retryCount < maxRetries) {
        this.logger.warn(
          `Futures index initialization attempt ${retryCount + 1} failed with error: ${error instanceof Error ? error.message : String(error)}. Retrying in ${delayMs / 1000} seconds...`,
        );
        setTimeout(() => this.initialProcessFuturesIndex(retryCount + 1, maxRetries, delayMs), delayMs);
      } else {
        this.logger.error(
          `Failed to initialize Futures index data after ${maxRetries} attempts. Will rely on scheduled cron job.`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
