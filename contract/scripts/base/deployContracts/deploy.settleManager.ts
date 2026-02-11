export async function deploySettleManager(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const SettleManager = await ethers.getContractFactory("SettleManager")
  const settleManager = await upgrades.deployProxy(SettleManager, [
    CONTRACT_ADDRESS.OPTIONS_MARKET,
    CONTRACT_ADDRESS.CONTROLLER,
    CONTRACT_ADDRESS.WETH,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])
  
  CONTRACT_ADDRESS.SETTLE_MANAGER = await settleManager.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    settleManager,
  }
}