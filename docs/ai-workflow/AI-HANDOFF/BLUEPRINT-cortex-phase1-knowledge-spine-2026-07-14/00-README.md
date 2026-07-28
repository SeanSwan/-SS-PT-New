# BLUEPRINT — Cortex Phase 1: Knowledge Spine
**Forged:** 2026-07-14 · **Architect:** Fable 5 · **Baseline:** origin/main @ `eac60c638`
**Parent docs:** `docs/ai-workflow/brainstorms/swan-training-cortex-master-prompt-2026-07-13.md` (v2 spec) · `docs/ai-workflow/AI-HANDOFF/CORTEX-PHASE0-RECONCILIATION-2026-07-14.md` (ratified decisions §8)

## What this builds

The **knowledge spine** of the SWAN Training Cortex: the database layer that stores Sean Swan's
professional knowledge sources (books, certifications, workshops — including the ~2000 NASM
workshop), the operational coaching rules derived from them (with citations, versioning, conflict
tracking, and Sean's approval workflow), plus the **progression/regression event log** (ratified
decision 5c — it immediately feeds charts and gamification). It also extends the existing
`swanCoachCortexService` to load Sean-Approved DB rules alongside the markdown doctrine vault, and
ships the admin Knowledge Console UI where Sean reviews rules.

**Brownfield law:** this repo already has a working Cortex policy loader, exercise catalog, plan
tables, and audit tables. This package ADDS the knowledge layer. It does NOT rebuild anything.
Everything is behind the `ENABLE_CORTEX_KNOWLEDGE` feature flag, default OFF.

## Package contents / build order

| File | What it gives you |
|---|---|
| `01-architecture.md` | System overview, Mermaid flowchart + sequence + ER diagrams |
| `02-wireframes.md` | Admin Knowledge Console — every screen/state, desktop + 375px |
| `03-contracts.md` | Every model definition, API endpoint, function signature — exact |
| `04-build-order.md` | File-by-file: path, purpose, line budget, imports/exports, pattern to copy |
| `05-slices.md` | 5 slices with executable acceptance criteria + STOP lines |
| `06-bans.md` | Do-NOT list (house rules + package-specific) |
| `07-checkpoints.md` | Checkpoint protocol + review remit; verdicts logged here |

Read 00 → 06 → 05 → 03 → 04 first. 01/02 are the reference layer while building.

## Builder Contract (binding)

> You are the builder, not the architect. Follow the package to the letter. Where the package
> decides, you do not re-decide — even if you'd do it differently. Where the package is silent on
> something that matters, STOP and return the question; do not improvise. Build ONE slice at a
> time; after each slice, output the diff + the acceptance-criteria evidence (test output, curl
> results, screenshots) and WAIT for the checkpoint verdict before continuing. Never claim a
> criterion passed without pasting its output.

## Environment facts the builder needs

- Node/Express backend, ES modules (`.mjs`), Sequelize + PostgreSQL. Frontend React 18 + TS +
  styled-components + Vite. Local dev: `npm run dev` from root (backend :10000, frontend :5173).
- **Local dev uses the PRODUCTION database.** Migrations are live the moment they run. Every
  migration in this package is additive-only (new tables, zero ALTERs of existing tables).
- Tests: `cd backend && npm test` (unit) · `cd frontend && npx vitest run` · types:
  `cd frontend && npx tsc --noEmit`.
- Migrations live in `backend/migrations/*.cjs` (CommonJS on Windows), run via the project's
  existing sequelize-cli setup. Models in `backend/models/*.mjs`, registered in
  `backend/models/associations.mjs` + `backend/models/index.mjs`.
- Commit style `type(scope): description`; commit per slice, push ONCE at batch end (Rule 70).
- Feature flag: `ENABLE_CORTEX_KNOWLEDGE` (env var, string `'true'` enables). All new routes
  return `503 {success:false, error:'cortex_knowledge_disabled'}` when off.

## Working method

Work in a fresh worktree branched from origin/main (NOT any wip branch):
`git worktree add C:/tmp/sspt-cortex-p1 -b codex/cortex-phase1 origin/main`.
Claim your lane per `.ai-workflow/coordination/` before editing (read the other agent's lane file
first). Stage explicit paths only — never `git add -A`.
