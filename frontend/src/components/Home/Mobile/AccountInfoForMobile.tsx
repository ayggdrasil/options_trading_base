import { twJoin } from "tailwind-merge";

import {
  advancedFormatNumber,
  copyToClipboard,
  defaultUserName,
  shortenAddress,
} from "@/utils/helper";
import { useAccount, useDisconnect } from "wagmi";
import React, { useContext, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { resetPosition } from "@/store/slices/PositionsSlice";
import Twitter from "@/components/NavBar/Twitter.tsx";
import { ModalContext } from "@/components/Common/ModalContext";

import IconCopyAddressMobile from "@assets/mobile/icon-copy-address-mobile.svg";
import IconCopiedMobile from "@assets/mobile/icon-copied-mobile.svg";
import IconDisconnectMobile from "@assets/mobile/icon-disconnect-mobile.svg";
import IconProfileDefaultMobile from "@assets/mobile/icon-profile-default-mobile.svg";
import IconExplorerMobile from "@assets/mobile/icon-explorer-mobile.svg";
import SymbolBitcoinCircleMobile from "@assets/mobile/symbol-bitcoin-circle-mobile.svg";
import SymbolEthereumCircleMobile from "@assets/mobile/symbol-ethereum-circle-mobile.svg";
import IconDropDownGray from "@assets/mobile/icon-dropdown-gray.svg";

type TradeDataItemProps = {
  title: string;
  total: string;
  btc: string;
  eth: string;
};

const TradeDataItem: React.FC<TradeDataItemProps> = ({
  title,
  total,
  btc,
  eth,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <div className="px-3 text-[14px] md:text-[16px] leading-[21px] font-semibold">
      {/* Header */}
      <div
        className="flex justify-between items-center gap-x-2 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-x-2">
          <img
            className={twJoin(
              "flex-shrink-0 w-[18px] transition-all",
              isOpen ? "" : "-rotate-90"
            )}
            src={IconDropDownGray}
          />
          <p className="text-whitef0">{title}</p>
        </div>
        <p className="text-right text-greene6">{total}</p>
      </div>

      {/* Values */}
      {isOpen && (
        <div className="pt-3 pl-[26px] text-gray9D">
          {/* BTC */}
          <div className="flex justify-between items-center gap-x-2 mb-3">
            <div className="flex items-center gap-x-2">
              <img
                className="w-[18px] flex-shrink-0"
                src={SymbolBitcoinCircleMobile}
              />
              <p>BTC</p>
            </div>
            <p className="text-right">{btc}</p>
          </div>

          {/* ETH */}
          <div className="flex justify-between items-center gap-x-2">
            <div className="flex items-center gap-x-2">
              <img
                className="w-[18px] flex-shrink-0"
                src={SymbolEthereumCircleMobile}
              />
              <p>ETH</p>
            </div>
            <p className="text-right">{eth}</p>
          </div>
        </div>
      )}
    </div>
  );
};

type ActionButtonProps = {
  text: string;
  icon: string;
  outerClassName: string;
  innerClassName: string;
  onClick?: () => void;
};

const ActionButton: React.FC<ActionButtonProps> = ({
  text,
  icon,
  outerClassName,
  innerClassName,
  onClick,
}) => {
  return (
    <div onClick={onClick} className="w-20 md:w-24">
      <div
        className={twJoin(
          "flex justify-center items-center",
          "w-[54px] h-[54px] border-[1px] mb-[8px] mx-auto rounded-xl",
          "cursor-pointer",
          outerClassName
        )}
      >
        <div
          className={twJoin(
            "flex justify-center items-center",
            "w-[48px] h-[48px] border-[1px] rounded-xl",
            innerClassName
          )}
        >
          <img className="w-5" src={icon} />
        </div>
      </div>
      <p className="text-[10px] md:text-[12px] leading-[15px] font-medium text-center text-gray9D">
        {text}
      </p>
    </div>
  );
};

const AccountInfoForMobile: React.FC = () => {
  const { address, chain } = useAccount();
  const { disconnect } = useDisconnect();

  const dispatch = useAppDispatch();
  const { closeModal } = useContext(ModalContext);

  const twitterInfo = useAppSelector((state: any) => state.user.twitterInfo);
  const userTradeData = useAppSelector((state: any) => state.user.tradeData);

  const [isTwitterConnected, setIsTwitterConnected] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleCoppyAddress = () => {
    if (isCopied) {
      return;
    }

    copyToClipboard(address as string);

    setIsCopied(true);
  };

  const handleExplore = () => {
    if (!chain?.blockExplorers) {
      return;
    }

    window.open(
      chain?.blockExplorers.default.url + "/address/" + address,
      "_blank"
    );
  };

  const handleDisconnect = () => {
    dispatch(resetPosition()); // Correctly dispatch the action
    disconnect(); // Call your disconnect function
    closeModal();
  };

  const btcTradeCount = userTradeData.BTC.tradeCount || 0;
  const btcTradeSize = userTradeData.BTC.tradeSize || "0";
  const btcNotionalVolume = userTradeData.BTC.notionalVolume || "0";

  const ethTradeCount = userTradeData.ETH.tradeCount || 0;
  const ethTradeSize = userTradeData.ETH.tradeSize || "0";
  const ethNotionalVolume = userTradeData.ETH.notionalVolume || "0";

  const userName =
    isTwitterConnected && twitterInfo.username
      ? twitterInfo.username
      : defaultUserName(address);
  const profileUrl =
    isTwitterConnected && twitterInfo.profileImageUrl
      ? twitterInfo.profileImageUrl
      : IconProfileDefaultMobile;

  useEffect(() => {
    setIsTwitterConnected(twitterInfo.isConnected);
  }, [twitterInfo]);

  return (
    <div className="flex-1 flex flex-col w-full px-3 md:px-6 overflow-auto">
      {/*Account*/}
      <div className="flex justify-between items-center gap-3 mb-6">
        <div className="flex gap-3">
          {/*Avatar*/}
          <img
            className="w-12 h-12 md:w-14 md:h-14 rounded-full flex-shrink-0 object-cover"
            src={profileUrl}
            alt="Profile"
          />

          {/*Twitter Name and shorten Address*/}
          <div>
            <div className="text-[20px] md:text-[22px] leading-6 font-bold mb-[2px] md:mb-[4px] text-whitef0">
              {userName}
            </div>
            <div className="text-[14px] md:text-[16px] leading-[21px] font-medium text-gray9D">
              {shortenAddress(address)}
            </div>
          </div>
        </div>

        {/*Twitter*/}
        {(
          <Twitter
            isTwitterConnected={isTwitterConnected}
            setIsTwitterConnected={setIsTwitterConnected}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/*Open/Close Count, Size, Notional Volume*/}
        <div
          className={twJoin(
            "flex flex-col gap-y-4",
            "px-3 py-4 rounded-lg mb-4",
            "backdrop-blur-[20px] bg-[rgba(17,22,19,0.85)]"
          )}
        >
          {/* Total Open/Close Count */}
          <TradeDataItem
            title="Open/Close Count"
            total={advancedFormatNumber(btcTradeCount + ethTradeCount, 0)}
            btc={advancedFormatNumber(btcTradeCount, 0)}
            eth={advancedFormatNumber(ethTradeCount, 0)}
          />

          {/* Total Open/Close Size */}
          <TradeDataItem
            title="Open/Close Size"
            total={advancedFormatNumber(
              Number(btcTradeSize) + Number(ethTradeSize),
              4
            )}
            btc={advancedFormatNumber(Number(btcTradeSize), 4)}
            eth={advancedFormatNumber(Number(ethTradeSize), 4)}
          />

          {/* Total Notional Volume */}
          <TradeDataItem
            title="Notional Volume"
            total={advancedFormatNumber(
              Number(btcNotionalVolume) + Number(ethNotionalVolume),
              2,
              "$"
            )}
            btc={advancedFormatNumber(Number(btcNotionalVolume), 2, "$")}
            eth={advancedFormatNumber(Number(ethNotionalVolume), 2, "$")}
          />
        </div>
      </div>

      {/* Bottom button group */}
      <div className="flex justify-center gap-6 pt-4">
        {/*Copy Address*/}
        <ActionButton
          text={isCopied ? "Copied" : "Copy Address"}
          icon={isCopied ? IconCopiedMobile : IconCopyAddressMobile}
          outerClassName="border-[#203728]"
          innerClassName="border-[rgb(230,252,141,0.5)]"
          onClick={handleCoppyAddress}
        />

        {/*Icon Explorer*/}
        <ActionButton
          text={"View Explorer"}
          icon={IconExplorerMobile}
          outerClassName="border-[#203728]"
          innerClassName="border-[rgb(230,252,141,0.5)]"
          onClick={handleExplore}
        />

        {/*Disconnect*/}
        <ActionButton
          text={"Disconnect"}
          icon={IconDisconnectMobile}
          outerClassName="border-[#372020]"
          innerClassName="border-[rgb(253,96,75,0.5)]"
          onClick={handleDisconnect}
        />
      </div>
    </div>
  );
};

export default AccountInfoForMobile;
