import { Reader } from "@maxmind/geoip2-node";
import { getS3Stream, streamToBuffer } from "../utils/aws";

const RESTRICTED_COUNTRIES = [
  'US', // United States
  'SY', // Syria
  'PA', // Panama
  'IR', // Iran
  'IQ', // Iraq
  'KP', // North Korea
  'CU', // Cuba
  'GU', // Guam
  'SD'  // Sudan
];

export const isRestrictedIp = async (ip) => {
  try {
    const stream = await getS3Stream({
      Bucket: process.env.APP_GLOBAL_DATA_BUCKET,
      Key: process.env.APP_GLOBAL_GEO_LITE_COUNTRY_DATA_KEY
    });

    if (!stream) {
      console.log("Failed to retrieve the GeoIP database stream.");
      return {
        countryName: null,
        countryIsoCode: null,
        shouldRestrict: false
      };
    }

    const buffer = await streamToBuffer(stream);
    const geoIPReader = Reader.openBuffer(buffer);

    const response = geoIPReader.country(ip);
    const shouldRestrict = RESTRICTED_COUNTRIES.includes(response.country.isoCode);

    return {
      countryName: response.country.names.en,
      countryIsoCode: response.country.isoCode,
      shouldRestrict
    };
  } catch (error) {
    console.log("Error processing the IP check: ", error);
    return {
      countryName: null,
      countryIsoCode: null,
      shouldRestrict: false
    };
  }
}