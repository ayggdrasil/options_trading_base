import { twJoin } from "tailwind-merge";
import { useEffect, useRef, useState } from "react";
import { shortenAddress } from "@/utils/helper";
import { useAccount } from "wagmi";
import AccountInfo from "./AccountInfo/AccountInfo";

import IconArrSelUp from "@assets/img/icon/arr-selector-up.png";
import IconArrSelDown from "@assets/img/icon/arr-selector-down.png";

const Account: React.FC = () => {
  const { address } = useAccount();

  const accountInfoRef = useRef<HTMLDivElement>(null);

  const [isAccountInfoOpen, setIsAccountInfoOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    const handleClick = (event: any) => {
      if (accountInfoRef.current?.contains(event.target)) {
        return;
      }

      setIsAccountInfoOpen(false);
      setIsCopied(false);
    };

    document.body.addEventListener("click", handleClick);

    return () => {
      document.body.removeEventListener("click", handleClick);
    };
  }, []);

  useEffect(() => {
    if (!isAccountInfoOpen) {
      setIsCopied(false);
    }
  }, [isAccountInfoOpen]);

  return (
    <div ref={accountInfoRef} className="relative flex flex-row items-center min-w-fit">
      <div
        className={twJoin(
          "cursor-pointer",
          "flex flex-row justify-between items-center gap-[10px] p-[8px] pl-[16px]",
          "w-fit h-[40px] px-[10px] rounded-[6px] bg-black2023",
          "text-whitef2f2 text-[16px] font-[600] leading-[24px]",
          "hover:bg-black292c active:scale-95 active:opacity-80"
        )}
        onClick={() => setIsAccountInfoOpen(!isAccountInfoOpen)}
      >
        <p>{shortenAddress(address)}</p>
        <img
          className="w-[16px] h-[16px]"
          src={isAccountInfoOpen ? IconArrSelUp : IconArrSelDown}
        />
      </div>
      {isAccountInfoOpen && (
        <AccountInfo isCopied={isCopied} setIsCopied={setIsCopied} />
      )}
    </div>
  );
};

export default Account;
