
// Prices from previous step (WETH 16FEB26)
const calls = [
    { k: 1850, p: 160.20 }, { k: 1875, p: 135.64 }, { k: 1900, p: 111.58 },
    { k: 1975, p: 46.46 }, { k: 2000, p: 30.29 }, { k: 2025, p: 18.45 },
    { k: 2050, p: 11.15 }, { k: 2075, p: 6.44 }, { k: 2100, p: 3.72 }
];

const puts = [
    { k: 1900, p: 2.20 }, { k: 1950, p: 6.79 },
    { k: 2000, p: 20.91 }, { k: 2025, p: 34.07 }, { k: 2050, p: 51.77 },
    { k: 2075, p: 72.06 }, { k: 2100, p: 94.34 }, { k: 2200, p: 191.21 }
];

const liquidity = 15311; // USDC

function main() {
    console.log("📊 Recommended WETH Spread Examples (16FEB26)\n");
    console.log("Based on Available Liquidity: $" + liquidity.toLocaleString() + " USDC");
    console.log("Estimated Max Qty = Liquidity / Strike (Conservative)\n");

    console.log("--- 📈 Bull Call Spreads (Classic Bullish) ---");
    // Buy Low K, Sell High K
    const callSpreads = [
        [2000, 2050], // ATM / OTM
        [2025, 2075], // OTM / OTM
        [1900, 2000], // ITM / ATM
        [2050, 2100], // Deep OTM
        [1850, 1900]  // Deep ITM
    ];

    callSpreads.forEach(([k1, k2]) => {
        const long = calls.find(c => c.k === k1);
        const short = calls.find(c => c.k === k2);
        if (!long || !short) return;

        const netCost = long.p - short.p;
        const width = k2 - k1;
        const maxProfit = width - netCost;
        const roi = (maxProfit / netCost) * 100;
        const maxQty = Math.floor((liquidity / k2) * 10) / 10; // Simple est

        console.log(`Buy ${k1} / Sell ${k2} Call Spread`);
        console.log(`   Cost: $${netCost.toFixed(2)} | Max Profit: $${maxProfit.toFixed(2)} | ROI: ${roi.toFixed(1)}%`);
        console.log(`   Max Qty: ~${maxQty} contracts\n`);
    });

    console.log("--- 📉 Bear Put Spreads (Classic Bearish) ---");
    // Buy High K, Sell Low K
    const putSpreads = [
        [2050, 2000], // ITM / ATM
        [2025, 1950], // ATM / OTM
        [2000, 1900], // ATM / OTM
        [2100, 2050], // ITM / ITM
        [2200, 2100]  // Deep ITM
    ];

    putSpreads.forEach(([k1, k2]) => {
        const long = puts.find(p => p.k === k1);
        const short = puts.find(p => p.k === k2);
        if (!long || !short) return;

        const netCost = long.p - short.p;
        const width = k1 - k2;
        const maxProfit = width - netCost;
        const roi = (maxProfit / netCost) * 100;
        const maxQty = Math.floor((liquidity / k1) * 10) / 10;

        console.log(`Buy ${k1} / Sell ${k2} Put Spread`);
        console.log(`   Cost: $${netCost.toFixed(2)} | Max Profit: $${maxProfit.toFixed(2)} | ROI: ${roi.toFixed(1)}%`);
        console.log(`   Max Qty: ~${maxQty} contracts\n`);
    });
}

main();
