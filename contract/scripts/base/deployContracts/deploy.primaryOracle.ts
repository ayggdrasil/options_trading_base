export async function deployPrimaryOracle(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  let chainPrimaryOracle;

  switch (process.env.HARDHAT_NETWORK) {
    case 'base':
      chainPrimaryOracle = 'BasePrimaryOracle'
      break
    case 'arbitrumOne':
      chainPrimaryOracle = 'ArbitrumPrimaryOracle'
      break
    default:
      throw new Error('Primary Oracle not found')
  }

  if (chainPrimaryOracle === null) {
    throw new Error('Primary Oracle not found')
  }

  const PrimaryOracle = await ethers.getContractFactory(chainPrimaryOracle)
  const primaryOracle = await upgrades.deployProxy(PrimaryOracle, [
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])

  CONTRACT_ADDRESS.PRIMARY_ORACLE = await primaryOracle.getAddress();

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    primaryOracle
  }
}