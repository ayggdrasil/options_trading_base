import { CONTRACT_ADDRESS } from "../constants"

export async function deployWOLP(ethers: any, { upgrades }: any) {
  const WOLP = await ethers.getContractFactory("WOLP")

  const wOlp = await upgrades.deployProxy(WOLP, [
    "Wrapped OLP",
    "wOLP",
    CONTRACT_ADDRESS.S_REWARD_TRACKER,
    CONTRACT_ADDRESS.S_REWARD_ROUTER_V2
  ])

  CONTRACT_ADDRESS.W_OLP = await wOlp.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    wOlp
  }
}