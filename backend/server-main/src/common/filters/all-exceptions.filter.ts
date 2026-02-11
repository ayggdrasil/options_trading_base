// src/common/filters/all-exceptions.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { SlackService } from 'src/providers/slack/slack.service';
import { LogLevel } from '../enums';
import { MESSAGE_TYPE } from '../messages';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private slackService: SlackService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof Error ? exception.message : String(exception);

    // await this.slackService.sendMessage(message, LogLevel.ERROR, {
    //   parentMessage: `\`[server-main]\` ${MESSAGE_TYPE.EXCEPTION}`,
    // });

    // HTTP 응답 전송
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: 'Internal server error',
    });
  }
}
