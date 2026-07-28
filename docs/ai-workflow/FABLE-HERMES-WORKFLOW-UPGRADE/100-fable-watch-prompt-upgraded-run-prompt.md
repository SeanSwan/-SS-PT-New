# 100 — Fable Watch Prompt: Upgraded Run Prompt & Internal Execution Plan

- **Date:** 2026-07-03
- **Author:** Fable (claude-fable-5), fresh session after the 529 overload restart
- **Status:** ACTIVE — this is the execution plan the current Fable pass is running
- **Supersedes:** `000-watch-prompt-upgraded-run-prompt.md` (Codex's audit-phase plan; kept as historical record of the audit pass)

---

## 1. What this pass is

This is the **build pass** that follows the Codex audit pass (docs 000–090). The audit found the gaps; this pass fills them. Three deliverables:

1. **Fable Workflow Control Layer** — canonical docs that tell every agent (Fable, Claude Code, Codex, Hermes, AI Village, Browser Harness) what Fable is for, where the Hermes/SwanStudios boundary sits, and which operator owns which capability at which effect tier.
2. **Hermes Agentic OS** — the six-level operating system for Sean's private operator brain: workflow audit → skills → automations → loops → memory/state → visual command center → distribution. Includes a static non-production command-center prototype.
3. **Fable-made Design Brain** — a callable, dense design system bundle at `docs/ai-workflow/design-brain/` that adapts (never replaces) `SWAN-CINEMATIC-DESIGN-SYSTEM.md`, plus adapters, QA gates, website archetypes, a cinematic site factory, and Obsidian/Graphify bridges.

Correction carried forward from Sean: **"Paybolt" was a transcription error for "Fable."** Nothing named Paybolt is canonical. See `101-paybolt-mishearing-cleanup.md` for the evidence sweep.

## 2. How the original prompt was improved

Sean's run prompt is thorough; the upgrades this pass applies on top of it:

1. **Consolidation over enumeration.** The prompt enumerates ~85 files. Thin files are how doc systems rot. This pass merges sibling topics into denser files (e.g., 12 design-brain adapters → 8; three QA docs → one `qa-gates.md` with three sections; 20 website archetypes → one dense archetype codex). Every merge is recorded in the batch checkpoint and the folder `index.md`, so nothing Sean asked for is silently dropped — it's findable under a better roof.
2. **One spine: the T0–T4 effect ladder.** Sean defined command effect tiers once; this pass makes them the single vocabulary across the operator bridge, the skill registry, the Agentic OS command-effect registry, the dashboard button registry, the Hermes update prompt, and the AI Village governance mode. One ladder, referenced everywhere, defined in exactly one place (`HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md`).
3. **Two design languages, one system.** Crystalline Swan (product surfaces, canonical) and **Crystalline Cyberforest** (Hermes operator/command surfaces) are defined as sibling *modes* of one token system, not competing brands. The Design Brain owns both; the Cyberforest mode is scoped to Sean-only operator tooling and never leaks into client-facing UI.
4. **Registry-first, capability-second.** Per the audit's hostile finding ("the dangerous failure mode is Hermes doing too much without a single authority map"), Batch 1 lands the permission architecture before any Agentic OS capability doc is written.
5. **Existing-doctrine locks.** Everything produced here subordinates to CLAUDE.md/AGENTS.md rules. The Design Brain explicitly does not supersede `SWAN-CINEMATIC-DESIGN-SYSTEM.md`; it adapts it. AI Village modes extend rule 16/50 gating; they never bypass it. CLAUDE.md/AGENTS.md changes are delivered as a **proposal only** (110), never applied.

## 3. Execution order

| Batch | Deliverable | Executor |
|---|---|---|
| 0 | 100 (this file), 101 Paybolt cleanup | Fable direct |
| 1 | FABLE-WORKFLOW-INTEGRATION-SPEC, HERMES-SWANSTUDIOS-OPERATOR-BRIDGE (missing on disk — created), SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY, checkpoint 010 | Fable direct (highest-leverage; sets vocabulary for all agents) |
| 2 | `docs/ai-workflow/hermes-agentic-os/` (Levels 1–6 + governance + command-center prototype HTML), checkpoint 020 | Fable-briefed subagents, Fable reviews |
| 3 | `docs/ai-workflow/design-brain/` core + adapters + `design.html` + Obsidian/Graphify bridges, checkpoint 030 | Fable-briefed subagents, Fable reviews |
| 4 | Website archetype codex + cinematic site factory, checkpoint 040 | Fable-briefed subagent |
| 5 | Obsidian/Karpathy/Graphify integration cross-check, checkpoint 050 | Fable direct |
| 6 | 130 AI Village review packet (10 modes) | Fable direct |
| 7 | 110 CLAUDE/AGENTS patch proposal (proposal-only) · 120 Hermes update prompt · 140 implementation slices | Fable direct |
| 8 | 150 executive summary for Sean | Fable direct |
| — | Hostile review (20-point list from the run prompt) + verification + final report | Fable direct |

## 4. Safety envelope (locked for the whole pass)

- Docs and static prototypes only. **No production code, no commits, no push, no deploy, no DB access, no web browsing, no paid AI Village run.**
- No secrets, credentials, PII, or client transcripts in any artifact. All examples use placeholder/demo content.
- Static HTML prototypes: no external scripts, no fetch, no live data — self-contained files a browser can open from disk.
- CLAUDE.md / AGENTS.md patches are written as proposals in 110 and are **not applied**.
- Rule 67 honored: lane claimed in `.ai-workflow/coordination/claude.lane.md`; Codex is idle; all touched paths are uncontested doc lanes.
- Overload-safe: a checkpoint file lands after every batch with created/remaining/assumptions/open-questions/continue-here, so a crashed session re-enters cheaply.

## 5. Assumptions declared up front

- The audit packet (010/020) is treated as **[VERIFIED-by-Codex]** evidence for route mounts and doc gaps; where this pass depends on a specific claim, it is labeled with its source rather than re-verified from scratch (this is a docs pass, not a runtime pass).
- `HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` is referenced by CLAUDE.md/AGENTS.md but **absent on disk** ([VERIFIED] by glob + the 010 audit). Creating it here *resolves* a dangling reference rather than overwriting prior content.
- Obsidian and Graphify are treated as **planned/local tools** — the bridges written here are routing policy, not proof either tool is installed.
- Fable 5 availability is time-boxed; every artifact is written to be executable later by Codex/Claude/Gemini without Fable present.
