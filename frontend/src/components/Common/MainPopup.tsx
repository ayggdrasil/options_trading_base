import { useContext, useState } from "react";
import Button from "../Common/Button";
import Checkbox from "../Common/Checkbox";
import { twJoin } from "tailwind-merge";
import { ModalContext } from "../Common/ModalContext";
import IconClosePopup from "@/assets/icon-close-popup.png";

// import PopupImage3Part1 from "@/assets/points/img-r-0.png";
// import PopupImage3Part2 from "@/assets/points/img-r-2.png";
// import PopupImage4 from "@/assets/images/img-popup-register-profile.png";
// import { CALLPUT_TELEGRAM_URL } from "@/utils/urls";
// import PopupImage5 from '@/assets/images/img-popup-weekly-position-sharing-event.png'
import HomePopupImg1 from "@/assets/home-popup-img1.png"
import HomePopupImg2 from "@/assets/home-popup-img2.png"

type Props = {
    autoShow?: boolean;
    setIsModalClosed?: (isModalClosed: boolean) => void;
};

const MainPopup = ({ autoShow, setIsModalClosed }: Props) => {
    const { closeModal } = useContext(ModalContext);
    const [hide, setHide] = useState(false);

    return (
        <div
            className={twJoin(
                "w-[584px]",
                "pt-[40px] pb-[32px]",
                "bg-black1f",
                "rounded-[3px]",
                "shadow-[0px_0px_24px_0px_rgba(10,10,10,0.75)"
            )}
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            <div className="px-[28px]">
                {/* Popup title here */}
                <div className="flex flex-row justify-between">
                    <div>
                        <p className="text-[32px] text-greene6 font-bold">Ready. Set. Earn</p>
                        <p className="text-[18px] text-whitee0 font-semibold">Maximize Your Earning on Berachain</p>
                    </div>
                    <img
                        className="cursor-pointer w-[40px] h-[40px]"
                        src={IconClosePopup}
                        onClick={() => {
                            closeModal();
                            if (setIsModalClosed) {
                                setIsModalClosed(true);
                            }
                        }}
                    />
                </div>

                {/* Popup contents here */}
                <div
                    className="flex flex-col gap-[36px] mt-[32px] overflow-y-auto custom-scrollbar"
                    style={{
                        maxHeight: "calc(80vh - 280px)",
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

            <div
                className={twJoin(
                    "flex items-center",
                    "mt-[24px] px-[28px]",
                    autoShow ? "justify-between" : "justify-end"
                )}
            >
                {autoShow && <Checkbox
                    onClick={(e) => {
                        // @dev: toggle

                        if (hide) {
                            // Remove the hideUntil key from localStorage
                            localStorage.removeItem(
                                "callput:mainPopup:hideUntil"
                            );
                        } else {
                            // Set the hideUntil key in localStorage to 7 days from now
                            localStorage.setItem(
                                "callput:mainPopup:hideUntil",
                                (
                                    new Date().getTime() +
                                    86400 * 1000
                                ).toString()
                            );
                        }

                        e.stopPropagation();
                        setHide(!hide);
                    }}
                    isChecked={hide}
                    text="Don't show for today"
                />}
                <Button
                    className="w-[144px] h-[40px]"
                    name="More details"
                    color="greenc1"
                    onClick={() => {
                        window.open("https://medium.com/moby-trade/how-to-earn-smarter-on-berachain-day-1-cf1d26021b89", "_blank")
                        closeModal();
                            if (setIsModalClosed) {
                                setIsModalClosed(true);
                            }
                    }}
                    arrow="right"
                />
            </div>
        </div>
    );
};

export default MainPopup;
