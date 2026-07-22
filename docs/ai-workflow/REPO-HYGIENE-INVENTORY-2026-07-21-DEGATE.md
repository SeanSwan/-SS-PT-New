---
decision: Task-scoped Phase 1 hygiene inventory for design de-gating route trace
status: inventory-only
supersedes: none
---

# Repo Hygiene Inventory — 2026-07-21 — Design De-Gating

This is a non-destructive Phase 1 inventory scoped to the public-design gates, Design Playground, Launch Control, and admin route parity. It authorizes no cleanup, relocation, or deletion beyond the explicit feature changes in the master handoff.

## Root inventory

The fresh `origin/main` worktree has a lean root: operating docs (`ACTIVE-INDEX.md`, `AGENTS.md`, `CLAUDE.md`, `README.md`), package manifests, Render/config examples, secret-scan config, MCP/skill config, and source directories. No root screenshot, ad hoc log, or temp-output class was created by this work.

| Root class | Items | Classification |
|---|---|---|
| Operating docs | `ACTIVE-INDEX.md`, `AGENTS.md`, `CLAUDE.md`, `README.md` | active reference doc |
| Package/build config | `package.json`, `package-lock.json`, `render.yaml`, `.gitattributes`, `.gitignore` | active runtime/build config |
| Environment examples | `.env.example`, `render.env.example` | active reference config; no values inspected |
| Agent/security config | `.clinerules`, `.fallowrc.json`, `.mcp.json`, `.secretignore`, `skills-lock.json` | active tooling config |
| Archive root | `archive/` | archive-only historical records by contained subfolder; contents not reclassified in this task |

## Competing-surface inventory

The detailed file-by-file surface table is in `docs/receipts/de-gate-2026-07-21/S0-route-and-flag-receipt.md`.

- Seven public/dashboard route seams are competing runtime variants because a Gate can mount either the original component or a design branch.
- Production currently selects all seven design branches.
- Sean's approved target resolves each competition: original route becomes canonical; design branch remains compiled and becomes Design-Studio-only.
- `DesignPlaygroundLayout` is dormant behind `VITE_DESIGN_PLAYGROUND` and will be remounted as an admin route.
- `ADMIN_DASHBOARD_TABS` is legacy but still referenced by tests; it cannot be removed until those test references are updated.
- `WORKSPACE_CONFIG` is active runtime code and remains the canonical admin sidebar registry.

## Duplicate-route / duplicate-feature inventory

| Item | Evidence | Classification / action |
|---|---|---|
| `/api/config/public-flags` | one `/api/config` mount at `backend/core/routes.mjs:291`; one GET handler at `publicConfigRoutes.mjs:22` | active runtime code; no shadow |
| `/api/admin/flags` | one mount at `backend/core/routes.mjs:455` | active runtime code; preserved for three feature switches |
| Design Playground paths | dormant `/designs/:id` build-gated route plus dead legacy nav path `/dashboard/design-playground` | competing/ambiguous path naming resolved by target `/dashboard/admin/design-playground` |
| Gallery gate files | `GalleryGate.tsx` and `GatedGalleryPage.tsx` both participate in the same canonical gallery seam | active runtime code before S1; remove only through the feature slice, not hygiene cleanup |
| Dashboard v2 API | `/api/dashboard/v2/summary` remains additive even when the v2 UI parks | dormant backend capability after de-gating; do not delete |

## Existing archive map relevant to this scope

- `archive/`: historical root material.
- `docs/archive/`: superseded general docs.
- `docs/ai-workflow/archive/`: superseded planning/design material.
- `docs/ai-workflow/AI-HANDOFF/debate-archive/`: completed review debates.
- QA screenshot destinations documented by policy: `qa-screenshots/`, `playwright-qa-screenshots/`, and `playwright-qa-full/`.

No existing archive destination is needed for the parked vNext directories because the product decision requires them to remain compilable and browseable in Design Studio.

## Candidate archive/move list

None in this task. The seven vNext directories are expressly retained. The gate files and dead legacy nav registry are feature-slice removals backed by regression tests, not Phase 2 hygiene moves. Any broader root or archive cleanup remains outside this workstream.

## Recurrence / `.gitignore` proposal

No new recurring in-repo artifact class was found. Live-probe screenshots were written to `C:/tmp`, outside the repository. No `.gitignore` change is proposed.

## Ambiguities

- Source of the production `true` values (env baseline versus DB override) is unknown until Sean completes the authenticated Launch Control read-only check.
- Live admin 404 behavior is unknown until Sean completes the sidebar click-pass.

Both ambiguities block narrow claims about production configuration or zero dead admin links; neither authorizes a cleanup action.
