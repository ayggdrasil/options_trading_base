export async function deployOptionsToken(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const OptionsToken = await ethers.getContractFactory("OptionsToken")

  const btcOptionsToken = await upgrades.deployProxy(OptionsToken, [
    "BTC-USD Options",
    CONTRACT_ADDRESS.WBTC,
    CONTRACT_ADDRESS.OPTIONS_MARKET,
    CONTRACT_ADDRESS.VAULT_PRICE_FEED,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
  ])

  const ethOptionsToken = await upgrades.deployProxy(OptionsToken, [
    "ETH-USD Options",
    CONTRACT_ADDRESS.WETH,
    CONTRACT_ADDRESS.OPTIONS_MARKET,
    CONTRACT_ADDRESS.VAULT_PRICE_FEED,
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
  ])

  CONTRACT_ADDRESS.BTC_OPTIONS_TOKEN = await btcOptionsToken.getAddress()
  CONTRACT_ADDRESS.ETH_OPTIONS_TOKEN = await ethOptionsToken.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    btcOptionsToken,
    ethOptionsToken,
  }
}