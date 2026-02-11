import BigNumber from "bignumber.js"

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

export async function deployFaucet(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const [deployer] = await ethers.getSigners()

  const Faucet = await ethers.getContractFactory("Faucet")

  // const faucet = await upgrades.deployProxy(Faucet, [
  //   CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
  // ])

  const faucet = await ethers.getContractAt("Faucet", "0x954DBbBd5BB2534478EAc00e17bE9Ba7295a7025")

  const faucet_initial_usdcAmount = new BigNumber(999_999_999_999_999).multipliedBy(10 ** 6).toString();
  const faucet_initial_wbtcAmount = new BigNumber(999_999_999_999_999).multipliedBy(10 ** 8).toString();
  const faucet_initial_wethAmount = new BigNumber(999_999_999_999_999).multipliedBy(10 ** 18).toString();
  
  const usdc = await ethers.getContractAt('ERC20', CONTRACT_ADDRESS.USDC)
  const wbtc = await ethers.getContractAt('ERC20', CONTRACT_ADDRESS.WBTC)
  const weth = await ethers.getContractAt('WETH', CONTRACT_ADDRESS.WETH)

  const faucetAddress = await faucet.getAddress()

  await usdc.connect(deployer).mint(faucetAddress, faucet_initial_usdcAmount)
  await wbtc.connect(deployer).mint(faucetAddress, faucet_initial_wbtcAmount)
  await weth.connect(deployer).testOnlyMint(faucetAddress, faucet_initial_wethAmount)

  CONTRACT_ADDRESS.FAUCET = faucetAddress

  console.log('faucet deployed')

  return { faucet }
}