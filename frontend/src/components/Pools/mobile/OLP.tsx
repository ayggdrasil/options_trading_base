import BigNumber from "bignumber.js";
import { twJoin } from "tailwind-merge";
import { useEffect, useRef, useState } from "react";

import { advancedFormatNumber } from "@/utils/helper";
import { OrderSide } from "@/utils/types";
import { useAppSelector } from "@/store/hooks";
import { OlpKey } from "@/utils/enums";

import PoolAssetRatioTableHead from "./PoolAssetRatioTableHead";
import PoolAssetRatioTableBody from "./PoolAssetRatioTableBody";
import RealTimeGreeksTableHead from "./RealTimeGreeksTableHead";
import RealTimeGreeksTableBody from "./RealTimeGreeksTableBody";
import BuyInput from "./BuyInput";
import SellInput from "./SellInput";

import IconDropdownUp from "@assets/icon-dropdown-up-pool.svg";
import MyOLPV2 from "./MyOLPV2";
import { BaseQuoteAsset, NetworkQuoteAsset, SpotAssetIndexMap } from "@callput/shared";
import { SupportedChains } from "@callput/shared";
import { NetworkState } from "@/networks/types";

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

  const olpStats = useAppSelector((state: any) => state.market.olpStats);
  const olpMetricsData = useAppSelector((state: any) => state.app.olpMetrics);

  const spotAssetIndexMap = useAppSelector((state: any) => state.market.spotAssetIndexMap) as SpotAssetIndexMap;

  const olpApr = useAppSelector((state: any) => state.app.olpApr);
  const feeApr = olpApr[olpKey].feeApr;
  const riskPremiumApr = olpApr[olpKey].riskPremiumApr;

  const [selectedOrderSide, setSelectedOrderSide] = useState<OrderSide>("Buy");
  const [selectedQuoteAsset, setSelectedQuoteAsset] =
    useState<NetworkQuoteAsset<SupportedChains>>(BaseQuoteAsset.USDC);

  const [payAmount, setPayAmount] = useState<string>("");
  const [receiveAmount, setReceiveAmount] = useState<string>("");

  const [detailOpened, setDetailOpened] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);

  const [olpPrice, setOlpPrice] = useState<string>("0");

  const [olpDepositedAssetValue, setOlpDepositedAssetValue] = useState<
    Record<string, string>
  >({});

  const [fee, setFee] = useState<number>(0);

  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOlpPrice(new BigNumber(olpMetricsData[olpKey].price).toString());
    setLoading(false);
  }, [olpMetricsData]);

  useEffect(() => {
    setPayAmount("");
    setReceiveAmount("");
  }, [selectedQuoteAsset, selectedOrderSide]);

  useEffect(() => {
    if (spotAssetIndexMap) {
      const data = {
        wbtc: "0",
        weth: "0",
        usdc: "0",
        honey: "0",
      };

      const olpAssetAmounts = olpStats[olpKey].assetAmounts;

      data.wbtc = new BigNumber(olpAssetAmounts.wbtc.depositedAmount)
        .multipliedBy(spotAssetIndexMap.btc)
        .toString();
      data.weth = new BigNumber(olpAssetAmounts.weth.depositedAmount)
        .multipliedBy(spotAssetIndexMap.eth)
        .toString();
      data.usdc = new BigNumber(olpAssetAmounts.usdc.depositedAmount)
        .multipliedBy(spotAssetIndexMap.usdc)
        .toString();

      setOlpDepositedAssetValue(data);
    }
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
      } else if (selectedQuoteAsset === "HONEY") {
        setFee(Number(olpMetricsData[olpKey].buyUsdgFee?.honey) / 100);
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
      } else if (selectedQuoteAsset === "HONEY") {
        setFee(Number(olpMetricsData[olpKey].sellUsdgFee?.honey) / 100);
      }
    }
  }, [olpMetricsData, selectedQuoteAsset, selectedOrderSide]);

  useEffect(() => {
    if (detailOpened && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth" });
    } else {
      setTimeout(() => {
        window.scrollBy({ top: -1 });
      }, 500);
    }
  }, [detailOpened]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div
      className={twJoin(
        "relative pb-[83px]",
        isDisabled ? "flex-1 overflow-hidden" : ""
      )}
    >
      <div
        className={twJoin(
          isDisabled ? "block" : "hidden",
          "absolute z-10 bg-[#1A1A1AD9] backdrop-blur-[2px]",
          "flex flex-row justify-center items-center w-full h-full"
        )}
      >
        <p
          className={twJoin(
            "font-medium text-whitee0",
            "text-[14px] leading-[18px] md:text-[16]"
          )}
        >
          {olpKey === "sOlp"
            ? "Options LP (OLP)"
            : olpKey === "mOlp"
            ? "Options LP (OLP)"
            : "Options LP (OLP)"}{" "}
          is coming soon.
        </p>
      </div>
      <div className={twJoin("flex flex-col")}>
        <MyOLPV2 olpKey={olpKey} />

        <div
          className={twJoin(
            "flex-shrink-0 h-[1px] w-full my-5 opacity-10",
            "bg-[linear-gradient(180deg,#D8FEE5_0%,#C0E4CD_100%)]"
          )}
        ></div>

        <div className="px-3 md:px-6">
          <div className="flex flex-row bg-[#1A1A19] rounded-[62px]">
            <div
              className={twJoin(
                "flex justify-center items-center",
                "flex-1 h-8 rounded-[62px] font-medium text-[14px] leading-[17px] md:text-[16px]",
                selectedOrderSide === "Buy"
                  ? "text-black0a12 bg-green63"
                  : "text-gray9D"
              )}
              onClick={() => {
                setSelectedOrderSide("Buy");
              }}
            >
              Buy
            </div>
            <div
              className={twJoin(
                "flex justify-center items-center",
                "flex-1 h-8 rounded-[62px] font-medium text-[14px] leading-[17px] md:text-[16px]",
                selectedOrderSide === "Sell"
                  ? "text-black0a12 bg-redE0"
                  : "text-gray9D"
              )}
              onClick={() => {
                setSelectedOrderSide("Sell");
              }}
            >
              Sell
            </div>
          </div>
        </div>

        {/* 가격 및 APR 영역 */}
        <div className="flex flex-row mt-5 px-3 md:px-6">
          <div className="flex flex-col flex-1">
            <p
              className={twJoin(
                "font-semibold text-greene6",
                "text-[12px] leading-[20px] md:text-[14px]"
              )}
            >
              Price
            </p>
            <p
              className={twJoin(
                "font-semibold text-whitef0",
                "text-[18px] leading-[27px] md:text-[20px]"
              )}
            >
              {advancedFormatNumber(
                BigNumber(olpPrice)
                  .dividedBy(10 ** 30)
                  .toNumber(),
                4,
                "$"
              )}
            </p>
          </div>
          <div className="flex flex-col flex-1">
            <p
              className={twJoin(
                "px-[7px] py-[1px] rounded-[3px] bg-[linear-gradient(90deg,#F7931A_0%,#FF581B_100%)]",
                "w-fit font-bold text-black0a",
                "text-[12px] leading-[18px] md:text-[14px]"
              )}
            >
              APR
            </p>
            <p
              className={twJoin(
                "font-semibold text-whitef0",
                "text-[18px] leading-[27px] md:text-[20px]"
              )}
            >
              {advancedFormatNumber((feeApr + riskPremiumApr) * 100, 2, "")}%
            </p>
          </div>
        </div>

        <div className="mt-5 mb-3 px-3 md:px-6">
          {selectedOrderSide === "Buy" ? (
            <div className="relative flex flex-col gap-[16px]">
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
                isDeprecated={false}
              />
            </div>
          ) : (
            <div className="relative flex flex-col gap-[16px]">
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
                isDeprecated={false}
              />
            </div>
          )}
        </div>

        {/* Fee 및 디테일 영역 */}
        <div className="flex flex-col px-3 md:px-6">
          <div
            className={twJoin(
              "flex-shrink-0 h-[1px] w-full opacity-10",
              "bg-[linear-gradient(180deg,#D8FEE5_0%,#C0E4CD_100%)]"
            )}
          ></div>
          <div
            className={twJoin("flex flex-row justify-between py-4")}
            onClick={() => setDetailOpened(!detailOpened)}
          >
            <div
              className={twJoin(
                "flex flex-row gap-x-2",
                "font-semibold text-gray9D",
                "text-[12px] leading-[18px] md:text-[14px]"
              )}
            >
              <p>Fee</p>
              <p>{advancedFormatNumber(fee, 2, "", true)}%</p>
            </div>
            <div className="flex flex-row gap-x-1">
              {!detailOpened ? (
                <>
                  <p
                    className={twJoin(
                      "font-semibold text-gray9D",
                      "text-[12px] leading-[18px] md:text-[14px]"
                    )}
                  >
                    Pool Detail
                  </p>
                  <img
                    className="w-[18px] h-[18px] min-w-[18px] min-h-[18px]"
                    src={IconDropdownUp}
                    onClick={() => setDetailOpened(!detailOpened)}
                  />
                </>
              ) : (
                <>
                  <p
                    className={twJoin(
                      "font-semibold text-gray9D",
                      "text-[12px] leading-[18px] md:text-[14px]"
                    )}
                  >
                    Hide
                  </p>
                  <img
                    className="w-[18px] h-[18px] min-w-[18px] min-h-[18px] rotate-180"
                    src={IconDropdownUp}
                    onClick={() => setDetailOpened(!detailOpened)}
                  />
                </>
              )}
            </div>
          </div>
          {/* 디테일 세부사항 영역 */}
          <div
            ref={detailRef}
            style={{
              maxHeight: detailOpened
                ? `${detailRef.current?.scrollHeight}px`
                : "0px",
            }}
            className={twJoin(
              "flex flex-col gap-y-6 mt-2",
              detailOpened ? "" : "transition-all duration-700 overflow-hidden"
            )}
          >
            {/* Pool Asset Ratio 영역 */}
            <div className="flex flex-col">
              <p
                className={twJoin(
                  "font-semibold text-greene6",
                  "text-[13px] leading-[19px] md:text-[15px]"
                )}
              >
                Pool Composition
              </p>
              <PoolAssetRatioTableHead />
              <PoolAssetRatioTableBody
                olpMetrics={olpMetricsData[olpKey]}
                olpDepositedAssetValue={olpDepositedAssetValue}
                isBuy={selectedOrderSide === "Buy"}
              />
              <div
                className={twJoin(
                  "flex-shrink-0 h-[1px] w-full opacity-10",
                  "bg-[linear-gradient(180deg,#D8FEE5_0%,#C0E4CD_100%)]"
                )}
              ></div>
            </div>
            {/* Real-time Greeks 영역 */}
            <div className="flex flex-col">
              <p
                className={twJoin(
                  "font-semibold text-greene6",
                  "text-[13px] leading-[19px] md:text-[15px]"
                )}
              >
                Real-time Greeks
              </p>
              <RealTimeGreeksTableHead />
              <RealTimeGreeksTableBody olpKey={olpKey} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OLP;
