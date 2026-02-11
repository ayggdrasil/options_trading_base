import { Module } from '@nestjs/common';
import { RedisModule as NestRedisModule } from '@liaoliaots/nestjs-redis';
import { CustomConfigModule } from 'src/providers/config/config.module';
import { CustomConfigService } from 'src/providers/config/config.service';

@Module({
  imports: [
    NestRedisModule.forRootAsync({
      imports: [CustomConfigModule],
      useFactory: async (customConfigService: CustomConfigService) => ({
        config: {
          host: customConfigService.get('redis.host'),
          port: customConfigService.get('redis.port'),
          password: customConfigService.get('redis.password'),
        },
      }),
      inject: [CustomConfigService],
    }),
  ],
  exports: [NestRedisModule, RedisModule],
})
export class RedisModule {}
