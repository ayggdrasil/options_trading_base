import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  NotFoundException,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiQuery } from '@nestjs/swagger';
import { IvCurveService } from './iv-curve.service';
import { IvMap } from './iv-curve.interface';
import { UnderlyingAsset } from 'src/common/types';
import { OptionType } from './utils/enums';
import {
  calculateUnderlyingFutures,
  getMarkIvAndPriceByInstrument,
  InstrumentMarkData,
  InstrumentMarkDataRes,
  parseInstrument,
} from '@callput/shared';
import { FuturesIndexService } from '../asset-index/futures/futures-index.service';
import { RiskFreeRateService } from '../rf-rate/rf-rate.service';

interface InstrumentsRequestDto {
  instruments: string[];
}

interface TraceIvMapRes<TUnderlyingAsset extends string> {
  data: {
    sourceIvMaps: {
      [key: string]: IvMap<TUnderlyingAsset>;
    };
    interpolatedIvMaps: {
      [key: string]: IvMap<TUnderlyingAsset>;
    };
    ivMap: IvMap<TUnderlyingAsset>;
  };
  lastUpdatedAt: number;
}

@ApiTags('iv-curve')
@Controller('iv-curve')
export class IvCurveController {
  constructor(
    private readonly ivCurveService: IvCurveService,
    private readonly futuresIndexService: FuturesIndexService,
    private readonly riskFreeRateService: RiskFreeRateService,
  ) {}

  @Get('/all')
  @ApiOperation({ summary: 'Get all IV values' })
  @ApiResponse({ status: 200, description: 'Returns all IV values' })
  @ApiResponse({ status: 400, description: 'Service not initialized' })
  async getInstrumentMarkData(): Promise<InstrumentMarkDataRes> {
    try {
      return this.ivCurveService.getInstrumentMarkDataRes();
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  @Get('/instrument/:instrument')
  @ApiOperation({ summary: 'Get IV value for a single instrument' })
  @ApiParam({ name: 'instrument', description: 'The instrument identifier (e.g., BTC-29NOV24-46000-C)' })
  @ApiResponse({ status: 200, description: 'Returns the IV value for the specified instrument' })
  @ApiResponse({ status: 404, description: 'Instrument not found' })
  async getMarkIvAndPriceByInstrument(
    @Param('instrument') instrument: string,
  ): Promise<InstrumentMarkDataRes> {
    try {
      const instrumentMarkDataRes = this.ivCurveService.getInstrumentMarkDataRes();
      const futuresIndexMap = this.futuresIndexService.getAssetIndexMap();
      const riskFreeRateCollection = this.riskFreeRateService.getRiskFreeRateCollection();

      const { underlyingAsset, expiry } = parseInstrument(instrument);

      const underlyingFutures = calculateUnderlyingFutures(
        underlyingAsset,
        expiry,
        futuresIndexMap,
        riskFreeRateCollection,
      );

      const markIvAndPrice = getMarkIvAndPriceByInstrument(
        instrument,
        instrumentMarkDataRes.data,
        underlyingFutures,
      );

      return {
        data: {
          [instrument]: {
            markIv: markIvAndPrice.markIv,
            markPrice: markIvAndPrice.markPrice,
          },
        },
        lastUpdatedAt: instrumentMarkDataRes.lastUpdatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  @Post('/batch')
  @ApiOperation({ summary: 'Get IV values for multiple instruments' })
  @ApiBody({
    description: 'Array of instruments to fetch IV values for',
    type: Object,
    schema: {
      properties: {
        instruments: {
          type: 'array',
          items: { type: 'string' },
          example: ['BTC-29NOV24-46000-C', 'BTC-29NOV24-48000-C'],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Returns IV values for the specified instruments' })
  @ApiResponse({ status: 400, description: 'Invalid request or service not initialized' })
  async getMarkIvAndPriceByBatch(@Body() request: InstrumentsRequestDto): Promise<InstrumentMarkDataRes> {
    try {
      if (!request.instruments || !Array.isArray(request.instruments)) {
        throw new BadRequestException('Invalid instruments array provided');
      }

      const instrumentMarkDataRes = this.ivCurveService.getInstrumentMarkDataRes();
      const futuresIndexMap = this.futuresIndexService.getAssetIndexMap();
      const riskFreeRateCollection = this.riskFreeRateService.getRiskFreeRateCollection();

      const result: InstrumentMarkData = {};

      for (const instrument of request.instruments) {
        const { underlyingAsset, expiry } = parseInstrument(instrument);

        const underlyingFutures = calculateUnderlyingFutures(
          underlyingAsset,
          expiry,
          futuresIndexMap,
          riskFreeRateCollection,
        );

        const markIvAndPrice = getMarkIvAndPriceByInstrument(
          instrument,
          instrumentMarkDataRes.data,
          underlyingFutures,
        );

        result[instrument] = {
          markIv: markIvAndPrice.markIv,
          markPrice: markIvAndPrice.markPrice,
        };
      }

      return {
        data: result,
        lastUpdatedAt: instrumentMarkDataRes.lastUpdatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  @Get('/trace')
  @ApiOperation({ summary: 'Trace IV map calculation - source, interpolated, and aggregated' })
  @ApiQuery({ name: 'underlyingAsset', description: 'The underlying asset (e.g., BTC)' })
  @ApiQuery({ name: 'expiryDate', description: 'The expiry date (e.g., 8MAR24' })
  @ApiQuery({
    name: 'optionType',
    description: 'The option type (e.g., Call, Put, All)',
    required: false,
    enum: OptionType,
  })
  @ApiResponse({ status: 200, description: 'Returns the IV maps of source, interpolated, and aggregated' })
  @ApiResponse({ status: 400, description: 'Service not initialized' })
  async traceIvMapCalculation(
    @Query('underlyingAsset') underlyingAsset: UnderlyingAsset,
    @Query('expiryDate') expiryDate: string,
    @Query('optionType') optionType?: OptionType,
  ): Promise<TraceIvMapRes<UnderlyingAsset>> {
    try {
      console.log(`Tracing IV Map: Asset=${underlyingAsset}, ExpiryDate=${expiryDate}`);

      // Validate inputs
      if (!underlyingAsset || !expiryDate) {
        throw new BadRequestException('Invalid input parameters');
      }

      // Validate optionType if provided, otherwise use default
      if (optionType && ![OptionType.CALL, OptionType.PUT, OptionType.ALL].includes(optionType)) {
        throw new BadRequestException('Invalid option type. Valid values are: Call, Put, All');
      }

      const finalOptionType = optionType ?? OptionType.ALL;

      const tracedIvMap = this.ivCurveService.traceIvMapCalculation(
        underlyingAsset,
        expiryDate,
        finalOptionType,
      );

      if (tracedIvMap === null) {
        throw new NotFoundException(
          'No IV snapshot found for the specified underlying asset and expiry date',
        );
      }

      return {
        data: tracedIvMap,
        lastUpdatedAt: Date.now(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }
}
