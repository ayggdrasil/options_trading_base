import BigNumber from "bignumber.js";
import { twJoin } from "tailwind-merge";
import { Dispatch, SetStateAction, useContext } from "react";
import {
  advancedFormatNumber,
  defaultUserName,
  shortenAddress,
  shortenUserName,
} from "@/utils/helper";
import { useAppSelector } from "@/store/hooks";
import { ILeadTrader } from "@/interfaces/interfaces.marketSlice";
import IconProfileDefault from "@assets/mobile/icon-profile-default.svg";
import IconTwitter from "@assets/mobile/icon-twitter-mobile.svg";
import { X_BASE_URL } from "@/utils/urls";
import { generateOptionTokenData, getMainOptionName, getMainOptionStrikePrice, getPairedOptionName, isCallStrategy, Strategy } from "@callput/shared";
import { useAccount } from "wagmi";
import { ModalContext } from "@/components/Common/ModalContext";
import { ModalName } from "@/pages/ZeroDteForMobile";
import { NetworkState } from "@/networks/types";
import { getUnderlyingAssetDecimalByTicker } from "@/networks/helpers";
import { UnderlyingAsset } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

interface MainSelectedCopyTradeProps {
  underlyingAsset: UnderlyingAsset;
  setEstimatedPrice: Dispatch<SetStateAction<number>>;
  leadTrader: ILeadTrader;
  forbiddenMinMaxPrices: number[];
}

const MainSelectedCopyTrade: React.FC<MainSelectedCopyTradeProps> = ({
  underlyingAsset,
  setEstimatedPrice,
  leadTrader,
  forbiddenMinMaxPrices,
}) => {
  const { address } = useAccount();
  const { setPreviousModal } = useContext(ModalContext);
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const optionsInfo = useAppSelector((state: any) => state.market.optionsInfo);
  const settlePricesData = useAppSelector(
    (state: any) => state.market.settlePrices
  );

  // only users with 1st grade of trading volume can show twitter info
  const showTwitterInfo =
    leadTrader.twitterInfo.isConnected && leadTrader.socialTradingGrade == 1;
  const userName =
    showTwitterInfo && leadTrader.twitterInfo.username
      ? leadTrader.twitterInfo.username
      : defaultUserName(leadTrader.address);
  const profileUrl =
    showTwitterInfo && leadTrader.twitterInfo.profileImageUrl
      ? leadTrader.twitterInfo.profileImageUrl
      : IconProfileDefault;

  const mainOptionStrikePrice = leadTrader.strikePrice;
  const copyTraders = leadTrader.copyTraders;
  const copyTradesVolume = leadTrader.copyTradesVolume;
  const totalPaid = BigNumber(leadTrader.executionPrice.toString())
    .dividedBy(new BigNumber(10).pow(30))
    .multipliedBy(BigNumber(leadTrader.size.toString()))
    .dividedBy(
      new BigNumber(10).pow(
        getUnderlyingAssetDecimalByTicker(chain, underlyingAsset)
      )
    )
    .toString();
  let ROI = 0;
  if (
    settlePricesData[leadTrader.expiry] &&
    settlePricesData[leadTrader.expiry][underlyingAsset]
  ) {
    const settlePrice = BigNumber(
      settlePricesData[leadTrader.expiry][underlyingAsset]
    )
      .multipliedBy(10 ** 30)
      .toString();
    const strikePrice = getMainOptionStrikePrice(
      BigInt(leadTrader.optionTokenId)
    );
    const parsedStrikePrice = new BigNumber(strikePrice)
      .multipliedBy(10 ** 30)
      .toString();
    const isItm = isCallStrategy(leadTrader.strategy)
      ? new BigNumber(parsedStrikePrice).lt(settlePrice) // buy call 기준
      : new BigNumber(parsedStrikePrice).gt(settlePrice); // buy put 기준

    const settlePayoff = isItm
      ? isCallStrategy(leadTrader.strategy)
        ? new BigNumber(settlePrice).minus(parsedStrikePrice).toString()
        : new BigNumber(parsedStrikePrice).minus(settlePrice).toString()
      : String(0);

    const profitPerUnit = new BigNumber(settlePayoff)
      .minus(leadTrader.executionPrice)
      .toString();
    ROI = new BigNumber(profitPerUnit)
      .div(leadTrader.executionPrice)
      .multipliedBy(100)
      .toNumber();
  } else {
    try {
      const optionTokenId = BigInt(leadTrader.optionTokenId);
      const { optionNames } = generateOptionTokenData(
        chain,
        optionTokenId
      );
      const mainOptionName = getMainOptionName(optionTokenId, optionNames);
      const pairedOptionName = getPairedOptionName(optionTokenId, optionNames);
      const mainOptionInfo = optionsInfo[mainOptionName];
      const pairedOptionInfo = optionsInfo[pairedOptionName];
      const markPrice = mainOptionInfo.markPrice - pairedOptionInfo.markPrice;
      const executionPrice = BigNumber(leadTrader.executionPrice.toString())
        .dividedBy(new BigNumber(10).pow(30))
        .toString();
      ROI =
        ((Number(markPrice) - Number(executionPrice)) /
          Number(executionPrice)) *
        100;
    } catch (error) {}
  }

  const _isCall = leadTrader.strategy == "BuyCallSpread";
  const aboveOrBelow = _isCall ? "above" : "below";
  const textColorByCallOrPut = _isCall ? "text-green63" : "text-[#E03F3F]";
  const bgColorByCallOrPut = _isCall ? "bg-green63" : "bg-[#E03F3F]";
  const textColorByProfit = ROI > 0 ? "text-green63" : "text-[#E03F3F]";
  const isAvailable =
    !(
      mainOptionStrikePrice > forbiddenMinMaxPrices[0] &&
      mainOptionStrikePrice < forbiddenMinMaxPrices[1]
    ) && address != leadTrader.address;

  return (
    <div className={twJoin("flex flex-col gap-y-5 px-3 md:px-6")}>
      <div className="flex flex-row justify-between items-center">
        <div className="flex flex-row gap-x-2">
          <img
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            src={profileUrl}
            alt="Profile"
          />
          <div className="flex flex-col gap-y-[2px]">
            <p
              className={twJoin(
                "font-bold text-greene6",
                "text-[16px] leading-[24px] md:text-[18px]"
              )}
            >
              {shortenUserName(userName)}
            </p>
            <p
              className={twJoin(
                "font-semibold text-gray999",
                "text-[12px] leading-[14px] md:text-[14px]"
              )}
            >
              {shortenAddress(leadTrader.address)}
            </p>
          </div>
        </div>
        {showTwitterInfo && (
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
            onClick={() => {
              window.open(X_BASE_URL + userName);
            }}
          >
            <img
              className="h-full w-full object-cover"
              src={IconTwitter}
              alt="IconTwitter"
            />
          </div>
        )}
      </div>
      <div className="flex flex-row gap-x-[92px]">
        <div className="flex flex-col">
          <p
            className={twJoin(
              "font-semibold text-gray9D",
              "text-[12px] leading-[18px] md:text-[14px]"
            )}
          >
            Copy Traders
          </p>
          <p
            className={twJoin(
              "font-semibold text-whitef0",
              "text-[14px] leading-[21px] md:text-[16px]"
            )}
          >
            {advancedFormatNumber(Number(copyTraders), 0)}
          </p>
        </div>
        <div className="flex flex-col">
          <p
            className={twJoin(
              "font-semibold text-gray9D",
              "text-[12px] leading-[18px] md:text-[14px]"
            )}
          >
            Copy Trades Volume
          </p>
          <p
            className={twJoin(
              "font-semibold text-whitef0",
              "text-[14px] leading-[21px] md:text-[16px]"
            )}
          >
            {advancedFormatNumber(Number(copyTradesVolume), 2, "$")}
          </p>
        </div>
      </div>
      <div
        className={twJoin(
          "flex flex-col gap-y-3",
          "p-3 rounded-lg bg-[#111613D9]"
        )}
      >
        <div className="flex flex-row justify-between">
          <p
            className={twJoin(
              "font-semibold text-gray9D",
              "text-[14px] leading-[21px] md:text-[16px]"
            )}
          >
            Prediction
          </p>
          <p
            className={twJoin(
              "font-semibold text-whitef0 text-end",
              "text-[14px] leading-[21px] md:text-[16px]"
            )}
          >
            {underlyingAsset} will be{" "}
            <span className={`${textColorByCallOrPut}`}>
              {aboveOrBelow}{" "}
              {advancedFormatNumber(Number(mainOptionStrikePrice), 2, "$")}
            </span>
          </p>
        </div>
        <div className="flex flex-row justify-between">
          <p
            className={twJoin(
              "font-semibold text-gray9D",
              "text-[14px] leading-[21px] md:text-[16px]"
            )}
          >
            Total Paid
          </p>
          <p
            className={twJoin(
              "font-semibold text-whitef0",
              "text-[14px] leading-[21px] md:text-[16px]"
            )}
          >
            {advancedFormatNumber(Number(totalPaid), 0, "") + " USDC"}
          </p>
        </div>
        <div className="flex flex-row justify-between">
          <p
            className={twJoin(
              "font-semibold text-gray9D",
              "text-[14px] leading-[21px] md:text-[16px]"
            )}
          >
            ROI
          </p>
          <p
            className={`font-semibold ${textColorByProfit} text-[14px] leading-[21px] md:text-[16px]`}
          >
            {advancedFormatNumber(ROI, 2, "") + "%"}
          </p>
        </div>
      </div>
      {/* Button */}
      {isAvailable && (
        <div
          onClick={() => {
            setEstimatedPrice(mainOptionStrikePrice);
            setPreviousModal(ModalName.SELECTED_COPY_TRADE);
          }}
          className={twJoin(
            "flex items-center justify-center",
            "w-full h-10 rounded",
            "font-bold text-black0a",
            "text-[14px] leading-[21px] md:text-[16px]",
            bgColorByCallOrPut
          )}
        >
          Copy
        </div>
      )}
    </div>
  );
};

export default MainSelectedCopyTrade;
