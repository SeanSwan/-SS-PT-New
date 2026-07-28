# Opus Kimi Debate Brain

**Status:** RETIRED by Sean on 2026-07-25
**Replacement:** Kimi-only Review Brain
**Spend rule:** dry-run first, explicit approval per paid Kimi run, hard maximum cap `$3`

## Decision

Opus is no longer part of the Swan review workflow. Operator-facing launchers, skills, and MCP configuration must not expose a paid Opus route. The former alternating debate implementation remains only as historical code and receipt context; its provider boundary rejects every Opus call before network access.

This is a retirement, not a deletion. Existing transcripts and prior decisions remain available for audit, but they do not authorize future Opus spending.

## Canonical Kimi-only route

Zero-cost preflight:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ai-workflow/run-kimi-review.ps1 `
  -Document "docs/ai-workflow/AI-HANDOFF/REVIEW-PACKET.md" `
  -CapUsd 3
```

Live Kimi call after explicit approval for that run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/ai-workflow/run-kimi-review.ps1 `
  -Document "docs/ai-workflow/AI-HANDOFF/REVIEW-PACKET.md" `
  -CapUsd 3 `
  -ConfirmSpend
```

## Safety contract

- The default invocation makes zero model calls and does not load the API key.
- `-ConfirmSpend` is required for a live call.
- A conservative worst-case estimate must fit under `-CapUsd` before network access, and `-CapUsd` cannot exceed `$3`.
- Only `moonshotai/kimi-*` model identifiers are accepted; a model override cannot route to Opus.
- Direct PII, API keys, bearer tokens, and JWTs are scrubbed from outbound text.
- `.env`, secret folders, exports, backups, CSV, SQL, SQLite, and database files are blocked as inputs.
- The old `run-opus-kimi-consensus.ps1` is a zero-spend retirement notice.
- The former MCP server is not registered.

## Authority

Kimi provides a hostile review, not automatic builder authority. Repository truth, the Swan Design Brain hierarchy, privacy constraints, and required human gates remain controlling.