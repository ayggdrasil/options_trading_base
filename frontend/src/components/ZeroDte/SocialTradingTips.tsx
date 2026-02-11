import React, { useEffect, useState } from "react";
import tipsContent1 from "@assets/tips-content1.png";
import tipsContent2 from "@assets/tips-content2.png";
import tipsContent3 from "@assets/tips-content3.png";
import iconNextGray80 from "@assets/icon-next-gray80.svg";
import iconNextBlack12 from "@assets/icon-next-black12.svg";
import iconPrev from "@assets/icon-prev.svg";
import iconDone from "@assets/icon-done.svg";
import iconUndone from "@assets/icon-undone.svg";
import { twJoin } from "tailwind-merge";

type SocialTradingTipsProps = {
  setIsModalOpen: (value: boolean) => void;
};

const SocialTradingTips: React.FC<SocialTradingTipsProps> = ({
  setIsModalOpen,
}) => {
  const FIRST_PAGE = 1;
  const LAST_PAGE = 3;
  const [currentPage, setCurrentPage] = useState(FIRST_PAGE);
  const [currentContent, setCurrentContent] = useState<any>(null);
  const nextPage = () => {
    if (currentPage < LAST_PAGE) {
      setCurrentPage(currentPage + 1);
    }
  };
  const prevPage = () => {
    if (currentPage > FIRST_PAGE) {
      setCurrentPage(currentPage - 1);
    }
  };
  const isDoneIcon = (page: number) => {
    return currentPage >= page ? iconDone : iconUndone;
  };

  useEffect(() => {
    switch (currentPage) {
      case 1:
        setCurrentContent(tipsContent1);
        break;
      case 2:
        setCurrentContent(tipsContent2);
        break;
      case 3:
        setCurrentContent(tipsContent3);
        break;
      default:
        setCurrentContent(tipsContent1);
        break;
    }
  }, [currentPage]);

  // border-radius: 3px;
  // border: 1px solid var(--Shades-Gray-16, #292929);
  // background: var(--Shades-Gray-12, #1F1F1F);
  // box-shadow: 0px 0px 24px 0px rgba(10, 10, 10, 0.75);
  return (
    <div
      className={twJoin(
        "w-[720px] h-[545px]",
        "px-[36px] pt-[40px]",
        "bg-black1f",
        "border-[1px] rounded-[3px] border-black29",
        "shadow-[0_0_24px_0_rgba(10,10,10,0.75)"
      )}
    >
      <div className="flex flex-col justify-start gap-[36px]">
        <div className="text-greene6 text-[28px] font-extrabold leading-[24px]">
          {/*SocialTradingTips*/}
          Social Trading Tips
        </div>
        <div className="flex flex-col gap-[24px]">
          <div className="flex flex-row justify-between gap-[7px]">
            {/*Progress*/}
            <div>
              <div
                className={twJoin(
                  "flex flex-row flex-shrink-0",
                  "justify-start items-center gap-[10px] pl-[12px]",
                  "w-[192px] h-[48px] ",
                  "rounded-[6px]",
                  "bg-black1A"
                )}
              >
                <img src={isDoneIcon(1)} alt="icon-done" />
                <div className="text-whitee0 text-[15px] font-bold leading-[16px]">
                  Upgrading Profile
                </div>
              </div>
            </div>
            <img src={iconNextGray80} alt="icon-next" />
            <div>
              <div
                className={twJoin(
                  "flex flex-row flex-shrink-0",
                  "justify-start items-center gap-[10px] pl-[12px]",
                  "w-[192px] h-[48px] ",
                  "rounded-[6px]",
                  "bg-black1A"
                )}
              >
                <img src={isDoneIcon(2)} alt="icon-done" />
                <div className="text-whitee0 text-[15px] font-bold leading-[16px]">
                  Opening Positions
                </div>
              </div>
            </div>
            <img src={iconNextGray80} alt="icon-next" />
            <div>
              <div
                className={twJoin(
                  "flex flex-row flex-shrink-0",
                  "justify-start items-center gap-[10px] pl-[12px]",
                  "w-[192px] h-[48px] ",
                  "rounded-[6px]",
                  "bg-black1A"
                )}
              >
                <img src={isDoneIcon(3)} alt="icon-done" />
                <div className="text-whitee0 text-[15px] font-bold leading-[16px]">
                  Copying Trades
                </div>
              </div>
            </div>
          </div>
          <img src={currentContent} alt="tips-content" />
          <div className="flex flex-row justify-between items-center">
            {/*Buttons*/}
            <button
              className="text-whitee0 text-[15px] leading-[145%]"
              onClick={() => setIsModalOpen(false)}
            >
              Close
            </button>
            <div
              className={twJoin(
                "flex flex-row",
                "justify-between",
                "gap-[8px]"
              )}
            >
              <button
                className={twJoin(
                  "flex flex-row",
                  "justify-start items-center pl-[8px] gap-[23px]",
                  "rounded-[4px] bg-black1f",
                  "w-[128px] h-[40px]"
                )}
                onClick={() => prevPage()}
              >
                {currentPage !== FIRST_PAGE && (
                  <>
                    <img
                      width={22}
                      height={22}
                      src={iconPrev}
                      alt="icon-prev"
                    />
                    <div className="flex flex-col justify-center text-whitee0 text-[15px] font-bold leading-[145%]">
                      Previous
                    </div>
                  </>
                )}
              </button>
              <button
                className={twJoin(
                  "flex flex-row",
                  "items-center",
                  currentPage === LAST_PAGE
                    ? "justify-center"
                    : "justify-start pl-[16px] gap-[28px]",
                  "rounded-[4px] bg-greene6",
                  "w-[108px] h-[40px]"
                )}
                onClick={() => {
                  if (currentPage === LAST_PAGE) {
                    setIsModalOpen(false);
                  } else {
                    nextPage();
                  }
                }}
              >
                {currentPage === LAST_PAGE ? (
                  <div
                    className="flex flex-row justify-center text-black12 text-[15px] font-bold leading-[145%]"
                  >
                    Let's go!
                  </div>
                ) : (
                  <>
                    <div className="flex flex-row justify-center text-black12 text-[15px] font-bold leading-[145%]">
                      Next
                    </div>
                    <img
                      width={22}
                      height={22}
                      src={iconNextBlack12}
                      alt="icon-next"
                    />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialTradingTips;
