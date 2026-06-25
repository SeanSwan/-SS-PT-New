---
brain: swan_coach_cortex
domain: index
review_status: approved
authority: sean_codex_2026_06_24
tags: [swan-coach, obsidian, hermes, workout-generation]
---
# Swan Coach Cortex Brain Vault

This folder is the active, Obsidian-compatible brain for Swan Coach workout generation.
It is intentionally plain Markdown so Sean can edit it in Obsidian, Claude, ChatGPT,
Codex, and later Hermes can ingest the same source without a second knowledge base.

## What This Is

- Human-editable doctrine for Sean Swan's training style.
- NASM-aligned programming rules summarized in SwanStudios language.
- A trainer grill flow for capturing Sean's background, taste, preferences, and decision rules.
- Client-facing privacy and PDF output contracts that future runtime code must follow.

## What This Is Not

- Not the production source of truth for clients, plans, logs, injuries, or medical history.
- Not a place to paste copyrighted NASM text or private client details.
- Not a replacement for database-backed client intelligence, pain checks, movement analysis, workout history, or approval audits.

## Runtime Principle

Production code should treat this vault as a policy and preference layer. Hard gates still come from:

- database client context,
- NASM OPT phase rules,
- safety and pain constraints,
- exercise ontology and Rolodex media fields,
- trainer/admin approval.

## Obsidian View

Open this folder as an Obsidian vault:

```text
docs/ai-workflow/coach-brain
```

Use Graph View to see note relationships. Open [[09-brain-map-diagram]] for the Mermaid system map.
## Validation

Run this contract check after edits:

```bash
node --test scripts/__tests__/coach-brain-contract.test.mjs
```

If Hermes later owns this vault, it must preserve the same files, frontmatter, privacy rules, and PDF contract.
