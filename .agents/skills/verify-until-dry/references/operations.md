# Operations

## Local adoption

`scripts/hooks/verify-until-dry-gate.mjs` defaults to `observe`. It reads the
latest OS-temp receipt and reports missing, stale, tampered, or non-clean proof.
Set `VERIFY_UNTIL_DRY_MODE=enforce` only after protected CI attestation is
implemented and an observe period shows the gate does not wedge legitimate
workflows. Current local receipts are advisory, so enforce mode intentionally
blocks even a locally clean receipt.

Register the hook in the active agent settings only after checking coordination
locks. Never overwrite another live lane's settings edit. Existing transcript
dry-loop hooks remain defense-in-depth; their prose marker is not a substitute
for the hash-bound receipt.

## CI and deep scans

`.github/workflows/verify-until-dry.yml` installs locked dependencies, runs
contract tests, and performs a fenced advisory pass on pull requests, main
pushes, a weekly schedule, and manual dispatch. Once available on `origin/main`,
the base branch's verifier is the authority reviewing candidate code. Bootstrap
runs are explicitly candidate-advisory. Receipts are retained for 14 days.

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
