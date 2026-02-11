export async function deployUSDG(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const USDG = await ethers.getContractFactory("USDG")

  const susdg = await upgrades.deployProxy(USDG, [
    CONTRACT_ADDRESS.S_VAULT,
    "Short-Term USDG",
    "sUSDG",
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])
  const musdg = await upgrades.deployProxy(USDG, [
    CONTRACT_ADDRESS.M_VAULT,
    "Medium-Term USDG",
    "mUSDG",
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])
  const lusdg = await upgrades.deployProxy(USDG, [
    CONTRACT_ADDRESS.L_VAULT,
    "Long-Term USDG",
    "lUSDG",
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])

  CONTRACT_ADDRESS.S_USDG = await susdg.getAddress()
  CONTRACT_ADDRESS.M_USDG = await musdg.getAddress()
  CONTRACT_ADDRESS.L_USDG = await lusdg.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    susdg,
    musdg,
    lusdg
  }
}