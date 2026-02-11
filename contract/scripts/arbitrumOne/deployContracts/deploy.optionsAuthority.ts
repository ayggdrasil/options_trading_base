export async function deployOptionsAuthority(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const OptionsAuthority = await ethers.getContractFactory("OptionsAuthority")
  const optionsAuthority = await upgrades.deployProxy(OptionsAuthority, [])
  
  CONTRACT_ADDRESS.OPTIONS_AUTHORITY = await optionsAuthority.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return {
    optionsAuthority
  }
}