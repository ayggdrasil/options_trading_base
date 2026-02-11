import { TOKEN_INFO } from "../constants"

export async function deployAssetTokens(ethers: any, { CONTRACT_ADDRESS }: any) {
  const wbtc = await ethers.getContractAt("ERC20", TOKEN_INFO.WBTC.ADDRESS)
  const weth = await ethers.getContractAt("WETH", TOKEN_INFO.WETH.ADDRESS)
  const usdc = await ethers.getContractAt("ERC20", TOKEN_INFO.USDC.ADDRESS)

  CONTRACT_ADDRESS.WBTC = await wbtc.getAddress()
  CONTRACT_ADDRESS.WETH = await weth.getAddress()
  CONTRACT_ADDRESS.USDC = await usdc.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    wbtc,
    weth,
    usdc,
  }
}