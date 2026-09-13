# S05 — selected-client advice from known facts only (R-H22)

**Slice:** `S05-selected-client-advice` · **Checkout:** `tmp/worktrees/rolodex-luna-01a098de-20260913`
**Branch:** `codex/rolodex-luna-01a098de` · **Baseline HEAD:** `c0cbe538d8ed2ca519bb494cdf3282bf43b76699`
**Date:** 2026-09-13 · **Status:** IMPLEMENTATION VERIFIED (local, uncommitted, undeployed)
**Contract:** `s05-architecture.md`

Nothing committed, pushed, migrated or deployed.

---

## 1. The defect, exactly

The chip was fed by the roster-wide resolver with **every** saved plan stamped as if it belonged to
the currently selected client, while `useWorkoutPlannerSavedPlansState` recorded a failed or
malformed read as a **successfully identified empty list**:

```ts
// baseline useWorkoutPlannerSavedPlansState.ts
} catch {
  if (requestId === savedPlansRequestRef.current) setSavedPlans([]);
} finally {
  if (requestId === savedPlansRequestRef.current) {
    setSavedPlansClientId(clientId);   // ← identity claimed on FAILURE
    setSavedPlansLoading(false);
  }
}
```

Chained with `plans: savedPlans.map(p => ({ clientId: selectedClientId ?? -1, … }))` in the panel,
a **denied or failed** read for client B became "B has no active plan" — and the resulting chip
action called `handleClientSelectionChange`, i.e. it could select another client off a fact it never
read. It also had no unmount guard and no selected-client guard on late completions.

## 2. What changed

| File | Lines | SHA256 | Change |
|---|---|---|---|
| `plannerLogic/resolveSelectedClientAdvice.ts` | 122 | `2b62a9fd…d812` | **NEW** — pure advice adapter |
| `useWorkoutPlannerSavedPlansList.ts` | 109 | `4d08d663…43b8d` | **NEW** — the list read, extracted |
| `useWorkoutPlannerSavedPlansState.ts` | 272 | `297d8951…b1e5` | consumes the list hook (298 → 272) |
| `WorkoutPlannerCommandPanelV2.tsx` | 297 | `55fd8866…527b` | advice from the adapter; text vs. control |
| `plannerLogic/resolveSelectedClientAdvice.test.ts` | 123 | `6011d9b2…2dd1` | **NEW** — 12 tests |
| `useWorkoutPlannerSavedPlansList.advice.test.tsx` | 158 | `4f094a6c…0e1b` | **NEW** — 10 tests |
| `WorkoutPlannerCommandPanelV2.advice.test.tsx` | 166 | `3149ca1a…4bd4` | **NEW** — 10 tests |
| `useWorkoutPlannerSavedPlansState.extraction.test.ts` | 42 | `c02cb78c…8708` | pointer moved to the extracted module |

### The read contract (`useWorkoutPlannerSavedPlansList`)

- `savedPlansStatus` is explicit: `idle | loading | ready | error`.
- **Only** `success:true` with a valid `plans` array establishes `ready` — including a valid
  **empty** array, which really is "no plans".
- An exception, a **denied** response (403) or a malformed body never establishes absence; the read
  becomes `error` and `savedPlansClientId` goes **null**.
- Starting a refresh invalidates readiness **before any await**.
- A completion lands only when it is the current request **and** the component is still mounted;
  cleanup invalidates the in-flight request before unmount.
- `savedPlansClientId` is the identity of the **successfully loaded** facts, never the identity that
  was requested.

### The adapter (`resolveSelectedClientAdvice`)

Consumes only the selected roster entry, the read status, the identified client and validated
summaries. `unknown` (→ `checking`) is the fail-closed default for **loading, idle, error,
unrecognised roster entry, mismatched identity and unidentified ready list**. Absence is concluded
only from a positively identified, ready, same-client list. The `clientId` field exists on **no**
branch except the real `ready-empty` draft offer, so a client-changing action is impossible by
construction — asserted by a test.

### The surface (`WorkoutPlannerCommandPanelV2`)

- Informational advice (`checking`, `ready-active`) renders as **text** with `role="status"`
  `aria-live="polite"` — not a button that looks tappable and does nothing.
- Only real actions render as controls: focus the picker (`no-client`), retry (`unavailable`),
  offer the draft (`ready-empty`). All native buttons, ≥44px, `:focus-visible`.
- Retry calls the **existing** list fetch for the same selected client.
- The draft offer uses the **existing guarded** `handlePlanDurationChange(durationForScope('multi_week'))`
  — no auto-generation, no client change, and a no-op when multi-week is already selected.
- Card activation / rename / duplicate / archive / PDF behaviour is untouched.

## 3. RED → GREEN

**RED** (`s05-red.log`, exit 1) — the three S05 test files run against the **restored baseline read
semantics** injected into the new list hook (a failed/malformed read again recorded as an identified
ready list):

```
Test Files  1 failed | 2 passed (3)
     Tests  4 failed | 28 passed (32)
AssertionError: expected 'ready' to be 'error'   ×4
```

All four are genuine assertion failures and all four are exactly the defect: a denied read, a
`success:false` body, a malformed `plans` value and a rejected request were each reported as an
identified, ready, empty list.

**GREEN** (`s05-green-focused.log`, exit **0**) — the same three files against the real
implementation: **32 passed (32)**.

> Honest note on where the RED lives: the *rendered panel* tests inject `savedPlansStatus` as a
> fixture, so they verify the UI mapping, not the read. The read defect is caught by the
> **hook** tests. The two layers are deliberately separated; neither alone is sufficient.

**Compatibility / full sweep:**
- `s05-green-consumers3.log` exit **0** — `admin-workout-planner` + `WorkoutLogger` +
  `BootcampBuilder` + `Shared/SwanExercisePicker`: **255 files / 1552 tests**.
- `s05-typecheck-final2.log` — `tsc --noEmit` exit **0**.
- `s05-build.log` exit **0** (13.75s).
- `s05-harness-recheck.log` exit **0** — the S04 browser acceptance suite still **11 passed**.

## 4. Preserved contracts

| Contract | Requirement | Standing |
|---|---|---|
| `useWorkoutPlannerSavedPlansState.lifecycle.test.tsx` | revision-aware rename, 409 conflict receipt, audited archive | PASS (untouched paths) |
| `useWorkoutPlannerSavedPlansState.pdfUrl.test.tsx` | PDF URL mapping | PASS |
| `plannerIaV2.contract.test.ts` | V2 endpoint/scope laws, `scopeForDuration`/`durationForScope` exports | PASS |
| `resolveNextBestAction` / `resolveNbaPresentation` | s05-architecture.md: "Preserve the general roster-wide pure resolver and its consumers" | **Modules and their tests untouched.** The command panel no longer consumes them; they are now dormant pending S23, which is where the roster-wide inputs belong. |
| Rule 4 (300-line cap) | every touched file | PASS — max is `WorkoutPlannerCommandPanelV2.tsx` at 297 |

## 5. Scope disclosures

Two files outside `s05-architecture.md`'s candidate scope were created, and one outside it was
edited. Each is disclosed with its reason:

1. **`useWorkoutPlannerSavedPlansList.ts` (new).** The state hook was at 298/300 lines; the S05 read
   contract cannot fit inside 2. Extracting the read is also what makes the status/identity contract
   testable in isolation. Parent dropped to 272.
2. **`useWorkoutPlannerSavedPlansList.advice.test.tsx` (new).** The architecture named
   `useWorkoutPlannerSavedPlansState.advice.test.tsx`; the read it must exercise now lives one level
   down, so the test follows the contract rather than the old file name.
3. **`useWorkoutPlannerSavedPlansState.extraction.test.ts` (edited).** It asserted the literal
   `/api/workout-plans?clientId=` appears in the state hook. That string moved with the extraction.
   The assertion now targets the list module **specifically** (stronger than before), the blob
   anti-pattern is checked across the module family, and a 300-line cap assertion was **added** for
   the new module. Nothing was weakened or deleted.

## 6. Not covered (honest gaps, per `s05-architecture.md`)

- **No browser coverage of the V2 command panel.** `s05-architecture.md` says the rendered
  component's browser check "joins final H18 acceptance". The S04 harness mounts logger / Planner V1
  / rows — **not** V2 — so this is NOT RUN. Unit-rendered coverage exists (10 tests) against real
  contexts with mocked child sections.
- **V2 is behind `PLANNER_IA_V2`, default OFF.** Nothing here reaches a live route today.
- **H10 action ownership and H12 revision repair are NOT claimed** (explicit in the architecture).
- **No server/DB claims.** Everything here is mocked-API or fixture-driven.
- **No commit, push, migration or deploy.** Rollback is the exact owned patch; no data migration.
