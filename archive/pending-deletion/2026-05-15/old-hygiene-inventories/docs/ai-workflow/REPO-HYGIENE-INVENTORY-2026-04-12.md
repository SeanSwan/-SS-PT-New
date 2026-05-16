---
title: Repo Hygiene Inventory
date: 2026-04-12
scan_type: non-destructive Phase 1
scope: repo root + known archive folders + workout-history bug-class dormant routes
method: ls, wc -l, grep -r (import/reference checks)
author: Claude Opus 4.6 (CEO)
status: phase-1 inventory, no files moved
driven_by: CLAUDE.md rules 32-39, REPO-HYGIENE-PROTOCOL.md
---

# SwanStudios Repo Hygiene Inventory — 2026-04-12

This is the first formal inventory under the repo-hygiene protocol. It is **non-destructive**. No files were moved, renamed, or deleted. Every item is classified per rule 33 and every destination is a **proposal pending Sean's Phase 2 approval**.

All language in this doc follows rule 34: no "safe to delete," no "guaranteed deletable," no "nothing to lose." Candidates are described as *likely deletion candidate pending Phase 2 approval*, *appears unreferenced based on current grep*, or *requires final reference check before destructive action*.

---

## Why this scan happened

A session attempting to fix "trainer workout logging → client dashboard visibility" failed twice in a row. Each time Claude fixed a non-canonical code path (first a dormant route, then a legacy-consumer-only mapper) while claiming end-to-end truth restoration. The root cause was **no canonical-vs-legacy-vs-dormant classification before acting** — which is also the core failure mode that repo clutter makes easier. This inventory is Phase 1 of the process-hardening response.

---

## Section A — Root directory summary

- **Total root-level entries:** ~239
- **Runtime directories:** `frontend/`, `backend/`, `scripts/`, `tests/`, `gamification-backend/`, `node_modules/`
- **Operating files:** `CLAUDE.md`, `ACTIVE-INDEX.md` (created 2026-04-12), `README.md`, `package.json`, `render.yaml`, `render.env.example`, `run-seeder.bat`, `skills-lock.json`
- **Clutter classes identified:** 9 (detailed below)

---

## Section B — Existing archive folders (already in place)

| Folder | Contents | Label (rule 33) |
|---|---|---|
| `archive/` | Contains `pending-deletion/2026-02-13/` | archive-only historical record |
| `docs/archive/` | ~27 superseded fix/complete summaries | archive-only historical record |
| `docs/ai-workflow/archive/` | 6 subfolders: `design/`, `homepage-refactor/`, `master-plans/`, `old-versions/`, `phase-0/`, `week-reports/` | archive-only historical record |
| `docs/ai-workflow/AI-HANDOFF/debate-archive/` | 22+ completed Opus-Codex debates | archive-only historical record |

**Status:** these folders are already organized. No Phase 2 work needed on them; they are the destinations for Phase 2 moves of items discovered in sections C–K below.

---

## Section C — QA screenshots at repo root

**Count:** approximately 120+ `.png` files at repo root.

**Subclasses (by filename prefix):**

| Prefix | Approximate count | Feature area |
|---|---|---|
| `about-v4-*.png` | 10 | landing page QA |
| `admin-dashboard-*.png`, `admin-375w-*.png` | 8+ | admin dashboard QA |
| `bootcamp-*.png` | 6 | bootcamp feature QA |
| `client-*.png`, `client-tab-*.png` | 11 | client features QA |
| `coach-assistant-*.png` | 9 | Swan Coach QA |
| `homepage-*.png` | 10+ | homepage QA |
| `qa-*.png` | 85+ | general QA runs, including `qa-pass11` through `qa-pass19` plus `qa-01` through `qa-26` |
| `workout-logger-*.png`, `workout-planner-*.png` | 7 | workout UI QA |
| `user-dashboard-*.png` | 7 | user dashboard QA |

**Label (rule 33):** QA artifact / screenshot / temp output.

**Proposed Phase 2 destination:** `qa-screenshots/2026-archive/{feature-prefix}/` grouped by prefix.

**Status:** *likely relocation candidate pending Phase 2 approval.*

---

## Section D — Dashboard planning `.yml` files at repo root

18 files identified:

```
admin-clients-team.yml
admin-dashboard-overview.yml
client-dashboard-overview.yml
client-workouts.yml
trainer-dashboard.yml
trainer-messages.yml
trainer-nutrition-intelligence.yml
trainer-schedule.yml
trainer-workout-intelligence.yml
user-dash-ai-consent.yml
user-dash-community.yml
user-dash-overview-fixed.yml
user-dash-profile.yml
user-dash-progress.yml
user-dash-rewards.yml
user-dash-workouts.yml
```

Plus `render.yaml` (KEEP — infra config, not in this list for relocation).

**Label (rule 33):** **ambiguous** — could be active reference doc (design specs still in use) OR planned/unimplemented blueprint (superseded specs) OR archive-only historical record. Classification requires Sean's call.

**Proposed Phase 2 destinations (conditional on Sean's classification):**
- If active reference → `docs/ai-workflow/planning-specs/`
- If superseded → `docs/ai-workflow/archive/dashboard-specs/`

**Status:** *classification ambiguous, awaiting Sean's call. Do not move.*

---

## Section E — Log / build artifacts at repo root

| File | Size | Type |
|---|---|---|
| `combined.log` | (unchecked, likely runtime log) | build/runtime artifact |
| `error.log` | (unchecked, likely error log) | build/runtime artifact |
| `tsc-errors.txt` | (unchecked, TypeScript compile dump) | build artifact |

**Label (rule 33):** QA artifact / temp output.

**Proposed Phase 1 deliverable (per rule 39):** `.gitignore` proposal covering `*.log` at root, `tsc-errors.txt`, and other build dumps, so the same files do not repopulate the repo after cleanup.

**Proposed Phase 2 destination:** `archive/logs/2026-04-12/` for any existing copies Sean wants preserved.

**Status:** *appears unreferenced by runtime code based on current grep. `.gitignore` update is a Phase 1 proposal per rule 39, awaiting approval for Phase 2 execution.*

---

## Section F — Temp / accidental files at repo root

| File | Size | Observation |
|---|---|---|
| `nul` | 0 bytes | Windows-only artifact, usually created by an accidental `> nul` redirect that should have been `> /dev/null`. Not a real file, not referenced by any code. |
| `_tmp_login.json` | 49 bytes | Appears to be a tiny test credential/session file |
| `tmp_cookbook.ipynb` | ~63 KB | Jupyter notebook of unclear current purpose |

**Label (rule 33):** temp / accidental artifacts.

**Status:**
- `nul`: *likely deletion candidate pending Phase 2 approval — appears unreferenced based on current grep.*
- `_tmp_login.json`: *awaiting Sean's confirmation of current relevance.*
- `tmp_cookbook.ipynb`: *awaiting Sean's confirmation of current relevance.*

---

## Section G — Ad hoc `.md` notes at repo root

| File | Observation |
|---|---|
| `chest-filter-snapshot.md` | Ad hoc note, not in load order, not referenced by `CLAUDE.md` |
| `pre-send.md` | Ad hoc note, not in load order, not referenced by `CLAUDE.md` |

**Label (rule 33):** ambiguous — could be active reference doc (if Sean uses them) or archive-only historical record (if superseded).

**Proposed Phase 2 destinations (conditional):**
- If still actively referenced → `docs/ai-workflow/` with promotion to reference
- If superseded → `docs/archive/`

**Status:** *ambiguous, awaiting Sean's call.*

---

## Section H — Orphaned `.tsx` files at repo root

Three files exist outside `frontend/src/` and therefore cannot be bundled by Vite into the runtime build:

| File | Size | Reference evidence |
|---|---|---|
| `BrandedExerciseIntro.tsx` | 0 bytes | empty file; grep of `frontend/src` found no importers of an identifier matching this file; *appears unreferenced based on current grep* |
| `CrystallineCoverageTracker.tsx` | 0 bytes | empty file; real version lives at `frontend/src/components/DashBoard/Pages/content-studio/CrystallineCoverageTracker.tsx` and is referenced by the real tree; the root copy *appears unreferenced based on current grep* |
| `ChallengesView.tsx` | **306 lines** | real version at `frontend/src/components/Social/Challenges/ChallengesView.tsx` is **704 lines**; **these are not the same file**; root copy may be a stale partial, a pre-move draft, or an older revision |

**Label (rule 33):**
- Two 0-byte files: orphaned candidates (empty, *appears unreferenced based on current grep*)
- `ChallengesView.tsx` at root: **ambiguous — requires diff-first analysis before any decision** (per Sean's explicit instruction 2026-04-12)

**Status:**
- 0-byte orphans: *likely deletion candidates pending Phase 2 approval and a final reference check.*
- `ChallengesView.tsx`: *diff-first bucket. No move or delete until root vs canonical version are compared and the authoritative copy is identified.*

---

## Section I — Empty / test folders at repo root

| Item | Observation | Classification |
|---|---|---|
| `@photos/` | **empty directory** | orphaned candidate |
| `client-data/` | contains `TEST-CLIENT/` subfolder + `image.png` | ambiguous — may be dev fixture, test data, or stale |
| `playwright-qa-full/` | Playwright capture folder | active QA artifact location |
| `playwright-qa-screenshots/` | Playwright capture folder | active QA artifact location |
| `qa-screenshots/` | Legacy QA | active QA artifact location |
| `qa-screenshots-2026-04-04/` | Dated QA run | active QA artifact location |

**Phase 2 candidates:**
- `@photos/`: *likely deletion candidate pending Phase 2 approval and a final reference check.*
- `client-data/`: *awaiting Sean's classification as dev fixture or stale test data.*
- Four parallel QA screenshot folders: *consolidation candidate, awaiting Sean's call.*

---

## Section J — Bug-class-specific dormant/legacy-route inventory

For the workout-history bug studied in this session.

| Path | Mount | Consumer | Label (rule 27) |
|---|---|---|---|
| `GET /api/workout/sessions` | `backend/core/routes.mjs:332` (`/api/workout` → `workoutRoutes`) + `backend/core/routes.mjs:333` (`/api/workout/sessions` → `workoutSessionRoutes`) | `useWorkoutSessions` (canonical via `ClientMyWorkoutsPage`) + `useClientDashboardData:189` | **canonical but mount-order ambiguous** — rule 31 audit required |
| `GET /api/workouts/:userId/history` | `backend/routes/clientWorkoutRoutes.mjs:107` | `frontend/src/hooks/useWorkoutHistory.ts:49` — consumed only by `components/ClientDashboard/*` (legacy/orphaned under current route tree) | **legacy-consumer-only** — schema drift fixed 2026-04-12, does not reach canonical surface |
| `GET /api/client-progress/:clientId/workout-history` | `backend/routes/clientProgressRoutes.mjs` (added 2026-04-12) | None | **dormant** — no consumer |
| `GET /api/analytics/:userId/personal-records` | admin-style route, exists | Previously called by `ClientProgressDashboardPage` (canonical) — repointed 2026-04-12 | canonical consumer now points elsewhere |
| `GET /api/client/analytics/personal-records` | `backend/routes/clientAnalyticsRoutes.mjs:102` | `ClientProgressDashboardPage` (canonical) — newly repointed 2026-04-12 | **canonical** |
| `GET /api/client/analytics/strength-profile` | `backend/routes/clientAnalyticsRoutes.mjs:81` | `WorkoutProgressCharts` (canonical) — newly repointed + unwrap-fixed 2026-04-12 | **canonical** |

**Key observation:** the only canonical consumer path for "client visible workout history" is `GET /api/workout/sessions` via `useWorkoutSessions`, and that path has a **mount-order shadowing ambiguity** that has not been audited. Until a rule 31 audit is performed, the canonical workout-history chain is **not verified**.

---

## Section K — Legacy/orphaned client dashboard tree

| File | Mount evidence | Classification (rule 27) |
|---|---|---|
| `frontend/src/components/ClientDashboard/RevolutionaryClientDashboard.tsx` | Declared as lazy import at `frontend/src/routes/main-routes.tsx:319-322`, no JSX usage found in `frontend/src/routes/` | **legacy/orphaned under current route tree** — not rendered by the currently verified canonical route tree for the client dashboard surface |
| `frontend/src/components/ClientDashboard/EnhancedOverviewCrystalline.tsx` | Imported by `CrystallineSections.tsx` only | **legacy/orphaned under current route tree** (same reason) |
| `frontend/src/components/ClientDashboard/CrystallineSections.tsx` | Imported by `RevolutionaryClientDashboard.tsx` only | **legacy/orphaned under current route tree** (same reason) |
| `frontend/src/hooks/useWorkoutHistory.ts` | Only importers are the three files above | **legacy-consumer-only hook** |

**Status:** *classified as legacy/orphaned under the current route tree. Not claimed as "dead" because that would require a repo-wide import audit including tests, Storybook stories, and tool scripts, which has not been performed. Per rule 34, the stronger "dead" claim is not supported by the evidence collected.*

**Phase 3 only (not Phase 1 or 2):** Before any code-level removal, a full reference audit must prove no test, Storybook story, tool script, or build process imports these files. Until then, they stay in place.

---

## Section L — `.gitignore` proposals (rule 39)

Recurring clutter classes that should have `.gitignore` coverage so they do not repopulate after Phase 2 cleanup. This is a **Phase 1 proposal only** — no `.gitignore` edit happens without Sean's explicit approval.

Proposed additions:

```gitignore
# Log / build dumps at root
/combined.log
/error.log
/tsc-errors.txt
/*.log

# Temp / accidental files at root
/nul
/_tmp_*.json
/tmp_*.ipynb

# Root-level QA screenshots (screenshots should live under qa-screenshots/ or playwright-qa-*/)
/about-v4-*.png
/admin-*.png
/bootcamp-*.png
/client-*.png
/coach-*.png
/homepage-*.png
/qa-*.png
/user-dashboard-*.png
/workout-*.png
```

**Status:** *proposed only. Awaiting Sean's Phase 2 approval. Note: the wildcard `.png` patterns above only match root-level files — files inside `qa-screenshots/` or `playwright-qa-*/` are not affected.*

**Caveat before executing:** grep the proposed patterns against the current repo once to confirm no intended-to-be-tracked file matches accidentally. That grep is a Phase 2 pre-flight check, not Phase 1 work.

---

## Section M — Phase 2 readiness checklist

What must happen before any Phase 2 execution starts:

- [ ] Sean reviews this inventory doc
- [ ] Sean resolves ambiguous classifications (sections D, F, G, H, I)
- [ ] Sean approves `.gitignore` proposal (section L)
- [ ] Sean approves QA screenshot relocation scheme (section C)
- [ ] Sean approves new folder creations (if any): `archive/logs/`, `docs/ai-workflow/planning-specs/` or `docs/ai-workflow/archive/dashboard-specs/`
- [ ] Sean approves 0-byte orphan file removal (section H)
- [ ] Pre-flight grep on `.gitignore` patterns (Phase 2 start)

---

## Section N — Phase 3 readiness checklist

Code-level cleanup is Phase 3 only and requires all of the following:

- [ ] Phase 2 complete and verified
- [ ] Per-surface Canonical Surface Receipt (rule 26) proving no live consumer
- [ ] Repo-wide import audit including tests, Storybook, tool scripts
- [ ] Stage-move to `archive/pending-deletion/YYYY-MM-DD/` rather than direct delete
- [ ] Build + targeted tests green after each move

**Nothing in this inventory authorizes Phase 3 work.**

---

## Section O — What this inventory did NOT do

- Did not move, rename, or delete any file
- Did not edit `.gitignore`
- Did not create any folder
- Did not diff `ChallengesView.tsx` against its canonical counterpart
- Did not perform a repo-wide import audit for any legacy file
- Did not resolve the `/api/workout/sessions` mount-order ambiguity (that's rule 31 audit, not hygiene)
- Did not audit `client-data/TEST-CLIENT/`
- Did not enumerate every single QA screenshot individually (counts and prefixes only)
- Did not touch any runtime code
- Did not commit anything

---

## Section P — Open questions for Sean

1. Dashboard planning `.yml` files at root (section D): active reference or superseded?
2. `_tmp_login.json`, `tmp_cookbook.ipynb`, `chest-filter-snapshot.md`, `pre-send.md` (sections F, G): keep, archive, or remove?
3. `client-data/TEST-CLIENT/` (section I): dev fixture, real test data, or stale?
4. Four parallel QA screenshot folders (section I): consolidate to one, or keep separate?
5. Approve `.gitignore` proposal (section L)?
6. Approve new folder creations (section M)?
7. Approve the diff-first investigation of `ChallengesView.tsx` at root?

---

## Sign-off

**Phase 1 status:** complete — inventory captured, no files moved, no `.gitignore` edited.
**Phase 2 status:** blocked pending Sean's answers to Section P and explicit approval.
**Phase 3 status:** blocked pending Phase 2 completion.
