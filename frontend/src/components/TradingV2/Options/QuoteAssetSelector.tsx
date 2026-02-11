import { NetworkQuoteAsset } from "@callput/shared";
import { SupportedChains } from "@callput/shared";
import ReusableDropdown, {
  DropdownOption,
} from "@/components/Common/ReusuableDropdown";
import { NetworkState } from "@/networks/types";
import { useAppSelector } from "@/store/hooks";
import { QA_TICKER_TO_IMG } from "@/networks/assets";

interface QuoteAssetSelectorProps {
  quoteAsset: NetworkQuoteAsset<SupportedChains>;
  setQuoteAsset: (quoteAsset: NetworkQuoteAsset<SupportedChains>) => void;
}

function QuoteAssetSelector({
  quoteAsset,
  setQuoteAsset,
}: QuoteAssetSelectorProps) {
  const { chain } = useAppSelector((state) => state.network) as NetworkState;

  const quoteAssetOptions: DropdownOption<
    NetworkQuoteAsset<SupportedChains>
  >[] = [
    {
      value: NetworkQuoteAsset[chain].ETH,
      icon: QA_TICKER_TO_IMG[chain][
        NetworkQuoteAsset[chain]
          .ETH as keyof (typeof QA_TICKER_TO_IMG)[typeof chain]
      ],
    },
    {
      value: NetworkQuoteAsset[chain].USDC,
      icon: QA_TICKER_TO_IMG[chain][
        NetworkQuoteAsset[chain]
          .USDC as keyof (typeof QA_TICKER_TO_IMG)[typeof chain]
      ],
    },
    {
      value: NetworkQuoteAsset[chain].WETH,
      icon: QA_TICKER_TO_IMG[chain][
        NetworkQuoteAsset[chain]
          .WETH as keyof (typeof QA_TICKER_TO_IMG)[typeof chain]
      ],
    },
    {
      value: NetworkQuoteAsset[chain].WBTC,
      icon: QA_TICKER_TO_IMG[chain][
        NetworkQuoteAsset[chain]
          .WBTC as keyof (typeof QA_TICKER_TO_IMG)[typeof chain]
      ],
    },
  ];

  return (
    <ReusableDropdown
      options={quoteAssetOptions}
      selectedOption={quoteAsset}
      onOptionSelect={setQuoteAsset}
    />
  );
}

export default QuoteAssetSelector;
