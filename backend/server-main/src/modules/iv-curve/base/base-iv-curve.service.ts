import { LoggerService, OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { IvCurveSource } from '../entities/iv-curve-source.entity';
import {
  GroupedResponseIv,
  IvByOption,
  IvMap,
  ResponseIv,
  ResponseIvItem,
  SviDataByOption,
  SviDataSet,
} from '../iv-curve.interface';
import {
  IV_EQUALITY_TOLERANCE,
  IV_UPDATE_THRESHOLD,
  LONG_TERM_SVI_DATA_FILTER_THRESHOLD,
  SHORT_TERM_EXPIRY_THRESHOLD,
  SHORT_TERM_SVI_DATA_FILTER_THRESHOLD,
} from '../utils/constants';
import {
  convertExpiryDateToTimestamp,
  convertTimestampToExpiryDate,
  getDaysToExpiration,
} from 'src/common/helpers';
import Redis from 'ioredis';
import { InjectRepository } from '@nestjs/typeorm';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { FuturesIndexService } from 'src/modules/asset-index/futures/futures-index.service';
import { SviService } from '../svi/svi.service';
import { validateSVIData } from '../utils/helpers';
import {
  calculateUnderlyingFutures,
  FuturesAssetIndexMap,
  NormalizedFuturesAsset,
  parseInstrument,
  RiskFreeRateCollection,
  UnderlyingAsset,
} from '@callput/shared';

export abstract class BaseIvCurveService<TUnderlyingAsset extends string> implements OnModuleInit {
  protected abstract readonly logger: LoggerService;
  protected abstract readonly sourceName: string;
  protected abstract readonly underlyingAssets: TUnderlyingAsset[];
  protected readonly redis: Redis;

  protected abstract readonly MAX_CONCURRENT_JOBS: number;
  protected runningJobs = 0;

  protected ivMap: IvMap<TUnderlyingAsset> = {
    data: {} as Record<TUnderlyingAsset, IvByOption>,
    lastUpdatedAt: 0,
  };

  constructor(
    @InjectRepository(IvCurveSource)
    protected readonly sourceRepository: Repository<IvCurveSource>,
    protected readonly redisService: RedisService,
    protected readonly futuresIndexService: FuturesIndexService,
    protected readonly sviService: SviService,
  ) {
    this.redis = this.redisService.getOrThrow();
  }

  /*
   *  Public Getters/Setters
   */

  public getInitialized(): boolean {
    return this.ivMap.lastUpdatedAt > 0;
  }

  public getIvMap(): IvMap<TUnderlyingAsset> {
    if (!this.getInitialized()) throw new Error('iv map source not initialized');
    return {
      data: { ...this.ivMap.data },
      lastUpdatedAt: this.ivMap.lastUpdatedAt,
    };
  }

  public async calculateMissingIvs(
    underlyingAsset: TUnderlyingAsset,
    missingInstruments: string[],
    futuresAssetIndexMap: FuturesAssetIndexMap,
    riskFreeRateCollection: RiskFreeRateCollection,
    applyMaxSvi: boolean,
  ): Promise<IvByOption> {
    // Create a map to store results
    const missingIvs: IvByOption = {};

    if (!(this.ivMap.lastUpdatedAt > 0) || this.ivMap.lastUpdatedAt < Date.now() - IV_UPDATE_THRESHOLD) {
      this.logger.warn('iv map not initialized or outdated');
      return missingIvs;
    }

    const missingInstrumentsByExpiry = this.groupInstrumentsByExpiry(missingInstruments, underlyingAsset);

    const sviOptionDataByExpiry = this.buildSviOptionData(
      underlyingAsset,
      futuresAssetIndexMap,
      riskFreeRateCollection,
    );

    const sviDataSet = this.buildSviDataSet(
      sviOptionDataByExpiry,
      underlyingAsset,
      futuresAssetIndexMap,
      riskFreeRateCollection,
    );

    // Process each expiry group
    for (const [expiry, missingInstruments] of Object.entries(missingInstrumentsByExpiry)) {
      const sviDataByExpiry = sviDataSet[parseInt(expiry)];

      const validationResult = validateSVIData(sviDataByExpiry);

      if (!validationResult.isValid) {
        this.logger.log(
          `[SVI] ${validationResult.message} for ${underlyingAsset} ${convertTimestampToExpiryDate(Number(expiry))}`,
        );
        continue;
      }

      try {
        // Calculate and store IVs for current expiry group
        const ivsFromSviModel = await this.sviService.generateIvs(
          sviDataByExpiry,
          missingInstruments,
          applyMaxSvi,
        );
        Object.assign(missingIvs, ivsFromSviModel);
      } catch (error) {
        this.logger.error(`Error generating IVs from SVI model for expiry ${expiry}:`, error);
      }
    }

    return missingIvs;
  }

  /*
   *  Protected Methods
   */

  protected async ensureIvCurveSourceExists() {
    const existingSource = await this.sourceRepository.findOne({ where: { name: this.sourceName } });

    if (!existingSource) {
      await this.sourceRepository.save(this.sourceRepository.create({ name: this.sourceName }));
      this.logger.log(`Created ${this.sourceName} iv map source`);
    } else {
      this.logger.log(`${this.sourceName} iv map source already exists`);
    }
  }

  protected async updateIvMap(underlyingAsset: TUnderlyingAsset) {
    try {
      const responseIv = await this.fetchAndTransform(underlyingAsset);

      if (responseIv.data.length < 1) {
        this.logger.warn(`No option data found for ${underlyingAsset}`);
        return;
      }

      const processedResponseIv = this.processResponseIv(responseIv.data, underlyingAsset);

      this.ivMap.data[underlyingAsset as TUnderlyingAsset] = processedResponseIv;
      this.ivMap.lastUpdatedAt = responseIv.lastUpdatedAt;
    } catch (error) {
      this.logger.error(`Error updating IV curve for ${underlyingAsset}:`, error);
      throw error;
    }
  }

  // filter some ivs that are far out of the money or in the money that does not qualify the requirements
  protected processResponseIv(
    responseIvItems: ResponseIvItem[],
    underlyingAsset: TUnderlyingAsset,
  ): IvByOption {
    const futuresIndices = this.futuresIndexService.getAssetIndexMapRes();
    const groupedResponseIv = this.groupResponseIvByExpiry(responseIvItems);
    return this.filterIvs(groupedResponseIv, futuresIndices.data[underlyingAsset as NormalizedFuturesAsset]);
  }

  protected async executeJob<T>(job: () => Promise<T>): Promise<T | void> {
    if (this.runningJobs >= this.MAX_CONCURRENT_JOBS) {
      this.logger.log('Too many jobs running, skipping this execution.');
      return;
    }

    this.runningJobs++;
    try {
      return await job();
    } catch (error) {
      this.logger.error(`Failed to execute job:`, error);
    } finally {
      this.runningJobs--;
    }
  }

  protected fetchAndTransform?(underlyingAsset: TUnderlyingAsset): Promise<ResponseIv>;

  /*
   * Private Methods
   */

  // Helper method to group response iv by expiry
  private groupResponseIvByExpiry(responseIvItems: ResponseIvItem[]): GroupedResponseIv {
    return responseIvItems.reduce((acc, item) => {
      const expiry = convertExpiryDateToTimestamp(item.expiryDate);
      if (!acc[expiry]) acc[expiry] = [];
      acc[expiry].push(item);
      return acc;
    }, {} as GroupedResponseIv);
  }

  // Helper method to group instruments by expiry
  private groupInstrumentsByExpiry(
    instruments: string[],
    underlyingAsset: TUnderlyingAsset,
  ): { [key: number]: string[] } {
    return instruments.reduce(
      (grouped, instrument) => {
        const [asset, expiryDate] = instrument.split('-');
        if (asset !== underlyingAsset) return grouped;

        const expiry = convertExpiryDateToTimestamp(expiryDate);
        if (!grouped[expiry]) grouped[expiry] = [];
        grouped[expiry].push(instrument);

        return grouped;
      },
      {} as { [key: number]: string[] },
    );
  }

  // Helper method to filter duplicate IVs
  private filterIvs(groupedResposeIv: GroupedResponseIv, futuresIndex: number): IvByOption {
    const filteredIvMap: IvByOption = {};

    Object.entries(groupedResposeIv).forEach(([_, items]) => {
      // Group by option type (C/P)
      const callOptions = items.filter((item) => item.optionType === 'C');
      const putOptions = items.filter((item) => item.optionType === 'P');

      this.filterIvsByOptionType(callOptions, filteredIvMap, futuresIndex);
      this.filterIvsByOptionType(putOptions, filteredIvMap, futuresIndex);
    });

    return filteredIvMap;
  }

  // Helper method to filter IVs by option type
  private filterIvsByOptionType(
    items: ResponseIvItem[],
    filteredMap: IvByOption,
    futuresIndex: number,
  ): void {
    // Sort by strike price for easier processing
    items.sort((a, b) => a.strikePrice - b.strikePrice);

    const filteredItems = this.filterDuplicateIvs(items, futuresIndex);
    const [leftIndex, rightIndex] = this.filterEdgeIvs(filteredItems, futuresIndex);

    // Add the final filtered items to the result map
    for (let i = leftIndex; i <= rightIndex; i++) {
      const item = filteredItems[i];
      filteredMap[item.instrument] = item.iv;
    }
  }

  // Helper method to filter duplicate IVs
  private filterDuplicateIvs(items: ResponseIvItem[], futuresIndex: number): ResponseIvItem[] {
    const toKeep = new Set<string>();

    for (let i = 0; i < items.length; i++) {
      const current = items[i];

      // If this is the first item or its IV differs from the previous one, keep it
      if (i === 0 || Math.abs(current.iv - items[i - 1].iv) > IV_EQUALITY_TOLERANCE) {
        toKeep.add(current.instrument);
        continue;
      }

      // Find all adjacent items with the same IV (including the current one)
      const sameIvGroup = [items[i - 1], current];
      let j = i + 1;

      while (j < items.length && Math.abs(items[j].iv - current.iv) <= IV_EQUALITY_TOLERANCE) {
        sameIvGroup.push(items[j]);
        j++;
      }

      // Skip the items we've already processed
      i = j - 1;

      // Find the closest to futures index
      let closest = sameIvGroup[0];
      let minDistance = Math.abs(closest.strikePrice - futuresIndex);

      for (let k = 1; k < sameIvGroup.length; k++) {
        const distance = Math.abs(sameIvGroup[k].strikePrice - futuresIndex);
        if (distance < minDistance) {
          minDistance = distance;
          closest = sameIvGroup[k];
        }
      }

      // Keep only the closest one
      toKeep.add(closest.instrument);
    }

    // Return filtered list of items to keep
    return items.filter((item) => toKeep.has(item.instrument));
  }

  // Helper method to filter edge IVs (left: lower strike prices, right: higher strike prices)
  private filterEdgeIvs(items: ResponseIvItem[], futuresIndex: number): [number, number] {
    const leftIndex = this.filterLeftEdge(items, futuresIndex);
    const rightIndex = this.filterRightEdge(items, futuresIndex);
    return [leftIndex, rightIndex];
  }

  // Helper method to filter left edge
  private filterLeftEdge(items: ResponseIvItem[], futuresIndex: number): number {
    let leftIndex = 0;
    while (leftIndex < items.length - 1) {
      const current = items[leftIndex];
      const next = items[leftIndex + 1];

      // Stop if we've reached or passed the futures index
      if (next.strikePrice >= futuresIndex) break;

      // If the next IV is higher than the current IV, skip current
      if (next.iv > current.iv) {
        leftIndex++;
      } else {
        // If IV is decreasing (or equal), we've found a valid edge, so stop
        break;
      }
    }
    return leftIndex;
  }

  // Helper method to filter right edge
  private filterRightEdge(items: ResponseIvItem[], futuresIndex: number): number {
    let rightIndex = items.length - 1;
    while (rightIndex > 0) {
      const current = items[rightIndex];
      const prev = items[rightIndex - 1];

      // Stop if we've reached or passed the futures index
      if (prev.strikePrice <= futuresIndex) break;

      // If the previous IV is higher than the current IV, skip current
      if (prev.iv > current.iv) {
        rightIndex--;
      } else {
        // If IV is decreasing (or equal), we've found a valid edge, so stop
        break;
      }
    }
    return rightIndex;
  }

  // Helper method to process instrument data and build SVI option data
  private buildSviOptionData(
    underlyingAsset: TUnderlyingAsset,
    futuresAssetIndexMap: FuturesAssetIndexMap,
    riskFreeRateCollection: RiskFreeRateCollection,
  ): { [key: number]: SviDataByOption[] } {
    const sviOptionDataByExpiry: { [key: number]: SviDataByOption[] } = {};

    Object.entries(this.ivMap.data[underlyingAsset])
      .filter(([instrument]) => instrument.endsWith('-C')) // Process only Call options
      .forEach(([instrument, iv]) => {
        const { underlyingAsset, expiry, strikePrice } = parseInstrument(instrument);

        const underlyingFutures = calculateUnderlyingFutures(
          underlyingAsset,
          expiry,
          futuresAssetIndexMap,
          riskFreeRateCollection,
        );

        if (!sviOptionDataByExpiry[expiry]) {
          sviOptionDataByExpiry[expiry] = [];
        }

        sviOptionDataByExpiry[expiry].push({
          instrument,
          iv,
          ivSquared: iv * iv,
          strikePrice: Number(strikePrice),
          logStrikePrice: Math.log(Number(strikePrice) / underlyingFutures),
        });
      });

    return sviOptionDataByExpiry;
  }

  // Helper method to build SVI dataset
  private buildSviDataSet(
    sviOptionDataByExpiry: { [key: number]: SviDataByOption[] },
    underlyingAsset: TUnderlyingAsset,
    futuresAssetIndexMap: FuturesAssetIndexMap,
    riskFreeRateCollection: RiskFreeRateCollection,
  ): SviDataSet {
    const sviDataSet: SviDataSet = {};

    Object.entries(sviOptionDataByExpiry).forEach(([expiryString, data]) => {
      const sortedData = [...data].sort((a, b) => a.strikePrice - b.strikePrice);
      const expiry = Number(expiryString);

      const daysToExpiration = getDaysToExpiration(expiry);
      const underlyingFutures = calculateUnderlyingFutures(
        underlyingAsset as UnderlyingAsset,
        expiry,
        futuresAssetIndexMap,
        riskFreeRateCollection,
      );

      const filteredData = this.filterSviDataByExpiryDuration(
        sortedData,
        daysToExpiration,
        underlyingFutures,
      );

      if (filteredData.length < 1) {
        return;
      }

      sviDataSet[expiry] = {
        ivs: {
          normal: sortedData.map((d) => d.iv),
          squared: sortedData.map((d) => d.ivSquared),
        },
        strikePrices: {
          normal: sortedData.map((d) => d.strikePrice),
          logarithmic: sortedData.map((d) => d.logStrikePrice),
        },
        underlyingFutures: underlyingFutures,
        length: sortedData.length,
      };
    });

    return sviDataSet;
  }

  private filterSviDataByExpiryDuration(
    data: SviDataByOption[],
    daysToExpiration: number,
    underlyingFutures: number,
  ): SviDataByOption[] {
    // Short-term expiry: filter to ±15% from futures price
    if (daysToExpiration <= SHORT_TERM_EXPIRY_THRESHOLD) {
      const lowerBound = underlyingFutures * (1 - SHORT_TERM_SVI_DATA_FILTER_THRESHOLD);
      const upperBound = underlyingFutures * (1 + SHORT_TERM_SVI_DATA_FILTER_THRESHOLD);
      return data.filter((d) => d.strikePrice >= lowerBound && d.strikePrice <= upperBound);
    }
    // Long-term expiry: filter to ±100% from futures price
    else {
      const lowerBound = underlyingFutures * (1 - LONG_TERM_SVI_DATA_FILTER_THRESHOLD);
      const upperBound = underlyingFutures * (1 + LONG_TERM_SVI_DATA_FILTER_THRESHOLD);
      return data.filter((d) => d.strikePrice >= lowerBound && d.strikePrice <= upperBound);
    }
  }

  /*
   *  Lifecycle Hooks
   */

  abstract onModuleInit(): Promise<void>;
}
