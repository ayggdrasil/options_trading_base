export async function deployVaultPriceFeed(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const VaultPriceFeed = await ethers.getContractFactory("VaultPriceFeed")
  const vaultPriceFeed = await upgrades.deployProxy(VaultPriceFeed, [
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])

  CONTRACT_ADDRESS.VAULT_PRICE_FEED = await vaultPriceFeed.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    vaultPriceFeed
  }
}