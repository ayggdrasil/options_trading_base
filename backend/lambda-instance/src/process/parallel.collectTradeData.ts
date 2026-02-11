import { Subject, interval, of, startWith, switchMap, takeUntil } from "rxjs"
import { collectTradeData } from "./collect.tradeData"

export const collectTradeDataParallel = async (event, maxRunningTime) => {

  const destroy$ = new Subject()

  const startTime = Date.now()

  const running = {
    collectTradeData: false
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

    runIntervally$(running.collectTradeData, collectTradeData, 15 * 1000, destroy$).subscribe()
  })

}

const runIntervally$ = (_runningPredicate, _func, _interval, _destroy$) => {
  return interval(_interval).pipe(
    startWith(0),
    switchMap(async () => {
      if (_runningPredicate) return of(false)
      _runningPredicate = true

      try {
        await _func()
      } catch (e) {
        console.log(e, '*e')
      }
      _runningPredicate = false
    }),
    takeUntil(_destroy$),
  )
}