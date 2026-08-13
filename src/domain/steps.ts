const NICE_STEPS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

/** Cap how many taps it takes to walk from 0 to target. */
const MAX_TAPS = 20;

/**
 * A +/- increment that keeps the control usable regardless of target scale:
 * few, round taps for "10,000 steps", finer ones for "8 cups".
 */
export function niceStep(target: number): number {
  for (const step of NICE_STEPS) {
    if (target / step <= MAX_TAPS) return step;
  }
  return NICE_STEPS[NICE_STEPS.length - 1];
}
