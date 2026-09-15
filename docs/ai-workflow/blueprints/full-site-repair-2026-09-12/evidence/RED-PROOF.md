# S17 gate RED/GREEN proof

Isolated harness repo (`tmp/s17-red-proof`), the real gate script
(`scripts/ci/check-docs-links.mjs`, byte-identical to the worktree's) and the real
locked engine (`markdown-link-check@3.14.2`) with the repository's own config.

Harness contents — three tracked Markdown files:

| File | Role |
|---|---|
| `good.md` | live doc: one relative link and one same-file anchor, both valid |
| `other.md` | link target |
| `frozen/record.md` | excluded by the manifest (`frozen/`); under test |

Each transcript below is saved verbatim and ends with the run's own exit code.

## RUN 1 — `redproof-1-ledger-growth.txt`

Recorded ledger baseline for `frozen/` is 0; the frozen record contains one dead
link.

**Exit 1.**

```
[docs-links] excluded ledger (fails only on growth):
dead     1 /     0   unreadable   0 /   0   frozen/  <-- OVER BASELINE
[docs-links] excluded-ledger growth (debt may only shrink):
frozen/: dead 0 -> 1, unreadable 0 -> 0
```

Proves: a dead link in an excluded file is still real debt. Adding a path to the
exclusion list does not let new breakage hide inside it.

## RUN 2a — `redproof-2a-record.txt`

`node scripts/ci/check-docs-links.mjs --record`

**Exit 0.** Records `frozen/: 1 dead link`.

## RUN 2b — `redproof-2b-enforce-clean.txt`

Same command without `--record`, tree unchanged.

**Exit 0.**

```
dead     1 /     1   unreadable   0 /   0   frozen/
[docs-links] OK — 0 dead links across 2 in-scope files; 1 dead link(s) recorded as frozen debt across 1 excluded files.
```

Proves: a dead link inside a frozen record does not fail the check by itself, and
does fail once it exceeds the recorded baseline (RUN 1).

## RUN 3 — `redproof-3-planted-break.txt`

A broken link is **planted in the live doc** `good.md`:
`[PLANTED BROKEN LINK](this-file-does-not-exist.md)`.

**Exit 1.**

```
[docs-links] 1 dead link(s) IN SCOPE — these fail the check:
  this-file-does-not-exist.md (400)
```

Proves: the gate still bites on a real broken link in maintained documentation.

## Independent confirmation at production scale

No planting was needed there. The first full run over the real repository — with
the excluded ledger still unrecorded — exited 1 and named exactly one in-scope
dead link:

```
docs/ai-workflow/references/archive/ROUTER-UPGRADES-GT6.md
  https://www.makemkv.com
```

That was a genuine defect, not a planted one, and it is why the final run has an
in-file suppression for that host.

## Note for reviewers

All four runs were re-executed against the **final** gate revision after the
round-3 mechanism changes (explicit `frozenFiles` freeze, file-scoped
transient-only confirmation, finiteness-checked baselines, `error` counted as a
failure). The outcomes are unchanged: RUN 1 exit 1, RUN 2a exit 0, RUN 2b exit 0,
RUN 3 exit 1 naming the planted link. The transcripts above are those re-runs.

An earlier revision of this file also mislabeled its first transcript: the saved
file was the `--record` run rather than the ledger-growth run. Hostile review
caught it; the mislabeled file was deleted.
