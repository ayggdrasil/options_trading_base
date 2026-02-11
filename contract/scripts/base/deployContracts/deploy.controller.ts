export async function deployController(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const Controller = await ethers.getContractFactory("Controller")
  const controller = await upgrades.deployProxy(Controller, [
    [CONTRACT_ADDRESS.S_VAULT, CONTRACT_ADDRESS.M_VAULT, CONTRACT_ADDRESS.L_VAULT],
    [CONTRACT_ADDRESS.S_VAULT_UTILS, CONTRACT_ADDRESS.M_VAULT_UTILS, CONTRACT_ADDRESS.L_VAULT_UTILS],
    CONTRACT_ADDRESS.OPTIONS_MARKET,
    CONTRACT_ADDRESS.VAULT_PRICE_FEED,
    CONTRACT_ADDRESS.WETH,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
    false
  ])

  CONTRACT_ADDRESS.CONTROLLER = await controller.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

return { controller }
}