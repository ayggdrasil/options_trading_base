import { Global, Module } from '@nestjs/common';
import { RiskFreeRateController } from './rf-rate.controller';
import { RiskFreeRateService } from './rf-rate.service';
import { OkxRiskFreeRateService } from './data-sources/okx/okx-rf-rate.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskFreeRate } from './entities/rf-rate.entity';
import { RiskFreeRateSource } from './entities/rf-rate-source.entity';
import { BybitRiskFreeRateService } from './data-sources/bybit/bybit-rf-rate.service';
import { DeribitRiskFreeRateService } from './data-sources/deribit/deribit-rf-rate.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([RiskFreeRate, RiskFreeRateSource])],
  controllers: [RiskFreeRateController],
  providers: [
    RiskFreeRateService,
    OkxRiskFreeRateService,
    BybitRiskFreeRateService,
    DeribitRiskFreeRateService,
  ],
  exports: [RiskFreeRateService],
})
export class RiskFreeRateModule {}
