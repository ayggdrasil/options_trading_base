import { SlackTag, Strategy } from './enums';

export interface OptionDataStr {
  length: number;
  isBuys: string;
  strikePrices: string;
  isCalls: string;
  optionNames: string;
}

export interface SendMessageOptions {
  tags?: SlackTag[];
  description?: any;
  isTrade?: boolean;
  disableThreading?: boolean;
}
