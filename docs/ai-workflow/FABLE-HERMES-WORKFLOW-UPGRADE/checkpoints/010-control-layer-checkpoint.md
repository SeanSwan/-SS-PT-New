# Checkpoint 010 — Fable Control Layer (Batches 0–1)

- **Date:** 2026-07-03 · **Session:** Fable build pass (post-529 restart)

## Created
- `docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/100-fable-watch-prompt-upgraded-run-prompt.md` — execution plan + consolidation policy
- `docs/ai-workflow/FABLE-HERMES-WORKFLOW-UPGRADE/101-paybolt-mishearing-cleanup.md` — CLOSED: zero pre-existing Paybolt references (two sweeps incl. gitignored/hidden); nothing to quarantine; Fable confirmed as intended concept
- `docs/ai-workflow/references/FABLE-WORKFLOW-INTEGRATION-SPEC.md` — Fable role, use/don't-use, vs-other-brains, output formats, cost discipline
- `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` — **resolves the dangling CLAUDE.md/AGENTS.md reference** (file was missing on disk); boundary table, actor roles, canonical T0–T4 ladder, safe write path, approval gates, receipts, kill switches, design boundary
- `docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` — decision labels, operator owners, deterministic-vs-agent boundary, ~45 seeded rows across skills/Fable/Agentic-OS/Design-Brain/Village/harness/knowledge, button candidates, manual-only list, bloat policy

## Remaining
Batch 2 (Hermes Agentic OS + prototype) → checkpoint 020 · Batch 3 (Design Brain) → 030 · Batch 4 (website factory) → 040 · Batch 5 (Obsidian/Graphify cross-check) → 050 · Batch 6 (130 Village packet) · Batch 7 (110/120/140) · Batch 8 (150) · hostile review + verification.

## Assumptions
- T0–T4 defined ONCE in the operator bridge; all later docs reference, never redefine.
- Registry rows marked "CREATE → done" refer to artifacts landing later in THIS pass; if the session dies, the row stands as the work order.
- Hermes stays Sean-only at the brain level; the 2026-06-18 per-trainer-operator decision is honored as *product tool-layer* roadmap (bridge §3 note), not raw Hermes access.

## Open questions (accumulating for Sean — final list in 150)
- Fable spec §12 (fallback pinning, post-return orchestration, cadence, spec expiry)
- Bridge §11 (trainer audit lanes, Discord alert taxonomy, approval expiry, receipt retention)
- Registry §14 (T2 allowlist, in-product registry view, first three buttons, audit cadence)

## Continue here if session crashes
Read `100-...run-prompt.md` §3 table; next unbuilt batch is the first without its checkpoint file in this folder. Lane claim is in `.ai-workflow/coordination/claude.lane.md` [SESSION-O].
