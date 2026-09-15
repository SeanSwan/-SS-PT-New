# docs(ci): close documentation link debt with a scope-pinned gate

**Branch:** `fix/docs-link-debt-20260913` · **Commits:** `10e589035`, `0b2ba44b1`, `3e5e82e17` · **Base:** `e07d4b9` (origin/main)
**Slice:** S17 of the canonical `full-site-repair-2026-09-12` packet
**Runtime effect:** none. Markdown, one workflow, `scripts/ci/**`, and two `package.json` scripts. No backend, frontend, shared, schema or auth surface is touched.

## The problem

The `Documentation Link Check` workflow was red on **every** run. Three independent defects made it both unusable and unreproducible:

1. **Discovery swept the whole repository.** The workflow delegated to `gaurav-nelson/github-action-markdown-link-check@v1`, whose `entrypoint.sh` runs `find . -name '*.md' -not -path './node_modules/*'`. That includes frozen archives, saved model transcripts and vendored upstream skill bundles.
2. **CI and the repository ran different engines.** The action global-installs `markdown-link-check@3.8.7` (pinned in its own `entrypoint.sh` at the resolved SHA `5c5dfc0a`); `package-lock.json` pins **3.14.2**. Six minor versions apart, with different strictness.
3. **Nothing reproduced it locally.** Root `package.json` declared a script covering `docs/**` and `README.md` only — a small fraction of what CI swept, using a third engine version.

A gate that is permanently red, unmatched by any local command, and running an unpinned engine protects nothing. It trains every reader to ignore it.

## What changed

**A repository-owned gate.** `scripts/ci/check-docs-links.mjs`, run by the workflow after `npm ci`, so CI and a developer machine execute the same engine, the same config and the same file selection. `npm run check-docs-links` is that command.

**The link rules were not modified.** `.github/markdown-link-check-config.json` is byte-identical: same `ignorePatterns`, same `aliveStatusCodes`, same timeout. Dead-link classification is the stock checker's.

**Repairs: 105 dead links in the checked scope**, measured on a pristine checkout of `e07d4b9`:

| Class | Count | Repair |
|---|---|---|
| Same-document anchors that never matched a heading slug | 55 | recomputed from the heading |
| Placeholder `mailto:` addresses at example domains | 16 | rendered as inline code |
| Stale relative paths, wrong domain, path case, external rot | 34 | repointed to the verified current target, or de-linked with a stated reason |

Two things are worth calling out:

- **Anchors were verified against GitHub, not just against the checker.** `markdown-link-check` computes heading anchors with its own documented "simple text comparison", which is not GitHub's algorithm. Every repaired anchor was cross-checked with `github-slugger`, the library GitHub uses: **105 of 105 distinct anchors resolve under both.** Four initially passed the checker while disagreeing with `github-slugger` (it keeps the Unicode variation selector U+FE0F that the checker strips), so those four headings had their leading emoji removed — the only content change in the slice, exactly four lines.
- **A verification instrument was repaired, not just an instrument panel.** `docs/ai-workflow/ADMIN-VIDEO-LIBRARY-BACKEND-IMPLEMENTATION-PLAN.md` had an unclosed code fence that had been swallowing two headings — including `## Testing Strategy` — from every renderer, not only from the link checker.

**The unfixable remainder is an explicit ledger**, `scripts/ci/docs-link-scope.json`: 1865 dead links across 1786 files in frozen archives, generated transcripts and vendored bundles. Excluded files are still checked on every run; only their failure is downgraded to a recorded row. The run fails if any row exceeds its baseline, and if an entry has no baseline at all.

- 62.7% of that debt is generated transcripts; 1118 links are Google Search grounding redirect URLs, which `scripts/consult-gemini.mjs:120` persists verbatim and which are session-scoped and expire by construction.
- `docs/ai-workflow/AI-HANDOFF/` is an **active write target** (CLAUDE.md rules 48/212/251; 216 files added in 30 days), so it pins `frozenAsOf` rather than excluding the whole directory — new audit records are checked like any other documentation.
- The exclusion set is pinned by a test, so widening it fails until the pin is updated in the same commit.

## Verification

| Check | Result |
|---|---|
| `node scripts/ci/check-docs-links.mjs --scope=all` | **exit 0** — "0 dead links across 1145 in-scope files" |
| Same command in a real `git clone --depth 1` | guard tests 16/16; gate resolves and runs (this is what the round-3 BLOCKER broke) |
| Guard tests `node --test scripts/ci/__tests__/docsLinkScope.test.mjs` | 16/16 pass, and they now run as a CI step before the link check |
| Anchors under `github-slugger` (GitHub's own) | 105/105 |
| Planted-failure RED proof | exit 1, naming the planted link |
| Ledger-growth RED proof | exit 1 on an excluded row exceeding its baseline |
| Pre-repair baseline | 105 dead links / 28 files, from a pristine `e07d4b9` worktree |
| Secret scan over the diff | clean |

## Review

Three hostile reviewers per round, three rounds so far, **every round returned REVISE**. No link repair was ever found incorrect — every repointed target sampled resolved, all anchors were independently reproduced, the fence repair and the domain fix were confirmed, and both suppressions were accepted as legitimate. The findings were in the gate's mechanism and in the record's numbers, and they changed the gate:

- **round 3 found a BLOCKER**: `actions/checkout` fetches one commit, so a commit-pinned freeze was unresolvable in CI and the job would have exited 2 on every trigger — shipping a permanently red check, the exact failure this slice exists to remove. The freeze is now an explicit file list, verified in a real depth-1 clone;
- the confirmation pass could **launder a real failure** (a local server answering 404-then-200, later 500,500,200, was reported as "OK — 0 dead links"). It is now file-scoped and transient-only, and a file containing any definitive 4xx is never re-checked;
- `docs/ai-workflow/AI-HANDOFF/` was wrongly excluded as frozen despite being an active write target (CLAUDE.md rules 48/212/251; 216 files added in 30 days);
- the guard test called `partition()` without frozen sets, inverting the gate's semantics, so the next audit record would have turned CI red;
- `Infinity` passed the baseline check, so one manifest token could disarm the ledger silently;
- excluded-entry confirmation compared failing-file counts against dead-link baselines;
- links with engine status `error` were invisible (six live in-scope instances, now repaired);
- the guard tests ran in no pipeline at all.

Full record, including every number hostile review falsified and the correction: `docs/ai-workflow/blueprints/full-site-repair-2026-09-12/S17-docs-link-debt.md` (§11).

## Residual limits

- **External-link results are time-dependent and the job can still flap.** Measured across four full runs of the finished gate: three exited 0, one failed on `orthoinfo.aaos.org`, which `curl` served 200 throughout. A flaky host now fails one job with a named link rather than leaving the whole check permanently red.
- The ledger is **count-based, not identity-based**: repairing one excluded link while breaking another in the same file leaves the row total unchanged. A new *file* cannot be absorbed this way.
- `--record` re-baselines deliberately, lands in the diff, and does not re-confirm excluded files; a recorded baseline can therefore be marginally inflated.
- Two hosts serve nothing to automated clients (Dribbble's AWS WAF challenge; `www.makemkv.com`). Each carries a single in-file `markdown-link-check-disable-next-line` with its reason written above it, and suppressed links are counted in the run output and the receipt. No global ignore pattern or `aliveStatusCodes` widening was used.
- The gate is deliberately **stricter than the upstream CLI**: it also fails links the engine could not evaluate (`error`), which the CLI ignores.
- Untracked Markdown is invisible, by construction — the gate enumerates `git ls-files`.

## Rollback

Revert the three commits. The workflow returns to the third-party action and the check to its previous red state. Nothing is deployed and no data is touched.
