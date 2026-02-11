import React, { useRef } from "react";
import { ILeadTrader } from "@/interfaces/interfaces.marketSlice.ts";
import { defaultUserName, shortenUserName } from "@/utils/helper.ts";
import IconProfileDefault from "@assets/icon-profile-default.svg";
import IconProfileBera from "@assets/icon-profile-bera.svg";
import IconArrowCallChart from "@assets/icon-arrow-call-chart.svg";
import IconArrowPutChart from "@assets/icon-arrow-put-chart.svg";
import IconArrowCallChartBlur from "@assets/icon-arrow-call-chart-blur.svg";
import IconArrowPutChartBlur from "@assets/icon-arrow-put-chart-blur.svg";
import { generateOptionTokenData, getMainOptionName, getMainOptionStrikePrice, getPairedOptionName, isCallStrategy, Strategy } from "@callput/shared";
import { twJoin } from "tailwind-merge";
import { useAppSelector } from "@/store/hooks";
import BigNumber from "bignumber.js";
import { UnderlyingAsset } from "@callput/shared";
import { NetworkState } from "@/networks/types";

type SocialTradingChipProps = {
  leadTrader: ILeadTrader;
  underlyingAsset: UnderlyingAsset;
  setSelectedLeadTrader: (value: ILeadTrader | null) => void;
  setModalXY: (value: [number, number]) => void;
  modalXY: [number, number];
  setEstimatedPrice: (value: number) => void;
};

const SocialTradingChip: React.FC<SocialTradingChipProps> = ({
  leadTrader,
  underlyingAsset,
  setSelectedLeadTrader,
  setModalXY,
  modalXY,
  setEstimatedPrice,
}) => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const optionsInfo = useAppSelector((state: any) => state.market.optionsInfo);
  const settlePricesData = useAppSelector(
    (state: any) => state.market.settlePrices
  );
  const referralsRef = useRef<HTMLDivElement>(null);
  const isTwitterConnected = leadTrader.twitterInfo.id != undefined;
  const isCopyTrade1stGrade = leadTrader.socialTradingGrade == 1;
  const userName =
    isTwitterConnected && isCopyTrade1stGrade && leadTrader.twitterInfo.username
      ? leadTrader.twitterInfo.username
      : defaultUserName(leadTrader.address);
  const profileUrl =
    isTwitterConnected && leadTrader.twitterInfo.profileImageUrl
      ? leadTrader.twitterInfo.profileImageUrl
      : IconProfileDefault;
      

  const isCall = leadTrader.strategy == "BuyCallSpread";

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

  const arrow = isCall
    ? ROI > 0 ? IconArrowCallChart : IconArrowCallChartBlur
    : ROI > 0 ? IconArrowPutChart : IconArrowPutChartBlur;
    const userIcon = isCopyTrade1stGrade ? profileUrl : arrow;

  return (
    <div ref={referralsRef} className="relative">
      <button
        className={twJoin(
          "flex flex-row",
          "max-w-[104px] w-auto h-[28px] shrink-0",
          "justify-start items-center",
          `rounded-[14px]`,
          isCopyTrade1stGrade
            ? isCall
              ? ROI > 0
                ? `border border-green63`
                : `border border-green3b`
              : ROI > 0
              ? `border border-redE0`
              : `border border-red5C`
            : ``,
          isCopyTrade1stGrade
            ? `bg-[rgba(10,10,10,0.80)]`
            : `bg-[rgba(10,10,10,0.50)]`,
          `backdrop-blur-[1.5px]`,
          `animate-chipAppearing`,
          `pl-[3px] py-[3px] gap-[4px] pr-[10px]`
        )}
        onClick={(e) => {
          setEstimatedPrice(0);
          setSelectedLeadTrader(leadTrader);
          setModalXY(modalXY);
        }}
      >
        {/*IconProfile*/}
        <div className="cursor-pointer flex flex-row justify-center items-center shrink-0 w-[22px] h-[22px]">
          <img
            className="w-full h-full rounded-full bg-cover bg-center bg-no-repeat bg-light-gray"
            src={userIcon}
          />
        </div>
        <div className="text-[11px] w-auto ont-semibold text-gray99 leading-normal  whitespace-nowrap">
          {shortenUserName(userName, 10)}
        </div>
      </button>
    </div>
  );
};

export default SocialTradingChip;
