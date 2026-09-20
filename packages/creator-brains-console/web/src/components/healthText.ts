/*
 * healthText — render a health reading so that its PROVENANCE is visible (R2-01).
 *
 * WHY THIS IS ITS OWN MODULE. Two reasons, and the second is the one that forced
 * it. First, it is a pure function of one value: no React, no styles, no state —
 * so it belongs in a unit test of its own rather than behind a component render.
 * Second, `StatusBoard.tsx` is under the repo's 300-line cap (CLAUDE.md rule 4)
 * and adding this logic in place took it to 311. The cap is not mine to raise —
 * it is the constraint that keeps a file legible — so the seam is where the code
 * already wanted to be. The rule-4 test reported the violation by name, which is
 * the cap working exactly as intended.
 *
 * THE DEFECT IT CLOSES. The old rendering was one ternary on `ok`, which merged
 * three different facts into two strings:
 *
 *   - `source: 'unknown'` — no verdict has been taken. The probe has not run and
 *     there is no history entry. It rendered as "not resolved", which reads as a
 *     FAILED check. It is not a failed check; it is the absence of one.
 *   - `ok: true, source: 'history'` — a past success replayed from the daily
 *     pass. It rendered as a bare "ok", indistinguishable from a live probe.
 *     Every history reading is stale by definition (lib/health.mjs), so the one
 *     thing the operator must be told is that this is not a live verdict.
 *   - `ok: false` — a real failure, and the only case where the reason belongs.
 *
 * The type change that makes this expressible is in `adapters/types.ts`; without
 * the provenance fields on `HealthReading` this function could not be written at
 * all, which is why the finding names the contract and the consumer together.
 */

import type { HealthReading } from '../adapters';

/** "2m", "3h", "4d" — a coarse age, for a reading that is not live. */
export function age(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 90) return `${s}s`;
  if (s < 5400) return `${Math.round(s / 60)}m`;
  if (s < 172_800) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86_400)}d`;
}

export function healthText(h: HealthReading): string {
  if (h.source === 'unknown') return 'not yet checked — no verdict has been taken';
  const when = h.checkedAt ? ` as of ${h.checkedAt}` : '';
  if (h.source === 'history') {
    const ago = h.ageMs === null ? '' : ` (${age(h.ageMs)} ago)`;
    return h.ok
      ? `ok${when}${ago} — from the last recorded check, not a live one`
      : `last check failed${when}${ago} — ${h.reason}`;
  }
  // source === 'probe': a live verdict, fresh unless the cache says otherwise.
  const ago = h.stale && h.ageMs !== null ? ` (cached, ${age(h.ageMs)} old)` : '';
  return h.ok
    ? `ok · ${h.version ?? 'version unknown'}${ago}`
    : `failed — ${h.reason}${ago}`;
}
