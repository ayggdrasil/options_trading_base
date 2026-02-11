import dayjs from "dayjs";

type duneRowType = {
  Cumulative_PnL: number;
  Cumulative_User_Loss_PnL: number;
  Cumulative_User_Profit_PnL: number;
  OLP_Cumulative_PnL: number;
  OLP_net_PnL: number;
  User_Loss_PnL: number;
  User_Profit_PnL: number;
  User_net_PnL: number;
  buy_net_PnL: number;
  day: string;
  sell_net_PnL: number;
  settle_net_PnL: number;
}

type ResultRowType = {
  [day: string]: {
    cumulative_pnl: number;
    pnl_30d: number;
    pnl_60d: number;
    pnl_180d: number;
  }
}

export const getDailyPnl = async (period: string) => {
  const { DUNE_API_KEY, DUNE_QUERY_ID_PNL } = process.env;
  const queryId = DUNE_QUERY_ID_PNL;
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
  const pnl: ResultRowType = result.result.rows.reduce((acc: ResultRowType, currentRow: duneRowType, currentIndex: number) => {
    const currentDate = dayjs(currentRow.day);
    
    //NOTE: aggregate the recent 30d, 60d, 180d pnl summation
    const pnl30d = result.result.rows
      .filter((row: duneRowType) => {
        const rowDate = dayjs(row.day);
        const daysDiff = currentDate.diff(rowDate, 'day');
        return daysDiff >= 0 && daysDiff < 30;
      })
      .reduce((sum: number, row: duneRowType) => sum + row.OLP_net_PnL, 0);
    const pnl60d = result.result.rows
      .filter((row: duneRowType) => {
        const rowDate = dayjs(row.day);
        const daysDiff = currentDate.diff(rowDate, 'day');
        return daysDiff >= 0 && daysDiff < 60;
      })
      .reduce((sum: number, row: duneRowType) => sum + row.OLP_net_PnL, 0);
    const pnl180d = result.result.rows
      .filter((row: duneRowType) => {
        const rowDate = dayjs(row.day);
        const daysDiff = currentDate.diff(rowDate, 'day');
        return daysDiff >= 0 && daysDiff < 180;
      })
      .reduce((sum: number, row: duneRowType) => sum + row.OLP_net_PnL, 0);

    acc[currentDate.format('YYYY-MM-DD')] = {
      cumulative_pnl: currentRow.OLP_Cumulative_PnL,
      pnl_30d: pnl30d,
      pnl_60d: pnl60d,
      pnl_180d: pnl180d
    };
    return acc;
  }, {});

  return pnl;
}