---
name: opus-kimi-debate-brain
description: Run Sean's sequential standalone Opus-first, Kimi-second review protocol with separate cost approvals and a frozen artifact handoff.
---

# Standalone Opus First, Kimi Second

This protocol replaces the former coupled Opus/Kimi debate. The models do not alternate and do not seek consensus.

## Binding workflow

1. Prepare one exact, bounded, sanitized review packet. Client records, PII, health media, credentials, exports, databases, and secret-bearing files are forbidden.
2. Run the standalone Opus preflight:

```powershell
& ".\scripts\ai-workflow\run-opus-review.ps1" `
  -Document "<exact review packet>" `
  -CapUsd 3
```

3. Report the pinned model, document SHA-256, worst-case estimate, and hard cap. Add `-ConfirmSpend` only after Sean approves that exact Opus run.
4. Preserve the completed Opus artifact without editing it. Its header binds it to the original packet SHA-256.
5. Run the Kimi second-pass preflight:

```powershell
& ".\scripts\ai-workflow\run-kimi-after-opus.ps1" `
  -Document "<same exact review packet>" `
  -OpusReview "<completed Opus artifact>" `
  -CapUsd 3
```

6. The Kimi runner must fail closed if the Opus artifact is absent or its document hash does not match.
7. Report Kimi's model, estimate, and cap. Add `-ConfirmSpend` only after Sean separately approves that exact Kimi run.
8. Present Opus and Kimi findings separately, then produce a repository-grounded synthesis. Neither model is an automatic commit gate.

## Safety contrac

- `anthropic/claude-opus-5` is pinned for the first pass.
- `moonshotai/kimi-k3` is pinned for the second pass.
- Every default invocation makes zero model calls.
- Each paid call needs its own explicit approval and has a hard maximum `$3` cap.
- The Kimi request contains the original sanitized packet plus the frozen Opus review—nothing else.
- External outputs are hostile-review advice. Swan privacy rules, NASM safety controls, repository truth, trainer gates, and human authority remain binding.
