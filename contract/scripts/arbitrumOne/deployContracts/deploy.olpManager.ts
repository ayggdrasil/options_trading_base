import { cooldownDuration } from "../constants"

export async function deployOlpManager(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const OLPManager = await ethers.getContractFactory("OlpManager")

  const sOlpManager = await upgrades.deployProxy(OLPManager, [
    CONTRACT_ADDRESS.S_VAULT,
    CONTRACT_ADDRESS.S_VAULT_UTILS,
    CONTRACT_ADDRESS.VAULT_PRICE_FEED,
    CONTRACT_ADDRESS.S_USDG,
    CONTRACT_ADDRESS.S_OLP,
    cooldownDuration,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])
  const mOlpManager = await upgrades.deployProxy(OLPManager, [
    CONTRACT_ADDRESS.M_VAULT,
    CONTRACT_ADDRESS.M_VAULT_UTILS,
    CONTRACT_ADDRESS.VAULT_PRICE_FEED,
    CONTRACT_ADDRESS.M_USDG,
    CONTRACT_ADDRESS.M_OLP,
    cooldownDuration,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])
  const lOlpManager = await upgrades.deployProxy(OLPManager, [
    CONTRACT_ADDRESS.L_VAULT,
    CONTRACT_ADDRESS.L_VAULT_UTILS,
    CONTRACT_ADDRESS.VAULT_PRICE_FEED,
    CONTRACT_ADDRESS.L_USDG,
    CONTRACT_ADDRESS.L_OLP,
    cooldownDuration,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])

  CONTRACT_ADDRESS.S_OLP_MANAGER = await sOlpManager.getAddress()
  CONTRACT_ADDRESS.M_OLP_MANAGER = await mOlpManager.getAddress()
  CONTRACT_ADDRESS.L_OLP_MANAGER = await lOlpManager.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    sOlpManager,
    mOlpManager,
    lOlpManager
  }
}