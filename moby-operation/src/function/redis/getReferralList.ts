import fs from "fs";
import path from "path";
import { zeroAddress } from "viem";
import { redis } from "../../common/redis";
import { mkdirOutputDir } from "../../common/helper";

export const getReferralList = async (folderName: string, prefix: string, extension: string) => {
  redis.initialize();
  
  const redisClient = redis.getInstance();
  const outputDir = mkdirOutputDir(folderName);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${prefix}_${timestamp}.${extension}`;

  try {
    const parentKeys = await redisClient.keys("parent:*");
    let csvContent = "child,parent,grandparent\n";

    for (const parentKey of parentKeys) {
      const child = parentKey.replace("parent:", "");
      const parent = await redisClient.get(parentKey);
      const grandParent = await redisClient.get(`grandparent:${child}`);

      csvContent += `${child},${parent},${grandParent || zeroAddress}\n`;
    }

    console.log(csvContent, "csvContent");

    fs.writeFileSync(path.join(outputDir, fileName), csvContent);
  } catch (error) {
    console.error(`Error getting referral list: ${error}`);
  }
};
