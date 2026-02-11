import { useContext, useState } from "react";
import { twJoin } from "tailwind-merge";
import { ModalContext } from "@/components/Common/ModalContext";
import upgradingProfileTip from "@/assets/mobile/upgrading-profile-tip.png";
import upgradingProfileTipTablet from "@/assets/mobile/upgrading-profile-tip-tablet.png";
import openingPositionsTip from "@/assets/mobile/opening-positions-tip.png";
import openingPositionsTipTablet from "@/assets/mobile/opening-positions-tip-tablet.png";
import copyingTradesTip from "@/assets/mobile/copying-trades-tip.png";
import copyingTradesTipTablet from "@/assets/mobile/copying-trades-tip-tablet.png";

enum TipSteps {
  ONE = 1,
  TWO = 2,
  THREE = 3,
}

const SocialTradingTips = () => {
  const [step, setStep] = useState<TipSteps>(TipSteps.ONE);
  const { closeModal } = useContext(ModalContext);

  return (
    <div className={twJoin("flex flex-col gap-y-3 px-3 md:px-6")}>
      <div className={twJoin("flex flex-col gap-y-6")}>
        <p
          className={twJoin(
            "font-bold text-center text-greene6",
            "text-[20px] leading-[24px] md:text-[22px] md:leading-[26px]"
          )}
        >
          Social Trading Tips
        </p>
        <div className={twJoin("flex flex-row justify-center")}>
          <div
            className={twJoin(
              "py-[6px] pl-1 pr-[14px] md:py-[7px] md:pr-5",
              "font-semibold text-[12px] leading-[18px] md:text-[14px] md:leading-[21px]",
              step === TipSteps.ONE ? "text-greene6" : "text-gray80",
              step >= TipSteps.ONE
                ? "bg-[url('@/assets/mobile/tip-step-one-bg.png')] bg-cover md:bg-[url('@/assets/mobile/tip-step-one-bg-tablet.png')]"
                : ""
            )}
            onClick={() => setStep(TipSteps.ONE)}
          >
            Upgrading Profile
          </div>
          <div
            className={twJoin(
              "py-[6px] pl-1 pr-[13px] md:py-[7px] md:pr-5",
              "font-semibold text-[12px] leading-[18px] md:text-[14px] md:leading-[21px]",
              step === TipSteps.TWO ? "text-greene6" : "text-gray80",
              step >= TipSteps.TWO
                ? "bg-[url('@/assets/mobile/tip-step-two-bg.png')] bg-cover md:bg-[url('@/assets/mobile/tip-step-two-bg-tablet.png')]"
                : ""
            )}
            onClick={() => setStep(TipSteps.TWO)}
          >
            Opening Positions
          </div>
          <div
            className={twJoin(
              "py-[6px] pl-1 pr-[13px] md:py-[7px] md:pr-5",
              "font-semibold text-[12px] leading-[18px] md:text-[14px] md:leading-[21px]",
              step === TipSteps.THREE ? "text-greene6" : "text-gray80",
              step >= TipSteps.THREE
                ? "bg-[url('@/assets/mobile/tip-step-three-bg.png')] bg-cover md:bg-[url('@/assets/mobile/tip-step-three-bg-tablet.png')]"
                : ""
            )}
            onClick={() => setStep(TipSteps.THREE)}
          >
            Copying Trades
          </div>
        </div>
      </div>
      {step === TipSteps.ONE && (
        <div className="flex flex-col gap-y-6">
          <div
            className={twJoin(
              "flex flex-col gap-y-5 items-center",
              "px-3 py-5 bg-black1a min-h-[222px]"
            )}
          >
            <img
              className="h-[86px] w-auto md:hidden"
              src={upgradingProfileTip}
            />
            <img
              className="h-[122px] w-auto hidden md:block"
              src={upgradingProfileTipTablet}
            />
            <div className="flex flex-col gap-y-1">
              <p
                className={twJoin(
                  "font-medium text-greene6 text-center",
                  "text-[12px] leading-[18px] md:text-[14px]"
                )}
              >
                Connect your X (Twitter) profile to make it appear on the chart
                when you open a position.
              </p>
              <p
                className={twJoin(
                  "font-medium text-whitef0 text-center",
                  "text-[12px] leading-[18px] md:text-[14px]"
                )}
              >
                Add your profile to increase the chance of being copied and earn
                a <span className="text-greene6">30% rebate.</span>
              </p>
            </div>
          </div>
          <div
            className={twJoin(
              "flex justify-center items-center",
              "h-10 w-full rounded bg-[#E6FC8D]",
              "font-bold text-black0a12",
              "text-[14px] leading-[21px] md:text-[16px]"
            )}
            onClick={() => setStep(TipSteps.TWO)}
          >
            Next
          </div>
        </div>
      )}
      {step === TipSteps.TWO && (
        <div className="flex flex-col gap-y-6">
          <div
            className={twJoin(
              "flex flex-col gap-y-5 items-center min-h-[222px]",
              "px-3 pt-5 pb-[10px] bg-black1a"
            )}
          >
            <img
              className="h-[52px] w-auto md:hidden"
              src={openingPositionsTip}
            />
            <img
              className="h-[84px] w-auto hidden md:block"
              src={openingPositionsTipTablet}
            />
            <div className="flex flex-col">
              <div className="flex flex-row gap-x-1">
                <span
                  className={twJoin(
                    "font-medium text-whitef0",
                    "text-[12px] leading-[18px] md:text-[14px]"
                  )}
                >
                  1.{" "}
                </span>
                <p
                  className={twJoin(
                    "font-medium text-whitef0 ml-[2px]",
                    "text-[12px] leading-[18px] md:text-[14px]"
                  )}
                >
                  Select <span className="text-greene6">underlying asset</span>{" "}
                  between BTC & ETH
                </p>
              </div>
              <div className="flex flex-row gap-x-1">
                <span
                  className={twJoin(
                    "font-medium text-whitef0",
                    "text-[12px] leading-[18px] md:text-[14px]"
                  )}
                >
                  2.{" "}
                </span>
                <p
                  className={twJoin(
                    "font-medium text-whitef0",
                    "text-[12px] leading-[18px] md:text-[14px]"
                  )}
                >
                  Click expected price{" "}
                  <span className="text-greene6">on the chart</span>
                </p>
              </div>
              <div className="flex flex-row gap-x-1">
                <span
                  className={twJoin(
                    "font-medium text-whitef0",
                    "text-[12px] leading-[18px] md:text-[14px]"
                  )}
                >
                  3.{" "}
                </span>
                <div className="flex flex-col">
                  <p
                    className={twJoin(
                      "font-medium text-whitef0",
                      "text-[12px] leading-[18px] md:text-[14px]"
                    )}
                  >
                    <span className="text-greene6">Enter the payment</span> and
                    click <span className="text-greene6">Buy</span>to open
                    position
                  </p>
                  <p
                    className={twJoin(
                      "font-medium text-gray9D",
                      "text-[10px] leading-[15px] md:text-[12px]"
                    )}
                  >
                    * Your positions appear on the chart. If users copy your
                    position, you get a 30% fee rebate.
                  </p>
                </div>
              </div>
              <div className="flex flex-row gap-x-1">
                <span
                  className={twJoin(
                    "font-medium text-whitef0 text-center",
                    "text-[12px] leading-[18px] md:text-[14px]"
                  )}
                >
                  4.{" "}
                </span>
                <p
                  className={twJoin(
                    "font-medium text-whitef0",
                    "text-[12px] leading-[18px] md:text-[14px]"
                  )}
                >
                  Manage positions by{" "}
                  <span className="text-greene6">closing</span>any time before
                  expiry or <span className="text-greene6">settling</span> upon
                  expiry
                </p>
              </div>
            </div>
          </div>
          <div
            className={twJoin(
              "flex justify-center items-center",
              "h-10 w-full rounded bg-[#E6FC8D]",
              "font-bold text-black0a12",
              "text-[14px] leading-[21px] md:text-[16px]"
            )}
            onClick={() => setStep(TipSteps.THREE)}
          >
            Next
          </div>
        </div>
      )}
      {step === TipSteps.THREE && (
        <div className="flex flex-col gap-y-6">
          <div
            className={twJoin(
              "flex flex-col gap-y-5 items-center",
              "px-3 py-5 bg-black1a min-h-[222px]"
            )}
          >
            <img className="h-[48px] w-auto md:hidden" src={copyingTradesTip} />
            <img
              className="h-[78px] w-auto hidden md:block"
              src={copyingTradesTipTablet}
            />
            <div className="flex flex-col">
              <div className="flex flex-row gap-x-1">
                <span
                  className={twJoin(
                    "font-medium text-whitef0",
                    "text-[12px] leading-[18px] md:text-[14px]"
                  )}
                >
                  1.{" "}
                </span>
                <p
                  className={twJoin(
                    "font-medium text-whitef0 ml-[2px]",
                    "text-[12px] leading-[18px] md:text-[14px]"
                  )}
                >
                  Select a{" "}
                  <span className="text-greene6">Lead Trader’s position</span>{" "}
                  displayed on the chart
                </p>
              </div>
              <div className="flex flex-row gap-x-1">
                <span
                  className={twJoin(
                    "font-medium text-whitef0",
                    "text-[12px] leading-[18px] md:text-[14px]"
                  )}
                >
                  2.{" "}
                </span>
                <p
                  className={twJoin(
                    "font-medium text-whitef0",
                    "text-[12px] leading-[18px] md:text-[14px]"
                  )}
                >
                  Click <span className="text-greene6">Copy</span> to replicate
                  the trade
                </p>
              </div>
              <div className="flex flex-row gap-x-1">
                <span
                  className={twJoin(
                    "font-medium text-whitef0",
                    "text-[12px] leading-[18px] md:text-[14px]"
                  )}
                >
                  3.{" "}
                </span>
                <div className="flex flex-col">
                  <p
                    className={twJoin(
                      "font-medium text-whitef0",
                      "text-[12px] leading-[18px] md:text-[14px]"
                    )}
                  >
                    <span className="text-greene6">Enter the payment</span> and
                    click <span className="text-greene6">Buy</span>to open
                    position
                  </p>
                  <p
                    className={twJoin(
                      "font-medium text-gray9D",
                      "text-[10px] leading-[15px] md:text-[12px]"
                    )}
                  >
                    * Users can be both “Lead Trader” and “Copy Traders” at the
                    same time.
                  </p>
                  <p
                    className={twJoin(
                      "font-medium text-gray9D",
                      "text-[10px] leading-[15px] md:text-[12px]"
                    )}
                  >
                    * Even when executing a Copy Trade, position will be added
                    on the chart.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div
            className={twJoin(
              "flex justify-center items-center",
              "h-10 w-full rounded bg-[#E6FC8D]",
              "font-bold text-black0a12",
              "text-[14px] leading-[21px] md:text-[16px]"
            )}
            onClick={() => closeModal()}
          >
            Let’s go!
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialTradingTips;
