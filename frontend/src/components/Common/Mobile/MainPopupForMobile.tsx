import { useContext, useState } from "react";
import { twJoin } from "tailwind-merge";
import { ModalContext } from "../ModalContext";
import Button from "../Button";
import PrimaryShapeImg from "@/assets/mobile/primary-shape.svg";
import IconClosePopup from "@/assets/icon-close-popup.png";

// import OpeningImg from "@/assets/mobile/opening.png";
// import UpgradingProfileImg from "@/assets/mobile/upgrading-profile.png";
// import { CALLPUT_TELEGRAM_URL } from "@/utils/urls";
import HomePopupImg1 from "@/assets/home-popup-img1.png"
import HomePopupImg2 from "@/assets/home-popup-img2.png"

export default function MainPopupForMobile() {
  const { closeModal } = useContext(ModalContext);
  const [hide, setHide] = useState(false);

  return (
    <div
      className={twJoin(
        "flex flex-col px-3 items-center md:px-6"
      )}
    >
      <div className="flex flex-col">
        {/* Popup title here */}
        <div className="flex flex-row justify-between">
          <div>
              <p className="text-[28px] text-greene6 font-bold">Ready. Set. Earn</p>
              <p className="text-[15px] text-whitee0 font-semibold">Maximize Your Earning on Berachain</p>
          </div>
          <img
              className="cursor-pointer w-[40px] h-[40px]"
              src={IconClosePopup}
              onClick={() => {
                  closeModal();
              }}
          />
        </div>

        {/* Popup contents here */}
        <div
          className="flex flex-col gap-[36px] mt-[32px] overflow-y-auto custom-scrollbar"
          style={{
            maxHeight: "calc(85vh - 280px)",
          }}
        >
          <div className="rounded-[6px] bg-black1a p-[24px]">
              <img className="w-full" src={HomePopupImg1} />
          </div>
          
          {/* <div className="w-full">
            <img className="min-w-full w-full h-auto" src={HomePopupImg2} />
          </div> */}
        </div>
      </div>
      <div className="w-full flex flex-row items-center justify-between mt-[20px]">
        <div className="flex flex-row gap-x-2">
          <div
            className={twJoin(
              "flex justify-center items-center",
              "w-4 h-4 rounded overflow-hidden",
              "border border-solid",
              hide ? "bg-whitef0 border-whitef0" : "border-gray9D"
            )}
            onClick={() => {
              if (hide) {
                localStorage.removeItem("callput:mainPopup:hideUntil");
              } else {
                localStorage.setItem(
                  "callput:mainPopup:hideUntil",
                  (new Date().getTime() + 86400 * 1000).toString()
                );
              }
              setHide(!hide);
            }}
          >
            <img
              className={twJoin(
                "mt-[1px] flex-shrink-0",
                hide ? "block" : "hidden"
              )}
              src={PrimaryShapeImg}
            />
          </div>
          <p
            className={twJoin(
              "font-bold text-gray9D",
              "text-[12px] leading-[18px] md:text-[14px] md:leading-[20px]"
            )}
          >
            Don't show for today
          </p>
        </div>
        <Button
            className="w-[144px] h-[40px]"
            name="More details"
            color="greenc1"
            onClick={() => {
              window.open("https://medium.com/moby-trade/how-to-earn-smarter-on-berachain-day-1-cf1d26021b89", "_blank")
              closeModal();
            }}
            arrow="right"
        />
      </div>
    </div>
  );
}
