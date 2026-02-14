import { ethers } from "ethers";
import { CONFIG } from "./config.js";
import { POSITION_MANAGER_ABI } from "./abis.js";

async function main() {
    console.log("🔍 Debugging S3 Data and Contract...");

    // 1. Fetch S3 Data
    try {
        const S3_URL = "https://app-data-base.s3.ap-southeast-1.amazonaws.com/market-data.json";
        const response = await fetch(S3_URL);
        const data = await response.json();

        const btcMarket = data.data.market["BTC"];
        if (btcMarket) {
            const firstExpiry = btcMarket.expiries[0];
            const opts = btcMarket.options[firstExpiry];
            const call = opts.call[0];

            console.log("\n📦 Option Data Sample:");
            console.log("Option ID:", call.optionId);
            console.log("Type:", typeof call.optionId);
            console.log("Length:", call.optionId.length);

            // Validation
            if (typeof call.optionId === 'string' && call.optionId.startsWith('0x') && call.optionId.length === 66) {
                console.log("✅ Option ID is a valid Header + 64 char Hex String (bytes32 compatible).");
            } else {
                console.warn("⚠️ Option ID format might be an issue!");
            }

            // 2. Test Encoding
            const iface = new ethers.Interface(POSITION_MANAGER_ABI);
            try {
                const encoded = iface.encodeFunctionData("createOpenPosition", [
                    0, // underlying
                    2, // length
                    [true, false, false, false],
                    [call.optionId, ethers.ZeroHash, ethers.ZeroHash, ethers.ZeroHash],
                    [true, false, false, false],
                    0n,
                    [ethers.ZeroAddress, ethers.ZeroAddress],
                    100n,
                    0n,
                    ethers.ZeroAddress
                ]);
                console.log("✅ encoding successful with S3 ID.");
            } catch (e) {
                console.error("❌ Encoding Failed:", e);
            }
        }
    } catch (e) {
        console.error("Failed to fetch/parse S3:", e);
    }

    // 3. Check Execution Fee
    console.log("\n💰 Checking Execution Fee...");
    try {
        const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        const pm = new ethers.Contract(CONFIG.CONTRACTS.POSITION_MANAGER, POSITION_MANAGER_ABI, provider);

        // try executionFee()
        try {
            const fee = await pm.executionFee();
            console.log("✅ executionFee() returned:", fee.toString());
        } catch (e) {
            console.error("❌ executionFee() failed:", e.message);
            // Suggest alternatives?
        }

    } catch (e) {
        console.error("RPC Error:", e);
    }
}

main();
