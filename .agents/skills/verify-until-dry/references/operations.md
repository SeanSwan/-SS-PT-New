# Operations

## Local adoption

`scripts/hooks/verify-until-dry-gate.mjs` supports three explicit trust modes:

- `observe` reports missing, stale, tampered, or non-clean proof without blocking.
- `assist` activates for repository writes, recognized write-capable shell/codegen
  commands, commits, or hostile-review turns. It requests at most two corrective
  continuations when the OS-temp receipt is missing, stale, or non-clean, then
  releases to avoid an infinite harness loop. A local clean receipt remains
  `LOCAL_ADVISORY`; a bounded release is not clean evidence.
- `enforce` also requires protected `CI_ATTESTED` provenance and intentionally
  rejects a locally authored clean receipt.

Register `node scripts/hooks/verify-until-dry-gate.mjs --mode assist` in the
active agent settings only after checking coordination locks and obtaining any
required settings approval. The hook canonicalizes nested working directories
to the Git top level before selecting or checking a receipt. Transcript failure
and Git-root failure in assist/observe are fail-open so a broken heuristic cannot
wedge the harness; enforce mode fails closed on unknown root identity. A
two-feedback cap prevents infinite loops without treating the result as clean.
Existing dry-loop hooks remain defense-in-depth; their prose
marker is not a substitute for the hash-bound receipt.

Assist mode may require Kimi K3 through the verifier's risk policy, but the hook
never makes a paid call. It stops with `BLOCKED_AUTHORIZATION` until an exact,
unexpired one-call approval is supplied.

## CI and deep scans

`.github/workflows/verify-until-dry.yml` installs locked dependencies, runs
contract tests, and performs a fenced advisory pass on pull requests, main
pushes, a weekly schedule, and manual dispatch. Once available on `origin/main`,
the base branch's verifier is the authority reviewing candidate code. Bootstrap
runs are explicitly candidate-advisory. Receipts are retained for 14 days.

The secret gate launches `scan-secrets.sh --all` through the Node wrapper so
Windows uses Git Bash rather than WSL Bash. It rejects spawn failures, nonzero
exit, fatal Git output, missing counts, zero scanned files, nonzero hits, or a
missing terminal clean marker. The Bash scanner itself also fails closed when
Git cannot enumerate candidate files.

Use `deep-scan.mjs` for broader scheduled analysis. Declare every required
analyzer before the scan. Missing analyzer evidence is `UNPROVEN`; validated open
findings are `DIRTY`; `COMPLETE` means the declared analyzers completed, not that
the whole repository is perfect.

## Deployment proof

Use the acquisition function in `deploy-proof.mjs` only after push authorization.
The pure builder validates claim shape but cannot emit `PROVEN`. The current
caller-injected collector is explicitly `OBSERVED_ADVISORY`; it is useful for
binding Git, Render, and HTTPS observations but is not an authority boundary.
Evidence must bind the same 40-character commit to remote main and the live
Render deploy, plus a timestamped 2xx health-body hash. Any mismatch is
`UNPROVEN`. A future protected collector must own concrete adapters and an
attestation key before the module may introduce a `PROVEN` status.

Local receipts are `LOCAL_ADVISORY`. Do not relabel them as CI-attested or use
them to bypass branch protection, production approval, or the two-vantage rule.
