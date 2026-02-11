import { getMainOptionName, getPairedOptionName } from "../../utils/format";
import BigNumber from "bignumber.js";
import PositionManagerAbi from "../../../shared/abis/PositionManager.json";
import { ethers } from "hardhat";
import { getDeployedContracts } from "./deployedContracts";
import { zeroPadBytes } from "ethers";
import { solidityPacked } from "ethers";
import { generatePositionDataToStr } from "../../utils/format";

BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

export async function getOptionTokenIdFromHash(ethers: any) {
  // TODO: 토큰 전송 데이터 추가
  console.log("hash optionTokenId mainOptionName pairedOptionName")
  const hashs: string[]  = [
    // "0xf85ee705c6d9b3c4845b06639f801464addbaa4729c805916b0344f6104a62f8",
    // "0x567e5b6267a0645f93a2da68e39c6bc053cc7dd93495c30686e2d36fc9c3681b"
  ]

  const {
    positionManager,
  } = await getDeployedContracts(ethers, null);

  for (const hash of hashs) {
    const receipt = await ethers.provider.getTransactionReceipt(hash);

    if (!receipt) {
      console.log("Transaction not found");
      continue;
    }
    const iface = new ethers.Interface(PositionManagerAbi);

    const createOpenPositionEvent = receipt.logs
      .map((log: any) => {
        try {
          return iface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .find((event: any) => event && event.name === 'CreateOpenPosition');


    if (!createOpenPositionEvent) {
      throw new Error("CreateOpenPosition event not found in transaction");
    }

    const generateRequestKeyEvent = receipt.logs
    .map((log: any) => {
      try {
        return iface.parseLog(log);
      } catch (e) {
        return null;
      }
    })
    .find((event: any) => event && event.name === 'GenerateRequestKey');


    if (!generateRequestKeyEvent) {
      throw new Error("GenerateRequestKey event not found in transaction");
    }

    const {optionNames} = generatePositionDataToStr(createOpenPositionEvent.args.optionTokenId)
    const mainOptionName = getMainOptionName(createOpenPositionEvent.args.optionTokenId, optionNames)
    const pairedOptionName = getPairedOptionName(createOpenPositionEvent.args.optionTokenId, optionNames)

    const optionTokenId = createOpenPositionEvent.args.optionTokenId;
    const requestKey = generateRequestKeyEvent.args.key;
    const openPositionRequest = await positionManager.openPositionRequests(requestKey)

    console.log(hash, optionTokenId.toString(), mainOptionName, pairedOptionName, openPositionRequest.sizeOut)
  }

  console.log("Operation completed")
}

(async () => {
  console.log("start")
  await getOptionTokenIdFromHash(ethers)
})()