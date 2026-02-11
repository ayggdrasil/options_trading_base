import { initializeConfig } from "./config";
import { checkUserOlpStatus } from "./function/checkUserOlpStatus";
import { checkUserPositionStatus } from "./function/checkUserPositionStatus";
import { processOlpCompensation } from "./function/processOlpCompensation";
import { CONTRACT_ADDRESS } from "./common/address";
import { processSetLastAddedAt } from "./function/setLastAddedAt";
import { getTimestampForDate } from "./common/helper";
import { redis } from "./common/redis";
import { getReferralList } from "./function/redis/getReferralList";
import { processSetParentAdmin } from "./function/contract/setParentAdmin";

async function main() {
  initializeConfig();

  await processSetParentAdmin(
    "referral_rollback",
    "referral_rollback_list_2025-02-03.csv",
    "referral_rollback_transaction",
    "txt"
  );
  // await getReferralList("get_referral_list", "referral_list", "csv");

  // await checkUserOlpStatus(chain, CONTRACT_ADDRESS[chain].S_OLP);
  // await checkUserOlpStatus(chain, CONTRACT_ADDRESS[chain].M_OLP);

  // await checkUserPositionStatus(true, false, getTimestampForDate(2024, 12, 1), getTimestampForDate(2025, 1, 8)); // expired but not settled
  // await checkUserPositionStatus(false, false, getTimestampForDate(2024, 12, 1)); // not expired

  // 2025-01-15
  // await processOlpCompensation(
  //     chain,
  //     'olp_compensation_1round_usdc_1'
  // )
  // await processOlpCompensation(
  //     chain,
  //     'olp_compensation_1round_weth_1'
  // )
  // await processOlpCompensation(
  //     chain,
  //     'olp_compensation_1round_usdc_99'
  // )
  // await processOlpCompensation(
  //     chain,
  //     'olp_compensation_1round_weth_99'
  // )

  // 2025-01-17
  // await processSetLastAddedAt(chain, "test");
  // await processSetLastAddedAt(
  //     chain,
  //     'last_added_at_1round'
  // )
}

(async () => {
  try {
    await main();
  } catch (error) {
    console.error(error);
  }
})();
