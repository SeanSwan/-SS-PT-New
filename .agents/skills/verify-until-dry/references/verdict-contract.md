# Verdict Contract

## Authority

Only `scripts/verify-until-dry/verdict.mjs` computes a verdict. An agent may
explain the result but cannot replace it. The function must remain pure and
versioned; changes to it are Tier 3.

## Verdicts

| Verdict | Required meaning |
|---|---|
| `DIRTY` | At least one validated finding remains open. |
| `UNPROVEN` | Required evidence is missing, stale, untrusted, or insufficient. |
| `BLOCKED` | Authorization, environment, dependency, or budget prevents progress. |
| `ESCALATED` | Repair oscillates or verifier/reviewer integrity is uncertain. |
| `CLEAN_IN_PROVEN_SCOPE` | Every gate and closure rule passed for the exact scope. |

Never expose `PASS`, `APPROVE`, `PERFECT`, `100% CLEAN`, or `NO BUGS` as engine
verdicts.

## Clean preconditions

Require all of:

1. A valid, ordered evidence chain.
2. An unchanged head/source hash and scope-contract hash.
3. Every risk-mandated gate is re-derived from trusted tier/surface policy,
   ledger-bound, current, and passing.
4. No open validated finding.
5. Every closed repair carrying the required regression proof.
6. The final two chronological completed reviews are output-bound, independently
   named, clean on identical code/scope/packet, and differ on at least two axes.
7. Required reviewer diversity and approvals for the risk tier.
8. No blocker, escalation, expired exemption, or unexpired deep-scan intersection.

## Finding closure

Allow exactly:

- `CLOSED_NONREPRO`: the verifier ran the supplied reproduction and it did not
  demonstrate the finding's normalized, visible canonical failure signature.
- `CLOSED_FIXED`: fail-before matches that same canonical signature, pass-after succeeds,
  and required mutation proof succeeds.
- `EXEMPTED`: named human identity, exact diff/scope hash, rationale, expiry,
  and protected approval attestation. A local advisory owner-exemption marker
  remains `UNPROVEN`.

The authoring agent, fixer, and originating reviewer cannot directly write closure
events.

## Invalidation

Invalidate relevant evidence after changes to source, tests, configuration,
dependency locks, schema/migrations, environment contract, verifier/config/gate
registry, scope contract, or approval/exemption expiry.

Local ledgers are tamper-evident and `LOCAL_ADVISORY`, not locally trusted
security attestations. Caller-supplied provenance is overwritten. Protected CI
attestation is a separate future signing boundary; until then enforce mode must
not accept local receipts.
