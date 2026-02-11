import { twJoin } from "tailwind-merge";

import { advancedFormatNumber, shortenAddress } from "@/utils/helper";
import { useAccount, useDisconnect } from "wagmi";
import React from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { resetPosition } from "@/store/slices/PositionsSlice";
import { disconnect$ } from "@/streams/store";
import AccountActions from "./AccountActions/AccountActions";

type AccountInfoProps = {
  isCopied: boolean;
  setIsCopied: (value: boolean) => void;
};

const AccountInfo: React.FC<AccountInfoProps> = ({ isCopied, setIsCopied }) => {
  const dispatch = useAppDispatch();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  const handleDisconnect = () => {
    dispatch(resetPosition()); // Correctly dispatch the action
    disconnect$.next(true);
    disconnect(); // Call your disconnect function
  };

  const userTradeData = useAppSelector((state: any) => state.user.tradeData);

  // 모든 자산(BTC, ETH 등)의 데이터를 합산하여 total 값 계산
  const totalTradeCount = Object.values(userTradeData || {}).reduce(
    (sum: number, asset: any) => sum + (asset?.tradeCount || 0),
    0
  );
  const totalTradeSize = Object.values(userTradeData || {}).reduce(
    (sum: number, asset: any) => sum + Number(asset?.tradeSize || "0"),
    0
  );
  const totalNotionalVolume = Object.values(userTradeData || {}).reduce(
    (sum: number, asset: any) => sum + Number(asset?.notionalVolume || "0"),
    0
  );

  return (
    <div
      className={twJoin(
        "absolute right-0 top-[44px]",
        "w-[368px] h-fit flex flex-col gap-[24px] p-[24px] bg-black181a rounded-[10px] border-[1px] border-black2023 shadow-[0px_6px_36px_0px_rgba(0,0,0,0.2)]"
      )}
    >
      {/*Account*/}
      <div className="h-[32px] flex flex-row items-center justify-between">
        <p className="h-full text-blue278e text-[20px] font-[700] leading-[32px]">
          {shortenAddress(address)}
        </p>
      </div>

      <div className="flex flex-col gap-[8px]">
        {/* Total Open/Close Count */}
        <div className="w-full h-[24px] flex flex-row justify-between items-center">
          <p className="text-whitef2f2 text-[14px] font-[600] leading-[24px]">
            Open/Close Count
          </p>
          <p className="text-whitef2f2 text-[14px] font-[600] leading-[24px]">
            {advancedFormatNumber(totalTradeCount, 0)}
          </p>
        </div>

        {/* Total Open/Close Size */}
        <div className="w-full h-[24px] flex flex-row justify-between items-center">
          <p className="text-whitef2f2 text-[14px] font-[600] leading-[24px]">
            Open/Close Contracts
          </p>
          <p className="text-whitef2f2 text-[14px] font-[600] leading-[24px]">
            {advancedFormatNumber(totalTradeSize, 2)}
          </p>
        </div>

        {/* Total Notional Volume */}
        <div className="w-full h-[24px] flex flex-row justify-between items-center">
          <p className="text-whitef2f2 text-[14px] font-[600] leading-[24px]">
            Notional Volume
          </p>
          <p className="text-whitef2f2 text-[14px] font-[600] leading-[24px]">
            {advancedFormatNumber(totalNotionalVolume, 2, "$")}
          </p>
        </div>
      </div>
      <AccountActions
        isCopied={isCopied}
        setIsCopied={setIsCopied}
        onDisconnect={handleDisconnect}
      />
    </div>
  );
};

export default AccountInfo;
