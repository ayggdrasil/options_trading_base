import dayjs from "dayjs";

type duneRowType = {
  transaction_time: string;
  total_usdg_amount: number; // amount
  total_minted_or_out: number; // OLP amount
  avg_olp_price: number;
  cumulative_olp_amount: number; // totalSupply of OLP
  total_olp_value: number; // OLPTV
}

type ResultRowType = {
  [date: string]: {
    olptv: number;
    total_supply_olp: number;
    olp_price: number;
  }
}

export const getOlpInfo = async (period: string) => {
  const { DUNE_API_KEY, DUNE_QUERY_ID_OLP_INFO } = process.env;
  const queryId = DUNE_QUERY_ID_OLP_INFO;
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
  const olpInfo: ResultRowType = result.result.rows.reduce((acc: ResultRowType, row: duneRowType) => {
    acc[dayjs(row.transaction_time).format('YYYY-MM-DD')] = {
      olptv: row.total_olp_value,
      total_supply_olp: row.cumulative_olp_amount,
      olp_price: row.avg_olp_price
    };
    return acc;
  }, {});

  return olpInfo;
}