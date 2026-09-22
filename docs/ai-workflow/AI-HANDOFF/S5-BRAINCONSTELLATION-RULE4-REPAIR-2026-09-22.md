# S5 BrainConstellation — Rule 4 repair, hostile self-review and evidence

**Date:** 2026-09-22
**Branch:** `creator-brains-engine-r2-20260915`
**Defect:** `BrainConstellation.tsx` at **380 lines** against ban **14** (`06-bans.md`, Rule 4: ≤300 lines per file)
**Status:** FIXED · mutation-proved · build-verified · **uncommitted, awaiting operator**

---

## 1. What was actually wrong

`packages/creator-brains-console/web/src/components/BrainConstellation.tsx` — the
S5 / CD3 "Vault Observatory" component — was **380 lines**. Ban 14 caps a file at
300. A Rule 4 sweep of the whole package confirms it was the **only** violator:

```
  380  ./web/src/components/BrainConstellation.tsx
```

The overage was **undisclosed** — it appears in no checkpoint, in neither
`S4-RESULTS.md` nor `05-slices.md`, and is not named in ban 31 or ban 32's
"these are known and deliberately not fixed" list. So it was neither fixed nor
declared, which is the one state the package treats as a defect rather than a
tradeoff.

## 2. The seam, and why it is a real boundary

The file was ~180 lines of logic and ~200 lines of `styled-components`. The
package's own precedent for an over-budget file is to **split along a natural
seam, not trim reasoning comments** — the logic half carries commentary the
package explicitly requires be stated (the three gates, the corrected load
trigger, the entry-dolly-skipped rule).

The seam chosen is **what the component renders** vs **what the component does**:

| Extracted to `constellation.styles.ts` | Left in `BrainConstellation.tsx` |
|---|---|
| `Frame`, `Canvas`, `Caption`, `NodeList`, `NodeButton`, `NodeMeta`, `Swatch` | the three gates and `shouldLoadChunk` |
| `STATE_SWATCH` (the one non-styled presentation constant) | the idle → chunk load trigger |
| — | scene lifecycle, resize, teardown |
| — | pointer hit-test and the arrow-key walk |

Every extracted export is a styled component or a constant record. **Nothing
extracted has behaviour**, so no timing, ordering or gate could change.

## 3. Result

| File | Before | After |
|---|---|---|
| `BrainConstellation.tsx` | **380** ✗ | **292** ✓ |
| `constellation.styles.ts` | — | **112** ✓ |

Export surface preserved exactly: `BrainConstellationProps`, `BrainConstellation`,
`default`. The only new consumer edge is `BrainConstellation.tsx → constellation.styles.ts`.

## 4. Evidence

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | **exit 0** |
| Gates suite | `vitest run src/components/constellation-gates.test.tsx` | **11/11** |
| Full web suite | `vitest run --no-file-parallelism` | **141/141**, 14 files |
| Production build | `npx vite build` | **71 modules**, built in 1.78 s |
| Lazy boundary intact | build output | `constellation-three-*.js` still a **separate 521.98 kB chunk** |

### 4a. The parallel-run flake — diagnosed, not hand-waved

The full suite **failed 11 tests** on the first run and **passed 141/141** on a
serial run. That is not a result either way until the difference is explained.

- Failing file: `constellation-gates.test.tsx` (10) + `payload-shape.test.tsx` (1).
- The same `constellation-gates.test.tsx` run **alone**: **11/11 pass**.
- The full suite run with `--no-file-parallelism`: **141/141 pass**.

So the failures are **cross-file worker interference**, not a consequence of the
split — the identical file passes in isolation and in a serial full run. This is
a **pre-existing flake in the harness, disclosed here rather than left as a
green tick.** It is not caused by this change, but it will bite anyone who runs
the suite in parallel and reads the count as a verdict.

### 4b. Mutation proof — the split is load-bearing

A green suite after a refactor proves nothing; it is equally consistent with a
suite that never exercised the moved code. So the guards were shown to still be
able to **fail**. Harness: `web/.mutation-proof-split.mjs`.

```
=== BASELINE (pre-mutation) ===
  GREEN  pass=11 fail=0

=== MUTATIONS ===
  DETECTED  M1 — fallback caption no longer rendered            pass=9 fail=2
  DETECTED  M2 — node list stops rendering nodes                pass=6 fail=5
  DETECTED  M3 — component no longer resolves extracted styles  pass=3 fail=8
  DETECTED  M4 — placeholder caption dropped                    pass=9 fail=2
  DETECTED  M5 — showFallbackList forced false                  pass=9 fail=2

=== RESTORE CHECK ===
  RESTORED — pass=11 fail=0

ALL MUTATIONS DETECTED — the split is load-bearing
```

**Two harness defects were found and fixed while building this proof**, both of
the same class as the "vacuous green" defect the package has rejected work for:

1. **`/(\d+) passed/` matched `Test Files 1 passed (1)`.** An 11-test suite was
   reported as `pass=1` — a number no reader can reconcile with the suite. Fixed
   by anchoring on the `Tests` summary line.
2. **ANSI escapes broke the anchored match entirely.** vitest colourises the
   summary as `Tests \x1b[1m\x1b[32m11 passed` when it thinks it has a TTY, so
   the anchored regex matched nothing and the harness printed **`NOT GREEN` against
   a fully green suite**. Fixed by stripping ANSI before parsing.

The first two mutations I wrote (`STATE_SWATCH` extra key, focus-ring removal)
were then **rejected as invalid mutations** — they edited style internals that no
case asserts on (`grep -c STATE_SWATCH` in the suite → **0**), so "not detected"
was a true statement about coverage, not about the split. They were replaced with
mutations that target what the suite actually exercises.

## 5. Hostile review — what a hostile reader should have attacked, and the answers

| Attack | Finding |
|---|---|
| "Did you trim the reasoning comments to fit?" | No. Every comment in the logic half is byte-preserved. Only styled blocks moved. |
| "Is this a real seam or a line-count cut?" | Real seam: nothing extracted has behaviour. 7 styled declarations, 1 constant record, all pure presentation. |
| "Does anything else import the moved names?" | No. Exactly one consumer, `BrainConstellation.tsx:50`. Grep across `web/src/` returns nothing else. |
| "Import cycle?" | No. `constellation.styles.ts → constellation-layout` is `import type`, erased at build. The dependency graph gained one acyclic edge. |
| "Did you touch the neighbours?" | No. `constellation-chunk/layout/loop/three.ts` and `constellation-gates.test.tsx` hash **identically** to their pre-split values. Only the two intended files differ. |
| "Does the lazy boundary still hold?" | Yes — `constellation-three` is still emitted as its own 521.98 kB chunk, so the split did not accidentally inline the three.js payload into the entry. |
| "Did 141/141 actually pass, or did you report a partial?" | Both states were reported. 11 failed in parallel, 141 passed serially, and the flake was attributed rather than hidden. |

### Residual risk, stated plainly

- **The parallel flake is unowned.** I have shown it is not caused by this change
  and is not fixed by it. Someone should decide whether `--no-file-parallelism`
  becomes the default for this package's `test` script, or whether the
  interference is chased. **Not done here.**
- **The 380-line state was untracked.** `BrainConstellation.tsx` is an
  **untracked** file (`??` in `git status`). It is part of the L1 package's
  disclosed 51-untracked-file blocker. This repair therefore does **not** by
  itself make S5 committable — see §6.
- **Only Rule 4 was checked.** Ban 17 (44×44 controls, *measured in a browser*)
  and ban 18 (contrast ≥4.5:1) are asserted here by nothing. No browser
  measurement was taken. **UNVERIFIED.**

## 6. Commit status

Not committed. The file is untracked and sits inside a tree with ~1,363 dirty
paths across several concurrent workstreams. Landing it requires the isolated-index
technique so that only these two paths enter the commit and no peer's work is swept
in. **Awaiting the operator's go-ahead**, per the standing "do not step on toes"
constraint.
