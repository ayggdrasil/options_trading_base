import { useAccount } from "wagmi";
import React, { useRef } from "react";
import { copyToClipboard } from "@/utils/helper";
import IconCopy from "@assets/img/icon/copy.png";
import IconExplorer from "@assets/img/icon/explorer.png";
import IconDisconnect from "@assets/img/icon/disconnect.png";

type AccountActionsProps = {
  isCopied: boolean;
  setIsCopied: (value: boolean) => void;
  onDisconnect: () => void;
};

const AccountActions: React.FC<AccountActionsProps> = ({
  isCopied,
  setIsCopied,
  onDisconnect,
}) => {
  const { address, chain } = useAccount();
  const timerRef = useRef<number | null>(null);

  const handleCopyAddress = () => {
    if (isCopied) return;
    copyToClipboard(address as string);
    setIsCopied(true);
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setIsCopied(false);
      timerRef.current = null;
    }, 3000);
  };

  const handleViewExplorer = () => {
    if (!chain?.blockExplorers) return;
    window.open(
      chain?.blockExplorers.default.url + "/address/" + address,
      "_blank"
    );
  };

  return (
    <div className="w-full h-[68px] flex flex-row items-center gap-[8px]">
      {/*Copy Address*/}
      <div
        className="cursor-pointer h-full flex-1 flex flex-col item-center justify-between gap-[4px] rounded-[6px] py-[8px] bg-black2023 active:opacity-80 active:scale-95 min-w-0"
        onClick={handleCopyAddress}
      >
        <div className="flex flex-row items-center justify-center">
          <img
            className="w-[24px] h-[24px]"
            src={IconCopy}
          />
        </div>
        <p className="text-graybfbf text-[12px] text-center font-[600] leading-[24px] whitespace-nowrap">
          {isCopied ? "Copied!" : "Copy Address"}
        </p>
      </div>

      {/*Icon Explorer*/}
      <div
        className="cursor-pointer h-full flex-1 flex flex-col item-center justify-between gap-[4px] rounded-[6px] py-[8px] bg-black2023 active:opacity-80 active:scale-95 min-w-0"
        onClick={handleViewExplorer}
      >
        <div className="flex flex-row items-center justify-center">
          <img
            className="w-[24px] h-[24px]"
            src={IconExplorer}
          />
        </div>
        <p className="text-graybfbf text-[12px] text-center font-[600] leading-[24px] whitespace-nowrap">
          View Explorer
        </p>
      </div>

      {/*Disconnect*/}
      <div
        className="cursor-pointer h-full flex-1 flex flex-col item-center justify-between gap-[4px] rounded-[6px] py-[8px] bg-black2023 active:opacity-80 active:scale-95 min-w-0"
        onClick={onDisconnect}
      >
        <div className="flex flex-row items-center justify-center">
          <img
            className="w-[24px] h-[24px]"
            src={IconDisconnect}
          />
        </div>
        <p className="text-graybfbf text-[12px] text-center font-[600] leading-[24px] whitespace-nowrap">
          Disconnect
        </p>
      </div>
    </div>
  );
};

export default AccountActions;

