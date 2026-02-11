import BigNumber from "bignumber.js";

import { getDeployedContracts } from "./deployedContracts";
import { ethers } from "hardhat";

BigNumber.config({
    EXPONENTIAL_AT: 1000,
    DECIMAL_PLACES: 80,
});

export async function registerAffiliate(ethers: any, addressMap: any) {
    const [
        DEPLOYER,
        KEEPER_OPTIONS_MARKET,
        KEEPER_POSITION_PROCESSOR,
        KEEPER_SETTLE_OPERATOR,
        KEEPER_POSITION_VALUE_FEEDER,
        KEEPER_POSITION_VALUE_FEEDER_SUB1,
        KEEPER_SPOT_PRICE_FEEDER,
        KEEPER_SPOT_PRICE_FEEDER_SUB1,
        KEEPER_FEE_DISTRIBUTOR,
        KEEPER_CLEARING_HOUSE,
        TEST_USER1,
        TEST_USER2,
    ] = await (ethers as any).getSigners();
    const { referral } = await getDeployedContracts(ethers, addressMap);
    console.log(
        "Start affiliate registration with the deployer:",
        DEPLOYER.address
    );

    // // 2024-08-29
    // const affiliatesToAdd = [
    //   "0x168d8B164bC37820C3Cb9E49B6E8b788b3D9366B",
    // ]

    // // 2024-07-10
    // const affiliatesToAdd = [
    //   "0x73572065b5a52c8CbFEBF0630072EAAf90f10bB9",
    //   "0x4d11d8edcA605E92965339Ca3aF5447111111111",
    //   "0xca288eabadc6ed48cda2440a5b068cda8ae9995e"
    // ]

    // // 2024-09-19
    // const affiliatesToAdd = [
    //   "0x20F4AC652a45DA0B1c1ff14ffCF23Fa26f80d78e",
    // ]

    // // 2024-09-19
    // const affiliatesToAdd = [
    //   "0x20F4AC652a45DA0B1c1ff14ffCF23Fa26f80d78e",
    // ]

    // 2024-10-22
    // const affiliatesToAdd = [
    //   "0x429D298DC21A9b6B3571196e1c1386786faB9BA1",
    // ]

    // 2025-01-21
    const affiliatesToAdd = [
        "0x220b522979b9f2ca0f83663fcff2ee2426aa449c",
        "0x38280b86c66788eda4637033074c2c0ff18552ef",
        "0xe9c9b648b899e1662fab21e983725ed3f299f4e9",
        "0xabf47ac2dfa7112977fa22d55590ebd351c3aefe",
        "0x313e2223436e151c6b4167c63a5e0324ac8fbced",
        "0xcd48347afbf0db796955497bb3370cef512994a7",
        "0x507e2135da72698044a8e6ff042324a18d73597b",
        "0x656043c240b7722810ddd339cc4f6daaae436f53",
        "0xf8bc58b556403dcc4d05e3fd67e052f9324869ca",
        "0x6e1e9701bee5f23fbb9a22f5e7c0c18e09f6ec2d",
        "0x0bbaf32bc6f843042a0082cc822a6add6d636c3e",
        "0x36ba09b6d77b49fab174aa1e97a7c0677476eabd",
        "0x51fc339d57541ed05fe5a88a6c970373c733edbc",
        "0x59e40752be0f745b63ff918089743ca8dfb04151",
        "0x04e7913b5186bbd5a738e096177e20473464d326",
        "0xd0eb787a913c41d4eedacc32b08771b89db7a7de",
        "0xbf7b02df420520d07c0aa1f67706f142b2bc0a0a",
        "0xa641bfbf23340d5014d50a674a02cf193a694870",
        "0xe06cc74a01d2585c457020f20755dd6afb885e9b",
        "0xcd55002a5a295a746bac55da82400edda8e3ba27",
        "0x3eada457690661775e560a2285594363c9be1364",
        "0x14cff5a34109f9696d32c5842baf018016870751",
        "0xb7b1a0ff66840ce7c70d21ad561644564b20fbcf",
        "0x093615032936fe291e9e18be0743a4143a295e8a",
        "0xd0d9b4ad7d1951858bd7be52e3b7bb53e6100f0c",
        "0xa5c0ac1b11a9da27af7e6aabbf6eb497917eb145",
        "0x05b5d413e8350460ce37c40c41f98b4a37e7a241",
        "0xdfa7671bd325412cb2d5e7199ebc79f882bbf6a1",
        "0x79374fdf37d880354c89cbdb89a50c4471aee336",
        "0x55e36f90b8ffca6dae79d67025f0e3fb5516a991",
        "0x4e9c104d24ca8aa27c3e1a5d9d3249e96c5bbd80",
        "0x7924259dab32774a5a34ef07ae6a834777a78033",
        "0x566339480990eadee8f30153785e580df875e2bd",
        "0xc23816d5c97ccf07f57e8701859d6b524e5a320c",
        "0x94c71d1780ff80e6154f9e885132bb9d3c207ffd",
        "0x1848d26f76c8f8ab416f8aaf064506d9d77183ff",
        "0xf0259de4b474a5d9e2e2b227626b50b0769de08f",
        "0x73572065b5a52c8cbfebf0630072eaaf90f10bb9",
        "0x4d11d8edca605e92965339ca3af5447111111111",
        "0xca288eabadc6ed48cda2440a5b068cda8ae9995e",
        "0x6d4f97bc946e75b3e7ecdd88dedacbe46cd41870",
        "0x47655c3b13dd14a54f8ae3cf17cfda12f7f91cd7",
        "0x168d8b164bc37820c3cb9e49b6e8b788b3d9366b",
        "0x5215b4ee0914ea3c62aa1d059837293c5d2cceef",
        "0xcde6431e65e2c3d3b53718f5d41c555b59ae14c3",
        "0xdee3e2d61338c38e293dced142384a2232941e62",
        "0x20f4ac652a45da0b1c1ff14ffcf23fa26f80d78e",
        "0x429d298dc21a9b6b3571196e1c1386786fab9ba1",
    ];

    const accountsBatch = [];
    const discountRatesBatch = [];
    const feeRebateRateBatch = [];

    for (let i = 0; i < affiliatesToAdd.length; i++) {
        accountsBatch.push(affiliatesToAdd[i]);
        discountRatesBatch.push(1500);
        feeRebateRateBatch.push(3000);
    }

    await referral.addToAffiliatesInBatch(
        accountsBatch,
        discountRatesBatch,
        feeRebateRateBatch
    );

    for (let i = 0; i < affiliatesToAdd.length; i++) {
        const affiliatesDiscountRate = await referral.affiliatesDiscountRate(
            affiliatesToAdd[i]
        );
        const affiliateFeeRebateRate = await referral.affiliatesFeeRebateRate(
            affiliatesToAdd[i]
        );
        console.log(
            affiliatesToAdd[i],
            ":",
            affiliatesDiscountRate.toString() +
                " / " +
                affiliateFeeRebateRate.toString()
        );
    }

    console.log("Affiliate registration completed");
}

(async () => {
    await registerAffiliate(ethers, null);
})();
