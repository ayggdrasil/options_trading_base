import fs from "fs";
import path from "path";

import { viem } from "../../common/viem";
import { formatAddress, mkdirOutputDir } from "../../common/helper";
import { Address } from "viem";
import { chunk } from "lodash";

export async function processSetParentAdmin(
  folderName: string,
  inputFileName: string,
  prefix: string,
  extension: string
) {
  viem.initialize();

  const viemInstance = viem.getInstance();
  const { publicClient, walletClient } = viemInstance.getClients();
  const referralContract = viemInstance.getReferralContract();

  console.log("Start with account: ", walletClient.account?.address);

  const [blockNumber, feeData] = await Promise.all([
    publicClient.getBlockNumber(),
    publicClient.estimateFeesPerGas(),
  ]);

  console.log("Current block number:", blockNumber);
  console.log("Current fee data:", feeData);

  const inputFilePath = `data/input/${folderName}/${inputFileName}`;
  const outputDir = mkdirOutputDir(folderName);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const ouputFileName = `${prefix}_${timestamp}.${extension}`;

  // read input data
  let inputData: {
    child: string;
    parent: string;
    grandParent: string;
  }[] = [];

  try {
    const fileContent = fs.readFileSync(inputFilePath, "utf-8");
    inputData = fileContent
      .split("\n")
      .slice(1) // remove header
      .filter((line) => line.trim()) // remove blank line
      .map((line) => {
        const [child, parent, grandParent] = line.split(",").map((value) => value.trim());
        return { child, parent, grandParent };
      });
  } catch (error) {
    console.error("Error reading or parsing file:", error);
    throw error;
  }

  const children: string[] = [];
  const parents: string[] = [];
  const grandParents: string[] = [];

  for (const data of inputData) {
    const { child, parent, grandParent } = data;
    children.push(child);
    parents.push(parent);
    grandParents.push(grandParent);
  }

  const chunkSize = 20;

  const childrenChunks = chunk(children, chunkSize);
  const parentsChunks = chunk(parents, chunkSize);
  const grandParentsChunks = chunk(grandParents, chunkSize);

  if (childrenChunks.length !== parentsChunks.length || parentsChunks.length !== grandParentsChunks.length) {
    throw new Error("Chunk lengths are not equal");
  }

  for (let i = 0; i < childrenChunks.length; i++) {
    if (
      childrenChunks[i].length !== parentsChunks[i].length ||
      parentsChunks[i].length !== grandParentsChunks[i].length
    ) {
      throw new Error(`Chunk ${i + 1} has inconsistent lengths`);
    }
  }

  for (let i = 0; i < childrenChunks.length; i++) {
    const startIndex = i * chunkSize;
    const endIndex = startIndex + childrenChunks[i].length - 1;

    const startAddress = children[startIndex];
    const endAddress = children[endIndex];

    if (!startAddress || !endAddress) {
      throw new Error(`Invalid address index: start=${startIndex}, end=${endIndex}`);
    }

    const formattedRange = `${formatAddress(startAddress)} to ${formatAddress(endAddress)}`;

    try {
      console.log(`Processing chunk ${i + 1} of ${childrenChunks.length} (${formattedRange})`);

      const hash = await walletClient.writeContract({
        address: referralContract.address as Address,
        abi: referralContract.abi,
        functionName: "setParentAdmin",
        args: [childrenChunks[i], parentsChunks[i], grandParentsChunks[i]],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        console.log(`✅ Chunk ${i + 1} (${formattedRange}) transaction successful: ${hash}`);
        fs.appendFileSync(
          path.join(outputDir, ouputFileName),
          `Chunk ${i + 1} (${formattedRange}),${hash},SUCCESS\n`
        );
      } else {
        console.error(`❌ Chunk ${i + 1} (${formattedRange}) transaction failed: ${hash}`);
        fs.appendFileSync(
          path.join(outputDir, ouputFileName),
          `Chunk ${i + 1} (${formattedRange}),${hash},FAILED\n`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`❌ Chunk ${i + 1} (${formattedRange}) transaction failed due to an error`);
      fs.appendFileSync(path.join(outputDir, ouputFileName), `Chunk ${i + 1} (${formattedRange}),ERROR\n`);
    }
  }

  console.log("Operation completed");
}
