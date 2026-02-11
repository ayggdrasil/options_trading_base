import React from "react";
import { parseInstrument } from "../../../../utils/options";
import { UnderlyingAsset } from "../../../../shared/enums/assets";
import { useTrending } from "../../../../hooks/useTrending";
import { HighestVolumeOption } from "../../../../contexts/data/TrendingContext";
import OptionsTable from "../OptionsTable";

// Helper function to determine if an asset is crypto
const isCryptoAsset = (asset: UnderlyingAsset): boolean => {
  return asset === UnderlyingAsset.BTC || asset === UnderlyingAsset.ETH;
};

const HighestVolume: React.FC = () => {
  const { data: leaderBoardData } = useTrending();

  // Separate equity and crypto options
  const equityOptions: HighestVolumeOption[] = [];
  const cryptoOptions: HighestVolumeOption[] = [];

  leaderBoardData.highestVolumeOptions.forEach((item) => {
    const parsedInstrument = parseInstrument(item.instrument);
    const underlyingAsset = parsedInstrument.underlyingAsset as UnderlyingAsset;

    if (isCryptoAsset(underlyingAsset)) {
      cryptoOptions.push(item);
    } else {
      equityOptions.push(item);
    }
  });

  return (
    <div className="flex flex-col gap-[12px] lg:flex-row lg:gap-[24px]">
      {/* Equity Options Table */}
      <OptionsTable title="Equity Options" items={equityOptions} mode="volume" />

      {/* Crypto Options Table */}
      <OptionsTable title="Crypto Options" items={cryptoOptions} mode="volume" />
    </div>
  );
};

export default HighestVolume;

