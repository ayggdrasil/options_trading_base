import BigNumber from "bignumber.js";
import { useContext, useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import { advancedFormatNumber } from "@/utils/helper";
import {
  writeUnstakeAndRedeemOlp,
  writeUnstakeAndRedeemOlpNAT,
} from "@/utils/contract";
import {
  loadBalance,
} from "@/store/slices/UserSlice";
import { OrderSide } from "@/utils/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { OlpKey } from "@/utils/enums";

import IconWalletGray from "@assets/icon-input-wallet-gray.svg";
import IconArrowDownRed from "@assets/icon-arrow-down-red.svg";
import IconArrowCooldown from "@assets/icon-arrow-cooldown.svg";
import IconWalletWhite from "@assets/mobile/icon-wallet-white.svg";
import IconArrowDownPay from "@assets/mobile/icon-arrow-down-pay.svg";
import { ModalContext } from "@/components/Common/ModalContext";
import { OLP_INFO, QA_INFO, QA_LIST, QA_TICKER_TO_ADDRESS, QA_TICKER_TO_IMG, QA_TICKER_TO_NAME } from "@/networks/assets";
import { BaseQuoteAsset, convertQuoteAssetToNormalizedSpotAsset, FuturesAssetIndexMap, NetworkQuoteAsset, SpotAssetIndexMap } from "@callput/shared";
import { SupportedChains } from "@callput/shared";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { NetworkState } from "@/networks/types";
import { getCooldownTimestampInSec, getOlpBalance, getQuoteAssetBalance } from "@/store/selectors/userSelectors";

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
  isDeprecated: boolean;
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
  isDeprecated,
}) => {
  const dispatch = useAppDispatch();
  const { openModal, closeModal } = useContext(ModalContext);
  const { address, connector, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  if (QA_INFO[chain][selectedQuoteAsset as keyof typeof QA_INFO[typeof chain]] === undefined) {
    setSelectedQuoteAsset(NetworkQuoteAsset[chain].USDC);
  }
  
  const futuresAssetIndexMap = useAppSelector((state: any) => state.market.futuresAssetIndexMap) as FuturesAssetIndexMap;
  const spotAssetIndexMap = useAppSelector((state: any) => state.market.spotAssetIndexMap) as SpotAssetIndexMap;
  const olpStats = useAppSelector((state: any) => state.market.olpStats);

  const inputRef = useRef<HTMLInputElement>(null);

  const [focusedInput, setFocusedInput] = useState<FocusedInput>("pay");
  const [isButtonLoading, setIsButtonLoading] = useState<boolean>(false);

  const quoteAssetBalance = useAppSelector(state => getQuoteAssetBalance(state, selectedQuoteAsset));
  const olpBalance = useAppSelector(state => getOlpBalance(state, olpKey));
  
  const cooldownTimestampInSec = useAppSelector(state => getCooldownTimestampInSec(state, olpKey));
  
  const isAbleToSell = new BigNumber(
    Math.floor(Date.now() / 1000)
  ).isGreaterThan(cooldownTimestampInSec);

  // availableOlpToSell 관련 state 및 useEffect
  const [availableOlpToSell, setAvailableOlpToSell] = useState<string>("0");
  const [isAvailableOlpToSellEnough, setIsAvailableOlpToSellEnough] =
    useState<boolean>(true);

  const [quoteTokenList, setQuoteTokenList] = useState<string[]>([]);

  useEffect(() => {
    const quoteTokenList = QA_LIST[chain];
    setQuoteTokenList(quoteTokenList);
  }, [chain]);

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
          : selectedQuoteAsset === "HONEY"
            ? olpAssetAmounts.honey.availableAmount
            : "0";

    const normalizedQuoteAsset = convertQuoteAssetToNormalizedSpotAsset(selectedQuoteAsset, false);

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
    let payAmount = "0";
    let receiveAmountInUSD = 0;

    if (selectedQuoteAsset === "ETH") {
      receiveAmountInUSD =
        Number(receiveAmount) * Number(futuresAssetIndexMap.eth);
    } else if (selectedQuoteAsset === BaseQuoteAsset.WBTC) {
      receiveAmountInUSD =
        Number(receiveAmount) * Number(futuresAssetIndexMap.btc);
    } else if (selectedQuoteAsset === BaseQuoteAsset.WETH) {
      receiveAmountInUSD =
        Number(receiveAmount) * Number(futuresAssetIndexMap.eth);
    } else if (selectedQuoteAsset === BaseQuoteAsset.USDC) {
      receiveAmountInUSD = Number(receiveAmount);
    } else if (selectedQuoteAsset === "HONEY") {
      receiveAmountInUSD = Number(receiveAmount);
    }

    payAmount = BigNumber(receiveAmountInUSD)
      .div(BigNumber(olpPrice).div(10 ** 30))
      .toString();

    if (isNaN(Number(payAmount))) return "0";
    return payAmount;
  };

  // PayAmount(Quote) 기반으로 ReceiveAmount(OLP) 구하는 함수
  const getReceiveAmount = (payAmount: string): string => {
    let receiveAmount = "0";

    const payAmountInUSD = BigNumber(payAmount)
      .multipliedBy(BigNumber(olpPrice).dividedBy(10 ** 30))
      .toString();

    if (selectedQuoteAsset === "ETH") {
      receiveAmount = BigNumber(payAmountInUSD)
        .div(futuresAssetIndexMap.eth)
        .toString();
    } else if (selectedQuoteAsset === BaseQuoteAsset.WBTC) {
      receiveAmount = BigNumber(payAmountInUSD)
        .div(futuresAssetIndexMap.btc)
        .toString();
    } else if (selectedQuoteAsset === BaseQuoteAsset.WETH) {
      receiveAmount = BigNumber(payAmountInUSD)
        .div(futuresAssetIndexMap.eth)
        .toString();
    } else if (selectedQuoteAsset === BaseQuoteAsset.USDC) {
      receiveAmount = payAmountInUSD.toString();
    } else if (selectedQuoteAsset === "HONEY") {
      receiveAmount = payAmountInUSD.toString();
    }

    if (isNaN(Number(receiveAmount))) return "0";
    return receiveAmount;
  };

  const handleUnstakeAndRedeemOlp = async () => {
    setIsButtonLoading(true);

    let result;

    if (selectedQuoteAsset === "ETH") {
      const args = [
        new BigNumber(payAmount).multipliedBy(10 ** 18).toFixed(0),
        0,
        address,
      ];

      result = await writeUnstakeAndRedeemOlpNAT(olpKey, args, chain);
    } else {
      const args = [
        QA_TICKER_TO_ADDRESS[chain][selectedQuoteAsset as keyof typeof QA_TICKER_TO_ADDRESS[typeof chain]],
        new BigNumber(payAmount).multipliedBy(10 ** 18).toFixed(0),
        0,
        address,
      ];

      result = await writeUnstakeAndRedeemOlp(olpKey, args, chain);
    }

    if (result && address) {
      dispatch(
        loadBalance({ chain, address })
      );
    }

    setPayAmount("");
    setReceiveAmount("");
    setIsButtonLoading(false);
  };

  const renderButton = () => {
    if (isDisabled)
      return (
        <div
          className={twJoin(
            "flex justify-center items-center",
            "w-full h-10 rounded bg-[linear-gradient(180deg,rgba(216,254,229,0.08)_0%,rgba(192,228,205,0.08)_100%)]",
            "font-bold text-whitef0 opacity-40",
            "text-[14px] leading-[21px] md:text-[16px]"
          )}
        >
          Coming Soon
        </div>
      );

    if (isButtonLoading)
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
        <div
          className={twJoin(
            "flex justify-center items-center",
            "w-full h-10 rounded bg-[#E6FC8D1A]",
            "font-bold text-greene6",
            "text-[14px] leading-[21px] md:text-[16px]"
          )}
          onClick={() => {
            if (openConnectModal) openConnectModal();
          }}
        >
          Connect Wallet
        </div>
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
        buttonName = `Insufficient ${olpKey} balance`;
      } else if (isExceedAvailalbeOlpToSell || isNotCooldowned) {
        buttonName = "Exceed max available quanitity";
      }
    } else if (!payAmount || BigNumber(payAmount).isLessThanOrEqualTo(0)) {
      buttonName = "Enter amount to sell";
    }

    return (
      <div
        className={twJoin(
          "flex justify-center items-center",
          "w-full h-10 rounded font-bold",
          "text-[14px] leading-[21px] md:text-[16px]",
          isButtonError
            ? "text-redE0 bg-[#E03F3F1A]"
            : isButtonDisabled 
              ? "text-whitef0 opacity-40 bg-[linear-gradient(180deg,rgba(216,254,229,0.08)_0%,rgba(192,228,205,0.08)_100%)]"
              : "text-[#0a120d] bg-[#e03f3f]"
        )}
        onClick={() => {
          if (!isButtonDisabled && !isButtonError) {
            handleUnstakeAndRedeemOlp();
          }
        }}
      >
        {buttonName}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-y-5">
      <div className={twJoin("flex flex-col")}>
        <div
          className={twJoin(
            "flex flex-col gap-y-4 p-3",
            "rounded-[6px] bg-[#0C1410] border border-solid border-[#1C3023]"
          )}
        >
          <div className={twJoin("flex flex-row justify-between items-center")}>
            <p
              className={twJoin(
                "font-semibold text-gray9D",
                "text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]"
              )}
            >
              Pay
            </p>
            <div className={twJoin("flex flex-row gap-x-[6px] items-center")}>
              <img
                className="w-[14px] h-[14px] object-cover"
                src={IconWalletWhite}
              />
              {!isAbleToSell ? ( // isNotCooldowned
                <div className="flex flex-row items-center">
                  <p
                    className={twJoin(
                      "font-semibold text-whitef0",
                      "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                    )}
                  >
                    {advancedFormatNumber(Number(olpBalance), 4, "")}
                  </p>
                  <img
                    className="w-[14px] h-[14px] mx-[4px]"
                    src={IconArrowCooldown}
                  />
                  <p
                    className={twJoin(
                      "font-semibold text-whitef0",
                      "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                    )}
                  >
                    0.0000
                  </p>
                </div>
              ) : !isAvailableOlpToSellEnough ? (
                <div className="flex flex-row items-center">
                  <p
                    className={twJoin(
                      "font-semibold text-whitef0",
                      "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                    )}
                  >
                    {advancedFormatNumber(Number(olpBalance), 4, "")}
                  </p>
                  <img
                    className="w-[14px] h-[14px] mx-[4px]"
                    src={IconArrowCooldown}
                  />
                  <p
                    className={twJoin(
                      "font-semibold text-whitef0",
                      "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                    )}
                  >
                    {advancedFormatNumber(Number(availableOlpToSell), 4, "")}
                  </p>
                </div>
              ) : (
                <p
                  className={twJoin(
                    "font-semibold text-whitef0",
                    "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                  )}
                >
                  {advancedFormatNumber(Number(olpBalance), 4, "")}
                </p>
              )}
              <div
                className={twJoin(
                  "p-[9px] rounded",
                  "border-[0.5px] border-solid border-[#E6FC8D80]",
                  "font-semibold text-greene6",
                  "text-[10px] leading-[7px] md:text-[12px]"
                )}
                onClick={() => {
                  const newValue = getMaxValue();
                  // PayAmount 업데이트
                  setPayAmount(newValue);
                  // 업데이트 된 PayAmount로 ReceiveAmount 업데이트
                  const receiveAmount = getReceiveAmount(newValue);
                  setReceiveAmount(receiveAmount);
                }}
              >
                MAX
              </div>
            </div>
          </div>
          <div className="flex flex-row justify-between items-center">
            <input
              ref={inputRef}
              value={payAmount}
              placeholder="0"
              className={twJoin(
                "w-[calc(100%-52px)] bg-transparent",
                "font-bold text-[#C1D182]",
                "text-[18px] leading-[27px] md:text-[20px] md:leading-[28px]",
                "placeholder:font-bold placeholder-[#C1D182]",
                "placeholder:text-[18px] md:placeholder:text-[20px]",
                "focus:outline-none"
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
            <div>
              <p
                className={twJoin(
                  "font-semibold text-whitef0",
                  "text-[16px] leading-[24px] md:text-[16px]"
                )}
              >
                {OLP_INFO[chain][olpKey].symbol}
              </p>
            </div>
          </div>
        </div>
        <div className="w-full h-5 relative">
          <div
            className={twJoin(
              "absolute top-[-4px] left-1/2 translate-x-[-50%]",
              "flex justify-center items-center",
              "w-[28px] h-[28px] rounded-[18px] bg-[#333333]"
            )}
            onClick={() => {
              if (isDeprecated) return;
              setPayAmount("");
              setReceiveAmount("");
              setSelectedOrderSide("Buy");
            }}
          >
            <img
              className="w-[14px] h-[14px] min-w-[14px] min-h-[14px]"
              src={IconArrowDownRed}
            />
          </div>
        </div>
        <div
          className={twJoin(
            "flex flex-col gap-y-4 p-3",
            "rounded-[6px] bg-[#0C1410] border border-solid border-[#1C3023]"
          )}
        >
          <div className="flex flex-row justify-between items-center">
            <p
              className={twJoin(
                "font-semibold text-gray9D",
                "text-[14px] leading-[21px] md:text-[16px] md:leading-[22px]"
              )}
            >
              Receive
            </p>
            <div className="flex flex-row gap-x-[6px] items-center">
              <img className="w-[14px] h-[14px]" src={IconWalletGray} />
              <p
                className={twJoin(
                  "font-semibold text-gray9D",
                  "text-[12px] leading-[18px] md:text-[14px]"
                )}
              >
                {advancedFormatNumber(Number(quoteAssetBalance), 4, "")}
              </p>
            </div>
          </div>
          <div className="flex flex-row justify-between items-center">
            <input
              ref={inputRef}
              value={receiveAmount}
              placeholder="0"
              className={twJoin(
                "w-[calc(100%-78px)] bg-transparent",
                "font-bold text-[#C1D182]",
                "text-[18px] leading-[27px] md:text-[20px] md:leading-[28px]",
                "placeholder:font-bold placeholder-[#C1D182]",
                "placeholder:text-[18px] md:placeholder:text-[20px]",
                "focus:outline-none"
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
            <div
              className="flex flex-row gap-x-1 items-center"
              onClick={() => {
                openModal(
                  <div
                    className={twJoin("flex flex-col gap-y-[10px] px-[26px]")}
                  >
                    {quoteTokenList.map((quoteAsset: any, index) => {
                      return (
                        <>
                          <div
                            key={quoteAsset}
                            className={twJoin(
                              "flex flex-row gap-x-[6px] items-center py-[9px]"
                            )}
                            onClick={() => {
                              setSelectedQuoteAsset(quoteAsset);
                              closeModal();
                            }}
                          >
                            <div
                              key={quoteAsset}
                              className="flex flex-row gap-x-3 items-center"
                            >
                              <img
                                className={twJoin(
                                  "w-6 h-6 object-cover flex-shrink-0"
                                )}
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
                  </div>,
                  {
                    contentClassName: "flex flex-col min-h-[150px]",
                  }
                );
              }}
            >
              <p
                className={twJoin(
                  "font-semibold text-whitef0",
                  "text-[16px] leading-[24px] md:text-[16px]"
                )}
              >
                {selectedQuoteAsset}
              </p>
              <img
                className="w-[18px] h-[18px] object-cover flex-shrink-0"
                src={IconArrowDownPay}
              />
            </div>
          </div>
        </div>
      </div>
      {renderButton()}
    </div>
  );
};

export default SellInput;
