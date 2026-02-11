import BigNumber from "bignumber.js";
import { useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import { advancedFormatNumber } from "@/utils/helper";
import {
  writeSubmitUnstakeAndRedeemOlp,
  parseOlpQueueEventFromReceipt,
} from "@/utils/contract";
import { loadBalance } from "@/store/slices/UserSlice";
import { updateOlpQueueItem } from "@/store/slices/OlpQueueSlice";
import { OrderSide } from "@/utils/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { CountdownTimer } from "../Common/CountdownTimer";
import { OlpKey } from "@/utils/enums";
import {
  getCooldownTimestampInSec,
  getOlpBalance,
  getQuoteAssetBalance,
} from "@/store/selectors/userSelectors";
import Button from "../Common/Button";

import IconWalletGray from "@assets/icon-input-wallet-gray.svg";
import IconArrowCooldown from "@assets/icon-arrow-cooldown.svg";
import QuoteAssetDropDown from "../Common/QuoteAssetDropDown";
import { OLP_INFO, QA_INFO, QA_TICKER_TO_ADDRESS } from "@/networks/assets";
import {
  BaseQuoteAsset,
  convertQuoteAssetToNormalizedSpotAsset,
  FuturesAssetIndexMap,
  NetworkQuoteAsset,
  QA_TICKER_TO_DECIMAL,
  SpotAssetIndexMap,
} from "@callput/shared";
import { SupportedChains } from "@callput/shared";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { NetworkState } from "@/networks/types";
import DisplayWithTooltip from "../TradingV2/DisplayWithToolTip";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

type SellInputProps = {
  payAmount: string;
  setPayAmount: (value: string) => void;
  receiveAmount: string;
  setReceiveAmount: (value: string) => void;
  selectedQuoteAsset: NetworkQuoteAsset<SupportedChains>;
  setSelectedQuoteAsset: (value: NetworkQuoteAsset<SupportedChains>) => void;
  setSelectedOrderSide: (value: OrderSide) => void;
  olpKey: OlpKey;
  olpPrice: string;
  isDisabled: boolean;
};

type FocusedInput = "pay" | "receive";

const SellInput: React.FC<SellInputProps> = ({
  payAmount,
  setPayAmount,
  receiveAmount,
  setReceiveAmount,
  selectedQuoteAsset,
  setSelectedQuoteAsset,
  setSelectedOrderSide,
  olpKey,
  olpPrice,
  isDisabled,
}) => {
  const dispatch = useAppDispatch();
  const { chain } = useAppSelector((state) => state.network) as NetworkState;

  if (
    QA_INFO[chain][
    selectedQuoteAsset as keyof (typeof QA_INFO)[typeof chain]
    ] === undefined
  ) {
    setSelectedQuoteAsset(NetworkQuoteAsset[chain].USDC);
  }

  const { address, connector, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const futuresAssetIndexMap = useAppSelector(
    (state: any) => state.market.futuresAssetIndexMap
  ) as FuturesAssetIndexMap;
  const spotAssetIndexMap = useAppSelector(
    (state: any) => state.market.spotAssetIndexMap
  ) as SpotAssetIndexMap;
  const olpStats = useAppSelector((state: any) => state.market.olpStats);

  const epochStages = useAppSelector((state: any) => state.app.epochStages);
  const currentEpochStage = epochStages[olpKey]; // 0: REQUEST_SUBMISSION, 1: QUEUE_PROCESSING
  const isSubmissionPhase = currentEpochStage === 0;

  const inputRef = useRef<HTMLInputElement>(null);

  const [focusedInput, setFocusedInput] = useState<FocusedInput>("pay");
  const [isButtonLoading, setIsButtonLoading] = useState<boolean>(false);

  const quoteAssetBalance = useAppSelector((state) =>
    getQuoteAssetBalance(state, selectedQuoteAsset)
  );
  const olpBalance = useAppSelector((state) => getOlpBalance(state, olpKey));

  const cooldownTimestampInSec = useAppSelector((state) =>
    getCooldownTimestampInSec(state, olpKey)
  );

  const isAbleToSell = new BigNumber(
    Math.floor(Date.now() / 1000)
  ).isGreaterThan(cooldownTimestampInSec);

  // availableOlpToSell 관련 state 및 useEffect
  const [availableOlpToSell, setAvailableOlpToSell] = useState<string>("0");
  const [isAvailableOlpToSellEnough, setIsAvailableOlpToSellEnough] =
    useState<boolean>(true);

  useEffect(() => {
    const olpAssetAmounts = olpStats[olpKey].assetAmounts;

    const availableQuoteTokenAmounts =
      selectedQuoteAsset === BaseQuoteAsset.WBTC
        ? olpAssetAmounts.wbtc.availableAmount
        : selectedQuoteAsset === BaseQuoteAsset.WETH ||
          selectedQuoteAsset === "ETH"
          ? olpAssetAmounts.weth.availableAmount
          : selectedQuoteAsset === BaseQuoteAsset.USDC
            ? olpAssetAmounts.usdc.availableAmount
            : "0";

    const normalizedQuoteAsset = convertQuoteAssetToNormalizedSpotAsset(
      selectedQuoteAsset,
      false
    );

    if (!normalizedQuoteAsset) return;

    const availableQuoteTokenValue = new BigNumber(availableQuoteTokenAmounts)
      .multipliedBy(BigNumber(spotAssetIndexMap[normalizedQuoteAsset]))
      .toNumber();

    const parsedOlpPrice = new BigNumber(olpPrice)
      .dividedBy(10 ** 30)
      .toNumber();

    const nextAvailableOlpToSell =
      parsedOlpPrice !== 0
        ? new BigNumber(availableQuoteTokenValue)
          .dividedBy(parsedOlpPrice)
          .toFixed(18)
        : "0";

    setAvailableOlpToSell(nextAvailableOlpToSell);

    if (Number(olpBalance) <= Number(nextAvailableOlpToSell)) {
      setIsAvailableOlpToSellEnough(true);
    } else {
      setIsAvailableOlpToSellEnough(false);
    }
  }, [olpStats, olpBalance, spotAssetIndexMap, selectedQuoteAsset]);

  // 가격 변동에 따른 amount 업데이트 (PayAmount 고정 -> ReceiveAmount 변동)
  useEffect(() => {
    if (focusedInput === "pay") {
      const receiveAmount = getReceiveAmount(payAmount);
      setReceiveAmount(receiveAmount);
    } else if (focusedInput === "receive") {
      const payAmount = getPayAmount(receiveAmount);
      setPayAmount(payAmount);
    }
  }, [futuresAssetIndexMap]);

  const handleInputFocus = (inputType: FocusedInput) => {
    setFocusedInput(inputType);
  };

  const getMaxValue = (): string => {
    if (isNaN(Number(olpBalance))) return "0";

    if (!isAbleToSell) {
      return "0";
    } else if (isAvailableOlpToSellEnough) {
      return olpBalance;
    } else {
      return availableOlpToSell;
    }
  };

  // ReceiveAmount(OLP) 기반으로 PayAmount(Quote) 구하는 함수
  const getPayAmount = (receiveAmount: string): string => {
    let payAmount = new BigNumber(0);
    let receiveAmountInUSD = new BigNumber(0);

    if (selectedQuoteAsset === "ETH") {
      receiveAmountInUSD = BigNumber(receiveAmount)
        .multipliedBy(BigNumber(futuresAssetIndexMap.eth));
    } else if (selectedQuoteAsset === BaseQuoteAsset.WBTC) {
      receiveAmountInUSD = BigNumber(receiveAmount)
        .multipliedBy(BigNumber(futuresAssetIndexMap.btc));
    } else if (selectedQuoteAsset === BaseQuoteAsset.WETH) {
      receiveAmountInUSD = BigNumber(receiveAmount)
        .multipliedBy(BigNumber(futuresAssetIndexMap.eth));
    } else if (selectedQuoteAsset === BaseQuoteAsset.USDC) {
      receiveAmountInUSD = BigNumber(receiveAmount);
    }

    payAmount = BigNumber(receiveAmountInUSD)
      .dividedBy(BigNumber(olpPrice).dividedBy(10 ** 30));

    if (isNaN(Number(payAmount))) return "0";
    return payAmount.toFixed(18);
  };

  // PayAmount(Quote) 기반으로 ReceiveAmount(OLP) 구하는 함수
  const getReceiveAmount = (payAmount: string): string => {
    let receiveAmount = new BigNumber(0);

    const payAmountInUSD = BigNumber(payAmount)
      .multipliedBy(BigNumber(olpPrice).dividedBy(10 ** 30))

    if (selectedQuoteAsset === "ETH") {
      receiveAmount = BigNumber(payAmountInUSD)
        .div(futuresAssetIndexMap.eth)

    } else if (selectedQuoteAsset === BaseQuoteAsset.WBTC) {
      receiveAmount = BigNumber(payAmountInUSD)
        .div(futuresAssetIndexMap.btc)
    } else if (selectedQuoteAsset === BaseQuoteAsset.WETH) {
      receiveAmount = BigNumber(payAmountInUSD)
        .div(futuresAssetIndexMap.eth)
    } else if (selectedQuoteAsset === BaseQuoteAsset.USDC) {
      receiveAmount = payAmountInUSD;
    }

    if (isNaN(Number(receiveAmount))) return "0";
    return receiveAmount.toFixed(QA_TICKER_TO_DECIMAL[chain][selectedQuoteAsset as keyof (typeof QA_TICKER_TO_DECIMAL)[typeof chain]]);
  };

  const handleSubmitUnstakeAndRedeemOlp = async () => {
    setIsButtonLoading(true);

    const isNative = selectedQuoteAsset === "ETH";

    // submitUnstakeAndRedeemOlp(address _tokenOut, uint256 _olpAmount, address _receiver, bool _isNative)
    const args = [
      isNative
        ? QA_TICKER_TO_ADDRESS[chain]["WETH"]
        : QA_TICKER_TO_ADDRESS[chain][
        selectedQuoteAsset as keyof (typeof QA_TICKER_TO_ADDRESS)[typeof chain]
        ], // _tokenOut
      new BigNumber(payAmount).multipliedBy(10 ** 18).toFixed(0), // _olpAmount
      isNative
        ? new BigNumber(0).multipliedBy(10 ** QA_TICKER_TO_DECIMAL[chain]["WETH"]).toFixed(0)
        : new BigNumber(0).multipliedBy(10 ** QA_TICKER_TO_DECIMAL[chain][selectedQuoteAsset as keyof (typeof QA_TICKER_TO_DECIMAL)[typeof chain]]).toFixed(0), // _minOut
      address, // _receiver
      isNative, // _isNative
    ];

    const receipt = await writeSubmitUnstakeAndRedeemOlp(olpKey, args, chain);

    if (receipt && address) {
      // Parse event from receipt and update OlpQueueSlice
      const eventData = parseOlpQueueEventFromReceipt(
        receipt,
        olpKey,
        chain,
        "EnqueuedUnstakeAndRedeem"
      );

      if (eventData) {
        dispatch(
          updateOlpQueueItem({
            queueIndex: eventData.queueIndex,
            olpQueueAddress: eventData.olpQueueAddress,
            type: "withdraw",
            status: "add",
            item: eventData,
          })
        );
      }

      dispatch(loadBalance({ chain, address }));
    }

    setPayAmount("");
    setReceiveAmount("");
    setIsButtonLoading(false);
  };

  const renderButton = () => {
    if (isDisabled)
      return (
        <Button
          name="Coming Soon"
          color="default"
          disabled
          onClick={() => { }}
        />
      );

    if (isButtonLoading)
      return <Button name="..." color="default" disabled onClick={() => { }} />;

    if (!connector || !isConnected)
      return (
        <Button
          name="Connect Wallet"
          color="blue"
          onClick={() => {
            if (openConnectModal) openConnectModal();
          }}
        />
      );

    // Epoch Stage Check - submission phase only
    if (!isSubmissionPhase)
      return (
        <Button
          name="Not in submission phase"
          color="default"
          disabled
          onClick={() => { }}
        />
      );

    let buttonName = `Sell ${OLP_INFO[chain][olpKey].symbol}`;

    const isButtonDisabled =
      !address || !payAmount || BigNumber(payAmount).isLessThanOrEqualTo(0);

    const isInsufficientBalance = BigNumber(payAmount).gt(olpBalance);
    const isExceedAvailalbeOlpToSell =
      BigNumber(payAmount).gt(availableOlpToSell);
    const isNotCooldowned = BigNumber(payAmount).gt(0) && !isAbleToSell;
    const isButtonError =
      isInsufficientBalance || isExceedAvailalbeOlpToSell || isNotCooldowned;

    if (isButtonError) {
      if (isInsufficientBalance) {
        buttonName = `Insufficient OLP balance`;
      } else if (isExceedAvailalbeOlpToSell || isNotCooldowned) {
        buttonName = "Exceed max available quanitity";
      }
    } else if (!payAmount || BigNumber(payAmount).isLessThanOrEqualTo(0)) {
      buttonName = "Enter amount to sell";
    }

    return (
      <Button
        name={buttonName}
        color="red"
        isError={isButtonError}
        disabled={isButtonDisabled}
        onClick={handleSubmitUnstakeAndRedeemOlp}
      />
    );
  };

  return (
    <div className="flex flex-col gap-[24px]">
      <div className="flex flex-col gap-[12px]">
        {/* You Pay Input */}
        <div className="w-full h-fit flex flex-col gap-[12px]">
          <div className="h-[24px] flex flex-row justify-between items-center">
            <p className="text-gray8c8c text-[14px] font-[600] leading-[16px]">
              You Pay
            </p>
            <div className="flex flex-row items-center justify-end gap-[6px]">
              <div className="flex flex-row justify-center items-center">
                {!isAbleToSell ? ( // isNotCooldowned
                  <div className="flex flex-row items-center">
                    <p className="text-gray8c8c text-[12px] font-[500] leading-[16px]">
                      {advancedFormatNumber(Number(olpBalance), 4, "")}
                    </p>
                    <img
                      className="w-[14px] h-[14px]"
                      src={IconArrowCooldown}
                    />
                    <DisplayWithTooltip
                      title="0.0000"
                      tooltipContent={
                        <>
                          <p className="text-[12px] text-gray8c8c leading-[16px]">
                            {`Your ${advancedFormatNumber(Number(olpBalance), 4, "")} ${OLP_INFO[chain][olpKey].symbol} under cooldown.`}
                          </p>
                          <div className="flex flex-row text-[12px] text-green71b8">
                            <p>Remaining&nbsp;</p>
                            <CountdownTimer
                              className="text-[12px] text-green71b8"
                              targetTimestamp={cooldownTimestampInSec}
                              compactFormat={true}
                            />
                          </div>
                        </>
                      }
                      tooltipClassName="w-max"
                      className="w-fit text-whitef2f2 text-[12px] font-[500] leading-[16px]"
                    />
                  </div>
                ) : !isAvailableOlpToSellEnough ? (
                  <div className="flex flex-row items-center">
                    <p className="text-gray8c8c text-[12px] font-[500] leading-[16px]">
                      {advancedFormatNumber(Number(olpBalance), 4, "")}
                    </p>
                    <img
                      className="w-[14px] h-[14px]"
                      src={IconArrowCooldown}
                    />
                    <DisplayWithTooltip
                      title={advancedFormatNumber(
                        Number(availableOlpToSell),
                        4,
                        ""
                      )}
                      tooltipContent={
                        <>
                          <p className="text-[12px] text-gray8c8c leading-[16px]">
                            Your asset is currently locked as collateral.
                          </p>
                          <p className="text-[12px] text-gray8c8c leading-[16px]">
                            Available asset for withdrawal is{" "}
                            <span className="text-green71b8">{`${advancedFormatNumber(Number(availableOlpToSell), 4, "")} ${OLP_INFO[chain][olpKey].symbol}`}</span>
                          </p>
                        </>
                      }
                      tooltipClassName="w-max"
                      className="w-fit text-whitef2f2 text-[12px] font-[500] leading-[16px]"
                    />
                  </div>
                ) : (
                  <p className="text-gray8c8c text-[12px] font-[500] leading-[16px]">
                    {advancedFormatNumber(Number(olpBalance), 4, "")}
                  </p>
                )}
              </div>

              <div
                className={twJoin(
                  "cursor-pointer",
                  "flex flex-row justify-center items-center",
                  "text-blue278e text-[12px] font-[700] leading-[16px]"
                )}
                onClick={() => {
                  const newValue = getMaxValue();
                  // PayAmount 업데이트
                  setPayAmount(newValue);
                  // 업데이트 PayAmount에 따른 ReceiveAmount 업데이트
                  const receiveAmount = getReceiveAmount(newValue);
                  setReceiveAmount(receiveAmount);
                }}
              >
                MAX
              </div>
            </div>
          </div>
          <div
            className={twJoin(
              "flex flex-row justify-center items-center p-[8px] pl-[18px]",
              "rounded-[6px] bg-black181a border-[1px] border-solid border-black2023"
            )}
          >
            <input
              ref={inputRef}
              value={payAmount}
              placeholder="0"
              className={twJoin(
                "w-full",
                "text-whitef2f2 text-[16px] font-[700] leading-[28px] bg-transparent",
                "focus:outline-none",
                "placeholder:text-gray8c8c placeholder:font-[500] placeholder:text-[16px] placeholder:leading-[28px]"
              )}
              onChange={(e) => {
                if (e.target.value.includes(" ")) return;
                if (isNaN(Number(e.target.value))) return;

                if (e.target.value === "") {
                  setPayAmount("");
                  setReceiveAmount("");
                  return;
                }

                // PayAmount 업데이트
                setPayAmount(e.target.value.replace(/^0+(?=\d)/, ""));

                // 업데이트 PayAmount에 따른 ReceiveAmount 업데이트
                const receiveAmount = getReceiveAmount(
                  e.target.value.replace(/^0+(?=\d)/, "")
                );
                setReceiveAmount(receiveAmount);
              }}
              onFocus={() => handleInputFocus("pay")}
            />
            <div className="flex flex-row items-center gap-[6px] px-[8px]">
              <p className="text-gray4b50 text-[14px] font-[600] leading-[28px]">
                {OLP_INFO[chain][olpKey].symbol}
              </p>
            </div>
          </div>
        </div>

        {/* You Receive Input */}
        <div className="w-full h-fit flex flex-col gap-[12px]">
          <div className="h-[24px] flex flex-row justify-between items-center">
            <p className="text-gray8c8c text-[14px] font-[600] leading-[16px]">
              You Receive
            </p>
            <div className="flex flex-row items-center justify-end gap-[6px]">
              <p className="text-gray8c8c text-[12px] font-[500] leading-[16px]">
                {advancedFormatNumber(Number(quoteAssetBalance), 4, "")}
              </p>
            </div>
          </div>
          <div
            className={twJoin(
              "flex flex-row justify-center items-center p-[8px] pl-[18px]",
              "rounded-[6px] bg-black181a border-[1px] border-solid border-black2023"
            )}
          >
            <input
              ref={inputRef}
              value={receiveAmount}
              placeholder="0"
              className={twJoin(
                "w-full",
                "text-whitef2f2 text-[16px] font-[700] leading-[28px] bg-transparent",
                "focus:outline-none",
                "placeholder:text-gray8c8c placeholder:font-[500] placeholder:text-[16px] placeholder:leading-[28px]"
              )}
              onChange={(e) => {
                if (e.target.value.includes(" ")) return;
                if (isNaN(Number(e.target.value))) return;

                if (e.target.value === "") {
                  setPayAmount("");
                  setReceiveAmount("");
                  return;
                }

                // ReceiveAmount 업데이트
                setReceiveAmount(e.target.value.replace(/^0+(?=\d)/, ""));

                // 업데이트 ReceiveAmount에 따른 PayAmount 업데이트
                const payAmount = getPayAmount(
                  e.target.value.replace(/^0+(?=\d)/, "")
                );
                setPayAmount(payAmount);
              }}
              onFocus={() => handleInputFocus("receive")}
            />
            <div className="flex flex-row items-center gap-[6px] px-[8px]">
              <img
                src={
                  QA_INFO[chain][
                    selectedQuoteAsset as keyof (typeof QA_INFO)[typeof chain]
                  ].src
                }
                className="w-[20px] h-[20px] min-w-[20px] min-h-[20px]"
              />
              <p className="text-gray4b50 text-[14px] font-[600] leading-[28px]">
                {selectedQuoteAsset}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sell Button */}
      <div className="w-full h-[48px]">{renderButton()}</div>
    </div>
  );
};

export default SellInput;
