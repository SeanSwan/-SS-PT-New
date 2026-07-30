# Swan Lens World Engine — 22-round hostile dry-loop (DRY) + Waves 2-4 (SWA-69)

- **Surface:** Workout Design Lab / Style Lens OS v2 (`frontend/src/adapters/style-lens-swan/`)
- **Branch:** `claude/build-swan-lens` (git worktree). **Committed, NOT pushed** — batch cadence, Sean pushes.
- **Agent:** terminal Claude (Opus 5, 1M). **Provenance: sub-Fable — quarantine only, NOT the learning corpus (Rule 68).**

## What changed
23 of the 25 Swan Lens "worlds" are now built (was 6). Two stay chrome-only on
purpose. The production rollout gate (`recipeResolution.ts`) is UNTOUCHED and
still fail-closed, so this is zero live-user risk until Sean's Slice-15 flip.

## The lessons worth carrying (not the diff — the reusable ones)

1. **A metric can grade its own homework.** The distinctness gate counted 6 axes,
   but 2 of them (`surface.card`, `chart.progress`) had no rendering hook at all —
   two worlds could clear a "≥3 axes different" bar while painting nearly
   identically. Rule of thumb: **before trusting a quality metric, prove each
   input it counts has an observable effect.** The fix that made it honest was a
   DOM-level test that renders every variant and diffs what actually lands.

2. **A guard that reads the wrong channel passes vacuously.** A render test read
   design tokens off the inline `style` attribute; they are compiled into a CSS
   class, so it read zero properties and all its uniqueness checks passed by
   comparing empty objects. **Every guard now carries an anti-vacuous assertion**
   ("I found at least N inputs before I compared anything"). That single habit
   caught the bug in the guard itself.

3. **"tsc clean" is only as honest as the glob.** A standalone tsconfig with a
   narrow `include` reported clean while two real type errors sat in files it
   never looked at. State the SCOPE alongside any green verdict.

4. **Intent is not reality — check the loader, not the design doc.** 15 of 23
   worlds requested a typeface or weight the app never loads (`Sora` is
   referenced by 515 files repo-wide and is in NO font link). Browsers fall back
   silently: no error, no warning, no failing test. Same class as an ORM field
   that does not exist in the DB. **Assert against the real loader.**

5. **An import for metadata can drag a whole feature onto the critical path.**
   The app-wide adapter barrel imported a recipe map to read one boolean per id —
   bundling all 23 Lab-only worlds into the main entry chunk every visitor
   downloads. Splitting the metadata out cut that chunk by 22.8 kB raw / 2.56 kB
   gzip. **When a shared barrel imports something heavy, check what it actually
   reads.**

6. **The round that applied a fix is the next round's best target.** Rounds 3,
   10, 13, 17 and 20 each attacked the immediately preceding fix and found real
   defects in freshly written code — a11y bugs, type errors, a corrected doc that
   still contradicted its own CLI, a marker inserted in the wrong place, and a
   number that went stale the moment it was committed. Never treat your own last
   patch as verified.

7. **Read the tool, then RUN it.** Reading the world generator found two defects.
   Executing it found a third that reading had missed: the fix had corrected the
   file header but left the CLI printing the opposite guidance.

8. **Check the baseline before trusting the diff.** Local `main` was 567 commits
   stale, so every `main...HEAD` measurement was against a phantom baseline and
   reported ~2,553 changed files for a 42-file session. The standing
   "verify branch freshness first" law existed; it took 18 rounds to apply it.

9. **A number in a doc is a liability.** The branch-ahead count went stale on the
   very next commit. Docs should carry the COMMAND and stamp the measurement,
   not just the answer.

## Owed to Sean (blocking nothing today)
- **SWA-103 (High):** add the missing font links to `index.html`. Repo-wide, and
  it changes network/FOUT on every page, so it is his call. The worlds already
  degrade deliberately and auto-upgrade the day it lands.
- Push to Render, the Slice-15 go-live flip, and the theme-collapse track remain
  Sean-gated and untouched.
- **The branch has DIVERGED**: `origin/main` is ~98 commits ahead, this branch
  ~39 ahead. Zero file overlap (verified), so the rebase is conflict-free at the
  file level — but Rule 70 requires rebase-then-re-verify before any push.
