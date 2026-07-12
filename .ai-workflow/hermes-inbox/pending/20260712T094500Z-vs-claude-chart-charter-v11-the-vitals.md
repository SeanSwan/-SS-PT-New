# Hermes memo — Chart Charter v1.1: "Big Three" killed, THE VITALS born
- Surface: vs-claude (Fable 5, lens-vision session)
- UTC: 2026-07-12T09:45:00Z

## What happened
- Sean-directed hostile review of the Smart Lens Chart Charter, grounded
  in full recon of the real chart deck. Amended the ultra prompt to v1.1
  (docs/ai-workflow/brainstorms/smart-lens-os-ultra-prompt-2026-07-12.md,
  main @ 472a7eb28).
- **Doctrine change:** "Big Three" anchor charts REPLACED by **THE
  VITALS** — five goal-aware anchor SLOTS (Consistency / Load /
  Capability / Recovery / Trajectory) + opt-in Body. Two kill reasons any
  agent should remember: (1) "Big Three" collides with squat/bench/
  deadlift gym meaning; (2) fixed chart trios assume one client archetype
  — anchors attach to QUESTIONS, goal profiles pick the chart. Trainer
  re-mapping a client's Vitals = logged coaching prescription.
- **L3 Explain specced:** the expand modal (already built, portal'd,
  full-screen mobile) gets a [Data | Meaning] layer — WHAT (formula
  honesty) / WHY-for-your-goal / what-moves-it / reading bands / coach
  note. Deterministic templates, no LLM. Recon confirmed zero metric
  education exists today.

## Why it matters to Hermes
- Chart/Vitals questions now route to ultra-prompt §5 (v1.1) — the
  canonical answer doc.
- **Transferable facts:** canonical deck = 15 cards, client AND admin
  parity 15/15 (CANONICAL_CHART_IDS); ONE victoryTheme seam
  (chartTheme.ts:66-142) is where any lens/theme bridge lands; Goal +
  GoalMilestone family exists but is consumed by ZERO charts (Trajectory
  card = the only net-new Vitals build).
- **Security/sensitivity finding (Sean-owned Q8):** weightTrend +
  bodyFatTrend client routes are UNGATED with no Gentle-Mode/consent
  logic (clientAnalyticsRoutes.mjs:247,250) and the frontend lock seam
  expects 402s that never come. Doctrine home = Vitals opt-in Body slot;
  the gating flip awaits Sean.
- Post-merge Rule-20 marker sweep (grep working tree for fix markers
  after ANY reconciliation merge) practiced again this turn — it's now
  standing procedure after last night's silent revert.

## State right now
- main @ 472a7eb28 (charter v1.1 + Codex's reconciliation batch merged
  clean; all prior fix markers verified present post-merge).
- Next slice: Golden Pair PR (ultra-prompt §8). Unblocking Sean
  decisions: §16 Q4 (Vitals set), Q6 (naming), Q8 (body-chart gating).

## Sean owes / blockers
- §16 Q4/Q6/Q8 answers; "start Golden Pair" go.
