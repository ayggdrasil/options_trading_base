import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetIndexSource } from './common/entities/asset-index-source.entity';
import { FuturesIndexController } from './futures/futures-index.controller';
import { SpotIndexController } from './spot/spot-index.controller';
import { SpotIndexService } from './spot/spot-index.service';
import { FuturesIndexService } from './futures/futures-index.service';
import { DeribitFuturesIndexService } from './futures/data-sources/deribit/deribit-futures-index.service';
import { DeribitSpotIndexService } from './spot/data-sources/deribit/deribit-spot-index.service';
import { BinanceFuturesIndexService } from './futures/data-sources/binance/binance-futures-index.service';
import { BinanceSpotIndexService } from './spot/data-sources/binance/binance-spot-index.service';
import { BitfinexFuturesIndexService } from './futures/data-sources/bitfinex/bitfinex-futures-index.service';
import { BitfinexSpotIndexService } from './spot/data-sources/bitfinex/bitfinex-spot-index.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AssetIndexSource])],
  controllers: [FuturesIndexController, SpotIndexController],
  providers: [
    // Main services
    FuturesIndexService,
    SpotIndexService,

    // Futures data sources
    DeribitFuturesIndexService,
    DeribitSpotIndexService,
    BinanceFuturesIndexService,

    // Spot data sources
    BinanceSpotIndexService,
    BitfinexFuturesIndexService,
    BitfinexSpotIndexService,
  ],
  exports: [FuturesIndexService, SpotIndexService],
})
export class AssetIndexModule {}
