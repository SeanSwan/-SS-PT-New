# SwanStudios Kimi K3 Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/MCP-LIFECYCLE-HYGIENE-KIMI-FINAL-PACKET-2026-08-09.md
**Seed:** (none)
**Tokens:** 2724 in / 5637 out · **Cost:** ~$0.0927 · **Wall:** 85.0s

---

APPROVE

Scope: this approves only the bound audit-only snapshot for commit/push to the named feature branch. It does not approve future enforcement, main promotion, release, or any post-call implementation change.

## Blocking findings

None. No P0/P1 material defect is established against the described audit-only revision.

The decisive safety property is that process mutation is not merely “disabled by configuration” but is described as unreachable through two independent code gates: the wrapper accepts only `-Mode audit`, and the runtime exports `ENFORCEMENT_ENABLED = false` while the release predicate requires true. If those gates match the hashed files, forged hook JSON, forged confirmation, forged coordinator state, or direct manual invocation cannot cross into termination.

## Non-blocking residual risks

### P2 — Committed hook may be Windows-shaped while repo consumers may be POSIX
- Event sequence: collaborator opens the project on macOS/Linux → committed `.claude/settings.json` still points at the project-root-qualified PowerShell wrapper → `pwsh`/wrapper path is absent or unsupported → SessionStart/SessionEnd hook errors or times out → no unsafe mutation occurs, but the operator sees noise and the “POSIX audit-only” claim depends on wrapper self-gating rather than settings gating.
- At-risk invariant: lifecycle hooks must fail safe and must not harm or surprise another active task.
- Affected contract: Current Trailhead / `.claude/settings.json` / disclosed POSIX limit.
- Smallest safe correction: make the installed hook command explicitly self-gating: exit `0` with fixed-schema `mode=audit, skipped=unsupported-host` when not Windows or when the wrapper/runtime is unavailable; add a negative POSIX hook test.

### P2 — Wall-clock expiry can extend ambiguity under clock rollback
- Event sequence: SessionStart publishes pending claim with wall-clock publication/expiry → host clock rolls backward → expiry is not reached when expected → same-owner pending claim remains live longer than the hook budget → later same-owner root claim is blocked as ambiguous until wall time catches up.
- At-risk invariant: monotonic budgets must dominate hook timeouts; audit state must not become silently clean or silently permanent.
- Affected contract: Concurrency and Crash Contract / pending claims.
- Smallest safe correction: persist a monotonic deadline alongside wall-clock display fields; expire/quarantine on monotonic deadline capped by hook timeout, and add a clock-rollback regression.

### P3 — 256-identity tombstone/evidence caps can under-report history on overflow
- Event sequence: one exact owner generation accumulates more than 256 exact root identities → coalescing/rotation drops oldest validated inactive identities → later PID/creation reuse is not linkable to the dropped tombstone evidence → audit remains safe for mutation but under-reports historical ambiguity.
- At-risk invariant: bounded state must never rotate active authority silently and must not convert overflow into false-clean evidence.
- Affected contract: Persistent State Contract / tombstones and rotation.
- Smallest safe correction: on cap overflow set an explicit `overflowed=true` generation marker and make status/doctor report ambiguity rather than complete history; add overflow tests.

### P3 — `@playwright/mcp@latest` grammar is intentionally mutable
- Event sequence: package/client upgrade changes wrapper/child grammar → exact-shape classifier no longer recognizes a previously managed tree → shape becomes unknown → audit-only branch correctly refuses management, but docs could be misread as continuing coverage.
- At-risk invariant: unknown shapes must remain unmanaged; metadata must not overclaim.
- Affected contract: Process Ownership Contract / Disclosed Limits.
- Smallest safe correction: include grammar-version/count-only drift evidence in status and keep the disclosed limit adjacent to the managed-shape claim.

## Required hostile-attack disposition

1. Mechanical audit seal under direct/forged invocation: holds for this revision if the hashed code matches the description; wrapper mode allowlist plus `ENFORCEMENT_ENABLED=false` plus true-required release predicate are independent gates.
2. Mutex ordering under two owners/sessions: global-first ordering serializes cross-worktree mutation; exact-owner lifecycle/startup ordering is consistent for SessionEnd/KEEP, and SessionStart publish releases before registration rather than holding startup while acquiring lifecycle.
3. Pending/tombstone ABA/corruption/overflow/crash: nonce + holder PID/creation + expiry + dead-holder quarantine is adequate for audit; overflow remains P3 evidence-completeness risk, not mutation authority.
4. PID/PPID reuse, missing creation time, temporal ancestry, new descendants: PID+creation identity, temporal ancestry checks, and refusal on unknown/new invalid descendants are the correct fail-closed posture.
5. Same-owner cross-worktree/resumed-session ownership: host-global namespace plus same-owner pending/lease/tombstone blocking is conservative and appropriate for audit.
6. Journal/evidence rotation, malformed retained state, false-clean receipts: “malformed sibling is ambiguity, never absence,” pre-append validation, sanitized fixed-schema output, and no silent active-state rotation are the right invariants.
7. Timeout/clock rollback/coordinator death: Job Object kill-on-close before stdin and asynchronous drain limit blast radius; clock rollback remains P2 availability/ambiguity risk.
8. Metadata/docs versus installed branch: the docs repeatedly and correctly state audit-only, Windows-specific Claude proof, no Codex auto-cleanup, no config/auth removal, and no token reclamation by killing idle processes.
9. Test-delta laundering/omitted negatives: claimed evidence is strong, but repository tests and owner approval remain authoritative; the P2/P3 items above are the negative cases I would still require before any future enforcement gate.
10. Commit/push operator risk: acceptable for a feature branch because the slice is inert on `main`, audit-only, non-terminating, non-config-mutating, and sanitized.

## Explicit answers

- Is this exact audit-only snapshot acceptable to commit and push to a feature branch? **Yes**, provided the manifest/hashes match and no implementation changes occur after this call.
- Is enforcement still mechanically unreachable? **Yes for this bound revision**: forged mode/confirmation/coordinator input cannot satisfy the described code gates. Any change to those gates invalidates this verdict.
- Are Claude/Codex limits and context/token claims honest? **Yes**: idle MCP processes consume machine resources but do not continuously spend model tokens merely by existing; stopping them cannot reclaim already-loaded context; a skill is not a daemon; Codex automatic cleanup is correctly not implemented.
- Does any finding invalidate the combined snapshot hash gate? **No.** The residual findings do not invalidate the gate. Only a hash mismatch, omitted/extra implementation file, or any post-call implementation change invalidates it and requires a new owner-approved review.
