import { Subject, interval, of, startWith, switchMap, takeUntil } from "rxjs"
import { collectMarketData } from "./collect.marketData"

export const collectMarketDataParallel = async (event, maxRunningTime) => {
  const destroy$ = new Subject()

  const startTime = Date.now()

  const running = {
    collectMarketData: {
      isRunning: false,
      count: 0
    }
  }

  return new Promise((resolve) => {
    interval(1000).pipe(
      takeUntil(destroy$),
    ).subscribe(() => {
      console.log('running...')

      const runningTime = Date.now() - startTime
      if (runningTime >= Number(maxRunningTime) * 1000) {
        console.log('run complete')
        console.log(`collectMarketData was called ${running.collectMarketData.count} times`); // Log the final count
        destroy$.next(true)
        return resolve(true)
      }
    })

    runIntervally$(running.collectMarketData, collectMarketData, 15 * 1000, destroy$).subscribe()
  })

}

const runIntervally$ = (_runningState, _func, _interval, _destroy$) => {
  return interval(_interval).pipe(
    startWith(0),
    switchMap(async () => {
      if (_runningState.isRunning) return of(false)
      _runningState.isRunning = true

      try {
        _runningState.count++
        await _func(_runningState.count, true)
      } catch (e) {
        console.log(e, '*e')
      }

      _runningState.isRunning = false
    }),
    takeUntil(_destroy$),
  )
}