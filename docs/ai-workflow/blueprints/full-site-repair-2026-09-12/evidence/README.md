# S17 evidence pack

Everything here backs a specific number in [../S17-docs-link-debt.md](../S17-docs-link-debt.md).
It is committed rather than left in a local scratch directory so that a reviewer
without this machine can re-derive the claims.

## How to re-derive the headline numbers

```powershell
# from the repository root, with the locked dependency installed (`npm ci --ignore-scripts`)

# 1. The pre-repair in-scope baseline: 105 dead links across 28 files
node docs/ai-workflow/blueprints/full-site-repair-2026-09-12/evidence/verify-disputed-numbers.mjs

# 2. The CI-log reconciliation: 105 files / 1870 links / 3740 [x] lines = exactly 2x
#    (needs the parent packet's CI job log; see "What is NOT here" below)
node docs/ai-workflow/blueprints/full-site-repair-2026-09-12/evidence/parse-docs-log.mjs <log> out.json

# 3. The live gate, which is the actual contract
node --test scripts/ci/__tests__/docsLinkScope.test.mjs
node scripts/ci/check-docs-links.mjs            # exits 0 with 1145 in-scope files
```

## The files

### Reproducible tooling (run them; they print what the record claims)

| File | Answers |
|---|---|
| `parse-docs-log.mjs` | Turns a CI job log into a structured dead-link inventory, and reconciles it against the checker's own per-file counts. |
| `probe-log-doubling.mjs` | Proves the log prints each dead link exactly twice per file (the basis for taking the first N). |
| `verify-disputed-numbers.mjs` | Re-derives the anchor/mailto/other split and the excluded-ledger composition. |
| `probe-engine-semantics.mjs` | Shows 3.14.2 validates anchors and `mailto:` domains, with a live control. |
| `probe-anchor-slugs.mjs` | Shows the slug the checker computes for an emoji heading (`-overview`, not `overview`). |
| `github-slug-crosscheck.mjs` | Checks every same-document anchor against **`github-slugger`**, the library GitHub uses, not just against the checker. |
| `probe-path-quoting.mjs` | Proves `git ls-files -z` returns unquoted paths, so non-ASCII filenames still match their exclusion prefix. |
| `probe-flaky-labelling.mjs` | Reproduces the intermittent-link scenario against a local server: the same link must read the same whether or not a real 404 shares its file. |
| `diff-ci-vs-local.mjs` | Diffs a CI receipt against a local one, which is how the vantage-point difference was named. |
| `resolve-internal.mjs` | For each dead internal link, says whether the target moved (repairable) or is gone. |
| `scope-probe.mjs`, `check-scope-completeness.mjs`, `query-inventory.mjs` | Scope partitioning and its completeness. |
| `fix-anchors.mjs`, `verify-anchors.mjs`, `stage-baseline.mjs` | The anchor repair and its independent verification. |
| `fix-placeholder-addresses.mjs` | The `mailto:` placeholder repair. |
| `record-ci-baseline.mjs`, `patch-manifest-freeze.mjs` | The two manifest migrations, with their reasons in the headers. |

### Receipts (data, quoted by the record)

| File | What it is |
|---|---|
| `docs-baseline-inventory.json` | The parsed pre-repair baseline from the CI job log: 105 files, 1870 dead links, per-link detail. |
| `baseline-pristine-in-scope.json` | The pre-repair in-scope baseline measured on a pristine `e07d4b9` checkout: 105 links / 28 files. |
| `anchor-repairs.json` | Every anchor change, plus the machine that produced it and what it could not resolve. |
| `anchor-verification.json` | The independent re-check of those anchors. |
| `placeholder-address-repairs.json` | Every `mailto:` placeholder rendered as inline code. |
| `in-scope-baseline.txt` | The in-scope baseline as text: 17 files under the CI-log measurement. |

### Proof transcripts

| File | Proves |
|---|---|
| `RED-PROOF.md` | The gate's failure and pass behaviour, re-executed against the final gate. |
| `redproof-1-ledger-growth.txt` | A frozen row exceeding its baseline fails the run (exit 1). |
| `redproof-2a-record.txt` / `redproof-2b-enforce-clean.txt` | Recording a baseline, then enforcing it unchanged, passes (exit 0). |
| `redproof-3-planted-break.txt` | A broken link planted in live documentation fails the run, named (exit 1). |
| `PR-BODY.md` | The pull-request description, including the residual limits. |

## What is NOT here

- **The raw CI job log** (`final-main-docs.log`, ~2 MB) and the nine `gate-*.json`
  run dumps (~780 KB each). The log belongs to the parent packet's release
  artifacts and is not in this repository; the run dumps are near-duplicates that
  a single command regenerates. Both are local-only, under
  `tmp/worktrees/docs-link-debt-20260913/.mega-blueprints/artifacts/docs-link-debt-20260913/`.
  The final receipt is also attached to the pull request's CI run as the
  `docs-link-check-receipt` artifact.
- **Anything from another worktree.** This evidence pack is self-contained.

## Limits a reviewer should know

- These receipts were produced on Windows; CI runs Ubuntu. External-host
  reachability differs between them — demonstrated and named in the parent record.
- `baseline-pristine-in-scope.json` was produced with a pre-review revision of the
  gate, and contains at least one transient inflation
  (`repo-sam.inria.fr/.../3d-gaussian-splatting/` is alive today). Both caveats are
  stated in the parent record rather than only here.
