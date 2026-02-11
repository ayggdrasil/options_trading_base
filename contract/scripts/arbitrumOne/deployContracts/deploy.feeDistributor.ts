import { REWARD_TOKEN } from "../../base/deployConfig"
import { GOVERNANCE, TREASURY } from "../constants"

export async function deployFeeDistributor(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const FeeDistributor = await ethers.getContractFactory("FeeDistributor")

  const feeDistributor = await upgrades.deployProxy(FeeDistributor, [
    REWARD_TOKEN.ADDRESS,
    TREASURY,
    GOVERNANCE,
    CONTRACT_ADDRESS.CONTROLLER,
    CONTRACT_ADDRESS.S_REWARD_DISTRIBUTOR,
    CONTRACT_ADDRESS.M_REWARD_DISTRIBUTOR,
    CONTRACT_ADDRESS.L_REWARD_DISTRIBUTOR,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
  ])

  CONTRACT_ADDRESS.FEE_DISTRIBUTOR = await feeDistributor.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    feeDistributor
  }
}