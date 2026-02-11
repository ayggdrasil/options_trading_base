import { BaseAssetIndexService } from './base-asset-index.service';
import { ASSET_INDEX_WEIGHTS } from '../utils/constants';
import { getMedian } from 'src/common/helpers';
import { Repository } from 'typeorm';
import { AssetIndexSource } from '../entities/asset-index-source.entity';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { MultipleAssetIndexMapRes, NormalizedFuturesAsset, NormalizedSpotAsset } from '@callput/shared';

export abstract class WeightedAssetIndexService<
  TAsset extends NormalizedSpotAsset | NormalizedFuturesAsset,
> extends BaseAssetIndexService<TAsset> {
  protected abstract sourceAssetIndexMapRes: MultipleAssetIndexMapRes<TAsset>;

  constructor(sourceRepository: Repository<AssetIndexSource>, redisService: RedisService) {
    super(sourceRepository, redisService);
  }

  protected async setWeightedAssetIndex(asset: TAsset) {
    try {
      const weightedAssetIndex = this.calculateWeightedAssetIndex(asset);

      // Update asset index with weighted asset index
      this.assetIndexMapRes.data[asset.toUpperCase() as TAsset] = weightedAssetIndex;
      this.assetIndexMapRes.data[asset.toLowerCase() as TAsset] = weightedAssetIndex;
      this.assetIndexMapRes.lastUpdatedAt = Date.now();
    } catch (error) {
      this.logger.error(`Failed to set weighted ${this.normalizedAssetType} index for ${asset}: `, error);
      // Don't throw to allow other assets to update
    }

    this.assetIndexMapRes.lastUpdatedAt = Date.now();
  }

  protected calculateWeightedAssetIndex(asset: TAsset): number {
    try {
      const pricesByExchange: Map<string, number> = new Map();

      Object.entries(this.sourceAssetIndexMapRes).forEach(([exchange, assetIndexMapRes]) => {
        const price: number = assetIndexMapRes.data[asset];
        if (assetIndexMapRes !== undefined) pricesByExchange.set(exchange, price);
      });

      if (pricesByExchange.size === 0) {
        this.logger.warn(`No valid prices found for asset ${asset}`);
        return;
      }

      const weightedPrice = this.getWeightedPrice(pricesByExchange);

      return weightedPrice;
    } catch (error) {
      this.logger.error(
        `Failed to calculate weighted asset index for asset ${asset}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  protected getWeightedPrice(pricesByExchange: Map<string, number>): number {
    if (pricesByExchange.size < 1) {
      throw new Error('No valid prices found for asset');
    }

    // get median value
    const medianPrice = getMedian(Array.from(pricesByExchange.values()));

    // get total weight
    const weights = new Map(
      Array.from(pricesByExchange.keys()).map((exchange) => [exchange, ASSET_INDEX_WEIGHTS[exchange]]),
    );

    const totalWeight = Array.from(weights.values()).reduce((acc, weight) => acc + weight, 0);

    if (totalWeight === 0) {
      throw new Error('Total weight is 0');
    }

    const weightedPrice = Array.from(pricesByExchange.entries()).reduce((acc, [exchange, price]) => {
      const weight = weights.get(exchange);
      const rangeAdjustedAssetIndex = Math.min(Math.max(0.995 * medianPrice, price), 1.005 * medianPrice);
      return acc + (rangeAdjustedAssetIndex * weight) / totalWeight;
    }, 0);

    if (weightedPrice < 0) {
      throw new Error('Calculated weightedPrice is invalid');
    }

    return weightedPrice;
  }
}
