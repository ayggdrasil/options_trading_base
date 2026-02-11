import React, { useState } from "react";
import Button from "../../common/Button";
import { twJoin } from "tailwind-merge";
import TopPerforming from "./TopPerforming";
import HighestVolume from "./HighestVolume";

type TrendingButton = "topPerforming" | "highestVolume";

// Props for the buttons component
interface ButtonsGroupProps {
  selectedButton: TrendingButton;
  setSelectedButton: (button: TrendingButton) => void;
}

const buttonStyles = {
  active: "bg-blue1f53 text-whitef2f2",
  inactive: "bg-transparent text-gray8c8c",
};

const ButtonsGroup: React.FC<ButtonsGroupProps> = ({
  selectedButton,
  setSelectedButton,
}) => {
  return (
    <div className="w-[267px] flex flex-row items-center gap-[4px]">
      <Button
        label="Top Performing"
        height="36px"
        onClick={() => setSelectedButton("topPerforming")}
        className={twJoin(
          "!text-[14px] !font-[700] !leading-[24px]",
          selectedButton === "topPerforming"
            ? buttonStyles.active
            : buttonStyles.inactive
        )}
      />
      <Button
        label="Highest Volume"
        height="36px"
        onClick={() => setSelectedButton("highestVolume")}
        className={twJoin(
          "!text-[14px] !font-[700] !leading-[24px]",
          selectedButton === "highestVolume"
            ? buttonStyles.active
            : buttonStyles.inactive
        )}
      />
    </div>
  );
};

const Trending: React.FC = () => {
  const [selectedButton, setSelectedButton] =
    useState<TrendingButton>("topPerforming");

  return (
    <section
      className={twJoin(
        "h-fit w-full flex flex-row items-center justify-center py-[72px] bg-black1214 overflow-hidden",
        "px-[0px] pt-[72px] pb-[64px]",
        "lg:px-[112px] lg:pt-[120px] lg:pb-[120px]"
      )}
    >
      <div
        className={twJoin(
          "h-fit flex flex-col items-center justify-center",
          "w-full gap-[12px]",
          "max-w-[640px]",
          "lg:max-w-[1280px] lg:gap-[40px]",
        )}
      >
        <div
          className={twJoin(
            "w-full flex items-center",
            "flex-col gap-[20px] h-[140px]",
            "lg:flex-row lg:justify-between lg:gap-0 lg:h-[72px]"
          )}
        >
          <h1 className={twJoin(
            "text-whitef2f2 font-[400] tracking-[-1px]",
            "h-[48px] text-[36px] leading-[48px]",
            "lg:h-[72px] lg:text-[48px] lg:leading-[72px]"
          )}>
            Trending
          </h1>
          <div className="h-[72px] flex flex-row items-center justify-center">
            <ButtonsGroup
              selectedButton={selectedButton}
              setSelectedButton={setSelectedButton}
            />
          </div>
        </div>

        {/* Table Area */}
        <div
          className="w-full flex flex-col"
        >
          {selectedButton === "topPerforming" ? (
            <TopPerforming />
          ) : (
            <HighestVolume />
          )}
        </div>
      </div>
    </section>
  );
};

export default Trending;
