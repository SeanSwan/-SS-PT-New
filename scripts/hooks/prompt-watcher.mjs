#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/prompt-watcher.mjs
 * PURPOSE: UserPromptSubmit hook — prompt-watcher classifier (rule 66) + fusion-router
 *          tier nudge (CLAUDE.md "AI Collaboration — Fusion Tiers").
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11 | UPDATED: 2026-06-16 (fusion-router nudge)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Runs on every prompt submit and prints a tiny reminder to
 * stdout, which the harness injects into context. It does two things: (1) decide
 * SIMPLE vs VISION and only load the (heavier) prompt-watcher skill for VISION
 * prompts; (2) pick the AI-collaboration tier (fusion-router) — triangle review for
 * substantial work, the paid Village (ask-first) for high-stakes, nothing for trivial.
 * The model decides whether a review is warranted — not gated on every keystroke.
 *
 * WHY A SCRIPT, NOT INLINE echo: cross-platform (Windows/bash) quoting of a
 * multi-sentence reminder is fragile; Node is guaranteed present in this repo.
 * The reminder is deliberately compact (~150 tokens) — Sean's standing token-economy rule.
 *
 * SAFETY: read-only, deterministic, no args consumed, no env read, no secrets.
 * Prints one fixed string and exits 0. Never blocks the prompt.
 */

process.stdout.write(
  '[prompt-watcher] Classify the user message: SIMPLE (instruction/question/' +
  'correction/status/"go" — respond normally, do NOT load the skill) vs VISION ' +
  '(an idea being brought into reality). Only if VISION: load ' +
  '.claude/skills/prompt-watcher and run it — gap-check against the in-context ' +
  'vision, add amplifying features, silently rewrite into a sharper prompt, then ' +
  'ACT on that enhanced prompt automatically (no confirmation; reveal it only if ' +
  'Sean asks). Token rule: do NOT reload CLAUDE.md/AGENTS.md; open a specific doc ' +
  'only if a real gap check needs it. Bias to SIMPLE when unsure. Still surface ' +
  'first only for irreversible/outward actions or genuinely ambiguous builds. ' +
  '[fusion-router] Also pick the AI-collaboration tier for this work: trivial/' +
  'mechanical → just do it (no fusion); substantial (architecture, plan, risky ' +
  'refactor, hard bug, "is this right") → TRIANGLE fusion (Claude+Codex+Gemini) ' +
  'as the default review; high-stakes (auth/billing/Stripe/multi-tenant/minors/' +
  'legal/irreversible migration) → propose the PAID Village and ASK first ' +
  '(Rule 16, spend-gated). The model decides whether a review is warranted; skip ' +
  'on trivial/conversational turns.\n',
);
