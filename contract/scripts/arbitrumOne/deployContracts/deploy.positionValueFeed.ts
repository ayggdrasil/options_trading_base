export async function deployPositionValueFeed(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const PositionValueFeed = await ethers.getContractFactory("PositionValueFeed")
  const positionValueFeed = await upgrades.deployProxy(PositionValueFeed, [
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])

  CONTRACT_ADDRESS.POSITION_VALUE_FEED = await positionValueFeed.getAddress();

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    positionValueFeed
  }
}