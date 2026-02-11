import IconCircleAnimeLoss from "../../assets/shareposition/anime-loss.png"
import IconCircleAnimeProfit from "../../assets/shareposition/anime-profit.png"
import IconCirclePepeLoss from "../../assets/shareposition/pepe-loss.png"
import IconCirclePepeProfit from "../../assets/shareposition/pepe-profit.png"

import BgConceptPepeLoss from "../../assets/bg-concept-pepe-loss.png"
import BgConceptPepeProfit from "../../assets/bg-concept-pepe-profit.png"
import BgConceptAnimeLoss from "../../assets/bg-concept-anime-loss.png"
import BgConceptAnimeProfit from "../../assets/bg-concept-anime-profit.png"

export enum CardConcept {
  Pepe = "Pepe",
  Anime = "Anime"
}

export type CardConceptInfo = {
  [key: string]: {
    name: string;
    thumbnailProfit: string;
    thumbnailLoss: string;
    imgProfit: string;
    imgLoss: string;
  };
};

export const CARD_CONCEPT_LIST = [
  CardConcept.Pepe,
  CardConcept.Anime
]

export const CARD_CONCEPT_INFO: CardConceptInfo = {
  [CardConcept.Pepe]: { name: "Pepe", thumbnailProfit: IconCirclePepeProfit, thumbnailLoss: IconCirclePepeLoss, imgProfit: BgConceptPepeProfit, imgLoss: BgConceptPepeLoss },
  [CardConcept.Anime]: { name: "Anime", thumbnailProfit: IconCircleAnimeProfit, thumbnailLoss: IconCircleAnimeLoss, imgProfit: BgConceptAnimeProfit, imgLoss: BgConceptAnimeLoss }
}