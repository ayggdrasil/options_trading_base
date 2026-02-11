import { twMerge } from "tailwind-merge";

type Props = {
  tvlCompositionArr: any[];
};

const colorMap: any = {
  WBTC: "#F7931A",
  WETH: "#E8418C",
  USDC: "#2775C9",
  HONEY: "#D97706",
};

const PoolCompositionGauge: React.FC<Props> = ({ tvlCompositionArr }) => {
  return (
    <div className="w-full mt-3 mb-6">
      <div className="flex flex-row h-[8px]">
        {tvlCompositionArr.map(({ title, ratio }) => {
          return (
            <div
              key={title}
              style={{
                backgroundColor: colorMap[title],
                width: `${ratio}%`,
              }}
              className={twMerge("h-full")}
            />
          );
        })}
      </div>
    </div>
  );
};

export default PoolCompositionGauge;
