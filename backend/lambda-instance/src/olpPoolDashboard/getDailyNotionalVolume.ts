import dayjs from "dayjs";

type duneRowType = {
    avg_7_days_notional_volume: number;
    avg_7_days_premium_volume: number;
    cumulative_notional_volume: number;
    cumulative_notional_volume_K: number;
    cumulative_premium_volume: number;
    cumulative_premium_volume_K: number;
    event_date: string;
    premium_volume: number;
    total_notional_volume: number;
}

type ResultRowType = {
    [date: string]: {
        notional_volume: number;
    }
}

export const getDailyNotionalVolume = async (period: string) => {
  const { DUNE_API_KEY, DUNE_QUERY_ID_NOTIONAL_VOLUME } = process.env;
  const queryId = DUNE_QUERY_ID_NOTIONAL_VOLUME;
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
  const notionalVolume: ResultRowType = result.result.rows.reduce((acc: ResultRowType, row: duneRowType) => {
    acc[dayjs(row.event_date).format('YYYY-MM-DD')] = {
      notional_volume: row.total_notional_volume
    };
    return acc;
  }, {});

  return notionalVolume;
}
