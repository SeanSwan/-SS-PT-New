# NEXT-CHAT MASTER PROMPT v2 — Planner Dictation Intelligence · Schedule Mobile Day-Picker · Coach Chat Rebuild · Marvelous Scrolling
**Forged 2026-07-15 by Fable 5 (v2: + the planner-dictation intelligence workstream, fully root-caused and decided the same day). Sean's grant for W1: "be the full brain… refactor anything, update anything, take anything out." Status: READY.**

> **Kickoff (paste this to the fresh agent):** *"Read `docs/ai-workflow/AI-HANDOFF/NEXT-CHAT-PROMPT-schedule-coachchat-scrolling-2026-07-15.md` in full, then execute it. Work in a fresh worktree off origin/main. Build one workstream at a time in the order given; after each, run a recursive hostile review with fixes until a round is dry; commit per slice, push at batch end, verify each deploy LIVE on Render (the way the PD-R1→R5 loop did) before the next workstream."*

## Operating contract (how Sean wants this run)
- Fresh worktree off `origin/main` (≥ `a22894b62`), branch `claude/<topic>-<date>`. Rule 67: claim your lane in `.ai-workflow/coordination/`, never `git add -A`.
- UI work routes through `swan-design-router` (rule 40). Mobile is checked at 375px AND 414px for every touched surface. 44px targets, tokens-with-fallback, dark-first, no MUI.
- After each workstream: hostile review → fix → repeat until a review round finds NOTHING (Sean's standing "recursive until dry"). Then push to main (Render auto-deploys) and verify live.
- Closeout per rule 41; audit record per rule 48 at the end of the batch.
- Do NOT rebuild things listed as already fixed below.

## Fresh context you must know (verified today, 2026-07-15)
1. **The Coach command lane works again as of `12dd2725a`** (five-round live root cause, all on main): PD-R1 `ClassifiedIntentSchema` rejected the `clientRef:null` its own prompt teaches (`.nullable()` fix + regression suite `classifiedIntentSchemaNullRef.test.mjs`); PD-R2 `z.coerce` for LLM string numerics; PD-R3 the classifier summary now lists each command's exact `[params: ...]` keys from its zod shape; PD-R4/R5 dictated plurals singularize against library AND in-plan names. Live-verified: typed "add goblet squats, three sets of twelve" → `✓ Added Goblet Squat — 3×12` on prod. If commands still misbehave, the classifier chain is NOT the first suspect anymore — re-verify before touching it (rule 52); full trail in the Rule 48 audit record §11.
2. **Dictation planner/logger feature is live on main** (audit record: `docs/ai-workflow/AI-HANDOFF/DICTATION-PLANNER-LOGGER-SYNC-AUDIT-RECORD-2026-07-14.md`). The planner Coach dock, `AI_PLANNER_*` events, logger dictation strip, and last-weight chips exist — REUSE their patterns (voice glue = `useCoachBrowserSpeechInput`; receipts; command lane via `useCoachCommand` with `surface` opt).
3. A same-session hostile-review history lives in `BLUEPRINT-dictation-planner-logger-sync-2026-07-14/07-checkpoints.md` — read it to match the quality bar and honesty rules (no fake greens, exact copy strings, honest receipts).

---

## Workstream 1 — Planner dictation intelligence: make Swan Coach plan-editing SOLID and SMART
**Sean's words:** "It still gets confused about changing up the workout plans… I tried it on the one day and the three month, and it was kinda quaggie. Make sure it's solid and smart. You can refactor anything, update anything, take anything out — be the full brain."

**Root causes (diagnosed 2026-07-15 by Fable against the live feature — build these fixes, do not re-diagnose):**
1. **Context blindness.** The classifier never sees the open plan — it can't map "the leg press" to the real row name, doesn't know single-day vs 3-month mode, and can't resolve "the first one".
2. **Selected-day-only matching.** Swap/remove/update search ONLY the selected Detailed-Schedule day — the named exercise living on another week/day yields "Couldn't find", which reads as dumbness.
3. **Position-vs-label day addressing.** Payload `dayNumber` maps to array POSITION; a week whose days are labeled 1/2/3 is fine, but any labeled-day drift makes "day two" hit the wrong slot.
4. **Compound utterances half-dropped.** The headline phrase "swap leg press for box squat, make it two sets" swaps but silently drops the programming change.
5. **Generate ignores spoken intent.** "Give me a leg day" generates with whatever category the panel had.
6. **The dock's own example prompt suggests an unsupported phrase** ("Make day two lighter").

**Decisions (execute exactly; Fable already made these calls):**
- **D1 — Plan snapshot via `previousContext` (frontend-only transport).** `useWorkoutPlannerAiEvents` maintains a module-level snapshot getter (same module-singleton pattern as `pushWorkoutPlannerCoachReceipt`); `useWorkoutPlannerCoachDock.handleSubmit` passes it as `executeCommand`'s existing `previousContext` opt — zero backend transport changes (route → pipeline → classifier `[Recent context: …]` already flow it, and the route now hard-caps the field at 2000 chars — shipped 2026-07-15, `normalizePreviousContext` in `aiCommandRoutes.mjs`, pinned in `aiCommandRouteFrontendDispatch.test.mjs`). Keep snapshots ≤600 chars and STRUCTURAL ONLY — `formatWorkoutPlannerExerciseName` names + numbers, never free text, never notes (Rule 8). Format (cap ~15 names/day): single-day → `Planner mode: single-day builder. Exercises: A; B; C.` · horizon → `Planner mode: <N>-week generated plan. Selected Week <w> Day <d>. Selected-day exercises: A; B; C.`
- **D2 — Resolution ladder (kills the quaggie).** New PURE module `workoutPlannerDictationTargets.ts` (unit-test heavy; the events hook becomes a thin consumer — extract, the hook is at 273/300): explicit week+day → that day; explicit week only → search that week's days; otherwise → selected day first, then WHOLE-PLAN search. Precedence is strict: a hit on the SELECTED day wins outright even if the name also exists elsewhere (the trainer is looking at it). Exactly one match anywhere = act (receipt already appends `(Week w · Day d)` so it's transparent); multiple matches across days = `Multiple matches for "<name>" — say the week and day (e.g. "week 2 day 1").` Explicit `dayNumber` matches the day's REAL `dayNumber` field first, position as fallback.
- **D3 — Compound programming.** `planner_swap_exercise` gains optional `sets/reps/tempo/restSeconds` (backend zod, coerced — the `[params: …]` summary updates itself from the shape); the events hook applies them post-swap via `updateHorizonExerciseFields`/builder-row merge. `planner_update_exercise` gains optional `dayNumber/weekNumber`. Receipt: `Swapped A → B — sets 2 (Week 1 · Day 2)`.
- **D4 — Generate honors speech.** `useWorkoutPlannerGenerationActions.handleSwanCoachWorkoutGenerate(clientId, overrides?)` accepts `{category, goal, phaseNumber}` merged into the request AND reflected into panel state (hook args gain the three setters; the page's `onGenerate` wrapper passes overrides through — page must stay ≤300, compact onto existing lines). The events hook maps spoken `category/goal/phase` (includes-match against `WORKOUT_CATEGORIES`/`PLAN_GOALS` values) before calling. GOTCHA (verified): `handleSwanCoachWorkoutGenerate` short-circuits into the guided-candidates path when `generationMode` is guided — overrides must reach BOTH paths (set panel state before either fires, and merge into the direct request), or a guided-mode "give me a leg day" silently ignores "leg" again.
- **D5 — Honest examples.** Dock empty-state examples become three phrases that all genuinely work, e.g. `"Add goblet squats, three sets of twelve" · "Swap leg press for box squat, make it two sets" · "Remove week 2 day 1 leg press"` (update the dock test that pins the copy).
- **Bans stay:** server never writes plans from dictation; Save/Update stays human; additive `AI_PLANNER_*` only; no new transport; interim never enters the textarea.

**Accept (test + LIVE, per the PD-loop standard):**
- Pure-module tests: ladder order, dayNumber-field-vs-position, week-scoped search, plan-wide unique hit, cross-day ambiguity copy, snapshot format + caps.
- Hook tests: the QUAGGIE REPRO — swap an exercise that lives on a NON-selected week/day succeeds with the location suffix; compound swap applies sets; update with week/day; generate override calls with mapped category.
- Dock test: POST body carries `previousContext` snapshot; new example copy pinned.
- Backend: S2 suite extended for the new swap/update params (string-numeric coercion included).
- LIVE on prod (typed = same lane as voice): `"swap leg press for box squat, make it two sets"` end-to-end on a 3-month plan while a DIFFERENT day is selected; `"give me a leg day"` generates legs. Recursive hostile review until dry — expect the live rounds to find what tests can't (they did in PD-R1→R5).

## Workstream 2 — Universal Master Schedule: Mindbody-style mobile day picker
**Sean's words:** "in mobile mode it has the arrows but Mindbody app does not have those arrows — you can just choose one of the 7 days of this week by default by pressing the day number. I like the arrows on desktop but mobile I want it to be exactly like Mindbody's."

**Decisions (do not re-ask):**
- Mobile (≤768px): NO prev/next arrows. A 7-day strip of the CURRENT week is the default; each day = a tappable pill showing weekday letter(s) + day number (Mindbody pattern); tapping a day shows that day's schedule. Selected day gets the accent treatment; today gets a subtle marker even when unselected.
- Desktop (>768px): arrows stay exactly as they are.
- Week itself still needs to be changeable on mobile — Mindbody does this with horizontal swipe on the strip; implement swipe (or an equivalent low-click affordance) WITHOUT reintroducing arrow buttons.
- 44px minimum tap targets on the day pills; the strip must not cause horizontal page scroll.
- A11y: day pills are real buttons with `aria-pressed` (selected) and an `aria-label` naming the full date; today's marker is not color-only.

**Where (verified file:line):**
- `frontend/src/components/UniversalMasterSchedule/components/ScheduleDayStrip.tsx:84` (ChevronLeft/Right) — the day strip already exists; this is the primary surface.
- `frontend/src/components/UniversalMasterSchedule/Views/WeekView.tsx:178` — second arrow instance; audit every `ChevronLeft|ChevronRight` in `UniversalMasterSchedule/` and classify per rule 27 before editing.
- Run the canonical-surface receipt (rule 26) first — the UMS has 115 files and known legacy/competing views.

**Accept:** 375px + 414px screenshots (day pills, no arrows, no overflow); desktop screenshot (arrows intact); tests for the breakpoint gate + day-tap behavior; existing UMS suites green.

---

## Workstream 3 — Coach Command Center chat: deep fix + rebuild (the big one)
**Sean's words:** "the chatbox is really smooshed together and not even working — I typed hello, it did nothing. I used the mic, it worked but was hard to tell it was recording. It would be nice to have the voice synthesizer so I can see my voice move as I talk. I cannot see much of a chat box in mobile. I really need this looked into deeply and fixed as well as upgraded… I expect the chat to be more like Codex's chat — I like that as a default base, then just add what I have already implemented. You are free to change, break down and build up if you feel it is going to create a better experience."

**Investigate FIRST (canonical-surface receipt, rule 26, on MOBILE 375px):**
- Reproduce "typed hello → nothing" at 375px on `/dashboard/admin/coach-command-center` (or wherever the canonical mount is — prove it). Part of it was the classifier bug (fixed), but Sean ALSO reported the input feeling dead and the layout smooshed — suspect mobile layout/z-index/submit wiring in `CoachCommandCenterPage.tsx` + `CoachConsoleDock.tsx` + `CoachCommandCenter.bridgeMobileDockStyles.ts`. Diagnose with a probe (rule 55) before prescribing.

**Build (decisions made — execute):**
1. **Codex-chat-style baseline:** a clean, full-height conversation thread — messages as simple readable bubbles/blocks, newest at bottom, input bar PINNED to the bottom (safe-area aware), thread scrolls independently, no dead space. On mobile the chat owns the viewport (no smooshed multi-panel squeeze — panels/ops-rail collapse behind toggles). Preserve every existing capability by re-mounting it into this baseline: command lane + receipts + confirmations, chat fallback, voice dictation, notebook/intake/Plaud actions (behind the More menu), workout logger/planner links.
2. **Visible recording state + live voice visualizer:** while the mic is armed, render a live waveform/level meter driven by Web Audio `AudioContext` + `AnalyserNode`. IMPORTANT (verified): browser `SpeechRecognition` exposes NO media stream — open a PARALLEL analyser-only `getUserMedia({audio:true})` stream while dictation is armed and stop its tracks the moment dictation stops (browsers allow the concurrent capture; if that second capture is denied, degrade to the pulse-only state, never break dictation). The recorder-overlay path already owns a real stream — reuse it there. Recording state must also be unmistakable without the meter (color + label + pulse, reduced-motion safe). No new transport, no new deps if avoidable (hand-rolled canvas/DOM bars are fine).
3. **Mobile-first sizing:** at 375/414px the thread gets the majority of the viewport; input never hidden by the keyboard (visualViewport handling); 44px controls; no horizontal overflow.
4. **Hardening + missing-features sweep:** error/empty/offline states with honest copy; retry on failed sends; scroll-to-newest with an unread jump pill; message timestamps; and run rule 65's absence-first gap analysis for anything obviously missing — propose extras in the report, build only the clearly-safe ones.
- Sean explicitly authorized restructuring: split/rebuild the Command Center components where it produces a better experience (respect the 300-line cap; extraction tests will guide).

**Accept:** live prod (or local-dev) demo of typed "hello" → reply rendered in thread; mic → visible waveform while speaking; 375/414/1440 screenshots; all coach-assistant suites green + new tests for input-submit, visualizer state, mobile layout contracts.

---

## Workstream 4 — App-wide scrolling: from gummy to marvelous
**Sean's words:** "look into all the gummy scrolling I'm having in the app in general — I need all scrolling to be marvelous."

**Method (audit → fix; keep it evidence-based):**
- Audit the heavy surfaces first: dashboards (admin/user), Universal Master Schedule, social feed, store, Coach Command Center, workout planner/logger.
- Known gummy-scroll suspects in this stack: scroll-linked JS handlers without `{ passive: true }`; heavy `backdrop-filter`/`box-shadow` layers repainting under scroll; nested `overflow` containers fighting the page (scroll traps); missing `overscroll-behavior`; `100vh` bugs on mobile; scroll-snap misuse; large unvirtualized lists (react-window exists in-repo — reuse); `translateZ`/stacking-context issues (see CLAUDE.md gotchas); transitions on `top/left` instead of transforms.
- Fix per surface, verify with DevTools performance traces (scripting/paint during scroll) and by feel at 375px; `prefers-reduced-motion` respected throughout.
- Ban: do NOT hijack native scrolling with JS smooth-scroll libraries — marvelous = native momentum + 60fps, not fake inertia.

**Accept:** before/after notes per surface (what was gummy, what changed), zero horizontal-overflow regressions, planner/logger/UMS/social suites green.

---

## Order & cadence
W1 (Sean's live pain — the smartness jump) → W2 (small, fast win) → W3 (deep) → W4 (sweep). One workstream at a time; recursive hostile review until dry after each; commit per slice; ONE push per workstream batch; verify each deploy LIVE on Render before starting the next workstream. Rule 48 audit record at the end covering all four. If main advances mid-batch (parallel sessions are active), merge origin/main, verify zero file overlap by diff, and re-run gates before pushing — never force.
