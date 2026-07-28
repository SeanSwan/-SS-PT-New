---
name: opus-kimi-debate-brain
description: Retirement adapter for the former Opus Kimi debate brain. Use when Sean mentions that legacy name; never call Opus, and route review work to the cost-gated Kimi-only path.
---

# Opus Kimi Debate Brain - RETIRED

Sean retired paid Opus review calls on 2026-07-25. This adapter exists only so the old phrase fails safely and routes to Kimi-only review.

## Binding workflow

1. Never invoke any Opus model, former consensus tool, or historical consensus CLI.
2. Use the canonical Kimi-only launcher for review work:

```powershell
& ".\scripts\ai-workflow\run-kimi-review.ps1" `
  -Document "<exact review packet>" `
  -CapUsd 3
```

3. The first call is a zero-cost preflight. Report the bounded source, model, worst-case estimate, and hard cap.
4. Add `-ConfirmSpend` only after Sean explicitly approves that specific Kimi run.
5. Treat Kimi output as hostile-review advice. Repository truth, privacy rules, and Swan governance remain binding.
6. Preserve historical Opus/Kimi artifacts for audit; do not revive their paid execution path.