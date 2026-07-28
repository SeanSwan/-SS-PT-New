# Repo Hygiene Inventory ? 2026-07-14

**Phase:** 1, non-destructive inventory only
**Trigger:** Canonical route trace for native client-directory CSV export
**Scope:** Repo root plus client-management competing surfaces
**Branch observed:** `wip/comms-notifications-2026-07-05`
**Working-tree condition:** Heavily shared and dirty before this task; all unrelated changes remain untouched.

## Section A ? Root directory summary

The root currently contains 123 entries: 33 directories and 90 files.

- **Active runtime/config directories:** `backend/`, `frontend/`, `shared/`, `config/`, `scripts/`, `tests/`.
- **Active tooling/reference directories:** `.agents/`, `.ai-workflow/`, `.claude/`, `.codex/`, `.github/`, `.githooks/`, `docs/`, `AI-Village-Documentation/`.
- **Dependency/build/runtime directories:** `node_modules/`, `test-results/`, `tmp/`.
- **Tracked operating files:** `AGENTS.md`, `CLAUDE.md`, `ACTIVE-INDEX.md`, `README.md`, `package.json`, `package-lock.json`, `render.yaml`, `.gitignore`, `.gitattributes`, `.env.example`, `render.env.example`, `skills-lock.json`, and the tracked tool-policy files.
- **Local sensitive config:** `.env` is ignored local configuration. Its contents were not read or copied into this inventory.
- **Root clutter classes observed:** 17 image captures, 2 log files, 29 Codex patch artifacts, 15 Codex temporary source copies, 6 World Engine temporary Python patch helpers, one diff, one metrics JSON file, and two zero-byte shell-fragment filenames.

## Section B ? Existing archive folders map

| Path | Exists | Immediate children | Classification |
|---|---:|---:|---|
| `archive/` | yes | 4 | active archive root |
| `docs/archive/` | yes | 26 | archive-only historical/reference records |
| `docs/ai-workflow/archive/` | yes | 7 | archived AI-workflow material |
| `docs/ai-workflow/AI-HANDOFF/debate-archive/` | yes | 12 | completed debate records |
| `AI-Village-Documentation/validation-prompts/archive/` | yes | 20 | validation-prompt archive |
| `qa-screenshots/` | no | 0 | approved convention exists, folder absent at root |
| `playwright-qa-screenshots/` | no | 0 | approved convention exists, folder absent at root |
| `playwright-qa-full/` | no | 0 | approved convention exists, folder absent at root |

No archive folder was created or changed.

## Section C ? QA screenshots at repo root

Classification: **QA artifact / screenshot / temp output**.

Observed files:

- `appearance-studio-mobile-414.png`
- `archive-414-hostile.png`
- `brain-slice2-final.png`
- `coach-admin-320-current.png`
- `graph-after-fix.png`
- `hermes-v1-414.png`
- `hero-1440.jpeg`
- `home-1440-top.png`
- `review-glacier-cathedral.png`
- `review-nebula-drift.png`
- `review-neon-meridian.png`
- `review-tiny-metropolis.png`
- `site21-1440-full.jpeg`
- `swanguard-audit-desktop.png`
- `swanguard-audit-intel-wiki-desktop.png`
- `swanguard-audit-mobile-390.png`
- `world-final-archive-mobile.png`

Proposed Phase 2 destination, pending Sean's approval: dated feature folders under `qa-screenshots/` or the existing Playwright QA locations. Root PNG recurrence is already blocked by `.gitignore:281`; JPEG recurrence needs a matching root-only proposal in Section L.

## Section D ? Planning/spec files at repo root

- `render.yaml` ? **active runtime/config code**; tracked Render configuration, keep in place.
- No ad hoc root YAML blueprint was observed.
- `apex-branch.diff` ? **QA artifact / temp output**; likely archive candidate pending Phase 2 approval after final reference/provenance check.
- `swanguard-mobile-metrics.json` ? **QA artifact / temp output**; requires ownership confirmation before relocation.

## Section E ? Log / build artifacts at repo root

- `combined.log` ? **QA artifact / temp output**.
- `error.log` ? **QA artifact / temp output**.
- `test-results/` ? **QA artifact / temp output** directory.
- `tmp/` ? **QA artifact / temp output** directory unless an owning workflow documents retained state.

The root log class is already covered by `.gitignore:191`. No ignore rule was changed.

## Section F ? Temp / accidental files

- 29 `.codex-*.patch` files ? **QA artifact / temp output**; requires final reference check before destructive action.
- 15 `.codex-tmp-*` source/test copies ? **QA artifact / temp output**; several are already covered by root extension ignores, but ownership remains ambiguous.
- 6 `.tmp_world*.py` helpers ? **QA artifact / temp output**; likely relocation candidates pending Phase 2 approval and World Engine owner confirmation.
- `%sn  ; elif [ -d  ]; then printf %s` and `; elif [ -d  ]; then echo ` ? **orphaned candidates** based on zero-byte size and shell-fragment names; require final reference check before any destructive action.
- `.codex-worktrees/`, `.worktrees/`, and `deploy-style-lens/` are empty ? **ambiguous** because tooling may reserve them.

## Section G ? Ad hoc .md notes at repo root

No ad hoc Markdown notes were observed. The four root Markdown files are classified as:

- `AGENTS.md` ? **active reference doc**.
- `CLAUDE.md` ? **active reference doc**.
- `ACTIVE-INDEX.md` ? **active reference doc**.
- `README.md` ? **active reference doc**.

## Section H ? Orphaned source files at repo root

The `.codex-tmp-*` CJS/MJS/TS/TSX files and `.tmp_world*.py` helpers sit outside `frontend/src` and `backend/`, so Vite does not bundle them through the canonical frontend entry. They are classified as **QA artifact / temp output**, not runtime code. Phase 2 needs per-file grep and provenance checks before relocation.

## Section I ? Empty / test folders

- Root-level empty folders: `.codex-worktrees/`, `.worktrees/`, `deploy-style-lens/`.
- Additional empty folders exist inside tool caches, `node_modules`, upload placeholders, workflow answer folders, and archived source trees.
- Root empty folders are **ambiguous**; dependency/cache and upload placeholders are **active runtime/tooling directories** unless their owners say otherwise.

## Section J ? Client-management duplicate feature/route inventory

| Surface | Classification | Evidence |
|---|---|---|
| `frontend/src/components/DashBoard/workspaces/ClientsWorkspace.tsx` | active runtime code | `UniversalDashboardLayout.routes.tsx:103` maps `/client-management` to `ClientsWorkspace`; `UniversalDashboardLayout.shellPieces.tsx:106` renders the selected component |
| `EnhancedAdminClientManagementView.tsx` | legacy but still referenced | Explicitly excluded from the route registry by `UniversalDashboardLayout.clientDetailsRedirect.test.ts:21-22`; tests and type-linked child components still reference it |
| `AdminClientManagementView.tsx` | legacy but still referenced | File identifies itself as V1 at line 3; absent from the current route/component registry; contract tests still inspect it |
| `ClientManagementDashboard.tsx` | legacy but still referenced | Absent from the current route/component registry; redirect contract test still inspects it |

Related backend route duplication:

1. `/api/admin` ? `adminRoutes` ? `adminClientRoutes`.
2. `/api/admin` ? `adminClientRoutes` directly.
3. `/api` ? `apiRoutes` ? `/admin` ? `adminRoutes` ? `adminClientRoutes`.

All three reach the same client router and controller. This task does not alter that mount structure.

## Section K ? Legacy/orphaned under current route tree

The three older client-management components in Section J are not rendered by the currently verified canonical route tree for this surface. They remain **legacy but still referenced**, because tests and some type-level relationships still point at them. No runtime file is proposed for immediate removal.

## Section L ? .gitignore proposals

Phase 1 proposals only:

- Add `/.codex-*.patch` for recurring root Codex patch artifacts.
- Add `/.codex-tmp-*` for recurring root temporary source copies not already covered by extension rules.
- Add `/.tmp_world*.py` for World Engine patch helpers.
- Add `/*.diff` if root diffs are never intended as reviewed deliverables.
- Add `/*.jpeg` and `/*.jpg` root-only patterns, matching the existing `/*.png` policy.
- Consider `/swanguard-mobile-metrics.json` only after confirming no runtime or CI consumer.

Pre-flight grep and Sean approval are required before any Phase 2 edit.

## Section M ? Phase 2 readiness checklist

- Sean selects exact root artifacts to relocate.
- Each selected file receives an import/reference/provenance grep.
- Destination paths use existing archive/QA conventions.
- `.gitignore` proposals are approved individually.
- Relocation runs as a separate pass from client-export implementation.
- A changelog records every old path ? new path move.

## Section N ? Phase 3 readiness checklist

- Per-surface Canonical Surface Receipt is refreshed.
- Tests, stories, scripts, type imports, and runtime imports are checked.
- Legacy components move first to `archive/pending-deletion/YYYY-MM-DD/`.
- Targeted frontend tests, typecheck, and build pass after any approved move.
- Sean explicitly approves code-level cleanup.

## Section O ? What this inventory did NOT do

- No file was moved, renamed, archived, or deleted.
- No `.gitignore` rule was changed.
- No runtime route, model, controller, service, or UI was changed.
- No secret or `.env` value was read.
- No unrelated user or agent change was staged or reverted.

## Section P ? Open questions for Sean

1. Which root QA captures should remain as current evidence versus move into dated QA folders?
2. Are the `.codex-*.patch`, `.codex-tmp-*`, and `.tmp_world*.py` groups still active recovery material?
3. Should the older client-management trees remain test fixtures, or enter a separately approved Phase 3 consolidation pass?
4. Is `swanguard-mobile-metrics.json` an active handoff artifact or a one-run QA output?
