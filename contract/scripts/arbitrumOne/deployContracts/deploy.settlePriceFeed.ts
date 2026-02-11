export async function deploySettlePriceFeed(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const SettlePricefeed = await ethers.getContractFactory("SettlePriceFeed")
  const settlePriceFeed = await upgrades.deployProxy(SettlePricefeed, [
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])

  CONTRACT_ADDRESS.SETTLE_PRICE_FEED = await settlePriceFeed.getAddress();

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    settlePriceFeed
  }
}