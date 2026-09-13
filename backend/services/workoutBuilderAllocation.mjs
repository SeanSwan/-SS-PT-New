/**
 * Workout-builder allocation and rotation helpers:
 * 1. distributeExerciseCount — spread a requested exercise count across
 *    movement families (base share first, remainder after, so a ceil-then-slice
 *    step cannot erase the final families).
 * 2. unionOfRecentSessions — the "no recent repeat" rotation window as the
 *    union of the last N SESSIONS' exercise keys. Truncating flat keys instead
 *    (slice(-7)) silently degraded the promise to "avoid the last one session",
 *    because a single session alone carries ~6-8 keys.
 */

export const ROTATION_SESSION_WINDOW = 7;

export function unionOfRecentSessions(sessionKeyBatches, windowSize = ROTATION_SESSION_WINDOW) {
  if (!Array.isArray(sessionKeyBatches)) return [];
  return [...new Set(sessionKeyBatches.slice(-windowSize).flat())];
}

export function distributeExerciseCount(totalCount, categories) {
  // Accept the numeric string a form or route may hand us. Number.isSafeInteger
  // alone silently scored '6' as 0 and returned [], erasing every movement
  // family from the workout instead of failing visibly; a genuinely invalid
  // value now throws rather than producing an empty plan.
  const requested = typeof totalCount === 'string' && totalCount.trim() !== ''
    ? Number(totalCount)
    : totalCount;
  if (requested != null && !Number.isSafeInteger(requested)) {
    throw new TypeError(
      `distributeExerciseCount: totalCount must be a safe integer, received ${JSON.stringify(totalCount)}`,
    );
  }
  const total = Number.isSafeInteger(requested) && requested > 0 ? requested : 0;
  const families = Array.isArray(categories) ? categories : [];
  if (families.length === 0 || total === 0) return [];

  const base = Math.floor(total / families.length);
  const remainder = total % families.length;
  return families.map((category, index) => ({
    category,
    count: base + (index < remainder ? 1 : 0),
  }));
}
