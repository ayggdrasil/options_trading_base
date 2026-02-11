import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { IvCurveSource } from '../../entities/iv-curve-source.entity';
import { Cron } from '@nestjs/schedule';
import { EVERY_20_SECONDS } from 'src/common/constants';
import { BaseIvCurveService } from '../../base/base-iv-curve.service';
import { BybitOptionMarketRes } from './bybit-iv-curve.interface';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { FuturesIndexService } from 'src/modules/asset-index/futures/futures-index.service';
import { BN } from 'src/common/bn';
import { formatInstrument } from '../../utils/helpers';
import { UnderlyingAsset } from 'src/common/types';
import { ResponseIv } from '../../iv-curve.interface';
import { SviService } from '../../svi/svi.service';

@Injectable()
export class BybitIvCurveService extends BaseIvCurveService<UnderlyingAsset> {
  protected readonly logger = new Logger(BybitIvCurveService.name);
  protected readonly sourceName = 'bybit';
  protected readonly underlyingAssets: UnderlyingAsset[] = ['BTC', 'ETH'];
  private readonly BYBIT_MARKET_TICKER_URL = 'https://api.bybit.com/v5/market/tickers';

  protected readonly MAX_CONCURRENT_JOBS = 1;

  constructor(
    sourceRepository: Repository<IvCurveSource>,
    redisService: RedisService,
    futuresIndex: FuturesIndexService,
    sviService: SviService,
  ) {
    super(sourceRepository, redisService, futuresIndex, sviService);
  }

  /*
   *  Override functions
   */

  protected async fetchAndTransform(underlyingAsset: UnderlyingAsset): Promise<ResponseIv> {
    try {
      const params = {
        category: 'option',
        baseCoin: underlyingAsset,
      };

      const response = await axios.get(this.BYBIT_MARKET_TICKER_URL, { params });

      const result = response.data as BybitOptionMarketRes;

      const processedData = result.result.list.map((option) => {
        const instrument = formatInstrument(this.sourceName, option.symbol);
        const [_underlyingAsset, _expiryDate, _strikePrice, _optionType] = instrument.split('-');

        return {
          instrument: instrument,
          underlyingAsset: _underlyingAsset,
          expiryDate: _expiryDate,
          strikePrice: Number(_strikePrice),
          optionType: _optionType,
          iv: BN.toNumber(option.markIv),
        };
      });

      return {
        data: processedData,
        lastUpdatedAt: result.time,
      };
    } catch (error) {
      this.logger.error(`Error fetching option market from Bybit for ${underlyingAsset}:`, error);
      throw error;
    }
  }

  /*
   *  Cron Jobs
   */

  @Cron(EVERY_20_SECONDS, {
    name: 'process-bybit-iv-curve',
    timeZone: 'UTC',
  })
  private async processBybitIvCurve() {
    try {
      await this.executeJob(async () => {
        await Promise.all(this.underlyingAssets.map((underlyingAsset) => this.updateIvMap(underlyingAsset)));
      });
    } catch (error) {
      this.logger.error(
        'Failed to process bybit iv curve:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /*
   *  Lifecycle Hooks
   */

  async onModuleInit() {
    await this.ensureIvCurveSourceExists();
    await this.processBybitIvCurve();
  }
}
