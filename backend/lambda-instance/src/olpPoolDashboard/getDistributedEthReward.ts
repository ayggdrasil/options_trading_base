import dayjs from "dayjs";
type duneRowType = {
  date: string;
  total_amount: number;
  avg_weth_price: number;
  total_usd_value: number;
  cumulative_usd_value: number;
}

type ResultRowType = {
  [date: string]: {
    cumulative_dist_eth_reward: number;
  }
}

// export const getDistributedEthReward = async (period: string) => {
//   const { DUNE_API_KEY, DUNE_QUERY_ID_DISTRIBUTED_ETH_REWARD } = process.env;
//   const queryId = DUNE_QUERY_ID_DISTRIBUTED_ETH_REWARD;
//   const response = await fetch(
//     `https://api.dune.com/api/v1/query/${queryId}/results?limit=${period}`,
//     {
//       method: 'GET',
//       headers: {
//         'X-Dune-API-Key': DUNE_API_KEY
//       }
//     }
//   );

//   const result = await response.json();

//   const distributedETHReward: ResultRowType = result.result.rows.reduce((acc: ResultRowType, row: duneRowType) => {
//     acc[dayjs(row.date).format('YYYY-MM-DD')] = {
//       cumulative_dist_eth_reward: row.cumulative_usd_value
//     };
//     return acc;
//   }, {});

//   return distributedETHReward;
// }