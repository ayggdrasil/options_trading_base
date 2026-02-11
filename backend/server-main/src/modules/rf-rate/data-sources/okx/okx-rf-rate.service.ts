import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { OkxOptionSummary } from './okx-rf-rate.interface';
import { RiskFreeRateSource } from '../../entities/rf-rate-source.entity';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BaseRiskFreeRateService } from '../../base/base-rf-rate.service';
import { UnderlyingAsset } from 'src/common/types';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { DELAY_MS } from '../../utils/constants';

@Injectable()
export class OkxRiskFreeRateService extends BaseRiskFreeRateService<OkxOptionSummary> {
  protected readonly logger = new Logger(OkxRiskFreeRateService.name);
  protected readonly sourceName = 'okx';
  protected readonly underlyingAssets: UnderlyingAsset[] = ['BTC', 'ETH'];
  private readonly OKX_OPTIONS_SUMMARY_URL = 'https://www.okx.com/api/v5/public/opt-summary';
  private readonly OKX_FUTURES_TICKER_URL = 'https://www.okx.com/api/v5/market/ticker';

  constructor(sourceRepository: Repository<RiskFreeRateSource>, redisService: RedisService) {
    super(sourceRepository, redisService);
  }

  /*
   *  Override Methods
   */

  protected async fetchOptions(underlyingAsset: UnderlyingAsset): Promise<OkxOptionSummary[]> {
    const uly = `${underlyingAsset}-USD`;

    const response = await this.withRetry(
      () => axios.get(this.OKX_OPTIONS_SUMMARY_URL, { params: { uly } }),
      'fetchOptions',
      underlyingAsset,
    );

    return response.data.data;
  }

  protected async fetchFuturesPrice(underlyingAsset: UnderlyingAsset): Promise<number> {
    const instId = `${underlyingAsset}-USD-SWAP`;

    const response = await this.withRetry(
      () => axios.get(this.OKX_FUTURES_TICKER_URL, { params: { instId } }),
      'fetchFuturesPrice',
      underlyingAsset,
    );

    return parseFloat(response.data.data[0].last);
  }

  protected getInstrument(item: OkxOptionSummary): string {
    return item.instId;
  }

  protected getUnderlyingPrice(item: OkxOptionSummary): number {
    return parseFloat(item.fwdPx);
  }

  /*
   *  Cron Jobs
   */

  @Cron(CronExpression.EVERY_30_MINUTES, {
    name: 'process-okx-risk-free-rate',
    timeZone: 'UTC',
  })
  private async processOkxRiskFreeRate() {
    try {
      for (const underlyingAsset of this.underlyingAssets) {
        const [options, futuresPrice] = await Promise.all([
          this.fetchOptions(underlyingAsset),
          this.fetchFuturesPrice(underlyingAsset),
        ]);

        this.updateRiskFreeRateCollection(underlyingAsset, options, futuresPrice);
      }
    } catch (error) {
      this.logger.error('Failed to process Okx risk-free rate collection:', error);
    }
  }

  /*
   *  Lifecycle Hooks
   */

  async onModuleInit() {
    await this.ensureRiskFreeRateSourceExists();
    await this.processOkxRiskFreeRate();
  }
}
