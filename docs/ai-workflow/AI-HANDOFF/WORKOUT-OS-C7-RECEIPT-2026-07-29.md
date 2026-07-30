---
decision: "C7 shipped: Guided default + Power toggle (a), Forge retired w/ param-preserving redirects (c), gold sprawl hoisted to one module (d); C7b micro-absorptions deferred w/ reason; wizard kept as Client Hub guided lane; draft-migration proven moot"
status: shipped
supersedes: none
---

# WORKOUT OS — C7 Receipt: Planner Consolidation (2026-07-29)

Branch `claude/workout-os-build-20260729`. Commits: `c6593f026` (C7a), `d8a64122e` (C7c), + this slice's C7d commit. Capability inventories (the §12 pre-build artifact) ran first and REWROTE the slice — full receipts in the C7 recon result.

## C7a — Guided default + Power toggle (§12.2 ruling)
GUIDED default for new plans (seeds the existing Guide-Me candidate-picking machinery), POWER one header toggle away, preference persisted per operator (`ss.planner.view.v1`, validate-on-read). Self-contained toggle drives the existing `onGenerationModeChange` seam; page stayed 299/300 lines.

## C7c — Forge retirement (ONE authoring surface)
10 files deleted (9 Forge + the 4th dead builder `Admin/WorkoutPlanBuilder`), −1,975 lines, importer receipts per file. `/build-plan` (admin+trainer) + legacy `/workout-forge` → param-preserving redirects to the role's planner (whole-search forwarding — clientId/returnTo/sessionId land; the planner honors more than Forge read). Nav/workspace/CTA truth updated; teach-me matcher repointed; canonical registry `buildPlan` repointed with absorption note; 8 pinned test files repointed, zero coverage deleted; the Client Hub "Build Plan" chip (the WIZARD — naming trap) untouched. Executor-built, orchestrator-verified (independent 24 files/120).

## C7d — Gold hoist
47 `#C6A84B` declarations across 12 files under FIVE aliases (`--accent-gold/--accent-warning/--accent-luxury/--warning/bare`) → ONE `plannerGold.ts` (`PLANNER_GOLD` + clamped `plannerGoldAlpha`), Lens-rethemable via `--accent-gold`. All alpha percentages verified exact; contract test bans the literal and the old aliases from returning. Planner dir 70 files/328 green (executor + orchestrator runs).

## Inventory-driven rulings (deviations from §12 with evidence)
1. **Draft migration MOOT** — no plan surface (Forge/wizard/canonical) has ANY draft persistence; nothing to migrate. Planner autosave = recorded follow-up (logger draft pattern as precedent).
2. **Wizard KEPT** as the Client Hub embedded guided lane — live surface with pinned contracts (26-week default, save contract); its "validation spine" is a one-line stub, so §12's preserve-the-spine premise was empty. Own absorption slice recorded.
3. **C7b micro-absorptions DEFERRED with reason:** plan-title input (planner auto-titles; cosmetic) + post-save two-button handoff (partial precedent exists at `activePlanLoggerRoute`); duration-minutes + free-text goal deliberately NOT absorbed (weaker-structure duplicates of planner concepts); copilot template catalog + long-horizon SURVIVE via the Client Hub copilot mount — no capability lost.
4. Generated `.understand-anything` artifacts carry stale Forge nodes — regenerate, don't hand-edit (C9 note).

## Gates
C7a 4 suites/25 · C7c independent battery 24 files/120 + planner-proof 69/291 · C7d planner dir 70/328 ×2 (executor + orchestrator). All commits secret-scan clean.
