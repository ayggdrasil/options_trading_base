import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IvCurve } from './entities/iv-curve.entity';
import { IvCurveSource } from './entities/iv-curve-source.entity';
import { IvCurveController } from './iv-curve.controller';
import { IvCurveService } from './iv-curve.service';
import { OkxIvCurveService } from './data-sources/okx/okx-iv-curve.service';
import { BybitIvCurveService } from './data-sources/bybit/bybit-iv-curve.service';
import { DeribitIvCurveService } from './data-sources/deribit/deribit-iv-curve.service';
import { SviService } from './svi/svi.service';

@Module({
  imports: [TypeOrmModule.forFeature([IvCurve, IvCurveSource])],
  controllers: [IvCurveController],
  providers: [IvCurveService, OkxIvCurveService, BybitIvCurveService, DeribitIvCurveService, SviService],
})
export class IvCurveModule {}
