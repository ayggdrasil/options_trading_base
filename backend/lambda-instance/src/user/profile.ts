
export const getUserProfileInfo = async (userAddress: string) => {
  userAddress = userAddress.toLowerCase()

  let userName: string = ""
  let twitterAddress: string = ""
  let numOfOpenPositions: number = 0
  let totalInvest: number = 0
  let totalPnl: number = 0
  let totalRoi: number = 0
  let totalOpenCloseCount: number = 0
  let totalNotionalVolume: number = 0
  let notionalVolumes: { [key: string]: any } = {}
  let totalNumOfPositionFollowers: number = 0
  let totalPaymentOfFollowers: number = 0
  let totalRebatesFromFollowers: number = 0
  return {
    userName,
    twitterAddress,
    numOfOpenPositions,
    totalInvest,
    totalPnl,
    totalRoi,
    totalOpenCloseCount,
    totalNotionalVolume,
    notionalVolumes,
    totalNumOfPositionFollowers,
    totalPaymentOfFollowers,
    totalRebatesFromFollowers
  }
}
