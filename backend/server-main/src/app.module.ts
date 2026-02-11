import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { CustomConfigModule } from './providers/config/config.module';
import { PostgresModule } from './providers/database/postgres/postgres.module';
import { SlackModule } from './providers/slack/slack.module';
import { RiskFreeRateModule } from './modules/rf-rate/rf-rate.module';
import { IvCurveModule } from './modules/iv-curve/iv-curve.module';
import { AssetIndexModule } from './modules/asset-index/asset-index.module';
import { ScheduleModule } from '@nestjs/schedule';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.MODE || 'dev'}`,
    }),
    CustomConfigModule,
    ScheduleModule.forRoot(),
    PostgresModule,
    RedisModule,
    SlackModule,
    RiskFreeRateModule,
    AssetIndexModule,
    IvCurveModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
