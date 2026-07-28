---
surface: swan-lens
slug: 25-world-engine-master-prompt
utc: 20260728T050000Z
author: vs-claude (Opus-tier, lead orchestrator)
kind: architecture-decision / final-plan
privacy: IDs/roles only — no PII, no secrets
---

# Swan Lens → 25-World Engine: master build prompt landed (plan, not build)

**Decision (Sean 2026-07-28):** build ALL 25 Swan Lens worlds now — refactor the 2 real ones
(candy-glass-arcade, prism-terminal) into a unified 25, promote the other 23 from chrome-only to full
`--world-*` recipes, complete refactor, better than the Opus-4.8 era. New dimension: agents interacting with
the world system. Kimi + Fable ran as advisors; running model was lead orchestrator.

**Key orchestrator override (transferable):** both advisors invented ~25 NEW world names. Rejected. The 25
worlds ARE the 25 lens ids already in `workoutDesignStyleCatalog.ts` (`WORKOUT_DESIGN_STYLE_ROW_ORDER`,
count-asserted by the Lab contract test) — playful 7 / calm 4 / technical 6 / luxe 4 / atmospheric 4. We
PROMOTE the real ids chrome→world and pour the advisors' optical DNA onto them. Reconcile-not-rewrite: zero
catalog/test churn.

**Load-bearing finding (from the code, neither advisor had it):** the true distinctness ceiling is the
**host capability manifest** variant/template vocabulary (`LAB_HOST_MANIFEST.slots`/`templates`), not tokens.
Tokens ~40% of a world; structure (templates + component variants, each needing a real renderer) ~60%. "25
distinct worlds" REQUIRES expanding that vocabulary + building renderers once, shared across worlds. Biggest
hidden cost. Shipping 25 worlds that all use `playfield-stack` = "25 greys."

**Architecture (Fable-ruled):** one `worlds/registry.ts` (closed `WorldId` union → missing world = compile
error) + hand-authored `recipes/<id>.ts` + `lens-add-world.mjs` generator (kills the 7–9-file chore);
per-world a11y/perf **ledger** with 4-layer fail-closed CI (completeness / static-deterministic contrast+
distinctness+anti-cheese / measured Lighthouse+Playwright / signed expiring waivers); 4-step theme-system
collapse to `paletteThemeId` (each flag-guarded + revertible — highest blast radius, characterization oracle
first); `--world-*`/`--surface-*` rename; resolver A3 gate flips ON only when all 25 are ledger-green +
determinism-hash-attested (flip changes routing, never compilation — hash drift = abort). Deterministic
compiler + fail-closed guard preserved. 19 numbered slices, Slice 1 = engine spine (zero user-visible change).

**Agent frontier — iron law (reusable governance):** agents PROPOSE recipes as JSON, they NEVER write
production tokens; runtime has no write creds to `worlds/recipes/` or Launch Control; MCP surface =
preview/propose/select/audit, never apply-to-production (human token required); zero-PII derived enums only
(time-of-day/workout-phase/streak-tier/season, computed on-device); designValueGuard fail-closed is the last
line; `agentWorlds` kill-switch. 9 products rated, build order A2(MCP)→A1(picker)→A3(QA, CI day-one)→A5(vibe
chat)→A6(adaptive, deterministic param mapping NOT generative)→A7→A4(factory, Lab-only = enterprise
white-label seed). Multiplayer shelved as gimmick.

**Provenance note:** synthesis + the two findings above are Opus-tier (running model), NOT Fable-tier → this
is an inbox memo only, NOT a durable learning packet (rule 68 fail-closed corpus gate).

**Artifact:** `docs/ai-workflow/AI-HANDOFF/SWAN-LENS-WORLD-ENGINE-MASTER-BUILD-PROMPT-2026-07-28.md`
(branch `claude/build-swan-lens`, commit `96d719883`). Consults: `.ai-workflow/fusion/kimi-25worlds.md`,
`fable-25worlds.md`. Issue: SWA-69. **Status: PLAN committed; no worlds built yet — Slice 1 is next.**
