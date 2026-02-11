export async function deployRewardDistributor(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const RewardDistributor = await ethers.getContractFactory("RewardDistributor")

  const sRewardDistributor = await upgrades.deployProxy(RewardDistributor, [
    CONTRACT_ADDRESS.WETH,
    CONTRACT_ADDRESS.S_REWARD_TRACKER,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])
  const mRewardDistributor = await upgrades.deployProxy(RewardDistributor, [
    CONTRACT_ADDRESS.WETH,
    CONTRACT_ADDRESS.M_REWARD_TRACKER,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])
  const lRewardDistributor = await upgrades.deployProxy(RewardDistributor, [
    CONTRACT_ADDRESS.WETH,
    CONTRACT_ADDRESS.L_REWARD_TRACKER,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])

  CONTRACT_ADDRESS.S_REWARD_DISTRIBUTOR = await sRewardDistributor.getAddress()
  CONTRACT_ADDRESS.M_REWARD_DISTRIBUTOR = await mRewardDistributor.getAddress()
  CONTRACT_ADDRESS.L_REWARD_DISTRIBUTOR = await lRewardDistributor.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    sRewardDistributor,
    mRewardDistributor,
    lRewardDistributor
  }
}