import { SupportedChains } from "@callput/shared";
import { RootState } from "../store";
import { BaseQuoteAsset, NetworkQuoteAsset } from "@callput/shared";
import { OlpKey } from "@/utils/enums";
import BigNumber from "bignumber.js";

export const getPositionManagerAllowanceForQuoteAsset = (state: RootState, quoteAsset: NetworkQuoteAsset<SupportedChains>, quoteAssetAmount: string) => {
  if (quoteAsset === "ETH") return true;
  const allowanceAmount = quoteAsset === BaseQuoteAsset.WBTC
    ? state.user.allowance.controller.quoteToken.wbtc
    : quoteAsset === BaseQuoteAsset.WETH
      ? state.user.allowance.controller.quoteToken.weth
      : quoteAsset === BaseQuoteAsset.USDC
        ? state.user.allowance.controller.quoteToken.usdc
        : "0";
  return new BigNumber(allowanceAmount).isGreaterThanOrEqualTo(quoteAssetAmount);
}

export const getQuoteAssetBalance = (state: RootState, quoteAsset: NetworkQuoteAsset<SupportedChains>) => state.user.balance.quoteAsset[quoteAsset];

export const getOlpManagerAllowanceForQuoteAsset = (state: RootState, olpKey: OlpKey, quoteAsset: NetworkQuoteAsset<SupportedChains>) => {
  const olpManager = olpKey === OlpKey.sOlp ? state.user.allowance.pool.sOlpManager : olpKey === OlpKey.mOlp ? state.user.allowance.pool.mOlpManager : state.user.allowance.pool.lOlpManager;

  switch (quoteAsset) {
    case BaseQuoteAsset.WBTC:
      return olpManager.wbtc;
    case BaseQuoteAsset.WETH:
      return olpManager.weth;
    case BaseQuoteAsset.USDC:
      return olpManager.usdc;
    default:
      return "0";
  }
}

export const getOlpBalance = (state: RootState, olpKey: OlpKey) => state.user.balance.olpToken[olpKey];

export const getCooldownTimestampInSec = (state: RootState, olpKey: OlpKey) => {
  const cooldown = state.user.balance.cooldown[olpKey];
  return Number(cooldown) || 0;
}