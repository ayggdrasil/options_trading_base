import BigNumber from "bignumber.js";

import { useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadAllowanceForPool, loadBalance } from "@/store/slices/UserSlice";
import { updateOlpQueueItem } from "@/store/slices/OlpQueueSlice";
import { advancedFormatNumber } from "@/utils/helper";
import { OrderSide } from "@/utils/types";
import {
  writeApproveERC20,
  writeSubmitMintAndStakeOlp,
  parseOlpQueueEventFromReceipt,
} from "@/utils/contract";
import { OlpKey } from "@/utils/enums";
import Button from "../Common/Button";
import {
  OLP_INFO,
  OLP_MANAGER_ADDRESSES,
  QA_INFO,
  QA_TICKER_TO_ADDRESS,
  QA_TICKER_TO_DECIMAL,
  REWARD_ROUTER_V2_ADDRESSES,
} from "@/networks/assets";
import {
  BaseQuoteAsset,
  FuturesAssetIndexMap,
  NetworkQuoteAsset,
} from "@callput/shared";
import { SupportedChains } from "@callput/shared";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { NetworkState } from "@/networks/types";
import {
  getOlpBalance,
  getOlpManagerAllowanceForQuoteAsset,
  getQuoteAssetBalance,
} from "@/store/selectors/userSelectors";

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
  const olpAllowanceForQuoteAsset = useAppSelector((state) =>
    getOlpManagerAllowanceForQuoteAsset(state, olpKey, selectedQuoteAsset)
  );

  // 1. OlpManager 대상 Selected Quote Asset Allowance 체크
  const isQuoteAssetApproved =
    selectedQuoteAsset === "ETH"
      ? true
      : new BigNumber(olpAllowanceForQuoteAsset).isGreaterThanOrEqualTo(
        new BigNumber(payAmount || "0")
          .multipliedBy(
            10 **
            QA_TICKER_TO_DECIMAL[chain][
            selectedQuoteAsset as keyof (typeof QA_TICKER_TO_DECIMAL)[typeof chain]
            ]
          )
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

  const handleInputFocus = (inputType: FocusedInput) => {
    setFocusedInput(inputType);
  };

  const getMaxValue = (): string => {
    if (isNaN(Number(quoteAssetBalance))) return "0";
    return quoteAssetBalance;
  };

  // ReceiveAmount(Quote) 기반으로 PayAmount(OLP) 구하는 함수
  const getPayAmount = (receiveAmount: string): string => {
    let payAmount = new BigNumber(0);

    const receiveAmountInUSD = BigNumber(receiveAmount)
      .multipliedBy(BigNumber(olpPrice).dividedBy(10 ** 30))

    if (selectedQuoteAsset === "ETH") {
      payAmount = BigNumber(receiveAmountInUSD)
        .dividedBy(futuresAssetIndexMap.eth)
    } else if (selectedQuoteAsset === BaseQuoteAsset.WBTC) {
      payAmount = BigNumber(receiveAmountInUSD)
        .dividedBy(futuresAssetIndexMap.btc)
    } else if (selectedQuoteAsset === BaseQuoteAsset.WETH) {
      payAmount = BigNumber(receiveAmountInUSD)
        .dividedBy(futuresAssetIndexMap.eth)
    } else if (selectedQuoteAsset === BaseQuoteAsset.USDC) {
      payAmount = receiveAmountInUSD;
    }

    if (isNaN(Number(payAmount))) return "0";
    return payAmount.toFixed(QA_TICKER_TO_DECIMAL[chain][selectedQuoteAsset as keyof (typeof QA_TICKER_TO_DECIMAL)[typeof chain]]);
  };

  // PayAmount(OLP) 기반으로 ReceiveAmount(Quote) 구하는 함수
  const getReceiveAmount = (payAmount: string): string => {
    let receiveAmount = new BigNumber(0);
    let payAmountInUSD = new BigNumber(0);

    if (selectedQuoteAsset === "ETH") {
      payAmountInUSD = BigNumber(payAmount)
        .multipliedBy(BigNumber(futuresAssetIndexMap.eth));
    } else if (selectedQuoteAsset === BaseQuoteAsset.WBTC) {
      payAmountInUSD = BigNumber(payAmount)
        .multipliedBy(BigNumber(futuresAssetIndexMap.btc));
    } else if (selectedQuoteAsset === BaseQuoteAsset.WETH) {
      payAmountInUSD = BigNumber(payAmount)
        .multipliedBy(BigNumber(futuresAssetIndexMap.eth));
    } else if (selectedQuoteAsset === BaseQuoteAsset.USDC) {
      payAmountInUSD = BigNumber(payAmount);
    }

    receiveAmount = BigNumber(payAmountInUSD)
      .dividedBy(BigNumber(olpPrice).dividedBy(10 ** 30))

    if (isNaN(Number(receiveAmount))) return "0";
    return receiveAmount.toFixed(18);
  };

  const handleApproveForQuoteAsset = async () => {
    if (selectedQuoteAsset === "ETH") return;

    setIsButtonLoading(true);

    const tokenAddress = QA_TICKER_TO_ADDRESS[chain][
      selectedQuoteAsset as keyof (typeof QA_TICKER_TO_ADDRESS)[typeof chain]
    ] as `0x${string}`;
    const spenderAddress = REWARD_ROUTER_V2_ADDRESSES[chain][
      olpKey
    ] as `0x${string}`;
    const result = await writeApproveERC20(
      tokenAddress,
      spenderAddress,
      BigInt(
        new BigNumber(payAmount || "0")
          .multipliedBy(1.5)
          .multipliedBy(
            10 **
            QA_TICKER_TO_DECIMAL[chain][
            selectedQuoteAsset as keyof (typeof QA_TICKER_TO_DECIMAL)[typeof chain]
            ]
          )
          .toFixed(0)
      )
    );

    if (result && address) {
      dispatch(loadAllowanceForPool({ chain, address }));
      dispatch(loadBalance({ chain, address }));
    }

    setIsButtonLoading(false);
  };

  const handleSubmitMintAndStakeOlp = async () => {
    setIsButtonLoading(true);

    const isNative = selectedQuoteAsset === "ETH";

    // submitMintAndStakeOlp(address _token, uint256 _amount, address payable _receiver, bool _isNative)
    const args = [
      isNative
        ? QA_TICKER_TO_ADDRESS[chain]["WETH"]
        : QA_TICKER_TO_ADDRESS[chain][
        selectedQuoteAsset as keyof (typeof QA_TICKER_TO_ADDRESS)[typeof chain]
        ], // _token
      new BigNumber(payAmount)
        .multipliedBy(
          10 **
          QA_TICKER_TO_DECIMAL[chain][
          (isNative ? "ETH" : selectedQuoteAsset) as keyof (typeof QA_TICKER_TO_DECIMAL)[typeof chain]
          ]
        )
        .toFixed(0), // _amount
      new BigNumber(0).multipliedBy(10 ** 18).toFixed(0), // _minOut
      address, // _receiver
      isNative, // _isNative
    ];

    const receipt = await writeSubmitMintAndStakeOlp(
      olpKey,
      args,
      chain,
      isNative ? payAmount : "0"
    );

    if (receipt && address) {
      // Parse event from receipt and update OlpQueueSlice
      const eventData = parseOlpQueueEventFromReceipt(
        receipt,
        olpKey,
        chain,
        "EnqueuedMintAndStake"
      );

      if (eventData) {
        dispatch(
          updateOlpQueueItem({
            queueIndex: eventData.queueIndex,
            olpQueueAddress: eventData.olpQueueAddress,
            type: "deposit",
            status: "add",
            item: eventData,
          })
        );
      }

      dispatch(loadBalance({ chain, address }));
      dispatch(loadAllowanceForPool({ chain, address }));
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

    // Approve Check
    if (!isQuoteAssetApproved)
      return (
        <Button
          name={`Approve ${selectedQuoteAsset}`}
          color="default"
          onClick={handleApproveForQuoteAsset}
        />
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
      <Button
        name={buttonName}
        color="green"
        isError={isButtonError}
        disabled={isButtonDisabled}
        onClick={handleSubmitMintAndStakeOlp}
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
              <p className="text-gray8c8c text-[12px] font-[500] leading-[16px]">
                {advancedFormatNumber(Number(quoteAssetBalance), 2, "")}
              </p>
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
                  // 업데이트 된 PayAmount로 ReceiveAmount 업데이트
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

        {/* You Receive Input */}
        <div className="w-full h-fit flex flex-col gap-[12px]">
          <div className="h-[24px] flex flex-row justify-between items-center">
            <p className="text-gray8c8c text-[14px] font-[600] leading-[16px]">
              You Receive
            </p>
            <div className="flex flex-row items-center justify-end gap-[6px]">
              <p className="text-gray8c8c text-[12px] font-[500] leading-[16px]">
                {advancedFormatNumber(Number(olpBalance), 2, "")}
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

                // 업데이트 된 ReceiveAmount로 PayAmount 업데이트
                const payAmount = getPayAmount(
                  e.target.value.replace(/^0+(?=\d)/, "")
                );
                setPayAmount(payAmount);
              }}
              onFocus={() => handleInputFocus("receive")}
            />
            <div className="flex flex-row items-center gap-[6px] px-[8px]">
              <p className="text-gray4b50 text-[14px] font-[600] leading-[28px]">
                {OLP_INFO[chain][olpKey].symbol}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Buy Button */}
      <div className="w-full h-[48px]">{renderButton()}</div>
    </div>
  );
};

export default BuyInput;
