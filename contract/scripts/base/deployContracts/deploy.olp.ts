export async function deployOLP(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const OLP = await ethers.getContractFactory("OLP")

  const solp = await upgrades.deployProxy(OLP, [
    "Short-Term OLP",
    "sOLP",
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])

  const molp = await upgrades.deployProxy(OLP, [
    "Medium-Term OLP",
    "mOLP",
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])

  const lolp = await upgrades.deployProxy(OLP, [
    "Long-Term OLP",
    "lOLP",
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY
  ])

  CONTRACT_ADDRESS.S_OLP = await solp.getAddress()
  CONTRACT_ADDRESS.M_OLP = await molp.getAddress()
  CONTRACT_ADDRESS.L_OLP = await lolp.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    solp,
    molp,
    lolp,
  }
}