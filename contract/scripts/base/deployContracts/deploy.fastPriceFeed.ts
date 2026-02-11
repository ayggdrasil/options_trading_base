export async function deployFastPriceFeed(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const FastPriceEvents = await ethers.getContractFactory("FastPriceEvents")
  const fastPriceEvents = await upgrades.deployProxy(FastPriceEvents, [
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])
  
  CONTRACT_ADDRESS.FAST_PRICE_EVENTS = await fastPriceEvents.getAddress()

  const FastPriceFeed = await ethers.getContractFactory("FastPriceFeed")
  const fastPriceFeed = await upgrades.deployProxy(FastPriceFeed, [
    CONTRACT_ADDRESS.FAST_PRICE_EVENTS,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])

  CONTRACT_ADDRESS.FAST_PRICE_FEED = await fastPriceFeed.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    fastPriceEvents,
    fastPriceFeed,
  }
}