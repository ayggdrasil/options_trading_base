import BigNumber from "bignumber.js";
import { twJoin } from "tailwind-merge";
import { useContext, useEffect, useState } from "react";
import { useAccount } from "wagmi";

import { advancedFormatNumber } from "@/utils/helper";
import { OrderSide } from "@/utils/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { OlpKey } from "@/utils/enums";
import { writeCancelOlpQueue } from "@/utils/contract";
import { loadBalance } from "@/store/slices/UserSlice";
import { updateOlpQueueItem } from "@/store/slices/OlpQueueSlice";

import ToggleButton from "../Common/ToggleButton";
import PoolAssetRatioTableHead from "./PoolAssetRatioTableHead";
import PoolAssetRatioTableBody from "./PoolAssetRatioTableBody";
import RealTimeGreeksTableHead from "./RealTimeGreeksTableHead";
import RealTimeGreeksTableBody from "./RealTimeGreeksTableBody";
import BuyInput from "./BuyInput";
import SellInput from "./SellInput";

import IconDropdownDown from "@assets/icon-dropdown-down.svg";
import IconDropdownUp from "@assets/icon-dropdown-up.svg";
import MyOLPV2 from "./MyOLPV2";
import OLPBuySellQueue, { QueueItem } from "./OLPBuySellQueue";
import {
  BaseQuoteAsset,
  NetworkQuoteAsset,
  QA_ADDRESS_TO_TICKER,
  QA_TICKER_TO_DECIMAL,
  SpotAssetIndexMap,
  convertQuoteAssetToNormalizedSpotAsset,
} from "@callput/shared";
import { SupportedChains } from "@callput/shared";
import { NetworkState } from "@/networks/types";
import DisplayWithTooltip from "../TradingV2/DisplayWithToolTip";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

type OlpProps = {
  olpKey: OlpKey;
};

const OLP: React.FC<OlpProps> = ({ olpKey }) => {
  const isDisabled =
    olpKey === OlpKey.lOlp || olpKey === OlpKey.mOlp ? true : false;

  const { address } = useAccount();
  const dispatch = useAppDispatch();
  const { chain } = useAppSelector((state) => state.network) as NetworkState;
  const olpStats = useAppSelector((state: any) => state.market.olpStats);
  const olpMetricsData = useAppSelector((state: any) => state.app.olpMetrics);
  const spotAssetIndexMap = useAppSelector(
    (state: any) => state.market.spotAssetIndexMap
  ) as SpotAssetIndexMap;

  const olpApr = useAppSelector((state: any) => state.app.olpApr);
  const riskPremiumApr = olpApr[olpKey].riskPremiumApr;

  const olpQueueState = useAppSelector((state: any) => state.olpQueue);

  const [selectedOrderSide, setSelectedOrderSide] = useState<OrderSide>("Buy");
  const [selectedQuoteAsset, setSelectedQuoteAsset] = useState<
    NetworkQuoteAsset<SupportedChains>
  >(BaseQuoteAsset.USDC);

  const [payAmount, setPayAmount] = useState<string>("");
  const [receiveAmount, setReceiveAmount] = useState<string>("");

  const [loading, setLoading] = useState(true);

  const [olpPrice, setOlpPrice] = useState<string>("0");
  const [olpDepositedAssetValue, setOlpDepositedAssetValue] = useState<
    Record<string, string>
  >({});
  const [fee, setFee] = useState<number>(0);

  const [lowestFeeAsset, setLowestFeeAsset] = useState<
    NetworkQuoteAsset<SupportedChains>
  >(BaseQuoteAsset.USDC);
  const [lowestFee, setLowestFee] = useState<number>(0);

  // Queue state - Connected to OlpQueue store
  const [depositQueueItems, setDepositQueueItems] = useState<QueueItem[]>([]);
  const [withdrawQueueItems, setWithdrawQueueItems] = useState<QueueItem[]>([]);

  // Update queue items from store (data is loaded in App.tsx)
  useEffect(() => {
    if (olpQueueState.deposits) {
      const queueItems: QueueItem[] = olpQueueState.deposits.map(
        (item: any, index: number) => {
          // For deposits: item.amount is the deposited token amount
          // Need to calculate estimated OLP amount based on token price and OLP price
          let estimatedOlpAmount = "0";

          try {
            // Convert token address to ticker
            const tokenTicker =
              QA_ADDRESS_TO_TICKER[chain as SupportedChains][
              item.token.toLowerCase()
              ];

            if (
              tokenTicker &&
              spotAssetIndexMap &&
              olpPrice &&
              olpPrice !== "0"
            ) {
              // Convert ticker to normalized asset (btc, eth, usdc)
              const normalizedAsset = convertQuoteAssetToNormalizedSpotAsset(
                tokenTicker,
                false
              );

              if (normalizedAsset) {
                // Get token price
                const tokenPrice = spotAssetIndexMap[normalizedAsset];

                // Calculate deposited value in USD
                const depositedValue = new BigNumber(item.amount)
                  .dividedBy(
                    10 **
                    QA_TICKER_TO_DECIMAL[chain as SupportedChains][
                    tokenTicker
                    ]
                  )
                  .multipliedBy(tokenPrice);

                // Calculate estimated OLP amount
                // olpPrice is in 10^30 format
                const olpPriceNormalized = new BigNumber(olpPrice).dividedBy(
                  10 ** 30
                );

                estimatedOlpAmount = depositedValue
                  .dividedBy(olpPriceNormalized)
                  .toString();
              }
            }
          } catch (error) {
            console.error(
              "Error calculating estimated OLP amount for deposit:",
              error
            );
          }

          return {
            queueNumber: parseInt(item.queueIndex) + 1,
            estimatedOlpAmount,
            onCancel: async () => {
              try {
                const result = await writeCancelOlpQueue(
                  olpKey,
                  item.queueIndex,
                  chain
                );

                if (result && address) {
                  // Immediately remove from OlpQueueSlice
                  dispatch(
                    updateOlpQueueItem({
                      queueIndex: item.queueIndex,
                      olpQueueAddress: item.olpQueueAddress,
                      type: "deposit",
                      status: "remove",
                    })
                  );

                  dispatch(loadBalance({ chain, address }));
                }
              } catch (error) {
                console.error("Error canceling deposit queue:", error);
              }
            },
          };
        }
      );
      setDepositQueueItems(queueItems);
    }

    if (olpQueueState.withdrawals) {
      const queueItems: QueueItem[] = olpQueueState.withdrawals.map(
        (item: any, index: number) => ({
          queueNumber: parseInt(item.queueIndex) + 1,
          // For withdrawals: item.amount is already the OLP amount
          estimatedOlpAmount: new BigNumber(item.amount)
            .dividedBy(10 ** 18)
            .toString(),
          onCancel: async () => {
            try {
              const result = await writeCancelOlpQueue(
                olpKey,
                item.queueIndex,
                chain
              );

              if (result && address) {
                // Immediately remove from OlpQueueSlice
                dispatch(
                  updateOlpQueueItem({
                    queueIndex: item.queueIndex,
                    olpQueueAddress: item.olpQueueAddress,
                    type: "withdraw",
                    status: "remove",
                  })
                );

                dispatch(loadBalance({ chain, address }));
              }
            } catch (error) {
              console.error("Error canceling withdrawal queue:", error);
            }
          },
        })
      );
      setWithdrawQueueItems(queueItems);
    }
  }, [
    olpQueueState.deposits,
    olpQueueState.withdrawals,
    chain,
    spotAssetIndexMap,
    olpPrice,
  ]);

  useEffect(() => {
    let lowestFee = 10000;
    let lowestFeeAsset = "";

    if (selectedOrderSide === "Buy") {
      const buyUsdgFee = olpMetricsData[olpKey].buyUsdgFee;

      Object.entries(buyUsdgFee).forEach(([asset, fee]) => {
        if (Number(fee) < lowestFee) {
          lowestFeeAsset = asset;
          lowestFee = Number(fee);
        }
      });
    } else {
      const sellUsdgFee = olpMetricsData[olpKey].sellUsdgFee;

      Object.entries(sellUsdgFee).forEach(([asset, fee]) => {
        if (Number(fee) < lowestFee) {
          lowestFeeAsset = asset;
          lowestFee = Number(fee);
        }
      });
    }

    if (lowestFeeAsset === "wbtc") {
      lowestFeeAsset = BaseQuoteAsset.WBTC;
    } else if (lowestFeeAsset === "weth") {
      lowestFeeAsset = BaseQuoteAsset.WETH;
    } else if (lowestFeeAsset === "usdc") {
      lowestFeeAsset = BaseQuoteAsset.USDC;
    } else if (lowestFeeAsset === "honey") {
      lowestFeeAsset = "HONEY";
    }

    setLowestFeeAsset(lowestFeeAsset as NetworkQuoteAsset<SupportedChains>);
    setLowestFee(lowestFee / 100);
  }, [olpMetricsData, selectedOrderSide]);

  useEffect(() => {
    setOlpPrice(new BigNumber(olpMetricsData[olpKey].price).toString());
    setLoading(false);
  }, [olpMetricsData]);

  useEffect(() => {
    setPayAmount("");
    setReceiveAmount("");
  }, [selectedQuoteAsset, selectedOrderSide]);

  useEffect(() => {
    if (!spotAssetIndexMap || !olpStats || !olpStats[olpKey]) return;

    const data = {
      // wbtc: "0",
      // weth: "0",
      usdc: "0",
    };

    const olpAssetAmounts = olpStats[olpKey].assetAmounts;

    if (!olpAssetAmounts) return;

    // data.wbtc = new BigNumber(olpAssetAmounts.wbtc?.depositedAmount || "0")
    //   .multipliedBy(spotAssetIndexMap.btc)
    //   .toString();
    // data.weth = new BigNumber(olpAssetAmounts.weth?.depositedAmount || "0")
    //   .multipliedBy(spotAssetIndexMap.eth)
    //   .toString();
    data.usdc = new BigNumber(olpAssetAmounts.usdc?.depositedAmount || "0")
      .multipliedBy(spotAssetIndexMap.usdc)
      .toString();

    setOlpDepositedAssetValue(data);
  }, [spotAssetIndexMap, olpStats]);

  useEffect(() => {
    if (selectedOrderSide === "Buy") {
      if (selectedQuoteAsset === BaseQuoteAsset.WBTC) {
        setFee(Number(olpMetricsData[olpKey].buyUsdgFee?.wbtc) / 100);
      } else if (
        selectedQuoteAsset === BaseQuoteAsset.WETH ||
        selectedQuoteAsset === "ETH"
      ) {
        setFee(Number(olpMetricsData[olpKey].buyUsdgFee?.weth) / 100);
      } else if (selectedQuoteAsset === BaseQuoteAsset.USDC) {
        setFee(Number(olpMetricsData[olpKey].buyUsdgFee?.usdc) / 100);
      }
    } else {
      if (selectedQuoteAsset === BaseQuoteAsset.WBTC) {
        setFee(Number(olpMetricsData[olpKey].sellUsdgFee?.wbtc) / 100);
      } else if (
        selectedQuoteAsset === BaseQuoteAsset.WETH ||
        selectedQuoteAsset === "ETH"
      ) {
        setFee(Number(olpMetricsData[olpKey].sellUsdgFee?.weth) / 100);
      } else if (selectedQuoteAsset === BaseQuoteAsset.USDC) {
        setFee(Number(olpMetricsData[olpKey].sellUsdgFee?.usdc) / 100);
      }
    }
  }, [olpMetricsData, selectedQuoteAsset, selectedOrderSide]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-[384px] h-full flex flex-col gap-[12px] py-[24px]">
      <MyOLPV2 olpKey={olpKey} />

      <div className="w-[336px] h-[1px] bg-black2023 mx-[24px] my-[6px]" />

      <div className="flex flex-col gap-[24px]">
        {/* OLP 이름 및 BUY/SELL 영역 */}
        <div
          className="h-[36px] flex flex-row justify-between items-center px-[24px]"
          id={olpKey}
        >
          <ToggleButton
            id={olpKey}
            buttonSize="stretch"
            buttonShape="square"
            items={[
              {
                value: "Buy",
                label: "Deposit",
                textColor: "text-green4c",
                hoverColor: "hover:bg-black292c hover:text-whitef2f2",
              },
              {
                value: "Sell",
                label: "Withdraw",
                textColor: "text-redc7",
                hoverColor: "hover:bg-black292c hover:text-whitef2f2",
              },
            ]}
            selectedItem={selectedOrderSide}
            setSelectedItem={setSelectedOrderSide}
          />
        </div>

        {/* Queue Status */}
        {selectedOrderSide === "Buy" && depositQueueItems.length > 0 && (
          <div className="px-[24px]">
            <OLPBuySellQueue
              type="deposit"
              queueItems={depositQueueItems}
            />
          </div>
        )}
        {selectedOrderSide === "Sell" && withdrawQueueItems.length > 0 && (
          <div className="px-[24px]">
            <OLPBuySellQueue
              type="withdraw"
              queueItems={withdrawQueueItems}
            />
          </div>
        )}

        {/* 가격 및 APR 영역 */}
        <div className="flex flex-row gap-[20px] px-[24px]">
          <div className="flex flex-col gap-[6px] flex-1">
            <p className="h-[24px] text-gray8c8c text-[14px] font-[500] leading-[24px]">
              Price
            </p>
            <p className="h-[28px] text-whitef2f2 text-[24px] font-[800] leading-[28px]">
              {advancedFormatNumber(
                BigNumber(olpPrice)
                  .dividedBy(10 ** 30)
                  .toNumber(),
                4,
                "$"
              )}
            </p>
          </div>
          <div className="flex flex-col gap-[6px] flex-1">
            <DisplayWithTooltip
              title="APR"
              tooltipContent={
                <p>
                  Annual yield of risk premium received from
                  staked OLP tokens
                </p>
              }
              tooltipClassName="w-[240px]"
              className="w-fit h-[22px] text-gray8c8c text-[14px] font-[500] leading-[22px]"
              placement="bottom"
            />

            <p className="w-fit h-[28px] text-whitef2f2 text-[24px] font-[800] leading-[28px]"> {advancedFormatNumber(riskPremiumApr * 100, 2, "")}%</p>
          </div>
        </div>

        {/* Buy/Sell Input */}
        <div className="px-[24px]">
          {selectedOrderSide === "Buy" ? (
            <BuyInput
              payAmount={payAmount}
              setPayAmount={setPayAmount}
              receiveAmount={receiveAmount}
              setReceiveAmount={setReceiveAmount}
              selectedQuoteAsset={selectedQuoteAsset}
              setSelectedQuoteAsset={setSelectedQuoteAsset}
              setSelectedOrderSide={setSelectedOrderSide}
              olpKey={olpKey}
              olpPrice={olpPrice}
              isDisabled={isDisabled}
            />
          ) : (
            <SellInput
              payAmount={payAmount}
              setPayAmount={setPayAmount}
              receiveAmount={receiveAmount}
              setReceiveAmount={setReceiveAmount}
              selectedQuoteAsset={selectedQuoteAsset}
              setSelectedQuoteAsset={setSelectedQuoteAsset}
              setSelectedOrderSide={setSelectedOrderSide}
              olpKey={olpKey}
              olpPrice={olpPrice}
              isDisabled={isDisabled}
            />
          )}
        </div>

        <div className="px-[24px] text-gray4b50 text-[12px] font-[500] leading-[16px]">
          <p className="relative pl-[12px]">
            <span className="absolute left-0">•</span>
            Purchased OLP will be auto-staked.
          </p>
          <p className="relative pl-[12px]">
            <span className="absolute left-0">•</span>
            You can deposit/withdraw OLP after cooldown period.
          </p>
          <p className="relative pl-[12px]">
            <span className="absolute left-0">•</span>
            Your deposit/withdrawal order is queued and will be executed in the
            next round.
          </p>
        </div>
      </div>

      <div className="w-[336px] h-[1px] bg-black2023 mx-[24px] my-[6px]" />

      {/* Fee 및 디테일 영역 */}
      <div className="flex flex-row items-center justify-end px-[24px]">
        <p className="text-gray8c8c text-[12px] font-[500] leading-[20px]">
          Fee{" "}
          <span className="font-[600]">
            {advancedFormatNumber(fee, 2, "", true)}%
          </span>
        </p>
      </div>
    </div>
  );
};

export default OLP;
