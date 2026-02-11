import initializeContracts from '../../../contract';
import { makeTx } from '../../../../makeTx';

export const prepareVaultSettlement = async () => {
  const { sVaultUtils, keeper_settleOperator } = await initializeContracts();
  console.log('running step 1 : prepare vault settlement');

  const prevSelfOriginExpiriesToSettle = await sVaultUtils.getSelfOriginExpiriesToSettle();

  const { isSuccess } = await makeTx(sVaultUtils, keeper_settleOperator, 'prepareExpiriesToSettle', []);

  if (!isSuccess) {
    console.log(`Failed to prepare self expiries for contract ${sVaultUtils.constructor.name}.`);
    return false;
  }

  const nextSelfOriginExpiriesToSettle = await sVaultUtils.getSelfOriginExpiriesToSettle();
  console.log(
    'Self expiries for settlement:',
    prevSelfOriginExpiriesToSettle,
    '->',
    nextSelfOriginExpiriesToSettle,
  );

  return true;
};
