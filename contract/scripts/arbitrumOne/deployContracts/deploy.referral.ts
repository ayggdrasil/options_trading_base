export async function deployReferral(ethers: any, { upgrades, CONTRACT_ADDRESS }: any) {
  const Referral = await ethers.getContractFactory("Referral")
  const referral = await upgrades.deployProxy(Referral, [
    CONTRACT_ADDRESS.OPTIONS_AUTHORITY,
  ])

  CONTRACT_ADDRESS.REFERRAL = await referral.getAddress()

  console.log(CONTRACT_ADDRESS, 'CONTRACT_ADDRESS')

  return { referral }
}