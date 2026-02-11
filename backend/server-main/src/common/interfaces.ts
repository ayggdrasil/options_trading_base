import { SlackTag } from './enums';

export interface SendMessageOptions {
  tags?: SlackTag[];
  description?: any;
  disableThreading?: boolean;
}
