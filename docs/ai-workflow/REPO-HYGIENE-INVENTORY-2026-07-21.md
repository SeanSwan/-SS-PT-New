---
title: SS-PT dirty WIP recovery inventory
date: 2026-07-21
status: phase-1-inventory-awaiting-sean
owner: Codex
scope: wip/comms-notifications-2026-07-05
---

# SS-PT Dirty WIP Recovery Inventory â€” 2026-07-21

## Plain-English finding

The VS Code â€œ500 filesâ€ indicator is a mixed recovery set, not one commit. The checkout contains 1,569 Git
entries across product code, tests, migrations, planning documents, generated AI Village reports, historical
archives, and root temp/patch files. Nothing from this checkout should be bulk-staged, bulk-merged, or pushed.
Recovery must happen in fresh worktrees from current `origin/main`, one evidence-locked workstream at a time.

Phase 1 is non-destructive. No source file was moved, deleted, staged, committed, merged, or pushed.

## Preservation receipt

- Source branch: `wip/comms-notifications-2026-07-05`
- HEAD: `4258b05032419a80799b4582b10bc9d841aa2388`
- Refreshed `origin/main`: `eb4bbdd63794d0d842f5e5c107254f8013544367`
- Divergence: 14 commits on HEAD only; 947 commits on `origin/main` only.
- Snapshot: `C:/tmp/sspt-wip-recovery-20260721T0800`
- Snapshot scope: 50,406 files, 2.876 GiB; verification dry run reported zero mismatches and zero failures.
- Machine classification: `dirty-file-classification.csv` in the snapshot, one row for every Git entry.
- Tracked binary patch: `tracked-working-tree.patch` in the snapshot.
- Raw status and untracked manifests are also stored in the snapshot.

| Snapshot artifact | SHA-256 |
|---|---|
| `git-status-porcelain.txt` | `295CAD36D43CC3699439985E9AE0D4DAB49A5727409BF19E3ACA3F13BDB927FF` |
| `tracked-working-tree.patch` | `BB4A30FA6127DBD11D79EE763E9F1E332A2C31CD10906BE36AD7143086B8FFF7` |
| `untracked-files.txt` | `A69F1F9A9B3F8165FE411ADA356DB99BD879C43A61954E3499FB2E1007277E48` |
| `dirty-file-classification.csv` | `346078F3439A6E874DC70D490A2FA6FEC3E28ACF7689D72A2DDDB2CF708A018E` |
| `recovery-summary.json` | `3430BC835693D6FEB0CCC42C732B31AB696A5CD050BEDAC8EB4028D4F7BA7906` |

## Git-state inventory

| State | Count | Phase-1 treatment |
|---|---:|---|
| Modified tracked | 345 | Reconcile against current main, never overwrite wholesale |
| Deleted tracked | 184 | Preserve; require deletion intent and current-reference proof |
| Untracked | 1,040 | Classify and recover by workstream |
| **Total** | **1,569** | No bulk staging |

### Relationship to refreshed origin/main

| Relationship | Count | Meaning |
|---|---:|---|
| Path absent on main | 656 | Potentially unique work or artifacts; requires classification |
| Content diverges from main | 501 | Manual three-way reconciliation required |
| Content identical to main | 228 | Redundant local copy; do not re-land |
| Deleted locally, present on main | 162 | Dangerous deletion; default is do not carry |
| Deleted locally, absent on main | 22 | Likely stale/archive transition; still requires lifecycle proof |

The 501 divergent paths comprise 323 modified tracked files and 178 untracked files. The 228 identical paths
comprise 14 modified tracked files and 214 untracked files. Eight modified tracked paths no longer exist on main.

## Classification inventory

The machine CSV assigns every entry exactly one Rule-33 class. Ambiguous entries remain preserved in place.

| Rule-33 classification | Count |
|---|---:|
| Active runtime code (includes paired tests and migration candidates) | 692 |
| Archive-only historical record | 403 |
| QA artifact / screenshot / temp output | 184 |
| Ambiguous | 146 |
| Planned/unimplemented blueprint | 143 |
| Active reference doc | 1 |

These are Phase-1 classifications, not deletion or shipping decisions. Runtime files still require caller,
route, schema, and current-main proof inside their owning recovery slice.

## Root-level inventory

There are 103 dirty root entries:

- Two modified operating files: `ACTIVE-INDEX.md` and `skills-lock.json`.
- Approximately 94 `.codex-*.patch`, `.codex-tmp-*`, and related one-off helper artifacts.
- Six `.tmp_world_*.py` patch helpers.
- `apex-branch.diff`, `swan-lens-review-packet.tmp.md`, and `swanguard-mobile-metrics.json`.
- Two malformed shell-artifact names beginning `%sn` and `; elif`; one blocks `git add -A`.

All root temp/patch items are **likely cleanup candidates pending Phase 2 approval**. They remain in place and
are preserved in the snapshot.

## Existing archive map

| Existing location | Current files | Intended use |
|---|---:|---|
| `archive/` | 810 | Top-level historical material |
| `archive/pending-deletion/` | 754 | Review-window staging, not immediate deletion |
| `docs/archive/` | 26 | Superseded general docs |
| `docs/ai-workflow/archive/` | 25 | Superseded workflow/planning docs |
| `docs/ai-workflow/AI-HANDOFF/debate-archive/` | 12 | Completed debate records |
| `qa-screenshots/` | absent | Requires approval before creation |
| `playwright-qa-screenshots/` | absent | Requires approval before creation |
| `playwright-qa-full/` | absent | Requires approval before creation |

## Workstream inventory

| Workstream | Entries | Primary treatment |
|---|---:|---|
| AI Village archive | 403 | Separate generated/archive reconciliation |
| Social/community/gallery | 172 | Runtime recovery slice with route receipts |
| Messaging/notifications | 152 | Runtime recovery slice with socket/auth/model audit |
| Dashboards | 136 | Canonical-surface receipts before transfer |
| AI operating system/design brain/Hermes | 131 | Registry/caller and policy audit |
| Other docs | 116 | Reference/supersession classification |
| Root temp/patch | 103 | Preserve; proposed Phase-2 archive/ignore treatment |
| AI Village generated output | 81 | Regenerate from current main or archive separately |
| Other backend | 51 | Split by owning feature |
| Coach Command Center | 50 | Canonical route and actor-scope audit |
| Equipment/nutrition | 48 | API/model/migration audit |
| Workout spine | 40 | Logger/plan/data-truth audit |
| Bootcamp | 37 | Generator/route/UI contract audit |
| Other frontend | 23 | Assign to caller-owned slice |
| Mobbin research/plan | 16 | Docs/tooling recovery slice |
| Other scripts | 7 | Caller and registry proof |
| Other | 3 | Manual classification |

## High-risk dependency findings

- Backend recovery includes 9 untracked migrations, 6 untracked models, 7 untracked controllers, 60 untracked
  services, and 76 untracked backend tests.
- Tracked backend changes include 20 route files, 18 services, 9 controllers, and 3 models.
- `backend/package.json` adds `archiver`; its lockfile and all callers must stay in one verified slice.
- Changes touch auth middleware, server mounts, sockets, notifications, messaging, galleries, challenges,
  equipment, food scanning, workout plans, and dashboards.
- `git diff --check` fails with 596 finding lines, dominated by trailing whitespace in generated reports.
- Two additional tracked files are line-ending-only modifications.

## Competing/ambiguous surface inventory

These families must be treated as competing/ambiguous until each slice produces a Canonical Surface Receipt:

| Family | Competing paths observed | Required resolution |
|---|---|---|
| Messaging | `messagingRoutes.mjs`, `messages.mjs`, legacy/shared messaging controllers, socket handlers | Mount order, namespace, auth and model ownership |
| Notifications | `notificationRoutes.mjs`, `notificationsRoutes.mjs`, `adminNotificationsRoutes.mjs`, settings/test routes; multiple frontend hooks/stores/panels | Canonical endpoint and normalized payload contract |
| Workouts | workout, session, summary, plan, builder, upload, daily-form and client-workout routes | Exact route/mount/handler/model chain per recovered feature |
| Gallery/social | admin gallery, gallery, challenges and social-workout routes plus multiple gallery/feed components | Canonical page and API ownership |
| Dashboards | universal dashboard, role dashboards, workspaces, legacy/versioned pages | Route-mounted JSX proof before UI transfer |
| Equipment/nutrition | equipment, food-scanner, client-nutrition routes plus workspace/hooks | Schema and authenticated caller proof |

No surface is labeled legacy or dormant from filename evidence alone.

## Mobbin memo and plan truth

- The quoted memo is in the consumed inbox, not pending.
- Eighteen dirty paths belong to the broader Mobbin research/tooling system: 16 direct-name matches plus the
  two Kimi plan-review documents whose filenames omit “Mobbin.”
- Five core planning/review docs are untracked.
- `MOBBIN-BRAIN-BUILD-PLAN-v2-FABLE-KIMI-2026-07-21.md` is the plan of record.
- V1 already carries a superseded banner and must not drive implementation.
- The later Wave-minus-1 verification says the inquiry button, wrong-client-draft fix, and completion-surface
  question were already resolved on main; those tasks must not be re-landed.

## Branch-commit reconciliation

`git cherry -v origin/main HEAD` reports four patch-equivalent commits already represented on main and ten
non-equivalent commits. The ten include an explicitly unreviewed pain-chart preservation commit, permissions
changes, world-engine/design docs, Hermes inbox material, and Catalog doctrine commits. They must be audited
individually; the branch must not be cherry-picked wholesale.

## Proposed destination map â€” no moves approved yet

| Class | Proposed destination or treatment |
|---|---|
| Runtime code/tests/migrations | Fresh `origin/main` worktree for owning feature; explicit-path commit |
| Active Mobbin plan/tooling | Current canonical docs/scripts locations after current-main reconciliation |
| Superseded plans/reviews | Existing workflow archive location, pending Phase-2 approval |
| AI Village latest/generated output | Regenerate from current main; commit only if policy requires tracked receipts |
| AI Village historical archive | Preserve/archive reconciliation; do not mix with runtime commits |
| Root patch/temp helpers | `archive/pending-deletion/2026-07-21/` or external recovery vault, pending approval |
| Malformed shell artifacts | Same pending-deletion staging after an exact-path reference check |

## Proposed .gitignore additions â€” proposal only

After any valuable patches are harvested, consider narrowly scoped root patterns:

- `/.codex-*.patch`
- `/.codex-tmp-*`
- `/.tmp_world_*.py`
- `/*.tmp.md`

Do not ignore all `*.patch`, `*.ps1`, or `*.json`; those extensions contain legitimate project assets.

## Proposed Phase-2 recovery order

1. Create clean recovery worktrees from refreshed `origin/main`; leave this checkout frozen.
2. Remove the 228 upstream-identical entries from the recovery queue without deleting the frozen originals.
3. Recover the Mobbin plan/tooling as a docs/tooling-only slice; preserve v2 supersession truth.
4. Reconcile backend schema/dependency foundations by feature, with additive migration and model-field audits.
5. Recover messaging/notifications, including socket/auth/payload normalization, as its own end-to-end slice.
6. Recover social/challenges/gallery as its own route/UI slice.
7. Recover workout spine, Coach Command Center, dashboards, bootcamp, and equipment/nutrition in separate
   canonical-surface slices.
8. Handle AI Village generated/archive churn separately from product code.
9. Present root artifact relocation and `.gitignore` changes for explicit approval.
10. For every slice: targeted regression tests, full relevant suites, typecheck/build, secret scan,
    `git diff --check`, backend drift audit, hostile review, explicit staging, and branch push.

No push to `main` is authorized by this inventory.

## Phase-1 exit gate

Phase 2 may begin only after Sean approves the recovery order and destination proposals. Physical cleanup,
runtime edits, staging, commits, and pushes remain blocked until that approval.

