import { Subject, interval, of, startWith, switchMap, takeUntil } from "rxjs"
import { executePositionRequest } from "./execute.PositionRequest"

export const executePositionRequestParallel = async (event, maxRunningTime) => {

  const destroy$ = new Subject()

  const startTime = Date.now()

  const running = {
    executePositionRequest: false,
  }

  return new Promise((resolve) => {
    // running time checker
    interval(100).pipe(
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

    runIntervally$(running.executePositionRequest, executePositionRequest, 500, destroy$).subscribe()
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