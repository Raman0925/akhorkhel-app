import { INITIAL_STATE, type GateState } from './challenge';

/**
 * Misses and cooldown live in memory for the whole app session, so closing and reopening the gate
 * does not skip the cooldown. Nothing is persisted; restarting the app clears it.
 */
let memory: GateState = INITIAL_STATE;

export function getGateState(): GateState {
  return memory;
}

export function setGateState(state: GateState): void {
  memory = state;
}

/** Tests only. */
export function resetGateMemory(): void {
  memory = INITIAL_STATE;
}
