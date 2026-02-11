import dayjs from "dayjs";

// dune query's raw data scheme
type duneRowType = {
  Weekly_Revenue: number;
  avg_7_days_fees: number;
  cumulative_fees_sum: number;
  cumulative_protocol_sum: number;
  cumulative_risk_premiums_sum: number;
  daily_total_sum: number;
  day: string;
  total_fees_sum: number;
  total_risk_premiums_sum: number;
}

type ResultRowType = {
  [date: string]: {
    fees: number;
    risk_premium: number;
    revenue: number;
  }
}

export const getDailyFeesAndRp = async (period: string) => {
  const { DUNE_API_KEY, DUNE_QUERY_ID_FEES_AND_RP } = process.env;
  const queryId = DUNE_QUERY_ID_FEES_AND_RP;
  const response = await fetch(
    `https://api.dune.com/api/v1/query/${queryId}/results?limit=${period}`,
    {
      method: 'GET',
      headers: {
        'X-Dune-API-Key': DUNE_API_KEY
      }
    }
  );

  const result = await response.json();
  const feesAndRp: ResultRowType = result.result.rows.reduce((acc: ResultRowType, row: duneRowType) => {
    acc[dayjs(row.day).format('YYYY-MM-DD')] = {
      fees: row.total_fees_sum,
      risk_premium: row.total_risk_premiums_sum,
      revenue: row.Weekly_Revenue
    };
    return acc;
  }, {});

  return feesAndRp;
}
