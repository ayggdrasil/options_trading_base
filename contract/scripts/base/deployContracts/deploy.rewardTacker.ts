export async function deployRewardTracker(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const RewardTracker = await ethers.getContractFactory("RewardTracker")

  const sRewardTracker = await upgrades.deployProxy(RewardTracker, [
    "Short-Term Fee OLP",
    "sfOLP",
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])
  const mRewardTracker = await upgrades.deployProxy(RewardTracker, [
    "Medium-Term Fee OLP",
    "mfOLP",
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])
  const lRewardTracker = await upgrades.deployProxy(RewardTracker, [
    "Long-Term Fee OLP",
    "lfOLP",
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])

  CONTRACT_ADDRESS.S_REWARD_TRACKER = await sRewardTracker.getAddress()
  CONTRACT_ADDRESS.M_REWARD_TRACKER = await mRewardTracker.getAddress()
  CONTRACT_ADDRESS.L_REWARD_TRACKER = await lRewardTracker.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    sRewardTracker,
    mRewardTracker,
    lRewardTracker
  }
}