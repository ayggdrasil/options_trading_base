import { Interface } from "ethers"
import { provider } from "../provider"
import { Schedule } from "../sync.schedule"
import { sendMessage } from "../slack"
import { LogLevel } from "./enums"

/**
 * 하나의 address에 대해 여러 topics를 한 번의 RPC 호출로 조회
 * topics 배열을 OR 조건으로 사용하여 eth_getLogs 호출 횟수를 줄임
 */
export const getLogsByAddress = async (
  fromBlock: number,
  toBlock: number,
  address: string,
  schedules: Schedule[],
) => {
  // 모든 topics를 배열로 만들어 OR 조건으로 조회
  const allTopics = schedules.map(s => s.topic)
  
  const logs = await provider.getLogs({
    fromBlock,
    toBlock,
    address,
    topics: [allTopics], // [topic1, topic2, ...] → OR 조건
  })

  if (logs.length === 0) return

  // topic → schedule 매핑 (빠른 lookup을 위해)
  const topicToSchedule = new Map<string, Schedule>()
  for (const schedule of schedules) {
    topicToSchedule.set(schedule.topic, schedule)
  }

  // uniq blocks
  const blockToQuery = [...new Set(logs.map((log) => log.blockNumber))]

  // get block timestamp
  const blocks = await Promise.all(blockToQuery.map((blockNumber) => provider.getBlock(blockNumber)))
  
  // block number => block timestamp
  const blockTimestamps = blocks.reduce((acc, block) => {
    acc[block.number] = block.timestamp
    return acc
  }, {} as Record<number, number>)

  // 로그를 순회하면서 해당 topic의 handler로 라우팅
  for (const log of logs) {
    const eventTopic = log.topics[0]
    const schedule = topicToSchedule.get(eventTopic)
    
    if (!schedule) {
      console.warn(`Unknown topic: ${eventTopic} for address: ${address}`)
      await sendMessage(
        `\`[Eventnode][logs.ts]\` Unknown topic detected`,
        LogLevel.WARN,
        {
          description: `Topic: ${eventTopic}\nAddress: ${address}\nBlock: ${log.blockNumber}\nTxHash: ${log.transactionHash}`,
        }
      )
      continue
    }

    const parsed = new Interface(schedule.abi).parseLog({
      data: log.data,
      topics: log.topics as any,
    })

    await schedule.handler({
      args: parsed.args,
      transactionHash: log.transactionHash,
      blockNumber: log.blockNumber,
      address: log.address,
      block: {
        timestamp: blockTimestamps[log.blockNumber],
      }
    })
  }
}