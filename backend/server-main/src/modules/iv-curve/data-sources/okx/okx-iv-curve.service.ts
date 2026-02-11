import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { IvCurveSource } from '../../entities/iv-curve-source.entity';
import { OkxOptionSummaryRes } from './okx-iv-curve.interface';
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
export class OkxIvCurveService extends BaseIvCurveService<UnderlyingAsset> {
  protected readonly logger = new Logger(OkxIvCurveService.name);
  protected readonly sourceName = 'okx';
  protected readonly underlyingAssets: UnderlyingAsset[] = ['BTC', 'ETH'];
  private readonly OKX_OPTIONS_SUMMARY_URL = 'https://www.okx.com/api/v5/public/opt-summary';

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
        instFamily: `${underlyingAsset}-USD`,
      };

      const response = await axios.get(this.OKX_OPTIONS_SUMMARY_URL, { params });

      const result = response.data as OkxOptionSummaryRes;

      const processedData = result.data.map((option) => {
        const instrument = formatInstrument(this.sourceName, option.instId);
        const [_underlyingAsset, _expiryDate, _strikePrice, _optionType] = instrument.split('-');

        return {
          instrument: instrument,
          underlyingAsset: _underlyingAsset,
          expiryDate: _expiryDate,
          strikePrice: Number(_strikePrice),
          optionType: _optionType,
          iv: BN.toNumber(option.markVol),
        };
      });

      return {
        data: processedData,
        lastUpdatedAt: Number(result.data[0].ts),
      };
    } catch (error) {
      this.logger.error(`Error fetching option summary from OKX for ${underlyingAsset}:`, error);
      throw error;
    }
  }

  /*
   *  Cron Jobs
   */

  @Cron(EVERY_20_SECONDS, {
    name: 'process-okx-iv-curve',
    timeZone: 'UTC',
  })
  private async processOkxIvCurve() {
    try {
      await this.executeJob(async () => {
        await Promise.all(this.underlyingAssets.map((underlyingAsset) => this.updateIvMap(underlyingAsset)));
      });
    } catch (error) {
      this.logger.error(
        'Failed to process okx iv curve:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /*
   *  Lifecycle Hooks
   */

  async onModuleInit() {
    await this.ensureIvCurveSourceExists();
    await this.processOkxIvCurve();
  }
}
