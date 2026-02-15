import { ethers } from "ethers";

async function main() {
    console.log("🔍 Checking Option -> Vault Mapping...");

    const S3_URL = "https://app-data-base.s3.ap-southeast-1.amazonaws.com/market-data.json";
    const response = await fetch(S3_URL);
    const data = await response.json();

    const assets = ["BTC", "ETH"];
    const stats: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0 }; // Vault indices

    for (const asset of assets) {
        console.log(`\n--- ${asset} Options ---`);
        const market = data.data.market[asset];
        if (!market) continue;

        for (const expiry of market.expiries || []) {
            const opts = market.options[expiry];
            if (!opts) continue;

            // Check a few calls
            const calls = opts.call || [];
            console.log(`Expiry ${expiry}: ${calls.length} Calls`);

            for (const c of calls) {
                // Vault Index is last 2 bits of ID
                // ID is hex string. Last char is enough? 
                // Hex: ...X. X is 0-F. 
                // Last 2 bits of X?
                // BigInt(c.optionId) & 3n
                const id = BigInt(c.optionId);
                const vaultIdx = Number(id & 3n);
                stats[vaultIdx]++;

                if (c.strikePrice === 2075 || c.strikePrice === 58000 || calls.indexOf(c) < 2) {
                    console.log(`Strike ${c.strikePrice} (${c.instrument}): Vault ${vaultIdx}`);
                }
            }
        }
    }

    console.log("\n--- Vault Distribution ---");
    console.log(`Vault 0 (S_VAULT - $16k): ${stats[0]} options`);
    console.log(`Vault 1 (M_VAULT - $0):    ${stats[1]} options`);
    console.log(`Vault 2 (L_VAULT - $0):    ${stats[2]} options`);
    console.log(`Vault 3 (Unknown):         ${stats[3]} options`);
}

main();
