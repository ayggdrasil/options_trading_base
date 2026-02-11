import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { RiskFreeRateSource } from '../../entities/rf-rate-source.entity';
import { Repository } from 'typeorm';
import { BybitOptionMarket } from './bybit-rf-rate.interface';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BaseRiskFreeRateService } from '../../base/base-rf-rate.service';
import { UnderlyingAsset } from 'src/common/types';
import { RedisService } from '@liaoliaots/nestjs-redis';

@Injectable()
export class BybitRiskFreeRateService extends BaseRiskFreeRateService<BybitOptionMarket> {
  protected readonly logger = new Logger(BybitRiskFreeRateService.name);
  protected readonly sourceName = 'bybit';
  protected readonly underlyingAssets: UnderlyingAsset[] = ['BTC', 'ETH'];
  private readonly BYBIT_MARKET_TICKER_URL = 'https://api.bybit.com/v5/market/tickers';

  constructor(sourceRepository: Repository<RiskFreeRateSource>, redisService: RedisService) {
    super(sourceRepository, redisService);
  }

  protected async fetchOptions(underlyingAsset: UnderlyingAsset): Promise<BybitOptionMarket[]> {
    const response = await this.withRetry(
      () =>
        axios.get(this.BYBIT_MARKET_TICKER_URL, {
          params: { category: 'option', baseCoin: underlyingAsset },
        }),
      'fetchOptions',
      underlyingAsset,
    );

    return response.data.result.list;
  }

  protected getInstrument(item: BybitOptionMarket): string {
    return item.symbol;
  }

  protected getUnderlyingPrice(item: BybitOptionMarket): number {
    return parseFloat(item.underlyingPrice);
  }

  /*
   *  Private Methods
   */

  private getFuturesPrice(data: BybitOptionMarket[]): number {
    return parseFloat(data[0].indexPrice);
  }

  /*
   *  Cron Jobs
   */

  @Cron(CronExpression.EVERY_30_MINUTES, {
    name: 'process-bybit-risk-free-rate',
    timeZone: 'UTC',
  })
  private async processBybitRiskFreeRate() {
    try {
      for (const underlyingAsset of this.underlyingAssets) {
        const options = await this.fetchOptions(underlyingAsset);
        const futuresPrice = this.getFuturesPrice(options);

        this.updateRiskFreeRateCollection(underlyingAsset, options, futuresPrice);
      }
    } catch (error) {
      this.logger.error('Failed to process Bybit risk-free rate collection:', error);
    }
  }

  /*
   *  Lifecycle Hooks
   */
  async onModuleInit() {
    await this.ensureRiskFreeRateSourceExists();
    await this.processBybitRiskFreeRate();
  }
}
