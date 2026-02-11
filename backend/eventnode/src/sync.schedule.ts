

import { CONTRACT_ADDRESSES } from './addresses'

import PositionManagerAbi from "../../../shared/abis/PositionManager.json"
import ControllerAbi from "../../../shared/abis/Controller.json"
import VaultAbi from "../../../shared/abis/Vault.json"
import VaultUtilsAbi from "../../../shared/abis/VaultUtils.json"
import OlpManagerAbi from "../../../shared/abis/OlpManager.json"
import SettlePriceFeedAbi from "../../../shared/abis/SettlePriceFeed.json"
import ReferralAbi from "../../../shared/abis/Referral.json"
import OptionsTokenAbi from "../../../shared/abis/OptionsToken.json"
import OlpQueueAbi from "../../../shared/abis/OlpQueue.json"

import { 
  CreateClosePositionTopic,
  CancelClosePositionTopic,
  OpenBuyPositionTopic,
  OpenSellPositionTopic,
  CloseBuyPositionTopic,
  CloseSellPositionTopic,
  SettleBuyPositionTopic,
  SettleSellPositionTopic,
  ClearPositionTopic,
  CollectFeesTopic,
  FeedSettlePriceTopic,
  BuyUsdgTopic,
  SellUsdgTopic,
  AddLiquidityTopic,
  RemoveLiquidityTopic,
  ParentChangedTopic,
  CollectPositionFeesTopic,
  NotifyPendingAmountTopic,
  FeeRebateTopic,
  TransferSingleTopic,
  EnqueuedMintAndStakeTopic,
  EnqueuedUnstakeAndRedeemTopic,
  ProcessedQueueActionTopic,
  CancelledQueueActionTopic,
} from './utils/topics'

import {
  handleCreateClosePosition,
  handleCancelClosePosition, 
  handleOpenBuyPosition,
  handleOpenSellPosition,
  handleCloseBuyPosition,
  handleCloseSellPosition,
  handleSettleBuyPosition,
  handleSettleSellPosition,
  handleClearPosition,
  handleCollectFees,
  handleFeedSettlePrice,
  handleBuyUsdg,
  handleSellUsdg,
  handleAddLiquidty,
  handleRemoveLiquidty,
  handleParentChanged,
  handleCollectPositionFees,
  handleNotifyPendingAmount,
  handleFeeRebate,
  handleOptionTokenTransfer,
  handleEnqueuedMintAndStake,
  handleEnqueuedUnstakeAndRedeem,
  handleProcessedQueueAction,
  handleCancelledQueueAction,
} from './utils/mappingHandlers'

export const schedules = [
  // Controller - Open, Close, Settle, Clear Position
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].CONTROLLER, topic: OpenBuyPositionTopic, abi: ControllerAbi, handler: handleOpenBuyPosition },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].CONTROLLER, topic: OpenSellPositionTopic, abi: ControllerAbi, handler: handleOpenSellPosition},
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].CONTROLLER, topic: CloseBuyPositionTopic, abi: ControllerAbi, handler: handleCloseBuyPosition },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].CONTROLLER, topic: CloseSellPositionTopic, abi: ControllerAbi, handler: handleCloseSellPosition },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].CONTROLLER, topic: SettleBuyPositionTopic, abi: ControllerAbi, handler: handleSettleBuyPosition },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].CONTROLLER, topic: SettleSellPositionTopic, abi: ControllerAbi, handler: handleSettleSellPosition },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].CONTROLLER, topic: ClearPositionTopic, abi: ControllerAbi, handler: handleClearPosition },

  // PositionManager - createClose, cancelClose
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].POSITION_MANAGER, topic: CreateClosePositionTopic, abi: PositionManagerAbi, handler: handleCreateClosePosition },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].POSITION_MANAGER, topic: CancelClosePositionTopic, abi: PositionManagerAbi, handler: handleCancelClosePosition },

  // Vault - Fee Rebate, Collect Fees, Collect Trade & Settle Fees
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_VAULT, topic: FeeRebateTopic, abi: VaultAbi, handler: handleFeeRebate },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_VAULT, topic: FeeRebateTopic, abi: VaultAbi, handler: handleFeeRebate },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_VAULT, topic: FeeRebateTopic, abi: VaultAbi, handler: handleFeeRebate },

  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_VAULT, topic: CollectFeesTopic, abi: VaultAbi, handler: handleCollectFees },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_VAULT, topic: CollectFeesTopic, abi: VaultAbi, handler: handleCollectFees },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_VAULT, topic: CollectFeesTopic, abi: VaultAbi, handler: handleCollectFees },

  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_VAULT, topic: CollectPositionFeesTopic, abi: VaultAbi, handler: handleCollectPositionFees },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_VAULT, topic: CollectPositionFeesTopic, abi: VaultAbi, handler: handleCollectPositionFees },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_VAULT, topic: CollectPositionFeesTopic, abi: VaultAbi, handler: handleCollectPositionFees },

  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_VAULT, topic: BuyUsdgTopic, abi: VaultAbi, handler: handleBuyUsdg },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_VAULT, topic: BuyUsdgTopic, abi: VaultAbi, handler: handleBuyUsdg },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_VAULT, topic: BuyUsdgTopic, abi: VaultAbi, handler: handleBuyUsdg },

  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_VAULT, topic: SellUsdgTopic, abi: VaultAbi, handler: handleSellUsdg },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_VAULT, topic: SellUsdgTopic, abi: VaultAbi, handler: handleSellUsdg },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_VAULT, topic: SellUsdgTopic, abi: VaultAbi, handler: handleSellUsdg },

  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_OLP_MANAGER, topic: AddLiquidityTopic, abi: OlpManagerAbi, handler: handleAddLiquidty },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_OLP_MANAGER, topic: AddLiquidityTopic, abi: OlpManagerAbi, handler: handleAddLiquidty },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_OLP_MANAGER, topic: AddLiquidityTopic, abi: OlpManagerAbi, handler: handleAddLiquidty },

  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_OLP_MANAGER, topic: RemoveLiquidityTopic, abi: OlpManagerAbi, handler: handleRemoveLiquidty },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_OLP_MANAGER, topic: RemoveLiquidityTopic, abi: OlpManagerAbi, handler: handleRemoveLiquidty },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_OLP_MANAGER, topic: RemoveLiquidityTopic, abi: OlpManagerAbi, handler: handleRemoveLiquidty },

  // VaultUtils - Notify Pending Amount
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_VAULT_UTILS, topic: NotifyPendingAmountTopic, abi: VaultUtilsAbi, handler: handleNotifyPendingAmount },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_VAULT_UTILS, topic: NotifyPendingAmountTopic, abi: VaultUtilsAbi, handler: handleNotifyPendingAmount },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_VAULT_UTILS, topic: NotifyPendingAmountTopic, abi: VaultUtilsAbi, handler: handleNotifyPendingAmount },

  // SettlePriceFeed - Feed Settle Price
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].SETTLE_PRICE_FEED, topic: FeedSettlePriceTopic, abi: SettlePriceFeedAbi, handler: handleFeedSettlePrice},

  // Referral
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].REFERRAL, topic: ParentChangedTopic, abi: ReferralAbi, handler: handleParentChanged },

  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].BTC_OPTIONS_TOKEN, topic: TransferSingleTopic, abi: OptionsTokenAbi, handler: handleOptionTokenTransfer },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].ETH_OPTIONS_TOKEN, topic: TransferSingleTopic, abi: OptionsTokenAbi, handler: handleOptionTokenTransfer },

  // OlpQueue
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_OLP_QUEUE, topic: EnqueuedMintAndStakeTopic, abi: OlpQueueAbi, handler: handleEnqueuedMintAndStake },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_OLP_QUEUE, topic: EnqueuedMintAndStakeTopic, abi: OlpQueueAbi, handler: handleEnqueuedMintAndStake },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_OLP_QUEUE, topic: EnqueuedMintAndStakeTopic, abi: OlpQueueAbi, handler: handleEnqueuedMintAndStake },

  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_OLP_QUEUE, topic: EnqueuedUnstakeAndRedeemTopic, abi: OlpQueueAbi, handler: handleEnqueuedUnstakeAndRedeem },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_OLP_QUEUE, topic: EnqueuedUnstakeAndRedeemTopic, abi: OlpQueueAbi, handler: handleEnqueuedUnstakeAndRedeem },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_OLP_QUEUE, topic: EnqueuedUnstakeAndRedeemTopic, abi: OlpQueueAbi, handler: handleEnqueuedUnstakeAndRedeem },

  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_OLP_QUEUE, topic: ProcessedQueueActionTopic, abi: OlpQueueAbi, handler: handleProcessedQueueAction },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_OLP_QUEUE, topic: ProcessedQueueActionTopic, abi: OlpQueueAbi, handler: handleProcessedQueueAction },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_OLP_QUEUE, topic: ProcessedQueueActionTopic, abi: OlpQueueAbi, handler: handleProcessedQueueAction },

  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].S_OLP_QUEUE, topic: CancelledQueueActionTopic, abi: OlpQueueAbi, handler: handleCancelledQueueAction },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].M_OLP_QUEUE, topic: CancelledQueueActionTopic, abi: OlpQueueAbi, handler: handleCancelledQueueAction },
  { address: CONTRACT_ADDRESSES[process.env.CHAIN_ID].L_OLP_QUEUE, topic: CancelledQueueActionTopic, abi: OlpQueueAbi, handler: handleCancelledQueueAction },
]
.filter((a) => !!a) // remove empty arrays
.flat()

// Schedule 타입 정의
export type Schedule = {
  topic: string
  abi: any[]
  handler: (log: any) => Promise<void>
}

// address로 그룹화된 schedules
export const schedulesByAddress: Record<string, Schedule[]> = schedules.reduce((acc, schedule) => {
  const address = schedule.address.toLowerCase()
  if (!acc[address]) {
    acc[address] = []
  }
  acc[address].push({
    topic: schedule.topic,
    abi: schedule.abi,
    handler: schedule.handler,
  })
  return acc
}, {} as Record<string, Schedule[]>)
