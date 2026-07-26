# Standalone Opus-First, Kimi-Second Review Protocol

**Status:** ACTIVE by Sean's explicit direction on 2026-07-26
**Replaces:** Coupled Opus/Kimi alternating debate and the temporary Kimi-only route
**Spend rule:** Two independent dry-run gates, explicit approval per paid call, hard maximum `$3` per call

## Decision

Opus and Kimi no longer debate each other. Claude Opus 5 performs an independent first-pass review of one exact sanitized packet. Its completed artifact is frozen and stamped with the packet SHA-256. Kimi K3 then reviews both the same original packet and that frozen Opus artifact.

The second model must not silently inherit Opus's conclusions. Kimi's remit is to verify, dispute, extend, or correct them. Repository truth and Swan governance determine the final synthesis.

## Stage 1: standalone Opus

Zero-cost preflight:

```powershell
& ".\scripts\ai-workflow\run-opus-review.ps1" `
  -Document "C:\tmp\swan-review-packet.md" `
  -Out "C:\tmp\swan-opus-review.md" `
  -CapUsd 3
```

Live call only after approval of that exact preflight:

```powershell
& ".\scripts\ai-workflow\run-opus-review.ps1" `
  -Document "C:\tmp\swan-review-packet.md" `
  -Out "C:\tmp\swan-opus-review.md" `
  -CapUsd 3 `
  -ConfirmSpend
```

## Stage 2: Kimi reviews Opus plus the original

Zero-cost preflight:

```powershell
& ".\scripts\ai-workflow\run-kimi-after-opus.ps1" `
  -Document "C:\tmp\swan-review-packet.md" `
  -OpusReview "C:\tmp\swan-opus-review.md" `
  -Out "C:\tmp\swan-kimi-review.md" `
  -CapUsd 3
```

Live call only after a second approval:

```powershell
& ".\scripts\ai-workflow\run-kimi-after-opus.ps1" `
  -Document "C:\tmp\swan-review-packet.md" `
  -OpusReview "C:\tmp\swan-opus-review.md" `
  -Out "C:\tmp\swan-kimi-review.md" `
  -CapUsd 3 `
  -ConfirmSpend
```

## Fail-closed guarantees

- Dry-run is the default; no API key is loaded before spend confirmation.
- Secret-bearing paths, exports, databases, keys, and oversized sources are rejected.
- Inline email, phone, API-key, bearer-token, JWT, and private-key patterns are redacted.
- Opus is pinned to `anthropic/claude-opus-5`; Kimi is pinned to `moonshotai/kimi-k3`.
- The Kimi stage requires an Opus artifact whose embedded document SHA-256 matches the current original packet.
- Changing the original packet after Opus completes invalidates the handoff and requires a new Opus review.
- Standalone Opus deep reviews default to a 40,000-token output ceiling; a length finish or full-ceiling response is rejected as truncated.
- Each call estimates worst-case cost conservatively and stops before network access if it exceeds its cap.
- OpenRouter routing requests zero-data-retention providers with data collection denied.

## Authority

Both reviews are advisory. They cannot override client privacy boundaries, NASM/pain safety policy, deterministic validators, required trainer approval, repository evidence, or Sean's final product decision.
