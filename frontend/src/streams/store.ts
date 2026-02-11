import { SupportedChains } from "@callput/shared";
import { BehaviorSubject, Subject } from "rxjs";
import { loadNetworkStateFromLocalStorage } from "@/store/slices/NetworkSlice";
import store from "@/store/store";

export const network$ = new BehaviorSubject<SupportedChains>(loadNetworkStateFromLocalStorage().chain);
export const disconnect$ = new Subject();

// @ts-ignore
window.network$ = network$;

store.subscribe(() => {
  const state = store.getState();

  if (state.network.chain !== network$.value) {
    network$.next(state.network.chain);
  }
});
