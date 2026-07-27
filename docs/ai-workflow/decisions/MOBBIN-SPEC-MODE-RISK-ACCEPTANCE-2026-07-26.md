# Mobbin Spec Mode - Hardened Risk Decision

- **Date:** 2026-07-26
- **Decision owner:** Sean
- **Terms baseline reviewed:** Mobbin Terms effective May 16, 2026 (`2026-05-16`)
- **Decision:** retain the implementation work but keep Spec mode disabled after independent Opus and Kimi review; the completed Kimi review is the release gate under Sean's 2026-07-26 policy amendment

## Superseding decision

The original ADOPT-WITH-GATES draft retained more activity and provenance detail than necessary. This revision adopts the reviewers' stricter boundary. Inspect and the H/T/L aliases are retired rather than mapped. Probe is an overwrite-only availability heartbeat. There is no durable Mobbin-informed Spec writer or `design-specs` collection.

This implementation decision is not written Mobbin permission, legal advice, legal clearance, or permission to activate Spec or Source-corpus mode.

## Controls

- Runtime modes are P/S/D/X; `I`, `H`, `T`, and `L` fail with `E_LEGACY_MODE_REFUSED`.
- New source classes are `owned-synthetic`, `synthetic`, `licensed`, and `mobbin`; production-derived input is forbidden.
- Probe stores no query, result, product, identifier, timestamp, or research detail.
- Spec stays `enabled:false`; an enabled boolean alone cannot activate it.
- Future activation requires signed, expiring, revocable owner authority checked with trusted time.
- Safety-critical SDIRs require blocking health states, qualified review, and reject prescriptive numbers.
- External model egress permits only typed Class 0 fields; all other classes and free text are denied.
- Denial receipts contain only day, code, and operation.
- Mobbin cannot affect novelty, corroboration, or doctrine.

## External gates still open

Written clarification from Mobbin; qualified legal review; explicit Sean risk acceptance; protected branch and CODEOWNERS enforcement; sole-path network enforcement; production IAM; KMS/hardware-backed keys; trusted time; and revocation operations.

## Reversal

Keep `enabled:false`. No spec corpus exists to delete. Accepted owned evidence and doctrine remain separate and are not changed by this decision.