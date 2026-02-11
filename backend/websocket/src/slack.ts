import { WebClient } from '@slack/web-api';
import { SendMessageOptions } from '../utils/interfaces';
import { LogLevel, SlackTag } from '../utils/enums';
import { redis } from './redis';
import Redis from 'ioredis';

const getChannelId = (logLevel: LogLevel, isTrade?: boolean) => {
  const channelId = {
    notification: process.env.SLACK_NOTIFICATION_CHANNEL_ID,
    alert: process.env.SLACK_ALERT_CHANNEL_ID,
    trade: process.env.SLACK_TRADE_CHANNEL_ID,
  };

  if (isTrade) return channelId.trade;

  switch (logLevel) {
    case LogLevel.INFO:
      return channelId.notification;
    case LogLevel.WARN:
      return channelId.alert;
    case LogLevel.ERROR:
      return channelId.alert;
    case LogLevel.CRITICAL:
      return channelId.alert;
  }
};

const webClient = new WebClient(process.env.SLACK_BOT_TOKEN);

export const sendMessage = async (title: string, logLevel: LogLevel, options?: SendMessageOptions) => {
  const channelId = getChannelId(logLevel, options?.isTrade);

  const description = options?.description || 'No more description';
  const tags = options?.tags || [];
  const { formattedTitle, formattedDescription } = formatMessage(title, description, logLevel, tags);
  const content = formattedTitle + '\n' + formattedDescription;

  try {
    if (options?.disableThreading) {
      return await postMessage(webClient, channelId, content);
    }

    const { isSuccess: isThreadSuccess, threadTs } = await getOrCreateThread(channelId, formattedTitle);
    const { isSuccess: isReplySuccess } = await replyToThread(channelId, threadTs, formattedDescription);

    if (!isThreadSuccess || !isReplySuccess) {
      throw new Error('Failed to send message to slack');
    }
    return true;
  } catch (error) {
    console.log(`Error sending message to slack: ${error} while sending message: ${content}`);
    return await postMessage(webClient, channelId, content);
  }
};

const formatMessage = (title: string, description: any, logLevel: LogLevel, tags: SlackTag[]) => {
  return {
    formattedTitle: `[\`${logLevel}\`]${tags?.join('')}\n` + title,
    formattedDescription: logLevel === LogLevel.ERROR ? `\`\`\`${description}\`\`\`` : description,
  };
};

const postMessage = async (webClient: WebClient, channelId: string, message: string): Promise<boolean> => {
  try {
    const result = await webClient.chat.postMessage({
      channel: channelId,
      text: message,
    });
    if (!result.ok) throw new Error(result.error);
    return true;
  } catch (error) {
    console.log(`Error sending message to slack: ${error} while sending message: ${message}`);
  }
};

const getOrCreateThread = async (
  channelId: string,
  title: string,
): Promise<{ isSuccess: boolean; threadTs: string }> => {
  const existingThread = await redis.get(getRedisKeyOfTitle(title));
  if (existingThread) {
    return { isSuccess: true, threadTs: existingThread };
  } else {
    const { isSuccess: _isSuccess, threadTs: newThreadTs } = await createThread(redis, channelId, title);
    return { isSuccess: _isSuccess, threadTs: newThreadTs };
  }
};

const getRedisKeyOfTitle = (title: string) => {
  return `slack:thread:${title}`;
};

const createThread = async (redis: Redis, channelId: string, title: string) => {
  const result = await webClient.chat.postMessage({
    channel: channelId,
    text: title,
  });
  if (!result.ts) throw new Error('Failed to create thread');
  await redis.set(getRedisKeyOfTitle(title), result.ts, 'EX', 3600);
  return {
    isSuccess: result.ok,
    threadTs: result.ts,
  };
};

const replyToThread = async (
  channelId: string,
  threadTs: string,
  message: string,
): Promise<{ isSuccess: boolean }> => {
  const result = await webClient.chat.postMessage({
    channel: channelId,
    text: message,
    thread_ts: threadTs,
  });
  return {
    isSuccess: result.ok,
  };
};
