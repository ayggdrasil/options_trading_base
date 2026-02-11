import { Global, Module } from '@nestjs/common';
import { CustomConfigModule } from '../config/config.module';
import { RedisModule } from '../database/redis/redis.module';
import { SlackService } from './slack.service';

@Global()
@Module({
  imports: [CustomConfigModule, RedisModule],
  providers: [SlackService],
  exports: [SlackService],
})
export class SlackModule {}
