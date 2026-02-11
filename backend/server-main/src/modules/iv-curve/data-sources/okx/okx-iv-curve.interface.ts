interface OkxOptionSummary {
  instId: string;
  markVol: string;
  ts: string;
}

export interface OkxOptionSummaryRes {
  data: OkxOptionSummary[];
}
