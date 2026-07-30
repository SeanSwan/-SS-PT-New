# SWAN LENS — WORLD ENGINE · Continuation Handoff (2026-07-29, rev 3)

- **For:** the next agent continuing the 25-World Engine.
- **Branch:** `claude/build-swan-lens` (git worktree at `C:\tmp\ss-build-swan-lens`). **NOT pushed** (batch cadence).
- **Issue:** SWA-69 (Linear). **Program spec:** `AI-HANDOFF/SWAN-LENS-WORLD-ENGINE-MASTER-BUILD-PROMPT-2026-07-28.md`
- **Taxonomy canon:** `references/SWAN-LENS-OS.md`. **World DNA source:** `design-brain/worlds.md`.
- **Read `CLAUDE.md` + `MEMORY.md` first** for the standing rules. This file is self-contained (Rule 48 style).

> **rev 3 supersedes rev 2 (which superseded rev 1).** Rev 1 described 6 built / 19 planned and a pending review.
> All of it is done: **23 of 25 worlds are built**; a 22-round hostile dry-loop reached CLEAN×2; the branch has
> been **REBASED onto `origin/main`** and re-verified, and a second dry-loop covered the rebase itself.
> Everything below is current. Two things dominate what comes next: **§0.2 (two unmerged security fixes this
> branch carries)** and the fact that the push is still Sean's gate.

---

## 0. THE MISSION
Sean directed (2026-07-28): build ALL 25 Swan Lens "worlds" — promote the 25 real style-catalog lens ids from
chrome-only to full `--world-*` `RecipeV2` worlds, "as creative and vivid as possible." Worlds render only in the
Workout Design **Lab** until a Sean-gated rollout flip (Slice 15), so building them is **zero live-user risk**
while `recipeResolution.ts` stays fail-closed.

> **Gate integrity, correctly scoped:** `git diff <session-base>..HEAD -- .../v2/recipeResolution.ts` is EMPTY.
> Do **not** verify this with `main...HEAD` — see §0.1.

## 0.1 REBASE — DONE (2026-07-29). Rebased onto `origin/main` @ `113d7d6e8`; 39 commits replayed.
**`main` moves constantly — it was already 26 commits further along within the hour.** So "0 behind" is true only
at the instant of the rebase; ALWAYS `git fetch` and re-measure before acting. Everything verified below was
verified against base `113d7d6e8`; a later base means re-running §5, not assuming. The pre-rebase state is recoverable via the tag
`pre-rebase-swan-lens-20260729` — resolve it with `git rev-parse pre-rebase-swan-lens-20260729`, do NOT trust a
SHA written here (the pre- and post-rebase tips share a commit SUBJECT, so a naive SHA remap silently rewrites
this line to point at the post-rebase tip — it did exactly that once). Still **NOT pushed** — that is Sean's gate.

> **This branch carries TWO UNMERGED SECURITY FIXES — see 0.2. Pushing it is not just "23 worlds".**

**Local `main` is 567 commits behind `origin/main`.** Never measure with `main...HEAD` from this worktree — it
reports ~2,553 files of phantom "changes" for a 42-file session. Use `origin/main` after a fetch:

```bash
git fetch origin
git rev-list --count HEAD..origin/main      # origin/main ahead of us (0 right after the rebase)
git rev-list --count origin/main..HEAD      # us ahead of origin/main (39, and GROWS with each commit)
git diff --stat origin/main..HEAD           # everything this branch adds
```

**Methodology lesson — a conflict-surface check must cover the WHOLE replay set, not just your own commits.**
Before the rebase this file claimed "conflict-free at the file level", on the strength of a `comm` between *this
session's* 42 files and the 238 `origin/main` touched. Those sets really were disjoint — and the rebase still
conflicted on its FIRST commit, because it replays all 39, including 21 that predate this session. The correct
pre-rebase check uses the full replay range:

```bash
git diff --name-only origin/main...HEAD | sort > /tmp/replay   # ALL replayed commits, not just yours
comm -12 /tmp/replay <(git diff --name-only HEAD...origin/main | sort)
```

The single conflict was a COMMENT in `PrismCapture/prismCopy.ts`. Resolved by taking `origin/main`'s version —
and that resolution is provably LOSSLESS: the BLOB hash (not a commit) is `1eca5bf05` in all three of
`pre-rebase tag`, `HEAD`, and `origin/main`. The pre-rebase branch had already absorbed that exact text through the merge commit
`afc9baec0`, so the rebase reproduced the file the branch was already carrying. The conflict only existed because
the rebase replays the security commit's ORIGINAL patch (pre-rebase SHA `c18a942d8` — deliberately a historical
reference; that SHA is reachable only via the backup tag, not on the branch) against a base that had moved past it. The merge commit
itself was dropped by the rebase, as expected — its content is already in `origin/main`.

**The rebase changed none of this session's work.** Of the 42 files this session touched, the only one differing
between the pre-rebase tag and `HEAD` is this handoff — and only because it was edited AFTER the rebase. Everything
else pre/post is byte-identical, including all five security-fix files (`galleryRoutes.mjs`,
`adminGalleryRoutes.mjs`, the anti-farm migration, its truth test, and `GalleryReferral.mjs`).

> **Pathspec trap, learned the hard way:** `git diff A B -- backend/` is relative to your CWD. Run it from
> `backend/` and it silently matches NOTHING and reports a clean diff. Always run repo-wide git checks from the
> repo root, and sanity-check that a "clean" result can actually produce a dirty one.

**Post-rebase re-verification (Rule 70) — all green ON THE REBASED TREE:** affected vitest 28 files / 311 tests;
standalone tsc over the full world graph clean; vite production build exit 0 (entry chunk 687,220 B); 23 recipe
files intact; `git diff origin/main..HEAD -- .../v2/recipeResolution.ts` is 0 lines.

## 0.2 THIS BRANCH SHIPS TWO UNMERGED SECURITY FIXES
Three of the 39 commits predate the World Engine entirely (SHAs below are POST-rebase) and have been sitting unmerged since **2026-07-22**.
Verified ABSENT from `origin/main` on 2026-07-29:

| Commit | Severity | What is live on prod right now without it |
|---|---|---|
| `e0db0c93a` cap referral credits | **HIGH (money)** | `POST /api/gallery/referral` mints 5 enhancement credits (~$15) per submit. Per-phone dedup is bypassed with a fake phone and the rate limiter is pacing-only, so a visitor can mint **unlimited free paid-enhancement credits**. The anti-farm migration, the `MAX_REFERRAL_CREDITS` lifetime cap and its truth test are all absent from `origin/main`. |
| `f63603e21` reset-test-data guard + PII scrub | **MED (data loss + PII)** | `POST /admin/gallery/reset-test-data` DELETEs every gallery visitor / donation / referral / message row — real CRM and PII — with **no `NODE_ENV` guard and no confirm token** on `origin/main`. |
| `49a6e1126` coach/debate schema-drift patch | doc | Handoff for Codex; no runtime effect. |

Both fixes are already on this branch and reach production the moment it is pushed — an argument for pushing
sooner, not later. Say so explicitly to Sean rather than letting them ride along unannounced.

## 1. CURRENT STATE

**23 of 25 worlds built. 2 are DELIBERATE chrome-only holdouts — not unfinished work.**

`lunar-stack` **and** `blueprint-fold` must stay `planned`. `WorkoutDesignLab.styleAxis.test.tsx` proves two things:
the v1-vs-v2 badge split (needs one still-chrome id, `CHROME_ONLY_ID`) **and** the Compare contract where BOTH panes
are chrome — exact chrome copy, two real scoped stages with independent lenses (needs a second, `CHROME_ONLY_ID_B`).
Rev 1 only recorded the need for one; promoting `blueprint-fold` broke three Compare tests. Both ids are behind named
constants with guard tests, so a future wave that promotes either must pick a fresh holdout or make the Slice-15 call.
**Retiring the chrome-only concept entirely is Slice 15 — Sean's go-live gate, not the agent's.**

SHAs below are **post-rebase as of `origin/main` @ `113d7d6e8`**. A future rebase invalidates them; re-find a
round by its subject instead: `git log --oneline origin/main..HEAD | grep "round N"`.

| Slice | Commit | What |
|---|---|---|
| Master prompt | `f75fa4484` | The 25-world build spec. |
| Slice 1 — engine spine | `7c3739211` | `worlds/` dir: closed `WorldId` union, registry, ledger, generator, CI layers 1–2. |
| W0 — variant vocabulary | `38232bc64` | `variantVocabulary.ts` single source (display 5 / body 4 / surface 5 / collection 5 / action 4 / chart 4 + 4 templates). |
| Wave 1 — 4 worlds | `39d61d740` | aurora-index, crystalline-cathedral, coach-ledger, quiet-meridian. |
| **W0.2 + rounds 1–2** | `fce846db8` | The 2 inert axes made real (see finding 1). |
| **Round 3** | `0b525e8b7` | a11y + data-legibility defects in the new form CSS. |
| **Round 4** | `4793ef8ea` | `worlds/lawA.test.ts` — Law A had zero automated enforcement. |
| **Round 5** | `5986798fa` | `registry.test.ts` layer 2b — cross-surface compilation + chart-less distinctness. |
| **Waves 2–4** | `0c7a7d253` | **17 worlds authored**; catalog derived from registry; `BuiltWorldEntry`. |
| **Round 6** | `6949ef4b3` | `worlds/fontLoading.test.ts` — 15 of 23 worlds asked for unloaded fonts. |
| **Round 7** | `195e3def6` | `worlds/docTruth.test.ts` — headers must match the code. |
| **Round 8** | `abe759a29` | `worldRenderSignature.test.tsx` — distinctness proven at the DOM. |
| **Round 9** | `9af952f29` | `v2/bundleBoundary.test.ts` — worlds were in the main entry chunk. |
| **Round 10** | `1f652df60` | tsc include was too narrow to see round 9's own type errors. |

## 2. ARCHITECTURE MAP
- `frontend/src/adapters/style-lens-swan/worlds/` — the spine. `worldId.ts` (25-id closed union), `registry.ts`
  (`WORLD_REGISTRY`, `BUILT_RECIPES`, `builtWorlds(): BuiltWorldEntry[]`), `ledger.ts`, `recipeShared.ts`,
  `variantVocabulary.ts`, `recipes/<id>.ts` (23 files). Tests: `registry`, `lawA`, `fontLoading`, `docTruth`,
  `variantVocabulary`.
- `frontend/src/adapters/style-lens-swan/v2/` — `labRecipes.ts` (Lab host manifest), `surfaceManifests.ts` (6
  surfaces), `catalogV2Map.ts` (**world entries DERIVED from the registry**), `catalogV2Exemptions.ts` (recipe-free
  metadata the app-wide barrel imports), **`recipeResolution.ts` (THE ROLLOUT GATE — do not touch without Sean +
  the A3 contract test)**.
- `frontend/src/core/style-lens-os/v2/` — brand-neutral core: `compileRecipe.ts`, `recipeV2.ts`, `whatChanged.ts`
  (the distinctness metric), `hostCapabilityManifest.ts`.
- `frontend/src/components/DashBoard/Pages/workout-design-lab/` — `LensPlanFrame.tsx` (the ONLY recipe→DOM
  boundary), `lensRepresentationStyles.ts` + `.surfaceChart.ts` (variant→FORM CSS),
  `concepts/conceptShared.styles.ts` (the `.lens2-*` hooks), `WorkoutDesignLab.styleAxis.test.tsx`.

## 3. LOAD-BEARING FINDINGS (do not relearn these the hard way)

1. **Distinctness is STRUCTURAL, not colour — and every counted axis must RENDER.** `whatChanged` counts 6 axes;
   tokens count ZERO. Two of those axes (`surface.card`, `chart.progress`) had **no DOM hook at all** until W0.2, so
   worlds could clear the ≥3-axis gate while painting nearly identically. `Panel` now carries `.lens2-surface` and
   `ReadinessDial` carries `.lens2-chart` (via `.attrs` className **merge** — callers' grid-area classes must
   survive). `lensRepresentation.coverage.test.tsx` fails the build if any vocabulary variant lacks a form renderer.
2. **Variant CSS may never restate a token-owned property.** Same specificity + later source order means the
   hardcoded value silently OVERRIDES the token for every future world using that variant. Variant rules touch only
   what no token controls (measure, wrap, casing, border width/style, backdrop-filter, clip-path, footprint, ring
   thickness). CI-enforced for display variants.
3. **Measure distinctness on the STRICTEST host, not the Lab.** Five of the six rollout surfaces publish no chart
   slot, so the chart axis degrades on both sides of a pair and the count drops by one. New codewords were solved
   against that conservative 5-axis metric (composition counted only when the DESKTOP template differs).
4. **Check the loader, not the design doc.** 15 of 23 worlds requested a typeface/weight the app never loads.
   **`Sora` is in NO font link** yet is referenced by 515 files repo-wide → **SWA-103 (Sean's call, touches
   `index.html`)**. Worlds now name Sora first with a LOADED face behind it, so they auto-upgrade when it lands.
5. **Two chrome-only holdouts are required** — see §1.
6. **Whole-repo `tsc` OOMs on this box.** Use a standalone tsconfig — and make its `include` the FULL graph
   (`worlds/**`, `v2/**`, the barrel, the touched Lab files). A narrow glob reported "clean" while two real type
   errors sat in files it never opened. Disclose the full baseline as UNVERIFIED (Rule 56).
7. **The app-wide barrel must stay recipe-free.** `adapters/style-lens-swan/index.ts` is imported by every page;
   importing `catalogV2Map` there bundles all worlds into the main entry chunk. Guarded by `v2/bundleBoundary.test.ts`.

## 4. REMAINING WORK
- **The rebase is DONE** (§0.1) — the branch sits on `origin/main` and is re-verified. The remaining push step is
  a `git push` and nothing else, and it is Sean's call. **§0.2 raises the stakes: pushing also ships a HIGH
  money-path security fix and a MED data-loss/PII fix that have been unmerged since 2026-07-22.**
- **Sean-gated (do NOT do autonomously):** the theme-collapse track (Slices 2–6 — touches the LIVE palette);
  **Slice 15** (the all-25 go-live flip + retiring the chrome-only concept); Slice 16 and any dead-code deletion
  (Rule 34); the agent frontier (Slices 17–19); **the push to Render** (Rule 70 — everything stays committed-unpushed).
- **SWA-103** — the font links. Until Sean lands it, worlds render on their fallback faces by design.
- **Optional:** measured layer-3 budgets (Lighthouse/Playwright) are still `measured: null` in the ledger — Slice 8.
- **Optional:** `sanctionedColorways` is `[]` for every world (G1); a wave slice was meant to assign 3–5 each.

## 5. HOW TO RUN THE GATES (cwd `C:\tmp\ss-build-swan-lens\frontend`)
```bash
# Affected + blast-radius tests:
npx vitest run src/adapters/style-lens-swan/ src/components/DashBoard/Pages/workout-design-lab/ \
  src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerLensFrame.test.tsx \
  src/components/WorkoutLogger/WorkoutLoggerLensFrame.test.tsx --reporter=dot

# Standalone tsc — FULL world graph (a narrow include lies):
cat > tsconfig.worlds.json <<'EOF'
{"compilerOptions":{"target":"ES2020","lib":["ES2020","DOM"],"module":"ESNext","moduleResolution":"bundler",
 "strict":true,"jsx":"react-jsx","skipLibCheck":true,"esModuleInterop":true,"noEmit":true,
 "types":["vitest/globals","vite/client","node"],"baseUrl":".","paths":{"@/*":["src/*"]}},
 "include":["src/adapters/style-lens-swan/worlds/**/*.ts","src/adapters/style-lens-swan/v2/**/*.ts",
 "src/adapters/style-lens-swan/index.ts",
 "src/components/DashBoard/Pages/workout-design-lab/lensRepresentationStyles.ts",
 "src/components/DashBoard/Pages/workout-design-lab/lensRepresentationStyles.surfaceChart.ts",
 "src/components/DashBoard/Pages/workout-design-lab/concepts/conceptShared.styles.ts",
 "src/components/DashBoard/Pages/workout-design-lab/LensPlanFrame.tsx",
 "src/components/DashBoard/Pages/workout-design-lab/lensRepresentation.coverage.test.tsx",
 "src/components/DashBoard/Pages/workout-design-lab/worldRenderSignature.test.tsx"]}
EOF
NODE_OPTIONS=--max-old-space-size=4096 npx tsc --noEmit -p tsconfig.worlds.json 2>&1 | grep -E "error TS"
rm -f tsconfig.worlds.json

npm run build        # also the only gate that catches stray backticks in css`` literals
```
Commit with **explicit paths** (never `git add -A`), use `git commit -F <file>` (backticks in a `-m` string get
eaten by bash command substitution — it happened), and **do NOT push**.

## 6. ADDING A WORLD (the checklist that now exists)
1. Author `worlds/recipes/<id>.ts` — codeword must differ ≥3 axes from EVERY built world **on the 5-axis
   production metric** (finding 3). Header must state the codeword (CI-checked against the object).
2. Colour tokens: `var(--palette-token, #fallback)`; bare hex ONLY in `world-panel`/`world-bg`/`world-shadow`.
3. Font: name a family+weight `index.html` actually loads (or put a loaded face behind the aspirational one).
4. Register in `registry.ts` `BUILT_RECIPES`. **`catalogV2Map` derives itself — no second edit.**
5. Update the built/planned counts in `registry.test.ts`. Keep ≥2 chrome-only ids.
6. Run the gates in §5. Nine test files will check the work automatically.

## 7. GUARDRAILS
Law A (chrome stays Crystalline Swan; the world paints only the setting); `var(--token,#fallback)`; retired
Galaxy-Swan hex banned; deterministic compiler + fail-closed resolver preserved; Rule 34 (no delete without grep +
Sean); batch-push (Sean pushes); Dry-Loop to CLEAN×2 + PROOF; every closeout → Hermes memo + Linear SWA-69 update +
dual-tier summary + next-slice; zero PII; files <300 lines; 7-star docs on new files.

## 8. WHAT SEAN CARES ABOUT
Proof before "done"; hostile review until genuinely dry; least clicks/least time; vivid, distinctive, premium design;
honesty about what is proven vs not. He delegated the world CREATIVITY to the agent — build boldly, he taste-cuts
after. He alone flips the go-live gate and pushes to Render.
