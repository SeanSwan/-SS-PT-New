# Operations

## Local adoption

`scripts/hooks/verify-until-dry-gate.mjs` defaults to `observe`. It reads the
latest OS-temp receipt and reports missing, stale, tampered, or non-clean proof.
Set `VERIFY_UNTIL_DRY_MODE=enforce` only after an observe period shows the gate
does not wedge legitimate workflows. Enforce mode fails closed.

Register the hook in the active agent settings only after checking coordination
locks. Never overwrite another live lane's settings edit. Existing transcript
dry-loop hooks remain defense-in-depth; their prose marker is not a substitute
for the hash-bound receipt.

## CI and deep scans

`.github/workflows/verify-until-dry.yml` runs contract tests plus a fenced observe
pass on pull requests, main pushes, a weekly schedule, and manual dispatch. The
receipt is retained for 14 days. Promotion from observe to enforcement is an
owner-controlled policy change.

Use `deep-scan.mjs` for broader scheduled analysis. Declare every required
analyzer before the scan. Missing analyzer evidence is `UNPROVEN`; validated open
findings are `DIRTY`; `COMPLETE` means the declared analyzers completed, not that
the whole repository is perfect.

## Deployment proof

Use `deploy-proof.mjs` only after push authorization. Evidence must bind the same
40-character commit to remote main and the live Render deploy, plus a timestamped
2xx health-body hash. Any mismatch is `UNPROVEN`.

Local receipts are `LOCAL_ADVISORY`. Do not relabel them as CI-attested or use
them to bypass branch protection, production approval, or the two-vantage rule.
