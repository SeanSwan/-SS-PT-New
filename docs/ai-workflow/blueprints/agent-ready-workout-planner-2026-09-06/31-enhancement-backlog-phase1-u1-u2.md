# Enhancement backlog phase 1: contract hardening + U1 + U2

Layered on `rolodex-bootcamp-baseline-v1` (df3b6ee56). Committed as `4b31241c2`, tagged
`rolodex-bootcamp-baseline-v2`.

## Phase 1 — contract hardening (Fable Gate items, all RED→GREEN where a behavior changed)

- **prescribedWorkSec unit lock (D-4)**: bases below 10 seconds are a caller bug — now THROW
  ("must be SECONDS … rep count was likely passed") instead of silently clamping into a
  plausible-looking interval. UNIT CONTRACT documented at the export.
- **PII boundary (D-8)**: new allowlist test proves the sprint generation payload crosses ONLY
  {classFormat, classStyle, dayType, spaceProfileId, trainerId, exclusionKeys, includeStretch,
  stretchDurationMin, prescriptionIntensity} — no client identifiers, no pain free-text. A future
  smuggled field fails the suite.
- **Scorer goldens (D-5)**: 10 pinned id-orderings (substring, initials, type, muscle-substring,
  muscle-fuzzy, fuzzy-walk, category, combined) that BOTH the worker and the fallback must
  reproduce exactly — on top of the live-parity lock.
- **PROGRESSION reconciliation (D-6)**: base `c0cbe538d` map values pinned as goldens (linear cap,
  undulating cycle, block bands, random band ×200) — any drift from a future repair fails.
- **Runner parent contract (D-10)**: exported `BootcampRunnerParentContract` interface; hook
  signature and consumer updated.

## U2 — exclusion windows

`getSprintExerciseMemoryEntries()` exposes memory keys WITH week-of-first-use; the generation loop
excludes only keys first used within `EXCLUSION_WINDOW_WEEKS = 4` of the week being generated
(previous-sprint keys remain fully excluded by design). Back-half novelty starvation fixed.
Slot-mock now honors the status `where` (the real DB filters; the mock didn't).

## U1 — pain-swap visibility

`collectPainSwaps()` projects `{from, to, region, severity}` from gated exercises onto the generated
class (`painSwaps`). Types extended (`BootcampExercise.painSwap`, `GeneratedBootcamp.painSwaps`).
The floor board (the surface the coach runs the class from) renders a
"⇄ Swapped from {movement}" badge per auto-swapped exercise with a full aria-label narrating the
replacement and the reason. Render-tested (badge present exactly once, untouched movements clean).

## Verification (Gate-1 format, on this layer)

bootcamp 39 files/218 tests · hooks+sprint 64/280 · planner 87/457 · backend group 14 files/90 ·
server-RED 4/25 both configs (real PostgreSQL) · `tsc --noEmit`@16384MB 0 errors · Playwright 7/7
(XR Chromium + WebKit censuses, keyboard/focus, 20-viewport matrix).

## Remaining backlog (next slices, in order)

U3 advisory-lock lease (architecture; needs its own design pass + migration) · D-Q4 runner clock
unification · D-Q3 claim-cleanup ops visibility · U4 weekly parallel generation (depends on U3) ·
U5 gating purity (no input mutation) · U6 roster query cache · U7 runner persistence +
visibilitychange recovery · U8 progression sparkline · Astra D1/D2 generator counting bugs ·
Fable copy-scan + ≤300-line sweep. NOT DEPLOYED, no push (branch is not main), no paid calls.
