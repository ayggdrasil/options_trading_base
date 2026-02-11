import BigNumber from "bignumber.js";
import { twJoin } from "tailwind-merge";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { advancedFormatNumber } from "@/utils/helper";
import { OptionDirection } from "@/utils/types";
import { sendCreateOpenPosition, writeApproveERC20 } from "@/utils/contract";
import { useAccount } from "wagmi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadAllowanceForController, loadBalance } from "@/store/slices/UserSlice";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ZeroAddress } from "ethers";
import { ILeadTrader, IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import QuoteAssetDropDown from "../Common/QuoteAssetDropDown";
import IconSelectedZeroDteClose from "@assets/icon-selected-zero-dte-close.svg";
import IconSelectedZeroDteWallet from "@assets/icon-selected-zero-dte-wallet.svg";
import IconSelectedZeroDteArrowUp from "@assets/icon-selected-zero-dte-arrow-up.svg";
import IconSelectedZeroDteArrowDown from "@assets/icon-selected-zero-dte-arrow-down.svg";
import IconBack from "@assets/icon-back.svg";
import { NetworkState } from "@/networks/types";
import { getOlpKeyByExpiry } from "@/networks/helpers";
import { QA_TICKER_TO_ADDRESS, QA_TICKER_TO_DECIMAL, QA_TICKER_TO_IMG } from "@/networks/assets";
import { CONTRACT_ADDRESSES } from "@/networks/addresses";
import { BaseQuoteAsset, calculateRiskPremiumRate, calculateUnderlyingFutures, convertQuoteAssetToNormalizedSpotAsset, FEE_RATES, FuturesAssetIndexMap, NetworkQuoteAsset, RiskFreeRateCollection, SpotAssetIndexMap, TRADE_FEE_CALCULATION_LIMIT_RATE, UnderlyingAsset, VolatilityScore } from "@callput/shared";
import { SupportedChains } from "@callput/shared";
import { getPositionManagerAllowanceForQuoteAsset, getQuoteAssetBalance } from "@/store/selectors/userSelectors";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

type InputType = "size" | "payment";

interface MainSelectedZeroDteProps {
  underlyingAsset: UnderlyingAsset;
  expiry: number;
  optionDirection: OptionDirection | null;
  mainOption: IOptionDetail;
  pairedOption: IOptionDetail;
  markPrice: number;
  estimatedPrice: number;
  setEstimatedPrice: Dispatch<SetStateAction<number>>;
  modalXY: [number, number];
  selectedLeadTrader: ILeadTrader | null;
  setIsSelectedZeroDteModalOpen: Dispatch<SetStateAction<boolean>>;
}

const MainSelectedZeroDte: React.FC<MainSelectedZeroDteProps> = ({
  underlyingAsset,
  expiry,
  optionDirection,
  mainOption,
  pairedOption,
  markPrice,
  estimatedPrice,
  setEstimatedPrice,
  modalXY,
  selectedLeadTrader,
  setIsSelectedZeroDteModalOpen
}) => {
  const [quoteAsset, setQuoteAsset] = useState<NetworkQuoteAsset<SupportedChains>>(BaseQuoteAsset.USDC);
  const [quoteAssetAmount, setQuoteAssetAmount] = useState<string>("0"); 
  const [isQuoteAssetChanged, setIsQuoteAssetChanged] = useState<boolean>(false);

  const [minMaxRoi, setMinMaxRoi] = useState<[number, number]>([0, 0]);
  const [executionPrice, setExecutionPrice] = useState<number>(0);
  const [size, setSize] = useState<string>("0");
  const [availableSize, setAvailableSize] = useState<number>(0);
  const [underlyingFutures, setUnderlyingFutures] = useState<number>(0);
  
  const [slippage, setSlippage] = useState<number>(5);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSendingTransaction, setIsSendingTransaction] = useState<boolean>(false);

  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const spotAssetIndexMap = useAppSelector((state: any) => state.market.spotAssetIndexMap) as SpotAssetIndexMap;
  const futuresAssetIndexMap = useAppSelector((state: any) => state.market.futuresAssetIndexMap) as FuturesAssetIndexMap;
  const riskFreeRateCollection = useAppSelector((state: any) => state.market.riskFreeRateCollection) as RiskFreeRateCollection;
  const olpStats = useAppSelector((state: any) => state.market.olpStats)
  const volatilityScore = useAppSelector((state: any) => state.market.volatilityScore) as VolatilityScore;

  const underlyingAssetSpotIndex = spotAssetIndexMap[underlyingAsset];
  const underlyingAssetVolatilityScore = volatilityScore[underlyingAsset];
  
  const dispatch = useAppDispatch();
  const { address, connector, isConnected } = useAccount();
  
  const quoteAssetBalance = useAppSelector(state => getQuoteAssetBalance(state, quoteAsset));
  const isQuoteAssetApproved = useAppSelector(state => getPositionManagerAllowanceForQuoteAsset(state, quoteAsset, quoteAssetAmount));

  // Set initial quoteAssetAmount
  useEffect(() => {
    if (quoteAsset !== BaseQuoteAsset.USDC) setIsQuoteAssetChanged(true);
    if (isQuoteAssetChanged) return setQuoteAssetAmount("0");
    if (mainOption.optionId === "" || pairedOption.optionId === "") return setQuoteAssetAmount("0");  

    const initialQuoteAssetAmount = Math.min(Number(quoteAssetBalance), 100);
    setQuoteAssetAmount(String(initialQuoteAssetAmount));
  }, [quoteAsset, quoteAssetBalance]);

  useEffect(() => {
    if (mainOption.optionId === "" || pairedOption.optionId === "") return setMinMaxRoi([0, 0]);
    if (executionPrice === 0) return setMinMaxRoi([0, 0]);

    let profit = 0;
    let estimatedProfit = 0;

    if (optionDirection === "Call") {
      profit = (pairedOption.strikePrice - mainOption.strikePrice) - executionPrice;
      estimatedProfit = Math.min((estimatedPrice - mainOption.strikePrice) - executionPrice, profit);
    } else if (optionDirection === "Put") {
      profit = (mainOption.strikePrice - pairedOption.strikePrice) - executionPrice;
      estimatedProfit = Math.min((mainOption.strikePrice - estimatedPrice) - executionPrice, profit);
    }

    const roi = Math.max(new BigNumber(profit).dividedBy(executionPrice).multipliedBy(100).toNumber(), 0);
    const estimatedRoi = Math.max(new BigNumber(estimatedProfit).dividedBy(executionPrice).multipliedBy(100).toNumber(), 0);
    
    setMinMaxRoi([estimatedRoi, roi]);
  }, [optionDirection, estimatedPrice, executionPrice])

  // Calculate size based on quoteAssetAmount
  useEffect(() => {
    if (mainOption.optionId === "" || pairedOption.optionId === "") {
      setExecutionPrice(0);
      setSize("0");
      return
    };  

    const normalizedQuoteAsset = convertQuoteAssetToNormalizedSpotAsset(quoteAsset, false);
    
    if (!normalizedQuoteAsset) return;
    
    const quoteAssetSpotPrice = spotAssetIndexMap[normalizedQuoteAsset];
    const quoteAssetValue = new BigNumber(quoteAssetAmount).multipliedBy(quoteAssetSpotPrice).toNumber();

    // Estimate Size
    const firstEstimatedSize = markPrice === 0 ? 0 : quoteAssetValue / markPrice;
    const firstRiskPremium = handleCalculateRiskPremium(markPrice, firstEstimatedSize);
    const executionPrice = markPrice + firstRiskPremium;
    const secondEstimatedSize = executionPrice === 0 ? 0 : quoteAssetValue / executionPrice;

    // Calculate Trade Fee
    const tradeFeeRate = FEE_RATES.OPEN_COMBO_POSITION;
    const tradeFeeUsd = new BigNumber(underlyingAssetSpotIndex)
      .multipliedBy(secondEstimatedSize)
      .multipliedBy(tradeFeeRate)
      .toNumber()    
    const maxTradeFeeUsd = new BigNumber(quoteAssetValue)
      .multipliedBy(TRADE_FEE_CALCULATION_LIMIT_RATE)
      .toNumber()
    const tradeFeeUsdAfterMax = tradeFeeUsd > maxTradeFeeUsd ? maxTradeFeeUsd : tradeFeeUsd;
    const feeAmount = new BigNumber(tradeFeeUsdAfterMax).dividedBy(quoteAssetSpotPrice).toNumber();
    const quoteAssetAmountAfterFeePaid = new BigNumber(quoteAssetAmount).minus(feeAmount).toNumber();
    
    // Final Estimated Size
    const finalEstimatedSize = new BigNumber(quoteAssetAmountAfterFeePaid)
      .multipliedBy(quoteAssetSpotPrice)
      .dividedBy(executionPrice)
      .toString();

    setExecutionPrice(executionPrice);
    setSize(finalEstimatedSize);
  }, [quoteAssetAmount, spotAssetIndexMap, markPrice])

  // Calculate underlyingFutures
  useEffect(() => {
    const underlyingFutures = calculateUnderlyingFutures(underlyingAsset, expiry, futuresAssetIndexMap, riskFreeRateCollection)
    setUnderlyingFutures(underlyingFutures);
  }, [underlyingAsset, expiry, futuresAssetIndexMap, riskFreeRateCollection])

  // Calculate available size
  useEffect(() => {
    if (mainOption.optionId === "" || pairedOption.optionId === "") return setAvailableSize(0);

    const olpKey = getOlpKeyByExpiry(chain, expiry);
    const olpAssetAmounts = olpStats[olpKey].assetAmounts;

    const savedUsdcAmountForClose = new BigNumber(olpAssetAmounts.usdc.depositedAmount).multipliedBy(0.03).toNumber();
    const parsedOlpUsdcAvailableAmounts = new BigNumber(olpAssetAmounts.usdc.availableAmount).minus(savedUsdcAmountForClose).toNumber();

    const diffStrikePrice = Math.abs(mainOption.strikePrice - pairedOption.strikePrice);
    const diffStrikePriceAmounts = new BigNumber(diffStrikePrice)
      .dividedBy(spotAssetIndexMap.usdc)
      .toNumber();
    const availableSize = Math.max(
        new BigNumber(parsedOlpUsdcAvailableAmounts)
          .dividedBy(diffStrikePriceAmounts)
          .toNumber(),
        0
    );

    setAvailableSize(availableSize);
  }, [underlyingAsset, expiry, mainOption, pairedOption, spotAssetIndexMap, olpStats])

  useEffect(() => {
    if (Number(size) > availableSize) {
      setIsError(true);
      setErrorMessage("Out of stock");
      return;
    }

    if (Number(quoteAssetAmount) > Number(quoteAssetBalance)) {
      setIsError(true);
      setErrorMessage("Insufficient balance");
      return;
    }

    setIsError(false);
    setErrorMessage("");
  }, [size, quoteAssetAmount, availableSize, quoteAssetBalance])

  // Calculate risk premium
  const handleCalculateRiskPremium = (markPrice: number, estimatedSize: number) => {
    const isCall = optionDirection === "Call";

    const olpKey = getOlpKeyByExpiry(chain, expiry);
    const olpGreeks = olpStats[olpKey].greeks[underlyingAsset];  
    const olpUtilityRatio = {
      sOlp: {
        utilizedUsd: olpStats.sOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.sOlp.utilityRatio.depositedUsd
      },
      mOlp: {
        utilizedUsd: olpStats.mOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.mOlp.utilityRatio.depositedUsd
      },
      lOlp: {
        utilizedUsd: olpStats.lOlp.utilityRatio.utilizedUsd,
        depositedUsd: olpStats.lOlp.utilityRatio.depositedUsd
      }
    }

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
  }

  const handleApprove = async (
    address: `0x${string}`,
    isQuoteAssetApproved: boolean,
  ) => {
    setIsSendingTransaction(true);

    try {
      if (!isQuoteAssetApproved) {
        const tokenAddress = QA_TICKER_TO_ADDRESS[chain][quoteAsset as keyof typeof QA_TICKER_TO_ADDRESS[typeof chain]] as `0x${string}`;
        const spender = CONTRACT_ADDRESSES[chain].CONTROLLER;
        await writeApproveERC20(
          tokenAddress,
          spender,
          BigInt(new BigNumber(quoteAssetAmount)
            .multipliedBy(1.5)
            .multipliedBy(10 ** QA_TICKER_TO_DECIMAL[chain][quoteAsset as keyof typeof QA_TICKER_TO_DECIMAL[typeof chain]])
            .toFixed(0))
        );
      }  
    } catch (error) {
      console.error(error);
    }

    dispatch(loadAllowanceForController({ chain, address }))

    setIsSendingTransaction(false);
  }

  const handleCreateOpenPosition = async (
    address: `0x${string}`,
  ) => {
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
      )
    } catch (error) {
      console.error(error);
    }

    dispatch(loadBalance({ chain, address }));

    setIsSendingTransaction(false);
  }

  const renderButton = () => {
    if (isSendingTransaction) return (
      <button
        className={twJoin(
          "w-[96px] h-[32px] rounded-[3px] text-[13px] font-bold",
          "bg-black29 text-gray52"
        )}
        disabled
      >...</button>
    );

    if (!connector || !isConnected) return (
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openConnectModal,
          mounted,
        }) => {
          const connected = mounted && account && chain;

          return (
            <div
              {...(!mounted && {
                'aria-hidden': true,
                'style': {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      className={twJoin(
                        "w-[96px] h-[32px] rounded-[3px] text-[13px] font-bold",
                        "bg-green63 text-[#121212]"
                      )}
                      onClick={openConnectModal}
                      type="button"
                    >
                      Connect
                    </button>
                  );
                }
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    )

    const isDisable = !address || size === "0" || quoteAssetAmount === "0" || (Date.now() / 1000 >= expiry - 1800);

    if (isDisable || isError) {
      return (
        <button
          className={twJoin(
            "w-[96px] h-[32px] rounded-[3px] text-[13px] font-bold",
            "bg-black29 text-gray52"
          )}
          disabled
        >Buy</button>
      )
    }

    if (!isQuoteAssetApproved) {
      return (
        <button
          className={twJoin(
            "w-[96px] h-[32px] rounded-[3px] text-[13px] font-bold",
            "bg-black29 text-[#E6FC8D]"
          )}
          onClick={() => handleApprove(address, isQuoteAssetApproved)}
        >Approve</button>
      )
    }

    return (
      <button
        className={twJoin(
          "w-[96px] h-[32px] rounded-[3px] text-[13px] font-bold",
          isError ? "bg-black29 text-gray52" : "bg-green63 text-[#121212]"
        )}
        disabled={isError}
        onClick={() => handleCreateOpenPosition(address)}
      >Buy</button>)
  }
  
  const product =  mainOption.optionId === "" ? "-" : `${underlyingAsset} ${mainOption.strikePrice} ${optionDirection}`;
  const isCopyTrade = selectedLeadTrader? true : false;
  const modalWith = isCopyTrade ? "w-[236px]" : "w-[216px]";
  const modalTopPadding = isCopyTrade ? " pl-[4px] py-[10px]" : "p-[10px]";

  const isMinMaxROISame = minMaxRoi[0] === minMaxRoi[1]

  return (
    <div
      style={{
        top: `${modalXY[1]}px`,
        left: `${modalXY[0]}px`
      }}
      className={twJoin(
      "absolute z-1",
      "flex flex-col",
      `${modalWith} min-h-[246px]`,
      "bg-black21",
      "border-[1px] border-[#5C5C5C]"
    )}>
      <div
        className="absolute top-0 right-[-26px] cursor-pointer flex flex-row justify-center items-center w-[20px] h-[20px] rounded-[3px] bg-black21 border-[1px] border-[#5C5C5C]"
        onClick={(e) => {
          e.stopPropagation();
          setEstimatedPrice(0)
        }}
      >
        <img className="w-[20px] h-[20px]" src={IconSelectedZeroDteClose} />
      </div>
      <div className={`flex fel-row justify-start items-center h-[55px] ${modalTopPadding} gap-[6px] hover:bg-`}>
        {isCopyTrade && 
        <img 
        className="w-[32px] h-[32px rounded-full hover:bg-black29 active:opacity-50" 
        onClick={() => {
          setIsSelectedZeroDteModalOpen(false)
          setEstimatedPrice(0)
        }}
        src={IconBack} />}
        <div className="flex flex-col gap-[4px]">
          <p className="h-[16px] text-[13px] font-bold">Expected ROI{" "}
              <span className="text-green63">
              {minMaxRoi[0] >= 1000000000
                ? advancedFormatNumber(minMaxRoi[0] / 1000000000, 1, "") + "B"
                : minMaxRoi[0] >= 1000000
                  ? advancedFormatNumber(minMaxRoi[0] / 1000000, 1, "") + "M"
                  : minMaxRoi[0] >= 1000
                    ? advancedFormatNumber(minMaxRoi[0] / 1000, 1, "") + "K"
                    : advancedFormatNumber(minMaxRoi[0], 0, "")}
              % 
              &nbsp;
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
          <p className="h-[13px] text-gray80 text-[11px] font-semibold">Buy {product} : <span>{advancedFormatNumber(executionPrice, 2, "$")}</span></p>
        </div>
      </div>
      <div className="w-full h-[1px] bg-[#5C5C5C]" />
      <div className="flex flex-col gap-[10px] p-[10px]">
        <PaymentInput
          quoteAsset={quoteAsset}
          setQuoteAsset={setQuoteAsset}
          quoteAssetBalance={quoteAssetBalance}
          quoteAssetAmount={quoteAssetAmount}
          setQuoteAssetAmount={setQuoteAssetAmount}
        />
        <div className="flex flex-row justify-between items-center">
          <div className="pl-[4px]">
            <p className="text-[11px] text-[#999] font-semibold">Qty : <span>{advancedFormatNumber(Number(size), 2, "", true)}</span></p>
            <p className="text-[11px] text-[#999] font-semibold">Stock: <span>{advancedFormatNumber(availableSize, 2, "", true)}</span></p>
          </div>
          {renderButton()}
        </div>
        {isError && (
          <ErrorMessage message={errorMessage} /> 
        )}
      </div>
      <div className="w-full h-[1px] bg-[#5C5C5C]" />
      <SlippageInput
        slippage={slippage}
        setSlippage={setSlippage}
      />
    </div>
  );
};





/*
 *  Size Input
 */

interface SizeInputProps {
  size: string;
  setSize: (value: string) => void;
  handleInputFocus: (inputType: InputType) => void;
  handleMouseLeave: () => void;
}

const SizeInput: React.FC<SizeInputProps> = ({
  size,
  setSize,
  handleInputFocus,
  handleMouseLeave
}) => {
  return (
    <div className={twJoin(
      "flex flex-col",
      "w-full h-[60px] mt-[36px] px-[18px] py-[16px]",
      "rounded-[6px] bg-black17"
    )}>
      <div className="flex flex-row justify-center items-center">
        <input
          value={size}
          placeholder="0"
          className={twJoin(
            "w-full",
            "text-[20px] text-greenc1 font-bold bg-transparent",
            "focus:outline-none",
            "placeholder:text-[20px] placeholder-gray80 placeholder:font-bold")}
          onChange={(e) => {
            if (e.target.value.includes(" ")) return;
            if (isNaN(Number(e.target.value))) return;
            if (e.target.value === "") return setSize("0");

            setSize(e.target.value.replace(/^0+(?=\d)/, ''));
          }}
          onFocus={() => handleInputFocus("size")}
          onBlur={handleMouseLeave}
        />
        <div>
          <p className="ml-[16px] text-[16px] text-[#525252] font-semibold">Contracts</p>
        </div>
      </div>
    </div>
  );
}





/*
 *  Payment Input
 */

interface PaymentInputProps {
  quoteAsset: NetworkQuoteAsset<SupportedChains>;
  setQuoteAsset: (value: NetworkQuoteAsset<SupportedChains>) => void;
  quoteAssetBalance: string;
  quoteAssetAmount: string;
  setQuoteAssetAmount: (value: string) => void;
}

const PaymentInput: React.FC<PaymentInputProps> = ({
  quoteAsset,
  setQuoteAsset,
  quoteAssetBalance,
  quoteAssetAmount,
  setQuoteAssetAmount
}) => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  
  const buttonValues = [10, 25, 50, 75, 100];

  const handlePercentageClick = (value: number) => {
    const newAmount = new BigNumber(quoteAssetBalance).multipliedBy(value).dividedBy(100).toString();
    setQuoteAssetAmount(newAmount);
  }

  return (
    <div
      className={twJoin(
        "flex flex-col justify-between",
        "w-full h-[94px] p-[4px]",
        "rounded-[3px] bg-black17"
      )}
    >
      <div className="flex flex-row justify-between items-center px-[6px]">
        <p className="text-[10px] text-gray80 font-semibold">Pay</p>
        <div className="flex flex-row items-center">
          <img className="w-[24px] h-[24px]" src={IconSelectedZeroDteWallet}/>
          <p className="text-[10px] text-gray80 font-semibold">{advancedFormatNumber(Number(quoteAssetBalance), 4, "")}</p>
        </div>
      </div>
      <div className="flex flex-row justify-center items-center pl-[6px]">
        <input
          value={quoteAssetAmount}
          placeholder="0"
          className={twJoin(
            "w-full",
            "text-[13px] text-[#E6FC8D] font-bold bg-transparent",
            "focus:outline-none",
            "placeholder:text-[13px] placeholder-gray80 placeholder:font-bold"
          )}
          onChange={(e) => {
            if (e.target.value.includes(" ")) return;
            if (isNaN(Number(e.target.value))) return;
            if (e.target.value === "") return setQuoteAssetAmount("0");

            setQuoteAssetAmount(e.target.value.replace(/^0+(?=\d)/, ''));
          }}
        />
        <img className="w-[16px] h-[16px] ml-[4px]" src={QA_TICKER_TO_IMG[chain][quoteAsset as keyof typeof QA_TICKER_TO_IMG[typeof chain]]} />
        <QuoteAssetDropDown
          selectedQuoteAsset={quoteAsset}
          setSelectedQuoteAsset={setQuoteAsset}
          scale={"small"}
        />
      </div>
      <div className="flex flex-row justify-between items-center h-[20px] rounded-[3px] border-[1px] border-[#333]">
        {buttonValues.map((value, index) => (
          <button
            key={value}
            className={`w-[38px] h-full text-[10px] text-grayb3 text-center font-semibold ${index !== buttonValues.length - 1 ? 'border-r-[1px] border-r-[#333]' : ''}`}
            onClick={() => handlePercentageClick(value)}
          >
            {value}%
          </button>
        ))}
      </div>
    </div>
  )
}





/*
 *  Error Message
 */

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message
}) => {
  return (
    <div className="flex flex-row justify-center items-center w-full h-[20px] bg-[#473333] rounded-[3px]">
      <p className="text-[10px] text-[#E03F3F] font-semibold">{message}</p>
    </div>
  )
}





/*
 *  Slippage Input
 */

interface SlippageInputProps {
  slippage: number;
  setSlippage: (value: number) => void;
}

const SlippageInput: React.FC<SlippageInputProps> = ({
  slippage,
  setSlippage
}) => {
  const slippageValues = [3, 5, 10];

  const [isSlippageDetailsOpen, setIsSlippageDetailsOpen] = useState<boolean>(false);
  const [slippageInputValue, setSlippageInputValue] = useState<string>("");

  return (
    <div className="flex flex-col w-full h-fit">
      <div
        className="cursor-pointer flex flex-row justify-between items-center px-[10px] py-[7px]"
        onClick={() => setIsSlippageDetailsOpen(!isSlippageDetailsOpen)}
      >
        <p className="text-[10px] text-[#666] font-semibold">Slippage Tolerance</p>
        <div className="flex flex-row justify-end items-center gap-[4px]">
          <p className="text-[10px] text-[#666] font-semibold">{advancedFormatNumber(slippage, 1, "")}%</p>
          {isSlippageDetailsOpen
            ? <img src={IconSelectedZeroDteArrowUp} />
            : <img src={IconSelectedZeroDteArrowDown} />
          }
        </div>
      </div>
      {isSlippageDetailsOpen && (
        <div className="flex flex-row justify-between items-center h-fit px-[10px] pt-[4px] pb-[10px]">
          <div className="flex flex-row justify-between items-center h-[20px] rounded-[3px] border-[1px] border-[#333]">
            {slippageValues.map((value, index) => (
              <button
                key={value}
                className={twJoin(
                  "w-[38px] h-full text-[10px] text-whitee0 text-center font-semibold",
                  slippage === value ? "bg-black29 text-[#E6FC8D]" : ""
                )}
                onClick={() => {
                  setSlippageInputValue("");
                  setSlippage(value)
                }}
              >{value}%</button>
            ))}
          </div>
          <div className="flex flex-row justify-between items-center w-[74px] h-[20px] px-[6px] py-[4px] rounded-[3px] bg-black17">
            <input
              value={slippageInputValue}
              placeholder="Custom"
              className={twJoin(
                "w-full h-full",
                "text-[10px] text-greenc1 font-bold bg-transparent",
                "focus:outline-none",
                "placeholder:text-[10px] placeholder-gray80 placeholder:font-semibold")}
              onChange={(e) => {
                if (e.target.value.includes(" ")) return;
                if (isNaN(Number(e.target.value))) return;
                if (e.target.value === "") {
                  setSlippageInputValue("");
                  setSlippage(5);
                  return;
                }

                const targetValue = e.target.value.replace(/^0+(?=\d)/, '')

                if (Number(targetValue) >= 100) {
                  setSlippageInputValue("100");
                  setSlippage(100);
                  return;
                }

                setSlippageInputValue(targetValue);
                setSlippage(Number(targetValue));
              }}
            />
            <div>
              <p className="ml-[4px] text-[10px] text-[#525252] font-semibold">%</p>
            </div>
            
          </div>
        </div>
      )}
    </div>
  )
}

export default MainSelectedZeroDte;