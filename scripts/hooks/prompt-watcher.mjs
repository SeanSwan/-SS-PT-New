#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/prompt-watcher.mjs
 * PURPOSE: UserPromptSubmit hook for the prompt-watcher skill (CLAUDE.md rule 66).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Runs on every prompt submit and prints a tiny classifier
 * reminder to stdout, which the harness injects into context. The reminder tells
 * the model to decide SIMPLE vs VISION and only load the (heavier) prompt-watcher
 * skill for VISION prompts — keeping simple prompts token-free.
 *
 * WHY A SCRIPT, NOT INLINE echo: cross-platform (Windows/bash) quoting of a
 * multi-sentence reminder is fragile; Node is guaranteed present in this repo.
 * The reminder is deliberately ~90 tokens — Sean's standing token-economy rule.
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
  'first only for irreversible/outward actions or genuinely ambiguous builds.\n',
);
