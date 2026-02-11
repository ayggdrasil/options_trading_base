import { InstrumentMarkData, InstrumentMarkDataRes } from '@callput/shared';
import { sendMessage } from '../../utils/slack';
import { LogLevel } from '../../utils/enums';
import { MESSAGE_TYPE } from '../../utils/messages';
import { getS3 } from '../../utils/aws';

const TIME_INVALID_THRESHOLD = 180 * 1000;

/**
 * Fetches mark IV and price data for instruments from the App API
 * @returns Promise with instrument mark data
 */
export const getInstrumentMarkDataFromApp = async (): Promise<InstrumentMarkData> => {
  try {
    const { instruments } = await getS3({
      Bucket: process.env.APP_DATA_BUCKET,
      Key: process.env.APP_DATA_INSTRUMENTS_KEY,
    })

    if (!instruments) {
      throw new Error('No instruments found');
    }

    const { active: active_instrument_name_list, inactive: inactive_instrument_name_list } = instruments;
    const allInstruments = [...active_instrument_name_list, ...inactive_instrument_name_list];

    const response = await fetch(process.env.IV_CURVE_BATCH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instruments: allInstruments,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const instrumentMarketDataRes: InstrumentMarkDataRes = await response.json();

    if (
      !instrumentMarketDataRes.data ||
      Object.keys(instrumentMarketDataRes.data).length === 0 ||
      instrumentMarketDataRes.lastUpdatedAt <= 0
    ) {
      throw new Error('Invalid instrument mark data format');
    }

    if (instrumentMarketDataRes.lastUpdatedAt < Date.now() - TIME_INVALID_THRESHOLD) {
      const diffInSeconds = Math.floor((Date.now() - instrumentMarketDataRes.lastUpdatedAt) / 1000);
      await sendMessage(
        `\`[Lambda][app.ts]\` ${MESSAGE_TYPE.INSTRUMENT_MARK_DATA_NOT_UPDATED}`,
        LogLevel.CRITICAL,
        {
          description: `${diffInSeconds}s ago`,
        },
      );
    }

    return instrumentMarketDataRes.data;
  } catch (error) {
    console.error('Error fetching instrument mark data:', error);
    throw error;
  }
};
