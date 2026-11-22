/** Injectable clock so ad caps can be tested without real time passing. */
type Now = () => number;

const systemNow: Now = () => Date.now();
let current: Now = systemNow;

export function now(): number {
  return current();
}

/** Tests only: replace the clock; call with no argument to restore the system clock. */
export function setClock(fn?: Now): void {
  current = fn ?? systemNow;
}
