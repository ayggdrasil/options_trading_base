import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { IvCurveSource } from '../../entities/iv-curve-source.entity';
import { DeribitBookSummaryRes } from './deribit-iv-curve.interface';
import { Cron } from '@nestjs/schedule';
import { EVERY_20_SECONDS } from 'src/common/constants';
import { BaseIvCurveService } from '../../base/base-iv-curve.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { FuturesIndexService } from 'src/modules/asset-index/futures/futures-index.service';
import { BN } from 'src/common/bn';
import { formatInstrument } from '../../utils/helpers';
import { UnderlyingAsset } from 'src/common/types';
import { ResponseIv } from '../../iv-curve.interface';
import { SviService } from '../../svi/svi.service';

@Injectable()
export class DeribitIvCurveService extends BaseIvCurveService<UnderlyingAsset> {
  protected readonly logger = new Logger(DeribitIvCurveService.name);
  protected readonly sourceName = 'deribit';
  protected readonly underlyingAssets: UnderlyingAsset[] = ['BTC', 'ETH'];
  private readonly DERIBIT_BOOK_SUMMARY_URL =
    'https://www.deribit.com/api/v2/public/get_book_summary_by_currency';

  protected readonly MAX_CONCURRENT_JOBS = 1;

  constructor(
    sourceRepository: Repository<IvCurveSource>,
    redisService: RedisService,
    futuresIndexService: FuturesIndexService,
    sviService: SviService,
  ) {
    super(sourceRepository, redisService, futuresIndexService, sviService);
  }

  /*
   *  Override functions
   */

  protected async fetchAndTransform(underlyingAsset: UnderlyingAsset): Promise<ResponseIv> {
    try {
      const params = {
        currency: underlyingAsset,
        kind: 'option',
      };

      const response = await axios.get(this.DERIBIT_BOOK_SUMMARY_URL, { params });

      const result = response.data as DeribitBookSummaryRes;

      const processedData = result.result.map((option) => {
        const instrument = formatInstrument(this.sourceName, option.instrument_name);
        const [_underlyingAsset, _expiryDate, _strikePrice, _optionType] = instrument.split('-');

        return {
          instrument: instrument,
          underlyingAsset: _underlyingAsset,
          expiryDate: _expiryDate,
          strikePrice: Number(_strikePrice),
          optionType: _optionType,
          iv: BN.divideToNumber(option.mark_iv, 100),
        };
      });

      return {
        data: processedData,
        lastUpdatedAt: BN.divideFloor(result.usOut, 1000),
      };
    } catch (error) {
      this.logger.error(`Error fetching book summary from Deribit for ${underlyingAsset}:`, error);
      throw error;
    }
  }

  /*
   *  Cron Jobs
   */

  @Cron(EVERY_20_SECONDS, {
    name: 'process-deribit-iv-curve',
    timeZone: 'UTC',
  })
  private async processDeribitIvCurve() {
    try {
      await this.executeJob(async () => {
        await Promise.all(this.underlyingAssets.map((underlyingAsset) => this.updateIvMap(underlyingAsset)));
      });
    } catch (error) {
      this.logger.error(
        'Failed to process deribit iv curve:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /*
   *  Lifecycle Hooks
   */

  async onModuleInit() {
    await this.ensureIvCurveSourceExists();
    await this.processDeribitIvCurve();
  }
}
