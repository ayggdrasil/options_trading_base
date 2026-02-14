const S3_URL = "https://app-data-base.s3.ap-southeast-1.amazonaws.com/market-data.json";

async function check() {
    try {
        const res = await fetch(S3_URL);
        const data = await res.json();
        const eth = data.data.market['ETH'];

        console.log("ETH Spot Price:", eth.spotPrice);
        console.log("ETH Index Price:", eth.indexPrice);

        const expiry = Object.keys(eth.options)[0];
        if (expiry) {
            const call = eth.options[expiry].call[0];
            console.log("Sample Option MarkPrice:", call.markPrice);
            console.log("Sample Option Strike:", call.strikePrice);
        }
    } catch (e) {
        console.error(e);
    }
}

check();
