# G07 / G09 / G10 — residual status after root verification, 2026-09-13

Written because packet [70](70-release-and-worktree-audit.md) lists G07, G09 and G10
as open work, and a reader could reasonably start re-implementing them. **Most of
what those rows describe already exists and is green.** This document separates
what is DONE from what is genuinely residual, with the commands root actually ran.

All runs used the reviewed isolated runner
(`tmp/coach-astra-hostile-20260912/p64s66-isolated-run.ps1`): sensitive env
scrubbed, `NODE_ENV=test`, preload disables dotenv and denies non-loopback TCP.
No shared database, no provider, no external network.

---

## G07 — real workout/progress evidence + deterministic metrics (plan [41](41-g07-real-evidence-metrics.md))

**Plan 41's deliverables are all PRESENT and GREEN.**

| Plan 41 item | Artifact | State |
|---|---|---|
| T33 source-linked deterministic evidence | `backend/services/ai/coachProgressRecordReader.mjs` (69 lines) + `tests/unit/coachProgressRecordReader.test.mjs` (109) | Present |
| T34 substitution draft + contraindication gating | `backend/services/ai/coachSubstitutionDraft.mjs` (122) + `tests/unit/coachSubstitutionDraft.test.mjs` | Present |
| T48 share draft separate from log approval | `backend/services/ai/coachMilestoneShareDraft.mjs` (47) + `tests/unit/coachMilestoneShareDraft.test.mjs` | Present |
| T33 calculator | `backend/services/ai/coachProgressEvidence.mjs` + `tests/unit/coachProgressEvidence.test.mjs` | Present |
| T33 tool integration | `tests/unit/coachProgressEvidenceTool.t33.test.mjs` | Present |

**Root-executed evidence:**

```
vitest run (isolated) over coachSubstitutionDraft, coachMilestoneShareDraft,
  coachProgressRecordReader, coachProgressEvidenceTool.t33
  -> Test Files 4 passed (4) | Tests 33 passed (33), exit 0

node --test tests/unit/coachProgressEvidence.test.mjs   (vitest does not collect it)
  -> tests 10 | pass 10 | fail 0, exit 0
```

**Residual gap is NOT plan 41's.** Plan 41's own "Out of scope" section excludes
chart-route rewriting, the atomic save path, share *sending* infrastructure, and
real-PostgreSQL loopback reruns. Packet 70's G07 row names two things plan 41 does
not own:

1. **Mounted integration** of the substitution and share paths against
   authoritative data. The modules are pure and unit-proven; nothing in this
   verification shows them mounted in a live surface.
2. **Exercise-matching quality** — packet 70 and [67](67-coach-current-state.md)
   both record that exercise search still uses limited full-message matching.

Neither is started. Do not re-implement the modules.

---

## G10 — opt-in proactive nudges (plan [44](44-g10-proactive-nudges.md))

**The engine is PRESENT and GREEN; the WIRING was the named gap and is now in
progress as its own slice.**

| Plan 44 item | Artifact | State |
|---|---|---|
| Deterministic scheduling/consent engine | `backend/services/ai/coachProactiveNudge.mjs` (147 lines) | Present |
| Engine tests | `backend/tests/unit/coachProactiveNudge.test.mjs` (166) | Present |
| Cron registration / worker wiring | — | Plan 44 puts this explicitly out of scope and names it as "a follow-up wiring slice" |

**Root-executed evidence:**

```
vitest run (isolated) over coachProactiveNudge, coachFactMemoryPolicy
  -> Test Files 2 passed (2) | Tests 29 passed (29), exit 0
```

The engine already implements, per its own passing tests: opt-in default OFF plus
master disable; DST-safe local quiet hours 20:00–08:00 with the UTC offset passed
in at the candidate instant; one-nudge-per-local-day; per-category weekly dedupe;
snooze; and a **delivery-time recheck** whose writer is dependency-injected so the
engine cannot send by itself (`coachProactiveNudge.test.mjs` asserts a queued nudge
whose owner opted out mid-queue delivers nothing, and a consent recheck at the
delivery instant).

**Residual = wiring + restart behaviour**, which packet 70 names ("consent-gated
delivery with rechecks, dedupe, quiet hours and **restart behavior**"). That slice
is in progress: mount the engine inside the existing in-app worker
`backend/services/notificationService.mjs`, following the deployed
`nutritionLogNudgeCron.mjs` precedent, with caps/dedupe derived from durable state
so they survive a restart. In-app only; no email/push.

---

## G09 — CoachFact scoped visible memory (plan [43](43-g09-coachfact-scoped-memory.md))

**The service and policy layers are PRESENT and GREEN; the user-visible surface is
the residual.**

| Artifact | Lines | State |
|---|---|---|
| `backend/services/coachFactService.mjs` | 545 | Present |
| `backend/services/coachFactMemoryPolicy.mjs` | 140 | Present |
| `backend/tests/unit/coachFactMemoryPolicy.test.mjs` | 248 | Present, green (see the 29-test run above) |

Plan 43 records the contract-mandated reconciliation: the S1 durable-fact layer was
**adopted by checking out exactly commit `21ed0554ba`'s new files** — not the branch,
not a cherry-pick merge — so no duplicate fact store was created, and its invariants
stand (machine proposes only; a human actor is required for activation; statuses
proposed/active/invalidated/rejected; supersede links).

**Residual = user-visible inspect / edit / forget**, exactly as packet 70 says:
"Helpers/models alone are not completed products." Not started here, and it is a
frontend surface that should not be built while three other frontend slices hold
files in `coach-assistant/`.

---

## What this changes about the queue

Packet 70's G07/G09/G10 rows read as three greenfield builds. They are not. The
honest split is:

| Item | Modules / engine | Residual work |
|---|---|---|
| G07 | **done and green** (33 + 10 tests) | mounted substitution/share integration; exercise-matching quality |
| G09 | **service + policy done and green** | user-visible inspect/edit/forget |
| G10 | **engine done and green** (29 tests) | worker wiring + restart-durable caps (**in progress**) |

Anyone reopening these should start from the residual column, not from the plan's
scope section.
