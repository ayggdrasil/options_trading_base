import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomConfigModule } from 'src/providers/config/config.module';
import { CustomConfigService } from 'src/providers/config/config.service';
import { RiskFreeRate } from 'src/modules/rf-rate/entities/rf-rate.entity';
import { RiskFreeRateSource } from 'src/modules/rf-rate/entities/rf-rate-source.entity';
import { IvCurve } from 'src/modules/iv-curve/entities/iv-curve.entity';
import { IvCurveSource } from 'src/modules/iv-curve/entities/iv-curve-source.entity';
import { AssetIndex } from 'src/modules/asset-index/common/entities/asset-index.entity';
import { AssetIndexSource } from 'src/modules/asset-index/common/entities/asset-index-source.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [CustomConfigModule],
      useFactory: (customConfigService: CustomConfigService) => ({
        type: 'postgres',
        host: customConfigService.get('database.host'),
        port: customConfigService.get('database.port'),
        username: customConfigService.get('database.username'),
        password: customConfigService.get('database.password'),
        database: customConfigService.get('database.database'),

        ssl: { rejectUnauthorized: false },
        extra: {
          ssl: { rejectUnauthorized: false },
        },

        entities: [AssetIndex, AssetIndexSource, RiskFreeRate, RiskFreeRateSource, IvCurve, IvCurveSource],
        synchronize: true,
      }),
      inject: [CustomConfigService],
    }),
  ],
})
export class PostgresModule {}
