import { getS3, putS3 } from "../../utils/aws";
import { sendMessage } from "../../utils/slack";
import { LogLevel } from "../../utils/enums";
import { MESSAGE_TYPE } from "../../utils/messages";
import { prepareVaultSettlement } from "./step/prepare.vaultSettlement";
import { settleVaultPositions } from "./step/settle.vaultPositions";
import { getDateISOString } from "../../utils/date";

const steps = [
  { key: "prepareVaultSettlement", fn: prepareVaultSettlement },
  { key: "settleVaultPositions", fn: settleVaultPositions },
];

export const executeVaultSettlement = async () => {
  const dateISOString = getDateISOString();

  const settleCheckData = await getS3({
    Bucket: process.env.APP_DATA_BUCKET,
    Key: process.env.APP_DATA_SETTLE_CHECK_KEY,
  });

  if (!settleCheckData[dateISOString]) return { message: "Settle price hasn't been feeded yet."};

  const checklist = settleCheckData[dateISOString];

  if (checklist.feedSettlePrice !== true) return { message: "Settle price hasn't been feeded yet."};

  if (checklist.allSettled === true) return { message: "All settled." };

  try {
    for (const step of steps) {
      console.log(`Step '${step.key}' status: ${checklist[step.key]}`);

      if (checklist[step.key] === true) continue;

      const result = await step.fn();

      if (result === false) {
        await sendMessage(
          `\`[Lambda][execute.vaultSettlement]\` ${MESSAGE_TYPE.STEP_FAILED} '${step.key}'`,
          LogLevel.WARN
        );

        break; // If a step fails, stop processing further steps.
      }

      console.log(`Step '${step.key}' completed successfully.`);

      checklist[step.key] = true;
      settleCheckData[dateISOString] = checklist;

      await putS3({
        Bucket: process.env.APP_DATA_BUCKET,
        Key: process.env.APP_DATA_SETTLE_CHECK_KEY as string,
        Body: JSON.stringify(settleCheckData),
        CacheControl: "no-cache",
      });
    }
  } catch (error) {
    console.log("executeVaultSettlement: Error during processing:", error);
  }

  // 4. Check if all steps are settled
  checklist.allSettled = Object.entries(checklist).every(
    ([key, value]) => key === "allSettled" || value === true
  );

  if (checklist.allSettled === true) {
    console.log("All settle steps completed successfully.");

    settleCheckData[dateISOString] = checklist;

    await putS3({
      Bucket: process.env.APP_DATA_BUCKET,
      Key: process.env.APP_DATA_SETTLE_CHECK_KEY as string,
      Body: JSON.stringify(settleCheckData),
      CacheControl: "no-cache",
    });

    await sendMessage(
      `\`[Lambda][execute.vaultSettlement]\` ${MESSAGE_TYPE.ALL_SETTLE_STEPS_COMPLETED_SUCCESSFULLY}`,
      LogLevel.INFO,
    );
  }

  return { message: "Processing completed." };
};
