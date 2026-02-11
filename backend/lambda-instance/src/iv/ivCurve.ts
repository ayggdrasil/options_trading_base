import { getMedian } from "../utils/calculation";
import { LogLevel } from "../utils/enums";
import { MESSAGE_TYPE } from "../utils/messages";
import { convertExpiryDateToTimestampInSec } from "../utils/format";
import { sendMessage } from "../utils/slack";
import { getIvFromBybit } from "./apis/bybit";
import { getIvFromDeribit } from "./apis/deribit";
import { getIvFromOkx } from "./apis/okx";
import { calculateMarkPrice, calculateUnderlyingFutures, InstrumentMarkData } from "@callput/shared";

const TIME_INVALID_THRESHOLD = 180;

export const getInstrumentMarkData = async (
    instruments,
    futuresAssetIndexMap,
    riskFreeRates
) => {
    const currentTime = Math.floor(Date.now() / 1000);

    console.log("fetching instruments..");
    const {
        active: active_instrument_name_list,
        inactive: inactive_instrument_name_list,
    } = instruments;
    const allInstruments = [
        ...active_instrument_name_list,
        ...inactive_instrument_name_list,
    ];

    console.log("fetching iv..");
    const currencies = ["BTC", "ETH"];

    let ivs: IIVData[] = await Promise.all([
        getIvFromDeribit(currencies),
        getIvFromOkx(currencies),
        getIvFromBybit(currencies),
    ]);

    ivs = ivs.filter((iv) => {
        console.log(iv.exchange, iv.timestamp, currentTime - iv.timestamp);
        return iv.timestamp > currentTime - TIME_INVALID_THRESHOLD;
    });

    if (ivs.length <= 1) {
        await sendMessage(
            `\`[Lambda][ivCurve.ts]\` ${MESSAGE_TYPE.IVS_FETCHED_FROM_LESS_THAN_TWO_SOURCES}`,
            LogLevel.WARN,
            {
                description: "ivs fetched from " + ivs.length + " source(s)",
            }
        )

        if (ivs.length == 0) {
            throw new Error("iv curve update failed");
        }
    }

    // @dev - Uncomment this block to see the ivs fetched
    // for (const iv of ivs) {
    //   console.log(iv.exchange, iv.timestamp, "ivs")
    // }

    console.log("all ivs fetched..");

    const instrumentMarkData = allInstruments.reduce(
        (acc, instrument) => {
            if (!acc[instrument]) {
                acc[instrument] = {
                    markIv: null,
                    markPrice: null,
                };
            }

            // get value from each exchange
            const ivValues = ivs
                .map((iv) => ({
                    value: iv.data[instrument],
                    exchange: iv.exchange, // Assuming each IV dataset includes an 'exchange' field for identification
                }))
                .filter(({ value }) => !!value);

            // @dev - Uncomment this block to see the ivValues fetched
            // if (instrument === "BTC-12AUG24-58500-C") {
            //   console.log(instrument, "instrument")
            //   console.log(ivValues, "ivValues")
            // }

            // if length is lower than or equal to 1, set to null (@TODO - check if this is the desired behavior)
            if (ivValues.length < 1) return acc;

            // get median value
            const medianIv = getMedian(ivValues.map(({ value }) => value));

            // get total weight
            const totalWeight = ivValues.reduce(
                (acc, { exchange }) => acc + getWeightForExchange(exchange),
                0
            );

            if (totalWeight == 0) return acc;

            // calculate iv index
            const markIv = ivValues.reduce(
                (total, { value: sourceMarkIv, exchange }) => {
                    // range adjust iv +-2% of median
                    const rangeAdjustedIV = Math.min(
                        Math.max(0.98 * medianIv, sourceMarkIv),
                        1.02 * medianIv
                    );
                    return (
                        total +
                        (rangeAdjustedIV * getWeightForExchange(exchange)) /
                            totalWeight
                    );
                },
                0
            );

            acc[instrument].markIv = markIv;

            const [
                underlyingAssetTicker,
                expiryString,
                strikePrice,
                optionTypeLetter,
            ] = instrument.split("-");

            const expiry = convertExpiryDateToTimestampInSec(expiryString);
            const underlyingFutures = calculateUnderlyingFutures(
                underlyingAssetTicker,
                expiry,
                futuresAssetIndexMap,
                riskFreeRates
            );

            const markPrice = calculateMarkPrice({
                underlyingFutures,
                strikePrice: Number(strikePrice),
                iv: markIv,
                fromTime: currentTime,
                expiry: expiry,
                isCall: optionTypeLetter === "C",
            });

            acc[instrument].markPrice = markPrice;

            return acc;
        },
        {} as InstrumentMarkData
    );

    if (Object.keys(instrumentMarkData).length == 0)
        throw new Error("iv curve update failed");

    return instrumentMarkData;
};

const getWeightForExchange = (exchange) => {
    const weight = Number(process.env[`${exchange}_IV_CURVE_WEIGHT`]);
    return isNaN(weight) ? 0 : weight; // Default to 0 if the environment variable is not a number
};