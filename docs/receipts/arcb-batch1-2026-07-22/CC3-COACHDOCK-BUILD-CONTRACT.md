---
decision: CC-3 CoachDock build contract — Kimi laws locked; transport selection is the first build step
status: open
supersedes: none
---

# CC-3 — CoachDock + Bootcamp Tool Contract (build contract for the next slice)

Sean's vision: talk to Swan Coach inside the Bootcamp Creator (and Pain Chart, CC-4); Coach asks intent,
then DRIVES the surface's tools to configure it. Kimi verdict (KIMI-COACH-CONVERGENCE-VERDICT-2026-07-22.md)
laws, all non-negotiable:

1. Execute-live + ONE aggregate undo chip: 44px min height, fixed within the dock (never floating over
   builder panels), 15s window with countdown, label echoes the batch ("Undid: 4 rounds × 6 stations").
2. Invalid/unknown tool proposals render INLINE in the transcript as first-class messages ("I tried to set
   4 rounds, but this screen doesn't support that yet — here's what I can do."). Never silent, never a toast.
3. Per-call highlight = ONE traveling focus ring (2px crystalline edge, transform/opacity, ~600ms settle);
   zero highlight under reduced-motion; transcript carries temporal weight. Focus moves to the mutated
   region; aria-live="polite" on the transcript.
4. Surface-state digest = enums/counts PLUS current selection context (focusedRegionId/selectedStationId) —
   without selection the LLM mutates the wrong scope (worst agentic failure).
5. New files only: `frontend/src/components/CoachDock/CoachDock.tsx` + `useSurfaceToolContract.ts` (+styles,
   types, tests). Do NOT inline tool registration into BootcampBuilder panels (file-budget war zone;
   BootcampBuilderPage is at 299 lines).
6. Dock collapses to bottom sheet ≤768px. Zero-PII: IDs/enums to the LLM only (Rule 8). All tool actions
   T1/T2 client-side.

## TRANSPORT RECEIPT (CC-3a COMPLETE — the architecture already exists; GENERALIZE, don't invent)

The repo already ships a working, doctrine-locked coach dock on the admin workout planner:
- **Dock:** `useWorkoutPlannerCoachDock.ts` (177 ln) + `WorkoutPlannerCoachDock.tsx` — dictation via
  `useCoachBrowserSpeechInput`, Send → `useCoachCommand.executeCommand` with `surface:'workout-planner'`,
  non-commands fall back to `useAIChat.sendMessageWithConversation`, replies render as receipt rows with
  one-tap follow-up actions (incl. Undo). Header doc: "No new transport is created here (blueprint
  06-bans §1)" — that ban binds CC-3 too.
- **Surface routing:** `useCoachCommand.ts:105-118` — `surface?: 'workout-planner'|'workout-logger'`
  flows as routeContext → backend `aiCommandRoutes normalizeRouteContext → intent surface remap`.
- **Tool execution:** window CustomEvents. `aiChatService.mjs` system prompts already emit
  `{"action":"frontend_dispatch","event":"AI_ADD_EXERCISE",...}`; the planner executes via
  `useWorkoutPlannerAiEvents.ts` listeners (`AI_PLANNER_ADD_EXERCISE` etc.) with an
  `acknowledgeAIWorkoutEvent(handled)` ack handshake feeding the receipt sink.

### Exact CC-3 build list (no open questions)
1. Extend `useCoachCommand` surface union with `'bootcamp-builder'` (+`'pain-chart'` for CC-4) and the
   backend `normalizeRouteContext` remap + intent family.
2. Define `AI_BOOTCAMP_*` events (SET_FORMAT, SET_ROUNDS, SET_STATIONS, SET_INTERVALS, PLACE_EXERCISE,
   LOAD_TEMPLATE) beside the AI_PLANNER_* constants; add the bootcamp `frontend_dispatch` block to the
   aiChatService surface prompt.
3. `useBootcampAiEvents.ts` — listeners mapping events → `BootcampCommandDeck.logic` actions, ack
   handshake, receipt sink (mirror useWorkoutPlannerAiEvents).
4. Generalize the dock: lift `useWorkoutPlannerCoachDock` → `components/CoachDock/useSurfaceCoachDock.ts`
   (parameterized by surface + receipt sink); planner keeps a thin wrapper with IDENTICAL behavior
   (its tests must pass unchanged); `BootcampCoachDock` consumes the generic.
5. Kimi laws on top: aggregate 44px countdown undo chip, inline-transcript invalid-tool messages,
   traveling focus ring (reduced-motion: none), digest carries selection context, bottom-sheet ≤768.
6. TDD throughout; planner dock regression suite green is the non-negotiable refactor gate.

## Discovery state (verified)
- Coach-assistant transport = ASYNC intake queue (`createCoachTextIntake`, coachIntakeService.ts) — built
  for dictation intake, not synchronous tool-call round-trips.
- **First build step: transport selection receipt.** Candidates: (a) backend `aiChatService.mjs` (App AI
  Hive Mind chat lane) if it supports synchronous responses; (b) the Swan Coach command dispatcher lane
  (commandDispatcher.mjs, 20 live commands) extended with a `propose_tools` response shape; (c) a new
  narrow `/api/coach/dock` endpoint composing existing services. Pick via Rule 26 receipt on the real
  caller paths; do NOT invent a parallel AI stack. W0.4 SSE spike (Sean-blocked) bounds streaming; v1 may
  be request/response.
- BootcampBuilder state lives in BootcampBuilderPage.tsx (299 ln) + BootcampCommandDeck.logic.ts (162 ln);
  tool contract v1 = the deck's real actions (format/rounds/stations/intervals/place-exercise/template).

## Order
CC-3a transport receipt → CC-3b `useSurfaceToolContract` + dock shell w/ tests → CC-3c bootcamp contract
v1 + E2E happy path → CC-3d hostile rounds/CLEAN×2 → CC-4 pain-chart contract reuse → CC-1b Crystalline
Body (signature design slice, full design-router ideation).
