import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DeribitBookSummary } from './deribit-rf-rate.interface'; // You'll need to create this interface
import { RiskFreeRateSource } from '../../entities/rf-rate-source.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BaseRiskFreeRateService } from '../../base/base-rf-rate.service';
import { UnderlyingAsset } from 'src/common/types';
import { RedisService } from '@liaoliaots/nestjs-redis';

@Injectable()
export class DeribitRiskFreeRateService extends BaseRiskFreeRateService<DeribitBookSummary> {
  protected readonly logger = new Logger(DeribitRiskFreeRateService.name);
  protected readonly sourceName = 'deribit';
  protected readonly underlyingAssets: UnderlyingAsset[] = ['BTC', 'ETH'];
  private readonly DERIBIT_BOOK_SUMMARY_URL =
    'https://www.deribit.com/api/v2/public/get_book_summary_by_currency';
  private readonly DERIBIT_TICKER_URL = 'https://www.deribit.com/api/v2/public/ticker';

  constructor(sourceRepository: Repository<RiskFreeRateSource>, redisService: RedisService) {
    super(sourceRepository, redisService);
  }

  /*
   *  Override Methods
   */

  protected async fetchOptions(underlyingAsset: UnderlyingAsset): Promise<DeribitBookSummary[]> {
    const response = await this.withRetry(
      () =>
        axios.get(this.DERIBIT_BOOK_SUMMARY_URL, {
          params: {
            currency: underlyingAsset,
            kind: 'option',
          },
        }),
      'fetchOptions',
      underlyingAsset,
    );

    return response.data.result;
  }

  protected async fetchFuturesPrice(underlyingAsset: UnderlyingAsset): Promise<number> {
    const instrumentName = `${underlyingAsset}-PERPETUAL`;

    const response = await this.withRetry(
      () => axios.get(this.DERIBIT_TICKER_URL, { params: { instrument_name: instrumentName } }),
      'fetchFuturesPrice',
      underlyingAsset,
    );

    return response.data.result.index_price;
  }

  protected getInstrument(item: DeribitBookSummary): string {
    return item.instrument_name;
  }

  protected getUnderlyingPrice(item: DeribitBookSummary): number {
    return item.underlying_price;
  }

  protected validateItem(item: DeribitBookSummary): boolean {
    return item.underlying_index !== 'SYN.EXPIRY';
  }

  /*
   *  Cron Jobs
   */

  @Cron(CronExpression.EVERY_30_MINUTES, {
    name: 'process-deribit-risk-free-rate',
    timeZone: 'UTC',
  })
  private async processDeribitRiskFreeRate() {
    try {
      for (const underlyingAsset of this.underlyingAssets) {
        const [options, futuresPrice] = await Promise.all([
          this.fetchOptions(underlyingAsset),
          this.fetchFuturesPrice(underlyingAsset),
        ]);

        this.updateRiskFreeRateCollection(underlyingAsset, options, futuresPrice);
      }
    } catch (error) {
      this.logger.error('Failed to process Deribit risk-free rate collection:', error);
    }
  }

  /*
   *  Lifecycle Hooks
   */

  async onModuleInit() {
    await this.ensureRiskFreeRateSourceExists();
    await this.processDeribitRiskFreeRate();
  }
}
