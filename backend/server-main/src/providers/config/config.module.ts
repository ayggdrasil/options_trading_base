import { Global, Module } from '@nestjs/common';
import { CustomConfigService } from './config.service';

@Global()
@Module({
  providers: [
    {
      provide: CustomConfigService,
      useFactory: async () => {
        const customConfigService = new CustomConfigService();
        await customConfigService.loadConfig();
        return customConfigService;
      },
    },
  ],
  exports: [CustomConfigService],
})
export class CustomConfigModule {}
