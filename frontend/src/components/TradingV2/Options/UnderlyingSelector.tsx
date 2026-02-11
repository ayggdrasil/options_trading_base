import { UnderlyingAsset } from "@callput/shared";
import AssetSelector from "./AssetSelector";
import ExpirySelector from "./ExpirySelector";

interface UnderlyingSelectorProps {
  selectedUnderlyingAsset: UnderlyingAsset;
  setSelectedUnderlyingAsset: (underlyingAsset: UnderlyingAsset) => void;
  selectedExpiry: number;
  setSelectedExpiry: (expiry: number) => void;
}

function UnderlyingSelector({
  selectedUnderlyingAsset,
  setSelectedUnderlyingAsset,
  selectedExpiry,
  setSelectedExpiry,
}: UnderlyingSelectorProps) {
  return (
    <div className="flex flex-row items-center justify-between bg-black181a h-[64px] px-[12px]">
      <AssetSelector
        selectedUnderlyingAsset={selectedUnderlyingAsset}
        setSelectedUnderlyingAsset={setSelectedUnderlyingAsset}
      />
      <ExpirySelector
        selectedUnderlyingAsset={selectedUnderlyingAsset}
        selectedExpiry={selectedExpiry}
        setSelectedExpiry={setSelectedExpiry}
      />
    </div>
  );
}

export default UnderlyingSelector;
