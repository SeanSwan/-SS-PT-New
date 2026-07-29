---
decision: "C4 closed: three data-loss modes fixed (draft-wins gate, 409 draft preservation, advisory-lock dup guard), logger no-plan empty states, Today hero + week strip; NOW-panel card stack deferred with reason"
status: shipped
supersedes: none
---

# WORKOUT OS — C4 Receipt: Session Runner UX (2026-07-29)

Branch `claude/workout-os-build-20260729`. Commits: `37f1d9a81` (C4a), `9cd2687fa` (C4b), `1fc794675` (C4c). Built from the C4 probe (5 findings, all receipts in the probe result; 3 fixed here, 2 deferred with reason).

## C4a — Session resilience (data-loss class)
1. **Draft beats `?loadPlan=today`.** The restore banner was dead code on the canonical client URL (`!autoLoadTodayPlan` exclusion at the old WorkoutLogger.tsx:575 vs every dashboard CTA appending that flag). Now: synchronous storage peek (`hasStoredWorkoutDraft`) gates the plan auto-load via a tri-state (`pending`→`restored` blocks for the mount / `discarded` re-opens); banner extracted to `WorkoutDraftGateBanner`.
2. **Duplicate-409 preserves the draft.** The old branch cleared it — destroying the only copy of a second same-day workout. The prior contract test pinning that behavior was AMENDED with the evidence (Rule 52 burden met: concrete unrecoverable-loss scenario).
3. **Advisory-lock duplicate guard.** Same-day dedupe was findOne-then-insert with NO unique index (index needs a prod dupes-probe — deferred, own slice). `pg_advisory_xact_lock(hashtext('workout-form-save'), hashtext(clientId:date))` now serializes concurrent saves in-transaction; lock-before-dedupe ordering is route-test asserted.

## C4b — Logger empty states
The 7 empty outcomes of the plan loader (toast-only before) now set a `planLoadOutcome` {kind, message}; `ActivePlanContextStrip` renders a persistent role-aware panel (`WorkoutLoggerEmptyPlanState`: Ask Coach + plan-vault CTAs for self-mode, freestyle hint always; clears when exercises land). Loader setter optional — contract backward-compatible.

## C4c — Today-first entry + week strip (design per blueprint §3.2/§4, Runna lane)
`ClientTodayHero` mounts FIRST on My Workouts: 7-day local Monday strip (logged=`TRAIN.done` gold, today=`TRAIN.active` ring, rest=`TRAIN.pending`) fed by `ring-weekly-source` (no pagination lies), one primary CTA — "Start today's session" → canonical logger URL; flips to "See your progress" when today is logged. Provider-safe, fetch-once, failure-silent.

## Hostile-loop catches (fixed in-slice)
- Unstable test-mock `authAxios` identity → infinite effect loop → **vitest worker OOM** ("worker exited unexpectedly"). Fixed + `fetchedRef` fetch-once guard hardened on BOTH ring-source consumers (hero + WeeklyRingsCard, Rule 20 sweep).
- Duplicate accessible-name CTA collision (hero vs NextMove) — hero label differentiated.
- Shell line-cap ratchet trip (880>875) — banner extraction.
- Heredoc escape mangling — patch aborted atomically (assert-before-write), rewritten escape-free.

## Deferred with reason (recorded, not lost)
- **NOW panel / mobile card-stack runner redesign** (§3.2 full wireframe): the set-row law grid already covers phone ergonomics (Phase-2C); the card-stack NOW panel is a large rework of `ExerciseCardComponent` composition with its own design pass — schedule after C7 if Sean wants it (§10 candidate).
- Draft payload v2 (protocol selections + OPT phase lost on refresh) — needs versioned migration of the draft shape.
- `clientRequestId` on `/api/workout-forms` — needs a DailyWorkoutForm column migration; advisory lock covers the double-write class meanwhile.
- Unique index on (clientId, date) — prod dupes-probe first (Rule 58).

## Gates
C4a: logger dir 526/526 + route battery 43/43 + lock-order 7/7. C4b: logger dir 529/529. C4c: client-dashboard dir 277/277 + logger dir 529/529 (consecutive clean rounds). All commits secret-scan clean. Full tsc + vite build at batch gates.
