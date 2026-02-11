import { SupportedChains } from "@callput/shared";
import { NetworkQuoteAsset } from "@callput/shared";
import { useAppSelector } from "@/store/hooks";
import { getPositionManagerAllowanceForQuoteAsset, getQuoteAssetBalance } from "@/store/selectors/userSelectors";

interface QuoteAssetInfo {
  balance: string;
  isApproved: boolean;
}

const useQuoteAssetInfo = (
  quoteAsset: NetworkQuoteAsset<SupportedChains>,
  amount: string
): QuoteAssetInfo => {
  const balance = useAppSelector(state => getQuoteAssetBalance(state, quoteAsset));
  const isApproved = useAppSelector(state => getPositionManagerAllowanceForQuoteAsset(state, quoteAsset, amount));
  return { balance, isApproved };
};

export default useQuoteAssetInfo;
