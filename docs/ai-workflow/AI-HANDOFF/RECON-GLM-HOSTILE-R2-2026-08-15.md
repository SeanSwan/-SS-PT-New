# GLM Consult

**Model:** glm-5.3
**Document:** c:/tmp/recon-review-r2.md
**Tokens:** 13522 in / 26990 out (reasoning: 23185) | total 40512
**Wall:** 400.6s

---

# Round 2 report

## Part A — verification of the 16 fixes

| Fix | Verdict |
|---|---|
| D1 | **Correct choice, incomplete implementation.** Two-dot tree-to-tree diff is ref-only and checkout-independent — right answer. But the pathspec plumbing around it is broken in 4 distinct ways (see **R2-2**). |
| D2 | **Wrong — the fix is dead code.** The escalation path can never execute. See **R2-1** (CRITICAL). |
| D3 | **Incomplete.** Every classify-time call is qualified, but `recon-scan.mjs` calls `commitSubjects(x.rec.mergeBase, x.item.ref, ...)` with the *short* name — tag/branch collision corrupts WIP detection. See **R2-9**. |
| D4 | Correct. `filesUnknown` → LOW for ABSENT/PARTIAL, `neverAgeOut` fails closed on `filesUnknown` and `contentCheck.truncated`. |
| D5/D16 | Correct. Signal renamed accurately; "zero risk" language gone. |
| D7 | Correct. `dirty:null` / `statusFailed:true` propagate to the report. |
| D9 | Correct. Throws; census rejects; top-level module failure exits loudly. |
| D11 | The list is widened, but a **third drifted copy** of the regex lives in `report.mjs` and under-reports — see **R2-6**. |
| D13 | Correct. Full file list reaches the floor; the 1000-cap now lives only in `contentPresentInBase` with a `truncated` flag that forces `present:false` and `neverAgeOut`. |
| D14 | Correct in population; weakened by R2-6's regex drift. |
| D17 | Correct. |
| D21 | Correct. `res.failed` → LOW before any raise. |

---

## Part B — new findings

### R2-1 · CRITICAL · `recon-scan.mjs` (finalists filter) + `equivalence.mjs` (deepConfirm) + `rank.mjs` (assignVerdict)

**Your Q2 answer: yes, it's a real risk — but your framing understates it. It's not "branches outside the top N". It is 100% of them, structurally.**

```js
const finalists = ranked
  .filter((x) => x.rec.equivalence === EQUIV.ABSENT || x.rec.equivalence === EQUIV.PARTIAL)
  .slice(0, DEEP_N);
```

`needsContentConfirm` is only ever set on records classified **LANDED** (cherry.absent===0). The finalist filter admits only ABSENT/PARTIAL. Therefore `wantsPresenceCheck` in `deepConfirm` is **unreachable code**. The D2 downgrade — the entire point of the fix — never runs, at any rank, for any branch.

Failure scenario: `fix/cart-rounding`, 5 commits touching `v2PaymentRoutes.mjs`. Main applied the fix, then reverted it ("backed out pending legal review"). `git cherry` → absent=0 → LANDED/MEDIUM + `needsContentConfirm`. Not a finalist → never confirmed. `assignVerdict`: `equivalence === LANDED` returns `VERDICT.LANDED` **before the sensitivity floor runs**, under the comment "LANDED is content-proven" — which is false for MEDIUM/patch-id-only records. The branch renders **[ARCHIVE], "content already on origin/main"** while main does *not* contain the fix. Compounding: the AUDIT DELTA excludes it (`equivalence !== EQUIV.LANDED` filter), so it vanishes from both the human list and the unaudited-surface list. That is precisely the failure D2 was written to prevent, still fully live, now with a comment claiming it's fixed.

Fix (all three, defense in depth):
1. Finalists filter: `|| x.rec.needsContentConfirm === true`.
2. `assignVerdict`: `VERDICT.LANDED` only when `rec.confidence === CONF.HIGH` (exactly excludes the unconfirmed population — every other LANDED path is HIGH). Unconfirmed-LANDED → `[HUMAN]` with signal `landed-by-patch-id-unconfirmed`.
3. `neverAgeOut`: add `if (rec.needsContentConfirm) return true;`
4. Report: the LANDED section must distinguish proven-LANDED from patch-id-LANDED.
5. Cheaper than rank-budgeting this: run `contentPresentInBase` inside `classify` for the absent===0 population only (one bounded extra call per such branch — they're a minority), so correctness never depends on making a top-N cutoff.

---

### R2-2 · HIGH · `git.mjs :: contentPresentInBase` + `diffStat`

The two-dot diff itself is sound; the **pathspec round-trip is lossy in four independent ways**, and every one of them causes *silent under-match with exit 0* — `differingFiles=[]` → `present:true` → LANDED/HIGH → [ARCHIVE]. This is a "failure renders as success" that no fail-closed discipline catches, because nothing failed.

1. **`core.quotePath` (default true).** `diff --numstat` C-quotes any path with bytes ≥ 0x80: `docs/café.md` is emitted as `"docs/caf\303\251.md"` (literal quotes and backslashes). That mangled string goes into `rec.files`, is fed back as a pathspec, and **matches nothing**. Any non-ASCII filename silently drops out of the content check.
2. **Glob metacharacters.** Pathspecs are globs unless made literal. `env[prod].js` is parsed as char-class `env` + `[prod]` + `.js` → matches `envp.js`, `envr.js`… **never itself**. `?`/`*` over-match (safe direction); `[` under-matches (dangerous direction). A leading `:` is pathspec magic.
3. **Renames.** `diff.renames` defaults true since 2.9, so `--numstat` emits `added\tdeleted\told => new`. `diffStat`'s `split('\t')` takes the whole `old => new` string as the path → pathspec matches nothing; the real new path is never checked, and the old path isn't in the list either. Branch whose only change is a rename, not landed → `present:true` → false LANDED/HIGH.
4. **Windows CreateProcess 32k limit (your question).** 1000 paths × ~40 chars ≈ 40KB > 32,767. execFile's spawn fails → `ok:false` → `failed:true`. That is fail-closed — but *unbatched* it means any branch with a large file list can **never** be content-confirmed, silently, every run. (POSIX ARG_MAX ~2MB is not a concern at this size.)

Confirmed **non-issues** for this command, since I attacked each as asked: NTFS case-insensitivity (tree-to-tree diff never touches the filesystem or index; case-differing tree entries compare exactly — the FS-sensitivity disease was specific to the removed `git apply` check); symlinks (exact blob-SHA compare); submodules (gitlink SHA compare, conservative direction); files deleted on the branch (if the deletion landed, the path matches nothing in either tree → correctly not counted as differing; if it didn't land, it correctly shows as differing).

One wording nit while here: `deepConfirm`'s comment "Absence confirmed by content" overclaims — differing content on branch-touched paths can also come from base's own later commits on those paths. The direction is conservative (escalates, never archives), so wording only.

Fix:
```js
// diffStat: NUL-separated, no rename collapsing, paths never quoted
git(['diff', '--numstat', '-z', '--no-renames', `${base}...${tip}`])

// contentPresentInBase: literal pathspecs, NUL output, batched
for (const batch of chunks(subset, 200)) {
  const r = await git(['--literal-pathspecs', 'diff', '--name-only', '-z',
                       '--no-renames', base, tip, '--', ...batch]);
  // r.ok=false → whole check failed (existing failed:true path)
  // union NUL-split results across batches before computing `present`
}
```
Add unit tests with `á.md`, `a[1].js`, `sp ace.js`, a pure rename, and a >250-file branch.

---

### R2-3 · HIGH · `inventory.mjs :: listWorktrees` / `listStashes`

You fixed this exact bug class in `listBranches` (D9) and `git status` (D7) and left the other two coercions in place. Both return `[]` on git failure. Scenario: `git worktree list` fails (corrupt `.git/worktrees` admin dir, permissions) → no branch is marked `inWorktree` → the ACTIVE_LANE guard silently disengages → a branch actively being worked in a linked worktree is classified LANDED and printed [ARCHIVE]. `listStashes` failing → `inv.stashes.length === 0` → the `notExamined` push never fires → "no stashes" is asserted when we couldn't look. Failure rendered as a success-shaped empty. Fix: return `{items, failed:true}` (or throw, as with listBranches), and record `worktrees unknown` / `stashes unknown` in `notExamined` + report.

### R2-4 · MEDIUM · `recon-scan.mjs` freshness gate

`commitTime(BASE)` → null (parse failure, weird object) → `baseAgeH === null` → the gate condition `baseAgeH != null && baseAgeH > 24` is **skipped silently**. A failure of the freshness check renders as "fresh enough" — the exact opposite of the gate's purpose, with no `--stale-ok` acknowledgment. Fix: `baseTime === null && !STALE_OK` → exit 3 ("base age UNKNOWN — pass --stale-ok to accept").

### R2-5 · MEDIUM · `inventory.mjs :: activeLaneRefs`

`catch { /* lane dir absent is fine */ }` swallows *everything* — EACCES, EMFILE, a corrupt lane file mid-read (the `readFile` is inside the loop). Lane-lock read failure silently disarms the in-flight guard. Fix: only `err.code === 'ENOENT'` (or ENOTDIR) is "fine"; everything else sets `laneDirUnreadable` → surface in `notExamined` and treat lane state as unknown.

### R2-6 · MEDIUM · `report.mjs` AUDIT DELTA

Two inline regex copies drift from `SENSITIVE`: the population regex omits `cors|csrf|\.env|ratelimit|crypt|helmet|verify|reset|oauth|jwt|mfa|upload|export|migration|seed|server.*|routes/`, and the per-file display regex omits even more (`permission|role|stripe|billing|refund|price|token|secret|pii`). Scenario: non-landed ref touching `cors.js` and `routes/x.js` — `pathSensitivity` fires (→ CONFLICTING/[HUMAN], correctly), but the AUDIT DELTA computes `risky=0`, `unresolved=0` (CONFLICTING is not UNKNOWN) and prints **"Sensitive paths: NO unpushed changes detected across all N non-landed refs."** — a blanket negative claim your own floor contradicts. D11 fixed the list; the bug is the *duplication*. Fix: `import { pathSensitivity }` and use it for both population and file filtering; delete both inline copies. (`neverAgeOut`'s name-regex is a third manual sync — derive it from `NAME_SIGNAL`'s positive terms programmatically.)

### R2-7 · MEDIUM · `report.mjs` DECISION SUMMARY

`[ARCHIVE] ${landed.length} branches whose content is already on ${base}` — but `MARK[VERDICT.COST]` is also `[ARCHIVE]`, and COST items appear as `[ARCHIVE]` rows in WHAT TO DO. The count is wrong whenever a COST verdict exists, and the claim "content is already on base" is **false** for COST items (they're ABSENT — that's why they're costed). Fix: two separate summary lines (landed vs. retire-by-cost), and count `[ARCHIVE]`-marked rows from `MARK`, not from `g(VERDICT.LANDED).length`. Also: `VERDICT.SUPERSEDED` is assigned nowhere — dead verdict, delete or document.

### R2-8 · LOW · `equivalence.mjs :: deepConfirm` failure conflation

On `res.failed` with `wantsPresenceCheck`, the code falls into the DIFFERS branch and emits `content:DIFFERS-at-base(null of 0) despite patch-id match` — mislabeling "could not check" as "checked and differs", and printing `null of 0`. Currently unreachable (R2-1) but must be fixed with it: handle `res.failed` before the presence branch, as the absence path already does.

### R2-9 · LOW · `recon-scan.mjs` deep pass

`commitSubjects(x.rec.mergeBase, x.item.ref, 40)` — unqualified short ref (D3 incomplete). Tag `v2-payment` + branch `v2-payment` → subjects read from the tag's history → WIP verdict decided on the wrong commits. Fix: `x.rec.qualifiedRef ?? x.item.ref`. Related: only finalists get `subjects`, so deferred ABSENT branches can never receive a WIP verdict — acceptable only because they're listed in `notExamined`; note it there.

### R2-10 · LOW · `report.mjs :: renderJson`

The machine artifact omits `needsContentConfirm`, `filesUnknown`, and `contentCheck` entirely. Downstream automation sees `equivalence: "already-landed"` with no flag distinguishing proven-LANDED from patch-id-LANDED — the JSON inherits exactly the ambiguity R2-1 creates in the report. Add the three fields.

### R2-11 · LOW · scope honesty (census gaps + loose ends)

- Detached-HEAD worktrees: `inv.worktrees` records them but nothing classifies them and `notExamined` never mentions them — in-flight work at an unmerged commit, invisible.
- `refs/remotes/*` other than the base and tags pointing at unmerged commits are not swept and not listed under NOT EXAMINED; "every place work can hide" overclaims.
- Report says `[--full to list]`; no `--full` flag exists in the CLI.
- `--deep`/`--concurrency` without a value → `Number(undefined)=NaN` → `slice(0, NaN)` = empty finalists, `Array.from({length: NaN})` = zero workers → silent no-op run shaped as success. Validate and die loudly.
- Hardening: `git status --porcelain` inherits repo `status.showUntrackedFiles` config — a repo set to `no` reports a clean tree while untracked files exist. Pass `--untracked-files=all` explicitly. And in `classify`, if `diffStat` returns `fileCount === 0` while `treeIdentical` was `false` (possible mode-only/numstat edge), don't emit net-diff-empty LANDED/HIGH — assert consistency.

---

## Section answers

**Q1 (two-dot):** Semantically the right test — two-dot, tree-to-tree, no filesystem/index involvement, so NTFS case-folding, symlinks, deletions, and submodules are all clean, and it is genuinely checkout-independent. The implementation is not safe: quoting/glob/rename-arrow pathspec corruption (R2-2 items 1–3) produces false `present:true` → false LANDED/HIGH → [ARCHIVE], and the unbatched 1000-path call self-destructs on Windows (fail-closed, but guaranteed-degraded).

**Q2 (D2 hole):** Real, but worse than posed — categorical dead code (R2-1), not top-N leakage. Even after fixing the filter, don't rank-budget an archive decision: guard at the verdict level (no ARCHIVE without HIGH confidence).

**Q3 (fail-closed trace):** Remaining failure→success paths: R2-2 under-match (worst — success-shaped wrong answer, no failure occurs), R2-3 worktree/stash coercion, R2-4 freshness gate skip, R2-5 lane-dir catch-all. Everything else traced clean: `mergeBase`/`cherry`/`treeIdentical`/`aheadBehind` nulls all fall conservative; `diffStat` null → `filesUnknown` (D4 holds); `stash create` failure is loud; `revParse` gates entry; spawn/maxBuffer errors surface via `ok:false`.

**Q4 (round-1 misses):** R2-3, R2-4, R2-5, R2-6, R2-7, R2-10, R2-11 were all unexamined in round 1 — including two more instances of the exact empty-coercion class I flagged in D7/D9 and then failed to grep for everywhere. That's on me.
