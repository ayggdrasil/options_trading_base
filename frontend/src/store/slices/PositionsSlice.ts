import BigNumber from "bignumber.js";
import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  GroupedPosition,
  NewPosition,
  Position,
  SettlePosition,
} from "@/interfaces/interfaces.positionSlice";
import { SupportedChains } from "@callput/shared";
import { getNetworkConfigs } from "@/networks/helpers";
import { MY_POSITION_API } from "@/networks/apis";
import { getStrategyByOptionTokenId, isBuyStrategy, isCallStrategy, parseOptionTokenId } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

export interface PositionsState {
  account: string;
  chain: SupportedChains;
  BTC: GroupedPosition[];
  ETH: GroupedPosition[];
  lastUpdatedAt: string;
}

const currentNetwork = Object.keys(getNetworkConfigs())[0] as SupportedChains;

const initialState: PositionsState = {
  account: "",
  chain: currentNetwork,
  BTC: [],
  ETH: [],
  lastUpdatedAt: "0",
};

const loadStateFromLocalStorage = (): PositionsState => {
  const storedState = localStorage.getItem("positionsState");
  return storedState ? JSON.parse(storedState) : initialState;
};

const saveStateToLocalStorage = (state: PositionsState) => {
  localStorage.setItem("positionsState", JSON.stringify(state));
};

const clearLocalStorage = () => {
  localStorage.removeItem("positionsState");
};

const persistedState = loadStateFromLocalStorage();

export const processGroupedPositions = (groupedPositions: GroupedPosition[]): GroupedPosition[] => {
  const currentTimeInSec = Date.now() / 1000;

  return groupedPositions.reduce((acc: GroupedPosition[], gp) => {
    const filteredPositions = gp.positions
      .filter((position) => position.isSettled === false)
      .filter((position) => {
        const isExpiredForMoreThan24Hours = currentTimeInSec >= Number(gp.expiry) + 24 * 60 * 60;
        const settlePrice = new BigNumber(gp.settlePrice).toNumber();

        if (position.isBuy && isExpiredForMoreThan24Hours) {
          const strategy = getStrategyByOptionTokenId(BigInt(position.optionTokenId));
          const isITM = isCallStrategy(strategy)
            ? Number(position.mainOptionStrikePrice) < settlePrice
            : Number(position.mainOptionStrikePrice) > settlePrice;

          return isITM;
        }

        return true;
      });

    if (filteredPositions.length > 0) {
      acc.push({
        ...gp,
        positions: filteredPositions,
      });
    }

    return acc;
  }, []);
};

export const loadMyPositions = createAsyncThunk(
  "positions/loadMyPositions",
  async({chain, address}: {chain: SupportedChains, address: `0x${string}` | undefined}) => {
    if (!address)
      return {
        ...initialState,
        chain: chain,
      };

    const response = await fetch(MY_POSITION_API[chain] + address);

    if (!response.ok) {
      throw new Error("Failed to fetch my positions");
    }

    const result = await response.json();

    return {
      ...result,
      chain: chain,
    };
  }
);

const updateExpiryArray = (
  oldExpiryArray: GroupedPosition[],
  newExpiryArray: GroupedPosition[]
): GroupedPosition[] => {
  let result: GroupedPosition[] = [...oldExpiryArray];

  newExpiryArray.forEach((newExpiry) => {
    const oldExpiryIndex = result.findIndex((e) => Number(e.expiry) === Number(newExpiry.expiry));

    if (oldExpiryIndex === -1) {
      // if newExpiry is not in oldExpiryArray
      // Add newExpiry in time-ordered manner based on expiry
      const insertIndex = result.findIndex((e) => Number(e.expiry) > Number(newExpiry.expiry));
      if (insertIndex === -1) {
        result.push(newExpiry);
      } else {
        result.splice(insertIndex, 0, newExpiry);
      }
    } else {
      // if newExpiry is found in oldExpiryArray
      const combinedPositions = [...result[oldExpiryIndex].positions, ...newExpiry.positions];

      // Use a Map to track the latest position for each optionTokenId
      const positionMap = new Map();

      combinedPositions.forEach((position) => {
        const existingPosition = positionMap.get(position.optionTokenId);

        if (
          !existingPosition ||
          Number(position.lastProcessBlockTime) > Number(existingPosition.lastProcessBlockTime)
        ) {
          positionMap.set(position.optionTokenId, position);
        }
      });

      // Convert the map back into an array for the final positions
      const uniquePositions = Array.from(positionMap.values()).sort(
        (a, b) => a.mainOptionStrikePrice - b.mainOptionStrikePrice
      );

      result[oldExpiryIndex] = {
        ...newExpiry,
        positions: uniquePositions,
      };
    }
  });

  return result;
};

const positionsSlice = createSlice({
  name: "positions",
  initialState: persistedState,
  reducers: {
    updatePosition: (state, action: PayloadAction<NewPosition>) => {
      const {
        isOpen,
        underlyingAsset,
        underlyingAssetAddress,
        expiry,
        optionTokenId,
        length,
        mainOptionStrikePrice,
        pairedOptionStrikePrice,
        isBuys,
        strikePrices,
        isCalls,
        optionNames,
        size,
        executionPrice,
        openedCollateralToken,
        openedCollateralAmount,
        closedCollateralToken,
        closedCollateralAmount,
        lastProcessBlockTime,
      } = action.payload;

      const groupedPositions = [...state[underlyingAsset]];

      let expiryFound = false; // Add this flag

      groupedPositions.forEach((groupedPosition, i) => {
        if (Number(groupedPosition.expiry) === Number(expiry) && groupedPosition.positions) {
          expiryFound = true;

          const posIndex = groupedPosition.positions.findIndex((p) => p.optionTokenId === optionTokenId);

          const { strategy } = parseOptionTokenId(BigInt(optionTokenId));
          const isBuy = isBuyStrategy(strategy);

          // 기존에 동일한 포지션이 있는 경우
          if (posIndex !== -1) {
            const prevPosition = groupedPosition.positions[posIndex];

            if (Number(prevPosition.lastProcessBlockTime) > Number(lastProcessBlockTime)) return;

            const newSize = isOpen
              ? new BigNumber(prevPosition.size).plus(size).toString()
              : new BigNumber(prevPosition.size).isGreaterThan(size)
              ? new BigNumber(groupedPosition.positions[posIndex].size).minus(size).toString()
              : "0";

            let updatedPosition;

            if (isOpen) {
              // TODO open, close 별로 조금 더 자세하게 업데이트할 필요 있음
              const prevExecutionPrice = new BigNumber(prevPosition.executionPrice)
                .multipliedBy(prevPosition.size)
                .toString();
              const nextExecutionPrice = new BigNumber(executionPrice).multipliedBy(size).toString();
              const newExecutionPrice = new BigNumber(prevExecutionPrice)
                .plus(nextExecutionPrice)
                .div(newSize)
                .toFixed(0)
                .toString();
              const newOpenedCollateralTokenAmount = isBuy
                ? "0"
                : new BigNumber(prevPosition.openedCollateralAmount)
                  .plus(openedCollateralAmount || "0")
                  .toString();

              // Creating a copy of the position object and updating the size
              updatedPosition = {
                ...prevPosition,
                size: newSize.toString(),
                executionPrice: newExecutionPrice.toString(),
                openedCollateralAmount: newOpenedCollateralTokenAmount.toString(),
                lastProcessBlockTime: lastProcessBlockTime,
              };
            } else {
              const prevClosedAvgExecutionPrice = new BigNumber(prevPosition.closedAvgExecutionPrice)
                .multipliedBy(prevPosition.size)
                .toString();
              const nextClosedAvgExecutionPrice = new BigNumber(executionPrice).multipliedBy(size).toString();
              const newClosedAvgExecutionPrice = new BigNumber(prevClosedAvgExecutionPrice)
                .plus(nextClosedAvgExecutionPrice)
                .div(newSize)
                .toFixed(0)
                .toString();
              const newClosedCollateralToken = isBuy ? "" : (prevPosition.closedCollateralToken || closedCollateralToken || "");
              const newClosedCollateralAmount = isBuy
                ? "0"
                : new BigNumber(prevPosition.closedCollateralAmount)
                  .plus(closedCollateralAmount || "0")
                  .toString();

              // Creating a copy of the position object and updating the size
              updatedPosition = {
                ...prevPosition,
                size: newSize.toString(),
                closedAvgExecutionPrice: newClosedAvgExecutionPrice.toString(),
                closedCollateralToken: newClosedCollateralToken,
                closedCollateralAmount: newClosedCollateralAmount,
                lastProcessBlockTime: lastProcessBlockTime,
              };
            }

            // Creating a copy of the positions array and replacing the old position with the updated one
            if (newSize === "0") {
              groupedPositions[i].positions = [
                ...groupedPosition.positions.slice(0, posIndex),
                ...groupedPosition.positions.slice(posIndex + 1),
              ];
            } else {
              groupedPositions[i].positions = [
                ...groupedPosition.positions.slice(0, posIndex),
                updatedPosition,
                ...groupedPosition.positions.slice(posIndex + 1),
              ];
            }
          } else { // 기존에 동일한 포지션이 없는 경우
            if (!isOpen) return;

            // Adding a new position when posIndex is -1
            const newPosition: Position = {
              underlyingAsset: underlyingAssetAddress,
              optionTokenId: optionTokenId,
              length: length,
              markPrice: 0,
              markIv: 0,
              mainOptionStrikePrice: mainOptionStrikePrice,
              pairedOptionStrikePrice: pairedOptionStrikePrice,
              isBuys: isBuys,
              strikePrices: strikePrices,
              isCalls: isCalls,
              optionNames: optionNames,
              size: size,
              sizeOpened: "0",
              sizeClosing: "0",
              sizeClosed: "0",
              sizeSettled: "0",
              isBuy: isBuy,
              executionPrice: executionPrice,
              openedToken: "",
              openedAmount: "0",
              openedCollateralToken: isBuy ? "" : (openedCollateralToken || ""),
              openedCollateralAmount: isBuy ? "0" : (openedCollateralAmount || "0"),
              openedAvgExecutionPrice: executionPrice,
              openedAvgSpotPrice: "0",
              closedToken: "",
              closedAmount: "0",
              closedCollateralToken: "",
              closedCollateralAmount: "0",
              closedAvgExecutionPrice: "0",
              closedAvgSpotPrice: "0",
              settledToken: "",
              settledAmount: "0",
              settledCollateralToken: "",
              settledCollateralAmount: "0",
              settledPrice: "0",
              isSettled: false,
              lastProcessBlockTime: lastProcessBlockTime,
            };

            // Find the correct index based on the strikePrice
            let insertIndex = groupedPositions[i].positions.findIndex(
              (p) => Number(p.mainOptionStrikePrice) > Number(mainOptionStrikePrice)
            );

            // If all positions have a smaller strikePrice or the list is empty,
            // the position will be added to the end.
            if (insertIndex === -1) {
              insertIndex = groupedPositions[i].positions.length;
            }

            // Insert the new position in the correct order based on strikePrice
            groupedPositions[i].positions.splice(insertIndex, 0, newPosition);
          }
        }
      });

      if (!expiryFound && isOpen) {
        // If the expiry is not found in the positions array, find the correct index to insert the new expiry
        const index = groupedPositions.findIndex((p) => Number(p.expiry) > Number(expiry));

        const { strategy } = parseOptionTokenId(BigInt(optionTokenId));
        const isBuy = isBuyStrategy(strategy);

        // Adding a new expiry when expiry is not found
        const newExpiry: GroupedPosition = {
          expiry: expiry,
          positions: [
            {
              underlyingAsset: underlyingAssetAddress,
              optionTokenId: optionTokenId,
              length: length,
              markPrice: 0,
              markIv: 0,
              mainOptionStrikePrice: mainOptionStrikePrice,
              pairedOptionStrikePrice: pairedOptionStrikePrice,
              isBuys: isBuys,
              strikePrices: strikePrices,
              isCalls: isCalls,
              optionNames: optionNames,
              size: size,
              sizeOpened: "0",
              sizeClosing: "0",
              sizeClosed: "0",
              sizeSettled: "0",
              isBuy: isBuy,
              executionPrice: executionPrice,
              openedToken: "",
              openedAmount: "0",
              openedCollateralToken: isBuy ? "" : (openedCollateralToken || ""),
              openedCollateralAmount: isBuy ? "0" : (openedCollateralAmount || "0"),
              openedAvgExecutionPrice: executionPrice,
              openedAvgSpotPrice: "0",
              closedToken: "",
              closedAmount: "0",
              closedCollateralToken: "",
              closedCollateralAmount: "0",
              closedAvgExecutionPrice: "0",
              closedAvgSpotPrice: "0",
              settledToken: "",
              settledAmount: "0",
              settledCollateralToken: "",
              settledCollateralAmount: "0",
              settledPrice: "0",
              isSettled: false,
              lastProcessBlockTime: lastProcessBlockTime,
            },
          ],
          settlePrice: "0",
        };

        if (index === -1) {
          groupedPositions.push(newExpiry);
        } else {
          groupedPositions.splice(index, 0, newExpiry);
        }
      }

      // Check and remove the expiry if it has no positions.
      for (let j = 0; j < groupedPositions.length; j++) {
        if (groupedPositions[j].positions && groupedPositions[j].positions.length === 0) {
          groupedPositions.splice(j, 1);
          j--; // Decrement index to account for splicing
        }
      }

      state[underlyingAsset] = groupedPositions;
      state.lastUpdatedAt = lastProcessBlockTime;

      saveStateToLocalStorage(state);
    },
    settlePosition: (state, action: PayloadAction<SettlePosition>) => {
      const {
        underlyingAssetTicker,
        expiry,
        optionTokenId,
        strategy,
        mainOptionName,
        pairedOptionName,
        mainOptionStrikePrice,
        pairedOptionStrikePrice,
        isBuy,
        size,
        settlePrice,
        processBlockTime,
      } = action.payload;

      const groupedPositions = [...state[underlyingAssetTicker]]; // Creating a copy of the array

      groupedPositions.forEach((groupedPosition, i) => {
        if (Number(groupedPosition.expiry) === Number(expiry) && groupedPosition.positions) {
          const posIndex = groupedPosition.positions.findIndex((p) => p.optionTokenId === optionTokenId);

          if (posIndex !== -1) {
            groupedPositions[i].positions = [
              ...groupedPosition.positions.slice(0, posIndex),
              ...groupedPosition.positions.slice(posIndex + 1),
            ];
          }
        }
      });

      state[underlyingAssetTicker] = groupedPositions;
      state.lastUpdatedAt = processBlockTime;

      saveStateToLocalStorage(state);
    },
    resetPosition: (state) => {
      Object.assign(state, initialState);
      clearLocalStorage();
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadMyPositions.fulfilled, (state, action: PayloadAction<any>) => {
      if (state.account !== action.payload.account || state.chain !== action.payload.chain) {
        state.account = action.payload.account;
        state.chain = action.payload.chain;
        state.BTC = processGroupedPositions(action.payload.BTC);
        state.ETH = processGroupedPositions(action.payload.ETH);
        state.lastUpdatedAt = action.payload.lastUpdatedAt;
        saveStateToLocalStorage(state);
        return;
      }

      if (
        state.lastUpdatedAt <= action.payload.lastUpdatedAt ||
        Date.now() / 1000 > Number(state.lastUpdatedAt) + 300
      ) {
        state.BTC = processGroupedPositions(action.payload.BTC);
        state.ETH = processGroupedPositions(action.payload.ETH);
        state.lastUpdatedAt = action.payload.lastUpdatedAt;
        saveStateToLocalStorage(state);
        return;
      }
    });
  },
});

export const { updatePosition, settlePosition, resetPosition } = positionsSlice.actions;

export default positionsSlice.reducer;
