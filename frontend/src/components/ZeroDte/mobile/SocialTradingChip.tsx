import React, { memo, useMemo } from "react";
import { ILeadTrader } from "@/interfaces/interfaces.marketSlice.ts";
import { defaultUserName } from "@/utils/helper.ts";
import IconProfileDefault from "@assets/icon-profile-default.svg";
import IconArrowCallChart from "@assets/icon-arrow-call-chart.svg";
import IconArrowPutChart from "@assets/icon-arrow-put-chart.svg";
import IconArrowCallChartBlur from "@assets/mobile/zero-dte/icon-arrow-call-chart-blur.svg";
import IconArrowPutChartBlur from "@assets/mobile/zero-dte/icon-arrow-put-chart-blur.svg";
import { generateOptionTokenData, getMainOptionName, getMainOptionStrikePrice, getPairedOptionName, isCallStrategy, Strategy } from "@callput/shared";
import { twJoin } from "tailwind-merge";
import { useAppSelector } from "@/store/hooks";
import BigNumber from "bignumber.js";
import { NetworkState } from "@/networks/types";
import { UnderlyingAsset } from "@callput/shared";

type SocialTradingChipProps = {
  leadTrader: ILeadTrader;
  underlyingAsset: UnderlyingAsset;
  setSelectedLeadTrader: (value: ILeadTrader | null) => void;
  setEstimatedPrice: (value: number) => void;
};

const SocialTradingChip: React.FC<SocialTradingChipProps> = memo(
  ({
    leadTrader,
    underlyingAsset,
    setSelectedLeadTrader,
    setEstimatedPrice,
  }) => {
    const { chain } = useAppSelector(state => state.network) as NetworkState;

    const optionsInfo = useAppSelector(
      (state: any) => state.market.optionsInfo
    );
    const settlePricesData = useAppSelector(
      (state: any) => state.market.settlePrices
    );

    const isTwitterConnected = useMemo(() => {
      return leadTrader.twitterInfo.id != undefined;
    }, [leadTrader]);

    const isCopyTrade1stGrade = useMemo(() => {
      return leadTrader?.socialTradingGrade == 1;
    }, [leadTrader]);

    const userName = useMemo(() => {
      return isTwitterConnected &&
        isCopyTrade1stGrade &&
        leadTrader?.twitterInfo?.username
        ? leadTrader.twitterInfo.username
        : defaultUserName(leadTrader?.address);
    }, [leadTrader, isTwitterConnected, isCopyTrade1stGrade]);

    const profileUrl = useMemo(() => {
      return isTwitterConnected && leadTrader?.twitterInfo?.profileImageUrl
        ? leadTrader?.twitterInfo?.profileImageUrl
        : IconProfileDefault;
    }, [leadTrader, isTwitterConnected]);

    const isCall = useMemo(() => {
      return leadTrader?.strategy == "BuyCallSpread";
    }, [leadTrader]);

    const ROI = useMemo(() => {
      let _ROI = 0;

      if (
        settlePricesData[leadTrader?.expiry] &&
        settlePricesData[leadTrader?.expiry]?.[underlyingAsset]
      ) {
        const settlePrice = BigNumber(
          settlePricesData[leadTrader.expiry][underlyingAsset]
        )
          .multipliedBy(10 ** 30)
          .toString();

        const strikePrice = getMainOptionStrikePrice(
          BigInt(leadTrader?.optionTokenId)
        );
        const parsedStrikePrice = new BigNumber(strikePrice)
          .multipliedBy(10 ** 30)
          .toString();

        const isItm = isCallStrategy(leadTrader?.strategy)
          ? new BigNumber(parsedStrikePrice).lt(settlePrice) // buy call 기준
          : new BigNumber(parsedStrikePrice).gt(settlePrice); // buy put 기준

        const settlePayoff = isItm
          ? isCallStrategy(leadTrader?.strategy)
            ? new BigNumber(settlePrice).minus(parsedStrikePrice).toString()
            : new BigNumber(parsedStrikePrice).minus(settlePrice).toString()
          : String(0);

        const profitPerUnit = new BigNumber(settlePayoff)
          .minus(leadTrader.executionPrice)
          .toString();

        _ROI = new BigNumber(profitPerUnit)
          .div(leadTrader.executionPrice)
          .multipliedBy(100)
          .toNumber();
      } else {
        try {
          const optionTokenId = BigInt(leadTrader?.optionTokenId);
          const { optionNames } = generateOptionTokenData(
            chain,
            optionTokenId
          );
          const mainOptionName = getMainOptionName(optionTokenId, optionNames);
          const pairedOptionName = getPairedOptionName(
            optionTokenId,
            optionNames
          );
          const mainOptionInfo = optionsInfo[mainOptionName];

          const pairedOptionInfo = optionsInfo[pairedOptionName];
          const markPrice =
            mainOptionInfo?.markPrice - pairedOptionInfo?.markPrice;
          const executionPrice = BigNumber(
            leadTrader?.executionPrice?.toString()
          )
            .dividedBy(new BigNumber(10).pow(30))
            .toString();

          _ROI =
            ((Number(markPrice) - Number(executionPrice)) /
              Number(executionPrice)) *
            100;
        } catch (error) {}
      }

      return _ROI;
    }, [settlePricesData, leadTrader, underlyingAsset]);

    const arrow = useMemo(() => {
      return isCall
        ? ROI > 0
          ? IconArrowCallChart
          : IconArrowCallChartBlur
        : ROI > 0
        ? IconArrowPutChart
        : IconArrowPutChartBlur;
    }, [isCall, ROI]);

    const userIcon = useMemo(() => {
      return isCopyTrade1stGrade ? profileUrl : arrow;
    }, [isCopyTrade1stGrade, arrow]);

    const containerClass = useMemo(
      () =>
        twJoin(
          "flex justify-start items-center gap-1",
          "p-[2px] pr-[7px] max-w-[104px] min-h-[28px] rounded-[14px]",
          "backdrop-blur-[3px]",
          isCopyTrade1stGrade
            ? isCall
              ? ROI > 0
                ? "border border-green63"
                : "border border-green3b"
              : ROI > 0
              ? "border border-redE0"
              : "border border-red5C"
            : "",
          isCopyTrade1stGrade
            ? "bg-[rgba(10,10,10,0.80)]"
            : "bg-[rgba(10,10,10,0.50)]"
        ),
      [isCopyTrade1stGrade, isCall, ROI]
    );

    return (
      <div
        className={containerClass}
        onClick={() => {
          setEstimatedPrice(0);
          setSelectedLeadTrader(leadTrader);
        }}
      >
        <div className="flex flex-row justify-center items-center shrink-0 w-[22px] h-[22px]">
          <img
            width={22}
            height={22}
            className="w-full h-full rounded-full object-cover"
            src={userIcon}
            loading="lazy"
          />
        </div>
        <p className="text-[10px] leading-[15px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-gray999">
          {userName}
        </p>
      </div>
    );
  }
);

export default SocialTradingChip;
