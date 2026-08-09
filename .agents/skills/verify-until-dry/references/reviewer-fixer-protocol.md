# Reviewer and Fixer Protocol

## Reviewer boundary

Run the reviewer read-only. Redact the packet before dispatch. Include raw
requirements, raw diff, deterministic classification, and raw gate evidence.
Exclude the builder's conclusion, proposed verdict, and impact map on the first
pass. Require the reviewer to derive its own impact map.

Treat every reviewer statement as a hypothesis. Validate it against repository or
runtime truth before opening a finding.

## Kimi K3

Use `scripts/consult-kimi.mjs` through the verify engine adapter. Enforce
`moonshotai/kimi-k3`, 60,000 maximum-output ceiling, the configured hard dollar
cap, redaction, packet hash, zero-call preflight, and no automatic paid retry.

Kimi may recommend fixes but cannot write the code, ledger, closure, or verdict.

## Finding validation

Normalize each signature as `(file, symbol, defect-class)`. Close only through:

1. verifier-executed non-reproduction;
2. repaired behavior with expected fail signature, passing fix, and mutation proof;
3. exact expiring human exemption.

Do not let the code author dismiss a finding by prose.

## Fixer boundary

Run the fixer in a separate worktree pinned to the reviewed snapshot. Give it only
validated findings and relevant source. Enforce path allowlists, maximum files,
maximum net lines, and forbidden actions at the wrapper boundary.

Block commits, pushes, deployments, production mutations, secret expansion,
schema changes, financial actions, and destructive cleanup unless the exact action
is separately authorized. Tier 3 repair always requires human approval.

After any repair, invalidate prior clean rounds and restart from snapshot. The
reviewer that produced a Tier 3 repair finding cannot be its sole confirmation
reviewer.

## Convergence

Escalate on repeated normalized signatures, materially overlapping inverse fixes,
green/red transitions without code changes, or the configured round cap. Never
raise limits in response to oscillation. Produce `ESCALATED`, `BLOCKED`, or
`UNPROVEN`; never convert exhaustion into clean.
