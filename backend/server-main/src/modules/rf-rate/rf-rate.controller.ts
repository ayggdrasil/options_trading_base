import { BadRequestException, Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RiskFreeRateService } from './rf-rate.service';
import { RiskFreeRateCollectionRes } from '@callput/shared';

@ApiTags('rf-rate')
@Controller('rf-rate')
export class RiskFreeRateController {
  constructor(private readonly riskFreeRateService: RiskFreeRateService) {}

  @Get('/all')
  @ApiOperation({ summary: 'Get all risk-free rates' })
  @ApiResponse({ status: 200, description: 'Returns all risk-free rates' })
  @ApiResponse({ status: 400, description: 'Service not initialized' })
  async getAll(): Promise<RiskFreeRateCollectionRes> {
    try {
      const riskFreeRateCollectionRes = this.riskFreeRateService.getRiskFreeRateCollectionRes();

      return {
        data: { ...riskFreeRateCollectionRes.data },
        lastUpdatedAt: riskFreeRateCollectionRes.lastUpdatedAt,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }
}
