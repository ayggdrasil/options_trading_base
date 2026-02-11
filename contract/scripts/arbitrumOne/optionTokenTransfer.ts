import BigNumber from "bignumber.js";

import { getDeployedContracts } from "./deployedContracts";
import { ethers } from "hardhat";
import { VaultIndex } from "../../utils/enums";
import { formatOptionTokenId,getMainOptionName, parseOptionTokenId, generatePositionDataToStr, getPairedOptionName, getOptionKey } from "../../utils/format";
BigNumber.config({
  EXPONENTIAL_AT: 1000,
  DECIMAL_PLACES: 80,
})

type OptionTokenTransfer = {
  optionsTokenAddress: string
  optionTokenId: string
  recipient: string
  size: string
}

export async function optionTokenTransfer(ethers: any, addressMap: any) {
  const [
    TEST_USER1, 
  ] = await (ethers as any).getSigners()
  const {
    optionsMarket,
    btcOptionsToken,
    ethOptionsToken,
  } = await getDeployedContracts(ethers, addressMap);
  console.log("Start with the account:", TEST_USER1.address)

  const [blockNumber, feeData] = await Promise.all([
    ethers.provider.getBlockNumber(),
    ethers.provider.getFeeData()
  ])
  console.log("Current block number:", blockNumber)
  console.log("Current fee data:", feeData)

  const overrides = {
    maxFeePerGas: BigInt(feeData.maxFeePerGas) * BigInt(2), // BigNumber.from() 사용
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    type: 2
  };

  // TODO: 토큰 전송 데이터 추가
  const optionTokenTransfers: OptionTokenTransfer[] = [
    // { "optionsTokenAddress": "0x8c0c4a7aDCC5961003D5ec7CF395f9E70E1D1249", "recipient": "0x401C81fFa8504B2Dc6905bCa7D4860A9f60cE5c9", "optionTokenId": "1769638200462262839793874074671326620477692089038763777770554176401571840", "size": "49857" },
    // { "optionsTokenAddress": "0x8c0c4a7aDCC5961003D5ec7CF395f9E70E1D1249", "recipient": "0x0566D52171036546dE97D797dA1EE35088eA182E", "optionTokenId": "1769640421893415223422035622434724367292671140665577108488755247044362241", "size": "81373796" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x0566D52171036546dE97D797dA1EE35088eA182E", "optionTokenId": "3536487486671799553005312392404906328973020678123111360399213187003580417", "size": "30503819059945830636" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x0566D52171036546dE97D797dA1EE35088eA182E", "optionTokenId": "3536487486671799553005312428086098646622144469640283419576741266892783617", "size": "19820124065406358275" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x0566D52171036546dE97D797dA1EE35088eA182E", "optionTokenId": "3536487486671799553005312499448483281920518817734650360871947096991727617", "size": "20017887690355329949" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x0566D52171036546dE97D797dA1EE35088eA182E", "optionTokenId": "3536487486671799553005312517289079440745017330963224978990636301776060417", "size": "3260865341835978051" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x1241b37f333E3d5Fa5013F96713C3CB6a43Fb987", "optionTokenId": "3536487486671460589511601547324851513990628872480684553582246758121996289", "size": "535616024616400045" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x1241b37f333E3d5Fa5013F96713C3CB6a43Fb987", "optionTokenId": "3536487486671661456767133778295322007862060919411260010916362522927824897", "size": "28973533393437500000" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x1241b37f333E3d5Fa5013F96713C3CB6a43Fb987", "optionTokenId": "3536487486671661456767133796135918166686559432639834629035051727712157697", "size": "435633267878787878" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x1241b37f333E3d5Fa5013F96713C3CB6a43Fb987", "optionTokenId": "3536487486671661456767133813976514325511057945868409247153740932496490497", "size": "9016557064411764705" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x2D760D867EBebD7DA5B0bE18fed71B4bcC9610Eb", "optionTokenId": "3536487486671799553005312428086098646622334617230317653986965772373590017", "size": "504846566446187983734" },
    // { "optionsTokenAddress": "0x8c0c4a7aDCC5961003D5ec7CF395f9E70E1D1249", "recipient": "0x2F16C7584f9dd9d4BB4927A63391D8b0522c63B5", "optionTokenId": "1769640421893415223422031697503569425889054073776650598960666459232010241", "size": "20502938" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x47655C3b13Dd14A54F8AE3cf17CfDA12f7F91cd7", "optionTokenId": "3536487486671372710087306008909984701167214372550836793775199828148486145", "size": "74857983455314947778" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x47655C3b13Dd14A54F8AE3cf17CfDA12f7F91cd7", "optionTokenId": "3536487486671799553005312303201925534850528111980238269805767163081916417", "size": "132962381199297373352" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x74207dFd202fc1f3E2653a45FD81bE51f703Adb4", "optionTokenId": "3536487486671460589511601511643659196341631846023535317344868348553330689", "size": "967099912960999990" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9371fD918E208c190176E32F6706F4BF3011f89e", "optionTokenId": "3536487486671799553005312392404906328972957295593099948929138351843311617", "size": "9970913747360441820" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9371fD918E208c190176E32F6706F4BF3011f89e", "optionTokenId": "3536487486671799553005312570810867917218639635708971656286853586449596417", "size": "49644555397608495693" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9DbCED00E4eb4c787069e21C93a4ED7C28C1e97E", "optionTokenId": "3536487486671799553005312463767290964271331643687466890224344181942255617", "size": "1005337782400184896" },
    // { "optionsTokenAddress": "0x8c0c4a7aDCC5961003D5ec7CF395f9E70E1D1249", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "1769640421893076259928324741673477234581420320751622613140118106655424513", "size": "9705177" },
    // { "optionsTokenAddress": "0x8c0c4a7aDCC5961003D5ec7CF395f9E70E1D1249", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "1769640421893503102846327111078864617338040227389547468482185678727151617", "size": "20502938" },
    // { "optionsTokenAddress": "0x8c0c4a7aDCC5961003D5ec7CF395f9E70E1D1249", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "1769640421893503102846331036010019558741657294278473978010274466539503617", "size": "81373796" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671372710087306098112965495289706938693709884368645852070150145", "size": "967099912960999990" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671372710087306133794157812938703965150859120606024261638815745", "size": "535616024616400045" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671460589511601422440678402219139279880662226751422324631666689", "size": "74857983455314947778" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671573577342838364764628306810136012081434577940140026444644353", "size": "23012841590636379838" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671573577342838382605224465634634525310009196058829231228977153", "size": "435633267878787878" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671573577342838400445820624459133038538583814177518436013309953", "size": "9016557064411764705" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671799553005312428086098646622271234700306242516890937213321217", "size": "199987650227500000000" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671887432429607716777220726299514265593135139327286382577057793", "size": "132962381199297373352" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671887432429607805980201520421943449205996818450657571338452993", "size": "9970913747360441820" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671887432429607805980201520422006831736008229920732406498721793", "size": "30503819059945830636" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671887432429607841661393838071130623253180289098260486387924993", "size": "19820124065406358275" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671887432429607841661393838071320770843214523508484991868731393", "size": "504846566446187983734" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671887432429607877342586155720254414770352348275788566277128193", "size": "120320553955555555554" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671887432429607877342586155720317797300363759745863401437396993", "size": "1005337782400184896" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671887432429607913023778473369504971347547230393466316486868993", "size": "20017887690355329949" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671887432429607930864374632194003484576121848512155521271201793", "size": "3260865341835978051" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0x9e34F79E39AddB64f4874203066fFDdD6Ab63a41", "optionTokenId": "3536487486671887432429607984386163108667625789321868525808372805944737793", "size": "49644555397608495693" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0xdd2Cf358428C3cC794372C13361EF1E15a26a172", "optionTokenId": "3536487486671887432429607841661393838071257388313203112038410156708462593", "size": "199987650227500000000" },
    // { "optionsTokenAddress": "0x8c0c4a7aDCC5961003D5ec7CF395f9E70E1D1249", "recipient": "0xe259435d3930dF0E4f2912100174bF628c074582", "optionTokenId": "1769640421892988380504029328142783533529495413421797180163895610172243969", "size": "9705177" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0xf06787919a792E966899fE4ee0562f5A62f0F611", "optionTokenId": "3536487486671573577342838364764628306810136012081434577940140026444644353", "size": "5960691802801120162" },
    // { "optionsTokenAddress": "0x601AAf9F290aFF7750B8087999526f50166deBA1", "recipient": "0xF55Dd2ae6B87C1e4B754706C98a3a204C3D98C64", "optionTokenId": "3536487486671799553005312463767290964271268261157455478754269346781986817", "size": "120320553955555555554" }
  ]
  
  const totalLength = optionTokenTransfers.length
  let availableLength = 0
  let notAvailableLength = 0
  for (const optionTokenTransfer of optionTokenTransfers) {
    let { underlyingAssetIndex, expiry, length, isBuys, strikePrices, isCalls } = parseOptionTokenId(BigInt(optionTokenTransfer.optionTokenId))
    const optionTokenId = formatOptionTokenId(underlyingAssetIndex, expiry, length, isBuys, strikePrices, isCalls, VaultIndex.sVault)
    {
      let { underlyingAssetIndex, expiry, strikePrices } = parseOptionTokenId(BigInt(optionTokenId))
      const {optionNames} = generatePositionDataToStr(BigInt(optionTokenId))
      const mainOptionName = getMainOptionName(optionTokenId, optionNames)
      const pairedOptionName = getPairedOptionName(optionTokenId, optionNames)
      const isMainOptionAvailable = await optionsMarket.isOptionAvailable(getOptionKey(mainOptionName))
      const isPairOptionAvailable = pairedOptionName 
      ? await optionsMarket.isOptionAvailable(getOptionKey(pairedOptionName)) 
      : true
      if (isMainOptionAvailable && isPairOptionAvailable) {
        availableLength += 1
      } else {
        notAvailableLength += 1
      }
    }
  }
  console.log("totalLength", totalLength)
  console.log("availableLength", availableLength)
  console.log("notAvailableLength", notAvailableLength)
  if (availableLength === totalLength) {
    console.log("All options are available")
  } else {
    console.log("Some options are not available")
    return;
  }

  console.log("continue transfer...")


  for (const optionTokenTransfer of optionTokenTransfers) {
    let { underlyingAssetIndex, expiry, length, isBuys, strikePrices, isCalls } = parseOptionTokenId(BigInt(optionTokenTransfer.optionTokenId))
    const optionTokenId = formatOptionTokenId(underlyingAssetIndex, expiry, length, isBuys, strikePrices, isCalls, VaultIndex.sVault)
    
    const { optionsTokenAddress, recipient, size } = optionTokenTransfer
    const optionsToken = 
    optionsTokenAddress === String(await btcOptionsToken.getAddress()) ? btcOptionsToken 
    : optionsTokenAddress === String(await ethOptionsToken.getAddress()) ? ethOptionsToken
    : undefined
    console.log(await optionsToken.getAddress())

    const underlyingAsset = 
    optionsTokenAddress === String(await btcOptionsToken.getAddress()) ? "WBTC"
    : optionsTokenAddress === String(await ethOptionsToken.getAddress()) ? "WETH"
    : undefined

    try {
      const balance = await optionsToken.balanceOf(TEST_USER1.address, optionTokenId)
      if (balance < BigInt(size)) {
        throw new Error("Insufficient balance")
      }

      const tx = await optionsToken.connect(TEST_USER1).safeTransferFrom(
        TEST_USER1.address,
        recipient,
        optionTokenId,
        size,
        "0x",
        overrides
      );

      const receipt = await tx.wait();

      console.log(`✅ Transfer successful! ${underlyingAsset} ${optionTokenId} to ${recipient} ${size} ${receipt.transactionHash}`);
    } catch (error) {
      console.error(`❌ Transfer failed! ${underlyingAsset} ${optionTokenId} to ${recipient} ${size}`, error);
    }
  }

  console.log("Operation completed")
}

(async () => {
  await optionTokenTransfer(ethers, null)
})()