---
decision: Inventory + extraction order for wip/comms-notifications-2026-07-05 → main; blind merge rejected (412 conflicts), extraction is the recorded path (SWA-216 direction)
status: open
supersedes: none
---

# wip/comms Extraction Inventory — 2026-09-01

**Issue:** SWA-226 (audit) → feeds SWA-216 (extraction direction) · **Method:** deterministic git only — no judgment calls in the counts.
**Baseline:** `origin/main..HEAD` at `e98d018d6` (branch synced 0/0 with its own upstream the same day).

## Headline numbers

| Measure | Count | Command |
|---|---|---|
| Branch-side commits vs main | 540 | `git rev-list --count origin/main..HEAD` |
| Already patch-equivalent on main | 47 | `git cherry origin/main HEAD` (`-` lines) |
| Docs-only commits | 293 (54%) | path classifier (below) |
| Runtime-bearing, NOT on main | **62** | classifier ∩ cherry |
| Tooling/gates/tests, NOT on main | 144 | classifier ∩ cherry |
| Runtime files touched by the 62 | 492 | file union |
| Merge-vs-main conflicts (dry run) | 412 | `git merge-tree --write-tree HEAD origin/main` |

Classifier: runtime = `frontend/src|public`, `backend/{routes,services,controllers,models,middleware,utils,migrations,seeders,server}`; tooling = `scripts/`, `.claude/`, `.githooks/`, `.github/`, `.ai-workflow/`; docs = `docs/`, `AI-Village-Documentation/`, `*.md`. A commit touching any runtime path counts as runtime-bearing.

## Extraction lanes (the 62 runtime commits, grouped, with collision risk vs main)

Collision = count of this lane's files in the 412-conflict dry-run list. Low collision ⇒ cherry-pick-friendly; high ⇒ reconciliation work.

| Lane | Commits | Dates | Collision w/ main | Verdict |
|---|---|---|---|---|
| **coach** (freestyle capture + 23 dry-loop hardening rounds) | 30 | 08-16→08-17 | **HIGH — 35 files** (main's Coach CC W3 rebuild touched the same surfaces) | Reconcile, don't cherry-pick. Needs its own SWA slice with a Coach owner decision: which freestyle pieces survive on top of W3. |
| **gym-ops / locations** (Location model S0, SWA-74 + listLocations 500 fix) | 6 | 07-28, 08-27 | **ZERO** | Cleanest extraction lane. Start here. ⚠ contains model+policy — check SWA-102 migration-ledger rule before running any migration. |
| **backend hygiene** (write-path audit, rule-42 boot audits, Windows npm fix, lockfile) | 4 | 07-28→08-03 | low | Cherry-pick candidates; re-verify lockfile against main's current one. |
| **trainer-economics + commission** (SWA-62 S0/S1) | 4 | 07-23→07-24 | low — 3 files | Good second lane; SWA-62 context already on board. |
| **pricing + sessions cancellation** (server-derived charge, price truth) | 2 | 08-25 | low — 4 files | This IS SWA-216/SWA-208 subject matter — extract under those issues, not separately. |
| **comms/notifications** (draft queue activation + approval hardening) | 2 | 08-27 | **MED — 10 files incl. `backend/models/Notification.mjs`** | The branch's namesake lane collides on its own model. Needs 3-way review vs main's Notification changes. |
| **workouts** (circuit/drop-set structure preservation) | 1 | 08-28 | HIGH area — 34 workout-file conflicts overall | Single commit but hot zone; verify against main's workout logger before pick. |
| **schema truth** (SWA-87 three prod-broken models; DB drift detector) | 2 | 07-29, 08-18 | low | High value — models aligned to live DB. Verify main didn't fix these independently (cherry says it didn't). |
| **messaging a11y** (WCAG/reduced-motion/overflow) | 1 | 08-16 | low | Small, safe pick. |
| **branch-repair / wip snapshots** (restore-deleted-lines, index-sweep repairs, bodymap WIP) | 4 | 07-05→08-13 | n/a | Do NOT extract as-is — these fix branch-local damage. Extract only the net content via the lanes above. |
| misc (ai import paths, dead-file cleanup, backup system, dead-file-vs-staleness script, admin audit ledger) | 6 | 07-28→08-03 | low | Case-by-case; `backup` lane may already exist on main (SWA-114 says main has it — verify before pick). |

## Tooling/gates lane (144 commits, NOT runtime)

Gates, drift-check, guards, exit-status/heredoc/egress hooks, corpus schema, panel tooling (08-17→08-27). **Several are ports FROM main** (`mirror main`, `port main's G5/G6`, `sync from PR #72`) — extracting those back would be circular. This lane needs its own diff-vs-main pass (`scripts/hooks/` had 13 conflicted files) and belongs with the constitution/governance reconciliation, not the product extraction.

## Docs lane (293 commits)

Mostly learning packets, handoffs, dry-loop ledgers. SWA-184 already tracks the corpus split (113 packets across branches, 1 shared). Route packet reconciliation there; the rest of the docs need no extraction urgency — they travel with the branch.

## Standing warnings

1. **No blind merge** — 412 conflicts measured; SWA-216 records extraction as the direction.
2. **No migrations run from this branch** — SWA-102: migration ledger is desynced from production.
3. `git cherry` equivalence is patch-exact; a reworked-on-main commit shows as "not on main" — each lane's first extraction step is a content diff vs main for its files, not a trusting cherry-pick.
4. Branch is docs-majority: 54% of the 540 commits carry zero runtime code. The extraction problem is ~62 commits, not 540.

## Recommended order

1. **gym-ops/locations** (zero collision, SWA-74 tagged) → 2. **trainer-economics/commission** (SWA-62) → 3. **schema truth** (SWA-87 + drift detector) → 4. **pricing/cancellation under SWA-216/208** → 5. **comms/notifications** (3-way on Notification.mjs) → 6. **workouts** single commit → 7. **coach freestyle** (owner decision vs W3 rebuild) → tooling/governance last, as its own program.
