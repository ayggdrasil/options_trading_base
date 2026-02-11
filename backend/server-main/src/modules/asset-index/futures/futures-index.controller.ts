import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FuturesIndexService } from './futures-index.service';

@ApiTags('futures-index')
@Controller('futures-index')
export class FuturesIndexController {
  constructor(private readonly futuresIndexService: FuturesIndexService) {}

  @Get('/')
  getFuturesIndex() {
    return this.futuresIndexService.getAssetIndexMapRes();
  }
}
