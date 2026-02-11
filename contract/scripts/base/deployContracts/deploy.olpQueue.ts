export async function deployOlpQueue(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
    const RewardRouterV2 = await ethers.getContractFactory("OlpQueue")
  
    const sOlpQueue = await upgrades.deployProxy(RewardRouterV2, [
      CONTRACT_ADDRESS.WETH,
      CONTRACT_ADDRESS.S_REWARD_ROUTER_V2,
      CONTRACT_ADDRESS.S_REWARD_TRACKER,
      CONTRACT_ADDRESS.OPTIONS_AUTHORITY
    ])
    const mOlpQueue = await upgrades.deployProxy(RewardRouterV2, [
      CONTRACT_ADDRESS.WETH,
      CONTRACT_ADDRESS.M_REWARD_ROUTER_V2,
      CONTRACT_ADDRESS.M_REWARD_TRACKER,
      CONTRACT_ADDRESS.OPTIONS_AUTHORITY
    ])
    const lOlpQueue = await upgrades.deployProxy(RewardRouterV2, [  
      CONTRACT_ADDRESS.WETH,
      CONTRACT_ADDRESS.L_REWARD_ROUTER_V2,
      CONTRACT_ADDRESS.L_REWARD_TRACKER,
      CONTRACT_ADDRESS.OPTIONS_AUTHORITY
    ])
  
    CONTRACT_ADDRESS.S_OLP_QUEUE = await sOlpQueue.getAddress()
    CONTRACT_ADDRESS.M_OLP_QUEUE = await mOlpQueue.getAddress()
    CONTRACT_ADDRESS.L_OLP_QUEUE = await lOlpQueue.getAddress()
  
    console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

    return {
      sOlpQueue,
      mOlpQueue,
      lOlpQueue
    }
  }