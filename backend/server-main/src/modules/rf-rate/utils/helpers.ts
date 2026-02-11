import { convertExpiryDateToTimestamp } from 'src/common/helpers';

export const parseInstrument = (
  exchange: string,
  instrument: string,
): {
  underlyingAsset: string;
  expiry: number;
  strikePrice: number;
  isCall: boolean;
} => {
  const parts = instrument.split('-');

  switch (exchange) {
    case 'okx': {
      const underlyingAsset = parts[0].toUpperCase();
      const expiryPart = parts[2];
      const strikePrice = parseInt(parts[3]);
      const isCall = parts[4] === 'C';

      const year = parseInt(`20${expiryPart.slice(0, 2)}`);
      const month = parseInt(expiryPart.slice(2, 4)) - 1;
      const day = parseInt(expiryPart.slice(4, 6));

      return {
        underlyingAsset,
        expiry: Date.UTC(year, month, day, 8, 0, 0, 0),
        strikePrice,
        isCall,
      };
    }

    case 'deribit': {
      const underlyingAsset = parts[0].toUpperCase();
      const expiryPart = parts[1];
      const strikePrice = parseInt(parts[2]);
      const isCall = parts[3] === 'C';

      return {
        underlyingAsset,
        expiry: convertExpiryDateToTimestamp(expiryPart),
        strikePrice,
        isCall,
      };
    }

    case 'bybit': {
      const underlyingAsset = parts[0].toUpperCase();
      const expiryPart = parts[1];
      const strikePrice = parseInt(parts[2]);
      const isCall = parts[3] === 'C';

      return {
        underlyingAsset,
        expiry: convertExpiryDateToTimestamp(expiryPart),
        strikePrice,
        isCall,
      };
    }

    default:
      throw new Error(`Unsupported source: ${exchange}`);
  }
};
