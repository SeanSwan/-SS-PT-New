# coach-completion-tools — the C0 tooling

Sixteen scripts that **build** the C0 evidence and **measure** the claims in it. They were moved here
from `tmp/` (see "R7-13" below).

**Run every tool from the WORKTREE ROOT:**

```
node scripts/coach-completion-tools/c0-build-candidate-manifest.mjs
node scripts/coach-completion-tools/r702-mutation-probe.mjs
```

## Why these are not in `tmp/` any more (R7-13)

`.gitignore:146` ignores `tmp/`. All sixteen lived there, so **none of them could be committed** —
including `c0-build-candidate-manifest.mjs`, which is the script that enforces `c0-owner-rules.mjs`,
and `c0-verify-snapshot.mjs`, the verifier that produced `preservation.json`'s claim.

Proven stranded rather than presumed:

```
$ git check-ignore -v tmp/c0-owner-rules.mjs
.gitignore:146:tmp/      tmp/c0-owner-rules.mjs
```

And proven **referenced**, which is what makes it a correctness problem rather than tidiness: every
closure record names its provenance, so committing the receipts while the tooling stayed ignored would
have landed **dangling references** — evidence citing a verifier that cannot be produced.

| Record | Cites |
|---|---|
| `r7-02-controller-preservation-closure.md` | `r702-mutation-probe.mjs`, `r702-real-probe.mjs`, `r711-manifest-byte-probe.mjs` |
| `r7-04-preservation-enumeration-closure.md` | `c0-verify-snapshot.mjs`, `r704-backfill-preservation-inventory.mjs` |
| `r7-06-retirement-closure.md` | `c0-build-candidate-manifest.mjs`, `c0-owner-rules.mjs` |
| `preservation.json` | `c0-verify-snapshot.mjs` |

## The builders

| Tool | What it builds |
|---|---|
| `c0-owner-rules.mjs` | the ONE ownership rule set (C0–C5) shared by the manifest and migration-input builders. First match wins; **no match is a REFUSAL**, never a default |
| `c0-build-candidate-manifest.mjs` | `evidence/candidate-manifest.json` — raw current-byte identity of every dirty/untracked path |
| `c0-build-manifest.mjs` | the earlier manifest form (superseded by the candidate manifest) |
| `c0-build-bindings.mjs` | `evidence/source-bindings.json` — the G0 rows and their cited sources |
| `c0-build-migration-input.mjs` | `evidence/controller-migration-input.json` from the v7→v8 pair |
| `c0-build-v9-migration-input.mjs` | the v9 (C→S vocabulary) migration input |
| `c0-snapshot.mjs` | the preserved-r4-package snapshot (blob-based; see the `core.autocrlf` note in `preservation.json`) |
| `c0-write-receipts.mjs` | writes the receipt set |

## The verifiers and probes

A probe exists here only where the finding it proves needed a **measurement no test could make**, and
each one carries an honest CONTROL so a green cannot be vacuous.

| Tool | The question it answers |
|---|---|
| `c0-verify-snapshot.mjs` | are the 29 preserved artefacts byte-identical to the base blobs? **Currently inoperable**: the base commit's `docs` subtree is missing from the object store (`r7-12-preservation-provenance-unreachable.md`) |
| `r701-probe.mjs` | R7-01 — is the successor receipt *parsed*, or only hashed? |
| `r702-mutation-probe.mjs` | R7-02 — of Astra's six mutations, how many does the controller gate ADMIT? (`0/7` after the fix; `5/6` before) |
| `r702-real-probe.mjs` | R7-02 — does the gate refuse the REAL, correct v9 migration? (must be `0` violations; caught my own over-refusal) |
| `r704-backfill-preservation-inventory.mjs` | R7-04 — backfills the artefact enumeration the receipt never had |
| `r706-baseline-probe.mjs` | R7-06 — the hardcoded `baseHead` against a measured one |
| `r708-live-probe.mjs` | R7-08 — which runner does each suite actually resolve to? |
| `r711-manifest-byte-probe.mjs` | R7-11 — is `rawByteLength` load-bearing, or a recorded field nothing compares? |

## Two conventions these tools rely on

1. **Paths are worktree-relative**, matching `source-bindings.json`. A receipt read by a gate that
   holds only the root cannot use package-relative paths — that mistake refused all 29 artefacts once
   (recorded in `r7-04-preservation-enumeration-closure.md`).
2. **`--root=` overrides the tree under measurement.** The probes derive their own location from
   `import.meta.url` and default `ROOT` to two levels up, so they work from any cwd. Assuming
   `process.cwd() === <tool dir>` only held while every caller ran `node tmp/<probe>.mjs` from the
   root, which is exactly what the move broke.
