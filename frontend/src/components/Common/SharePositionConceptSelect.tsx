import React, { useEffect, useRef, useState } from "react";
import { twJoin } from "tailwind-merge";
import { CARD_CONCEPT_INFO, CARD_CONCEPT_LIST, CardConcept } from "./SharePosition.constant";

interface SharePositionConceptProps {
  roi: number;
  cardConcept: CardConcept;
  setCardConcept: React.Dispatch<React.SetStateAction<CardConcept>>;
}

const SharePositionConcept: React.FC<SharePositionConceptProps> = ({ roi, cardConcept, setCardConcept }) => {
  return (
    <div className="relative w-[212px] h-full">
      <div className="w-[212px] h-full">
        <div className="w-full h-[1px]" />
        {CARD_CONCEPT_LIST.map((concept, idx) => (
          <div
            key={concept}
            className={twJoin(
              "cursor-pointer flex flex-row items-center",
              "w-full h-[64px] p-[12px] rounded-[3px] bg-black29",
              idx === 0 ? "mt-[0px]" : "mt-[12px]",
              concept === cardConcept ? "border-[1px] border-greenc1" : "border-[1px] border-black29"
            )}
            onClick={() => setCardConcept(concept)}
          >
            <img className="w-[40px]" src={roi >= 0 ? CARD_CONCEPT_INFO[concept].thumbnailProfit : CARD_CONCEPT_INFO[concept].thumbnailLoss} />
            <p className="text-[15px] text-white font-bold ml-[16px]">{CARD_CONCEPT_INFO[concept].name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SharePositionConcept;
