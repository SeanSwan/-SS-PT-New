# Code Perfectionist — Build Specification

## Goal

Create an always-available `verify-until-dry` skill that reduces false-clean AI
claims. It cannot prove universal perfection. It can prove a named scope against
a named evidence set and must say `UNPROVEN`, `BLOCKED`, `DIRTY`, or `ESCALATED`
when that proof is incomplete.

## Trust boundary

The deterministic engine owns verdicts. Builders, hostile reviewers, Kimi K3,
and fixers supply evidence or hypotheses only. Evidence binds HEAD, staged,
unstaged, untracked, checkout/runtime identity, resolved base tip and merge-base,
scope, gate output, and completed review output through SHA-256.
Every source or scope change invalidates prior completion evidence.
The scope contract is mandatory and must contain a non-empty objective,
requirements, and acceptance IDs; an omitted contract fails closed.

## Risk and gates

- Tier 0: documentation and narrow non-runtime material.
- Tier 1: tests and low-risk tools.
- Tier 2: runtime behavior.
- Tier 3: verifier, CI, dependencies, auth, payments, schemas, migrations,
  infrastructure, PII, destructive logic, or test weakening.

Agents may raise but never lower the deterministic floor. Gates run shell-free in
a disposable worktree reconstructed from the exact index, working tree, and
untracked bytes. A failed current gate is `DIRTY`; missing or stale evidence is
`UNPROVEN`.

## Hostile review and Kimi K3

Review jobs are independent and read-only. First-pass packets exclude builder
conclusions, redact credentials/PII shapes, bind their packet hash, and preserve
the original evidence manifest.

Kimi K3 is exactly `moonshotai/kimi-k3`—not GPT-3. Tier 3, oscillation, repeated
high findings, or high complexity requires Kimi. The engine automatically builds
the packet and zero-call preflight. A live call requires an unexpired
model/packet/source/scope/nonce/cap approval, uses at most a 60,000 output-token
ceiling (reduced automatically to stay under the hard dollar cap), consumes the
nonce, and never auto-retries.
The repository's design-provider sensitivity ceiling remains binding; sensitive
auth, billing, migration, PII, or secret evidence blocks Kimi rather than leaking.

## Repair and convergence

Only validated findings reach a separate fixer. The wrapper enforces identity
separation, path allowlists, file/line budgets, no test deletion, and exact Tier 3
owner approval. Bug fixes need the identical regression test to fail before and
pass after a changed source hash.

Dry requires two consecutive clean reviews over unchanged code, with at least two
different vantage axes. Repeated findings, inverse repairs, or exhausted rounds
escalate; limits never expand to manufacture convergence.

## Automation and release

The CLI supports audit, fenced run, exact-approved Kimi dispatch, finalization,
and receipt verification. The local stop hook is activation-ready in assist mode and refuses
to treat local advisory receipts as protected attestations. CI runs on
pull requests, main, schedule, and manual dispatch. Deep scans cannot complete
with missing analyzers. Advisory release evidence binds remote main, Render's
live deploy, and a timestamped health hash to one exact commit. Caller-injected
observers cannot emit protected `PROVEN` evidence.
