---
name: opus-kimi-consensus
description: RETIRED compatibility adapter for the former Opus Kimi debate brain. Never calls Opus; routes legacy requests to the cost-gated Kimi-only review workflow.
---

# Opus Kimi Consensus - RETIRED

Sean retired paid Opus review calls on 2026-07-25. The old skill name remains discoverable only to prevent accidental revival.

## Contract

- Do not invoke any Opus model, former consensus tool, historical MCP server, or historical consensus CLI.
- Route review packets to Kimi-only review:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ai-workflow/run-kimi-review.ps1 `
  -Document "<exact review packet>" -CapUsd 3
```

- Preflight is zero-cost. A live Kimi call still requires Sean's explicit approval for that run and `-ConfirmSpend`.
- Keep input exact, sanitized, and free of PII, credentials, exports, and database material.
- Historical debate code and receipts are audit records, not active operator surfaces.