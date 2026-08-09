---
name: verify-until-dry
description: Run evidence-bound risk classification, deterministic verification, hostile review, Kimi K3 complexity escalation, bounded repair, and two-vantage dry-loop proof. Use whenever an agent creates or changes runtime code, tests, configuration, CI, infrastructure, schemas, auth, payments, PII handling, or when Sean asks for hostile review, code perfection, recursive fixes, proof before completion, or review until no issues remain.
---

# Verify Until Dry

## Core contract

Never issue an unrestricted clean claim. Request the verdict from the canonical
engine. Accept only `DIRTY`, `UNPROVEN`, `BLOCKED`, `ESCALATED`, or
`CLEAN_IN_PROVEN_SCOPE`.

Treat the agent, reviewer, and fixer as untrusted workflow roles. Treat current
repository/runtime evidence as authoritative. A green test or model approval is
one evidence item, never the verdict.

## Workflow

1. Re-read coordination lanes and locate the exact repo, branch, worktree, and
   baseline. Use an isolated worktree when the shared checkout is dirty or owned.
2. Declare the scope contract and acceptance IDs. Do not narrow them after review.
3. Run `node scripts/verify-until-dry/cli.mjs run` from the target repository.
   Let deterministic rules establish the minimum risk tier; only raise it.
4. Execute the selected gates against the fenced snapshot. Record outputs in the
   hash-chained local ledger; never hand-author pass events.
5. Dispatch a read-only hostile reviewer when the policy requires it. Give the
   reviewer raw requirements, diff, and redacted gate evidence—not the builder's
   conclusion or impact map.
6. Escalate to Kimi K3 when deterministic complexity triggers fire: Tier 3,
   oscillation, repeated high-severity findings, multi-surface change, or an
   insufficient independent proof path. Build and redact the packet automatically.
   Respect the configured privacy and spend authorization. If live dispatch is
   required but not authorized, return `BLOCKED`; never silently skip it.
7. Validate each finding through deterministic reproduction. Feed only validated
   findings to a separate bounded fixer in an allowlisted worktree.
8. Require fail-before/pass-after proof for fixes and fix-mutation proof for Tier
   2+ bug fixes. Reject tests that fail for the wrong reason or pass before repair.
9. Restart from snapshot after any relevant edit. Run hostile rounds until one is
   clean, then run a meaningfully distinct confirmation round on unchanged code.
10. Ask the engine for the verdict. Push or deploy only when the exact release
    scope is proven and Sean's production authorization is present.

## Kimi K3 escalation

Use the repository's existing Kimi-only launcher. Do not duplicate provider HTTP
or secret loading. The engine may choose Kimi, prepare the packet, and run a
zero-call preflight automatically. A live call must follow the configured mode:

- `exact-run`: require the operator's approval for the packet hash and cap.
- `standing`: dispatch only within the committed per-call and per-run caps.
- `disabled`: record `BLOCKED` when policy requires Kimi.

Never retry a paid Kimi call automatically. Treat Kimi output as findings to
validate, not authoritative truth. Never send secrets, PII, exports, database
material, precise home locations, or raw production evidence.

## Evidence and dry-loop rules

- Invalidate evidence after code, test, config, lockfile, schema, verifier, or
  scope-contract drift.
- Count a hostile round only when it gathers new evidence. Re-reading or rerunning
  the same command is not a new vantage.
- Require two final clean rounds differing on at least two recorded vantage axes.
- Close findings only by verified non-reproduction, biting regression repair, or
  exact expiring human exemption.
- Convert time, round, call, or cost exhaustion to a non-clean verdict.
- Keep local evidence labeled `LOCAL_ADVISORY`; only CI may label evidence
  `CI_ATTESTED`.

## References

- Read [verdict-contract.md](references/verdict-contract.md) before changing
  verdict, ledger, invalidation, or exemption logic.
- Read [risk-and-proof-matrix.md](references/risk-and-proof-matrix.md) before
  classifying a change or registering gates.
- Read [reviewer-fixer-protocol.md](references/reviewer-fixer-protocol.md) before
  dispatching Kimi/reviewers or applying findings.
