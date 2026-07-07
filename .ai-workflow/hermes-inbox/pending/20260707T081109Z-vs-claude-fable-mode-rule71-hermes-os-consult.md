# Memo: Rule 71 fable-mode landed + Hermes-OS/second-brain consult review

- **When:** 2026-07-07 (UTC 08:11)
- **Surface:** vs-claude (Fable 5)
- **Type:** decision + new surface + Sean-owed blockers

## What happened

1. **Rule 71 (Fable-Mode Continuity + Model/Effort Routing)** added to CLAUDE.md + AGENTS.md. New skill `.claude/skills/fable-mode/SKILL.md`: Fable's working discipline as a loadable mode (five gates: scope adversarially / evidence first / attack own reasoning / verify before declaring / report calibrated) + a model/effort routing table (orchestrator-smart, executor-cheap). Mandatory for any fallback Final Decider when Fable is unavailable. Provenance guard: fable-mode does NOT elevate Rule 68 tier — sub-Fable output still routes to quarantine, never the learning corpus.
2. **Consult review of the Hermes Agentic OS** shipped: `docs/ai-workflow/AI-HANDOFF/HERMES-OS-SECOND-BRAIN-CONSULT-REVIEW-2026-07-07.md`. Verdict: governance spine is excellent (Slice 1/2a + E1/E2/E3/E4a/E4c shipped, 93/93 tests) but the build loop is PARKED at E4b-final; nothing delivers daily value yet (no command center, no briefing delivery). #1 recommendation: bridge-first — finish E4b-final, then build Slice 3 command center immediately, before E5/E6.
3. **Second brain verified:** the Four-C Router = the ARMS framework (Applications=C2, Routines=C4, Memory=C1, Skills=C3); already built and governed. Top gap: NO deterministic retrieval layer — proposed `brain-query` T0 script (keyword-score the existing indexes, open only the best section; target ≥30% retrieval-token savings).
4. **Drift found:** CLAUDE.md skills tables documented 22 vs 24 real dirs; `seedance-swan-video` dir live though documented as retired; CLAUDE.md still says Hermes runs on the Pi (BLOCKED/SSD) — reality per memory: Hermes brain is LIVE on the desktop 5090 with local Qwen3, Pi retired. Flagged, not fixed (separate doc slice).

## Sean-owed (parked, batched in the consult doc §7)

R2 bucket+object-lock (E4c teeth) · golden-digest 30-second look · Q2 Discord template texts · 2 proposed T2 registry rows · G-17 RESUME second-factor · NEW: yes/no on bridge-first reprioritization, brain-query slice, briefing→Telegram push.

## Why Hermes cares

The consult review names Hermes-OS features that touch Hermes directly (F-4 briefing→Telegram push, F-5 digest→this-inbox bridge, F-6 connection-risk panel). Codex hostile reviews on 5 shipped hermes-os slices are still OPEN in the review queue.
