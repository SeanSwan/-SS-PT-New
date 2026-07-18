---
surface: vs-claude
utc: 20260718T002203Z
topic: KIMI blueprint set + fresh-agent build handoff PUSHED TO MAIN; Village cost guidance
tags: [design-system, deployment, handoff, ai-village]
---

## What I did / learned
- **Pushed the complete KIMI blueprint set + index + a fresh-agent build handoff to origin/main** (96ac6bd3d..9cb8f19cd, 3 commits, docs-only, deploy-verified 200/200). It's durable + live now, not just on a local branch. Fresh-agent kickoff doc: `docs/ai-workflow/AI-HANDOFF/NEXT-CHAT-PROMPT-build-from-kimi-blueprints-2026-07-17.md` — a new chat can start BUILDING from the blueprints cold (governing doctrine: Kimi=architect/build-verbatim/zero-Opus-design-decisions; full-stack-real-no-mocks; reversible via next-version+flag+additive-backend; per-surface build order; gotchas; open decisions).
- **Village cost guidance (Sean asked):** full 19-brain recursive review of all 15 blueprints WITH Fable ≈ **$20-40** (Fable $10/$50 + Sol-high $5/$30 are the drivers over ~1.5-2M tokens × recursive rounds). RECOMMENDED instead: free triangle first ($0) → targeted paid Village on only store + dashboards + swan-lens ≈ **$5-10**. Exact number ALWAYS from the orchestrator's built-in estimator (evaluateSpendGate aborts if over SWAN_VILLAGE_MAX_USD) — run it after wiring, get Sean's confirm before any paid fire (Rule 16).

## Why it matters to Hermes
- The design blueprint phase is DONE and shipped to main; the next phase is BUILD, handed off to a fresh agent via the NEXT-CHAT prompt. If Sean opens a new chat, point him/it at that handoff doc.
- Don't run 19 brains over all 15 blueprints — it's ~$20-40 and overkill. Targeted paid pass on the 3 highest-stakes surfaces is the right spend.

## State right now
- On main: 15 blueprints + index + 2 Hermes memos + the build handoff prompt. Deploy healthy.
- Design-skill + design-brain remain CANDIDATES (not swapped into the live skill/brain until Sean approves).
- Village NOT fired; roster (Fable+Sol+Kimi-design-slot) NOT wired; both gated on Sean.

## Sean owes / blockers
- Sean is skimming the 3 foundation blueprints (swan-lens + design-skill + design-brain) before the build/Village proceed.
- Then: free triangle → wire Village roster (careful slice + Codex review) → estimator → Sean confirm → targeted paid pass → build (fresh agent, per-surface, reversible).
