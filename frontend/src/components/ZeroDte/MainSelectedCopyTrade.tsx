import BigNumber from "bignumber.js";
import { twJoin } from "tailwind-merge";
import { Dispatch, SetStateAction } from "react";
import { advancedFormatNumber, defaultUserName, shortenAddress, shortenUserName } from "@/utils/helper";
import { useAppSelector } from "@/store/hooks";
import { ILeadTrader} from "@/interfaces/interfaces.marketSlice";
import IconProfileDefault from "@assets/icon-profile-default.svg";
import IconTwitter from "@assets/icon-twitter.svg";
import IconSelectedZeroDteClose from "@assets/icon-selected-zero-dte-close.svg";
import { X_BASE_URL } from "@/utils/urls";
import { useAccount } from "wagmi";
import { NetworkState } from "@/networks/types";
import { getUnderlyingAssetDecimalByTicker } from "@/networks/helpers";
import { generateOptionTokenData, getMainOptionName, getMainOptionStrikePrice, getPairedOptionName, isCallStrategy, UnderlyingAsset } from "@callput/shared";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

interface MainSelectedCopyTradeProps {
  underlyingAsset: UnderlyingAsset;
  setEstimatedPrice: Dispatch<SetStateAction<number>>;
  leadTrader: ILeadTrader;
  setSelectedLeadTrader: (value: ILeadTrader | null) => void;
  modalXY:[number, number];
  forbiddenMinMaxPrices: number[];
}

const MainSelectedCopyTrade: React.FC<MainSelectedCopyTradeProps> = ({
  underlyingAsset,
  setEstimatedPrice,
  leadTrader,
  setSelectedLeadTrader,
  modalXY,
  forbiddenMinMaxPrices
}) => {
  const {address} = useAccount()
  const { chain } = useAppSelector(state => state.network) as NetworkState;
  const optionsInfo = useAppSelector((state: any) => state.market.optionsInfo);
  const settlePricesData = useAppSelector((state: any) => state.market.settlePrices);

  // only users with 1st grade of trading volume can show twitter info
  const showTwitterInfo = leadTrader.twitterInfo.isConnected && leadTrader.socialTradingGrade == 1
  const userName = showTwitterInfo && leadTrader.twitterInfo.username

  ? leadTrader.twitterInfo.username
  : defaultUserName(leadTrader.address)
  const profileUrl = showTwitterInfo && leadTrader.twitterInfo.profileImageUrl
    ? leadTrader.twitterInfo.profileImageUrl
    :IconProfileDefault

  const mainOptionStrikePrice = leadTrader.strikePrice
  const copyTraders = leadTrader.copyTraders
  const copyTradesVolume = leadTrader.copyTradesVolume
  const totalPaid = BigNumber(leadTrader.executionPrice.toString())
  .dividedBy(new BigNumber(10).pow(30))
  .multipliedBy(BigNumber(leadTrader.size.toString()))
  .dividedBy(new BigNumber(10).pow(getUnderlyingAssetDecimalByTicker(chain, underlyingAsset)))
  .toString()
  let ROI = 0
  if (settlePricesData[leadTrader.expiry] && settlePricesData[leadTrader.expiry][underlyingAsset]) {
    const settlePrice = BigNumber(settlePricesData[leadTrader.expiry][underlyingAsset]).multipliedBy(10 ** 30).toString()
    const strikePrice = getMainOptionStrikePrice(BigInt(leadTrader.optionTokenId));
    const parsedStrikePrice = new BigNumber(strikePrice).multipliedBy(10 ** 30).toString();
    const isItm = isCallStrategy(leadTrader.strategy)
    ? new BigNumber(parsedStrikePrice).lt(settlePrice) // buy call 기준
    : new BigNumber(parsedStrikePrice).gt(settlePrice); // buy put 기준

    const settlePayoff = isItm
    ? isCallStrategy(leadTrader.strategy)
      ? new BigNumber(settlePrice).minus(parsedStrikePrice).toString()
      : new BigNumber(parsedStrikePrice).minus(settlePrice).toString()
    : String(0);

    const profitPerUnit = new BigNumber(settlePayoff).minus(leadTrader.executionPrice).toString();
    ROI = new BigNumber(profitPerUnit).div(leadTrader.executionPrice).multipliedBy(100).toNumber();
  } else {
    try {
      const optionTokenId = BigInt(leadTrader.optionTokenId);
      const { optionNames } = generateOptionTokenData(chain, optionTokenId);
      const mainOptionName = getMainOptionName(optionTokenId, optionNames);
      const pairedOptionName = getPairedOptionName(optionTokenId, optionNames);
      const mainOptionInfo = optionsInfo[mainOptionName];
      const pairedOptionInfo = optionsInfo[pairedOptionName];
      const markPrice = (mainOptionInfo.markPrice - pairedOptionInfo.markPrice)
      const executionPrice = BigNumber(leadTrader.executionPrice.toString())
        .dividedBy(new BigNumber(10).pow(30)).toString()
        ROI = (Number(markPrice) - Number(executionPrice)) / Number(executionPrice) * 100
    } catch (error) {
    }
  }

  const _isCall = leadTrader.strategy == "BuyCallSpread"
  const aboveOrBelow = _isCall ? 'above' : 'below'
  const textColorByCallOrPut = _isCall ? 'text-green63' : 'text-[#E03F3F]'
  const bgColorByCallOrPut = _isCall ? 'bg-green63' : 'bg-[#E03F3F]'
  const bgHoverColorByCallOrPut = _isCall ? 'hover:bg-[#67EB79]' : 'hover:bg-[#F04343]'
  const textColorByProfit = ROI > 0 ? 'text-green63' : 'text-[#E03F3F]'
  const isAvailable = !(mainOptionStrikePrice > forbiddenMinMaxPrices[0] && mainOptionStrikePrice < forbiddenMinMaxPrices[1]) && address != leadTrader.address

  const copyButtonCss = `flex w-full h-[32px] shrink-0 rounded-[3px] ${bgColorByCallOrPut} items-center justify-center ${bgHoverColorByCallOrPut} active:opacity-50 active:scale-96`

  return (
    <div
      style={{
        top: `${modalXY[1]}px`,
        left: `${modalXY[0]}px`,
        
      }}
      className={twJoin(
      "absolute z-1",
      "flex flex-col",
      "w-[236px]",
      "bg-[rgba(31, 31, 31, .8)]",
      "bg-black21",
      "border-[1px] border-[#5C5C5C]"
    )}>
      <div
        className="absolute top-0 right-[-26px] cursor-pointer flex flex-row justify-center items-center w-[20px] h-[20px] rounded-[3px] bg-black21 border-[1px] border-[#5C5C5C]"
        onClick={(e) => {
          setSelectedLeadTrader(null)
        }}
      >
        <img className="w-[20px] h-[20px]" src={IconSelectedZeroDteClose} />
      </div>
      
      <div>{/* CopyTrade 모달박스 */}
        <div className="border-b border-[#5C5C5C] b-[1px] h-[96px] w-full "> {/*경계선 색깔*/}
          {/* Content section 1 */}
          {/* 프로필 */}
          <div className="flex flex-col w-full px-[10px] pt-[10px] gap-[10px]">
            {/* 유저정보*/}
            <div className="flex flex-row w-full h-[36px] justify-between pr-[2px]">
                {/*IconProfile*/}
                <img className="w-[36px] h-[36px] rounded-full object-cover" src={profileUrl} alt="Profile"/>
                {/* Twittername & shorten Address */}
                <div className="flex flex-col w-[128px] mt-[1px] items-start justfify-between">
                  <div className="flex items-center text-[16px] h-[19px] font-extrabold text-whitee0 leading-120">{shortenUserName(userName)}</div>
                  <div className="flex items-center text-[13px] h-[13px] text-gray99 font-semibold">{shortenAddress(leadTrader.address)}</div>
                </div>
                <div className="flex w-[32px] h-[32px] items-center justify-center">
                  {showTwitterInfo && <button
                  className="w-full h-full rounded-full hover:bg-black29 active:opacity-50"
                  onClick={() => {
                    window.open(X_BASE_URL + userName)
                  }}
                  >
                  <img
                  src={IconTwitter} alt="IconTwitter"/>
                  </button>}
                </div>
            </div>
            <div className="flex flex-col gap-[2px]">{/* Copy Trade  info */}
              <div className="flex flex-row h-[13px] justify-between">{/*Titles*/}
                <p className="flex w-[88px] text-[11px] text-gray99 font-semibold  whitespace-nowrap">Copy Traders</p>
                <p className="flex w-[128px] text-[11px] text-gray99 font-semibold  whitespace-nowrap">Copy Trades Volume</p>
              </div>
              <div className="flex flex-row">{/* Values */}
              <p className="flex w-[88px] text-[11px] text-whitee0 font-semibold">{advancedFormatNumber(Number(copyTraders),0)}</p>
              <p className="flex w-[128px] text-[11px] text-whitee0 font-semibold">{advancedFormatNumber(Number(copyTradesVolume), 2, "$")}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col w-full p-[10px] justify-between">
          {/* Content section 2 */}
          <div className="flex w-[216px] h-[93px] shrink-0 rounded-[3px] bg-black17 px-[10px] pt-[10px] pb-[11px]">
            {/* Position Info */}
            <div>
              {/* Prediction */}
              <div className="flex flex-col gap-[2px]">
              <div className="flex flex-row h-[13px] justify-between">{/*Titles*/}
                <p className="flex w-[88px] text-[11px] text-gray99 font-semibold  whitespace-nowrap">Prediction</p>
              </div>
              <div className="flex flex-row justify-start">{/* Values */}
              <p className="flex text-[13px] text-whitee0 font-semibold">{underlyingAsset} will be</p>
              <p className={`flex text-[13px] ${textColorByCallOrPut} font-semibold`}>&nbsp;{aboveOrBelow} {advancedFormatNumber(Number(mainOptionStrikePrice), 0, "$")}</p>
              </div>
            </div>
              {/* TotalPaid & ROI */}
              <div className="flex flex-col gap-[2px]">
              <div className="flex flex-row h-[13px] justify-between">{/*Titles*/}
                <p className="flex w-[98px] text-[11px] text-gray99 font-semibold whitespace-nowrap">Total Paid</p>
                <p className="flex w-[98px] text-[11px] text-gray99 font-semibold whitespace-nowrap">ROI</p>
              </div>
              <div className="flex flex-row">{/* Values */}
              <p className="flex w-[98px] text-[13px] text-whitee0 font-semibold">{advancedFormatNumber(Number(totalPaid), 0, "") + " USDC"}</p>
              <p className={`flex w-[98px] text-[13px] ${textColorByProfit} font-semibold`}>{advancedFormatNumber(ROI, 2, "") + "%"}</p>
              </div>
            </div>
            </div>
          </div>
          {/* Button */}
          {isAvailable && <button
          onClick={()=>{
            setEstimatedPrice(mainOptionStrikePrice)
            }}
          className={copyButtonCss}>
          <div className="flex text-center text-[13px] font-bold text-black12">Copy</div>
          </button>}
        </div>
      </div>
    </div>
  );
};




export default MainSelectedCopyTrade;
