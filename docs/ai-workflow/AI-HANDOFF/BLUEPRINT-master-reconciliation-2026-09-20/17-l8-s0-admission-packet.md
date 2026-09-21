# 17 — L8 S0 admission packet: what Astra recommends, and why S1 is still gated

**Slice:** L8 · Swan Theme Lens · S0 (Stabilize the evidence boundary)
**Date:** 2026-09-21, 14:12–14:35 PDT
**Repo:** `C:/Users/BigotSmasher/Desktop/@Everything/quick-pt/SS-PT`
**Branch:** `creator-brains-engine-r2-20260915`
**Base commit:** `6e45e2392f2289f9c48e24d9c7f4dabe1f28c9a4`
**Predecessor:** `16-l8-r61-theme-lens-binding.md` (committed `8a048ff40`)
**Nature:** measurement and admission packet. **No lane source edited.**

---

## 0. The operator's request, and what it can and cannot cover

> *"Let's go ahead and do everything Astro would recommend here. No breaking changes for the Blocks S1 and the Blocks S3. And also what we should be doing next as well."*

Read as: execute Astra's standing recommendations, leave the two operator-owned decisions alone,
and report the next step.

**This packet answers it in one line:** Astra's recommendation is **not** "begin S1." It is
**"freeze the source first"** — and that freeze is S0, whose entry condition is now met while
**S1's STOP is still engaged by the operator decision Sean has deliberately withheld.**

The work below is the admissible part: S0's acceptance has been **re-measured and now passes**,
which is genuine progress on Astra's own order.

---

## 1. What Astra recommends, quoted by locus

| Astra locus | Recommendation | State after this session |
|---|---|---|
| `05-slices.md:16` (S0 STOP) | *"do not advance on a moving source snapshot"* | **Satisfied** — lane frozen, see §2 |
| `05-slices.md:20` (S1 entry) | *"Entry: S0 accepted."* | **NOT met** — S0 acceptance is Fable's, and the freeze decision is Sean's |
| `05-slices.md:28` (S1 STOP) | *"do not advance while clear, denied access, partial write or convergence behavior remains ambiguous"* | **Engaged** — see §3 |
| `05-slices.md:44` (S3 entry) | *"Quiet Chrome/static direction accepted for execution"* | **NOT met** — recorded open in `DECISION-RECORD.md` |
| `06-bans.md:916` | *"No treating the no-install recommendation as Sean's answer."* | **Honoured** — D-1 recorded separately, `three@0.169.0` verified |
| `06-bans.md:924` | *"No browser configuration that starts the production-connected backend."* | **Honoured** — `playwright.theme-lens.config.ts` serves a built frontend only |
| `07-checkpoints.md:11` | dated archive filing + reindex per hostile-review pass | **Satisfied** — R6 filed and indexed (§3 of record 16) |
| `04-build-order.md` | line budgets ≤300 per file | **Not yet binding** — no slice has been entered |

Astra's S3/S4 recommendations are **structural and gated**, not actionable in isolation. Every file
Astra names for S2, S3 and S4 (`themeBootstrap.execution.test.ts`, `useThemeLensTooltip.ts`,
`ThemeLensStatus.tsx`, `ThemeLensPreview.tsx`, `themeLensScene.ts`, `accessibility.spec.ts`,
`contrast.spec.ts`, `motion.spec.ts`, `prepaint.spec.ts`, the four scene/contrast test files) is
**absent from the tree**, and each is entry-gated on the preceding slice's accepted STOP.

So "do everything Astra recommends" reduces, today, to **doing S0 properly** — which is what §2–§5
record.

---

## 2. S0 entry condition: the source is now frozen

`05-slices.md:17` requires *"execution authorized; lane ownership established; no concurrent edits
to owned files."* The third clause was **false** at the 11:52 binding (a peer lane was committing).
It is now **true**, and that is a measurement, not an assumption.

Every one of the 56 bound files was re-hashed and compared against `16-…`'s committed hash set:

| Measure | Value |
|---|---|
| bound at 11:52 | 56 |
| present at 14:15 | 56 |
| **changed** | **0** |
| **gone** | **0** |
| **added** | **0** |

Method: `sha256` over the union of `git ls-files --cached --others --exclude-standard` under
`frontend/src/context/ThemeContext/`, diffed against
`evidence/r61-binding/themecontext-sha256.txt`.

**The lane did not move in 2h23m across a period in which the repo itself advanced 7 commits.**
That is the strongest available evidence that S0's freeze precondition holds.

---

## 3. S0 acceptance: re-measured, and now PASSING

`05-slices.md:12` — *"Acceptance: T0 cases pass; baseline evidence is tied to source hashes."*

### 3.1 T0 — the browser case that had never run

T0 is Astra's *"Reachability: configuration → built application → verified Layout/Header/ActionIcons
→ existing lens. No replacement demo mounts satisfy T0."*

| Test | Result |
|---|---|
| mounts the production header lens | ok, 903 ms |
| opens all registered radios | ok, 935 ms |
| selection causes no API mutation | ok, 4.7 s |

**3 passed, exit 0.** The mounted application loads, the **production** lens mounts (not a demo
fixture), all registered radios open, and selecting a theme mutates no API.

### 3.2 T4 + combined

| Suite | Result |
|---|---|
| `mount.spec.ts` (T0) | 3 passed |
| `persistence.spec.ts` (T4) | 6 passed |
| combined | **9 passed, 16.6 s, exit 0** |

Worth recording: `two pages converge after a real selection` — the case that failed **once in 19**
executions (`D-S1-6`) — passed here in **2.7 s**, inside the normal band, not the ~25× outlier.

### 3.3 The two non-browser baselines

| Command | Result |
|---|---|
| `NODE_OPTIONS=--max-old-space-size=8192 tsc --noEmit --incremental false -p tmp/tsconfig.themelens-lane-only.json` | **exit 0** |
| `vitest run src/context/ThemeContext/` | **20 files, 161 tests, 0 failed, 5.08 s** |

**D-2's corrected command forms are confirmed working**, both of them. `tsc` without the
`NODE_OPTIONS` prefix OOMs at ~4 GB (exit 134); with it, exit 0.

### 3.4 The build

`vite build` — **exit 0, ✓ built in 27.38 s**, after renaming `dist` aside per D-2 (the safe-delete
shim refuses `emptyDir` at its 50-target threshold).

Two chunks relevant to S4's admission gate are already split: `three.module.WAXnx5F7.js`
(471.02 kB / gzip 118.61 kB) and `swan-mark.mesh.DH1ehJjj.js` (297.21 kB / gzip 90.07 kB).

**Baseline artifact:** `evidence/r61-binding/s0-baseline-2026-09-21.txt`, tied to base commit
`6e45e2392`.

---

## 4. A blocker encountered and cleared: the Playwright transform cache DACL

The first T0 attempt failed with `EPERM` on
`…/Temp/playwright-transform-cache/28/28f08fbe00_…_playwrightthemelensconfig.map`.

**This is the third independent instance of one defect, and it is worth naming as a class:**

| Instance | Affected | Symptom |
|---|---|---|
| earlier session | `node_modules` (74,042 files) | A7 suite could not run |
| earlier session | S0 manifests | both manifests read as empty |
| **now** | Playwright transform cache (564 files) | Playwright could not start |

**Mechanism, restated:** the directories carry `(OI)(CI)(F)`. But `(OI)(CI)` propagates only to
**newly created** children — never to children created *before* the ACE. Every **file** ends up with
an **empty DACL**, which denies everyone, and **`icacls` prints no principal at all** for such a
file. A recursive `icacls /grant … /T` therefore reports *success on every file* and changes nothing.

**Diagnostic signature — how to recognize it:**

```
$ icacls "$cache/28"                        # directory: has principals
   …\28 NT AUTHORITY\SYSTEM:(OI)(CI)(F)
         DESKTOP-O9FEC42\BigotSmasher:(OI)(CI)(F)

$ icacls "$cache/28/somefile.map"           # file: NO principals, then "Successfully processed"
   …\28f08fbe00_…_playwrightthemelensconfig.map
   Successfully processed 1 files; Failed processing 0 files

$ node -e "fs.writeFileSync(file,'x')"      → EPERM open
$ node -e "fs.readFileSync(file)"           → EPERM
```

**The fix that works — order matters:**

```bash
icacls "<dir>" /inheritance:e      /T /C /Q     # FIRST — re-enable inheritance
icacls "<dir>" /grant "$USERNAME:(OI)(CI)(F)" /T /C /Q   # THEN — grant
```

**Result this time:** both steps reported **731 files, 0 failed**; the previously-denied file's ACEs
are now all `(I)` (inherited); overwrite probe `OK`; **564/564 reads OK, 0 failures**.

The `/grant` step alone would have failed silently — this is the whole reason `/inheritance:e` must
come first, and it is the same lesson the `node_modules` repair taught.

---

## 5. Why S1 must not start yet — the STOP is real, not procedural

The operator asked for **no breaking changes for the S1 blocks**. That request and Astra's S1 STOP
point the same way, and it is worth being precise about why.

**S1's entry is `S0 accepted` (`05-slices.md:20`).** S0's acceptance is a checkpoint verdict, and
`07-checkpoints.md:10` assigns that verdict to *"the assigned reviewer"* while **Rule 46 makes Fable
the final decider.** Neither is this seat. I can supply the measurement (§3) but I cannot grant it.

**S1's STOP (`05-slices.md:28`) is independently engaged by unresolved semantics**, and these are
exactly the "breaking" surfaces the operator wants undisturbed:

| Unresolved | Astra locus | Why it blocks |
|---|---|---|
| state-to-recipe contrast pairing | R6 HIGH, `ASTRA-REPLY-R6.md:90-96` | a guard blind spot: swapped backgrounds drift to **4.264985:1** against a 4.5:1 requirement |
| directory discovery bounded to top-level `ThemeLens*.styles.ts` | `…:96` | colour-bearing styles can silently escape the measured inventory |
| storage-area test vacuity | R6 MEDIUM N2 | test passes **after its guard is removed** |
| clear/removal convergence to fallback | R6 MEDIUM N3 | `useCrossTabThemeSync.ts:84-110` never applies the fallback for absent/invalid values |
| one unexplained T4 failure | `D-S1-6` | 1 in 19 runs; unexplained and non-reproducible |

Astra's fix list for the first four names files **S1 owns** (`themeContrastInstrument.ts`,
`themeContrastSites.ts`, `useCrossTabThemeSync.ts`, `themeCrossTab.test.tsx`). Starting S1 without a
freeze would put those edits onto a tree whose identity `HEAD` still cannot express — the exact
defect L6 S0 and this S0 both exist to remove.

**Conclusion: S1 is correctly not started.** Not because of ceremony — because the operator asked
for no breaking changes, and the freeze is what makes that enforceable.

---

## 6. The one thing that would unblock S1

Not a code change. A **decision**, and it is a two-option choice with a stated recommendation.

### The question

`frontend/tmp/` is gitignored (`.gitignore:146`). The lane's source of record is therefore a
**manifest inside a gitignored directory** — the preservation reference is itself unpreserved
(record 16, §6). S0's action #1 is *"Preserve exact dirty source and existing R5/R6 artifacts; verify
snapshot hashes."*

**Option A — commit the 51 untracked lane files** as S0's stabilized source of record.
- *For:* `HEAD` regains the ability to answer "what changed"; S1 diffs become meaningful; `D-S1-5`'s
  baseline-surface problem becomes tractable.
- *Against:* 51 files of theme-lens WIP enter the branch at once, in a lane whose owner is Sean.

**Option B — preserve by manifest-copy**, lifting the harness artifacts (both manifests, the
generator, both ASTRA replies, `FINDINGS.md`, the lane tsconfig) out of `frontend/tmp/` into a
tracked evidence path, and leaving the 51 source files untracked.
- *For:* small, reversible, no source enters git; directly repairs §6's finding.
- *Against:* `HEAD` still cannot express the lane's identity, so S1's diffs stay unreadable.

**This seat's recommendation: do both, in that order — A then B.** They solve different halves.
Option A fixes *source* identity (what S1 needs); Option B fixes *evidence* durability (what the
audit trail needs). Neither is a substitute for the other, and B alone leaves S1 unworkable.

I have **not executed either.** They are the operator's call, and doing A without authorisation would
be exactly the "breaking change to S1's blocks" the operator asked me to avoid.

---

## 7. What to do next — Astra's order, with honest states

Astra's execution order (`L6 S0 → L4 S5–S8 → L8 R6.1 → L1 A → L3 Phase 1 → L2 harness → L5 email →
L7 Phases 0–2 → L6 remaining slices → L1 B1 → L1 B2 → final M3`):

| # | Slice | State | Evidence |
|---|---|---|---|
| 1 | **L6 S0** | ✅ deliverable committed | `e17dc3c9a`; checkpoint **PENDING** (operator/Fable) |
| 2 | **L4 S5–S8** | ✅ deliverable committed; **last finding now closed** | `fef2da48d`; **R5-08 closed by peer `fa1744e93`** |
| 3 | **L8 R6.1** | ✅ binding committed; **S0 acceptance re-measured PASSING** | `8a048ff40`; this record |
| 4 | **L8 S0** | ⏸ **admissible part DONE; freeze decision is the operator's** | §2–§5 |
| 5 | **L1 A** | ⬜ next in order, **not yet started** | — |

### Note on R5-08 — it closed while this record was being written

`fa1744e93 refactor(tests): split three over-budget suites — R5-08`. Peer lane. The 417-line suite
was split along natural seams into six files with two shared harnesses
(`bridgeSpotlightHarness.mjs`, `coachSignalHarness.mjs`), +543/−362. **`ban #50`'s 300-line cap is
respected by extraction, not by trimming reasoning from comments** — the package's own stated
precedent. L4 has **no open findings** as of this record.

### The immediate next step, stated plainly

**L1 A is next in Astra's order and is not blocked by anything in L8.** It requires no L8 decision.
If the operator wants forward motion that does not touch S1 or S3, **L1 A is where to go** — and I
would start there while the two L8 decisions wait.

The L8 decisions need only be taken **before L8 S1 resumes**, which is not the same as next.

---

## 8. Restraint — what this packet did NOT do

1. **No lane source edited.** All 56 files byte-identical; §2 proves it.
2. **No S1/S2/S3/S4 work started.** Not one of Astra's ~30 named slice files was created.
3. **No lane source committed.** The 51 untracked files remain untracked — Option A is the
   operator's decision, not mine.
4. **No acceptance verdict issued.** Rule 46 assigns it to Fable.
5. **No `git add -A`.** No staging.
6. **No file deleted.** `dist` was renamed aside, never removed; the transform cache was **repaired
   in place**, not deleted, so no cache data was lost.
7. **No new dependency.** `three@0.169.0` verified installed; D-1 honoured.
8. **`dist.pre-s0-1413` left on disk** rather than cleaned, because deleting it is not this seat's
   to decide and the safe-delete shim correctly guards the threshold.

### One incidental observation, recorded not acted upon

The frontend directory holds **10+ `dist.stale-*` / `dist.pre-*` directories** left by other lanes
(≈ hundreds of MB). That is real disk pressure and worth a cleanup — but `06-bans.md` forbids
*"unrelated cleanup while executing these slices"*, so it is **named here and deliberately not
touched.**

---

## 9. Observation log

| Time (PDT) | Action | Result |
|---|---|---|
| 14:12 | Repo state read | HEAD `6e45e2392` — **moved from `8a048ff40`** by a peer lane |
| 14:13 | Stale index found | 10 entries, incl. `D` on files present in `HEAD` → cleared |
| 14:15 | Lane freeze verified | 56/56 hashes match 11:52; **0 changed** |
| 14:18 | Astra Part B read | S0–S4 file lists extracted; S3/S4 files confirmed absent |
| 14:20 | R5-08 inspected | closed by `fa1744e93`, split 1→6 files |
| 14:22 | Build attempt | first `dist` renamed aside (D-2); **build exit 0, 27.38 s** |
| 14:24 | T0 first run | **EPERM** — transform cache DACL |
| 14:26 | Root cause | empty DACLs on all 564 cache files; even reads denied |
| 14:28 | Repair | `/inheritance:e` then `/grant` → **731 files, 0 failed** |
| 14:30 | Repair verified | overwrite OK; **564/564 reads OK** |
| 14:31 | T0 re-run | **3 passed, exit 0** |
| 14:33 | Full lane suite | **9 passed, 16.6 s, exit 0** |
| 14:34 | B2 type-check | **exit 0** (D-2 corrected form) |
| 14:35 | Unit suite | **20 files, 161 tests, 0 failed** |
