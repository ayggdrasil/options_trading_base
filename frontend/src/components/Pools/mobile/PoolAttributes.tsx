import { CONTRACT_ADDRESSES } from "@/networks/addresses";
import { BLOCK_EXPLORER } from "@/networks/apis";
import { VAULT_CREATED_AT } from "@/networks/configs";
import { NetworkState } from "@/networks/types";
import { useAppSelector } from "@/store/hooks";
import { twJoin, twMerge } from "tailwind-merge";

type Props = {};

const AttributeItem = ({ title, value, valueClassName, onClick }: any) => {
  return (
    <div className="flex flex-row justify-between">
      <p
        className={twJoin(
          "font-medium text-gray9D text-nowrap",
          "text-[12px] leading-[18px] md:text-[14px]"
        )}
      >
        {title}
      </p>
      <span
        style={{
          textDecorationSkipInk: "none",
        }}
        className={twMerge(
          twJoin(
            "font-medium text-whitef0",
            "text-[12px] leading-[18px] md:text-[14px] text-right"
          ),
          valueClassName
        )}
        onClick={onClick}
      >
        {value}
      </span>
    </div>
  );
};

const PoolAttributes: React.FC<Props> = () => {
  const { chain } = useAppSelector(state => state.network) as NetworkState;

  const contractAddress = CONTRACT_ADDRESSES[chain].S_VAULT
  const vaultCreatedAt = VAULT_CREATED_AT[chain][contractAddress];

  return (
    <div className={twJoin("flex flex-col gap-y-2")}>
      <p
        className={twJoin(
          "font-semibold text-whitef0",
          "text-[14px] leading-[21px] md:text-[16px]"
        )}
      >
        Pool Attributes
      </p>
      <div
        className={twJoin("flex flex-col gap-y-2", "p-5 rounded bg-[#171717]")}
      >
        <AttributeItem title="Type" value="Weighted" />
        <AttributeItem
          title="Contract Address"
          value={
            contractAddress.slice(0, 6) + "..." + contractAddress.slice(-4)
          }
          onClick={() => {
            window.open(
              BLOCK_EXPLORER[chain] + "/address/" + contractAddress,
              "_blank"
            );
          }}
          valueClassName="cursor-pointer underline"
        />
        <AttributeItem title="Creation Date" value={vaultCreatedAt} />
        <AttributeItem
          title="Audited and Secured by"
          value="Hacken, Omniscia, Pessimistic, Peckshield"
          onClick={() => {
            window.open(
              "https://docs.moby.trade/how-its-driven/building-the-safest-defi-protocol/smart-contract-audit-and-real-time-security-monitoring",
              "_blank"
            );
          }}
          valueClassName="cursor-pointer underline"
        />
      </div>
    </div>
  );
};

export default PoolAttributes;
