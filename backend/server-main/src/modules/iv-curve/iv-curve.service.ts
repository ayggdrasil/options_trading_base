import { Injectable, Logger } from '@nestjs/common';
import { OkxIvCurveService } from './data-sources/okx/okx-iv-curve.service';
import { BybitIvCurveService } from './data-sources/bybit/bybit-iv-curve.service';
import { DeribitIvCurveService } from './data-sources/deribit/deribit-iv-curve.service';
import { Cron } from '@nestjs/schedule';
import {
  UnderlyingAssetInstrumentMap,
  IvByOption,
  IvMap,
  IvMaps,
  ResponseIvItem,
} from './iv-curve.interface';
import { getMedian } from 'src/common/helpers';
import { IvCurveSource } from './entities/iv-curve-source.entity';
import { Repository } from 'typeorm';
import { IV_UPDATE_THRESHOLD, IV_WEIGHTS } from './utils/constants';
import { RiskFreeRateService } from '../rf-rate/rf-rate.service';
import { EVERY_10_30_50_SECONDS } from 'src/common/constants';
import { SlackService } from 'src/providers/slack/slack.service';
import { LogLevel } from 'src/common/enums';
import { MESSAGE_TYPE } from 'src/common/messages';
import { BaseIvCurveService } from './base/base-iv-curve.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { REDIS_KEYS } from 'src/common/redis-keys';
import { ASSET_INDEX_UPDATE_THRESHOLD } from '../asset-index/common/utils/constants';
import { RISK_FREE_RATE_UPDATE_THRESHOLD } from '../rf-rate/utils/constants';
import { FuturesIndexService } from '../asset-index/futures/futures-index.service';
import { UnderlyingAsset } from 'src/common/types';
import { SviService } from './svi/svi.service';
import { OptionType } from './utils/enums';
import {
  calculateMarkPrice,
  calculateUnderlyingFutures,
  FuturesAssetIndexMap,
  InstrumentMarkData,
  InstrumentMarkDataRes,
  parseInstrument,
  RiskFreeRateCollection,
} from '@callput/shared';

@Injectable()
export class IvCurveService extends BaseIvCurveService<UnderlyingAsset> {
  protected readonly logger = new Logger(IvCurveService.name);
  protected readonly sourceName = 'callput';
  protected readonly underlyingAssets: UnderlyingAsset[] = ['BTC', 'ETH'];

  protected readonly MAX_CONCURRENT_JOBS = 1;

  private sourceIvMaps: IvMaps<UnderlyingAsset> = {};
  private interpolatedIvMaps: IvMaps<UnderlyingAsset> = {};
  private instrumentMarkData: InstrumentMarkDataRes = {
    data: {},
    lastUpdatedAt: 0,
  };

  constructor(
    sourceRepository: Repository<IvCurveSource>,
    redisService: RedisService,
    futuresIndexService: FuturesIndexService,
    sviService: SviService,
    private deribitIvCurveService: DeribitIvCurveService,
    private okxIvCurveService: OkxIvCurveService,
    private bybitIvCurveService: BybitIvCurveService,
    private riskFreeRateService: RiskFreeRateService,
    private slackService: SlackService,
  ) {
    super(sourceRepository, redisService, futuresIndexService, sviService);
  }

  /*
   *  Lifecycle Hooks
   */

  async onModuleInit() {
    await this.ensureIvCurveSourceExists();
    await this.initialProcessIvCurve();
  }

  /*
   *  Public Getters/Setters
   */

  public getInstrumentMarkDataRes(): InstrumentMarkDataRes {
    if (!this.getInitialized() || Object.keys(this.instrumentMarkData.data).length < 1) {
      throw new Error('IV service not initialized or no instrument mark data available');
    }
    return this.instrumentMarkData;
  }

  public getInstrumentMarkData(): InstrumentMarkData {
    if (!this.getInitialized() || Object.keys(this.instrumentMarkData.data).length < 1) {
      throw new Error('IV service not initialized or no instrument mark data available');
    }
    return {
      ...this.instrumentMarkData.data,
    };
  }

  public async getInstrumentSviIv(instrument: string) {
    try {
      const underlyingAsset = instrument.split('-')[0] as UnderlyingAsset;

      const futuresIndexMapRes = this.futuresIndexService.getAssetIndexMapRes();
      const riskFreeRateCollectionRes = this.riskFreeRateService.getRiskFreeRateCollectionRes();

      if (
        futuresIndexMapRes.lastUpdatedAt < Date.now() - ASSET_INDEX_UPDATE_THRESHOLD ||
        riskFreeRateCollectionRes.lastUpdatedAt < Date.now() - RISK_FREE_RATE_UPDATE_THRESHOLD
      ) {
        throw new Error('Futures indices or risk-free rates are outdated');
      }

      const futuresAssetIndexMap = futuresIndexMapRes.data;
      const riskFreeRateCollection = riskFreeRateCollectionRes.data;

      const missingIvs = await this.calculateMissingIvs(
        underlyingAsset,
        [instrument],
        futuresAssetIndexMap,
        riskFreeRateCollection,
        true,
      );

      if (Object.keys(missingIvs).length < 1 || !missingIvs[instrument]) {
        throw new Error('No SVI data available for missing instruments');
      }

      return missingIvs[instrument];
    } catch (error) {
      throw new Error(
        `Failed to calculate weighted IV for instrument ${instrument}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  public traceIvMapCalculation(underlyingAsset: UnderlyingAsset, expiryDate: string, optionType: OptionType) {
    if (!this.getInitialized()) {
      throw new Error('IV service not initialized');
    }

    const expiryDateWithUnderlyingAsset = `${underlyingAsset}-${expiryDate}`;

    const sourceIvMapsAtExpiry = this.getIvMapsByExpiry(
      this.sourceIvMaps,
      underlyingAsset,
      expiryDateWithUnderlyingAsset,
      optionType,
    );

    const interpolatedIvMapsAtExpiry = this.getIvMapsByExpiry(
      this.interpolatedIvMaps,
      underlyingAsset,
      expiryDateWithUnderlyingAsset,
      optionType,
    );

    const ivMapAtExpiry: IvMap<UnderlyingAsset> = {
      data: { [underlyingAsset]: {} } as Record<UnderlyingAsset, IvByOption>,
      lastUpdatedAt: this.ivMap.lastUpdatedAt,
    };

    if (this.ivMap.data[underlyingAsset]) {
      Object.entries(this.ivMap.data[underlyingAsset]).forEach(([instrument, iv]) => {
        if (instrument.includes(expiryDateWithUnderlyingAsset)) {
          ivMapAtExpiry.data[underlyingAsset][instrument] = iv;
        }
      });
    }

    return {
      sourceIvMaps: sourceIvMapsAtExpiry,
      interpolatedIvMaps: interpolatedIvMapsAtExpiry,
      ivMap: ivMapAtExpiry,
    };
  }

  /*
   *  Override functions
   */

  protected async updateIvMap(underlyingAsset: UnderlyingAsset) {
    throw new Error('Not implemented');
  }

  /*
   *  Private Methods
   */

  // Helper method to get source IV maps
  private async getSourceIvMaps(): Promise<{
    sourceIvMaps: IvMaps<UnderlyingAsset>;
    sourceIvCounter: number;
  }> {
    try {
      const sourceIvMaps: IvMaps<UnderlyingAsset> = {
        deribit: this.deribitIvCurveService.getIvMap(),
        okx: this.okxIvCurveService.getIvMap(),
        bybit: this.bybitIvCurveService.getIvMap(),
      };

      Object.keys(sourceIvMaps).forEach(
        (exchange) =>
          sourceIvMaps[exchange].lastUpdatedAt < Date.now() - IV_UPDATE_THRESHOLD &&
          delete sourceIvMaps[exchange],
      );

      const sourceIvCounter = Object.keys(sourceIvMaps).length;

      if (sourceIvCounter < 1) {
        const message = MESSAGE_TYPE.IVS_FETCHED_FROM_LESS_THAN_ONE_SOURCE;
        this.logger.error(message);
        await this.slackService.sendMessage(`\`[server-main]\` ${message}`, LogLevel.ERROR);
        throw new Error(message);
      }

      return {
        sourceIvMaps: sourceIvMaps,
        sourceIvCounter: sourceIvCounter,
      };
    } catch (error) {
      throw new Error(
        `Failed to get source IV maps: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Helper method to get aggregated instruments
  private async getAggregatedInstruments(
    sourceIvMaps: IvMaps<UnderlyingAsset>,
  ): Promise<UnderlyingAssetInstrumentMap> {
    const aggregatedInstruments: UnderlyingAssetInstrumentMap = {};

    this.underlyingAssets.forEach((underlyingAsset) => {
      const instrumentsByUnderlyingAsset = Object.values(sourceIvMaps).flatMap((ivMap) => {
        return Object.keys(ivMap.data[underlyingAsset] || {});
      });

      aggregatedInstruments[underlyingAsset] = [...new Set(instrumentsByUnderlyingAsset)];
    });

    return aggregatedInstruments;
  }

  // Helper method to get instruments that are listed on all sources
  private async getIntersectingInstruments(
    sourceIvMaps: IvMaps<UnderlyingAsset>,
  ): Promise<UnderlyingAssetInstrumentMap> {
    const intersectingInstruments: UnderlyingAssetInstrumentMap = {};

    this.underlyingAssets.forEach((underlyingAsset) => {
      // Get instrument sets from each source
      const instrumentSets = Object.values(sourceIvMaps).map((ivMap) => {
        return new Set(Object.keys(ivMap.data[underlyingAsset] || {}));
      });

      // Return early if any source doesn't have instruments for this asset
      if (instrumentSets.some((set) => set.size === 0)) {
        intersectingInstruments[underlyingAsset] = [];
        return;
      }

      // Find intersection of all sets (instruments that exist in all sources)
      const intersectingSet = [...instrumentSets[0]].filter((instrument) =>
        instrumentSets.every((set) => set.has(instrument)),
      );

      intersectingInstruments[underlyingAsset] = intersectingSet;
    });

    return intersectingInstruments;
  }

  // Helper method to get interpolated IV maps
  private async getInterpolatedIvMaps(
    sourceIvMaps: IvMaps<UnderlyingAsset>,
    aggregatedInstruments: UnderlyingAssetInstrumentMap,
  ): Promise<IvMaps<UnderlyingAsset>> {
    const interpolatedIvMaps: IvMaps<UnderlyingAsset> = {};

    try {
      const futuresIndexMapRes = this.futuresIndexService.getAssetIndexMapRes();
      const riskFreeRateCollectionRes = this.riskFreeRateService.getRiskFreeRateCollectionRes();

      if (
        futuresIndexMapRes.lastUpdatedAt < Date.now() - ASSET_INDEX_UPDATE_THRESHOLD ||
        riskFreeRateCollectionRes.lastUpdatedAt < Date.now() - RISK_FREE_RATE_UPDATE_THRESHOLD
      ) {
        throw new Error('Futures indices or risk-free rates are outdated');
      }

      const futuresAssetIndexMap = futuresIndexMapRes.data;
      const riskFreeRateCollection = riskFreeRateCollectionRes.data;

      for (const underlyingAsset of this.underlyingAssets) {
        for (const [exchange, ivMap] of Object.entries(sourceIvMaps)) {
          const missingInstruments = this.findMissingInstruments(
            underlyingAsset,
            ivMap,
            aggregatedInstruments,
          );

          if (missingInstruments.length < 1) {
            continue;
          }

          const missingIvs = await this.getMissingIvsExchange(
            exchange,
            underlyingAsset,
            missingInstruments,
            futuresAssetIndexMap,
            riskFreeRateCollection,
          );

          if (Object.keys(missingIvs).length < 1) {
            continue;
          }

          if (!interpolatedIvMaps[exchange]) {
            interpolatedIvMaps[exchange] = {
              data: {} as Record<UnderlyingAsset, IvByOption>,
              lastUpdatedAt: 0,
            };
          }

          if (!interpolatedIvMaps[exchange].data[underlyingAsset]) {
            interpolatedIvMaps[exchange].data[underlyingAsset] = {};
          }

          Object.assign(interpolatedIvMaps[exchange].data[underlyingAsset], ivMap.data[underlyingAsset]);

          Object.entries(missingIvs).forEach(([instrument, iv]) => {
            if (!interpolatedIvMaps[exchange].data[underlyingAsset][instrument]) {
              interpolatedIvMaps[exchange].data[underlyingAsset][instrument] = iv;
            }
          });

          interpolatedIvMaps[exchange].lastUpdatedAt = ivMap.lastUpdatedAt;
        }
      }

      return interpolatedIvMaps;
    } catch (error) {
      throw new Error(
        `Failed to get interpolated IV maps: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Helper method to find missing instruments
  private findMissingInstruments(
    underlyingAsset: UnderlyingAsset,
    ivMap: IvMap<UnderlyingAsset>,
    aggregatedInstruments: UnderlyingAssetInstrumentMap,
  ): string[] {
    const missingInstruments: string[] = [];

    for (const instrument of aggregatedInstruments[underlyingAsset]) {
      if (!ivMap.data[underlyingAsset][instrument]) {
        missingInstruments.push(instrument);
      }
    }

    return missingInstruments;
  }

  // Helper method to get missing IVs for an exchange
  private async getMissingIvsExchange(
    exchange: string,
    underlyingAsset: UnderlyingAsset,
    missingInstruments: string[],
    futuresAssetIndexMap: FuturesAssetIndexMap,
    riskFreeRateCollection: RiskFreeRateCollection,
  ): Promise<IvByOption> {
    const applyMaxSvi = false;

    switch (exchange) {
      case 'deribit':
        return await this.deribitIvCurveService.calculateMissingIvs(
          underlyingAsset,
          missingInstruments,
          futuresAssetIndexMap,
          riskFreeRateCollection,
          applyMaxSvi,
        );
      case 'okx':
        return await this.okxIvCurveService.calculateMissingIvs(
          underlyingAsset,
          missingInstruments,
          futuresAssetIndexMap,
          riskFreeRateCollection,
          applyMaxSvi,
        );
      case 'bybit':
        return await this.bybitIvCurveService.calculateMissingIvs(
          underlyingAsset,
          missingInstruments,
          futuresAssetIndexMap,
          riskFreeRateCollection,
          applyMaxSvi,
        );
      default:
        throw new Error(`Unsupported exchange: ${exchange}`);
    }
  }

  // Helper method to get weighted IV maps
  private async getWeightedIvMaps(
    ivMaps: IvMaps<UnderlyingAsset>,
    instruments: UnderlyingAssetInstrumentMap,
  ): Promise<IvMap<UnderlyingAsset>> {
    const weightedIvMaps: IvMap<UnderlyingAsset> = {
      data: {} as Record<UnderlyingAsset, IvByOption>,
      lastUpdatedAt: 0,
    };

    try {
      for (const underlyingAsset of this.underlyingAssets) {
        const targetInstruments = instruments[underlyingAsset];

        if (!targetInstruments || targetInstruments.length < 1) {
          this.logger.warn(`No instruments found for ${underlyingAsset}`);
          return;
        }

        const weightedItems: ResponseIvItem[] = [];

        targetInstruments.forEach((instrument: string) => {
          const [_underlyingAsset, _expiryDate, _strikePrice, _optionType] = instrument.split('-');

          const ivsFromExchanges: { [key: string]: number } = {};

          Object.entries(ivMaps).forEach(([exchange, ivMap]) => {
            const iv = ivMap.data[underlyingAsset][instrument];
            if (iv !== undefined) ivsFromExchanges[exchange] = iv;
          });

          if (Object.keys(ivsFromExchanges).length < 1) {
            // this.logger.warn(`No valid IVs found for instrument ${instrument}`);
            return;
          }

          const weightedIv = this.getWeightedIv(ivsFromExchanges);

          weightedItems.push({
            instrument,
            underlyingAsset: _underlyingAsset,
            expiryDate: _expiryDate,
            strikePrice: Number(_strikePrice),
            optionType: _optionType,
            iv: weightedIv,
          });
        });

        if (weightedItems.length < 1) {
          this.logger.warn(`No weighted IVs found for ${underlyingAsset}`);
          return;
        }

        const processedResponseIv = this.processResponseIv(weightedItems, underlyingAsset);

        if (!weightedIvMaps.data[underlyingAsset]) {
          weightedIvMaps.data[underlyingAsset] = {};
        }

        Object.assign(weightedIvMaps.data[underlyingAsset], processedResponseIv);
        weightedIvMaps.lastUpdatedAt = Date.now();
      }

      return weightedIvMaps;
    } catch (error) {
      throw new Error(
        `Failed to get weighted IV maps: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Helper method to get weighted IV
  private getWeightedIv(ivsByExchange: { [key: string]: number }): number {
    if (ivsByExchange.size < 1) {
      throw new Error('No valid IVs found for instrument');
    }

    // get median value
    const medianIv = getMedian(Object.values(ivsByExchange));

    // get total weight
    const weights = Object.entries(ivsByExchange).reduce(
      (acc, [exchange, iv]) => {
        acc[exchange] = IV_WEIGHTS[exchange];
        return acc;
      },
      {} as { [key: string]: number },
    );

    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

    if (totalWeight === 0) {
      throw new Error('Total weight is 0');
    }

    // calculate weighted iv
    const weightedIv = Object.entries(ivsByExchange).reduce((acc, [exchange, iv]) => {
      const weight = weights[exchange];
      const rangeAdjustedIV = Math.min(Math.max(0.98 * medianIv, iv), 1.02 * medianIv);
      return acc + (rangeAdjustedIV * weight) / totalWeight;
    }, 0);

    if (weightedIv < 0) {
      throw new Error('Calculated weightedIv is invalid');
    }

    return weightedIv;
  }

  // Helper mothod to get instrument mark data
  private computeInstrumentMarkData(weightedIvMaps: IvMap<UnderlyingAsset>): InstrumentMarkDataRes {
    const futuresAssetIndexMap = this.futuresIndexService.getAssetIndexMap();
    const riskFreeRateCollection = this.riskFreeRateService.getRiskFreeRateCollection();

    const result: InstrumentMarkDataRes = {
      data: {},
      lastUpdatedAt: weightedIvMaps.lastUpdatedAt,
    };

    Object.entries(weightedIvMaps.data).forEach(([underlyingAsset, ivByOption]) => {
      Object.entries(ivByOption).forEach(([instrument, iv]) => {
        const { underlyingAsset, expiry, strikePrice, optionDirection } = parseInstrument(instrument);

        const underlyingFutures = calculateUnderlyingFutures(
          underlyingAsset,
          expiry,
          futuresAssetIndexMap,
          riskFreeRateCollection,
        );

        const markPrice = calculateMarkPrice({
          underlyingFutures: underlyingFutures,
          strikePrice: strikePrice,
          iv: iv,
          fromTime: Math.floor(Date.now() / 1000),
          expiry: expiry,
          isCall: optionDirection === 'Call',
        });

        result.data[instrument] = {
          markIv: iv,
          markPrice: markPrice,
        };
      });
    });

    return result;
  }

  // Helper method to update iv state
  private updateIvState(
    sourceIvMaps: IvMaps<UnderlyingAsset>,
    interpolatedIvMaps: IvMaps<UnderlyingAsset>,
    weightedIvMaps: IvMap<UnderlyingAsset>,
    instrumentMarkData: InstrumentMarkDataRes,
  ): void {
    this.sourceIvMaps = sourceIvMaps;
    this.interpolatedIvMaps = interpolatedIvMaps;
    this.ivMap = weightedIvMaps;
    this.instrumentMarkData = instrumentMarkData;
  }

  // Helper method to save iv curve to Redis
  private async saveIvCurveToRedis() {
    try {
      await this.redis.set(REDIS_KEYS.IV_CURVE.MAIN, JSON.stringify(this.ivMap));
      this.logger.debug('Successfully saved iv curve to Redis');
    } catch (error) {
      this.logger.error('Failed to save iv curve to Redis:', error);
    }
  }

  // Helper method to get iv maps by expiry
  private getIvMapsByExpiry(
    ivMaps: IvMaps<UnderlyingAsset>,
    underlyingAsset: UnderlyingAsset,
    expiryFilter: string,
    optionType: OptionType,
  ): IvMaps<UnderlyingAsset> {
    const result: IvMaps<UnderlyingAsset> = {};

    Object.entries(ivMaps).forEach(([exchange, ivMap]) => {
      result[exchange] = this.getIvMapByExpiry(ivMap, underlyingAsset, expiryFilter, optionType);
    });

    return result;
  }

  // Helper method to get iv map by expiry
  private getIvMapByExpiry(
    ivMap: IvMap<UnderlyingAsset>,
    underlyingAsset: UnderlyingAsset,
    expiryFilter: string,
    optionType: OptionType,
  ): IvMap<UnderlyingAsset> {
    const result: IvMap<UnderlyingAsset> = {
      data: { [underlyingAsset]: {} } as Record<UnderlyingAsset, IvByOption>,
      lastUpdatedAt: 0,
    };

    if (!ivMap.data[underlyingAsset]) {
      return result;
    }

    Object.entries(ivMap.data[underlyingAsset]).forEach(([instrument, iv]) => {
      const [_underlyingAsset, _expiryDate, _strikePrice, _optionType] = instrument.split('-');
      const targetOptionType = _optionType === 'C' ? OptionType.CALL : OptionType.PUT;
      const isOptionTypeMatch = optionType === OptionType.ALL || optionType === targetOptionType;

      if (isOptionTypeMatch && instrument.includes(expiryFilter)) {
        result.data[underlyingAsset][instrument] = iv;
      }
    });

    result.lastUpdatedAt = ivMap.lastUpdatedAt;

    return result;
  }

  /*
   *  Cron Jobs
   */

  @Cron(EVERY_10_30_50_SECONDS, {
    name: 'process-iv-curve',
    timeZone: 'UTC',
  })
  private async processIvCurve() {
    this.logger.debug('Processing IV curves');

    try {
      await this.executeJob(async () => {
        const { sourceIvMaps } = await this.getSourceIvMaps();
        // const aggregatedInstruments = await this.getAggregatedInstruments(sourceIvMaps);
        // const interpolatedIvMaps = await this.getInterpolatedIvMaps(sourceIvMaps, aggregatedInstruments);
        // const weightedIvMaps = await this.getWeightedIvMaps(interpolatedIvMaps, aggregatedInstruments);
        // this.updateIvState(sourceIvMaps, interpolatedIvMaps, weightedIvMaps);

        // @dev Debugging to check the ivs for each exchange
        // console.log('[source][deribit]', sourceIvMaps['deribit'].data['ETH']['ETH-25JUL25-2500-C']);
        // console.log('[source][deribit]', sourceIvMaps['deribit'].data['ETH']['ETH-25JUL25-2600-C']);
        // console.log('[source][bybit]', sourceIvMaps['bybit'].data['ETH']['ETH-25JUL25-2500-C']);
        // console.log('[source][bybit]', sourceIvMaps['bybit'].data['ETH']['ETH-25JUL25-2600-C']);
        // console.log('[source][okx]', sourceIvMaps['okx'].data['ETH']['ETH-25JUL25-2500-C']);
        // console.log('[source][okx]', sourceIvMaps['okx'].data['ETH']['ETH-25JUL25-2600-C']);

        const intersectingInstruments = await this.getIntersectingInstruments(sourceIvMaps);

        // @dev Debugging to check whether an instrument is in the intersecting instruments
        // console.log('[intersecting]', intersectingInstruments['ETH'].includes('ETH-25JUL25-2500-C'));
        // console.log('[intersecting]', intersectingInstruments['ETH'].includes('ETH-25JUL25-2600-C'));

        const emptyInterpolatedIvMaps: IvMaps<UnderlyingAsset> = {};
        const weightedIvMaps = await this.getWeightedIvMaps(sourceIvMaps, intersectingInstruments);

        // @dev Debugging to check the weighted ivs
        // console.log('[weighted][ETH]', weightedIvMaps.data['ETH']['ETH-25JUL25-2500-C']);
        // console.log('[weighted][ETH]', weightedIvMaps.data['ETH']['ETH-25JUL25-2600-C']);

        const instrumentMarkData = this.computeInstrumentMarkData(weightedIvMaps);

        // @dev Debugging to check the instrument mark data
        // console.log('[instrumentMarkData][ETH]', instrumentMarkData.data['ETH-25JUL25-2500-C']);
        // console.log('[instrumentMarkData][ETH]', instrumentMarkData.data['ETH-25JUL25-2600-C']);

        this.updateIvState(sourceIvMaps, emptyInterpolatedIvMaps, weightedIvMaps, instrumentMarkData);

        await this.saveIvCurveToRedis();
      });
    } catch (error) {
      this.logger.error(
        'Failed to process iv curve:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // 초기화 시 IV curve 데이터가 준비될 때까지 반복 시도하는 메서드
  private async initialProcessIvCurve(retryCount = 0, maxRetries = 10, delayMs = 10000) {
    try {
      await this.processIvCurve();

      // 초기화 성공 여부 확인
      const isInitialized = this.getInitialized();

      if (!isInitialized && retryCount < maxRetries) {
        this.logger.log(
          `IV curve initialization attempt ${retryCount + 1} failed, retrying in ${delayMs / 1000} seconds...`,
        );
        setTimeout(() => this.initialProcessIvCurve(retryCount + 1, maxRetries, delayMs), delayMs);
      } else if (!isInitialized) {
        this.logger.warn(
          `Failed to initialize IV curve data after ${maxRetries} attempts. Will rely on scheduled cron job.`,
        );
      } else {
        this.logger.log('Successfully initialized IV curve data');
      }
    } catch (error) {
      if (retryCount < maxRetries) {
        this.logger.warn(
          `IV curve initialization attempt ${retryCount + 1} failed with error: ${error instanceof Error ? error.message : String(error)}. Retrying in ${delayMs / 1000} seconds...`,
        );
        setTimeout(() => this.initialProcessIvCurve(retryCount + 1, maxRetries, delayMs), delayMs);
      } else {
        this.logger.error(
          `Failed to initialize IV curve data after ${maxRetries} attempts. Will rely on scheduled cron job.`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
