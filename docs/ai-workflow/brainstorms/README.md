# Brainstorms — Grill-Me Knowledge Capture

This folder holds the durable knowledge-capture docs produced by the **`grill-me`** skill (`.claude/skills/grill-me/SKILL.md`, CLAUDE.md Rule 64).

## What lives here
One markdown file per grill session, named `<kebab-topic>-<YYYY-MM-DD>.md`. Each file captures Sean's taste, reasoning, and decisions for a component, page, feature, redesign, or system — extracted one question at a time and checkpointed after every answer so nothing is lost to context-window drift.

## Why it's here and not at repo root
The original "grill me" skill writes to a `brainstorms/` folder at project root. SwanStudios Rule 35 (root minimalism) keeps the repo root lean, so these docs live under `docs/ai-workflow/` instead. This is the only deliberate deviation from the upstream skill.

## How to use
- Start a grill: say "grill me about <topic>" or invoke `/grill-me`.
- Re-grill later: "grill me again on <topic>, here's what's new" — the skill reads the existing doc and grills only the deltas.
- These docs feed `swan-orchestrator` → recursive planning (Rule 15) → `swan-design-router` (if UI).

## Privacy
These docs are committed to the repo. Per Rule 8, never write real client names, medical/immigration/PII, or secrets here — use IDs and roles.
