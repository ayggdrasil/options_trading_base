import { useAppSelector } from "@/store/hooks";
import { OlpKey } from "@/utils/enums";
import { useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import PerformanceChart from "../mobile/PerformanceChart";
import RevenueChart from "../mobile/RevenueChart";
import PoolArchitecture from "./PoolArchitecture";
import PoolAttributes from "./PoolAttributes";
import PoolComposition from "./PoolComposition";

type Props = {
  olpKey: OlpKey;
  olpDetailData: any;
};

const tabChart = ["OLP Architecture", "OLP Token Performance", "Revenue"];

const OLPDetailParts: React.FC<Props> = ({ olpKey, olpDetailData }) => {
  const { isIpad } = useAppSelector((state) => state.device);

  const tabRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const [currentTab, setCurrentTab] = useState("OLP Architecture");
  const [tabWidths, setTabWidths] = useState<number[]>([]);
  const isSmall = window.innerWidth < 500;

  useEffect(() => {
    const widths = tabRefs.current.map((ref) => ref?.offsetWidth || 0);
    setTabWidths(widths);
  }, []);

  const handleTabClick = (tab: string, index: number) => {
    setCurrentTab(tab);
    if (tabRefs.current[index]) {
      tabRefs.current[index]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
  };

  return (
    <div className={twJoin("overflow-y-auto")}>
      <div className="w-screen flex flex-col">
        <div
          className={twJoin(
            "mx-3 md:mx-6 pb-3 flex flex-nowrap gap-4 text-lg md:text-xl font-bold",
            "w-auto overflow-x-auto scrollbar-hide bg-black03",
            " fixed top-[34px] left-0 right-0 z-10"
          )}
        >
          {tabChart.map((tab, index) => {
            return (
              <div
                className={twJoin(
                  "whitespace-nowrap",
                  currentTab === tab ? "text-contentBright" : "text-gray4a"
                )}
              >
                <div
                  style={{
                    width:
                      index === tabChart.length - 1 && isSmall
                        ? `calc(100vw - ${tabWidths[index - 1]}px`
                        : "auto",
                  }}
                >
                  <p
                    className="w-fit"
                    key={index}
                    ref={(el) => (tabRefs.current[index] = el)}
                    onClick={() => handleTabClick(tab, index)}
                  >
                    {tab}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-10">
          {currentTab === "OLP Architecture" && (
            <div className="flex flex-col gap-y-3 px-3 md:px-6 pb-[34px]">
              <PoolArchitecture />
              <PoolComposition olpKey={olpKey} />
              <PoolAttributes />
              {isIpad && (
                <div
                  style={{
                    height:
                      window.innerHeight > 1080 ? `calc(100dvh - 1080px)` : 0,
                  }}
                ></div>
              )}
            </div>
          )}
          {currentTab === "OLP Token Performance" && (
            <PerformanceChart data={olpDetailData} olpKey={olpKey} />
          )}
          {currentTab === "Revenue" && (
            <RevenueChart data={olpDetailData} olpKey={olpKey} />
          )}
        </div>
      </div>
    </div>
  );
};

export default OLPDetailParts;
