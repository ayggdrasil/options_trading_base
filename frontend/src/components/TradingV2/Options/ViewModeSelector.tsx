import { twJoin } from "tailwind-merge";
import IconConfigOn from "@/assets/img/icon/config-on.png";
import IconConfigOff from "@/assets/img/icon/config-off.png";

export type ViewMode =
  | "Order Summary"
  | "Profit Simulation"
  | "Slippage Settings";

function ViewModeSelector({
  viewMode,
  setViewMode,
}: {
  viewMode: ViewMode;
  setViewMode: (viewMode: ViewMode) => void;
}) {
  return (
    <div className="h-[60px] flex flex-row items-center gap-[12px] px-[20px] py-[12px]">
      <div className="h-full flex flex-row items-center gap-[4px]">
        <TabButton
          isActive={viewMode === "Order Summary"}
          onClick={() => setViewMode("Order Summary")}
          label="Order Summary"
          width="w-[136px]"
        />
        <TabButton
          isActive={viewMode === "Profit Simulation"}
          onClick={() => setViewMode("Profit Simulation")}
          label="Profit Simulation"
          width="w-[136px]"
        />
      </div>

      {/* Divider */}
      <div className="w-[1px] h-[28px] mx-[4px] bg-black2023" />

      <TabButton
        isActive={viewMode === "Slippage Settings"}
        onClick={() => setViewMode("Slippage Settings")}
        label="Slip"
        width="w-[42px]"
        iconActive={IconConfigOn}
        iconInactive={IconConfigOff}
      />
    </div>
  );
}

export default ViewModeSelector;

const TabButton = ({
  isActive,
  onClick,
  label,
  width,
  iconActive,
  iconInactive,
}: {
  isActive: boolean;
  onClick: () => void;
  label: string;
  width: string;
  iconActive?: string;
  iconInactive?: string;
}) => (
  <button
    className={twJoin(
      "cursor-pointer h-full flex flex-row items-center justify-center",
      "rounded-[6px]",
      width,
      "text-[14px] font-[700] leading-[24px]",
      "active:scale-95 active:opacity-80",
      !iconActive && "hover:text-whitef2f2 hover:bg-black292c",
      !iconActive && isActive
        ? "!text-blue278e !bg-black2023"
        : "text-gray8c8c bg-transparent"
    )}
    onClick={onClick}
  >
    {iconActive ? (
      <img
        src={isActive ? iconActive : iconInactive}
        className="w-[16px] h-[16px]"
      />
    ) : (
      <p>{label}</p>
    )}
  </button>
);
