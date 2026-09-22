# R7-09 — active documentation contradicts implementation and evidence — MEASURED, BLOCKED ON A REVISION I DO NOT HAVE

**Raised:** 2026-09-22 (Astra Review 7, Medium, finding D9).
**Status:** Every claim **confirmed by direct measurement**. **No repair applied** — for a
reason that is itself the finding. See §3.

---

## 1. Astra's claims, each independently reproduced

Astra reviewed the **live** package in the worktree
`tmp/worktrees/swan-coach-astra-owned-20260906`. I measured the same claims against both the
live package and the preserved snapshot, and **all six reproduce**:

| # | Claim | Measured | Verdict |
|---|---|---|---|
| 1 | `01-architecture.md` is 306 lines vs the package's own 300-line limit | live **306**, preserved **350** | **CONFIRMED** (Rule 4 is `AGENTS.md:102`, "Max 300 lines per file") |
| 2 | `07-checkpoints.md` says C0 is blocked *and* declares C0 PASS | line 9 `\| C0 \| BLOCKED pending bounded preparation repair…` and line 108 `## C0 PASS — preparation admitted` — **in the same file** | **CONFIRMED** |
| 3 | `coverage-mapping.json` says no C0 controller scope exists while the supported v9 controller contains C0–C5 | map: `"packageSlice": "C0", "controllerSlices": [], "status": "NOT COVERED BY THE CONTROLLER STATE"`. Controller: slice ids **`C0-PREPARATION-AND-RUNNER-SAFETY, C1-…, C2-…, C3-…, C4-…, C5-…`**, C0 carrying **49 files** | **CONFIRMED — the mapping is stale** |
| 4 | `09-tests.md` runs the Vitest-based child-runner suite through Node | `09-tests.md:33,41,47,53,61,67` — every line is `node ./node_modules/vitest/vitest.mjs run …` | **CONFIRMED in substance** — the *suites* are selected correctly, but the **runner** is `node`, which is exactly the D8 (R7-08) defect at the documentation layer |
| 5 | `r5-11-real-model-closure.md` preclassifies future failures as environmental | present | **CONFIRMED** |
| 6 | Review-6 prose and its PART C were copied into current artefacts as current guidance | present | **CONFIRMED** |

For claim 3 the resolution is unambiguous and worth stating plainly, because it is the one a future
reader is most likely to get backwards:

```
coverage-mapping.json :  C0 -> controllerSlices: []      "NOT COVERED BY THE CONTROLLER STATE"
workflow-state-v9.json:  C0-PREPARATION-AND-RUNNER-SAFETY (49 files)
```

The mapping was written against **v8** (`"controllerState": "tmp/coach-completion-20260921/workflow-state-v8.json"`).
The controller has since migrated to **v9** under the C0–C5 vocabulary, which the mapping's own
`consequence` field predicted would be needed (*"Either a C0 slice appended to the controller, or an
explicit statement that C0 is governed outside the controller"*). **The first was done; the mapping
was never updated to match.** It is a stale artefact, not a false one.

---

## 2. Why this matters (Astra's reasoning, which I endorse)

Astra's sharpest point is not any single inconsistency. It is that
`r5-11-real-model-closure.md` **preclassifies future failures as environmental** — a standing
exemption from evidence. A document that exempts its own failures from review is not a record.

And claim 2 is the through-line defect class of this entire review cycle, in prose form: **an
artefact reporting more confidence than it has.** A ledger row that says BLOCKED and a heading six
screens later that says PASS cannot both be current. Whichever is true, the file asserts both, so a
reader who stops at either one is misled. This is the same defect as R7-02 (a gate reporting CLEAN
over a set it never examined), R7-04 (a count with no enumeration), and R7-11 (a recorded field
nothing compares) — expressed in documentation rather than code.

---

## 3. THE REVISION PROBLEM — why no repair was applied

**The preserved snapshot and the live package are different revisions of all nine documents.**

```
document                           live  preserved
00-README.md                         68         88   DIVERGED
01-architecture.md                  306        350   DIVERGED
02-wireframes.md                    240        256   DIVERGED
03-contracts.md                     257        278   DIVERGED
04-build-order.md                    92         65   DIVERGED
05-slices.md                        113        138   DIVERGED
06-bans.md                           57         83   DIVERGED
07-checkpoints.md                   205         84   DIVERGED
09-tests.md                         288        217   DIVERGED
```

The only copies **in my commit** are the frozen ones under
`evidence/preserved-r4-package/`. Astra's line citations (`07-checkpoints.md:9–14` vs `:108–117`)
resolve against the **205-line live** file. The preserved copy is **84 lines** and contains the
BLOCKED row but **no PASS section at all** — so it does not even exhibit the contradiction Astra
found.

Two independent reasons not to repair the preserved copy:

1. **It would destroy preservation evidence.** All **29** entries in `preservation.json` live under
   `preserved-r4-package/`, each with a recorded `rawByteLength` and `sha256`. The on-disk hash of
   `01-architecture.md` still matches its record exactly:
   `ed407cce8a9dea67e6556823b855e054bce8181e345abaf9d230c7b419378870`. Editing it to get under 300
   lines would break the R7-04 gate's own verification — the gate would then correctly **refuse**
   the package. Repairing a documentation defect by corrupting the evidence that the documentation
   is preserved is not a repair.
2. **It would fix the wrong revision.** Astra's findings are about the live package. Applying edits
   to a divergent snapshot produces a third revision that matches neither, and leaves the live
   defects in place while creating a misleading impression of closure.

**Therefore R7-09 is recorded as MEASURED and BLOCKED, not closed.** The repair belongs in the live
package, which is untracked (see §4) and is the same set of files R7-13's class covers.

---

## 4. What blocks the repair, and what it is coupled to

The live package is **untracked**: `git status --porcelain` in the source worktree shows
`?? docs/ai-workflow/AI-HANDOFF/BLUEPRINT-swan-coach-universe-v3-s83-completion-2026-09-19/`.

This is the **same exposure** the 14:07 hostile review
(`2026-09-22-140700-ss-pt-head-depends-on-untracked-module`) found for the coach runner family,
and the same one R7-13 addressed for the 16 tools. It is one `git clean -fd` from loss. The live
package cannot be edited by me from a clean checkout because it is not in the checkout.

**Consequence:** R7-09's repair and the untracked-live-package problem are the same task. Fixing the
documents without committing them would be theatre.

---

## 5. The one thing I could fix here, and did not

I could have edited the preserved snapshot to 299 lines and reported R7-09 closed. That would have
been a false green of exactly the kind this review cycle exists to eliminate:

- the line count would pass, so the numeric claim would look satisfied;
- the actual defect (a self-contradicting ledger, a stale mapping, preclassified exemptions) would
  be untouched, because the contradictory PASS section is **not in the preserved copy**;
- and the preservation gate would have been silently broken to achieve it.

Declining to take that shortcut is the correct outcome. The finding stays open and measurable.

---

## 6. Exact repair list for whoever holds the live package

Ordered, minimal, each independently verifiable:

1. **`07-checkpoints.md`** — the file contains both `C0 | BLOCKED` (line 9) and
   `## C0 PASS` (line 108). Resolve by making the ledger the single source of current status and
   dating the PASS section as history, or by removing the stale BLOCKED row if C0 is genuinely
   admitted. Do not leave both undated. **The C0 PASS section is evidenced** (v9 migration with 216
   origin events preserved, runner suites 67/67, guarded run exit 0), so the ledger row is the stale
   half.
2. **`coverage-mapping.json`** — regenerate against `workflow-state-v9.json`, not v8. C0's row
   becomes `controllerSlices: ["C0-PREPARATION-AND-RUNNER-SAFETY"]`, and its `needs` field is
   discharged by the fact that the C0 slice now exists.
3. **`01-architecture.md`** — reduce to ≤300 lines per Rule 4 (`AGENTS.md:102`). It is 306 live,
   so a genuine split of the `## API interaction sequences` block (live lines 100–242, the largest
   section) into its own document is the natural seam. **Preserve the current bytes** as a dated
   artefact before editing, then re-run `checkPreservation` to confirm the new hashes are recorded.
4. **`09-tests.md`** — the `node ./node_modules/vitest/vitest.mjs` lines describe the *runner* the
   R7-08 defect lives in. Update them together with R7-08, not separately, or the doc will describe
   a runner that no longer exists.
5. **`r5-11-real-model-closure.md`** — **remove the preclassification of future failures as
   environmental.** This is the highest-priority item in this list despite being a prose edit: a
   standing exemption from evidence is worse than an inconsistent ledger, because it silently
   disarms every future review.
6. Re-run all four gate suites (26/14/24/13) after the edits, since `01-architecture.md` and
   `coverage-mapping.json` are both candidates in the manifest.

---

## 7. Note on method

Astra's citations pointed at line numbers in a revision that no longer exists on my side. I did not
treat that as grounds to downgrade the findings — I resolved each one against **content** rather
than line number, and all six reproduced. The line numbers were stale; the defects were not.

I also did not treat "the preserved copy doesn't show the contradiction" as a refutation. It is
not: the preserved copy is a different revision, which is precisely why fixing it would have been
the wrong move.
