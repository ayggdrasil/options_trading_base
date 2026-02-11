import BigNumber from "bignumber.js";

import { useContext, useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  loadAllowanceForPool,
  loadBalance,
} from "@/store/slices/UserSlice";
import { advancedFormatNumber } from "@/utils/helper";
import { OrderSide } from "@/utils/types";
import {
  writeApproveERC20,
  writeMintAndStakeOlp,
  writeMintAndStakeOlpNAT,
} from "@/utils/contract";
import { OlpKey } from "@/utils/enums";

import IconWalletGray from "@assets/icon-input-wallet-gray.svg";
import IconArrowDownGreen from "@assets/icon-arrow-down-green.svg";
import IconWalletWhite from "@assets/mobile/icon-wallet-white.svg";
import IconArrowDownPay from "@assets/mobile/icon-arrow-down-pay.svg";
import { ModalContext } from "@/components/Common/ModalContext";
import { OLP_MANAGER_ADDRESSES, QA_LIST, QA_TICKER_TO_IMG, QA_TICKER_TO_NAME, QA_TICKER_TO_ADDRESS, QA_TICKER_TO_DECIMAL, OLP_INFO, QA_INFO } from "@/networks/assets";
import { BaseQuoteAsset, FuturesAssetIndexMap, NetworkQuoteAsset } from "@callput/shared";
import { SupportedChains } from "@callput/shared";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { NetworkState } from "@/networks/types";
import { getOlpBalance, getOlpManagerAllowanceForQuoteAsset, getQuoteAssetBalance } from "@/store/selectors/userSelectors";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

type BuyInputProps = {
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

const BuyInput: React.FC<BuyInputProps> = ({
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
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  if (QA_INFO[chain][selectedQuoteAsset as keyof typeof QA_INFO[typeof chain]] === undefined) {
    setSelectedQuoteAsset(NetworkQuoteAsset[chain].USDC);
  }

  const { openModal, closeModal } = useContext(ModalContext);
  const { address, connector, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const futuresAssetIndexMap = useAppSelector((state: any) => state.market.futuresAssetIndexMap) as FuturesAssetIndexMap;

  const inputRef = useRef<HTMLInputElement>(null);

  const [focusedInput, setFocusedInput] = useState<FocusedInput>("pay");
  const [isButtonLoading, setIsButtonLoading] = useState<boolean>(false);

  const quoteAssetBalance = useAppSelector(state => getQuoteAssetBalance(state, selectedQuoteAsset));
  const olpBalance = useAppSelector(state => getOlpBalance(state, olpKey));
  const olpAllowanceForQuoteAsset = useAppSelector(state => getOlpManagerAllowanceForQuoteAsset(state, olpKey, selectedQuoteAsset));

  // 1. OlpManager 대상 Selected Quote Asset Allowance 체크
  const isQuoteAssetApproved =
    selectedQuoteAsset === "ETH"
      ? true
      : new BigNumber(olpAllowanceForQuoteAsset).isGreaterThanOrEqualTo(
          new BigNumber(payAmount || "0")
            .multipliedBy(10 ** QA_TICKER_TO_DECIMAL[chain][selectedQuoteAsset as keyof typeof QA_TICKER_TO_DECIMAL[typeof chain]])
            .toFixed(0)
        );

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

  const [quoteTokenList, setQuoteTokenList] = useState<string[]>([]);

  useEffect(() => {
    const quoteTokenList = QA_LIST[chain];
    setQuoteTokenList(quoteTokenList);
  }, [chain]);

  const handleInputFocus = (inputType: FocusedInput) => {
    setFocusedInput(inputType);
  };

  const getMaxValue = (): string => {
    if (isNaN(Number(quoteAssetBalance))) return "0";
    return quoteAssetBalance;
  };

  // ReceiveAmount(Quote) 기반으로 PayAmount(OLP) 구하는 함수
  const getPayAmount = (receiveAmount: string): string => {
    let payAmount = "0";

    const receiveAmountInUSD = BigNumber(receiveAmount)
      .multipliedBy(BigNumber(olpPrice).dividedBy(10 ** 30))
      .toString();

    if (selectedQuoteAsset === "ETH") {
      payAmount = BigNumber(receiveAmountInUSD)
        .dividedBy(futuresAssetIndexMap.eth)
        .toString();
    } else if (selectedQuoteAsset === BaseQuoteAsset.WBTC) {
      payAmount = BigNumber(receiveAmountInUSD)
        .dividedBy(futuresAssetIndexMap.btc)
        .toString();
    } else if (selectedQuoteAsset === BaseQuoteAsset.WETH) {
      payAmount = BigNumber(receiveAmountInUSD)
        .dividedBy(futuresAssetIndexMap.eth)
        .toString();
    } else if (selectedQuoteAsset === BaseQuoteAsset.USDC) {
      payAmount = receiveAmountInUSD;
    } else if (selectedQuoteAsset === "HONEY") {
      payAmount = receiveAmountInUSD;
    }

    if (isNaN(Number(payAmount))) return "0";
    return payAmount;
  };

  // PayAmount(OLP) 기반으로 ReceiveAmount(Quote) 구하는 함수
  const getReceiveAmount = (payAmount: string): string => {
    let receiveAmount = "0";
    let payAmountInUSD = 0;

    if (selectedQuoteAsset === "ETH") {
      payAmountInUSD = Number(payAmount) * Number(futuresAssetIndexMap.eth);
    } else if (selectedQuoteAsset === BaseQuoteAsset.WBTC) {
      payAmountInUSD = Number(payAmount) * Number(futuresAssetIndexMap.btc);
    } else if (selectedQuoteAsset === BaseQuoteAsset.WETH) {
      payAmountInUSD = Number(payAmount) * Number(futuresAssetIndexMap.eth);
    } else if (selectedQuoteAsset === BaseQuoteAsset.USDC) {
      payAmountInUSD = Number(payAmount);
    } else if (selectedQuoteAsset === "HONEY") {
      payAmountInUSD = Number(payAmount);
    }

    receiveAmount = BigNumber(payAmountInUSD)
      .dividedBy(BigNumber(olpPrice).dividedBy(10 ** 30))
      .toString();

    if (isNaN(Number(receiveAmount))) return "0";
    return receiveAmount;
  };

  const handleApproveForQuoteAsset = async () => {
    if (selectedQuoteAsset === "ETH") return;

    setIsButtonLoading(true);

    const tokenAddress = QA_TICKER_TO_ADDRESS[chain][
      selectedQuoteAsset as keyof typeof QA_TICKER_TO_ADDRESS[typeof chain]
    ] as `0x${string}`;
    const spenderAddress = OLP_MANAGER_ADDRESSES[chain][
      olpKey as keyof typeof OLP_MANAGER_ADDRESSES[typeof chain]
    ] as `0x${string}`;
    const result = await writeApproveERC20(
      tokenAddress,
      spenderAddress,
      BigInt(
        new BigNumber(payAmount || "0")
          .multipliedBy(1.5)
          .multipliedBy(10 ** QA_TICKER_TO_DECIMAL[chain][selectedQuoteAsset as keyof typeof QA_TICKER_TO_DECIMAL[typeof chain]])
          .toFixed(0)
      )
    );

    if (result) {
      dispatch(
        loadAllowanceForPool({ chain, address })
      );
    }

    setIsButtonLoading(false);
  };

  const handleMintAndStakeOlp = async () => {
    setIsButtonLoading(true);

    let result;

    if (selectedQuoteAsset === "ETH") {
      const args = [0, 0];
      result = await writeMintAndStakeOlpNAT(
        olpKey,
        args,
        payAmount,
        chain
      );
    } else {
      const args = [
        QA_TICKER_TO_ADDRESS[chain][selectedQuoteAsset as keyof typeof QA_TICKER_TO_ADDRESS[typeof chain]],
        new BigNumber(payAmount)
          .multipliedBy(10 ** QA_TICKER_TO_DECIMAL[chain][selectedQuoteAsset as keyof typeof QA_TICKER_TO_DECIMAL[typeof chain]])
          .toFixed(0),
        0,
        0,
      ];

      result = await writeMintAndStakeOlp(olpKey, args, chain);
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

    // Approve Check
    if (!isQuoteAssetApproved)
      return (
        <div
          className={twJoin(
            "flex justify-center items-center",
            "w-full h-10 rounded bg-[#E6FC8D1A]",
            "font-bold text-greene6",
            "text-[14px] leading-[21px] md:text-[16px]"
          )}
          onClick={handleApproveForQuoteAsset}
        >
          {`Approve ${selectedQuoteAsset}`}
        </div>
      );

    let buttonName = `Buy OLP`;

    const isButtonDisabled =
      !address ||
      !payAmount ||
      BigNumber(payAmount).isLessThanOrEqualTo(0) ||
      BigNumber(payAmount).gt(quoteAssetBalance);

    const isInsufficientBalance = BigNumber(payAmount).gt(quoteAssetBalance);
    const isButtonError = isInsufficientBalance;

    if (isButtonError) {
      if (isInsufficientBalance) {
        buttonName = `Insufficient ${selectedQuoteAsset} balance`;
      }
    } else if (!payAmount || BigNumber(payAmount).isLessThanOrEqualTo(0)) {
      buttonName = "Enter amount to buy";
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
              : "text-[#0a120d] bg-green63"
        )}
        onClick={() => {
          if (!isButtonDisabled) handleMintAndStakeOlp();
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
              <p
                className={twJoin(
                  "font-semibold text-whitef0",
                  "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
                )}
              >
                {advancedFormatNumber(Number(quoteAssetBalance), 4, "")}
              </p>
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
          <div className={twJoin("flex flex-row justify-between items-center")}>
            <input
              ref={inputRef}
              value={payAmount}
              placeholder="0"
              className={twJoin(
                "w-[calc(100%-76px)] bg-transparent",
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

                // 업데이트 된 PayAmount로 ReceiveAmount 업데이트
                const receiveAmount = getReceiveAmount(
                  e.target.value.replace(/^0+(?=\d)/, "")
                );

                if (Infinity === Number(receiveAmount)) {
                  setPayAmount("");
                  setReceiveAmount("");
                  return;
                }

                setReceiveAmount(receiveAmount);
              }}
              onFocus={() => handleInputFocus("pay")}
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
              setSelectedOrderSide("Sell");
            }}
          >
            <img
              className="w-[14px] h-[14px] min-w-[14px] min-h-[14px]"
              src={IconArrowDownGreen}
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
                {advancedFormatNumber(Number(olpBalance), 4, "")}
              </p>
            </div>
          </div>
          <div className="flex flex-row justify-between items-center">
            <input
              ref={inputRef}
              value={receiveAmount}
              placeholder="0"
              className={twJoin(
                "w-[calc(100%-50px)] bg-transparent",
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
                // 업데이트 된 ReceiveAmount로 PayAmount 업데이트
                const payAmount = getPayAmount(
                  e.target.value.replace(/^0+(?=\d)/, "")
                );
                setPayAmount(payAmount);
              }}
              onFocus={() => handleInputFocus("receive")}
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
      </div>

      <div className="flex flex-col gap-y-3">
        {renderButton()}
        <div className="flex flex-col">
          <div
            className={twJoin(
              "flex flex-row gap-x-2",
              "font-semibold text-gray80",
              "text-[12px] leading-[18px] md:text-[14px]"
            )}
          >
            <p>•</p>
            <p>Purchased OLP will be auto-staked.</p>
          </div>
          <div
            className={twJoin(
              "flex flex-row gap-x-2",
              "font-semibold text-gray80",
              "text-[12px] leading-[18px] md:text-[14px]"
            )}
          >
            <p>•</p>
            <p>You can unstake & sell OLP after 7 days of cooldown.</p>
          </div>
          <div
            className={twJoin(
              "flex flex-row gap-x-2",
              "font-semibold text-gray80",
              "text-[12px] leading-[18px] md:text-[14px]"
            )}
          >
            <p>•</p>
            <p>Additional purchase of OLP result in resetting cooldown time.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyInput;
