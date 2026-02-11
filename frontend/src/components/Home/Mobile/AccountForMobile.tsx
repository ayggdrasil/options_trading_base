import { twJoin } from "tailwind-merge";
import { useContext, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ModalContext } from "@/components/Common/ModalContext";
import AccountInfoForMobile from "./AccountInfoForMobile";

import IconDropDownWhite from "@assets/mobile/icon-dropdown-white.svg";

const AccountForMobile: React.FC = () => {
  const { address } = useAccount();
  const { isModalOpen, openModal } = useContext(ModalContext);

  const [isAccountInfoOpen, setIsAccountInfoOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isModalOpen) {
      return;
    }

    setIsAccountInfoOpen(false);
  }, [isModalOpen]);

  return (
    <div
      className={twJoin(
        "flex items-center gap-x-2",
        "rounded p-2 md:px-3",
        "cursor-pointer",
        "bg-[rgba(240,235,229,0.1)]"
      )}
      onClick={() => {
        setIsAccountInfoOpen(true);
        openModal(<AccountInfoForMobile />, {
          contentClassName: "flex flex-col min-h-[400px]",
        });
      }}
    >
      <div className="text-[14px] md:text-[16px] leading-[24px] font-bold tracking-[-0.01em] text-whitef0">
        {address?.substring(0, 7)}
      </div>
      <img
        className={twJoin(
          "w-[9px] transition-all duration-300",
          isAccountInfoOpen ? "rotate-180" : ""
        )}
        src={IconDropDownWhite}
      />
    </div>
  );
};

export default AccountForMobile;
