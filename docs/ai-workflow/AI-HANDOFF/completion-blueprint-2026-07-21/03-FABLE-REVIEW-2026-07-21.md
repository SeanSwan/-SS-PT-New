# 03 — FABLE REVIEW (the mandatory pre-build gate) — 2026-07-21

**Reviewer:** Fable 5 (session model, Final Decider) · **Target:** `01-BLUEPRINT.md` (Kimi) + `02-CLAUDE-VERIFICATION-ADDENDUM.md`
**Method:** independent repo verification — canonical-surface audit (Rule 26/27, receipt below), schema cross-check (Rule 58),
design dual-pass vs Swan tokens (Rule 40), do-not-list feasibility check. Nothing taken from Kimi on faith.

---

## VERDICT: **REVISE — corrections enumerated and APPLIED in this doc. With them, the plan is BUILD-READY pending Sean's 2 product answers + explicit GO.**

The architecture ruling (new sibling, orchestrated, flag-gated, zero edits to `PostWorkoutCelebration`) **HOLDS** against the
real repo — for a stronger reason than Kimi knew: not only is the live file 321/300, the celebration has **no data source
in the live save lane** (see C4). The seam design survives; the payload contract and integration slice do not survive
unmodified. Six corrections follow.

---

## §A — CANONICAL SURFACE RECEIPT (Rule 26) — resolves the addendum's load-bearing question

**A client self-logging surface EXISTS and is CANONICAL.** `[VERIFIED]` full chain:

| Link | Evidence |
|---|---|
| (a) Route mount | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:188` — client role: `{ path: '/log-workout', component: WorkoutLogger }` → URL `/dashboard/client/log-workout`; top-level `frontend/src/routes/main-routes.tsx:242` (lazy) → `:847` `<UniversalDashboardLayout/>` under `/dashboard/*` |
| (b) JSX mount proof | `UniversalDashboardLayout.shellPieces.tsx:91-115` — `visibleRoleRoutes.map(... => <Route element={<Component/>}/>)` live JSX for `activeRole==='client'`; runtime-mount test `WorkoutLogger.clientMount.test.tsx:191-201` |
| (c) Consumer service | `WorkoutLogger.tsx:789` → `dailyWorkoutFormService.submitWorkoutForm(...)` (`frontend/src/services/nasmApiService.ts:672`, singleton `:869`) |
| (d) Frontend API literal | `nasmApiService.ts:695,700` — `POST '/api/workout-forms'` |
| (e) Backend match | `backend/core/routes.mjs:682` `app.use('/api/workout-forms', dailyWorkoutFormRoutes)` → `dailyWorkoutFormRoutes.mjs:572` `router.post('/', protect, checkTrainerClientRelationship, ...)`; client self-log explicitly permitted (docstring `:551-571`, Codex round 4 2026-04-18) |
| (f) Save-success today | `WorkoutLogger.tsx:794-803` — toast + `dispatchWorkoutLogged(...)` + navigate to `/dashboard/client/workouts` or `/overview`. **No celebration/completion UI fires anywhere.** |

**Surface classification (Rule 27):** client `/dashboard/client/log-workout` = **canonical** (above). Trainer
`/dashboard/trainer/log-workout` (`EnhancedWorkoutLogger`, routes.tsx:158), admin `WorkoutLoggerModal`, owner
`/dashboard/admin/log-my-workout` (routes.tsx:135) = canonical but **trainer/admin-facing** — out of scope for the client
proof card. `PostWorkoutCelebration` = **DORMANT** (0 JSX mounts; only its own file + a doc-comment in `XPCounter.tsx`).
`CelebrationPortal` mounts only inside `CelebrationContext.tsx:275`, not wired to workout save. Entry funnel:
`ClientMyWorkoutsPage` CTAs → `/dashboard/client/log-workout?loadPlan=today`. One backend save path for ALL logger
surfaces (`POST /api/workout-forms`) — no competing backend surface.

**Consequence:** this is a **one-part build** (completion flow + net-new mount), not the feared two-part build.

---

## §B — SCHEMA CROSS-CHECK (Rule 58) — blueprint §8 vs real models

Real columns quoted from `backend/models/WorkoutSession.mjs` and `backend/models/WorkoutLog.mjs` (both read in full this session).

| Blueprint field | Blueprint's claimed source | Real repo truth | Match? |
|---|---|---|---|
| `session.durationSeconds` | "WorkoutSession.endedAt − startedAt" | **No `endedAt` column exists.** Model has `startedAt`/`completedAt` (nullable) + `duration` INTEGER **minutes** (WorkoutSession.mjs:50-58). The live save lane stores **`estimatedDuration` (user-estimated minutes)** (dailyWorkoutFormRoutes.mjs:939,1171,1221) | **DRIFT → C2** |
| `session.totalVolumeKg` | "Σ(reps×weight) computed server-side" | Not in the 201 response (`:1213-1230`). `WorkoutSession.totalWeight` exists but isn't in this lane's response. Weight units repo-wide are **lb** (`unit: 'lb'` ClientProgressDashboard.tsx:329; dictation contract `@35lb`) | **DRIFT → C1, C3** |
| `session.setCount` | WorkoutLog.count | 201 response returns `totalSets` (`:1220`) ✓ (name differs) | OK, rename |
| `session.exercises[]` | WorkoutLog rows | `WorkoutLog` has `exerciseName/setNumber/reps/weight` ✓ — but not in the 201 response; the frontend already holds the submitted form state | OK via C3 |
| `session.prs: PRFlag[]` | "computed by logger/backend [UNKNOWN]" | **Nothing computes PRs at save.** `WorkoutLog` has **no `isPR` column**. The `isPR` in `workoutService.mjs:382-442` is the OLD Set lane and is *caller-supplied*, not computed. Estimated-1RM PRs exist only in a **read-path** analytics section (`dailyWorkoutFormRoutes.mjs:2135-2140`) | **DRIFT → C5** |
| `gamification.xpEarned/previousXP/newXP` | "GET xp result" in parallel at save | XP is awarded **async post-response** via `setImmediate → awardWorkoutXP` (`dailyWorkoutFormRoutes.mjs:1163-1181`), fire-and-forget, can fail non-critically; **not in the 201 response**, and an immediate GET **races the award** | **DRIFT → C4** |
| `streak.currentStreakDays` | streak service | `currentStreak` served by `backend/routes/dashboard/sharedDashboardRoutes.mjs` (+ siblings) `[VERIFIED files, field-level check at build]` | OK |
| `streak.weeklyTarget` | "client's program target" | `WorkoutPlan.workoutsPerWeek` INTEGER exists (workoutController.mjs:49,525) | OK (Sean picks default — Q4) |
| `user.firstName / handle` | User model | `User.username` exists (User.mjs:48) ✓ | OK |
| `nextSession` | program context | `planProgress` (advanced plan-day metadata) IS in the 201 response (`:1225`) — usable to derive "next day" deep link | OK-partial |

---

## §C — THE SIX CORRECTIONS (applied to the plan; build against THESE)

**C1 — Units: lb, not kg.** Every stat, chip, share string, and type name switches to **lb** (`weightLb`, `totalVolumeLb`,
"8,240 lb"). The app is lb-based end-to-end; kg rendering would contradict every other surface. (A user-preference unit
toggle is future scope, not this build.)

**C2 — Duration honesty: no fake `47:12`.** The only duration in the live lane is `estimatedDuration` (whole minutes,
user-estimated). Hero stat renders **`47 MIN`** (Fira Code, same hierarchy). mm:ss appears only if/when real
start/stop timestamps exist in the lane. A fabricated `:12` violates the blueprint's own do-not #4 (data-truth).

**C3 — Payload assembly is frontend-composed, not response-parsed.** The 201 returns only
`{totalSets, estimatedDuration, date, planProgress, challengeProgress, ...}`. The orchestrator's `CompletionPayload` is
assembled from: (i) the submitted form state already in `WorkoutLogger` memory (exercises, sets, weights → volume =
Σ reps×weight, exerciseCount, bestWeight per exercise — the exact numbers that were saved), (ii) the 201 fields, (iii) ONE
follow-up GET for streak (`currentStreak` + weekly count) that, on failure, hides the streak module (blueprint §11 partial-
payload rule already covers this). No new backend endpoint required for v1.

**C4 — `gamification` becomes OPTIONAL; celebration phase is conditional.** XP is awarded async post-response and is
not fetchable race-free at save time — this is WHY `PostWorkoutCelebration` was never wired. Contract change:
`gamification?: CompletionPayload['gamification']`. Orchestrator: data present → phase 1 celebration → seam → proof;
absent → **straight to proof card**. The proof card carries P1/P2/P3 on its own. Wiring a race-free XP read (or moving
the award into the response transaction) is a separate backend slice AFTER v1 — do not couple this build to it.

**C5 — `prs[]` is empty in v1 by design** (UI hides the row — blueprint already degrades silently). Optional follow-up
slice S8: server-side `previousBest` lookup (`MAX(weight)` per `exerciseName` over the client's prior sessions) in the
save path — bounded, but NOT v1. Kimi's Q1 answered: backend does not compute PR flags today.

**C6 — Integration slice rewritten (replaces blueprint file #9 "5-line swap").** There is no existing call site.
The real slice: in `WorkoutLogger.tsx` success branch (`:794-803`), when **self-log context** (client logging own
workout — the condition the client route already implies) **AND** `VITE_COMPLETION_PROOF_CARD` on → render
`<WorkoutCompletionFlow payload onClose/>` and **defer** `resolvedOnComplete()` navigation into `onClose`. Flag off or
trainer/admin context → current behavior byte-identical (toast + navigate). Trainer-facing completion artifacts are a
different product intent — explicitly out of scope. `dispatchWorkoutLogged` keeps firing unconditionally (its one
listener, chart refetch at `CanonicalProgressChartsGrid.tsx:52`, must keep working). Estimated ~30-40 lines, not 5.

---

## §D — KIMI'S 5 QUESTIONS — DISPOSED

1. **PR flags:** answered from repo — not computed at save; v1 ships `prs: []` (C5). *No Sean input needed.*
2. **In-app feed vs OS sheet:** the repo HAS a live community feed (social platform + groups, shipped 2026-07-14) —
   so this IS a real product choice. **→ SEAN.** Recommended: v1 = OS share sheet + copy-link (as blueprinted, smallest);
   fast-follow = "Share to community" prefilled post (Product Core Loop: milestones shareable with community).
3. **`/progress` route:** EXISTS — `UniversalDashboardLayout.routes.tsx:189` → `ClientProgressDashboardPage` at
   `/dashboard/client/progress`. "See progress" CTA stays; P6 teaser promise is real. *No Sean input needed.*
4. **Weekly target source:** `WorkoutPlan.workoutsPerWeek` exists → program-defined per client. **→ SEAN** picks the
   no-plan fallback. Recommended: default **3**/week when no active plan (industry-sane), module never hidden for
   plan-less clients; `weeklyTarget=0` hide-rule kept for explicit opt-out.
5. **PNG share:** `html2canvas@^1.4.1` already in `frontend/package.json:48` (blueprint guessed `html-to-image` — wrong
   lib name, right idea). Recommended: v1 = **text + deep link** (bulletproof); PNG snapshot via html2canvas as a
   polish slice AFTER the flow ships (gradient/border-image fidelity in html2canvas needs its own QA pass).

## §E — DESIGN DUAL-PASS (Rule 40) — PASS

Tokens/type/motion audited against the Active Palette + design system: C12 SheenCard recipe correct
(royal-depth→midnight-sapphire glass, Ice-Wing/Gilded chrome); Dual-Button Glow honored (sapphire bg → Wing Purple
glow); success = Ice Wing, **no green**; `--arctic-cyan` correctly absent from buttons/glows; Fira Code stats /
Cormorant congrats / Sora caps all on-system; ONE narrative motion, RM-gated in both keyframes and JS; 44/48px
targets; 320/414/desktop wireframes sound. Rule 43 `css``` helper is already called out for shared fragments.
Two nits, absorbed into C1/C2: "8,240 kg" → lb, "47:12" → "47 MIN".

## §G — POST-GO AMENDMENT (same day, BEFORE any code): COMPETING SURFACE FOUND ON origin/main

The §A receipt was assembled against the drifted WIP working tree. On checking out **origin/main** (`72e3f37da`)
to build, the save-success path is materially different — §A(f) is WRONG for main. `[VERIFIED in worktree]`:

- **`SaveSuccessPanel.tsx` (266 lines) is LIVE** in `WorkoutLogger.tsx:795-810`: post-save inline panel with
  sets/volume beat, **server-computed `prEvents`** (real PRs, lb — supersedes C5's "nothing computes PRs":
  `dailyWorkoutFormRoutes.mjs:1312-1364` now awards PRs idempotently and returns truthful `prEvents` in the 201),
  streak beat via `useProgressPulse`, billing/plan/challenge lines, **in-app "Share to feed"** (supersedes §D-2's
  "OS sheet is smallest" framing — in-app share ALREADY EXISTS), book-next, buy-more, Done (navigation deferred —
  C6's "defer navigation" is already the shipped pattern).
- **`PostSaveHandoff` (handoff/ dir, 1,230 lines incl. tests) is a BUILT+DARK completion proof modal**: full-screen
  portal over the panel, est-1RM Victory proof chart, pr/streak/first headlines, VOL/EXERCISES/MIN chips (lb+min —
  C1/C2 already honored), server-resolved next-best-action (trainer-indispensability guarded), owner-only
  `navigator.share`→clipboard share (fail-closed double-guard), LITE variant, focus-trap/Esc/scroll-lock, error
  boundary. Flag `VITE_ENABLE_POST_SAVE_HANDOFF` default OFF; backend `safeAssemble` already ships the `handoff`
  payload in the 201 (`dailyWorkoutFormRoutes.mjs:1336-1347,1368`). Hardened via a 9-finding Fable review round
  (`42fbec2bb`, 2026-07-18).

**Rule 27 classification:** `PostSaveHandoff` = **competing surface** for the blueprint's `ProofCardScreen`
(~70% product overlap: proof + share + next action as the save's terminal moment). Building the blueprint as a
new sibling would put TWO flag-gated completion overlays on the same seam — the exact failure class Rules 26/27
exist to prevent. **Build halted before any code; escalated to Sean with a convergence recommendation** (upgrade
PostSaveHandoff with the blueprint's P1 branded SheenCard artifact, P2 named congrats, P3 streak/next-goal module,
signature reveal — ONE canonical terminal surface, one flag). The §F unlock list is void until Sean rules.

## §H — CONVERGENCE OUTCOME (same day): Sean ruled CONVERGE; built and shipped dark

Sean's ruling (2026-07-21, on the recorded question): **converge into `PostSaveHandoff`** — one canonical
terminal surface, one flag. Also on record: share = OS sheet + copy link (already what ShareProofButton does);
weekly-target fallback = default 3.

**Built (branch `claude/completion-proof-card-20260721`, worktree off origin/main `72e3f37da`), all additive,
all behind the EXISTING dark flags (`VITE_ENABLE_POST_SAVE_HANDOFF` client + `ENABLE_POST_SAVE_HANDOFF` server):**
- `handoff/ProofCardShell.styles.ts` (NEW, 123 ln) — P1: C12 SheenCard chrome around the proof zone (sapphire
  glass over card-dark, masked Ice-Wing→Gilded 1px gradient ring, inner glass hairline, ONE reveal+sheen
  narrative beat, fully RM-gated), brand chrome row (◆ Swan Studios + owner @handle), date hairline.
- `handoff/StreakGoalModule.tsx` (NEW, 122 ln) — P3: segmented weekly bar from the REAL `sessionsThisWeek`/
  `streakWeeks`, target default 3 (clamped 1–7), forward-pointing prompt, one labelled a11y group, renders
  nothing on invalid data.
- `handoff/PostSaveHandoff.tsx` (228 ln) — P2 named congrats `Flight logged, {firstName}.` strictly
  OWNER-scoped (same identity signal as the share guard; trainer-for-client keeps legacy copy), proof zone
  wrapped in the card shell, streak module mounted above the NBA card. Legacy copy byte-identical when the
  new optional props are absent.
- `workoutHandoff.types.ts` / `WorkoutLoggerHandoffMount.tsx` / `WorkoutLogger.tsx` — optional
  `viewerFirstName`/`viewerHandle` threading from the auth user (client-side render only; zero-PII posture
  unchanged — analytics payloads untouched).
- Tests: `StreakGoalModule.test.tsx` (7) + `PostSaveHandoff.convergence.test.tsx` (8) NEW;
  **pre-existing `PostSaveHandoff.test.tsx` passes UNMODIFIED (the did-not-break-it gate).**

**Verification:** handoff dir 9 files/49 tests green; `Celebrations/` (XPCounter gate) green, zero edits;
full `WorkoutLogger/` suite **82 files / 475 tests green**. Scoped `tsc --strict` on touched files: 0 errors
(the single hit is pre-existing `postSaveHandoffFlag.ts` `import.meta.env` typing, an artifact of the scoped
invocation — project config supplies vite/client types). Rule 56 disclosure: full-repo `tsc --noEmit` crashes
OOM (exit 134) — a KNOWN pre-existing baseline condition, not introduced by this slice.

**Rule 58 catch shipped as doctrine:** `WorkoutPlan` has NO `workoutsPerWeek` column — the
`workoutController.mjs:49` doc-comment claiming it is drift. Plan-defined weekly targets need the
program-block lane (`ProgramMesocycleBlock.sessionsPerWeek`) — recorded as the follow-up for the streak
module's target source.

**Not built (deliberately):** the 8-file sibling `WorkoutCompletionFlow` (superseded by convergence);
the XP celebration phase (`PostWorkoutCelebration` stays dormant — XP is awarded async post-response with
no race-free read; wiring it is a separate backend slice); PNG share export (html2canvas present in deps,
polish slice later); plan-defined weekly target (above).

## §F — WHAT UNLOCKS BUILDING (historical — superseded by §G/§H)

1. ~~Fable review gate~~ — **this document** (REVISE corrections applied above; plan is build-ready as amended).
2. **Sean answers 2 questions** (D2 share target, D4 weekly-target fallback) — recommendations given.
3. **Sean's explicit GO** — production UI (Rule 40); build routes through `swan-design-router`, slices S1→S7 per
   blueprint §9 with C6 replacing file #9, S5 stop-gate = `XPCounter.test.tsx` passes UNMODIFIED, ship via clean
   worktree off origin/main behind `VITE_COMPLETION_PROOF_CARD`.
