export enum MESSAGE_TYPE {
  EXCEPTION = 'Exception',
  UNHANDLED_REJECTION = 'Unhandled Rejection',
  PROCESS_TERMINATED_SIGINT = 'Process terminated (SIGINT)',
  PROCESS_TERMINATED_SIGTERM = 'Process terminated (SIGTERM)',
  UNCAUGHT_EXCEPTION = 'Uncaught Exception',

  // iv-curve related
  IVS_FETCHED_FROM_LESS_THAN_ONE_SOURCE = 'Ivs fetched from less than one source',
  IVS_FETCHED_FROM_LESS_THAN_TWO_SOURCES = 'Ivs fetched from less than two sources',
  FUTURES_OR_RISK_FREE_RATE_OUTDATED = 'Futures or risk-free rate outdated',

  // futures-index related
  FUTURES_FETCHED_FROM_LESS_THAN_ONE_SOURCE = 'Futures fetched from less than one source',
  FUTURES_FETCHED_FROM_LESS_THAN_TWO_SOURCES = 'Futures fetched from less than two sources',

  // spot-index related
  SPOT_FETCHED_FROM_LESS_THAN_ONE_SOURCE = 'Spot fetched from less than one source',
  SPOT_FETCHED_FROM_LESS_THAN_TWO_SOURCES = 'Spot fetched from less than two sources',

  // rf-rate related
  RF_RATE_FETCHED_FROM_LESS_THAN_ONE_SOURCE = 'Rf-rate fetched from less than one source',
  RF_RATE_FETCHED_FROM_LESS_THAN_TWO_SOURCES = 'Rf-rate fetched from less than two sources',
}
