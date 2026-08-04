# Repo Hygiene Inventory ? Bootcamp V2 Crystalline Class Rail

Date: 2026-08-01
Mode: Phase 1, non-destructive inventory only
Worktree: `C:/tmp/sspt-bootcamp-crystalline-rail-20260801`
Baseline: current `origin/main@75299b673` plus three cleanly replayed V2 foundation commits

## Root inventory

| Path/class | Classification | Finding |
|---|---|---|
| `AGENTS.md`, `CLAUDE.md`, `ACTIVE-INDEX.md`, `README.md` | active reference docs | Expected operating/index material. |
| `frontend/`, `backend/`, `shared/` | active runtime code | Bootcamp runtime spans all three; `shared/bootcamp-core` is the portable V2 seam. |
| `docs/` | mixed active reference and planned blueprints | Bootcamp V2 plan material is reference-only until implemented. |
| `archive/` | archive-only historical record | Already separated from runtime. |
| `scripts/`, `tests/`, `tools/` | active QA/tooling | No relocation proposed in this slice. |
| `.agents/`, `.claude/`, `.ai-workflow/` | active agent/workflow reference | Required by repo coordination and design routing. |
| Root package/config files | active runtime/build configuration | No ad hoc screenshot, log, or QA dump found at root. |

## Competing-surface and duplicate-route inventory

| Candidate | Classification | Evidence and resolution |
|---|---|---|
| Admin `/dashboard/admin/bootcamp` | canonical | Mounts `BootcampBuilderPage`; retained. |
| Trainer `/dashboard/trainer/bootcamp` | canonical | Mounts the same component; role-specific route, not duplication. |
| Protected `/bootcamp-builder` | canonical alias | Same component and access roles; retained as compatibility entry. |
| `BootcampDemoMode` | canonical child | Floor/run child of `ClassPreviewPanel`; it is not a competing builder. |
| `SprintPlannerPage` | adjacent canonical feature | Multi-week programming surface; keep separate from single-class Builder/Runner. |
| `/api/bootcamp` and `/api/bootcamp/sprints` | overlapping backend mounts | General router comes first but has no sprint catch-all; documented in the canonical receipt. No mount change planned. |
| `/api/bootcamp/exercises` and `/api/exercises/library` | legacy-specialized vs canonical shared source | The mounted Builder consumes `/api/exercises/library`. No second frontend exercise source will be introduced. |

## Bootcamp file classification

| Area | Classification | Action |
|---|---|---|
| `frontend/src/components/BootcampBuilder/**` | active runtime code | Extend surgically through the existing mounted composition. |
| `frontend/src/hooks/useBootcampAPI*` | active runtime contract | Preserve endpoint literals and response shape. |
| `backend/services/bootcamp/**` | active runtime code | Existing V2 day-type/capacity commits retained; no WIP-tree wholesale port. |
| `shared/bootcamp-core/**` | active portable V2 runtime | Claude-owned lock preserved; no Codex edits. |
| Bootcamp upgrade blueprints | planned/unimplemented blueprint | Reference only; do not describe planned slices as shipped. |
| Bootcamp panel outputs in the shared checkout | QA/design artifacts | Keep outside this release unless deliberately promoted into a committed synthesis. |

## Candidate archive or move list

No runtime file is a deletion or relocation candidate in this implementation pass.

Potential future cleanup, requiring a separate approved Phase 2:

1. Consolidate superseded Bootcamp blueprint documents after the V2 program finishes and `ACTIVE-INDEX.md` names the canonical replacement.
2. Move retained raw consultation outputs into the established AI-HANDOFF archive structure after a compact decision record exists.
3. Re-evaluate the specialized `GET /api/bootcamp/exercises` endpoint only after a caller grep confirms it has no remaining consumers.

## Recurrence and ignore check

No new recurring root artifact class was found, so no `.gitignore` change is proposed.

## Hygiene decision

Proceed in the isolated worktree. Create no alternate Bootcamp page or duplicate API family. Keep generated QA screenshots outside the repository or under an existing QA artifact location, and report them at closeout.
