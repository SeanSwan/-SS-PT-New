# Combined adjudication — Swan Coach Universe V3, 2026-09-13 session

**Scope of this document.** This adjudicates everything this session reviewed,
implemented or corrected, against the held queue in
[70 — release and worktree audit](70-release-and-worktree-audit.md). It is the
companion to [78 — session handoff](78-session-handoff-20260913.md), which covers
*what to do next*; this covers *what was decided and on what evidence*.

[73 — the six-finding adjudication](73-g11-original-six-findings-adjudication.md)
remains the specific record for the six original HR1 findings and is not repeated
here.

**State at the time of writing: three slices were still in flight** — the F1–F5
authorization fixes, C1's Rule-4 extraction, and C2/C3. Their rows say so. Nothing
here claims a result for work whose agent had not yet reported and whose suite root
had not yet executed. Where a claim is provisional it is labelled provisional.

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
| C4 — admission boundaries | **CLOSED, but DORMANT** | 4 files / 40 tests; blanket allow → 12 failures. Changes no live behaviour until C3 wires the bindings |
| C1 — client reference API | **CLOSED, but DORMANT** | 8 files / 91 tests; type-check 0. Same dormancy |
| G09 — Coach memory HTTP surface | **CLOSED** | 3 files / 48 tests; six can-fail guards, all restored SHA-verified |
| G10 — nudge wiring | **CLOSED** | 2 files / 19 tests; restart proven across four separate processes |
| G10 — nudge consent surface | **CLOSED** | 31 tests; end-to-end control flips the cron predicate |
| P77-B — video queue truth | **CLOSED** | 3 files / 55 tests; route shadowing upgraded from `[LIKELY]` to measured |

## 2. Adjudicated OPEN, with the reason

| Item | Verdict | Reason it is not closed |
|---|---|---|
| F1 — trainer-note privacy fail-open | **fix in flight** | The fix is written and root reviewed it by reading: the shared predicate replaces the literal comparison. Suite not yet executed. |
| F1b — a test pinning the broken predicate | **fix in flight** | Being converted from a source-text assertion to a behavioural case. |
| F2 — pain-entry 403 on the default role | **fix in flight** | Narrow per-route fix applied; the global `authorize` widening was explicitly **not** authorised and correctly not applied. |
| F3 — conversation-create 500 on the default role | **fix in flight** | Contract chosen: 403 before any payload. The reasoning is sound — aliasing to `client` at the create site alone would write conversations the account could never read back. |
| F3-PRODUCT | **OPEN — needs Sean** | The default self-registration role cannot use Coach conversations at all. Internally consistent now, but a product decision. |
| F4 — HR16 retry cap untested | **fix in flight** | A gap in root's own committed work: deleting the guard left the suite green. |
| F5 — nudge delivery never reaches the default role | **fix in flight** | Audience set now derived from the shared predicate rather than re-listed. |
| C2 / C3 | **in flight** | Without C3, C4 and C1 remain dormant. |
| HR13 | **NOT STARTED — gated** | Needs an exclusive `useCoachCommand.ts` window, must follow C1-C4, and plan 59 marks it "plan only, no implementation enqueue". |
| G07 residual | **NOT STARTED** | Mounted substitution/share integration and exercise-matching quality. Not owned by plan 41, whose deliverables are complete and green. |
| G09 residuals | **NOT STARTED** | `purgeDueFacts` never called; T37 conflict writer unbuilt; no memory UI. |
| G10 residual | **NOT STARTED** | Consent surface has no frontend consumer. |
| Rule-4 splits | **NOT STARTED** | Six files over the cap. The guard gap that let them through matters more than the splits. |
| `known-failing-baseline.json` | **NOT STARTED — deliberately** | Needs a quiet tree. Growing it under concurrent writers would produce a baseline that misrepresents the repo. |
| **G11 release gates** | **ALL NOT RUN** | Frozen all-role/scenario/holdout provider evaluation; privacy and provider-boundary evaluation; Redis/restart at integration level; migration/restore/rollback; performance budgets; real authenticated role journeys. |

## 3. The single largest risk to a future summary

**C4 and C1 are dormant.** They are correct, tested, committed — and reachable by
nothing. `CoachCommandCenter.controller.ts:173-177` passes no binding to any of the
four C4 hooks, and nothing registers a selection interceptor or calls
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
