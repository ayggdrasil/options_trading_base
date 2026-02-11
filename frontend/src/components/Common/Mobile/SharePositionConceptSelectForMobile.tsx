import React from "react";
import { twJoin } from "tailwind-merge";
import { CARD_CONCEPT_INFO, CARD_CONCEPT_LIST, CardConcept } from "../SharePosition.constant";

interface SharePositionConceptProps {
  roi: number;
  cardConcept: CardConcept;
  setCardConcept: React.Dispatch<React.SetStateAction<CardConcept>>;
}

const SharePositionConcept: React.FC<SharePositionConceptProps> = ({
  roi,
  cardConcept,
  setCardConcept,
}) => {
  return (
    <div className="flex justify-between w-full max-w-[450px]">
      {CARD_CONCEPT_LIST.map((concept, idx) => (
        <div
          key={concept}
          className={twJoin(
            "flex flex-row items-center",
            "w-[60px] h-[60px] rounded bg-black29",
            concept === cardConcept
              ? "border-[1px] border-greene6"
              : "border-[1px] border-black1c"
          )}
          onClick={() => setCardConcept(concept)}
        >
          <img
            className="w-[58px] h-auto rounded"
            src={roi >= 0 ? CARD_CONCEPT_INFO[concept].thumbnailProfit : CARD_CONCEPT_INFO[concept].thumbnailLoss}
          />
        </div>
      ))}
    </div>
  );
};

export default SharePositionConcept;
