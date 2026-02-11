import { initializeRedis } from "../redis"

const FALLBACK_PROCESSING_TIMEOUT = 10

/**
 * 애플리케이션 레벨에서 feed 작업의 중복 실행을 방지하는 함수
 * 
 * @note processFeedTx vs shouldCheckPendingXXXXTx 차이:
 * - processFeedTx: Lambda 함수 레벨에서 중복 실행 방지 (작업 이름 기반, 10초 타임아웃)
 * - shouldCheckPendingXXXXTx: 블록체인 레벨에서 같은 nonce의 pending tx 처리 (주소+nonce 기반, 가스비 증가)
 * 
 * 두 메커니즘은 서로 다른 레벨에서 보호하므로 함께 사용하는 것이 좋습니다.
 */
export const processFeedTx = async (key: string, txCallback: (...args: any) => any) => {
    const { redis } = await initializeRedis()

    const isProcessing = await redis.get(`isProcessing:${key}`)

    if (isProcessing) {
        console.log(`processTx: ${key} is already processing`)
        return {
            isSuccess: false,
            receipt: { status: null }
        }
    }

    // set processing flag
    // @dev: set a timeout to prevent tx from being stuck in processing state
    await redis.set(`isProcessing:${key}`, 'true', 'EX', FALLBACK_PROCESSING_TIMEOUT)

    // process tx
    const result = await txCallback()

    await redis.del(`isProcessing:${key}`)

    return result
}