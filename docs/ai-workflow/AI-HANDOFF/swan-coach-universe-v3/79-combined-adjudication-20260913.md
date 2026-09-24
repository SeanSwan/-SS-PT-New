# Combined adjudication — Swan Coach Universe V3, 2026-09-13 session

**Scope of this document.** This adjudicates everything this session reviewed,
implemented or corrected, against the held queue in
[70 — release and worktree audit](70-release-and-worktree-audit.md). It is the
companion to [78 — session handoff](78-session-handoff-20260913.md), which covers
*what to do next*; this covers *what was decided and on what evidence*.

[73 — the six-finding adjudication](73-g11-original-six-findings-adjudication.md)
remains the specific record for the six original HR1 findings and is not repeated
here.

**State at the time of writing: every queue item is now committed or explicitly
recorded as not started, with the reason.** C2/C3 landed last, as `ec1e05dbd`. Nothing
here claims a result for work whose agent had not reported and whose suite root had not
executed. Where a claim is provisional or partial it is labelled so — in particular C3
is **partial**, and the C2/C3 implementer's own report contained one false claim that
root checked and corrected rather than repeated.

---

## 0. Queue coverage — every held slice, and where it stands

Mapping the held queue in [70](70-release-and-worktree-audit.md) onto this session's
commits. **Every SHA below was verified to resolve to a real commit and to be an
ancestor of HEAD** — not cited from memory. Re-verify with:

```
git log --oneline 4345b86cf..HEAD         # the whole session
git merge-base --is-ancestor <sha> HEAD   # one slice
```

| Queue item | Commit(s) | Verdict |
|---|---|---|
| M68 (incl. HR16) | `2cc843ad1`, `2aeb2783e` | **CLOSED** |
| HR12 / P58 | `19fba5c8a` | **CLOSED** |
| HR13 | — | **NOT STARTED — gated.** Needs an exclusive `useCoachCommand.ts` window and must follow C1–C4; plan 59 says "plan only, no implementation enqueue" |
| HR14 | `2d5aec4b3` | **CLOSED** |
| R60-A | `dce0da517` | **CLOSED** |
| C1 | `f343d3df4` | **CLOSED** — dormancy resolved by C3 (`ec1e05dbd`) across the four consumers; producers still un-admitted |
| C4 | `b36f874d7` | **CLOSED** — same resolution |
| C2 / C3 | `ec1e05dbd` | **CLOSED — dormancy resolved on the CONSUMER side.** The four C4 consumers now receive the adapter's own binding (verified by root: acceptance test 5/5 green; can-fail reproduced — severing one consumer's binding reds 3 of 5). C3 is **PARTIAL**: two producers still mutate before admission and were not converted |
| P64 / S66 | `adf5e74c5` | **CLOSED** |
| HR15 | `2fd272bf4` | **CLOSED** |
| clientAccess | `62d753514`, `474b3524c`, `1e376a013` | **CLOSED by measurement** — 12 client-role `authorize` lists, 0 lacking `'user'`, two independent detectors |
| G07 | — | **NOT STARTED — now classified as needing a spec**, both halves. Register §G07-R |
| G09 | `47012147e`, `02684666f` | **routes CLOSED; purge NARROWED** (scheduler exists but default-OFF); conflict writer and memory UI NOT STARTED |
| G10 | `c88fa7039`, `c6de0d021` | **wiring + consent CLOSED**; frontend consumer NOT STARTED |
| G11 | — | **one gate partially executed** (disposable-Postgres, 7/10 suites); the rest NOT RUN |
| P77-B (video queue truth) | `d05e9eaa0` | **CLOSED** |

**Three items are closed as WON'T FIX BY DESIGN**, and a future reader should not
reopen them without new evidence: CA-0 (admin-gated at the mounted URL, zero
consumers, narrowed by probe), the two `§A3` role sites (the "obvious" fix is a
cross-user plan-generation opening), and the phantom `USE_BULLMQ_RECONCILIATION`
control (the subject never existed).

---

## 1. Adjudicated CLOSED, with the evidence root executed

| Slice | Verdict | Evidence root ran itself |
|---|---|---|
| M68 — Talk-tab containment | **CLOSED** | RED 88 geometry failures / 20 viewports → GREEN 3 Playwright projects; coach vitest 191 files / 1111 tests; type-check 0; production build 0; screenshots at 320/390/1440/3840 inspected |
| HR16 — routed-thread hydration | **CLOSED** | unit 2/2; mounted transcript children 1 → 3, `emptyState` true → false, exactly one detail GET |
| CA-1 — photo visibility fail-open | **CLOSED** | 3 files / 19 tests |
| CA-2 — profile update fail-closed | **CLOSED** | same run |
| CA-0 — AI-BFF fall-through | **CLOSED as defence-in-depth** | narrowed by probe: admin-gated at the mounted URL, zero consumers, zero of four sub-results populated even when reached |
| P64 — obsolete source guards | **CLOSED** | 7 files / 100 tests, 0 skipped |
| S66 — speech access contract | **CLOSED** | same run |
| HR14 — one context owner | **CLOSED** | 7 files / 36 tests; Vite identity probe `DIVERGENT(3)` → `SINGLE_OWNER` |
| HR15 — client null-target read | **CLOSED** | 5 files / 152 tests; blanket allow → 12 failures |
| R60-A — unbound submit containment | **CLOSED** | 10 files / 162 tests; RED 7 failed / 2 passed; receiver revert 7F/2P, producer revert 2F/17P |
| HR12 / P58 — Planner async retirement | **CLOSED** | 88 files / 442 tests; browser gate 4 passed with both anti-vacuity controls passing inside the RED run |
| C4 — admission boundaries | **CLOSED; dormancy RESOLVED by C3** (`ec1e05dbd`) | 4 files / 40 tests; blanket allow → 12 failures. Was "changes no live behaviour until C3 wires the bindings" — C3 has now wired all four consumers, verified by a can-fail acceptance test. Producers still un-admitted |
| C1 — client reference API | **CLOSED; dormancy RESOLVED by C3** (`ec1e05dbd`) | 8 files / 91 tests; type-check 0. Same dormancy, same resolution. Root re-checked that its modules live in `context/` and are tracked and clean — see §2 |
| G09 — Coach memory HTTP surface | **CLOSED** | 3 files / 48 tests; six can-fail guards, all restored SHA-verified |
| G10 — nudge wiring | **CLOSED** | 2 files / 19 tests; restart proven across four separate processes |
| G10 — nudge consent surface | **CLOSED** | 31 tests; end-to-end control flips the cron predicate |
| P77-B — video queue truth | **CLOSED** | 3 files / 55 tests; route shadowing upgraded from `[LIKELY]` to measured |

## 2. Adjudicated OPEN, with the reason

| Item | Verdict | Reason it is not closed |
|---|---|---|
| F1 — trainer-note privacy fail-open | **CLOSED** (`474b3524c`) | `clientDataOverviewQueryService.mjs:26` now uses `!isClientEquivalentRole(requesterRole)`. Root executed 5 files / 37 tests, exit 0 |
| F1b — a test pinning the broken predicate | **CLOSED** | Converted from a source-text assertion to a behavioural `'user'` vs `'client'` case through the real service |
| F2 — pain-entry 403 on the default role | **CLOSED** | `'user'` added to the four `authorize` lists. The global `authorize` widening was **not** applied — correctly, since it is used on 100+ routes |
| F3 — conversation-create 500 on the default role | **CLOSED** | 403 before any payload. The reasoning is sound: aliasing to `client` at the create site alone would write conversations the account could never read back |
| F3-PRODUCT | **OPEN — needs Sean** | The default self-registration role cannot use Coach conversations at all. Internally consistent now, but a product decision. Four promotion paths narrow the window without closing it |
| F4 — HR16 retry cap untested | **CLOSED** | Root executed `routedThreadHydration.test.tsx` → 3 tests; the mock now genuinely fails so the retry branch is taken |
| F5 — nudge delivery never reaches the default role | **CLOSED** | Audience derived from the shared predicate (`['client','user'].filter(isClientEquivalentRole)`) so the query and the delivery-time recheck cannot disagree |
| **THIRD WAVE** — 10 more sibling registrations of the class | **CLOSED** (`1e376a013`) | `'user'` appended to 4 guard lists (bodyMap POST/DELETE, `currentClientAccess` ×2 routes, `clientReadAccess` ×6 routes). Closed **by measurement, not assertion**: two independently written detectors agree on 12 `authorize([...'client'...])` lists in `backend/routes`+`controllers` with **0** lacking `'user'`. Root re-ran 8 suites / 115 tests, exit 0. A repo-level pairing guard now fails on recurrence, with a stale-allowlist failure mode and a loud coverage assertion. Note the register's own corrections: it is 10 registrations not 11, and `currentClientAccess` was never a pairing — it had no ownership guard at all, and the pairing guard structurally cannot see it |
| **A3 TRAP** — the "obvious" fix for the two ambiguous sites | **CLOSED AS WON'T FIX — deliberately** | `aiWorkoutController.mjs:288` / `longHorizonController.mjs:201` stay fail-closed. Adding `'user'` to those whitelists would let a `'user'` generate a plan **for another user**: the role gate is the only guard on that path, the self-isolation check is `'client'`-only (`:252`/`:174`), and `checkAiEligibility` runs after the gate (`:295`/`:210`). Root verified by reading both controllers; the implementer demonstrated it by mutation. `aiPlanGenerationCrossUserInvariant.test.mjs` pins the property that holds under either human decision and goes red under a partial fix |
| **A test that pins the bug — third instance** | **CLOSED** | `clientProgressRoutesSecurity.test.mjs:29,41` asserted the broken role lists verbatim via `toContain`, so GREEN was impossible without editing them. Root verified that against `HEAD` before accepting the edit. Recorded because this mechanism, not the role bug, is why the class survived two sweeps |
| C1 — client reference API | **CLOSED, but DORMANT** (`f343d3df4`) | 9 files / 93 tests; type-check 0; extraction can-fail re-run proved the guard survived the move. Reaches nothing until C3 |
| C2 / C3 | **CLOSED — with a PARTIAL C3 and one corrected claim** (`ec1e05dbd`) | **What closed:** the C1/C4 dormancy. The controller now creates one publication binding and threads it to the transports and to all four C4 boundary consumers. Root verified rather than trusted: the acceptance test passes 5/5, and root **reproduced the can-fail proof** — severing `binding` from `useCoachClientNotebook` alone gives exit 1 with 3 of 5 failed and the diagnostic "received no publication binding", controller restored byte-identically at SHA `E7DAB179…` (the same SHA the implementer reported). **What did NOT close:** C3 is partial — `useCoachPinnedClient.ts:111-113` still calls `setActiveClient`/`clearActiveClient`/`chat.newChat()` directly and `CoachCommandCenter.actions.ts:90,98,99` still clears logs and composer text before admission; both files are untouched, which root confirmed. Plan 63's created-thread adoption, Leave, blocked-return UI and the real router blocker are unimplemented. **One implementer claim was FALSE and is recorded so it does not propagate:** it reported C1 as uncommitted with four untracked modules and cited doc 78 as agreeing. Root checked — those modules live in `context/`, not `hooks/` (it looked in the wrong directory), every one is tracked and clean, `git status --porcelain` over `context/` and `hooks/` returns nothing, `f343d3df4` created exactly those files, and doc 78:70 records C1 as committed and DORMANT. No harm resulted: it consumed C1's API unchanged |
| HR13 | **NOT STARTED — gated** | Needs an exclusive `useCoachCommand.ts` window, must follow C1-C4, and plan 59 marks it "plan only, no implementation enqueue" |
| G07 residual | **NOT STARTED** | Mounted substitution/share integration and exercise-matching quality. Not owned by plan 41, whose deliverables are complete and green |
| G09 residuals | **PARTIALLY ADDRESSED — 1 narrowed, 2 not started** | R1 (`purgeDueFacts` had no caller): **narrowed, not closed.** `services/coachFactPurgeCron.mjs` now exists, is registered in `core/startup.mjs`, and has 20 tests with two proven can-fail mutations — but it is **default-OFF**, so the 24 h purge still does not happen in production until an operator flips `ENABLE_COACH_FACT_PURGE`. Do not report it closed because the file exists. R2 (T37 conflict writer): **not started, and now classified as an unbuilt feature needing a product decision** — `conflictMetadata` is documented as written "only by an explicit reconcile step" and nothing defines what that step does. R3 (memory UI): not started |
| G10 residual | **NOT STARTED** | Consent surface has no frontend consumer |
| Rule-4 splits | **NOT STARTED** | Six files this session touched are over the cap. **Corrected:** the earlier claim that "the guard gap that let them through matters more than the splits" is withdrawn — G6 is advisory-by-design (`frontend-guards.mjs:14`) and frontend-scoped on purpose (`:5`), and 786 tracked files exceed the cap repo-wide, not six. See [77](77-open-findings-register.md) §D T-1-BASELINE |
| `known-failing-baseline.json` | **RECONCILED** | Done in a serialized quiet-tree run: 13 failed / 1265 passed files, 14 failed / 10714 passed tests. **All 7 baseline files still fail, so the baseline is accurate and nothing recovered. There are no regressions** — nothing that used to pass now fails. Five unbaselined failures are pre-existing (this session touched none of the implicated files); three are diagnosed as source-text assertions that `dailyWorkoutFormRoutes.mjs` no longer satisfies, two stay unclassified. Register §D1 |
| **G11 release gates** | **TWO GATES EXECUTED (one passes partially, one FAILS); THE REST NOT RUN** | **Disposable-Postgres gate: 7 of 10 suites pass** under isolation against a freshly recreated database (107 tests, exit 0 per file). **3 cannot run under isolation** — coachIntent, coachIntent.proof and coachIntentListing are `node:test` files that bypass `coachTestDatabase.mjs` and resolve the app's own `localhost:5432/swanstudios`, which the preload denies. **Migration gate: FAILS at the first migration.** Against an empty database, `20240115000000-update-orientation-model` errors `relation "orientations" does not exist`, `SequelizeMeta` is never created, and **zero of 376 migrations apply**. Cause verified: that migration only ALTERs `orientations`, and `createTable('orientations')` occurs **0 times** across all 376 files — **the migration history is not self-contained and assumes a baseline schema the repo does not create.** This does NOT mean production is broken (it runs only pending migrations against an existing schema); it means **the database cannot be rebuilt from the repository alone**, which is a restore-strategy gap. Register §F3. Still NOT RUN: frozen all-role/scenario/holdout provider evaluation; privacy and provider-boundary evaluation; Redis/restart at integration level; performance budgets; real authenticated role journeys |

**Provenance caveat on the F1–F5 row, recorded rather than hidden.** That commit was
made from root's own verification because the implementer had not yet delivered its
can-fail narrative when the files settled. Its mutations-of-record and disclosed
deviations are therefore not captured in `474b3524c`. If its report contradicts
anything there, **the report wins and a follow-up commit must correct the message.**
The 37 backend and 3 frontend test results are root's own and stand regardless.

## 3. The single largest risk to a future summary

> **UPDATE 2026-09-13 (final): this section is now HISTORICAL. The dormancy it
> describes was real and is now RESOLVED on the consumer side by `ec1e05dbd`.**
> `CoachCommandCenter.controller.ts` no longer passes "no binding": it creates one
> publication binding at `:52`, threads it to the transports at `:53-55`, and to all
> four C4 boundary consumers at `:164-168`. The acceptance test this section predicted
> — "a test that **fails if the binding stops reaching the four C4 hooks**" — now
> exists and root verified it can fail. **But the warning still applies, in narrower
> form: C3 is PARTIAL.** Two producers were never converted and are untouched:
> `useCoachPinnedClient.ts:111-113` calls `setActiveClient` / `clearActiveClient` /
> `chat.newChat()` directly, and `CoachCommandCenter.actions.ts:90,98,99` clears logs
> and composer text before admission. Any subsequent account calling C1-C4 "connected
> selection, end to end" is still wrong — the consumer path is wired, the producer path
> is not.

**C4 and C1 were dormant.** They are correct, tested, committed — and were reachable by
nothing. `CoachCommandCenter.controller.ts:173-177` passed no binding to any of the
four C4 hooks, and nothing registered a selection interceptor or called
`commitClientReference`. Any later account of this session that describes them as
"connected selection", or as a fix that reaches users, is wrong. C2/C3 is the
caller, and the acceptance bar set for C3 is a test that **fails if the binding
stops reaching the four C4 hooks** — the test that would have caught this.

## 4. Adjudication of root's own work

Root's claims were corrected five times this session. Each is recorded in place:

| Root claimed | Measurement showed | Where |
|---|---|---|
| HR16 was an auth-binding race | StrictMode's dev double-invoke aborts the load before dispatch, and an optimistic latch made it permanent | [71](71-m68-transcript-containment-exit.md) |
| CA-0 was a live cross-client exposure | Admin-gated at the mounted URL; zero consumers; zero sub-results populated | [72](72-clientaccess-policy-and-caller-audit.md) |
| Packet 70's queue handoff "cannot be taken — the subject does not exist" | **Too strong** — its line references are real; only its names are wrong | [76](76-correction-phantom-bullmq-control.md) |
| The clientAccess sweep found "69 hits" | Not reproducible; an independent re-derivation got 99 raw / 76 runtime. The count is pattern-dependent and should not have been stated as a fact | [72](72-clientaccess-policy-and-caller-audit.md) |
| `min-width: 0` contributed to the M68 fix | Inert — every measured rect identical with it forced back to `auto` | [71](71-m68-transcript-containment-exit.md) |

Root also raised **one false regression against its own change**: a full-suite run
showed the planner boundary test failing at 301 lines, and a re-run showed it green —
the file was mid-edit. One failing run in a worktree with live writers is not
evidence.

**Interpreting this section.** The pattern matters more than the individual
corrections: in every case the first reading was directionally alarming and the
measured reading was smaller. Treat any severity in these documents without a
linked measurement as a hypothesis.

## 5. What would have to be true before this work could be called release-ready

Not a checklist to tick — a statement of what is missing.

1. **C2/C3 landed**, so the selection path exists end to end rather than in pieces.
2. **G11's gates executed**, not cited: all-role and scenario evaluation, privacy and
   provider-boundary checks, Redis/restart, migration/restore/rollback, performance.
3. **Real infrastructure exercised.** Almost every verification this session ran
   against mocked models, an in-memory fixture, or a test double. No slice was
   proven against production PostgreSQL.
4. **The `'user'` class closed at the root**, not instance by instance. Six
   instances were found today across two independent searches; a seventh is likely.
   A single generalised guard would close it.
5. **The baseline reconciled on a quiet tree**, so a future slice can tell a new
   failure from a pre-existing one.
6. **The F3 product question answered** — whether the default self-registration role
   is meant to be excluded from Coach conversations.

Until then the honest status is **IMPLEMENTATION IN PROGRESS, NOT RELEASE READY**,
which is what packet 70 said at the start of this session and what remains true at
the end of it.
