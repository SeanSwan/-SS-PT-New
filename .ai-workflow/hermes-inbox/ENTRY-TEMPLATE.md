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

## Sean owes / blockers (if any)
- <bullet — anything gated on Sean, or "none">
