import { Injectable, Logger } from '@nestjs/common';
import { SecretKeyManager } from 'src/common/crypto';
import * as assert from 'assert';

@Injectable()
export class CustomConfigService {
  protected readonly logger = new Logger(CustomConfigService.name);
  private config: any;
  private isInitialized = false;

  async loadConfig() {
    const secrets = await this.getSecretValue();
    this.validateSecrets(secrets);
    this.config = this.formatConfig(secrets);
    return this.config;
  }

  private async getSecretValue() {
    return {
      instanceName: process.env.INSTANCE_NAME,
      database: {
        host: process.env.DATABASE_HOST,
        port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
        username: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
      },
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
        password: process.env.REDIS_PASSWORD,
      },
      slack: {
        alertWebhook: process.env.SLACK_WEBHOOK_URL,
        botToken: process.env.SLACK_BOT_TOKEN,
        channelId: {
          alert: process.env.SLACK_ALERT_CHANNEL_ID,
          notification: process.env.SLACK_NOTIFICATION_CHANNEL_ID,
        },
      },
    };

    // @TODO: Check whether it is necessary to use SecretKeyManager
    try {
      if (process.env.MODE !== 'prod') {
        return {
          instanceName: process.env.INSTANCE_NAME,
          database: {
            host: process.env.DATABASE_HOST,
            port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
            username: process.env.DATABASE_USERNAME,
            password: process.env.DATABASE_PASSWORD,
            database: process.env.DATABASE_NAME,
          },
          redis: {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT, 10) || 6379,
            password: process.env.REDIS_PASSWORD,
          },
          slack: {
            alertWebhook: process.env.SLACK_WEBHOOK_URL,
            botToken: process.env.SLACK_BOT_TOKEN,
            channelId: {
              alert: process.env.SLACK_ALERT_CHANNEL_ID,
              notification: process.env.SLACK_NOTIFICATION_CHANNEL_ID,
            },
          },
        };
      }

      const secretKeyManager = new SecretKeyManager({
        region: 'ap-northeast-2',
        DEFAULT_PATH: process.env.SECRET_PATH,
      });
      return JSON.parse(
        await secretKeyManager.decrypt({
          keyName: process.env.SECRET_KEY_NAME,
        }),
      );
    } catch (error) {
      this.logger.error('failed to get secret value:', error);
      throw error;
    }
  }

  private validateSecrets(secrets: any) {
    try {
      assert(secrets.instanceName, 'INSTANCE_NAME is required');
      assert(secrets.database.host, 'DATABASE_HOST is required');
      assert(secrets.database.port, 'DATABASE_PORT is required');
      assert(secrets.database.username, 'DATABASE_USERNAME is required');
      assert(secrets.database.password, 'DATABASE_PASSWORD is required');
      assert(secrets.database.database, 'DATABASE_NAME is required');

      assert(secrets.redis.host, 'REDIS_HOST is required');
      assert(secrets.redis.port, 'REDIS_PORT is required');
      assert(secrets.redis.password, 'REDIS_PASSWORD is required');

      assert(secrets.slack.alertWebhook, 'SLACK_WEBHOOK_URL is required');
      assert(secrets.slack.botToken, 'SLACK_BOT_TOKEN is required');
      assert(secrets.slack.channelId.alert, 'SLACK_ALERT_CHANNEL_ID is required');
      assert(secrets.slack.channelId.notification, 'SLACK_NOTIFICATION_CHANNEL_ID is required');

      this.isInitialized = true;
    } catch (error) {
      this.isInitialized = false;
      throw error;
    }
  }

  private formatConfig(secrets: any) {
    return {
      instanceName: secrets.instanceName,
      database: {
        host: secrets.database.host,
        port: secrets.database.port || 5432,
        username: secrets.database.username,
        password: secrets.database.password,
        database: secrets.database.database,
      },
      redis: {
        host: secrets.redis.host,
        port: secrets.redis.port || 6379,
        password: secrets.redis.password,
      },
      slack: {
        alertWebhook: secrets.slack.alertWebhook,
        botToken: secrets.slack.botToken,
        channelId: {
          alert: secrets.slack.channelId.alert,
          notification: secrets.slack.channelId.notification,
        },
      },
    };
  }

  get(path: string) {
    return path.split('.').reduce((config: any, key: string) => {
      return config?.[key];
    }, this.config);
  }

  getInitializationStatus() {
    return this.isInitialized;
  }
}
