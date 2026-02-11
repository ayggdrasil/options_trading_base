import { ethers } from 'ethers'

export const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL,
  parseInt(process.env.CHAIN_ID),
  { staticNetwork: true }
)
