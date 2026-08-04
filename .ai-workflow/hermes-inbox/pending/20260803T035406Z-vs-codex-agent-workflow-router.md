---
surface: vs-codex
utc: 20260803T035406Z
topic: Unified agent workflow router and portable execution skills
tags: [agent-workflow, skill-registry, wayfinder, safety]
---

## What I did / learned
- Audited two external workflow transcripts against current Swan rules and added four portable skills: Wayfinder, goal contract, worktree isolation, and guided setup.
- Independent OpenAI and Kimi reviews exposed cross-skill authority conflicts; repairs now enforce environment preflight before writes, immutable goal acceptance, human-confirmed sensitive setup, canonical decision ownership, and per-session tracker authority.

## Why it matters to Hermes
- Route workspace safety before execution mode. Do not let another skill write before isolation, duplicate decision state, or infer external-write authority.

## State right now
- Deterministic registry and active-consumer contracts pass; AGENTS mirrors CLAUDE mechanically. Production release was explicitly authorized and this memo rides that release commit.

## Sean owes / blockers (if any)
- None for this workflow release. Render CLI auth is expired, so deployment verification uses Git and public-service evidence unless credentials are renewed separately.