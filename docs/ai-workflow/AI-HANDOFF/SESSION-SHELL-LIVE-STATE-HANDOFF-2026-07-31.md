---
decision: "SESSION SHELL live-state handoff — the rebuilt workout logger as shipped (4 batches, live), its laws, gotchas, and the fix-loop protocol for Sean's bug reports"
status: open
supersedes: docs/ai-workflow/AI-HANDOFF/SESSION-SHELL-HANDOFF-2026-07-30.md (the build plan — now executed)
---

# WORKOUT LOGGER — SESSION SHELL LIVE-STATE HANDOFF (2026-07-31)
> **For a fresh session:** Sean has seen the LIVE rebuilt logger and has bugs/changes to report. Read this top to bottom, then take his reports one by one under §6's fix-loop. This doc is self-contained — you do not need the build-plan history.

## 1. What shipped (all LIVE on production, chunk-verified)
Four batches, `eb8e9bb52..36318f0bb → main`, all deployed and live-verified (last served chunk checked: `WorkoutLogger.DETnQT-u.js`):
- **Batch 1 (Slices 0–6):** the 17-section logger page became a SIX-ZONE staged shell.
- **Batch 2:** rest `endsAt` rides the draft (reload-resume); 1440px shell column cap on 2560/3840.
- **Batch 3 (hardening):** per-zone error boundaries, live volume·elapsed clock, tablist arrow keys, Receipt PR strip, "Finish workout" all-done primary, 15ms log haptic, React.memo on chrome.
- **Batch 4 (floor tools):** plate math under the weight keypad, in-session PR toast (hand-log-gated), one-tap 40/60/80% warm-up ramp, per-exercise trend chip, superset ⛓ rail chaining, session clock in draft.
Tests: **669/669** (108 files). Board: **SWA-100** (full per-batch comments).

## 2. The architecture (where everything lives)
Host: `frontend/src/components/WorkoutLogger/WorkoutLogger.tsx` (~874 lines; extraction test pins <875 — if you push it over, EXTRACT a hook, never raise the pin).
Shell: `frontend/src/components/WorkoutLogger/runner/shell/`
- `zones/` — `ContextBar` (sticky status: client·date·signal·plan chip→PlanContextSheet w/ OPT phase·volume·elapsed·`ContextOverflow` ⋯ menu w/ Cancel/PDF/summary-lock) · `NoticeLane`+`ShellNotices` (ONE notice, priority offline10>draft20>schedule30; overlay = zero layout shift; draft Restore/Discard transplanted verbatim + rest/clock re-anchor) · `StageRail` (Setup·Train·Finish free tabs, arrow keys, dots never gold) · `ActionBar` (persistent mic+coach · center = rest state or meter · ONE stage-aware primary; z-index 80 so the keypad sheet at z-90 absorbs it) · `CoachDrawer` (Coach|Reference tabs, lazy) · `ReceiptPRStrip`
- `primitives/` — `Sheet` (focus trap/return, ESC, ONE history entry, popstate close) · `StageCanvas` (per-stage scroll memory, focus→h2, aria-live announce) · `ShellZoneBoundary` (zone crash → quiet degrade; ActionBar fallback = bare Save)
- `recipes/` — `RecipeConfig` DATA (M4): core 4 wired (Ledger Pro = segmented rail + expanded stats; others = tabs + collapsed)
- `useSessionStage` (stage=VIEW ≠ phase=lifecycle; `switchSessionStage` saves scroll pre-swap) · `sessionTools` (plateBreakdown/buildWarmupRamp/diffNewPRs — pure) · `useSessionPerks` (usePRToast w/ 5s hand-log gate; useWarmupRamp)
Engine: `runner/useRunnerEngine.tsx` + `RunnerEngine.types.ts` — rows grew OPTIONAL `onInsertWarmupRamp` + `getTrend`. Skins: FocusFlow (default; NOW panel + trend chip + ramp button + ⛓ rail), Classic, LedgerPro, SheetStack. **Skins render ZERO rest controls** (conformance law) — rest lives in the ActionBar only.
Rewritten host hooks: `useRestTimer` (endsAt-absolute + visibilitychange reconcile), `useScreenWakeLock`, `useWorkoutDraft` (+`restEndsAt`, `sessionStartedAt`), `useProtocolSelections`, `useGhostPreFill` (+`trendCache`/`getTrend`).
**DELETED (never re-mount):** WorkoutLoggerHeader, ScheduledSessionStatusBanner, WorkoutDraftGateBanner, WorkoutLoggerFooter, StickyLogActionBar, FloatingRestTimer, TimerFAB.

## 3. The LAWS (test-enforced — breaking one fails the suite)
- **LAW 0:** assigned-session cold load → Train selected, zero sheets, first incomplete set's log control on screen, ONE tap commits (`shell.law0.tap-budget.test`).
- **Save contract:** POST `/api/workout-forms` body byte-pinned (`shell.save-path.canonical.test`) — billing-sensitive; NEVER alter the payload shape.
- **M3 anti-jump:** zero `scrollIntoView` / `scroll-behavior:smooth` / `window.scrollTo` across `runner/**` (static ban); scroll restores are instant `scrollTop` assignments; sheets push ONE history entry; stage changes push NONE.
- **M2:** stage is free/non-gating; storms preserve drafts (page-proven).
- Token law: gold=earned ONLY (PRs/saved), purple=Coach ONLY, `--world-accent`=active; no raw colors outside `var()`/`color-mix`; ≤300-line files; 44px targets; computed WCAG ≥4.5:1 per recipe; reduced-motion guards.
- PR toast: ONLY a set hand-logged within 5s may celebrate — bulk arrivals (draft restore/plan load/AI prefill) re-baseline silently.

## 4. Hard-won gotchas (each cost real debugging time)
- `cd frontend` (IN THE WORKTREE) for ALL vitest runs — the repo root AND the wip main tree both resolve wrong configs. tsc: `NODE_OPTIONS=--max-old-space-size=16384 npx tsc --noEmit`, check REAL exit code.
- Worktree: `C:/tmp/ss-workout-os-audit-20260729`, branch `claude/session-shell-20260730` (deps installed). Rule 67: read `.ai-workflow/coordination/*.lane.md` first — Bootcamp-V2 Claude + Codex sessions run in parallel.
- Meta-tests source-lock WorkoutLogger.tsx (draftGate.contract, clientRoute, themeBridge, protocolSections, ActionButtons.typeContract, extraction<875, styleExtraction) — renaming/moving pinned symbols means updating the pin WITH its intent preserved, in the same slice.
- Python heredocs via bash MANGLE backslash escapes (`\r`,`\n`,`\b` become control chars) — write regex-bearing test code with the Write/Edit tools or `String.fromCharCode`, never bash-heredoc python string surgery.
- A linter auto-normalizes on save; files change under you — re-grep before re-editing.
- jsdom: interval-driven React state needs `act(() => vi.advanceTimersByTime(...))`; full-logger mounts need the submitSuccess mock harness (copy it — AuthContext/api.service/ghost/rolodex mocks).
- Incomplete-set save gate is `weight===0 && reps===0` per set — warm-up sets (weight>0, reps 0) pass by design.
- **Render deploy stall pattern:** if the chunk-walk shows a stale bundle ~2× normal deploy time, DON'T idle-poll — push the next ready batch (a fresh deploy supersedes the stuck one; it worked live) and flag Sean's dashboard in parallel. Deploy proof = walk `index.<hash>.js → UniversalDashboardLayout → WorkoutLogger.<hash>.js`, grep a marker you shipped, `/health` 200×2. Tell Sean to hard-refresh (service worker).

## 5. Known residuals (documented, NOT bugs)
Sheet Stack detent rail + Ledger Pro edge-tab coach render as tabs/bar (primitives pending) · M3 100dvh one-scroll-container lock deferred (CAUTION: styleExtraction pins the embedded logger must NOT force nested viewport height — design around the dashboard embedding before attempting) · Labs 7 recipes gated (`shipped:false`; Circuit Relay BLOCKED until the engine gets `group {kind, rounds}`) · rolodex upgrade (plan §4.7: media previews, NASM filters, pain-excluded-with-reason, Plan tab) not started · ModeBar Quick/Detailed + LearningModeToggle still on-page pending Sean's Lens-preference placement call · trend chip needs ≥2 past sessions and skips self-mode (ghost fetch is skipped there) · elapsed clock does not back-date on restore-without-anchor (starts at next logged set).

## 6. THE FIX-LOOP for Sean's bug reports (mandatory per report)
1. **Reproduce first** — Canonical Surface Receipt (rule 26) for any UI/data-truth claim: route → mounted JSX → hook → API string → backend route → model fields, file:line. A report is `[HYPOTHESIS]` until reproduced.
2. Targeted failing regression test FIRST when feasible (Bugfix standard), in the shell test idiom (`runner/shell/shell.*.test.tsx`).
3. Fix root cause; sibling-sweep parallel surfaces (rule 20, with the literal grep shown).
4. Hostile dry-loop per fix until CLEAN×2; gates per slice: affected vitest → full `src/components/WorkoutLogger/` (669+) → tsc → `npm run build` → Rule 42 → secret scan.
5. Commit per fix, push ONCE per batch (Rule 70), rebase if main moved + re-verify, chunk-walk the deploy, post SWA-100.
6. Closeout: `PROOF:` line + `DRY-LOOP: CLEAN×2 (rounds: N)` + next-slice recommendation (rules 60/73).

## 7. Also open in the repo (don't collide)
Google Account Linking Fable final-decider gate (review-queue, Codex worktree `C:/tmp/sspt-google-linking-20260730`) · Bootcamp Creator V2 (other Claude session, `shared/bootcamp-core/**`, SWA-105) · Codex launch-core audit (read-only).
