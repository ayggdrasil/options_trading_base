import { VAULT_THRESHOLD_DAYS } from "../constants";

export async function deployVault(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const Vault = await ethers.getContractFactory("Vault");

  const sVault = await upgrades.deployProxy(Vault, [
    VAULT_THRESHOLD_DAYS.S,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])
  const mVault = await upgrades.deployProxy(Vault, [
    VAULT_THRESHOLD_DAYS.M,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])
  const lVault = await upgrades.deployProxy(Vault, [
    VAULT_THRESHOLD_DAYS.L,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])

  CONTRACT_ADDRESS.S_VAULT = await sVault.getAddress()
  CONTRACT_ADDRESS.M_VAULT = await mVault.getAddress()
  CONTRACT_ADDRESS.L_VAULT = await lVault.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    sVault,
    mVault,
    lVault
  }
}