import { SlackTag } from './enums';

export interface SendMessageOptions {
  tags?: SlackTag[];
  description?: any;
  isTrade?: boolean;
  disableThreading?: boolean;
}
