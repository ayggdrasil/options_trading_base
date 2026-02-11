import BigNumber from "bignumber.js";
import { twJoin } from "tailwind-merge";
import { useContext, useEffect, useState } from "react";
import { advancedFormatNumber } from "@/utils/helper";
import { OptionDirection } from "@/utils/types";
import { sendCreateOpenPosition, writeApproveERC20 } from "@/utils/contract";
import { useAccount } from "wagmi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  loadAllowanceForController,
  loadBalance,
} from "@/store/slices/UserSlice";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ZeroAddress } from "ethers";
import {
  ILeadTrader,
  IOptionDetail,
} from "@/interfaces/interfaces.marketSlice";
import { calculateRiskPremiumRate, BaseQuoteAsset, calculateUnderlyingFutures, NetworkQuoteAsset, UnderlyingAsset, VolatilityScore, FuturesAssetIndexMap, RiskFreeRateCollection, SpotAssetIndexMap, convertQuoteAssetToNormalizedSpotAsset, TRADE_FEE_CALCULATION_LIMIT_RATE, FEE_RATES } from "@callput/shared";
import IconArrowDownPay from "@assets/mobile/icon-arrow-down-pay.svg";
import IconWalletWhite from "@assets/mobile/icon-wallet-white.svg";
import IconSlippage from "@assets/mobile/icon-slippage.svg";
import { ModalContext } from "@/components/Common/ModalContext";
import { ModalName } from "@/pages/ZeroDteForMobile";
import { QA_LIST, QA_TICKER_TO_ADDRESS, QA_TICKER_TO_DECIMAL, QA_TICKER_TO_IMG, QA_TICKER_TO_NAME } from "@/networks/assets";
import { getOlpKeyByExpiry } from "@/networks/helpers";
import { CONTRACT_ADDRESSES } from "@/networks/addresses";
import { SupportedChains } from "@callput/shared";
import { NetworkState } from "@/networks/types";
import { getPositionManagerAllowanceForQuoteAsset, getQuoteAssetBalance } from "@/store/selectors/userSelectors";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface MainSelectedZeroDteProps {
  underlyingAsset: UnderlyingAsset;
  expiry: number;
  optionDirection: OptionDirection | null;
  mainOption: IOptionDetail;
  pairedOption: IOptionDetail;
  markPrice: number;
  estimatedPrice: number;
  selectedLeadTrader: ILeadTrader | null;
}

const MainSelectedZeroDte: React.FC<MainSelectedZeroDteProps> = ({
  underlyingAsset,
  expiry,
  optionDirection,
  mainOption,
  pairedOption,
  markPrice,
  estimatedPrice,
  selectedLeadTrader,
}) => {
  const { isShowPreviousModal, modalName, setPreviousModal } =
    useContext(ModalContext);
  const [quoteAsset, setQuoteAsset] = useState<NetworkQuoteAsset<SupportedChains>>(
    BaseQuoteAsset.USDC
  );
  const [quoteAssetAmount, setQuoteAssetAmount] = useState<string>("0");
  const [isQuoteAssetChanged, setIsQuoteAssetChanged] =
    useState<boolean>(false);

  const [minMaxRoi, setMinMaxRoi] = useState<[number, number]>([0, 0]);
  const [executionPrice, setExecutionPrice] = useState<number>(0);
  const [size, setSize] = useState<string>("0");
  const [availableSize, setAvailableSize] = useState<number>(0);
  const [underlyingFutures, setUnderlyingFutures] = useState<number>(0);

  const [slippage, setSlippage] = useState<number>(5);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSendingTransaction, setIsSendingTransaction] =
    useState<boolean>(false);

  const { chain } = useAppSelector(state => state.network) as NetworkState;
  
  const spotAssetIndexMap = useAppSelector((state: any) => state.market.spotAssetIndexMap) as SpotAssetIndexMap;
  const futuresAssetIndexMap = useAppSelector((state: any) => state.market.futuresAssetIndexMap) as FuturesAssetIndexMap;
  const riskFreeRateCollection = useAppSelector((state: any) => state.market.riskFreeRateCollection) as RiskFreeRateCollection;
  const olpStats = useAppSelector((state: any) => state.market.olpStats);
  const volatilityScore = useAppSelector((state: any) => state.market.volatilityScore) as VolatilityScore;

  const underlyingAssetSpotIndex = spotAssetIndexMap[underlyingAsset];
  const underlyingAssetVolatilityScore = volatilityScore[underlyingAsset];

  const dispatch = useAppDispatch();
  const { address, connector, isConnected } = useAccount();

  const quoteAssetBalance = useAppSelector(state => getQuoteAssetBalance(state, quoteAsset));
  const isQuoteAssetApproved = useAppSelector(state => getPositionManagerAllowanceForQuoteAsset(state, quoteAsset, quoteAssetAmount));

  const [showQuoteAssetPopup, setShowQuoteAssetPopup] = useState(false);
  const [showSlippageTolerancePopup, setShowSlippageTolerancePopup] =
    useState(false);

  const slippageValues = [3, 5, 10];

  const [slippageInputValue, setSlippageInputValue] = useState<string>("");

  const [quoteTokenList, setQuoteTokenList] = useState<string[]>([]);

  const isMinMaxROISame = minMaxRoi[0] === minMaxRoi[1]

  useEffect(() => {
    const quoteTokenList = QA_LIST[chain];
    setQuoteTokenList(quoteTokenList);
  }, [chain]);

  // Set initial quoteAssetAmount
  useEffect(() => {
    if (quoteAsset !== BaseQuoteAsset.USDC) setIsQuoteAssetChanged(true);
    if (isQuoteAssetChanged) return setQuoteAssetAmount("0");
    if (mainOption.optionId === "" || pairedOption.optionId === "")
      return setQuoteAssetAmount("0");

    const initialQuoteAssetAmount = Math.min(Number(quoteAssetBalance), 100);
    setQuoteAssetAmount(String(initialQuoteAssetAmount));
  }, [quoteAsset, quoteAssetBalance]);

  useEffect(() => {
    if (mainOption.optionId === "" || pairedOption.optionId === "")
      return setMinMaxRoi([0, 0]);
    if (executionPrice === 0) return setMinMaxRoi([0, 0]);

    let profit = 0;
    let estimatedProfit = 0;

    if (optionDirection === "Call") {
      profit =
        pairedOption.strikePrice - mainOption.strikePrice - executionPrice;
      estimatedProfit = Math.min(
        estimatedPrice - mainOption.strikePrice - executionPrice,
        profit
      );
    } else if (optionDirection === "Put") {
      profit =
        mainOption.strikePrice - pairedOption.strikePrice - executionPrice;
      estimatedProfit = Math.min(
        mainOption.strikePrice - estimatedPrice - executionPrice,
        profit
      );
    }

    const roi = Math.max(
      new BigNumber(profit)
        .dividedBy(executionPrice)
        .multipliedBy(100)
        .toNumber(),
      0
    );
    const estimatedRoi = Math.max(
      new BigNumber(estimatedProfit)
        .dividedBy(executionPrice)
        .multipliedBy(100)
        .toNumber(),
      0
    );

    setMinMaxRoi([estimatedRoi, roi]);
  }, [optionDirection, estimatedPrice, executionPrice]);

  // Calculate size based on quoteAssetAmount
  useEffect(() => {
    if (mainOption.optionId === "" || pairedOption.optionId === "") {
      setExecutionPrice(0);
      setSize("0");
      return;
    }

    const normalizedQuoteAsset = convertQuoteAssetToNormalizedSpotAsset(quoteAsset, false);

    if (!normalizedQuoteAsset) return;

    const quoteAssetSpotPrice = spotAssetIndexMap[normalizedQuoteAsset];
    const quoteAssetValue = new BigNumber(quoteAssetAmount)
      .multipliedBy(quoteAssetSpotPrice)
      .toNumber();

    // Estimate Size
    const firstEstimatedSize =
      markPrice === 0 ? 0 : quoteAssetValue / markPrice;
    const firstRiskPremium = handleCalculateRiskPremium(
      markPrice,
      firstEstimatedSize
    );
    const executionPrice = markPrice + firstRiskPremium;
    const secondEstimatedSize =
      executionPrice === 0 ? 0 : quoteAssetValue / executionPrice;

    // Calculate Trade Fee
    const tradeFeeRate = FEE_RATES.OPEN_COMBO_POSITION;
    const tradeFeeUsd = new BigNumber(underlyingAssetSpotIndex)
      .multipliedBy(secondEstimatedSize)
      .multipliedBy(tradeFeeRate)
      .toNumber();
    const maxTradeFeeUsd = new BigNumber(quoteAssetValue)
      .multipliedBy(TRADE_FEE_CALCULATION_LIMIT_RATE)
      .toNumber();
    const tradeFeeUsdAfterMax =
      tradeFeeUsd > maxTradeFeeUsd ? maxTradeFeeUsd : tradeFeeUsd;
    const feeAmount = new BigNumber(tradeFeeUsdAfterMax)
      .dividedBy(quoteAssetSpotPrice)
      .toNumber();
    const quoteAssetAmountAfterFeePaid = new BigNumber(quoteAssetAmount)
      .minus(feeAmount)
      .toNumber();

    // Final Estimated Size
    const finalEstimatedSize = new BigNumber(quoteAssetAmountAfterFeePaid)
      .multipliedBy(quoteAssetSpotPrice)
      .dividedBy(executionPrice)
      .toString();

    setExecutionPrice(executionPrice);
    setSize(finalEstimatedSize);
  }, [quoteAssetAmount, spotAssetIndexMap, markPrice]);

  // Calculate underlyingFutures
  useEffect(() => {
    const underlyingFutures = calculateUnderlyingFutures(
      underlyingAsset,
      expiry,
      futuresAssetIndexMap,
      riskFreeRateCollection
    );
    setUnderlyingFutures(underlyingFutures);
  }, [underlyingAsset, expiry, futuresAssetIndexMap, riskFreeRateCollection]);

  // Calculate available size
  useEffect(() => {
    if (mainOption.optionId === "" || pairedOption.optionId === "")
      return setAvailableSize(0);

    const olpKey = getOlpKeyByExpiry(chain, expiry);
    const olpAssetAmounts = olpStats[olpKey].assetAmounts;

    const usdcAvailableAmount = olpAssetAmounts["usdc"].availableAmount;

    const diffStrikePrice = Math.abs(
      mainOption.strikePrice - pairedOption.strikePrice
    );
    const diffStrikePriceAmounts = new BigNumber(diffStrikePrice)
      .dividedBy(spotAssetIndexMap.usdc)
      .toNumber();
    const availableSize = Math.max(
      new BigNumber(usdcAvailableAmount)
        .dividedBy(diffStrikePriceAmounts)
        .toNumber(),
      0
    );

    setAvailableSize(availableSize);
  }, [
    underlyingAsset,
    expiry,
    mainOption,
    pairedOption,
    spotAssetIndexMap,
    olpStats,
  ]);

  useEffect(() => {
    if (Number(size) > availableSize) {
      setIsError(true);
      setErrorMessage("*Exceeded available size");
      return;
    }

    if (Number(quoteAssetAmount) > Number(quoteAssetBalance)) {
      setIsError(true);
      setErrorMessage("*Insufficient balance");
      return;
    }

    setIsError(false);
    setErrorMessage("");
  }, [size, quoteAssetAmount, availableSize, quoteAssetBalance]);

  useEffect(() => {
    if (isShowPreviousModal && modalName === ModalName.SELECTED_ZERO_DTE) {
      setShowQuoteAssetPopup(false);
      setShowSlippageTolerancePopup(false);
      if (selectedLeadTrader) {
        setPreviousModal(ModalName.SELECTED_COPY_TRADE);
      } else setPreviousModal("");
    }
  }, [isShowPreviousModal]);

  // Calculate risk premium
  const handleCalculateRiskPremium = (
    markPrice: number,
    estimatedSize: number
  ) => {
    const isCall = optionDirection === "Call";

    const olpKey = getOlpKeyByExpiry(chain, expiry);
    const olpGreeks = olpStats[olpKey].greeks[underlyingAsset];
    const olpUtilityRatio = {
      sOlp: {
        utilizedUsd: olpStats.sOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.sOlp.utilityRatio.depositedUsd,
      },
      mOlp: {
        utilizedUsd: olpStats.mOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.mOlp.utilityRatio.depositedUsd,
      },
      lOlp: {
        utilizedUsd: olpStats.lOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.lOlp.utilityRatio.depositedUsd,
      },
    };

    const { RP_rate: rpRateForOpenZeroDte } = calculateRiskPremiumRate({
      underlyingAsset: underlyingAsset,
      expiry: expiry,
      isOpen: true,
      orderSide: "Buy",
      optionDirection: isCall ? "Call" : "Put",
      mainOption: mainOption,
      pairedOption: pairedOption,
      size: estimatedSize,
      underlyingFutures,
      underlyingAssetSpotIndex,
      underlyingAssetVolatilityScore,
      olpKey,
      olpGreeks,
      olpUtilityRatio,
    })

    return markPrice * rpRateForOpenZeroDte;
  };

  const handleApprove = async (
    address: `0x${string}`,
    isQuoteAssetApproved: boolean
  ) => {
    setIsSendingTransaction(true);

    try {
      if (!isQuoteAssetApproved) {
        const tokenAddress = QA_TICKER_TO_ADDRESS[chain][
          quoteAsset as keyof typeof QA_TICKER_TO_ADDRESS[typeof chain]
        ] as `0x${string}`;
        const spender = CONTRACT_ADDRESSES[chain].CONTROLLER;
        await writeApproveERC20(
          tokenAddress,
          spender,
          BigInt(
            new BigNumber(quoteAssetAmount)
              .multipliedBy(1.5)
              .multipliedBy(10 ** QA_TICKER_TO_DECIMAL[chain][quoteAsset as keyof typeof QA_TICKER_TO_DECIMAL[typeof chain]])
              .toFixed(0)
          )
        );
      }
    } catch (error) {
      console.error(error);
    }

    dispatch(
      loadAllowanceForController({ chain, address })
    );

    setIsSendingTransaction(false);
  };

  const handleCreateOpenPosition = async (address: `0x${string}`) => {
    setIsSendingTransaction(true);
    try {
      await sendCreateOpenPosition(
        chain,
        address as string,
        true,
        underlyingAsset,
        expiry,
        "2",
        mainOption,
        pairedOption,
        optionDirection === "Call",
        size,
        slippage,
        quoteAsset as keyof typeof QA_TICKER_TO_ADDRESS[typeof chain],
        quoteAssetAmount,
        String(selectedLeadTrader?.address || ZeroAddress)
      );
    } catch (error) {
      console.error(error);
    }

    dispatch(
      loadBalance({ chain, address })
    );

    setIsSendingTransaction(false);
  };

  const renderButton = () => {
    if (isSendingTransaction)
      return (
        <div
          className={twJoin(
            "flex justify-center items-center",
            "w-full h-10 rounded bg-[linear-gradient(180deg,rgba(216,254,229,0.08)_0%,rgba(192,228,205,0.08)_100%)]",
            "font-bold text-whitef0 opacity-40",
            "text-[14px] leading-[21px] md:text-[16px]"
          )}
        >
          ...
        </div>
      );

    if (!connector || !isConnected)
      return (
        <ConnectButton.Custom>
          {({ account, chain, openConnectModal, mounted }) => {
            const connected = mounted && account && chain;

            return (
              <div
                {...(!mounted && {
                  "aria-hidden": true,
                  style: {
                    opacity: 0,
                    pointerEvents: "none",
                    userSelect: "none",
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <div
                        className={twJoin(
                          "flex justify-center items-center",
                          "w-full h-10 rounded bg-[#E6FC8D]",
                          "font-bold text-black0a",
                          "text-[14px] leading-[21px] md:text-[16px]"
                        )}
                        onClick={openConnectModal}
                      >
                        Connect
                      </div>
                    );
                  }
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      );

    const isDisable =
      !address ||
      size === "0" ||
      quoteAssetAmount === "0" ||
      Date.now() / 1000 >= expiry - 1800;

    if (isDisable || isError) {
      return (
        <div
          className={twJoin(
            "flex justify-center items-center",
            "w-full h-10 rounded bg-[linear-gradient(180deg,rgba(216,254,229,0.08)_0%,rgba(192,228,205,0.08)_100%)]",
            "font-bold text-whitef0 opacity-40",
            "text-[14px] leading-[21px] md:text-[16px]"
          )}
        >
          Buy
        </div>
      );
    }

    if (!isQuoteAssetApproved) {
      return (
        <div
          className={twJoin(
            "flex justify-center items-center",
            "w-full h-10 rounded bg-[#E6FC8D]",
            "font-bold text-black0a",
            "text-[14px] leading-[21px] md:text-[16px]"
          )}
          onClick={() => handleApprove(address, isQuoteAssetApproved)}
        >
          Approve
        </div>
      );
    }

    return (
      <div
        className={twJoin(
          "flex justify-center items-center",
          "w-full h-10 rounded bg-green63",
          "font-bold text-black0a",
          "text-[14px] leading-[21px] md:text-[16px]"
        )}
        onClick={() => handleCreateOpenPosition(address)}
      >
        Buy
      </div>
    );
  };

  const product =
    mainOption.optionId === ""
      ? "-"
      : `${underlyingAsset} ${mainOption.strikePrice} ${optionDirection}`;
  if (showQuoteAssetPopup) {
    return (
      <div className={twJoin("flex flex-col gap-y-[10px] px-[26px]")}>
        {quoteTokenList.map((quoteAsset: any, index) => {
          return (
            <>
              <div
                key={quoteAsset}
                className={twJoin(
                  "flex flex-row gap-x-[6px] items-center py-[9px]"
                )}
                onClick={() => {
                  setQuoteAsset(quoteAsset);
                  setShowQuoteAssetPopup(false);
                  if (selectedLeadTrader) {
                    setPreviousModal(ModalName.SELECTED_COPY_TRADE);
                  } else setPreviousModal("");
                }}
              >
                <div
                  key={quoteAsset}
                  className="flex flex-row gap-x-3 items-center"
                >
                  <img
                    className={twJoin("w-6 h-6 object-cover flex-shrink-0")}
                    src={QA_TICKER_TO_IMG[chain][quoteAsset as keyof typeof QA_TICKER_TO_IMG[typeof chain]]}
                  />
                  <p
                    className={twJoin(
                      "font-semibold text-whitef0",
                      "text-[16px] leading-[24px] md:text-[18px]"
                    )}
                  >
                    {QA_TICKER_TO_NAME[chain][quoteAsset as keyof typeof QA_TICKER_TO_NAME[typeof chain]]}
                  </p>
                </div>
                <p
                  className={twJoin(
                    "font-semibold text-gray9D",
                    "text-[16px] leading-[24px] md:text-[18px]"
                  )}
                >
                  {quoteAsset}
                </p>
              </div>
              {index < quoteTokenList.length - 1 && (
                <div className="w-full h-[1px] flex-shrink-0 opacity-10 bg-[linear-gradient(180deg,#D8FEE5_0%,#C0E4CD_100%)]"></div>
              )}
            </>
          );
        })}
      </div>
    );
  }
  if (showSlippageTolerancePopup) {
    return (
      <div className="flex flex-col px-3 md:px-6">
        <div className="flex flex-col gap-y-5">
          {slippageValues.map((value, index) => (
            <>
              <div
                key={value}
                className={twJoin(
                  "font-semibold text-center text-[16px] leading-[24px] md:text-[18px]",
                  slippage === value ? "text-[#E6FC8D]" : "text-[#F0EBE5]"
                )}
                onClick={() => {
                  setSlippageInputValue("");
                  setSlippage(value);
                  setShowSlippageTolerancePopup(false);
                  if (selectedLeadTrader) {
                    setPreviousModal(ModalName.SELECTED_COPY_TRADE);
                  } else setPreviousModal("");
                }}
              >
                {value} %
              </div>
              {index < slippageValues.length - 1 && (
                <div className="w-full h-[1px] flex-shrink-0 opacity-10 bg-[linear-gradient(180deg,#D8FEE5_0%,#C0E4CD_100%)]"></div>
              )}
            </>
          ))}
        </div>
        <div className="w-full py-[10px] mt-4 mb-[10px]">
          <div
            className={twJoin(
              "flex flex-row gap-x-2 items-center",
              "w-full h-[42px] px-3 rounded-[6px] bg-[#FFFFFF1A]",
              "border border-solid border-[#FFFFFF4D]",
              "shadow-[0px_8px_12px_0px_#00000005]"
            )}
          >
            <input
              value={slippageInputValue}
              placeholder="Custom"
              className={twJoin(
                "w-[calc(100%-20px)]",
                "text-[14px] md:text-[16px] leading-[21px] text-whitef0 font-medium bg-transparent",
                "focus:outline-none",
                "placeholder:text-[14px] md:placeholder:text-[16px] placeholder-whitef0 placeholder:font-medium"
              )}
              onChange={(e) => {
                if (e.target.value.includes(" ")) return;
                if (isNaN(Number(e.target.value))) return;
                if (e.target.value === "") {
                  setSlippageInputValue("");
                  setSlippage(5);
                  return;
                }

                const targetValue = e.target.value.replace(/^0+(?=\d)/, "");

                if (Number(targetValue) >= 100) {
                  setSlippageInputValue("100");
                  setSlippage(100);
                  return;
                }

                setSlippageInputValue(targetValue);
                setSlippage(Number(targetValue));
              }}
            />
            <p
              className={twJoin(
                "font-medium text-whitef0",
                "text-[14px] leading-[21px] md:text-[16px]"
              )}
            >
              %
            </p>
          </div>
        </div>
        <div
          className={twJoin(
            "flex items-center justify-center",
            "w-full h-10 rounded bg-greene6",
            "font-bold text-black0a",
            "text-[14px] leading-[21px] md:text-[16px]"
          )}
          onClick={() => {
            setShowSlippageTolerancePopup(false);
            if (selectedLeadTrader) {
              setPreviousModal(ModalName.SELECTED_COPY_TRADE);
            } else setPreviousModal("");
          }}
        >
          Save
        </div>
      </div>
    );
  }
  return (
    <div className={twJoin("flex flex-col gap-y-5 flex-1 overflow-auto")}>
      <div className={twJoin("flex flex-col gap-y-5 flex-1 overflow-auto")}>
        <div className={twJoin("flex flex-col gap-y-[2px] px-3 md:px-6")}>
          <p
            className={twJoin(
              "font-bold text-whitef0",
              "text-[16px] leading-[24px] md:text-[18px]"
            )}
          >
            Expected ROI
            <span className="text-green63 ml-1">
              {minMaxRoi[0] >= 1000000000
                ? advancedFormatNumber(minMaxRoi[0] / 1000000000, 1, "") + "B"
                : minMaxRoi[0] >= 1000000
                ? advancedFormatNumber(minMaxRoi[0] / 1000000, 1, "") + "M"
                : minMaxRoi[0] >= 1000
                ? advancedFormatNumber(minMaxRoi[0] / 1000, 1, "") + "K"
                : advancedFormatNumber(minMaxRoi[0], 0, "")}
              % &nbsp;
              {!isMinMaxROISame && (
                <>
                  ~{" "}
                  {minMaxRoi[1] >= 100000
                    ? ""
                    : minMaxRoi[1] >= 1000
                    ? advancedFormatNumber(minMaxRoi[1] / 1000, 1, "") + "K%"
                    : advancedFormatNumber(minMaxRoi[1], 0, "") + "%"}
                </>
              )}
            </span>
          </p>
          <p
            className={twJoin(
              "font-semibold text-gray999",
              "text-[12px] leading-[14px]"
            )}
          >
            Buy {product} :{" "}
            <span>{advancedFormatNumber(executionPrice, 2, "$")}</span>
          </p>
        </div>
        <div className="w-full h-[1px] opacity-10 bg-[linear-gradient(180deg,#D8FEE5_0%,#C0E4CD_100%)] flex-shrink-0" />
        <div className={twJoin("flex flex-col gap-y-5 px-3 md:px-6")}>
          <PaymentInput
            quoteAsset={quoteAsset}
            setShowQuoteAssetPopup={setShowQuoteAssetPopup}
            quoteAssetBalance={quoteAssetBalance}
            quoteAssetAmount={quoteAssetAmount}
            setQuoteAssetAmount={setQuoteAssetAmount}
            setPreviousModal={setPreviousModal}
          />
          <div>
            <div
              className={twJoin(
                "flex flex-col bg-[linear-gradient(149.27deg,rgba(17,22,19,0.5)_3.25%,rgba(3,11,6,0.5)_81.41%)] overflow-hidden",
                "rounded-[8px] border border-solid border-[#1C3023]"
              )}
            >
              <div
                className={twJoin(
                  "flex flex-col gap-y-4 px-3 pt-3 pb-[11px]",
                  "border-b border-solid border-[#1C3023]"
                )}
              >
                <div className="flex flex-row justify-between items-center">
                  <p
                    className={twJoin(
                      "font-semibold text-gray9D text-[12px] leading-[18px] md:text-[14px]"
                    )}
                  >
                    Option Size
                  </p>
                  <p
                    className={twJoin(
                      "font-semibold text-whitef0 text-[14px] leading-[21px] md:text-[16px]"
                    )}
                  >
                    {advancedFormatNumber(Number(size), 2, "", true)}
                  </p>
                </div>
                <div className="flex flex-row justify-between items-center">
                  <p
                    className={twJoin(
                      "font-semibold text-gray9D text-[12px] leading-[18px] md:text-[14px]"
                    )}
                  >
                    Available
                  </p>
                  <p
                    className={twJoin(
                      "font-semibold text-whitef0 text-[14px] leading-[21px] md:text-[16px]"
                    )}
                  >
                    {advancedFormatNumber(availableSize, 2, "", true)}
                  </p>
                </div>
              </div>
              <SlippageInput
                slippage={slippage}
                setShowSlippageTolerancePopup={setShowSlippageTolerancePopup}
                setPreviousModal={setPreviousModal}
              />
            </div>
          </div>
        </div>
      </div>
      <div className={twJoin("flex flex-col gap-y-3 px-3 md:px-6")}>
        {isError && <ErrorMessage message={errorMessage} />}
        {renderButton()}
      </div>
    </div>
  );
};

/*
 *  Payment Input
 */

interface PaymentInputProps {
  quoteAsset: NetworkQuoteAsset<SupportedChains>;
  setShowQuoteAssetPopup: (value: boolean) => void;
  quoteAssetBalance: string;
  quoteAssetAmount: string;
  setQuoteAssetAmount: (value: string) => void;
  setPreviousModal: (value: string) => void;
}

const PaymentInput: React.FC<PaymentInputProps> = ({
  quoteAsset,
  setShowQuoteAssetPopup,
  quoteAssetBalance,
  quoteAssetAmount,
  setQuoteAssetAmount,
  setPreviousModal,
}) => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  
  const buttonValues = [10, 25, 50, 75, 100];

  const handlePercentageClick = (value: number) => {
    const newAmount = new BigNumber(quoteAssetBalance)
      .multipliedBy(value)
      .dividedBy(100)
      .toString();
    setQuoteAssetAmount(newAmount);
  };

  return (
    <div
      className={twJoin(
        "flex flex-col",
        "p-3 rounded-[6px] bg-[#0C1410]",
        "border border-solid border-[#1C3023]"
      )}
    >
      <div className={twJoin("flex flex-row justify-between")}>
        <p
          className={twJoin(
            "font-semibold text-gray9D",
            "text-[14px] leading-[21px] md:text-[16px]"
          )}
        >
          Pay
        </p>
        <div className={twJoin("flex flex-row gap-x-[6px] items-center")}>
          <img
            className="w-[14px] h-[14px] object-cover flex-shrink-0"
            src={IconWalletWhite}
          />
          <p
            className={twJoin(
              "font-semibold text-whitef0",
              "text-[12px] leading-[18px] md:text-[14px]"
            )}
          >
            {advancedFormatNumber(Number(quoteAssetBalance), 4, "")}
          </p>
        </div>
      </div>
      <div
        className={twJoin("flex flex-row justify-between gap-x-1", "mt-4 mb-5")}
      >
        <input
          value={quoteAssetAmount}
          placeholder="0"
          className={twJoin(
            "w-[calc(100%-104px)]",
            "text-[18px] leading-[27px] text-[#C1D182] font-bold bg-transparent",
            "focus:outline-none",
            "placeholder:text-[18px] placeholder-[#C1D182] placeholder:font-bold placeholder:leading-[27px]"
          )}
          onChange={(e) => {
            if (e.target.value.includes(" ")) return;
            if (isNaN(Number(e.target.value))) return;
            if (e.target.value === "") return setQuoteAssetAmount("0");

            setQuoteAssetAmount(e.target.value.replace(/^0+(?=\d)/, ""));
          }}
        />
        <div className="flex flex-row gap-x-1">
          <img
            className="w-[28px] h-[28px] object-cover flex-shrink-0"
            src={QA_TICKER_TO_IMG[chain][quoteAsset as keyof typeof QA_TICKER_TO_IMG[typeof chain]]}
          />
          <div
            className="flex flex-row gap-x-1 items-center"
            onClick={() => {
              setShowQuoteAssetPopup(true);
              setPreviousModal(ModalName.SELECTED_ZERO_DTE);
            }}
          >
            <p
              className={twJoin(
                "font-semibold text-whitef0",
                "text-[16px] leading-[24px] md:text-[16px]"
              )}
            >
              {quoteAsset}
            </p>
            <img
              className="w-[18px] h-[18px] object-cover flex-shrink-0"
              src={IconArrowDownPay}
            />
          </div>
        </div>
      </div>
      <div
        className={twJoin(
          "flex flex-row h-6 bg-[#1F1F1FCC] overflow-hidden",
          "rounded-[3px] border border-solid border-[#5C5C5C]"
        )}
      >
        {buttonValues.map((value, index) => (
          <button
            key={value}
            className={twJoin(
              "flex items-center justify-center w-[25%] h-full",
              "font-normal text-gray9D text-[10px] leading-[15px] md:text-[12px]",
              index !== buttonValues.length - 1
                ? "border-r-[1px] border-r-[#5C5C5C]"
                : ""
            )}
            onClick={() => handlePercentageClick(value)}
          >
            {value === 100 ? "Max" : `${value}%`}
          </button>
        ))}
      </div>
    </div>
  );
};

/*
 *  Error Message
 */

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <p
      className={twJoin(
        "font-semibold text-[#E03F3F]",
        "text-[14px] leading-[21px] md:text-[16px]"
      )}
    >
      {message}
    </p>
  );
};

/*
 *  Slippage Input
 */

interface SlippageInputProps {
  slippage: number;
  setShowSlippageTolerancePopup: (value: boolean) => void;
  setPreviousModal: (value: string) => void;
}

const SlippageInput: React.FC<SlippageInputProps> = ({
  slippage,
  setShowSlippageTolerancePopup,
  setPreviousModal,
}) => {
  return (
    <div
      className="flex flex-row justify-between p-3"
      onClick={() => {
        setShowSlippageTolerancePopup(true);
        setPreviousModal(ModalName.SELECTED_ZERO_DTE);
      }}
    >
      <p
        className={twJoin(
          "font-semibold text-gray9D",
          "text-[12px] leading-[18px] md:text-[14px]"
        )}
      >
        Slippage Tolerance
      </p>
      <div className="flex flex-row items-center gap-x-1">
        <p
          className={twJoin(
            "font-semibold text-gray9D",
            "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
          )}
        >
          {advancedFormatNumber(slippage, 1, "")}%
        </p>
        <img
          className="h-[18px] w-[18px] object-cover flex-shrink-0"
          src={IconSlippage}
        />
      </div>
    </div>
  );
};

export default MainSelectedZeroDte;
