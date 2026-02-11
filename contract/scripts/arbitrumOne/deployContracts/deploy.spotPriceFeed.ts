export async function deploySpotPriceFeed(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const SpotPricefeed = await ethers.getContractFactory("SpotPriceFeed")
  const spotPriceFeed = await upgrades.deployProxy(SpotPricefeed, [
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])

  CONTRACT_ADDRESS.SPOT_PRICE_FEED = await spotPriceFeed.getAddress();

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    spotPriceFeed
  }
}