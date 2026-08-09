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
2. Declare the objective, requirements, and acceptance IDs in a scope-contract
   JSON file. Pass it with `--contract`; do not narrow it after review.
3. Run `node scripts/verify-until-dry/cli.mjs run --mode observe --contract
   <scope.json>` from the target repository.
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

## Commands

- `node scripts/verify-until-dry/cli.mjs audit [--base <ref>] --contract <json>` performs a
  zero-call inventory, risk classification, and Kimi K3 spend preflight.
- `node scripts/verify-until-dry/cli.mjs run [--mode observe|enforce] [--base
  <ref>] --contract <json> [--kimi-receipt <json>] [--out <receipt>]`
  runs deterministic gates in an exact disposable fence. Passing gates alone
  remain `UNPROVEN`; a required unpaid Kimi review remains `BLOCKED`.
- `node scripts/verify-until-dry/cli.mjs kimi --base <ref> --contract <json>
  --approval <json> --out <kimi-receipt>` makes exactly one approved Kimi K3
  call and persists its source/scope/packet-bound output.
- `node scripts/verify-until-dry/cli.mjs record-review --receipt <json> --input
  <captured-output> --reviewer <id> --axes <comma-list> --out <review-set>`
  binds a captured independent review to the receipt. Add `--reviews <existing>`
  to append another review and `--findings <json-array>` when findings exist.
- `node scripts/verify-until-dry/cli.mjs finalize --receipt <json> --reviews
  <json>` imports independent review rounds and recomputes the verdict.
- `node scripts/verify-until-dry/cli.mjs verify --receipt <json>` verifies the
  receipt hash, ledger, and claimed verdict.

## Kimi K3 escalation

Use the repository's existing Kimi-only launcher. Do not duplicate provider HTTP
or secret loading. The engine may choose Kimi, prepare the packet, and run a
zero-call preflight automatically. A live call must follow the configured mode:

- `exact-run`: require an unexpired operator approval bound to model, packet,
  source, scope, nonce, and cap. A consumed nonce cannot be replayed locally.
- `standing`: dispatch only within an unexpired scoped grant, call number, and
  committed per-call/per-run caps.
- `disabled`: record `BLOCKED` when policy requires Kimi.

Kimi K3 is `moonshotai/kimi-k3`; it is not GPT-3. Never retry a paid Kimi call
automatically. Treat Kimi output as findings to
validate, not authoritative truth. Never send secrets, PII, exports, database
material, precise home locations, or raw production evidence.

Repository policy keeps Kimi at the design-provider sensitivity ceiling. Pure,
sanitized logic can be reviewed; auth, billing, migration, PII, security-secret,
or other ceiling-breaking evidence must return `BLOCKED_CEILING`. There is no
runtime override.

## Evidence and dry-loop rules

- Invalidate evidence after code, test, config, lockfile, schema, verifier, or
  scope-contract drift.
- Count a hostile round only when it gathers new evidence. Re-reading or rerunning
  the same command is not a new vantage.
- Require two final clean rounds differing on at least two recorded vantage axes.
- Close findings only by verified non-reproduction, biting regression repair, or
  exact expiring human exemption.
- Convert time, round, call, or cost exhaustion to a non-clean verdict.
- Keep local evidence labeled `LOCAL_ADVISORY`. The enforce hook never accepts
  it as protected evidence; a future protected CI signer must mint
  `CI_ATTESTED` rather than trusting caller text.

## References

- Read [verdict-contract.md](references/verdict-contract.md) before changing
  verdict, ledger, invalidation, or exemption logic.
- Read [risk-and-proof-matrix.md](references/risk-and-proof-matrix.md) before
  classifying a change or registering gates.
- Read [reviewer-fixer-protocol.md](references/reviewer-fixer-protocol.md) before
  dispatching Kimi/reviewers or applying findings.
- Read [operations.md](references/operations.md) before enabling the hook,
  scheduled deep scans, CI enforcement, or deployment proof.
