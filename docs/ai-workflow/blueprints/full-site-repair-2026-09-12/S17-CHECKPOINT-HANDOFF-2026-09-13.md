# S17 checkpoint handoff — 2026-09-13

**Status: CHECKPOINT, not done.** The slice is built, reviewed, committed, pushed
and green in CI. It is **not merged**, and a fresh hostile-review wave has not been
run against the final commit. Pick up from here.

Written so that an agent with no memory of this work can resume — or take over —
from this document and the paths it names.

---

## 1. Where everything is

| What | Path |
|---|---|
| **Worktree** (all work happened here; the canonical checkout was never touched) | `C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\tmp\worktrees\docs-link-debt-20260913` |
| Branch | `fix/docs-link-debt-20260913` |
| Base | `e07d4b9` (= `origin/main` at the time of writing; **re-verify, main may have moved**) |
| Head at handoff | `29cd22d17` — 7 commits, **0 ahead / 0 behind `origin/…`** |
| Pull request | https://github.com/SeanSwan/-SS-PT-New/pull/122 — OPEN, MERGEABLE, all 7 checks pass |
| Canonical packet (pre-existing) | `docs/ai-workflow/blueprints/full-site-repair-2026-09-12/` |
| Slice record (read this first) | `…/full-site-repair-2026-09-12/S17-docs-link-debt.md` |
| **Committed evidence pack** | `…/full-site-repair-2026-09-12/evidence/` (32 files, ~880 KB) — start with its `README.md` |
| Local scratch (not committed; regenerable) | `<worktree>/.mega-blueprints/artifacts/docs-link-debt-20260913/` — raw CI log dumps, nine `gate-*.json` run receipts (~780 KB each), `.log` transcripts |
| Parent release this follows | `.mega-blueprints/artifacts/55c0633e8d876db7/release-20260913/` in the `full-site-repair-20260912` worktree; the CI job log lives there |
| Existing (unrelated) worktree with the same base | `…/worktrees/release-ci-s16-20260913` — clean checkout at `e07d4b9` |

**Rules for this repo:** never edit the canonical checkout
`C:\Users\BigotSmasher\Desktop\@Everything\quick-pt\SS-PT` (heavily dirty, ~960
entries, unrelated work). Stage explicit paths — never `git add -A`. Rule 67 lane
coordination: this session claimed
`.ai-workflow/coordination/vs-claude--docs-link-debt-20260913-9841218e2d.lane.md`.

---

## 2. What the slice is

The repository's `Documentation Link Check` workflow had been **red on every run**:
GitHub's API shows 100 consecutive runs (2026-04-08 → 2026-09-13) with **zero
successes**. Three independent causes, each measured:

1. **Discovery swept the whole tree.** CI delegated to
   `gaurav-nelson/github-action-markdown-link-check@v1`, whose `entrypoint.sh` runs
   `find . -name '*.md' -not -path './node_modules/*'` — including frozen archives,
   saved model transcripts and vendored skill bundles.
2. **CI and the repo ran different engines.** The action global-installs
   `markdown-link-check@3.8.7` (pinned in its own `entrypoint.sh` at resolved SHA
   `5c5dfc0ac2e225883c0e5f03a85311ec2830d368`); `package-lock.json` pins **3.14.2**.
3. **Nothing reproduced it locally.** The old `npm run check-docs-links` covered a
   fraction of CI's sweep, on a third engine version.

**Delivered:** a repository-owned gate that CI and a developer machine both run,
105 repaired dead links, and an explicit shrink-bounded ledger for the unfixable
remainder. The link **rules were not modified** —
`.github/markdown-link-check-config.json` is byte-identical.

### Files that constitute the slice

| File | Role |
|---|---|
| `scripts/ci/check-docs-links.mjs` | The gate. Enumerates tracked Markdown, partitions by manifest, checks, fails on in-scope failure or ledger growth. |
| `scripts/ci/docs-link-scope.json` | The manifest: 10 evidenced exclusions, a frozen file list for the one active write target, recorded baselines. |
| `scripts/ci/__tests__/docsLinkScope.test.mjs` | 20 guard tests. Run as a CI step **before** the link check. |
| `.github/workflows/docs-check.yml` | Runs `npm ci`, the guard tests, then the gate. Uploads the receipt. |
| `package.json` | `check-docs-links` now runs the repo script; added `check-docs-links:in`. Scripts only — **no dependency change** (lock untouched). |
| `docs/ai-workflow/blueprints/full-site-repair-2026-09-12/S17-docs-link-debt.md` | The slice record: every claim, every number, and §11 listing every correction hostile review forced. |
| 30 Markdown files | The repairs (anchors, `mailto:` placeholders, stale paths, external rot, one unclosed code fence). |

---

## 3. Verified state (and how to re-verify)

| Claim | Evidence |
|---|---|
| Gate passes locally | `node scripts/ci/check-docs-links.mjs` → exit 0, "0 dead links across 1145 in-scope files" |
| Gate passes **in CI** | [run 34779935282](https://github.com/SeanSwan/-SS-PT-New/actions/runs/34779935282) — `success`, 7m25s |
| Guard tests | `node --test scripts/ci/__tests__/docsLinkScope.test.mjs` → 20/20 |
| Works in a depth-1 checkout (the CI shape) | `git clone --depth 1` + `npm ci` → guard 20/20, gate runs (previously: exit 2 on every trigger) |
| Anchors work for a human on GitHub | 105/105 resolve under `github-slugger` **and** the checker — `evidence/github-slug-crosscheck.mjs` |
| Gate still fails on real breakage | `evidence/RED-PROOF.md` + 4 transcripts |
| Pre-repair baseline | 105 dead links / 28 files — `evidence/baseline-pristine-in-scope.json` |
| **No breaking changes** | 37 files changed: 0 under `backend/`, `frontend/`, `shared/`; `package-lock.json` untouched; only `package.json` scripts changed |
| All checks green on the PR | docs-check, backend, frontend, AI Validation, Design guards, GitGuardian, CodeRabbit |

Full check output for the PR: `gh pr checks 122`.

---

## 4. Review history — and why the loop is NOT dry

**Three waves, six independent hostile reviewers. Every wave returned REVISE.**
No link repair was ever found incorrect; every finding was in the gate's mechanism
or the record's numbers, and every one was reproduced before being fixed. Read
§11 of the slice record for the full correction table.

The two that would have shipped something broken:

- **Wave 2 — BLOCKER.** `actions/checkout` fetches one commit, so the
  commit-pinned freeze was unresolvable in CI: the job would have exited 2 on
  **every trigger**, shipping a permanently red check — the exact failure this
  slice exists to remove. Fixed with an explicit `frozenFiles` list; verified in a
  real `--depth 1` clone.
- **Wave 3 — MAJOR.** The guard test "no frozen path leaks into the checked scope"
  recomputed scope with a naive prefix test instead of `partition()`, so it
  ignored `freezeMode` and flagged a NEW file in `docs/ai-workflow/AI-HANDOFF/` as
  a leak. Because the guard step runs *before* the link check, **every rule-48
  audit record would have turned CI red**.

Also fixed, each with a reproduction: a confirmation pass that could launder a
real 404 into a pass; `docs/ai-workflow/AI-HANDOFF/` wrongly frozen despite being
an active write target (CLAUDE.md rules 48/212/251; 216 files added in 30 days);
`Infinity` passing the baseline check; failing-**file** counts compared against
**dead-link** baselines; `--record` silently zeroing every excluded baseline;
`error`-status links invisible; guard tests running in no pipeline.

**Not done:** no review wave has run against `29cd22d17`. Every *known* finding is
fixed and verified, but the loop has never come back clean, so do not describe it
as dry.

---

## 5. Open decisions and remaining work

1. **Merge.** Sean's standing choice was "open a PR and let CI verify it first",
   which is done and green. **Merging to `main` triggers the Render deploy** (and
   `render.yaml` runs `migrate:production` on a main push), so it needs an explicit
   go-ahead. The change is docs + CI tooling only.
2. **Run review wave 4** against `29cd22d17` before merging if you want the loop to
   actually converge. The most valuable angle: attack the new deterministic/
   external counter split in `scripts/ci/check-docs-links.mjs` — specifically
   whether the tolerance of 2 can be used to hide real breakage, and whether
   `isDeterministicFailure` classifies anything wrongly.
3. **`docs/archive/` was deliberately not excluded** — its one dead link was
   repaired instead, so the exclusion list did not grow after the baseline was
   measured. Keep it that way.
4. **Follow-ups recorded but not fixed** (slice record §10): committed test
   passwords in `docs/ai-workflow/blueprints/OPERATIONS-READY-TESTPLAN-AND-GAPS.md`;
   residual `AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md` references in code spans; an
   unreadable file inside a frozen archive.
5. **Known residual flakiness, stated plainly.** External-host availability varies
   by vantage point and by run. Measured: `fda.gov/…/nutrition-facts-label` is dead
   from the GitHub runner and alive from a Windows box; `fitnessnav.com` and
   `scribd.com` are the other way round. The ledger therefore gates deterministic
   failures (relative paths, anchors) at exactly zero growth and external ones with
   a tolerance of two per row. A flaky host can still fail one job with a named
   link; the response is to re-run, not to suppress a working link.
6. **GLM.** Not used and not needed for this slice. `scripts/consult-glm.mjs:34`
   already targets the Z.ai subscription (`api.z.ai/api/coding/paas/v4/…`, model
   `glm-5.3`), **not** OpenRouter — no route change is required. This session had no
   `ZAI_API_KEY`, so no provider call was possible or made.

---

## 6. Traps to avoid

- **Do not re-run the whole gate casually.** `--scope=all` takes ~7–21 minutes
  (three sequential passes over 2931 files). `--scope=in` is the fast loop.
- **Never `Remove-Item -Recurse` a directory junction.** During this session that
  followed a junction into a worktree's `node_modules` and emptied it. Untracked,
  so nothing committed was harmed, but use `cmd /c rmdir` for junctions.
- **`--record` requires `--scope=all`** (enforced) — recording from a partial run
  would zero every excluded baseline.
- **`.mega-blueprints/` is untracked but NOT gitignored.** It shows as `??`. Never
  `git add -A`; stage explicit paths.
- **External link results are time-dependent.** A green run today does not promise
  a green run tomorrow; that is a property of checking third-party URLs.
- **Line endings.** This worktree is CRLF; git normalises on commit. Diffs may show
  warnings.

---

## 7. Ready-to-paste prompt for the next agent

> Continue SwanStudios slice **S17 (documentation link debt)** from its checkpoint.
>
> Read, in order:
> `docs/ai-workflow/blueprints/full-site-repair-2026-09-12/S17-CHECKPOINT-HANDOFF-2026-09-13.md`
> (this file), then `…/S17-docs-link-debt.md` (the slice record, including §11's
> correction table), then `…/evidence/README.md`.
>
> Work in the worktree `C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\tmp\worktrees\docs-link-debt-20260913`,
> branch `fix/docs-link-debt-20260913`, head `29cd22d17` at handoff. Verify current
> remote state first — `origin/main` may have moved — and check the lane ledger
> before editing. Never touch the canonical dirty checkout.
>
> The slice is committed, pushed and green: PR #122, all 7 checks pass, including
> `Check Documentation Links`, which had failed on 100 consecutive runs before this.
> Local gate: `node scripts/ci/check-docs-links.mjs` → exit 0. Guard tests: 20/20.
>
> What remains: (a) run a fresh hostile-review wave against `29cd22d17` — the loop
> has never returned clean, so do not call it dry — and the highest-value target is
> the deterministic/external ledger split, specifically whether the external
> tolerance of 2 can hide real breakage; (b) get Sean's explicit go-ahead before
> merging, because a `main` push triggers the Render deploy.
>
> Do not re-do the repairs, do not re-litigate the exclusions without new evidence,
> do not weaken `.github/markdown-link-check-config.json` (it is byte-identical to
> pre-slice), and keep every residual limit stated rather than smoothed over.
