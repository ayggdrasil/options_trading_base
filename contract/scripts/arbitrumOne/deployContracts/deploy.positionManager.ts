import { executionFee } from "../constants"

export async function deployPositionManager(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const PositionManager = await ethers.getContractFactory("PositionManager")
  const positionManager = await upgrades.deployProxy(PositionManager, [
    CONTRACT_ADDRESS.OPTIONS_MARKET,
    CONTRACT_ADDRESS.CONTROLLER,
    CONTRACT_ADDRESS.WETH,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
    executionFee
  ])
  
  CONTRACT_ADDRESS.POSITION_MANAGER = await positionManager.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    positionManager,
  }
}