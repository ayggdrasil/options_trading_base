import { UnderlyingAsset } from "../enums/assets";

import SymbolBTCColored from "../../assets/images/symbol-btc-colored.png";
import SymbolETHColored from "../../assets/images/symbol-eth-colored.png";

export interface AssetInfo {
  symbol: UnderlyingAsset;
  imgSrc: string;
  decimal: number;
}

export const ASSETS: Record<UnderlyingAsset, AssetInfo> = {
  [UnderlyingAsset.BTC]: {
    symbol: UnderlyingAsset.BTC,
    imgSrc: SymbolBTCColored,
    decimal: 8,
  },
  [UnderlyingAsset.ETH]: {
    symbol: UnderlyingAsset.ETH,
    imgSrc: SymbolETHColored,
    decimal: 18,
  },
  [UnderlyingAsset.ALL]: {
    symbol: UnderlyingAsset.ALL,
    imgSrc: "",
    decimal: 0,
  },
};
