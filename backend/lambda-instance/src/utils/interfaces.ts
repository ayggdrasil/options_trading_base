import { SlackTag } from "./enums";

/*
 * interface for send message options
 */
export interface SendMessageOptions {
  tags?: SlackTag[];
  description?: any;
  disableThreading?: boolean;
  isTrade?: boolean;
}
