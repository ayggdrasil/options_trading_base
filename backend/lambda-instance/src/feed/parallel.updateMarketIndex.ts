import { Subject, interval, of, startWith, switchMap, takeUntil } from "rxjs";
import { updateFutures } from "../feed/update.futures";
import { updateSpot } from "../feed/update.spot";

export const updateMarketIndexParallel = async (event, maxRunningTime) => {
  const startTime = Date.now();
  const destroy$ = new Subject();

  const running = {
    futures: {
      isRunning: false,
    },
    spot: {
      isRunning: false,
    },
  };

  return new Promise((resolve) => {
    // running time checker
    interval(1000)
      .pipe(takeUntil(destroy$))
      .subscribe(() => {
        console.log("running...");

        const runningTime = Date.now() - startTime;

        if (runningTime >= Number(maxRunningTime) * 1000) {
          console.log("run complete");
          destroy$.next(true);
          return resolve(true);
        }
      });

    runIntervally$(running.futures, updateFutures, 1 * 1000, destroy$).subscribe();
    runIntervally$(running.spot, updateSpot, 1 * 1000, destroy$).subscribe();
  });
};

const runIntervally$ = (_runningState, _func, _interval, _destroy$) => {
  return interval(_interval).pipe(
    startWith(0),
    switchMap(async () => {
      if (_runningState.isRunning) return of(false);
      _runningState.isRunning = true;

      try {
        await _func();
      } catch (e) {
        console.log(e, "*e");
      }

      _runningState.isRunning = false;
    }),
    takeUntil(_destroy$)
  );
};
