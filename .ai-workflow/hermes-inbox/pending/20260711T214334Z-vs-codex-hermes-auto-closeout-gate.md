---
surface: vs-codex
utc: 20260711T214334Z
topic: Automatic Hermes significant-closeout emission gate
tags: [hermes-inbox, hermes-learning-packet, hooks, closeout]
---

## What I did / learned

- Root cause: the durable learning-packet skill was explicitly manual-by-default, while the any-agent inbox had only a session-start reminder. Neither mechanism evaluated the completed turn.
- Added a project Stop prompt hook that classifies substantial closeouts, skips trivial or already-emitted work, and uses the stop-hook-active guard to prevent loops.
- Substantial any-agent work routes to Hermes Inbox. Verified Fable-tier permanent lessons also route to the durable learning corpus; sub-Fable output remains excluded.

## Why it matters to Hermes

- Major implementations, architecture decisions, difficult root causes, deployments, security changes, and final reviewed plans no longer depend only on an agent remembering a convention.

## State right now

- The hook, skill overrides, closeout checklist, contract test, and prior Style Lens OS learning packet are present on an isolated branch. Activation still requires an authorized merge to the production branch.

## Sean owes / blockers
