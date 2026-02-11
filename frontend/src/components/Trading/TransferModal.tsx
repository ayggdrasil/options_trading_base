import BigNumber from "bignumber.js";
import React, { useState } from "react";
import { twJoin } from "tailwind-merge";
import { useAccount } from "wagmi";
import { write1155Transfer } from "@/utils/contract";


import IconClose from "@assets/icon-close.svg";
import { CONTRACT_ADDRESSES } from "@/networks/addresses";
import { NetworkState } from "@/networks/types";
import { useAppSelector } from "@/store/hooks";

BigNumber.config({
    EXPONENTIAL_AT: 1000,
    DECIMAL_PLACES: 80,
});

interface ModalProps {
    data: any;
    closeModal: () => void;
}

export const TransferModal: React.FC<ModalProps> = ({ data, closeModal }) => {
    const { address } = useAccount();
    const { chain } = useAppSelector(state => state.network) as NetworkState;

    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");

    const tokenContractAddress =
        data.selectedUnderlyingAsset == "ETH"
            ? CONTRACT_ADDRESSES[chain].ETH_OPTIONS_TOKEN
            : CONTRACT_ADDRESSES[chain].BTC_OPTIONS_TOKEN;

    const decimal = data.selectedUnderlyingAsset == "ETH" ? 18 : 8;

    return (
        <div
            className={twJoin(
                "w-fit p-8 bg-black1f rounded-[3px] shadow-[0px_0px_24px_0px_rgba(10,10,10,0.75)"
            )}
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            {/* Header */}
            <div className="mb-6">
                <div className="relative flex flex-row justify-between items-center w-full mb-6">
                    <h2 className="text-2xl font-bold text-primaryc1">
                        Transfer
                    </h2>
                    <img
                        className="absolute right-[14px] cursor-pointer w-[24px] h-[24px] w-min-[24px] h-min-[24px]"
                        src={IconClose}
                        onClick={closeModal}
                    />
                </div>
                <div className="text-lg">
                    <span>{data.metrics.mainOptionName}</span>
                    <span className="text-gray-500 mx-2">/</span>
                    <span className="text-gray-500">
                        {data.metrics.pairedOptionName}
                    </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                    Size: {data.metrics.parsedSize}
                </p>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                        Recipient Address
                    </label>
                    <input
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-[3px] text-white focus:ring-2 focus:ring-primaryc1 focus:border-transparent transition-all"
                        placeholder="Enter recipient address"
                        onChange={(e) => setRecipient(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                        Amount
                    </label>
                    <input
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-[3px] text-white focus:ring-2 focus:ring-primaryc1 focus:border-transparent transition-all"
                        placeholder="Enter amount"
                        type="number"
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
            </div>

            {/* Transfer Button */}
            <button
                className="w-full mt-8 py-3 bg-primaryc1 text-black font-semibold rounded-[3px] hover:bg-opacity-90 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                onClick={async () => {
                    await write1155Transfer(
                        tokenContractAddress as any,
                        address as any, // from
                        recipient as any,
                        data.position.optionTokenId,
                        new BigNumber(amount)
                            .multipliedBy(10 ** decimal)
                            .toString()
                    );
                }}
            >
                Transfer
            </button>
        </div>
    );
};
