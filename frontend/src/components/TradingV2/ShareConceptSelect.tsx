import {
  CARD_CONCEPT_INFO,
  CARD_CONCEPT_LIST,
  CardConcept,
} from "@/constants/share";
import React from "react";
import { twJoin } from "tailwind-merge";

interface ShareConceptProps {
  roi: number;
  cardConcept: CardConcept;
  setCardConcept: React.Dispatch<React.SetStateAction<CardConcept>>;
}

const ShareConcept: React.FC<ShareConceptProps> = ({
  roi,
  cardConcept,
  setCardConcept,
}) => {
  return (
    <div className="relative w-[212px] h-full">
      <div className="w-[212px] h-full">
        <div className="w-full h-[1px]" />
        {CARD_CONCEPT_LIST.map((concept, idx) => (
          <div
            key={concept}
            className={twJoin(
              "cursor-pointer flex flex-row items-center",
              "w-full h-[64px] p-[12px] rounded-[3px] bg-black2023",
              "hover:bg-black292c active:scale-95 active:opacity-80",
              idx === 0 ? "mt-[0px]" : "mt-[12px]",
              concept === cardConcept &&
                "!bg-black2023 !border-[1px] !border-blue278e"
            )}
            onClick={() => setCardConcept(concept)}
          >
            <img
              className="w-[40px]"
              src={
                roi >= 0
                  ? CARD_CONCEPT_INFO[concept].thumbnailProfit
                  : CARD_CONCEPT_INFO[concept].thumbnailLoss
              }
            />
            <p className="text-whitef2f2 text-[15px] font-[700] leading-[24px] ml-[16px]">
              {CARD_CONCEPT_INFO[concept].name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShareConcept;
