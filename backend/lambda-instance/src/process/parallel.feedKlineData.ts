import { Subject, interval, of, startWith, switchMap, takeUntil } from "rxjs"
import { feedBinanceKlineData } from "./feed.binanceKlineData"

export const feedKlineDataParallel = async (event, maxRunningTime) => {
  const startTime = Date.now()

  const destroy$ = new Subject()

  const running = {
    feedBinanceKlineDataBTC: {
      isRunning: false,
      symbol: 'BTCUSDC',
    },
    feedBinanceKlineDataETH: {
      isRunning: false,
      symbol: 'ETHUSDC',
    }
  }

  return new Promise((resolve) => {
    // running time checker
    interval(1000).pipe(
      takeUntil(destroy$),
    ).subscribe(() => {
      console.log('running...')

      const runningTime = Date.now() - startTime
      if (runningTime >= Number(maxRunningTime) * 1000) {
        console.log('run complete')
        destroy$.next(true)
        return resolve(true)
      }
    })

    runIntervally$(running.feedBinanceKlineDataBTC, feedBinanceKlineData, 1 * 1000, destroy$).subscribe()
    runIntervally$(running.feedBinanceKlineDataETH, feedBinanceKlineData, 1 * 1000, destroy$).subscribe()
  })
}

const runIntervally$ = (_runningState, _func, _interval, _destroy$) => {
  return interval(_interval).pipe(
    startWith(0),
    switchMap(async () => {
      if (_runningState.isRunning) return of(false)
      _runningState.isRunning = true

      try {
        await _func(_runningState.symbol)
      } catch (e) {
        console.log(e, '*e')
      }

      _runningState.isRunning = false
    }),
    takeUntil(_destroy$),
  )
}