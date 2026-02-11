import React, { useRef } from "react";
import { useAccount } from "wagmi";
import {connectTwitter, removeTwitter} from "@/utils/twitter.ts";
import { useAppSelector } from "@/store/hooks";
import { NetworkState } from "@/networks/types";

type TwitterProps = {
    isTwitterConnected: boolean,
    setIsTwitterConnected: (value: boolean) => void
}

const Twitter: React.FC<TwitterProps> = ({
    isTwitterConnected, setIsTwitterConnected
}) => {
    const { address } = useAccount();
    const { chain } = useAppSelector(state => state.network) as NetworkState;
    const referralsRef = useRef<HTMLDivElement>(null)
    const textColor = isTwitterConnected ? "text-gray80" : "text-greene6";
    const text = isTwitterConnected ? "Remove Twitter" : "Connect Twitter";

    return (
        <div ref={referralsRef} className="relative">
            <div
                className="flex flex-col justify-center"
                onClick={() => {isTwitterConnected
                    ? removeTwitter(chain, address)
                    : connectTwitter(chain, address)
                }}
            >
                <button
                    className="w-[110px] h-[26px] shrink-0 bg-black29 rounded-full flex items-center justify-center hover:bg-black33 active:opacity-50 active:scale-96">
                <span
                    className={`w-[85px] h-[14px] text-[12px] ${textColor} font-semibold leading-[14px] whitespace-nowrap`}>{text}</span>
                </button>
            </div>
        </div>
    )
}

export default Twitter;