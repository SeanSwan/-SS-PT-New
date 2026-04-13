---
title: Repo Hygiene Protocol
owner: Claude Opus 4.6 (CEO)
last_modified: 2026-04-12
status: active
drives_rules: [32, 33, 34, 35, 36, 37, 38, 39]
---

# Repo Hygiene Protocol

Detailed non-destructive cleanup workflow for SwanStudios (SS-PT). `CLAUDE.md` rules 32–39 point here.

This protocol exists because SS-PT has accumulated:
- Competing dashboard trees (canonical + legacy/orphaned)
- Dormant routes and shadow-mounted Express handlers
- Hundreds of root-level QA screenshots and planning `.yml` files
- Temp/log/build artifacts at root (`combined.log`, `error.log`, `tsc-errors.txt`, `nul`, `_tmp_login.json`)
- Ad hoc markdown notes mixed with compact reference docs
- Multiple archive folders with unclear scope

That drift is now a correctness risk, not a cosmetic one. It caused a real incident: a session "fixed" a legacy workout-history path while the canonical surface stayed broken, because no one had classified which tree was canonical first.

## Core principle

**Inventory and classification are always Phase 1. Physical movement is Phase 2. Code-level dead-surface removal is Phase 3. Each phase is committed separately and requires explicit Sean approval to proceed to the next.**

No file is moved, renamed, or deleted in Phase 1.

## When to trigger a hygiene scan

Mandatory before:
- Major refactors or architecture changes
- Dashboard audits
- Route-tracing or debugging tasks with competing surfaces
- Any fresh session where Sean says the repo feels confusing or cluttered

Mandatory after:
- Any large workstream that generated many artifacts, screenshots, or planning docs

Optional-but-recommended:
- Quarterly, even if nothing has triggered it

## Three-phase discipline

### Phase 1 — Non-destructive inventory

**Deliverables:**
1. Root-level file listing, grouped by class (runtime, QA, planning, logs, temp, ad hoc, orphans)
2. Existing-archive-folder map
3. Competing-surface inventory for the task's bug class (if any)
4. Dormant-route inventory for the task's bug class (if any)
5. Every non-trivial item classified per rule 33
6. Ambiguous items flagged — not moved
7. Proposed destination map for each class
8. `.gitignore` proposal for any recurring temp/log/build-artifact class (rule 39)
9. A dated inventory doc written to `docs/ai-workflow/REPO-HYGIENE-INVENTORY-YYYY-MM-DD.md`

**Forbidden in Phase 1:**
- Any `mv`, `rm`, `git rm`, `git mv`
- Any `.gitignore` edit (propose only)
- Any runtime code deletion
- Any claim of the form "safe to delete" or "guaranteed deletable"

**Exit criteria:**
- Inventory doc exists
- Sean has reviewed it
- Sean has explicitly approved which items proceed to Phase 2

### Phase 2 — Approved relocation

**Deliverables:**
1. Physical move/archive of only the items Sean approved from the Phase 1 inventory
2. Reference/import/route-mount grep-checks recorded per moved item
3. `.gitignore` edits for approved recurring-artifact classes
4. Changelog file recording `old-path → new-path` for every moved file
5. No runtime-code deletion (that's Phase 3)

**Forbidden in Phase 2:**
- Moving anything not explicitly approved in Phase 1
- Code-level cleanup of legacy/orphaned runtime files
- Mixing Phase 2 moves with feature work or bug fixes

**Exit criteria:**
- Changelog committed
- Sean has verified the moves did not break anything
- Sean has explicitly approved Phase 3 (or closed the cycle here)

### Phase 3 — Code-level dead-surface cleanup

**Deliverables:**
1. Per-surface Canonical Surface Receipt (rule 26) proving the candidate surface is not consumed by any canonical route, test, Storybook story, or tool script
2. Per-surface Surface Classification Table (rule 27) labeling each file as legacy/orphaned rather than "dead" unless the stronger claim can be proven
3. Staged move into `archive/pending-deletion/YYYY-MM-DD/` rather than immediate delete
4. Grep proof that imports/references were updated or confirmed absent
5. Build + targeted tests green after the move

**Forbidden in Phase 3:**
- Hard-deleting runtime code without staging
- Claiming "dead code" on evidence that only proves "legacy/orphaned under the current route tree"
- Mixing Phase 3 with feature or bug work

## Classification taxonomy (rule 33)

Every non-trivial discovered file gets exactly one label:

| Label | Meaning | Destination hint |
|---|---|---|
| active runtime code | imported/mounted by live build | **keep in place** |
| active reference doc | cited by `CLAUDE.md` or load order | **keep in place** |
| planned/unimplemented blueprint | design/spec for future work, not built | `docs/ai-workflow/` or `docs/ai-workflow/planning-specs/` |
| legacy but still referenced | imported somewhere, but not by canonical tree | **do not move** until reference decision |
| orphaned candidate | appears unreferenced based on current grep | Phase 2 → `archive/pending-deletion/YYYY-MM-DD/` pending approval |
| archive-only historical record | completed debate, closed roadmap, shipped plan | appropriate `archive/` subfolder |
| QA artifact / screenshot / temp output | build/runtime/test byproduct | `qa-screenshots/YYYY-MM-DD/` or `archive/logs/YYYY-MM-DD/` |
| ambiguous | classification uncertain | **do not move** — flag for Sean |

## Language rules (rule 34)

**Forbidden phrases in any hygiene report or closeout:**
- "safe to delete"
- "guaranteed deletable"
- "nothing to lose"
- "definitely dead"
- "100% unused"

**Required replacements:**
- "likely deletion candidate pending Phase 2 approval"
- "appears unreferenced based on current grep"
- "requires final reference check before destructive action"
- "legacy/orphaned under the current route tree"
- "not rendered by the currently verified canonical route tree for this surface"

The point is to eliminate overconfident cleanup claims. A file that looks unused today may be imported by a test fixture, a Storybook story, a tool script, or a runtime path that doesn't appear in a simple grep. Soft language forces the reference check to happen before the destructive action.

## Destination folder conventions

Existing archive folders (use these, do not invent parallel ones):

| Folder | Purpose |
|---|---|
| `archive/` | Top-level historical archive for root-clutter relocation |
| `archive/pending-deletion/YYYY-MM-DD/` | Staged deletions awaiting a review window |
| `docs/archive/` | Superseded docs |
| `docs/ai-workflow/archive/` | Superseded planning/design artifacts |
| `docs/ai-workflow/AI-HANDOFF/debate-archive/` | Completed Opus-Codex debates |
| `qa-screenshots/` | QA snapshots (to be dated by subfolder) |
| `playwright-qa-screenshots/` | Playwright test runs |
| `playwright-qa-full/` | Full-page Playwright captures |

Proposed new folders (require Sean's approval before creation):

| Folder | Purpose |
|---|---|
| `archive/logs/YYYY-MM-DD/` | Relocated build/runtime log artifacts |
| `docs/ai-workflow/planning-specs/` | Dashboard `.yml` planning files currently at root (if active-reference); otherwise they go to `docs/ai-workflow/archive/dashboard-specs/` |
| `qa-screenshots/2026-archive/{feature-prefix}/` | Bulk-relocated root QA `.png` files grouped by prefix |

## .gitignore discipline (rule 39)

If a hygiene scan identifies a recurring clutter class, Phase 1 must propose the matching `.gitignore` update. Phase 2 executes the edit only with Sean's approval.

Recurring classes known to SS-PT:
- `*.log` at root (`combined.log`, `error.log`)
- `tsc-errors.txt`
- `_tmp_*.json`
- `nul` (Windows `> nul` accidental artifact)
- `tmp_*.ipynb`
- Root-level QA `.png` files unless captured inside `qa-screenshots/` or `playwright-qa-*/`

## Post-task hygiene check (rule 38)

At the end of every substantial task, the closeout must answer:
- Did this work create new temp artifacts? (list them)
- Did this work create new screenshots? (list them)
- Did this work create new debate docs? (list them)
- Did this work create new obsolete files? (list them)

If any answer is yes, those items are added to the next cleanup backlog rather than left for the next session to rediscover.

## What this protocol does not do

- It does not automate cleanup. Every destructive action is explicit.
- It does not classify files Claude has never read. Classification requires evidence.
- It does not replace `FILE-CLEANUP-PROTOCOL.md` for task-scoped cleanups — this is repo-structural hygiene, not per-task cleanup.
- It does not unilaterally decide what's legacy. Classifications are proposals until Sean confirms.

## Reference docs this protocol interacts with

- `CLAUDE.md` — rules 32–39 drive the protocol
- `ACTIVE-INDEX.md` (repo root) — updated whenever a Phase 2 move lands
- `docs/ai-workflow/references/FILE-CLEANUP-PROTOCOL.md` — task-scoped cleanup (different scope)
- `docs/ai-workflow/REPO-HYGIENE-INVENTORY-YYYY-MM-DD.md` — dated inventory snapshots

## Current active inventory

See `docs/ai-workflow/REPO-HYGIENE-INVENTORY-2026-04-12.md` for the first formal inventory under this protocol.
