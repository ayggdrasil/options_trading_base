import { ethers } from "hardhat";

export const deployImplementationContracts = async () => {
    const sVault = await ethers.getContractFactory("Vault")
    const sVaultImplementation = await sVault.deploy()
    await sVaultImplementation.waitForDeployment()
    const sVaultImplementationAddress = await sVaultImplementation.getAddress()

    const mVault = await ethers.getContractFactory("Vault")
    const mVaultImplementation = await mVault.deploy()
    await mVaultImplementation.waitForDeployment()
    const mVaultImplementationAddress = await mVaultImplementation.getAddress()

    const lVault = await ethers.getContractFactory("Vault")
    const lVaultImplementation = await lVault.deploy()
    await lVaultImplementation.waitForDeployment()
    const lVaultImplementationAddress = await lVaultImplementation.getAddress()

    console.log(`sVaultImplementationAddress: ${sVaultImplementationAddress}`)
    console.log(`mVaultImplementationAddress: ${mVaultImplementationAddress}`)
    console.log(`lVaultImplementationAddress: ${lVaultImplementationAddress}`)
}

(async () => {
    await deployImplementationContracts()
})()