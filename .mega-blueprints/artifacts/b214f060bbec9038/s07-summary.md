# S07 — calendar-safe Sprint scaffolding and legacy format fidelity (R-H06)

**Slice:** `S07` · **Checkout:** `tmp/worktrees/rolodex-luna-01a098de-20260913` @ `c0cbe538d`
**Date:** 2026-09-13 · **Status:** IMPLEMENTATION VERIFIED (local, uncommitted, undeployed)

Nothing committed, pushed, migrated or deployed.

---

## 1. The defect, measured

Baseline `buildSprintSchedule` in `sprintService.mjs` built dates with
`new Date('2026-03-02')` (parsed as **UTC** midnight), then `.getDay()` / `.setDate()` in the
**host's local** time, then formatted with `.toISOString()` back in **UTC**. West of UTC it reads
the previous local day, so the weekday is off by one — and near a DST boundary the offset changes
mid-loop.

Measured on the **unmodified baseline** (`s07-baseline-utc.json` / `s07-baseline-la.json`), the same
call, same 2-week sprint starting Monday 2026-03-02:

| | UTC | America/Los_Angeles |
|---|---|---|
| week 1 sessions | 03-02, 03-04, 03-06 (Mon/Wed/Fri) | **03-03, 03-05, 03-07 (Tue/Thu/Sat)** |
| week 2 start | 2026-03-09 | **2026-03-08** |
| week 2 end | 2026-03-15 | **2026-03-14** |

A trainer's sprint landed on the wrong days purely because of where the server ran.

## 2. What changed

| File | Lines | SHA256 | Change |
|---|---|---|---|
| `backend/services/bootcamp/sprintCalendarContract.mjs` | 216 | `f2611621…0133` | **NEW** — pure calendar contract |
| `backend/services/bootcamp/sprintService.mjs` | 263 | `3002a0ea…5871` | delegates; validates before the transaction (was 299) |
| `backend/tests/unit/sprintCalendarContract.test.mjs` | 284 | `a0a0898f…630c` | **NEW** — 23 tests |
| `backend/tests/unit/sprintCreateCalendar.test.mjs` | 170 | `09d51bb2…123f` | **NEW** — 16 tests |

### Contract rules encoded

- **Date-only, always.** Strict `YYYY-MM-DD` with a real round-trip (rejects `2026-02-30`,
  `2026-13-01`, `2026-3-2`, timestamps). All arithmetic goes through `Date.UTC` components; the
  weekday is read with `getUTCDay()`. No local `getDay`/`setDate`, no `toISOString` on a
  locally-built `Date`.
- **Validation before the first transaction.** Safe-integer `durationWeeks` 1–52; one to seven
  **unique** valid weekday names; non-empty supported `focusRotation`; `classesPerWeek` must equal the
  normalized weekday count. Duplicates, malformed members, non-strings, invalid dates and impossible
  counts **throw** (`reason` codes for sanitized logging) instead of being dropped.
- **Weekday tokens are trimmed and lowercased**; the existing omitted-field defaults are preserved
  exactly (12 weeks, Mon/Wed/Fri, lower/upper/full body).
- **Chronological rotation.** Week one starts on the supplied start date; each week covers seven
  calendar dates; each chosen weekday occurs once inside its window; occurrences are **sorted
  chronologically before** the rotating focus is assigned across actual session order. The baseline
  assigned in caller-listing order, so listing Friday first would have put week-1 focus on Friday.
- **End date** = start + `durationWeeks*7 - 1` calendar days. Ordinal `weekNumber` and the existing
  fourth-week deload scaffold fields are unchanged.
- **`buildSprintSchedule` is now a thin alias** over the contract, so existing internal call sites and
  tests keep the same call shape.

> **Not claimed:** full progression/deload semantics (R-H20) are untouched; no historical schedule
> rewrite, no migration, no timezone preference feature, no generation dispatch. Sprint object
> authorization is the separate claim/fence slice and **remains visibly pending**.

## 3. RED → GREEN

**RED (`s07-baseline-*.json`)** — the baseline function's own source extracted and run under both
timezones, showing the divergence in §1. The probe was a temporary file and has been deleted.

**GREEN**
- `s07-contract-green.log` exit **0** — **23/23**. Includes exact dates across **both** DST boundaries
  (spring-forward 2026-03-08 and fall-back 2026-11-01), a leap day (2024-02-28→29), year rollover
  (2026-12-31→2027-01-01) and a non-Monday start; a **trap that makes `getDay`/`setDate`/`getDate`
  throw**, so any local-time access fails hard instead of drifting silently; and a **real subprocess
  run under `TZ=America/Los_Angeles`** whose dates, day types, week starts and end date are asserted
  identical to the in-process UTC result.
- `s07-create.log` → `s07-create2.log` exit **0** — **16/16** service-level tests: twelve invalid
  inputs each reject **without opening a transaction and without a single write**; a valid save
  persists the UTC-correct dates, weekday order, chronological focus and exact counts; normalized
  weekday order and focus are persisted; defaults apply; a late slot-write failure **rolls back**.
- `s07-backend-suite-final.log` exit **0** — **1053 files / 8599 tests**.
- `s07-integration-recheck.log` exit **0** — S06's real-PostgreSQL suite still **5/5**.

> Honest scoping: the rollback test proves the **service asked for a rollback**. It does not prove
> PostgreSQL rolled anything back — that is S06's integration suite, which is separate and green.

## 4. Not done

- **Legacy `FORMAT_CONFIG` route allowlists** were not touched: S07's scope says to repair
  `bootcampRoutes.mjs` "only if its legacy allowlist still requires repair after S06", and S06 did not
  change format handling. The legacy keys (`stations_4x`, `stations_3x5`, `stations_2x7`,
  `stations_3x4`, `stations_5x3`) are unchanged and their existing route tests still pass. **Not
  independently re-verified here** — flagged rather than claimed.
- **Shared-model integration for the sprint tables in the owned database is NOT run.** S07's
  architecture defers that to "final server proof". The `sprint_*` models were never synced into the
  fixture, so no real-PostgreSQL sprint persistence proof exists yet.
- **UI wireframes N/A** for the pure date contract (per the architecture); the consumer's existing
  error/retry states are unchanged.
