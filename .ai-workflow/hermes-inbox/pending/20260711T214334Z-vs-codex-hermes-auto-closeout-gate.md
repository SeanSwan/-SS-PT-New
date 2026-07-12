---
surface: vs-codex
utc: 20260711T214334Z
topic: Automatic Hermes significant-closeout emission gate
tags: [hermes-inbox, hermes-learning-packet, hooks, closeout]
---

## What I did / learned

- Root cause: the durable learning-packet skill was explicitly manual-by-default, while the any-agent inbox had only a session-start reminder. Neither mechanism evaluated the completed turn.
- Added a project Stop hook that classifies substantial closeouts, skips trivial or already-emitted work, and uses the stop-hook-active guard to prevent loops. (Fable live-fire update, same day: the original prompt-type hook blocked 100% of trivial turns — classifier blind to turn content — so it was replaced by the deterministic fail-open command hook `scripts/hooks/hermes-closeout-gate.mjs`.)
- Substantial any-agent work routes to Hermes Inbox. Verified Fable-tier permanent lessons also route to the durable learning corpus; sub-Fable output remains excluded.

## Why it matters to Hermes

- Major implementations, architecture decisions, difficult root causes, deployments, security changes, and final reviewed plans no longer depend only on an agent remembering a convention.

## State right now

- The hook, skill overrides, closeout checklist, contract test, and prior Style Lens OS learning packet are present on an isolated branch. Activation still requires an authorized merge to the production branch.

## Sean owes / blockers

- Merge of branch `codex/hermes-closeout-hook-20260711` to main is Sean-gated; the Stop hook
  stays inactive until that merge lands.
