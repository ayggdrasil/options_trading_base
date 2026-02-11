import Button from "@/components/Common/Button";
import { OptionDirection, OptionStrategy, OrderSide } from "@/utils/types";
import { SupportedChains } from "@callput/shared";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { useAccount } from "wagmi";
import { NetworkQuoteAsset, UnderlyingAsset } from "@callput/shared";
import { useAppDispatch } from "@/store/hooks";
import {
  loadAllowanceForController,
  loadBalance,
} from "@/store/slices/UserSlice";
import { BN } from "@/utils/bn";

import {
  QA_TICKER_TO_ADDRESS,
  QA_TICKER_TO_DECIMAL,
  UA_TICKER_TO_MAX_OPEN_SIZE_FOR_SPREAD,
  UA_TICKER_TO_MAX_OPEN_SIZE_FOR_VANILLA,
} from "@/networks/assets";
import { CONTRACT_ADDRESSES } from "@/networks/addresses";
import { sendCreateOpenPosition, writeApproveERC20 } from "@/utils/contract";
import { IOptionDetail } from "@/interfaces/interfaces.marketSlice";
import { zeroAddress } from "viem";
import useQuoteAssetInfo from "@/hooks/useQuoteAssetInfo";
import { NetworkState } from "@/networks/types";
import { useAppSelector } from "@/store/hooks";

interface OptionPreviewTradeButtonProps {
  selectedOption: IOptionDetail;
  underlyingAsset: UnderlyingAsset;
  expiry: number;
  optionDirection: OptionDirection;
  orderSide: OrderSide;
  optionStrategy: OptionStrategy;
  selectedOptionPair: IOptionDetail;
  quoteAsset: NetworkQuoteAsset<SupportedChains>;
  quoteAssetAmountForVanilla: string;
  quoteAssetAmountForSpread: string;
  collateralAssetForVanilla: NetworkQuoteAsset<SupportedChains>;
  collateralAssetForSpread: NetworkQuoteAsset<SupportedChains>;
  collateralAssetAmountForVanilla: string;
  collateralAssetAmountForSpread: string;
  sizeForVanilla: string;
  sizeForSpread: string;
  availableSizeForVanilla: number;
  availableSizeForSpread: number;
  slippage: number;
  handleInitializeInputValues: () => void;
}

function OptionPreviewTradeButton({
  selectedOption,
  underlyingAsset,
  expiry,
  optionDirection,
  orderSide,
  optionStrategy,
  selectedOptionPair,
  quoteAsset,
  quoteAssetAmountForVanilla,
  quoteAssetAmountForSpread,
  collateralAssetForVanilla,
  collateralAssetForSpread,
  collateralAssetAmountForVanilla,
  collateralAssetAmountForSpread,
  sizeForVanilla,
  sizeForSpread,
  availableSizeForVanilla,
  availableSizeForSpread,
  slippage,
  handleInitializeInputValues,
}: OptionPreviewTradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { chain } = useAppSelector((state) => state.network) as NetworkState;
  const { address, connector, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const dispatch = useAppDispatch();

  const { isApproved: isQuoteAssetApproved, balance: quoteAssetBalance } =
    useQuoteAssetInfo(
      quoteAsset,
      orderSide === "Buy"
        ? quoteAssetAmountForVanilla
        : quoteAssetAmountForSpread
    );

  const {
    isApproved: isCollateralAssetForVanillaApproved,
    balance: collateralAssetBalanceForVanilla,
  } = useQuoteAssetInfo(
    collateralAssetForVanilla,
    collateralAssetAmountForVanilla
  );

  const {
    isApproved: isCollateralAssetForSpreadApproved,
    balance: collateralAssetBalanceForSpread,
  } = useQuoteAssetInfo(
    collateralAssetForSpread,
    collateralAssetAmountForSpread
  );

  const handleApproveForQuoteAsset = async (
    quoteAsset: NetworkQuoteAsset<SupportedChains>,
    amount: string
  ) => {
    setIsLoading(true);

    const token = QA_TICKER_TO_ADDRESS[chain][
      quoteAsset as keyof (typeof NetworkQuoteAsset)[typeof chain]
    ] as `0x${string}`;
    const spender = CONTRACT_ADDRESSES[chain].CONTROLLER;
    const amountToApprove = new BN(amount)
      .multipliedBy(1.5)
      .multipliedBy(
        10 **
          QA_TICKER_TO_DECIMAL[chain][
            quoteAsset as keyof (typeof NetworkQuoteAsset)[typeof chain]
          ]
      )
      .toFixed(0);

    const result = await writeApproveERC20(
      token,
      spender,
      BigInt(amountToApprove)
    );

    if (result) {
      dispatch(loadAllowanceForController({ chain, address }));
    }

    setIsLoading(false);
  };

  const handleCreateOpenPosition = async () => {
    setIsLoading(true);

    const result = await sendCreateOpenPosition(
      chain,
      address as string,
      orderSide === "Buy",
      underlyingAsset,
      expiry,
      optionStrategy === "Vanilla" ? "1" : "2",
      selectedOption,
      selectedOptionPair,
      optionDirection === "Call",
      optionStrategy === "Vanilla" ? sizeForVanilla : sizeForSpread,
      slippage,
      orderSide === "Buy"
        ? (quoteAsset as keyof (typeof NetworkQuoteAsset)[typeof chain])
        : ((optionStrategy === "Vanilla"
            ? collateralAssetForVanilla
            : collateralAssetForSpread) as keyof (typeof NetworkQuoteAsset)[typeof chain]),
      orderSide === "Buy"
        ? optionStrategy === "Vanilla"
          ? quoteAssetAmountForVanilla
          : quoteAssetAmountForSpread
        : optionStrategy === "Vanilla"
          ? collateralAssetAmountForVanilla
          : collateralAssetAmountForSpread,
      zeroAddress
    );

    if (result && address) {
      dispatch(loadBalance({ chain, address }));
      handleInitializeInputValues();
    }

    setIsLoading(false);
  };

  if (isLoading) {
    return <LoadingButton />;
  }

  if (!connector || !isConnected) {
    return <ConnectWalletButton onClick={() => openConnectModal?.()} />;
  }

  const { isButtonError, buttonNameForError } = getTradeErrorInfo({
    orderSide,
    optionStrategy,
    underlyingAsset,
    chain,
    sizeForVanilla,
    sizeForSpread,
    availableSizeForVanilla,
    availableSizeForSpread,
    quoteAsset,
    quoteAssetAmountForVanilla,
    quoteAssetAmountForSpread,
    quoteAssetBalance,
    collateralAssetForVanilla,
    collateralAssetForSpread,
    collateralAssetAmountForVanilla,
    collateralAssetAmountForSpread,
    collateralAssetBalanceForVanilla,
    collateralAssetBalanceForSpread,
  });

  if (isButtonError) {
    return (
      <ErrorButton
        name={buttonNameForError}
        onClick={() => {}}
        isError={isButtonError}
      />
    );
  }

  if (orderSide === "Buy" && !isQuoteAssetApproved) {
    return (
      <ApproveButton
        asset={quoteAsset}
        onClick={() =>
          handleApproveForQuoteAsset(
            quoteAsset,
            orderSide === "Buy"
              ? quoteAssetAmountForVanilla
              : quoteAssetAmountForSpread
          )
        }
      />
    );
  }

  if (
    orderSide === "Sell" &&
    optionStrategy === "Vanilla" &&
    !isCollateralAssetForVanillaApproved
  ) {
    return (
      <ApproveButton
        asset={collateralAssetForVanilla}
        onClick={() =>
          handleApproveForQuoteAsset(
            collateralAssetForVanilla,
            collateralAssetAmountForVanilla
          )
        }
      />
    );
  }

  if (
    orderSide === "Sell" &&
    optionStrategy === "Spread" &&
    !isCollateralAssetForSpreadApproved
  ) {
    return (
      <ApproveButton
        asset={collateralAssetForSpread}
        onClick={() =>
          handleApproveForQuoteAsset(
            collateralAssetForSpread,
            collateralAssetAmountForSpread
          )
        }
      />
    );
  }

  if (
    optionStrategy === "Vanilla"
      ? sizeForVanilla === "0"
      : sizeForSpread === "0"
  ) {
    return <EnterAmountButton />;
  }

  if (
    !isTradeAvailable({
      address,
      orderSide,
      size: optionStrategy === "Vanilla" ? sizeForVanilla : sizeForSpread,
      quoteAssetAmount:
        orderSide === "Buy"
          ? quoteAssetAmountForVanilla
          : quoteAssetAmountForSpread,
      collateralAssetAmount:
        orderSide === "Buy"
          ? collateralAssetAmountForVanilla
          : collateralAssetAmountForSpread,
    })
  ) {
    return <TradeUnavailableButton />;
  }

  return (
    <CreateOpenPositionButton
      selectedOption={selectedOption}
      selectedOptionPair={selectedOptionPair}
      optionDirection={optionDirection}
      optionStrategy={optionStrategy}
      orderSide={orderSide}
      slippage={slippage}
      handleCreateOpenPosition={handleCreateOpenPosition}
    />
  );
}

export default OptionPreviewTradeButton;

const ButtonContainer = ({ children }: { children: React.ReactNode }) => (
  <>
    <div className="w-full h-[72px] px-[20px] py-[12px]">{children}</div>
    {/* Divider */}
    <div className="w-full h-fit flex flex-row items-center justify-center px-[20px]">
      <div className="w-full h-[1px] bg-black2023 my-[6px]" />
    </div>
  </>
);

const LoadingButton = () => (
  <ButtonContainer>
    <Button name="..." color="default" disabled onClick={() => {}} />
  </ButtonContainer>
);

const ConnectWalletButton = ({ onClick }: { onClick: () => void }) => (
  <ButtonContainer>
    <Button name="Connect Wallet" color="blue" onClick={onClick} />
  </ButtonContainer>
);

const ApproveButton = ({
  asset,
  onClick,
}: {
  asset: string;
  onClick: () => void;
}) => (
  <ButtonContainer>
    <Button name={`Approve ${asset}`} color="default" onClick={onClick} />
  </ButtonContainer>
);

const EnterAmountButton = () => (
  <ButtonContainer>
    <Button
      name="Enter Amount to Buy"
      color="default"
      disabled={true}
      onClick={() => {}}
    />
  </ButtonContainer>
);

const TradeUnavailableButton = () => (
  <ButtonContainer>
    <Button
      name="Trade Unavailable for Given Size"
      color="default"
      disabled={true}
      onClick={() => {}}
    />
  </ButtonContainer>
);

const ErrorButton = ({
  name,
  onClick,
  isError,
}: {
  name: string;
  onClick: () => void;
  isError: boolean;
}) => (
  <ButtonContainer>
    <Button name={name} color="default" onClick={onClick} isError={isError} />
  </ButtonContainer>
);

const CreateOpenPositionButton = ({
  selectedOption,
  selectedOptionPair,
  optionDirection,
  optionStrategy,
  orderSide,
  slippage,
  handleCreateOpenPosition,
}: {
  selectedOption: IOptionDetail;
  selectedOptionPair: IOptionDetail;
  optionDirection: OptionDirection;
  optionStrategy: OptionStrategy;
  orderSide: OrderSide;
  slippage: number;
  handleCreateOpenPosition: (
    selectedOption: IOptionDetail,
    selectedOptionPair: IOptionDetail,
    optionDirection: OptionDirection,
    optionStrategy: OptionStrategy,
    orderSide: OrderSide,
    slippage: number
  ) => void;
}) => {
  const buttonName = `${orderSide} ${optionDirection} ${optionStrategy === "Spread" ? "Spread" : ""}`;

  return (
    <ButtonContainer>
      <Button
        name={buttonName}
        color={orderSide === "Buy" ? "green" : "red"}
        onClick={() =>
          handleCreateOpenPosition(
            selectedOption,
            selectedOptionPair,
            optionDirection,
            optionStrategy,
            orderSide,
            slippage
          )
        }
      />
    </ButtonContainer>
  );
};

const isTradeAvailable = ({
  address,
  orderSide,
  size,
  quoteAssetAmount,
  collateralAssetAmount,
}: {
  address: string | undefined;
  orderSide: OrderSide;
  size: string;
  quoteAssetAmount: string;
  collateralAssetAmount: string;
}) => {
  if (!address) return false;
  if (BN(size).lte(0)) return false;
  if (orderSide === "Buy" && BN(quoteAssetAmount).lte(0)) return false;
  if (orderSide === "Sell" && BN(collateralAssetAmount).lte(0)) return false;
  return true;
};

const getTradeErrorInfo = ({
  orderSide,
  optionStrategy,
  underlyingAsset,
  chain,
  sizeForVanilla,
  sizeForSpread,
  availableSizeForVanilla,
  availableSizeForSpread,
  quoteAsset,
  quoteAssetAmountForVanilla,
  quoteAssetAmountForSpread,
  quoteAssetBalance,
  collateralAssetForVanilla,
  collateralAssetForSpread,
  collateralAssetAmountForVanilla,
  collateralAssetAmountForSpread,
  collateralAssetBalanceForVanilla,
  collateralAssetBalanceForSpread,
}: {
  orderSide: OrderSide;
  optionStrategy: OptionStrategy;
  underlyingAsset: UnderlyingAsset;
  chain: SupportedChains;
  sizeForVanilla: string;
  sizeForSpread: string;
  availableSizeForVanilla: number;
  availableSizeForSpread: number;
  quoteAsset: NetworkQuoteAsset<SupportedChains>;
  quoteAssetAmountForVanilla: string;
  quoteAssetAmountForSpread: string;
  quoteAssetBalance: string;
  collateralAssetForVanilla: NetworkQuoteAsset<SupportedChains>;
  collateralAssetForSpread: NetworkQuoteAsset<SupportedChains>;
  collateralAssetAmountForVanilla: string;
  collateralAssetAmountForSpread: string;
  collateralAssetBalanceForVanilla: string;
  collateralAssetBalanceForSpread: string;
}) => {
  const isAvailableExceeded =
    optionStrategy === "Vanilla"
      ? Number(sizeForVanilla) > availableSizeForVanilla
      : Number(sizeForSpread) > availableSizeForSpread;

  const isMaxOpenSizeExceeded =
    optionStrategy === "Vanilla"
      ? Number(sizeForVanilla) >
        UA_TICKER_TO_MAX_OPEN_SIZE_FOR_VANILLA[chain][
          underlyingAsset as UnderlyingAsset
        ]
      : Number(sizeForSpread) >
        UA_TICKER_TO_MAX_OPEN_SIZE_FOR_SPREAD[chain][
          underlyingAsset as UnderlyingAsset
        ];

  const targetAsset =
    orderSide === "Buy"
      ? quoteAsset
      : optionStrategy === "Vanilla"
        ? collateralAssetForVanilla
        : collateralAssetForSpread;

  const targetAssetAmount =
    orderSide === "Buy"
      ? optionStrategy === "Vanilla"
        ? quoteAssetAmountForVanilla
        : quoteAssetAmountForSpread
      : optionStrategy === "Vanilla"
        ? collateralAssetAmountForVanilla
        : collateralAssetAmountForSpread;

  const targetAssetBalance =
    orderSide === "Buy"
      ? quoteAssetBalance
      : optionStrategy === "Vanilla"
        ? collateralAssetBalanceForVanilla
        : collateralAssetBalanceForSpread;

  const isInsufficientBalance = BN(targetAssetAmount).gt(targetAssetBalance);

  const isButtonError =
    isAvailableExceeded || isMaxOpenSizeExceeded || isInsufficientBalance;

  const buttonNameForError = isAvailableExceeded
    ? "Exceeded Available Size"
    : isMaxOpenSizeExceeded
      ? "Exceeded Max Open Size"
      : `Insufficient ${targetAsset}`;

  return {
    isButtonError,
    buttonNameForError,
  };
};
