import fs from 'fs'
import path from 'path'

const contracts = [
  "Faucet",
  "ERC20",
  "OptionsAuthority",
  "VaultPriceFeed",
  "OptionsMarket",
  "Vault",
  "VaultUtils",
  "USDG",
  "OLP",
  "OlpManager",
  "RewardTracker",
  "RewardDistributor",
  "RewardRouterV2",
  "OlpQueue",
  "Controller",
  "PositionManager",
  "SettleManager",
  "FeeDistributor",
  "OptionsToken",
  "BasePrimaryOracle",
  "FastPriceEvents",
  "FastPriceFeed",
  "PositionValueFeed",
  "SettlePriceFeed",
  "SpotPriceFeed",
  "ViewAggregator",
  "Referral",
]

const artifactsDir = path.join(__dirname, '..', 'artifacts', 'contracts');

function findContractArtifact(contractName: string): string | null {
  // Recursive function to find a file path
  function findFilePath(dirPath: string): string | null {
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        const result = findFilePath(fullPath);
        if (result) return result;
      } else if (file.name === `${contractName}.json`) {
        return fullPath;
      }
    }
    return null;
  }

  return findFilePath(artifactsDir);
}

async function main() {
  const abisDir = path.join(__dirname, "..", "..", "shared", 'abis');
  if (!fs.existsSync(abisDir)) {
    fs.mkdirSync(abisDir, { recursive: true });
  }

  let successCount = 0;
  let failCount = 0;

  console.log(`Processing ${contracts.length} contracts...\n`);

  for (const contract of contracts) {
    try {
      const artifactPath = findContractArtifact(contract);
      if (!artifactPath) {
        console.error(`✗ ${contract}: Artifact not found`);
        failCount++;
        continue;
      }

      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      
      if (!artifact.abi || !Array.isArray(artifact.abi) || artifact.abi.length === 0) {
        console.error(`✗ ${contract}: ABI not found or empty in artifact`);
        failCount++;
        continue;
      }

      const abiPath = path.join(abisDir, `${contract}.json`);
      fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2), 'utf8');
      console.log(`✓ ${contract}: ABI saved to ${abiPath}`);
      successCount++;
    } catch (error: any) {
      console.error(`✗ ${contract}: Error processing - ${error.message || error}`);
      failCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${contracts.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});