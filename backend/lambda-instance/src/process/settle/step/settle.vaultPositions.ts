import BigNumber from 'bignumber.js';
import initializeContracts from '../../../contract';
import { makeTx } from '../../../../makeTx';

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
});

const toBigNumber = (value) => new BigNumber(value.toString());

const settleVaultExpiries = async (vaultUtils, selfOriginExpiriesToSettle, keeper_settleOperator) => {
  for (const expiry of selfOriginExpiriesToSettle) {
    let index = await vaultUtils.optionTokensAtSelfExpiryStart(expiry);
    const endLength = await vaultUtils.getOptionTokensLengthAtSelfExpiry(expiry);

    console.log(`Settling self origin positions with expiry ${expiry}...`);
    console.log(`total self origin positions: ${endLength}`);

    while (toBigNumber(index).isLessThan(endLength)) {
      const maxEndLength = toBigNumber(index).plus(Number(process.env.MAX_SETTLE_POSITION_PROCESS_ITEMS));
      const parsedEndLength = BigNumber.min(maxEndLength, endLength).toString();

      console.log(`start from index: ${index}, end at index: ${Number(parsedEndLength) - 1}`);

      await makeTx(vaultUtils, keeper_settleOperator, 'settleSelfOriginPositions', [expiry, parsedEndLength]);

      const nextIndex = await vaultUtils.optionTokensAtSelfExpiryStart(expiry);

      if (index === nextIndex) {
        console.log(`Failed to settle self origin positions at expiry ${expiry}`);
        break;
      }

      index = nextIndex;
    }

    if (!toBigNumber(index).isEqualTo(endLength)) {
      console.log(`Failed to settle all at expiry ${expiry}`);
      return false;
    }
  }

  return true;
};

export const settleVaultPositions = async () => {
  const { sVaultUtils, keeper_settleOperator } = await initializeContracts();
  console.log('running step 2 : settle vault positions');

  const vaultName = 'sVault';

  console.log(`Settling ${vaultName}'s self origin positions...`);
  const selfOriginExpiriesToSettle = await sVaultUtils.getSelfOriginExpiriesToSettle();

  if (selfOriginExpiriesToSettle.length < 1) {
    console.log(`No expiries to settle`);
    return true;
  }

  console.log(`Found ${selfOriginExpiriesToSettle.length} expiries`);

  const isSettled = await settleVaultExpiries(sVaultUtils, selfOriginExpiriesToSettle, keeper_settleOperator);

  if (!isSettled) {
    console.log(`Failed to settle self origin positions`);
    return false;
  }

  console.log(`Successfully settled self origin positions`);
  return true;
};
