import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SlackService } from './providers/slack/slack.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LogLevel } from './common/enums';
import { MESSAGE_TYPE } from './common/messages';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const slackService = app.get(SlackService);

  // 전역 예외 필터 적용
  app.useGlobalFilters(new AllExceptionsFilter(slackService));

  await app.listen(3000);
  console.log('Server started successfully on port 3000');

  // PM2에 ready 신호 전송
  if (process.send) {
    process.send('ready');
  }

  // 처리되지 않은 예외 처리
  process.on('uncaughtException', async (err) => {
    console.error('Uncaught Exception:', err);
    await slackService.sendMessage(`\`[server-main]\` ${MESSAGE_TYPE.UNCAUGHT_EXCEPTION}`, LogLevel.ERROR, {
      description: err.message,
      disableThreading: true,
    });
    process.exit(1);
  });

  // 처리되지 않은 Promise 거부 처리
  process.on('unhandledRejection', async (reason) => {
    console.error('Unhandled Rejection:', reason);
    await slackService.sendMessage(`\`[server-main]\` ${MESSAGE_TYPE.UNHANDLED_REJECTION}`, LogLevel.ERROR, {
      description: reason,
      disableThreading: true,
    });
    process.exit(1);
  });

  // SIGINT, SIGTERM 시그널 처리
  process.on('SIGINT', async () => {
    await slackService.sendMessage(
      `\`[server-main]\` ${MESSAGE_TYPE.PROCESS_TERMINATED_SIGINT}`,
      LogLevel.CRITICAL,
      { disableThreading: true },
    );
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await slackService.sendMessage(
      `\`[server-main]\` ${MESSAGE_TYPE.PROCESS_TERMINATED_SIGTERM}`,
      LogLevel.CRITICAL,
      { disableThreading: true },
    );
    process.exit(0);
  });
}
bootstrap();
