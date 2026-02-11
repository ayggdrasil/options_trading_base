export async function deployRewardRouterV2(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const RewardRouterV2 = await ethers.getContractFactory("RewardRouterV2")

  const sRewardRouterV2 = await upgrades.deployProxy(RewardRouterV2, [
    CONTRACT_ADDRESS.WETH,
    CONTRACT_ADDRESS.S_OLP,
    CONTRACT_ADDRESS.S_REWARD_TRACKER,
    CONTRACT_ADDRESS.S_OLP_MANAGER,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
    CONTRACT_ADDRESS.CONTROLLER
  ])
  const mRewardRouterV2 = await upgrades.deployProxy(RewardRouterV2, [
    CONTRACT_ADDRESS.WETH,
    CONTRACT_ADDRESS.M_OLP,
    CONTRACT_ADDRESS.M_REWARD_TRACKER,
    CONTRACT_ADDRESS.M_OLP_MANAGER,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
    CONTRACT_ADDRESS.CONTROLLER
  ])
  const lRewardRouterV2 = await upgrades.deployProxy(RewardRouterV2, [  
    CONTRACT_ADDRESS.WETH,
    CONTRACT_ADDRESS.L_OLP,
    CONTRACT_ADDRESS.L_REWARD_TRACKER,
    CONTRACT_ADDRESS.L_OLP_MANAGER,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
    CONTRACT_ADDRESS.CONTROLLER
  ])

  CONTRACT_ADDRESS.S_REWARD_ROUTER_V2 = await sRewardRouterV2.getAddress()
  CONTRACT_ADDRESS.M_REWARD_ROUTER_V2 = await mRewardRouterV2.getAddress()
  CONTRACT_ADDRESS.L_REWARD_ROUTER_V2 = await lRewardRouterV2.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    sRewardRouterV2,
    mRewardRouterV2,
    lRewardRouterV2
  }
}