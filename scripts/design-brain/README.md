# Design Brain operator guide

The external-reference lane is hardened and fail-closed. Canonical policy: `docs/ai-workflow/design-brain/external-reference-mcp.md`.

## Allowed now

- `P` Probe: one query/result connector check; writes one coarse overwrite-only `probe.json`.
- Receipt and claim primitives exist, but new receipt writes remain fail-closed until the signed source-classification authority adapter has production keys, trusted time, and revocation state. Automatic corroboration claim mutation is disabled until a signed monotonic lifecycle adapter exists. The stateful `log-receipt`, `synthesize`, `corroborate`, `adjudicate`, and `emit-vault` CLIs are therefore non-operational and refuse durable work until that adapter also supplies signed claim decisions.
- `D` Doctrine only through an explicit Sean canon decision backed by owned Swan trials.

## Refused now

- Inspect mode and legacy H/T/L aliases.
- Production-derived inputs, provider screenshots/media, deep links, source copy, customer data, and untyped/free-text external egress.
- Mobbin source-corpus writes without signed, expiring, revocation-checked X clearance.
- Spec persistence or `design-specs` vault emission.

`S` Spec remains `enabled:false`. Even a future `enabled:true` requires signed activation, trusted time, operational revocation, and the external legal/IAM/network/branch/key-management gates named in the canonical protocol.

## Commands

```powershell
node scripts/design-brain/src/probe.mjs --root C:\approved\design-brain-data --outcome available
node --test scripts/design-brain/tests/*.test.mjs
```

Do not run `attest.mjs`, `redact-provenance.mjs`, or `log-spec.mjs`; they are retirement adapters that fail closed. `emit-vault.mjs` emits accepted `design-claims` only.