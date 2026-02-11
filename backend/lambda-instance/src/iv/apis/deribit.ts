import { map } from "rxjs/operators";
import { fetchWithTimeoutAndRetry$ } from "../../utils/misc";
import { formatInstrument } from "../../utils/format";
import { forkJoin, lastValueFrom } from "rxjs";

export const getIvFromDeribit = async (
    currencies: string[]
): Promise<IIVData> => {
    try {
        const ivArr = await lastValueFrom(
            forkJoin(
                currencies.map((currency) => getDeribitIV$(currency))
            ).pipe(
                map((results) => {
                    return results.reduce(
                        (acc, { data, exchange, timestamp }) => ({
                            data: { ...acc.data, ...data },
                            exchange,
                            timestamp: Math.max(acc.timestamp, Math.floor(timestamp / 1000)),
                        }),
                        { data: {}, exchange: "DERIBIT", timestamp: 0 }
                    );
                })
            )
        );

        return ivArr;
    } catch (error) {
        console.log("getIvFromDeribit error", error);
        return { data: {}, exchange: "DERIBIT", timestamp: 0 };
    }
};

const getDeribitIV$ = (currency: string) => {
    return fetchWithTimeoutAndRetry$(
        `https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${currency}&kind=option`
    ).pipe(
        map(({ result, usOut }) => ({
            list: result,
            timestamp: Math.floor(usOut / 10 ** 3), // in sec
        })),
        map(({ list, timestamp }) => ({
            data: list.reduce((acc, { instrument_name, mark_iv }) => {
                const instrumentName = formatInstrument(
                    "DERIBIT",
                    instrument_name
                );
                if (!instrumentName) return acc;
                acc[instrumentName] = Number((mark_iv / 100).toFixed(4));
                return acc;
            }, {}),
            exchange: "DERIBIT",
            timestamp,
        }))
    );
};
