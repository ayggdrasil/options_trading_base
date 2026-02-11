interface DeribitBookSummary {
  instrument_name: string;
  mark_iv: number;
}

export interface DeribitBookSummaryRes {
  result: DeribitBookSummary[];
  usOut: number;
}
