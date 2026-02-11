export async function deployVaultUtils(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const VaultUtils = await ethers.getContractFactory("VaultUtils")

  const sVaultUtils = await upgrades.deployProxy(VaultUtils, [
    CONTRACT_ADDRESS.S_VAULT,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
  ])
  const mVaultUtils = await upgrades.deployProxy(VaultUtils, [
    CONTRACT_ADDRESS.M_VAULT,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
  ])
  const lVaultUtils = await upgrades.deployProxy(VaultUtils, [
    CONTRACT_ADDRESS.L_VAULT,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
  ])

  CONTRACT_ADDRESS.S_VAULT_UTILS = await sVaultUtils.getAddress()
  CONTRACT_ADDRESS.M_VAULT_UTILS = await mVaultUtils.getAddress()
  CONTRACT_ADDRESS.L_VAULT_UTILS = await lVaultUtils.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    sVaultUtils,
    mVaultUtils,
    lVaultUtils
  }
}