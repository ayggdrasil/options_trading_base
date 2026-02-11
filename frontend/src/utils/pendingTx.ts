import store from "@/store/store";
import { updatePosition } from "@/store/slices/PositionsSlice";
import { isPositionRequestExecuted } from "./contract";
import { addToastMessage, removeToastMessage } from "./toast";
import BigNumber from "bignumber.js";
import { NewPosition } from "@/interfaces/interfaces.positionSlice";
import { SupportedChains } from "@callput/shared";
import { generateOptionTokenData, getMainOptionName, getMainOptionStrikePrice, getPairedOptionStrikePrice } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

export const pendingTx: Array<[string, string, boolean, SupportedChains]> = [];
export const pendingTxInfo: Array<[string, NewPosition, SupportedChains]> = [];

let pollingIntervalId: NodeJS.Timeout | null = null;
let pollingTimeoutId: NodeJS.Timeout | null = null;

const checkPendingTx = async () => {
  for (let i = 0; i < pendingTx.length; i++) {
    const isOpen = pendingTx[i][2];
    const result = await isPositionRequestExecuted(pendingTx[i][0], isOpen, pendingTx[i][3]);

    if (result.status === "0") continue;

    const toastMessageId = pendingTx[i][1];
    const newPendingTxInfo = pendingTxInfo[i][1];

    removeToastMessage(toastMessageId);

    const {
      length,
      isBuys,
      strikePrices,
      isCalls,
      optionNames
    } = generateOptionTokenData(pendingTx[i][3], BigInt(result.optionTokenId))

    const mainOptionName = getMainOptionName(BigInt(result.optionTokenId), optionNames);

    if (result.status === "1") {
      const title = isOpen ? "Your position is not opened." : "Your position is not closed.";

      addToastMessage({
        id: toastMessageId,
        type: "info",
        title: title,
        message: mainOptionName,
        duration: 3 * 1000,
      })

    } else if (result.status === "2") {
      const title = isOpen ? "Your position is opened successfully." : "Your position is closed successfully.";

      if (isOpen) {
        const mainOptionStrikePrice = getMainOptionStrikePrice(BigInt(result.optionTokenId));
        const pairedOptionStrikePrice = getPairedOptionStrikePrice(BigInt(result.optionTokenId));

        newPendingTxInfo.optionTokenId = result.optionTokenId;
        newPendingTxInfo.length = length.toString();
        newPendingTxInfo.mainOptionStrikePrice = mainOptionStrikePrice;
        newPendingTxInfo.pairedOptionStrikePrice = pairedOptionStrikePrice;
        newPendingTxInfo.size = new BigNumber(result.size).toString();
      } else {
        newPendingTxInfo.closedCollateralAmount = new BigNumber(result.closedCollateralAmount).toString();
      }
      
      newPendingTxInfo.isBuys = isBuys;
      newPendingTxInfo.strikePrices = strikePrices;
      newPendingTxInfo.isCalls = isCalls;
      newPendingTxInfo.optionNames = optionNames;
      newPendingTxInfo.executionPrice = new BigNumber(result.executionPrice).toString();
      newPendingTxInfo.lastProcessBlockTime = new BigNumber(result.lastProcessBlockTime).toString();

      store.dispatch(updatePosition(newPendingTxInfo));

      addToastMessage({
        id: toastMessageId,
        type: "success",
        title: title,
        message: mainOptionName,
        duration: 3 * 1000,
      })
    }

    pendingTx.splice(i, 1);
    pendingTxInfo.splice(i, 1);
    i--;
  }

  if (pendingTx.length === 0 && pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
}

export const startPolling = () => {
  if (!pollingIntervalId && pendingTx.length > 0) {
    pollingIntervalId = setInterval(checkPendingTx, 2 * 1000) as unknown as NodeJS.Timeout;

    // Clear any existing timeout and set a new one
    if (pollingTimeoutId) clearTimeout(pollingTimeoutId);
    
    pollingTimeoutId = setTimeout(() => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        pollingIntervalId = null;
      }
      pollingTimeoutId = null;
    }, 60 * 1000) as unknown as NodeJS.Timeout; // 60 seconds
  }
};