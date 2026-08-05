<!--
  HERMES INBOX MEMO TEMPLATE
  Copy this file into pending/ named: <UTC-YYYYMMDDThhmmssZ>-<surface>-<kebab-slug>.md
  Keep it SHORT. IDs/roles only — NO client names, PII, secrets, keys, tokens, DB URLs, or
  absolute user paths (this dir is committed and read by an LLM — Rules 8/44/59).
  Secret-scan before commit: bash scripts/scan-secrets.sh <this-file>
-->
---
surface: vs-claude          # vs-claude | vs-codex | tg-claude | tg-codex | local-qwen
utc: 20260706T231500Z       # explicit UTC timestamp you stamp (not a clock helper)
topic: <one line>
tags: [<area-id>, <area-id>]   # e.g. [gallery-print, billing]  — IDs/areas, no PII
---

## What I did / learned
- <bullet — the transferable fact Hermes should carry: a decision, a new surface, a live-state fact>

## Why it matters to Hermes
- <bullet — why Hermes should know this / how it changes what Hermes would say or do>

## State right now
- <bullet — current status, what's live, what's a placeholder, what's next>

## Mistakes I made
<!--
  MANDATORY for substantial work (Sean 2026-08-04): "give a report to Hermes, especially about
  the mistakes that you made so I can learn from them… this should be automatic."
  One line each: what I did wrong -> how it was caught -> the rule that prevents the repeat.
  Include mistakes you caught and fixed YOURSELF mid-task — those are the most useful.
  Include false-success tool output, wrong severity calls, and claims you had to walk back.
  If you repeated a mistake you had already written up before, SAY SO explicitly — highest signal.
  Honest-empty only after a hostile pass genuinely ran dry:
  "## Mistakes I made — none surfaced this task". Never delete the heading.
-->
- <what I got wrong> → caught by <how> → rule: <what prevents the repeat>

## External-model calibration (only if a paid/external model was consulted)
<!-- Kimi / HY3 / Village / Fable: how many findings were REAL vs dead on verification.
     This is how Hermes learns what a model is worth on this task class. -->
- <model>: <N> findings → <R> real, <D> disproven on verification. Verdict: <one line>

## Sean owes / blockers (if any)
- <bullet — anything gated on Sean, or "none">
