/**
 * ============================================================================
 * FILE: localDate.ts
 * PURPOSE: Local-calendar date-only helpers (NOT UTC)
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-15 (Phase 13.1)
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Small shared helpers for "date-only" semantics in the admin/trainer
 * workflow. All functions operate on the *local* calendar date of the
 * machine running the code — never UTC.
 *
 * WHY IT EXISTS:
 * `new Date().toISOString().split('T')[0]` returns the current *UTC* day,
 * which for a user in America/Los_Angeles can be TOMORROW's date after
 * ~5pm PDT. Likewise, `new Date('2026-04-15')` parses as UTC midnight,
 * which in PDT is 2026-04-14 17:00 local — the "wrong" day. Both shortcuts
 * silently corrupt the transcript review/apply flow:
 *
 *   - date input defaults to tomorrow after 5pm PDT
 *   - future-date guard thinks today is future
 *   - duplicate-date check compares the wrong calendar day
 *
 * The fix is to always anchor date-only values to the user's local calendar
 * date using component accessors (`getFullYear`, `getMonth`, `getDate`).
 *
 * WHEN TO USE / NOT USE:
 *   - USE for UI inputs where the user picks a calendar day (e.g. the
 *     transcript review date picker, Workout Logger date fields).
 *   - USE for client-side "is this day in the future" checks.
 *   - DO NOT USE for timestamps that represent an instant (start time,
 *     session duration, XP award time) — those must stay in full ISO.
 *
 * SCOPE: frontend only. Backend handles its own local-noon anchoring
 * when it receives date-only strings (see
 * `backend/services/workout/workoutLogService.mjs`).
 */

/**
 * Return YYYY-MM-DD for the caller's *local* calendar date.
 *
 * Defaults to now. Pass an explicit `Date` only when you need to normalize
 * an arbitrary instant to its calendar day (e.g. the server returned a
 * full timestamp and you want to display "day of").
 *
 * Invariant: output is a 10-character string that round-trips through
 * `parseLocalIsoDate` → `getLocalIsoDate` with no drift.
 */
export function getLocalIsoDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string into a `Date` anchored at *local* midnight.
 *
 * `new Date('2026-04-15')` is UTC midnight (wrong for local semantics).
 * This helper constructs the date from numeric components so the result
 * is local-timezone midnight on the given calendar day.
 *
 * Returns `null` for any input that is not a strict 10-character
 * YYYY-MM-DD. Callers should treat `null` as "unparseable" and fall
 * back to whatever default is appropriate for the surface.
 *
 * Accepts only ASCII digits + hyphens — no whitespace tolerance. If you
 * control the source (an `<input type="date">` or a canonical emission
 * from `getLocalIsoDate`) that's fine. If you're parsing user free-text,
 * trim first.
 */
export function parseLocalIsoDate(s: string | null | undefined): Date | null {
  if (typeof s !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(year, month - 1, day);
  // Guard against Feb-30-style overflow (new Date(2026, 1, 30) silently
  // becomes 2026-03-02). If the round-trip disagrees, the input was
  // a non-calendar date.
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) {
    return null;
  }
  return dt;
}

/**
 * True if `candidate` (a YYYY-MM-DD string) is strictly AFTER today's
 * local calendar date. Same-day is NOT future.
 *
 * `now` is injectable for deterministic tests — callers should not pass
 * it in production code.
 *
 * Unparseable input returns `false` (fail-open): callers that want
 * strict validation should also run `parseLocalIsoDate` upstream.
 */
export function isFutureLocalDate(candidate: string, now: Date = new Date()): boolean {
  const parsed = parseLocalIsoDate(candidate);
  if (!parsed) return false;
  const today = parseLocalIsoDate(getLocalIsoDate(now));
  if (!today) return false;
  return parsed.getTime() > today.getTime();
}
