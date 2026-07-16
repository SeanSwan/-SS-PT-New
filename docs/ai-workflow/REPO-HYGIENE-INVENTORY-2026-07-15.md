# Repo Hygiene Inventory - 2026-07-15

Scope: non-destructive Phase 1 inventory for the canonical client Today-training Home slice. No file was moved, renamed, deleted, or archived.

## Root-level inventory

| Class | Items | Classification | Action |
|---|---|---|---|
| Operating sources | `AGENTS.md`, `CLAUDE.md`, `ACTIVE-INDEX.md`, `README.md` | active reference docs | Keep in place. |
| Runtime/build sources | `package.json`, `package-lock.json`, `render.yaml`, `.env.example`, `render.env.example` | active runtime/config | Keep in place. |
| Agent/tool config | `.clinerules`, `.fallowrc.json`, `.mcp.json`, `.gitattributes`, `.gitignore`, `.secretignore`, `skills-lock.json` | active reference/config | Keep in place. |
| Ignored runtime logs | `combined.log`, `error.log` | QA artifact / temp output | Recurring root clutter; `*.log` is already ignored. Candidate for `archive/logs/2026-07-15/` only after Sean approves Phase 2. |

No new `.gitignore` rule is proposed: root log recurrence is already covered by the existing `*.log` rules. The ignored logs remain in place during this feature pass.

## Existing archive and QA map

- `archive/cleanup-2026-05-12/` - archive-only historical cleanup record.
- `archive/pending-deletion/` - staged candidates awaiting review windows.
- `archive/qa-artifacts/` - QA artifact archive.
- `archive/quarantined-skills/` - quarantined tool material.
- `docs/ai-workflow/archive/` - archived design, homepage, master-plan, phase, and report docs.
- `qa-screenshots/`, `playwright-qa-screenshots/`, `playwright-qa-full/` - active QA artifact locations.

## Today-training surface classification

| Surface | Classification | Evidence and disposition |
|---|---|---|
| `UserDashboard/components/HomeTab.tsx` | active runtime code, canonical | Mounted by `UserDashboardTabsV3` for `/user-dashboard`; current `HomeTrainingCommandStrip` host. |
| `UserDashboard/components/ClientDashboardHomeTab.tsx` | active runtime code, canonical | Mounted through `ClientHomeTab` for `/dashboard/client/overview`; current `ClientProgramShelf` host. |
| `UserDashboard/components/HomeTrainingCommandStrip.tsx` | active runtime code, canonical fallback | Existing command-only strip. Preserve behind the Today-module feature flag for rollback. |
| `client-dashboard/plan/ClientProgramShelf.tsx` | active runtime code, canonical fallback plus plan shelf | Keep the plan shelf. Its embedded Today row becomes the flag-off fallback to avoid duplicate Today narration. |
| `client-dashboard/observatory/useCurrentClientWorkout.ts` | active runtime code, canonical read consumer | Existing authorized `/api/workouts/:clientId/current` consumer; reuse for both Home hosts. |
| `client-dashboard/observatory/ClientObservatoryHome.tsx` | legacy but still referenced | Explicit contract tests prove it is not mounted by canonical `ClientHomeTab`; test references remain. Do not move in this feature pass. |
| `ClientCurrentWorkoutCard` and observatory widget wrappers | legacy but still referenced for this Home slice | Consumed only by the unmounted observatory composition and its tests. Do not edit or move. |
| `assets/user-dashboard/dashboard-export/**` | active reference doc / QA artifact mix | Design handoff and screenshots are not runtime mounts. No cleanup in this pass. |
| Nutrition `Today` components | active runtime code, unrelated feature | Name overlap only; excluded from the training slice. |

## Route and duplicate-feature inventory

- `/user-dashboard` and `/user-dashboard/:tab` intentionally mount `UserDashboard.V3`; Home reaches `HomeTab` through `UserDashboardTabsV3`.
- `/dashboard/client/overview` intentionally mounts `ClientHomeTab`, which renders `ClientDashboardHomeTab`.
- These are two canonical hosts with competing current behavior, not duplicate routes. The implementation will mount one shared `TodayTrainingModule` without merging their page compositions.
- `/client-dashboard` is a legacy redirect surface in `main-routes.tsx`, not a third Home implementation.
- `/api/workouts/:userId/current` is the sole touched current-plan read endpoint. `/api/workout`, `/api/workout-plans`, and `/api/workout/sessions` are sibling mounts with different path identities and do not own this read.

## Candidate archive/move list

1. `combined.log` and `error.log`: likely relocation candidates pending Phase 2 approval; already ignored, and not touched here.
2. `ClientObservatoryHome.tsx` plus observatory-only wrappers: legacy under the verified route tree, but still referenced by tests; requires a separate reference and product decision before any Phase 3 move.
3. Dashboard-export screenshots: remain in the existing design-reference location; any archive decision is outside this feature pass.

No cleanup execution is requested or performed by this inventory.
