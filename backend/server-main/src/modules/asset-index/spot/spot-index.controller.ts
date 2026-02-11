import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SpotIndexService } from './spot-index.service';

@ApiTags('spot-index')
@Controller('spot-index')
export class SpotIndexController {
  constructor(private readonly spotIndexService: SpotIndexService) {}

  @Get('/')
  getSpotIndex() {
    return this.spotIndexService.getAssetIndexMapRes();
  }
}
