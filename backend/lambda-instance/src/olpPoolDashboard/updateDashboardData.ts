// update dashboard data to S3

import { fetchDataFromS3, invalidateCloudfrontCache, putS3 } from "../utils/aws";
import { getDailyOlpPerformance } from "./getDailyOlpPerformance";
import { getDailyRevenue } from "./getDailyRevenue";
import dayjs from "dayjs";

export const updateDashboardData = async () => {
    try {
        const { DUNE_DATA_BUCKET, APP_DATA_OLP_DASHBOARD_KEY, APP_DATA_CLOUDFRONT_DISTRIBUTION_ID } = process.env;
        const Bucket = DUNE_DATA_BUCKET;
        const Key = APP_DATA_OLP_DASHBOARD_KEY;

        const UPDATE_THRESHOLD_HOURS = 12;
        const PERIOD_LIST = ["30", "60", "180"]

        const now = dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss');
        const initialData = {
            last_updated: now,
            olp_performance: {},
            revenue: {}
        }
        const data = await fetchDataFromS3({Bucket, Key, initialData });
        
        const lastUpdated = dayjs(data.last_updated).format('YYYY-MM-DD HH:mm:ss');
        const hoursSinceLastUpdate = (new Date(now).getTime() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60);
        
        //NOTE(2025-02-11): the update period is only controlled by the rate of the lambda function as of now
        /*
        if (hoursSinceLastUpdate < UPDATE_THRESHOLD_HOURS) {
            return data;
        }
        */

        const updatedData = {
            last_updated: now,
        }

        for (const period of PERIOD_LIST) {
            const [olpPerformance, revenue] = await Promise.all([
                getDailyOlpPerformance(period),
                getDailyRevenue(period)
            ]);
            updatedData[period] = {
                olpPerformance,
                revenue
            }
        }

        await putS3({
            Bucket,
            Key,
            Body: JSON.stringify(updatedData, null, 2),
            CacheControl: 'no-cache',
        });

        await invalidateCloudfrontCache({
            DistributionId: APP_DATA_CLOUDFRONT_DISTRIBUTION_ID,
            InvalidationPaths: [`/${APP_DATA_OLP_DASHBOARD_KEY}`],
        });

        return updatedData;
    }
    catch (error) {
        console.log('updateDashboardData error:', error);
        throw error;
    }
}