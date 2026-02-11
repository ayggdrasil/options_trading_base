import BigNumber from "bignumber.js";

import { getDeployedContracts } from "./deployedContracts";
import { ethers } from "hardhat";

BigNumber.config({
    EXPONENTIAL_AT: 1000,
    DECIMAL_PLACES: 80,
});

export async function registerPartner(ethers: any, addressMap: any) {
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
        "Start partner registration with the deployer:",
        DEPLOYER.address
    );

    /*
     *
     * Add Partners
     *
     */

    // // 2024-07-24
    // const partnersToAdd = [
    //   "0x5215B4ee0914eA3C62Aa1d059837293C5d2ccEEf"
    // ]
    // const discountRatesToAdd = [
    //   0
    // ]
    // const termsToAdd = [
    //   253402300740
    // ]

    // // 2024-10-01
    // const partnersToAdd = [
    //   "0xF23E84d4D510C5a95c6b12de8aEc1f3Db0e10363",
    //   "0xcFA13eFc46195806BAb6716D7Ab1A31076fA4d40"
    // ]
    // const discountRatesToAdd = [
    //   3000,
    //   3000
    // ]
    // const termsToAdd = [
    //   253402300740,
    //   253402300740
    // ]

    // // 2024-10-10
    // const partnersToAdd = [
    //   "0xcFA13eFc46195806BAb6716D7Ab1A31076fA4d40",
    //   "0xcE56a24463AdF9bAF8043606867605a2849794a7",
    // ]
    // const isPartner = [
    //   true,
    //   true
    // ]
    // const discountRatesToAdd = [
    //   5000,
    //   5000
    // ]
    // const termsToAdd = [
    //   253402300740,
    //   253402300740
    // ]

    // // 2024-12-5
    // const partnersToAdd = ["0x704aD053806494a50F720B7c42d2d4124f7790a4"];
    // const isPartner = [true];
    // const discountRatesToAdd = [5000];
    // const termsToAdd = [253402300740];

    // 2025-01-22
    const partnersToAdd = [
        "0x5215b4ee0914ea3c62aa1d059837293c5d2cceef",
        "0xc2a8d15fe89414cabab8a59607d2108bfc7486e9",
        "0xcd55002a5a295a746bac55da82400edda8e3ba27",
        "0x50def0950a3bec00dd5945b221c0d8981a63557c",
        "0xf23e84d4d510c5a95c6b12de8aec1f3db0e10363",
        "0xcfa13efc46195806bab6716d7ab1a31076fa4d40",
        "0xcf9a58fdc1812f19d3916df9afb7cb9b8fb4a9df",
        "0x16a2288eb6dc6a7918cd5e2da62b362f40b377b7",
    ];
    const isPartner = [true, true, true, true, true, true, true, true];
    const discountRatesToAdd = [3000, 3000, 3000, 3000, 3000, 5000, 5000, 5000];
    const termsToAdd = [
        253402300740, 253402300740, 253402300740, 253402300740, 253402300740,
        253402300740, 253402300740, 253402300740,
    ];

    for (let i = 0; i < partnersToAdd.length; i++) {
        console.log(
            "working on ",
            partnersToAdd[i],
            " at discount rate of ",
            discountRatesToAdd[i],
            ".."
        );
        await referral.setPartner(
            partnersToAdd[i],
            isPartner[i],
            discountRatesToAdd[i],
            termsToAdd[i]
        );
    }

    // Check
    for (let i = 0; i < partnersToAdd.length; i++) {
        const isPartner = await referral.partners(partnersToAdd[i]);
        const discountRate = await referral.partnersDiscountRate(
            partnersToAdd[i]
        );
        const term = await referral.partnersTerm(partnersToAdd[i]);
        console.log(
            partnersToAdd[i],
            ":",
            isPartner.toString() +
                " / " +
                discountRate.toString() +
                " / " +
                term.toString()
        );
    }

    console.log("Partner registration completed");
}

(async () => {
    await registerPartner(ethers, null);
})();
