import { chunk } from 'lodash'
import encoder from 'int-encoder'
import { ethers } from 'ethers'

export const addressToReferralID = (address: string | undefined) => {
  if (!address) return ""
  
  const [_, hexString] = address.split('0x')

  const chunkCount: any[] = []

  // 10 characters each
  return chunk(hexString.split(''), 10).reduce((acc, cur) => {
    const joined = cur.join('')

    const encoded = encoder.encode(joined, 16)
    acc += encoded

    chunkCount.push(Number(encoded.length).toString(16))

    return acc
  }, "") + "#" + chunkCount.join('')

}

export const referralIDToAddress = (referralID: string) => {

  const [id, chunkCount] = referralID.split('#')

  const chunkCounts = chunkCount.split('')

  let result = ""

  let nextString = id

  for (const [index, cc] of chunkCounts.entries()) {

    result += String(encoder.decode(nextString.slice(0, Number(cc)), 16)).padStart(10, '0')

    nextString = nextString.slice(Number(cc))
  }

  return "0x" + result
}

// export const test = (address) => {
//   const referralID = addressToReferralID(address)
//   const _address = referralIDToAddress(referralID)

//   // console.log(address, 'address')
//   // console.log(referralID, 'referralID')
//   // console.log(_address, '_address')

//   return address.toLowerCase() == _address.toLowerCase()
// }

// export const test2 = (count) => {
//   for (let i = 0; i < count; i++) {
//     const address = ethers.Wallet.createRandom().address
  
//     if (!test(address)) {
//       const result = `${address}:${test(address)}`
//       console.log(result)
//     }
//   }
// }

// // @ts-ignore
// window.addressToReferralID = addressToReferralID
// // @ts-ignore
// window.referralIDToAddress = referralIDToAddress

// // @ts-ignore
// window.test = test
// // @ts-ignore
// window.test2 = test2