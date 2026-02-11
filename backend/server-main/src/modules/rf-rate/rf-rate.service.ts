import { Injectable, Logger } from '@nestjs/common';
import { OkxRiskFreeRateService } from './data-sources/okx/okx-rf-rate.service';
import { Repository } from 'typeorm';
import { BybitRiskFreeRateService } from './data-sources/bybit/bybit-rf-rate.service';
import { DeribitRiskFreeRateService } from './data-sources/deribit/deribit-rf-rate.service';
import { RiskFreeRateSource } from './entities/rf-rate-source.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { REDIS_KEYS } from 'src/common/redis-keys';
import { BaseRiskFreeRateService } from './base/base-rf-rate.service';
import { RISK_FREE_RATE_UPDATE_THRESHOLD } from './utils/constants';
import { UnderlyingAsset } from 'src/common/types';
import { MESSAGE_TYPE } from 'src/common/messages';
import { SlackService } from 'src/providers/slack/slack.service';
import { LogLevel } from 'src/common/enums';
import { MultipleRiskFreeRateCollectionRes } from '@callput/shared';

@Injectable()
export class RiskFreeRateService extends BaseRiskFreeRateService<any> {
  protected readonly logger = new Logger(RiskFreeRateService.name);
  protected readonly sourceName = 'callput';
  protected readonly underlyingAssets: UnderlyingAsset[] = ['BTC', 'ETH'];

  private sourceRiskFreeRateCollectionRes: MultipleRiskFreeRateCollectionRes = {};

  constructor(
    sourceRepository: Repository<RiskFreeRateSource>,
    redisService: RedisService,
    private okxRiskFreeRateService: OkxRiskFreeRateService,
    private bybitRiskFreeRateService: BybitRiskFreeRateService,
    private deribitRiskFreeRateService: DeribitRiskFreeRateService,
    private slackService: SlackService,
  ) {
    super(sourceRepository, redisService);
  }

  /*
   *  Private Methods
   */

  // Helper method to handle fetching the risk-free rate maps from the data sources
  private async getSourceRiskFreeRateCollectionRes(): Promise<MultipleRiskFreeRateCollectionRes> {
    try {
      const riskFreeRateMaps = {
        okx: this.okxRiskFreeRateService.getRiskFreeRateCollectionRes(),
        bybit: this.bybitRiskFreeRateService.getRiskFreeRateCollectionRes(),
        deribit: this.deribitRiskFreeRateService.getRiskFreeRateCollectionRes(),
      };

      Object.keys(riskFreeRateMaps).forEach(
        (source) =>
          riskFreeRateMaps[source].lastUpdatedAt < Date.now() - RISK_FREE_RATE_UPDATE_THRESHOLD &&
          delete riskFreeRateMaps[source],
      );

      if (Object.keys(riskFreeRateMaps).length < 1) {
        const message = MESSAGE_TYPE.RF_RATE_FETCHED_FROM_LESS_THAN_ONE_SOURCE;
        this.logger.error(message);
        await this.slackService.sendMessage(`\`[server-main]\` ${message}`, LogLevel.ERROR);
        throw new Error(message);
      }

      this.sourceRiskFreeRateCollectionRes = riskFreeRateMaps;
      return riskFreeRateMaps;
    } catch (error) {
      throw new Error(
        `Failed to get source risk-free rate maps: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Helper method to set the risk-free rate map for the given underlying asset
  private setRiskFreeRateCollection(underlyingAsset: UnderlyingAsset) {
    const rawRiskFreeRates: { [expiry: number]: number[] } = {};

    Object.values(this.sourceRiskFreeRateCollectionRes).forEach((map) => {
      Object.entries(map.data[underlyingAsset]).forEach(([expiry, rate]) => {
        if (!rawRiskFreeRates[expiry]) rawRiskFreeRates[expiry] = [];
        rawRiskFreeRates[expiry].push(rate);
      });
    });

    this.riskFreeRateCollectionRes.data[underlyingAsset.toUpperCase()] = {};
    this.riskFreeRateCollectionRes.data[underlyingAsset.toLowerCase()] = {};

    Object.entries(rawRiskFreeRates).forEach(([expiry, rates]) => {
      const averageRate = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
      this.riskFreeRateCollectionRes.data[underlyingAsset.toUpperCase()][Number(expiry)] = averageRate;
      this.riskFreeRateCollectionRes.data[underlyingAsset.toLowerCase()][Number(expiry)] = averageRate;
    });

    this.riskFreeRateCollectionRes.lastUpdatedAt = Date.now();
  }

  // Helper method to save the risk-free rate map to Redis
  private async saveRiskFreeRateCollectionToRedis() {
    try {
      await this.redis.set(REDIS_KEYS.RF_RATE.MAIN, JSON.stringify(this.riskFreeRateCollectionRes));
      this.logger.debug('Successfully saved risk-free rate collection to Redis');
    } catch (error) {
      this.logger.error('Failed to save risk-free rate collection to Redis:', error);
    }
  }

  // Helper method to save the risk-free rate maps to the database
  // private async saveSourceRiskFreeRateCollectionsToDatabase(sourceRiskFreeRateCollectionRes: MultipleRiskFreeRateCollectionRes) {
  //   const createdAt = new Date();

  //   for (const [sourceName, riskFreeRateCollectionRes] of Object.entries(sourceRiskFreeRateCollectionRes)) {
  //     const source = await this.riskFreeRateSourceRepository.findOne({ where: { name: sourceName } });

  //     const newRates: RiskFreeRate[] = []

  //     for (const underlyingAsset of Object.keys(riskFreeRateCollectionRes.data) as Array<"BTC" | "ETH">) {
  //       const rateMap = riskFreeRateCollectionRes.data[underlyingAsset];
  //       const rateObject: { [key: number]: number } = {};
  //       rateMap.forEach((value, key) => {
  //         rateObject[key] = value;
  //       });

  //       newRates.push(
  //         this.riskFreeRateRepository.create({
  //           underlyingAsset,
  //           rate: JSON.stringify(rateObject), // Convert Map to string
  //           source,
  //           createdAt
  //         })
  //       );
  //     }

  //     await this.riskFreeRateRepository.save(newRates);
  //   }

  //   this.logger.log(`Saved ${Object.keys(sourceRiskFreeRateCollectionRes).length} sources of risk-free rates at ${createdAt}`);
  // }

  /*
   *  Override functions not supported
   */

  protected refreshRiskFreeRateCollection(underlyingAsset: UnderlyingAsset) {
    throw new Error('refreshRiskFreeRateCollection is not supported in this implementation');
  }

  protected getExpiries(data: any[]): number[] {
    throw new Error('getExpiries is not supported in this implementation');
  }

  protected getUnderlyingPrices(data: any[]): Map<number, number> {
    throw new Error('getUnderlyingPrices is not supported in this implementation');
  }

  protected updateRiskFreeRateCollection(
    underlyingAsset: UnderlyingAsset,
    options: any[],
    futuresPrice: number,
  ) {
    throw new Error('updateRiskFreeRateCollection is not supported in this implementation');
  }

  /*
   *  Cron Jobs
   */

  @Cron(CronExpression.EVERY_HOUR, {
    name: 'process-risk-free-rate',
    timeZone: 'UTC',
  })
  private async processRiskFreeRate() {
    this.logger.debug('Processing risk-free rate map');

    try {
      await this.getSourceRiskFreeRateCollectionRes();
      await Promise.all(
        this.underlyingAssets.map((underlyingAsset) => this.setRiskFreeRateCollection(underlyingAsset)),
      );
      await this.saveRiskFreeRateCollectionToRedis();
    } catch (error) {
      this.logger.error(
        'Failed to process risk-free rate map:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /*
   *  Lifecycle Hooks
   */

  async onModuleInit() {
    await this.ensureRiskFreeRateSourceExists();
    await this.initialProcessRiskFreeRate();
  }

  private async initialProcessRiskFreeRate(retryCount = 0, maxRetries = 10, delayMs = 10000) {
    try {
      await this.processRiskFreeRate();

      // 초기화 성공 여부 확인 (getInitialized 메서드 사용)
      const isInitialized = this.getInitialized();

      if (!isInitialized && retryCount < maxRetries) {
        this.logger.log(
          `Risk-free rate initialization attempt ${retryCount + 1} failed, retrying in ${delayMs / 1000} seconds...`,
        );
        setTimeout(() => this.initialProcessRiskFreeRate(retryCount + 1, maxRetries, delayMs), delayMs);
      } else if (!isInitialized) {
        this.logger.warn(
          `Failed to initialize risk-free rate data after ${maxRetries} attempts. Will rely on hourly cron job.`,
        );
      } else {
        this.logger.log('Successfully initialized risk-free rate data');
      }
    } catch (error) {
      if (retryCount < maxRetries) {
        this.logger.warn(
          `Risk-free rate initialization attempt ${retryCount + 1} failed with error: ${error instanceof Error ? error.message : String(error)}. Retrying in ${delayMs / 1000} seconds...`,
        );
        setTimeout(() => this.initialProcessRiskFreeRate(retryCount + 1, maxRetries, delayMs), delayMs);
      } else {
        this.logger.error(
          `Failed to initialize risk-free rate data after ${maxRetries} attempts. Will rely on hourly cron job.`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
