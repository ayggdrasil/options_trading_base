import { Injectable, Logger } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { LogLevel, SlackTag } from 'src/common/enums';
import { SendMessageOptions } from 'src/common/interfaces';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';
import { CustomConfigService } from '../config/config.service';

@Injectable()
export class SlackService {
  protected readonly logger = new Logger(SlackService.name);
  private readonly channelId: Record<string, string>;
  private readonly webClient: WebClient;
  private readonly redis: Redis;

  constructor(
    private readonly customConfigService: CustomConfigService,
    private readonly redisService: RedisService,
  ) {
    const webhookUrl = this.customConfigService.get('slack.alertWebhook');
    this.redis = this.redisService.getOrThrow();
    this.channelId = {
      alert: this.customConfigService.get('slack.channelId.alert'),
      notification: this.customConfigService.get('slack.channelId.notification'),
    };
    this.webClient = new WebClient(this.customConfigService.get('slack.botToken'));
  }

  async sendMessage(title: any, logLevel: LogLevel, options?: SendMessageOptions) {
    const channelId = this.getChannelId(logLevel);
    const description = options?.description || 'No more description';
    const tags = options?.tags || [];
    const { formattedTitle, formattedDescription } = this.formatMessage(title, description, logLevel, tags);
    const content = formattedTitle + '\n' + formattedDescription;

    try {
      if (options?.disableThreading) {
        return await this.postMessage(channelId, content);
      }

      const { isSuccess: isThreadSuccess, threadTs } = await this.getOrCreateThread(
        channelId,
        formattedTitle,
      );
      const { isSuccess: isReplySuccess } = await this.replyToThread(
        channelId,
        threadTs,
        formattedDescription,
      );

      if (!isThreadSuccess || !isReplySuccess) {
        throw new Error('Failed to send message to slack');
      }
      return true;
    } catch (error) {
      console.log(`Error sending message to slack: ${error} while sending message: ${content}`);
      return await this.postMessage(channelId, content);
    }
  }

  private formatMessage(title: string, description: any, logLevel: LogLevel, tags: SlackTag[]) {
    return {
      formattedTitle: `[\`${logLevel}\`]${tags?.join('')}\n` + title,
      formattedDescription: logLevel === LogLevel.ERROR ? `\`\`\`${description}\`\`\`` : description,
    };
  }

  private async postMessage(channelId: string, message: string) {
    try {
      const result = await this.webClient.chat.postMessage({
        channel: channelId,
        text: message,
      });
      if (!result.ok) throw new Error(result.error);
      return true;
    } catch (error) {
      console.log(`Error sending message to slack: ${error} while sending message: ${message}`);
    }
  }

  private async getOrCreateThread(
    channelId: string,
    title: string,
  ): Promise<{ isSuccess: boolean; threadTs: string }> {
    const existingThread = await this.redis.get(this.getRedisKeyOfTitle(title));
    if (existingThread) {
      return { isSuccess: true, threadTs: existingThread };
    } else {
      const { isSuccess: _isSuccess, threadTs: newThreadTs } = await this.createThread(channelId, title);
      return { isSuccess: _isSuccess, threadTs: newThreadTs };
    }
  }

  private getRedisKeyOfTitle(title: string) {
    return `slack:thread:${title}`;
  }

  private async createThread(channelId: string, title: string) {
    const result = await this.webClient.chat.postMessage({
      channel: channelId,
      text: title,
    });
    if (!result.ts) throw new Error('Failed to create thread');
    await this.redis.set(this.getRedisKeyOfTitle(title), result.ts, 'EX', 3600);
    return {
      isSuccess: result.ok,
      threadTs: result.ts,
    };
  }

  private getChannelId(logLevel: LogLevel) {
    switch (logLevel) {
      case LogLevel.INFO:
        return this.channelId.notification;
      case LogLevel.WARN:
        return this.channelId.alert;
      case LogLevel.ERROR:
        return this.channelId.alert;
      case LogLevel.CRITICAL:
        return this.channelId.alert;
      default:
        return this.channelId.notification;
    }
  }

  private async replyToThread(channelId: string, threadTs: string, message: string) {
    const result = await this.webClient.chat.postMessage({
      channel: channelId,
      text: message,
      thread_ts: threadTs,
    });
    return {
      isSuccess: result.ok,
    };
  }
}
