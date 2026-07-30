---
decision: "SESSION SHELL HANDOFF — full-page logger remodel, 10 Lens-switchable page recipes on 6 zones / 3 free stages; consult-ratified (Kimi+Opus5, Fable synthesis); ready for a fresh build session"
status: open
supersedes: none
---

# SESSION SHELL — COMPREHENSIVE BUILD HANDOFF (2026-07-30)
> **For a fresh session:** this doc is self-contained. Read it top to bottom, then execute §8. You are the builder AND hostile reviewer (Rules 17/61/73). Everything here was ratified by a paid consult panel (Kimi K3 + Opus 5) with Fable as Final Decider — do not re-litigate the mandates; DO hostile-review the implementation.

## 1. Mission (Sean, verbatim intent)
The ENTIRE workout-logger page — not just the exercise list — becomes **10 sharp, ultra-professional, Lens-switchable page designs**. "Completely rethink the workout logger but do not forget what we had so we can build off of it… when I click buttons I don't want the browser jumping all over the place to different sections… easy to see, easy to use, straight to the point." iPhone-X-class first. Build ON the shipped runner architecture; never regress it.

## 2. What is ALREADY LIVE (build on it, never discard)
All in `frontend/src/components/WorkoutLogger/runner/` (main, deployed):
- **Engine**: `useRunnerEngine.tsx` — assembles contract from WorkoutLogger state: `{exercises, renderExerciseCard(i), stats, rest{isRunning,secondsLeft,stop,extend}, openRolodex, rows{onUpdateSet,onRemoveSet,onAddSet,onRemoveExercise,onSetLogged,getOverload,getLastWeight}}` + `renderClassicList` + `renderQuickLog`. Types: `RunnerEngine.types.ts` (logged truth = `reps > 0`, the sessionStats/server contract).
- **4 live skins**: `FocusFlowSkin` (default), Classic (host render), `LedgerProSkin` (composes `ExerciseSetRowComponent` directly), `SheetStackSkin` (visualViewport-aware sheet). 7 Labs styles registered `shipped:false` in `runnerStyles.ts` (registry + localStorage store `ss.runner.style.v1` + `useRunnerStyle` via useSyncExternalStore).
- **`RunnerCollection.tsx`**: style switch point; error boundary → Classic fallback; owns quick-log precedence (Quick renders under Classic only).
- **`RunnerEmptyState.tsx`**: zero-exercise hero (style-aware kicker, Add + Use today's plan CTAs).
- **Swan Lens integration**: Appearance Studio (`context/ThemeContext/AppearanceStudio/AppearanceStudioPanel.tsx`) has a **Runner tab**; skins consume `--world-accent` via `styles/train-tokens.ts` (`TRAIN.pending/active/done/coach/pr` — gold=earned ONLY, purple=Coach ONLY).
- **Conformance harness**: `runnerConformance.test.tsx` — parametrized mount/rolodex/rest per skin, swap-storm, static law (no raw colors outside var()/color-mix, ≤300-line files, reduced-motion guard), key-collision regression.
- Host: `WorkoutLogger.tsx` (873 lines; extraction test pins <875) renders ~17 stacked sections (§4 table). Suite: **562 tests / 95 files green**. Save path: POST `/api/workout-forms` — canonical, billing-sensitive, DO NOT alter payload.

## 3. RATIFIED ARCHITECTURE (consult-locked; the mandates)
**LAW 0 — "Train-first, two taps" (Kimi) / "Zero-Nav First Set" (Opus M1):** cold load lands on **Train**; with an assigned plan, first set commits in **≤2 taps, 0 stage changes, 0 sheets**. Any recipe/zone/interaction violating this is cut. Enforced by a per-recipe harness metric.

**M2 — Stage ≠ Phase.** `stage: setup|train|finish` is a free VIEW (non-gating, re-enterable, dots-not-checkmarks — and dots are NEVER gold). `phase: draft|active|saving|saved` is the lifecycle. Never conflate. Landing default = Train, always. Setup pre-resolves (location last-used, plan from schedule) into a one-line chip; the Setup stage exists for exceptions.

**M3 — One scroll container.** Shell root `height:100dvh; overflow:hidden`; the stage canvas is the ONLY scroller; `overscroll-behavior:contain`; **zero `scrollIntoView` / `scroll-behavior:smooth` anywhere in shell code** (static-ban in the harness). Anti-jump by structure.

**M4 — Recipes are DATA.** `RecipeConfig` objects override chrome/arrangement only — never zone count, zone semantics, primary-action count, copy, or tap budget. Type-enforced.

**M5 — Protocol sections become PHASE BANDS.** Warmup / Work / Balance-Core / Cooldown render as bands INSIDE the runner collection (collapsible, default state plan-driven; skipped warmup = empty band, never a nag). Deletes `CompactProtocolSection` ×3 as page sections.

**M6 — Rest timer goes `endsAt`-absolute** (epoch ms in the engine, derived display, `visibilitychange` reconcile, persisted in draft) + Screen Wake Lock during Train. The current tick-based v1 dies on backgrounding — this is a real bug to fix in the shell slice.

**M7 — No slice both moves DOM and changes logic.** The only rule that keeps 562 tests honest through a strangler migration.

### The SIX zones (every recipe arranges the same six)
1. **Context bar** (sticky, 44px): client · date · plan chip ("Home gym · Push A · 6 exercises · change" → plan sheet) · mini rest-timer status · elapsed/volume (2 numbers max) · overflow (Cancel session, Export PDF, Guide) · Finish/Save entry. *Status lives here; controls live in the action bar.*
2. **Notice lane** (NEW — Opus): fixed 36px lane under the context bar, **max ONE notice**, priority queue `offline/save-failure > draft-gate > schedule-mismatch > billing > tip`, dismissible, never shifts layout. Absorbs ScheduledSessionStatusBanner + WorkoutDraftGateBanner + offline/billing banners.
3. **Stage rail**: Setup · Train · Finish as free tabs/dots (recipe decides form: tabs / segmented / sheet-detents).
4. **Canvas** (the only scroller): stage content. Train canvas = the EXISTING runner skin + phase bands + stats strip (collapsible 1-line). Per-stage scroll memory; reset-to-top only on FIRST entry; `aria-live` announce + focus to canvas `h2` on swap.
5. **Coach**: NOT a persistent dock — one purple entry affordance (action bar) → ONE drawer (dictation + commands + NASMPhaseGuide as a Reference tab) + **inline proposal cards rendered ON the exercise they affect** (this is the coach-not-chatbot move). AI_* event family unchanged.
6. **Action bar**: merges footer + StickyLogActionBar + skin thumb bars + TimerFAB, with carve-outs: **persistent segment** (rest chip + coach toggle, never unmounts) + **stage segment** (ONE primary + ≤2 secondaries; stage-aware: Start / Log set / Save). **Rest is a STATE of the bar** (~96px: 3-feet-readable countdown + Skip/+15s, primary retargets to next set). **Keypad absorption**: when the L2 numeric sheet is up, the bar is REPLACED by the keypad's commit — never double-stacked. Destructive/rare actions (Cancel, PDF) live in the context-bar overflow, never next to Log.
   **Terminal state — `Receipt`** (not rail-navigable): post-save summary/PR/streak/share/schedule-next; replaces SaveSuccessPanel placement (reuse its components + existing handoff mount).

### Disposition table — ALL 17 current sections (Kimi C2: nothing silently dropped)
| Today | Disposition |
|---|---|
| WorkoutLoggerHeader | Context bar (client/date) |
| ScheduledSessionStatusBanner | Notice lane |
| WorkoutDraftGateBanner | Notice lane (draft-gate behavior unchanged) |
| ActivePlanContextStrip (+plan-outcome panel) | Context-bar plan chip + popover; empty-plan panel → Train empty canvas |
| EquipmentProfilePicker | Setup, pre-resolved chip (last-used); full picker on tap |
| WorkoutLoggerCoachTerminal ("Ask Coach" + quick actions) | Coach drawer (merged with dictation strip — ONE Coach surface) |
| SessionStatsBar | Context bar (2 numbers) + full stats in Finish canvas |
| ModeBar (Quick/Detailed + offline + rest) | Quick/Detailed → Swan Lens Runner-tab preference; offline → Notice lane; rest → action bar |
| LearningModeToggle | Swan Lens preference (set once, not page chrome) |
| NASMPhaseGuide | Coach drawer → Reference tab (lazy) |
| CompactProtocolSection ×3 | DELETED → phase bands in runner collection (M5) |
| WorkoutPlanAssignmentPicker + LoadPlanRow (3 affordances) | ONE "Session source" control in Setup (Plan/Repeat/Template/History/Blank) + same control as a sheet from Train's empty canvas + a Plan tab inside the add/rolodex sheet (session-level vs exercise-level seam) |
| Search&Add + Dictate + Rolodex | Add sheet (rolodex) unchanged behavior; Dictate lives in Coach drawer + action-bar mic |
| Exercise collection (runner skins) | UNCHANGED — the Train canvas |
| SessionSummaryForm (intensity/notes) | Finish canvas (editable from Train via Save flow; never blocks save) |
| SaveSuccessPanel + handoff | Receipt terminal state (reuse components) |
| StickyLogActionBar / Footer / FloatingRestTimer / TimerFAB | Action bar (persistent + stage segments); floating timer retired |

### Anti-jump law set (write tests before code — Kimi Q3 verbatim)
Focus: every sheet/drawer/keypad stores `activeElement` on open, restores on close, traps while open, ESC closes. Canvas swap: focus→canvas h2 (tabIndex -1) + `aria-live="polite"` announce. Per-stage scroll memory. Stage changes push NO history; sheets push ONE entry (mobile back closes the sheet, not the page). Dirty Finish fields: stage-switch allowed (state persists); unload/style-swap ride the existing draft gate. Reduced-motion: canvas swap = hard cut; sheets = opacity-only; accordions animate max-height/grid-rows only and never reflow content above. Plan swap mid-session = **diff with preview** ("keeps 3 logged · adds 4 · removes 2 unlogged") — logged sets are never destroyed.

### File architecture (Kimi; enforces 300-line law)
```
runner/shell/
  SessionShell.tsx           ≤120 — zone orchestration only
  zones/ ContextBar.tsx ≤200 · NoticeLane.tsx ≤120 · StageRail.tsx ≤150 · ActionBar.tsx ≤200 · CoachDrawer.tsx ≤250
  primitives/ Sheet.tsx (focus trap/return + history entry) · StageCanvas.tsx (scroll memory + aria-live + reduced-motion swap) · Accordion.tsx (in-place)
  recipes/ types.ts (RecipeConfig) · focusFlow.ts · classic.ts · ledgerPro.ts · sheetStack.ts · …Labs — CONFIG ONLY, ≤150 each, token refs only (harness rejects raw colors)
```
Recipe knobs (extend as needed): `stageRail: 'tabs'|'segmented'|'detents'` · `coachEntry: 'bar'|'edge-tab'` · `statsStrip: 'collapsed'|'expanded'` · `atmosphere?: {world, scrimToken:'--swan-zone-scrim'}` (scrim guarantees ≥4.5:1 over the WORST animation frame — World Immersion ships only with it) · `tokens: {accent, coachFg, coachBg}`. Breakpoints: 375 first; ≥768 rail may become sidebar / coach an edge tab; shell column caps at 1440px on 2560/3840 (canvas never stretches to 4K width).

## 4. Migration slices (consult-corrected order; each = shippable + revertible + dry-looped; Rule 70 batch pushes)
**Slice 0 — TESTS FIRST** (before any shell code): `shell.save-path.canonical.test` (shell save payload byte-identical to current) · `shell.stage-swap.preserves-drafts.test` (50-random-transition stage-storm) · `shell.focus-return.test` · `shell.swap-storm.page.test` (style swap mid-stage/mid-rest/mid-draft) · `shell.no-scroll-jump.test` (spy scrollIntoView/scrollTo — zero calls across every interaction) · `contrast.recipes.audit.test` (computed token-pair ≥4.5:1 per recipe).
1. **Context bar + Notice lane** (additive; absorbs 3 banners + plan chip; flagless — Lens picker is the switch, per Sean: no new env vars).
2. **Coach drawer merge** (terminal + dictate strip → one surface; inline proposal cards; no save-path touch).
3. **Stage rail, Train-only** (Setup/Finish render existing sections inline as stubs — IA lands before behavior moves; M7 respected).
4. **Action bar merge** (footer + sticky + thumb bars + TimerFAB; keypad absorption; save moves LAST behind the mature harness) + engine `rest.endsAt` fix + wake lock.
5. **Phase bands** (protocol sections into the collection) + **Finish canvas + Receipt state**.
6. **Recipe layer**: core 4 page recipes (Focus Flow default / Classic / Ledger Pro / Sheet Stack), THEN Labs 7 gated on the harness (Target Card + Ghost Rival first). **Circuit Relay is BLOCKED until the engine gets `group {kind:'superset'|'circuit', rounds}`** — never fake rounds in a skin (Opus).
7. Rolodex upgrade (Sean's standing ask): media previews, NASM filters, pain-excluded-with-reason, one-tap add w/ ghost prefill, Plan tab.

## 5. Floors (unchanged, harness-enforced)
375px-first; 320 never breaks; ≥44px targets; WCAG 4.5:1 + non-color state indicators; reduced-motion variant everywhere; Train token semantics (gold=earned ONLY — stage dots never gold; purple=Coach ONLY; `--world-accent`=active seam); no raw colors outside `var()`/`color-mix`; ≤300-line files; Fira Code `tabular-nums` for numerals; no horizontal page scroll; keypad never occludes the active field (visualViewport tests at 375×~400).

## 6. Verification recipes (worktree + gotchas — hard-won, follow exactly)
- Build in worktree `C:/tmp/ss-workout-os-audit-20260729` (or fresh `git worktree add C:/tmp/ss-shell-<date> origin/main -b claude/session-shell-<date>`). Rule 67: read `.ai-workflow/coordination/*.lane.md` first; claim files; another Claude session + Codex are active in this repo.
- `cd frontend` for ALL vitest runs (worktree root resolves the wrong config). tsc needs `NODE_OPTIONS=--max-old-space-size=16384 npx tsc --noEmit` and check the REAL exit code (piping to tail eats it).
- Full gates per slice: affected vitest → full `src/components/WorkoutLogger/` suite (562+ tests) → tsc → `npm run build` → Rule 42 backend audit → `bash scripts/scan-secrets.sh` on new files. Commit per slice; push ONCE per batch; rebase if main moved and RE-VERIFY (the SWA-104 CSP work touches `vite.config.ts`).
- Deploy proof (Rule 73): walk the chunk graph — `index.<hash>.js` → `UniversalDashboardLayout.<hash>.js` → `WorkoutLogger.<hash>.js` — grep a marker string you shipped; plus `/health` 200 ×2. Service worker caches: tell Sean to hard-refresh.
- Test-fixture gotchas: canonical `ExerciseSet` has NO `completed` field (logged = `reps>0`); `getExerciseSetRowKey` falls back to non-unique `set-N` (namespace any cross-exercise Set); unstable mock context objects cause infinite effect loops → worker OOM; accessible-name collisions with legacy suites (empty-state copy already dodges "Add Your First Exercise" and "Load today" — keep it that way).
- Consults if needed: `node scripts/consult-kimi.mjs --document <md> --out <md> --confirm-spend` ($3 cap) · `node scripts/consult-openrouter-panel.mjs --model anthropic/claude-opus-5 --document <md> --out <md> --confirm-spend` (reasoning-capped; CRLF-safe). Kimi = ONE review per topic, ask Sean before a second.
- Board: post progress to Linear **SWA-100**. Docs of record: `RUNNER-STYLES-FINAL-10-2026-07-30.md` (style roster) · `SESSION-SHELL-FULLPAGE-BRIEF-2026-07-30.md` + `SESSION-SHELL-CONSULT-KIMI/OPUS5-2026-07-30.md` (this plan's ratification).

## 7. Open items riding along
Owner-billing fix offer (Sean's saves burn a paid session — awaiting his yes; matrix §3) · DMARC SWA-13 standing reminder · C8b guide-engine port deferred · 13-chart coverage audit deferred.

## 8. EXECUTE (for the fresh session)
1. Rule 67 lane check + claim. 2. Slice 0 tests. 3. Slices 1→6 back-to-back (Rule 70), hostile dry-loop per slice (Rule 73: proof + `DRY-LOOP: CLEAN×2` ledger), batch push + chunk-walk verification. 4. Show Sean Focus Flow's full-page recipe FIRST (it's the default and his daily view) with a loaded session, before burning time on Labs recipes. 5. Post SWA-100 comments per batch. **The acceptance test that matters: cold load → first set logged in ≤2 taps, and NOTHING on the page ever jumps.**
