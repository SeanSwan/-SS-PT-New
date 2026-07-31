# SwanStudios Fable Final-Decider

**Reviewer:** OpenRouter `anthropic/claude-opus-5` (effort: medium)
**Document:** docs/ai-workflow/brainstorms/jarvis-coach-planner-superprompt-2026-07-31.md
**Seed:** docs/ai-workflow/AI-HANDOFF/JARVIS-VILLAGE-DIGEST-2026-07-31.md
**Tokens:** 23112 in / 26121 out · **Cost:** ~$1.5372 · **Wall:** 359.7s

---

# OPUS 5 — CONSULTING ARCHITECT RETURN (COMPLETE)
**SwanStudios · Swan Coach Jarvis loop + voice-stack collapse + Workout Planner overhaul + 10 planner Lenses**
Path convention: paths below are as traced; if a path has drifted, **resolve by exported symbol name** (every row names one). No row requires a path guess to be correct.

---

## §0 — Executive summary (one paragraph)

Ship the Jarvis loop by **deleting**, not building: the decoder (`parseWorkoutTranscript` / `workoutLogParserService`) already handles Sean's exact rambling sentence — multi-exercise, sets×reps×weight, tempo, RPE, four note channels, pain flags with region+side — and PLAUD proves it end-to-end in production today. What's missing is a **capture primitive that works on the phone in his pocket** (hold-to-talk MediaRecorder → server STT, never browser SpeechRecognition as the primary), **one** mic instead of six entry points, **one** review surface instead of four parse paths and two mappers, and honest state text. So: collapse 7 SpeechRecognition implementations to 1 shared fallback, 6 voice entrances to 1 mic + 1 audio-file lane, 4 parse paths to 1 server parse, 2 row mappers to 1 byte-safe mapper in front of the untouchable `POST /api/workout-forms` payload; turn on the already-written-and-dormant `voiceConfirmationTier` and browser TTS with **no spoken client names**; fix four P0 truth defects (overclaiming privacy copy, dropped vocab-bias 3rd arg, invisibly-listening ActionBar mic, zero-listener `AI_REST_SKIP`/`AI_REST_ADJUST`). In parallel the planner gets a **structural** overhaul — 179 props → 3 contexts, 6 command-panel sections → a 2-row context bar + one Generate with an Advanced sheet, 6-buttons-under-5-booleans → 1 primary + overflow, single-column-below-1279px → real 375px mobile IA with the Rolodex **kept and upgraded** — and only then a Runner-Styles-shaped Lens registry whose default style (`studio-classic`) is a **byte-identical wrapper of today's ThreePanel**, so 10 styles ship dark with zero-regression proof. Nothing in this plan touches the byte-pinned save payload, the 409 `SWAN_COACH_REVIEW_REQUIRED` contract, or adds a dependency or an endpoint.

## §1 — Architecture (one paragraph + diagram)

One capture, two phases, one review, one write path. Hold-to-talk records with **MediaRecorder** (device-independent; SpeechRecognition survives only as an opportunistic *preview* on Chrome desktop and as the typed-fallback trigger), uploads to the existing `POST /api/ai-chat/transcribe` for **Phase A → transcript** (renders in ~1s so the trainer sees words, not a spinner), then posts that transcript to the **existing** parse lane that History Import already uses for **Phase B → decoded rows** (roster-redacted server-side before any LLM hop; STT audio disclosed honestly as raw). Decoded rows land in **one** `ReviewDecodedWorkout` surface (bottom sheet on mobile, modal on desktop) shared by three entrances — live voice, audio file, PLAUD — and commit through **one** mapper `mapDecodedWorkoutToRows` that wraps `plannedExerciseToEntry`, into the existing editable logger rows. Coach talks back with browser `speechSynthesis` behind `useCoachSpeech`, gated by the dormant `voiceConfirmationTier`, **never speaking a client name** (says "your client", "set two"); half-duplex barge-in — the mic hard-cancels TTS, TTS never opens the mic. Short imperatives ("skip rest", "add pull-ups") still route to `/api/ai-command/execute` and remain subject to Cortex gates: **voice widens input, never authority.**

```
                 ┌──────────── ONE MIC (hold-to-talk) ────────────┐
 ActionBar mic ──┤ VoiceModeOverlay: idle→listening→transcribing  ├── barge-in cancels TTS
 Planner FAB  ───┤        →decoding→review→clarify→speaking       │        (half-duplex)
                 └───────────────────┬───────────────────────────┘
                                     │ MediaRecorder blob (webm/mp4)
                    Phase A ─────────▼─────────  POST /api/ai-chat/transcribe  (EXISTING)
                                { transcript }  ──► rendered immediately, editable text
                    Phase B ─────────▼─────────  parse lane used by History Import (EXISTING)
                        redact(roster) → LLM → parseWorkoutTranscript → DecodedWorkout
                                     │
     ┌── audio file ──┐              │              ┌── clarify sub-state: ≤1 question,
     │ PLAUD ingest   ├──────────────┤              │   3s no-answer → best-effort + flag
     └── History Imp. ┘              ▼              └──────────────┬──────────────────────
                        ReviewDecodedWorkout (ONE surface, 3 doors) ◄┘
                                     │  mapDecodedWorkoutToRows()  ← ONLY mapper
                                     ▼
                   existing editable logger rows ──► POST /api/workout-forms (BYTE-PINNED, untouched)

 Short imperative branch: transcript → /api/ai-command/execute → Cortex gates (409/pain/eligibility)
```

## §2 — Rulings recap (one paragraph)

Recorded and binding: **(a)** MediaRecorder is the capture primitive; Web Speech is fallback/preview only. **(b)** Two-phase return — transcript first, decode second, on **existing** endpoints. **(c)** Browser `speechSynthesis` is the default talk-back (free, offline, instant, no PII hop); Gemini TTS stays a `pro`-gated upgrade toggle, never default; **no client names are ever spoken or sent to a TTS provider.** **(d)** Half-duplex barge-in: mic press cancels speech; no simultaneous listen+speak. **(e)** Clarification is a **sub-state of review**, never a blocking modal — one question max, timeout to best-effort with a `needs-review` flag. **(f)** Exactly **one mic** and exactly **one review surface** app-wide. **(g)** **Refuse-new-endpoint**: every lane reuses an existing route (field additions allowed, new routes not). **(h)** The dropped vocab-bias third argument is a P0 fix, not an enhancement — it is the "one-eighty-five" guard.

---

# §3 — VOICE-SURFACE CUT LIST (complete)

## 3.1 Entry points (the six)

| # | Surface today | Symbol / file target | Verdict | Action | Δ LOC | Slice |
|---|---|---|---|---|---|---|
| E1 | ActionBar mic → dictation strip → `/api/ai-command/execute` | `ActionBar` mic button + `DictationStrip` (logger `components/WorkoutLogger/ActionBar*`) | **KEEP as THE mic** | Button now opens `VoiceModeOverlay`. Strip's inline transcript UI deleted (overlay owns it). Command lane kept as a **server-side classification branch**, not a UI. | −180 | S3, S5 |
| E2 | Setup-stage Voice/File **Import** → `/api/workout-logs/upload` | `WorkoutImportPanel` / setup-stage import card | **MERGE** | Loses its own reviewer; becomes a one-line **"Import audio file"** row inside the Coach sheet. Keeps file picker (real job: PLAUD `.mp3`/`.m4a`). Wrong-stage placement dies. | −240 | S6, S8 |
| E3 | Coach drawer **voice pill** (2nd SpeechRecognition, auto-send @2s silence) | `CoachDrawerVoicePill` + its local `recognitionRef` | **DELETE** | Contract conflict (auto-send vs explicit send) is the #1 confusion source. Drawer mic delegates to `useJarvisVoiceLoop`. | −310 | S5 |
| E4 | Coach drawer **TTS toggle** (`useTextToSpeech`, default OFF, robotic) | `useTextToSpeech` → wrapped by new `useCoachSpeech` | **KEEP, rewired** | Single speech authority; default **ON** for confirmations tier only; voice/rate picked from best available local voice; Gemini TTS behind `pro` toggle. | +90 / −40 | S7 |
| E5 | **History Import** (same parser, draft mode) | `HistoryImportModal` | **KEEP data lane, DELETE its UI reviewer** | Third door into `ReviewDecodedWorkout`. Draft-mode flag preserved as a prop on the shared surface. | −190 | S6 |
| E6 | "Full Command Center" link (3rd + 4th voice stacks off-page) | logger footer/overflow link | **DEMOTE** | Removed from the logger's primary chrome → overflow menu. Command Center's own voice stacks migrate to the shared hook (S5) but are **not** logger entry points. | −0 (link move) | S3 |

**Result: 6 entrances → 1 mic + 1 file row + 1 history lane, all landing in ONE surface.**

## 3.2 The seven SpeechRecognition implementations

| # | Impl | File target / symbol | Verdict | Note |
|---|---|---|---|---|
| R1 | Mature shared hook | `useSpeechRecognition` | **KEEP (demoted)** | Becomes *fallback/preview only*, consumed exclusively by `useVoiceCapture`. |
| R2 | **DEAD** `DictationOrb` (~500 LOC, zero importers) | `DictationOrb/*` | **DELETE whole dir** | Verify-zero-importers grep is the AC. |
| R3 | Logger-local dictation hook (no MediaRecorder fallback) | `useWorkoutLoggerDictation` | **DELETE** | Superseded by `useVoiceCapture`. |
| R4 | Coach drawer pill impl | inline in E3 | **DELETE** | See E3. |
| R5 | Planner Coach-dock impl | `admin-workout-planner/.../useCoachDockDictation` | **MERGE** | Keeps its add/swap/remove/update/generate intents; capture swapped to shared hook. |
| R6 | Command Center impl A | Command Center voice panel | **MERGE** | Shared hook; UI untouched this cycle. |
| R7 | Command Center impl B | Command Center secondary | **DELETE** | Duplicate of R6. |
| — | `useSurfaceCoachDock` (already accepts `surface:'workout-logger'`, already has MediaRecorder fallback) | keep | **PROMOTE** | Its MediaRecorder path is the seed for `useVoiceCapture` — do not rewrite from scratch. |

**7 → 1 + 1** (`useVoiceCapture` primary MediaRecorder; `useSpeechRecognition` fallback).

## 3.3 Mappers and parse paths

| Item | Today | Verdict | Target |
|---|---|---|---|
| Row mappers | 2 competing parsed→rows mappers | **1** | `frontend/src/utils/workout/mapDecodedWorkoutToRows.ts` — sole caller of `plannedExerciseToEntry`; enforced by ESLint `no-restricted-imports`. |
| Parse paths | 4 competing (command classifier, upload parse, history parse, PLAUD direct) | **1** | Server `parseWorkoutTranscript`. Command classifier survives *only* for ≤6-word imperatives, and its output is never a row. |
| Confirmation policy | `voiceConfirmationTier` dormant | **ACTIVATE** | Single source of "when does Coach speak". |
| Vocab bias | 3-arg call into 2-arg signature (silently dropped) | **FIX** | Widen signature; pass exercise names + client's recent weights as bias terms. |

## 3.4 Surviving surfaces — each with its one-sentence job

| Surface | Job (one sentence) |
|---|---|
| **Coach Mic** (ActionBar button / planner FAB) | The single place a human starts talking to Swan Coach. |
| **VoiceModeOverlay** | Shows the honest state ladder (listening → transcribing → decoding → speaking) and always offers "Type instead". |
| **ReviewDecodedWorkout** | The one place decoded rows are read, corrected, and committed — never auto-committed. |
| **Coach Drawer** (text chat + speech toggle) | Typed conversation and coaching answers when hands are free. |
| **Import audio file** (row inside Coach sheet) | Feeds a recorded file (incl. PLAUD) into the same review surface. |
| **History Import** | Backfills past sessions through the same decoder in draft mode. |

## 3.5 Deletion ledger + guard tests

| Guard | Mechanism |
|---|---|
| Single mic invariant | Test: render logger; assert exactly one element matching `[data-voice-entry]`. |
| Single mapper | ESLint `no-restricted-imports` on `plannedExerciseToEntry` outside `mapDecodedWorkoutToRows.ts`. |
| No parallel write path | Test: spy on `POST /api/workout-forms`; assert body from voice commit is byte-identical to body from a manually typed equivalent row set. |
| No dead LOC returns | CI grep: `DictationOrb`, `useWorkoutLoggerDictation`, deleted symbols = 0 hits. |
| Privacy copy honesty | Snapshot-locked string: audio disclosure sentence must contain "audio is sent" and must **not** contain "removed before any AI processing". |

**Net: ≈ −1,150 LOC deleted, ≈ +620 added → ≈ −530 net, six entrances → one.**

---

# §4 — WORKOUT PLANNER OVERHAUL SPEC

## 4.1 Information architecture — three surfaces, not one stack

Mobbin ruling holds: **program overview** and **day editor** are different densities. Today's single 21k-line vertical stack conflates them.

| Surface | Job | Mobile (375–430px) | Desktop (≥1280px) |
|---|---|---|---|
| **A. Program** | See weeks/days, adherence, what's next | Default view; week ribbon + day list | Left rail of ThreePanel replaced? No — Program is a **view toggle**, top-level segmented control |
| **B. Day** (builder) | Build/edit one day fast | Full-width tab "Builder"; rows are cards; sticky SaveBar | Center panel (unchanged) |
| **C. Library** (Rolodex) | Find/substitute an exercise | Full-screen sheet from FAB or tab "Exercises" | Left panel (unchanged) |
| **D. Teach** | Why this exercise | Collapsible accordion under the row it explains | Right panel (unchanged) |
| **E. Coach** | Talk/dictate the plan | **FAB, above the fold**, purple, always visible | Fixed dock in right rail top slot |

**Mobile rules:** top bar 56px (Lens switcher · client chip · NBA chip) → content → bottom tab bar 48px (`Program | Builder | Exercises`) → Coach FAB at `bottom:72px; right:16px`. The Rolodex's 520px list + 5 chip rows **never** stack above the builder again: below 1280px the Rolodex is a **sheet**, not a column. Add breakpoints at **375 / 430 / 768 / 1024 / 1280** (today: 23 media queries, smallest 430px — that's the bug).

## 4.2 Command Panel simplification (6 sections → 2 rows + 1 sheet)

| Current control | Verdict | New home |
|---|---|---|
| Client select | **KEEP, promote** | Context bar chip 1 — **pre-selected by NBA** |
| OPT phase | **KEEP, derive** | Context bar chip 2, defaulted from client's current phase; tap to override |
| Category | **KEEP, demote** | Advanced sheet; **force-lock to `full_body` for multi-week is now VISIBLE** ("Multi-week programs are full-body — change duration to pick a split") |
| Goal | **KEEP, demote** | Advanced sheet |
| Equipment | **KEEP, demote** | Advanced sheet (multi-select chips) |
| **Generate** | **KEEP, promote** | Single primary button, row 2, full-width on mobile |
| Guided / Power toggle | **MERGE → delete** | Absorbed into generation-mode control |
| Self-gen pill | **KEEP** | Context bar, read-only badge when viewer is self-planner |
| Plan-mode bar | **MERGE** | Becomes explicit **Scope** segmented control: `Single workout ⟷ Multi-week program` — this is now the **only** thing that selects the endpoint. No silent re-targeting. |
| Generation-mode bar (Auto / Guide-Me / Deep-Grill) | **KEEP, demote** | Advanced sheet, 3 radio rows with one-line explainers |
| Training style | **KEEP, demote** | Advanced sheet |
| View toggle that *silently writes generation mode* | **DELETE that side-effect** | View toggle affects presentation only (this is now a Lens law, §5) |
| Plan duration that *silently re-targets endpoint* | **DELETE that coupling** | Duration is derived from Scope; Scope drives endpoint. |

**Three overlapping mode controls that could disagree → one Scope + one Generate + one Advanced sheet.** Acceptance: a property test asserts `endpointFor(scope)` is a pure function of `scope` alone.

## 4.3 Rolodex upgrade — KEPT, never replaced

| Item | Today | Upgrade |
|---|---|---|
| Filters | 5 chip rows always visible (named anti-pattern) | **1 "Filters" button + count badge** → sheet with grouped facets; active filters render as ≤3 dismissible chips + "+N" |
| Search | present | **Search-first**: focus on open, debounce 150ms, fuzzy on name + alias + muscle |
| Media | none | **Media preview**: 1 loop thumbnail per exercise, `loading="lazy"`, plays only on tap, `prefers-reduced-motion` → static frame |
| NASM | none | **NASM filters** (OPT phase, movement pattern, plane, regression/progression) as facet group |
| Pain | silently excluded | **Pain-excluded-with-reason**: excluded items render dimmed + lock icon + reason line ("Excluded: right knee, flexion") + "Ask Coach for a substitute" — **never silently hidden** |
| Plan tab | none | **Plan tab** inside the Rolodex sheet: "already in this day/week" with count, so trainers stop double-adding |
| Add gesture | drag/click ambiguity | **Single tap = add** + row flash + toast with **Undo (5s)**; drag retained on desktop only |
| Virtualization | 520px fixed list | Fill-available height; keep existing virtualizer (**no new dep**) |
| Touch | mixed | 44px min rows |

## 4.4 Save / Activate matrix fix (6 buttons under 5 booleans → 1 primary + overflow)

Booleans: `isDirty`, `isSaved`, `isActive`, `hasActiveOther`, `canActivate` (role/eligibility).

| # | State | Primary button | Overflow items | Status line |
|---|---|---|---|---|
| 1 | new, dirty, unsaved | **Save plan** | Discard | "Not saved" |
| 2 | saved, clean, not active, no other active | **Activate** | Duplicate · Save as template · Delete | "Saved · not active" |
| 3 | saved, clean, not active, other active | **Activate (replaces current)** | same + "View active plan" | "Saved · another plan is active" |
| 4 | saved, **dirty** | **Save changes** | Revert · Duplicate | "Unsaved changes" |
| 5 | active, clean | **Assign / Schedule** | Duplicate · Save as template · Deactivate | "Active" |
| 6 | active, **dirty** | **Save changes** | Revert | "Active · unsaved changes" |
| 7 | `canActivate === false` | **Save plan** | Duplicate · Save as template | "Activation requires trainer role" (disabled reason **stated**) |

Rules: **exactly one primary button** at all times; every disabled control states its reason; the whole matrix lives in **one pure function** `resolveSaveBar(state) → {primary, overflow[], statusText}` (≤80 lines, 7 unit tests = 7 rows). Rendered by a shared `<SaveBar>` slot that **every Lens must mount** (§5 law L4).

## 4.5 Next-best-action (NBA)

Boot state today: hardcoded defaults, no client, no context. Fix — a pure resolver over data the **Plan Surfacing spine already provides** (cursor truth, schedule links). **No new endpoint.**

`resolveNextBestAction(cursor, plans, schedule, roster) → NBA`

| Priority | Condition | NBA chip copy | Tap action |
|---|---|---|---|
| 1 | Client has session today/next 24h | "Today: <initials> 5:30 — build Week 3 Day 2" | Preselect client+phase, open Builder on that day |
| 2 | Active plan week ends within 3 days | "Week 4 deload is next for <initials>" | Preselect, Scope=Multi-week, phase=deload |
| 3 | Plan awaiting Swan Coach review (409 pending ack) | "1 plan needs your review" | Open SafetyGate modal |
| 4 | Client with no active plan | "<initials> has no active plan" | Preselect, Scope=Multi-week |
| 5 | Last session logged pain flag | "Knee flagged last session — substitute?" | Open Rolodex with pain facet applied |
| 6 | none | "Pick a client to start" | Focus client chip |

NBA chip sits in the top bar on mobile, above the Generate row on desktop. **Client names never leave the browser toward an LLM** — chip uses initials; the resolver is client-side over already-loaded data.

## 4.6 Template library (cross-client) — the named gap

Today Blend/Duplicate require an existing **same-client** plan. Fix without new endpoints:

| Concern | Decision |
|---|---|
| Storage | Reuse saved-plans store with `isTemplate: true` + `templateMeta {name, phase, split, weeks, tags[]}`. **Field addition on an existing route** — allowed; new route — refused. |
| Read | Existing saved-plans list call gains `scope=templates` query param (trainer-owned + org-shared). FINISHER-ONLY slice. |
| Create | "Save as template" in SaveBar overflow → strips client id, strips personal notes, keeps structure/loads-as-percentages. **PII scrub is a unit-tested pure function.** |
| Apply | Generate sheet gains "Start from template" → picker (search + phase/split/weeks facets) → applies to selected client, then **re-runs pain exclusions for THAT client** and surfaces every substitution with reason. |
| Safety | Applying a template is a **generation event**: it must pass the same Cortex eligibility + 409 review gate. A template can never bypass the gate. |
| Ownership | Template list is trainer-scoped; org sharing is owner-gated (billing/permission adjacent) → flag `PLANNER_TEMPLATES_ORG_SHARE` default OFF. |

## 4.7 Prop-drilling / context refactor

Today: ~179 props in one literal page→layout; layout prop type = intersection of 6 component prop types; 14 hooks + 10 `useState` in a 299-line page; 18 files > 250 lines.

| Context | Owns | Consumers |
|---|---|---|
| `PlannerDataContext` | client, phase, scope, generatedPlan, builderRows, savedPlans, templates, rolodex query state, plan-vs-actual data | Builder, Rolodex, Program, SavedPlans |
| `PlannerUIContext` | activeModal, activeTab (mobile), lensId, advancedSheetOpen, teachOpenFor, toasts, skeleton flags | every Lens, all overlays |
| `PlannerActionsContext` | **all writes**: `addExercise`, `removeExercise`, `swap`, `updateSet`, `reorder`, `generate`, `save`, `activate`, `assign`, `applyTemplate`, `ackSafetyGate` | Lenses call these; **Lenses never fetch** |
| `PlannerVoiceContext` | voiceState, transcript, pendingDecodedRows, clarifyQuestion | Coach FAB/dock, ReviewDecodedWorkout |

Rules: **layout boundary ≤ 12 props** (id, children, slots). One derived selector module `plannerSelectors.ts` (pure, tested) replaces inline `useMemo` chains. `resolveSaveBar`, `resolveNextBestAction`, `endpointFor` all live in `plannerLogic/` as pure functions with unit tests — this is what makes the refactor safe. File split targets:

| File | Today | After |
|---|---|---|
| `WorkoutPlannerPage.tsx` | 299 lines, 10 `useState`, 14 hooks | ≤120 lines: providers + `<PlannerLensHost/>` |
| `WorkoutPlannerLayout.tsx` | 179-prop intersection type | ≤80 lines: slot renderer |
| 18 files > 250 lines | — | all ≤300 (target ≤250) — split by responsibility, **never** by line count |

## 4.8 Plan-vs-actual visibility

Program surface renders, per day: `planned` vs `logged` with a 3-state pill — `✓ done` / `~ modified` / `· missed` — plus per-exercise delta when tapped (planned 3×8@185 → actual 3×8@175, "reduced: knee"). Data comes from existing logger reads. Chart (adherence over weeks) is **Victory-only**, one chart max, Signal Board Lens promotes it, other Lenses collapse it.

## 4.9 Activation / assignment flow

`Save → Activate → Assign(schedule)` becomes three explicit, non-overlapping steps mirroring the SaveBar matrix. Activation always shows the *replacement* consequence before it happens (state 3). Assignment writes through the existing schedule links from the locked Plan Surfacing spine — **do not re-plan cursor truth or Plan Reveal**; the planner only links into them.

## 4.10 Consolidation of loading/empty/error idioms

3 skeleton idioms + 4 empty-state components → **1 each**: `<PlannerSkeleton variant="rows|list|panel"/>`, `<PlannerEmpty icon title body action/>`, `<PlannerError retry/>`. Error boundaries: one around the Lens host, one around the Coach/voice subtree (a voice crash must never take down the builder).

## 4.11 Preserve-verbatim list (regression tests written FIRST)

409 `SWAN_COACH_REVIEW_REQUIRED` ack-retry (modal stays open on re-block) · guided `/candidates` per-slot picking · Coach dock fuzzy-name add/swap/remove/update/generate · byte-pinned `POST /api/workout-forms` body · a11y discipline (aria-pressed, aria-live, 44px) · Exercise Rolodex existence.

---

# §5 — TEN PLANNER LENS STYLES

## 5.1 What varies vs what NEVER varies

| Varies (allowed) | Never varies (law) |
|---|---|
| Density (row height, font scale, gap) | Which endpoint is called |
| Layout topology (panels, tabs, stack, ribbon) | Write handlers (all via `PlannerActionsContext`) |
| Information **order** and progressive disclosure | Presence of SaveBar, SafetyGate slot, aria-live status |
| Motion (transitions, none) | Pain-exclusion reasons, gold=earned, purple=Coach |
| Which panel is primary / default tab | Rolodex reachability (≤1 tap) |
| Chart prominence (collapsed ↔ hero) | Data fetching (Lenses never fetch) |
| Chrome weight, borders, shadows | 44px targets, reduced-motion, ≤300-line files, styled-components only |

## 5.2 The ten

| # | id | Name | Primary surface / topology | Density | Motion | Info order | For |
|---|---|---|---|---|---|---|---|
| 1 | `studio-classic` | **Studio Classic** ← **DEFAULT, no-regression** | Wraps **today's ThreePanel verbatim** (Rolodex ‖ Builder ‖ Teach) | as-is | as-is | as-is | Everyone today; snapshot-identical |
| 2 | `thumb-deck` | **Thumb Deck** | Mobile-first: bottom tabs `Program\|Builder\|Exercises`, Rolodex as sheet, Coach FAB | roomy, 48px rows | 200ms slide | NBA → day → rows → SaveBar | Trainer on the gym floor, 375px |
| 3 | `ledger-grid` | **Ledger Grid** | Dense desktop table: one row per set, inline edit, keyboard-first (`j/k`, `Tab`) | compact, 32px, tabular figures | none | exercise → sets → load → tempo → notes | Power users, multi-week bulk edits |
| 4 | `card-stack` | **Card Stack** | One day at a time, horizontal swipe/arrow between days | roomy | 250ms x-slide | day header → exercises → next-day peek | Focused single-day building |
| 5 | `week-ribbon` | **Week Ribbon** | Program-first: horizontal week scroller on top, tapped day expands below | medium | 180ms expand | weeks → day → rows | Periodization review, deload planning |
| 6 | `coach-console` | **Coach Console** | Coach dock + Teach Mode are the **left 40%**; builder right; generation-forward | medium | subtle purple pulse on Coach state | Coach state → generated preview → accept/edit → SaveBar | Deep-Grill / debate handoff workflows |
| 7 | `blueprint` | **Blueprint** | Print/PDF-like single column, high contrast, page-break rhythm, no hover chrome | print-tight | none | title → week → day → exercise table → notes | Handoff, PDF export parity, client print |
| 8 | `focus-lane` | **Focus Lane** | Single column, **one section at a time**, giant type, minimal chrome, explicit Next/Back | max roomy, 20px+ base | none (a11y) | one thing per screen | Low-vision, cognitive load, reduced-motion, older trainers |
| 9 | `rolodex-first` | **Rolodex First** | Library is the hero (2-col media grid); builder is a persistent bottom tray showing count | medium, media-rich | 150ms card lift | search → facets → media grid → tray | Substitution-heavy sessions, exploring the catalog |
| 10 | `signal-board` | **Signal Board** | Plan-vs-actual telemetry hero (one Victory chart), adherence pills, builder secondary | compact | none | adherence → flags → deltas → rows | Weekly review, retention conversations |

## 5.3 Conformance laws (the "skins render zero rest controls" equivalents)

| Law | Statement | Test |
|---|---|---|
| **L1** | No Lens declares a mutation. All writes go through `PlannerActionsContext`. | AST/ESLint: no `fetch`/`axios`/`useMutation` inside `lens/styles/**` |
| **L2** | Every Lens mounts `<SafetyGateSlot/>`; the 409 ack-retry flow is identical in all 10. | Conformance suite: for each lens, mock 409 → modal visible → re-block keeps it open |
| **L3** | Every Lens mounts `<SaveBar/>` and renders all 7 matrix states correctly. | 10 lenses × 7 states parametrized snapshot |
| **L4** | Every Lens exposes the Rolodex in ≤1 interaction and shows pain-exclusion **reasons**. | Conformance suite: `getByRole('button',{name:/exercises|library/i})` present; excluded item has reason text |
| **L5** | Every Lens renders the aria-live status region and preserves aria-pressed on toggles. | axe + role query per lens |
| **L6** | No Lens may change scope/endpoint/duration/category. | Property test: `endpointFor(scope)` identical across all lens ids |
| **L7** | Gold only for earned, purple only for Coach, `var(--token,#fallback)` only. | Stylelint (warning → error after migration) + token grep per lens dir |
| **L8** | Every Lens honors `prefers-reduced-motion` (motion → 0ms). | Test with matchMedia mocked |
| **L9** | `studio-classic` renders **byte-identical** to pre-Lens production. | Golden snapshot captured **before** the registry lands (S12 gate) |
| **L10** | Each lens dir ≤300 lines/file, lazy-loaded, ≤25KB gz. | CI size check + line count |

## 5.4 Registry & seam

```
admin-workout-planner/lens/
  registry.ts               # id → {name, blurb, load: () => import(...)}   ~60 lines
  PlannerLensHost.tsx       # reads lensId from PlannerUIContext, Suspense + ErrorBoundary → fallback studio-classic
  slots.tsx                 # SaveBar / SafetyGateSlot / StatusLive / CoachSlot / RolodexSlot
  conformance.test.tsx      # runs the 10 laws × 10 lenses
  styles/<id>/index.tsx     # layout only
```

Insertion seam = **the ThreePanel region** (as identified). Persistence: `lensId` on the existing user-preferences store (field addition, not new endpoint), fallback `studio-classic`. **Ruling on the two lanes: combine.** Layout skins (Runner-Styles pattern) own the 10 topologies; Lens catalog-v2 `--world-*` tokens **tint whichever skin is active** and stay production-gated-closed. `WorkoutPlannerLensFrame` keeps being a pass-through; the skin switch happens *inside* it, so nothing about the verified no-op behavior regresses when world tokens are off.

Switcher UI: bottom-sheet carousel (mobile, scroll-snap, pagination dots `aria-hidden`) / grid (desktop), cards `role="button"` + `aria-pressed`, active card purple border + cyan checkmark. Ships behind `PLANNER_LENS_STYLES` (default OFF); with the flag off, only `studio-classic` exists and the switcher is not rendered.

---

# §6 — SLICE SEQUENCE

Flags: `VOICE_MODE_V2`, `VOICE_TTS_DEFAULT_ON`, `PLANNER_IA_V2`, `PLANNER_LENS_STYLES`, `PLANNER_TEMPLATES`, `PLANNER_TEMPLATES_ORG_SHARE`, `PLAUD_INGEST` (existing).
Every slice ends at a **clean checkpoint**: commit-able alone, breadcrumb file `docs/breadcrumbs/S<nn>.md` (≤15 lines: what landed, flag state, next entry symbol, open questions), and **no surface left half-cutover** — old and new voice paths may coexist behind a flag, never half-wired.

## 6.1 Phase 1 — Truth defects (no new features, ship live, no flag)

| # | Slice | Owner | Files / symbols | Acceptance criteria |
|---|---|---|---|---|
| **S1** | **Privacy copy honesty (P0)** | **BUILDER-SAFE** | import panel copy, Coach drawer copy, voice overlay copy, one shared `voicePrivacyCopy.ts` | Copy states: "Your recording is sent to our speech provider to create a transcript. Names and personal details are removed from the transcript before Swan Coach reads it." Old overclaim string returns 0 grep hits. Snapshot-locked. Text-lane redaction docs unchanged. |
| **S2** | **Vocab-bias 3rd arg (P0)** | **BUILDER-SAFE** | STT call site + `transcribe` service signature | Signature accepts `biasTerms: string[]`; call passes exercise names + client's last-6-session loads; unit test asserts terms reach the provider payload; **assert terms contain zero PII** (names/emails filtered by existing redactor). Fixture test: "one eighty five" → `185`. |
| **S3** | **Invisible mic + demote Command Center link** | **BUILDER-SAFE** | ActionBar mic, dictation strip mount condition | Mic is disabled+hidden on Setup/Finish/post-save; test asserts `SpeechRecognition.start` is never called when the strip is unmounted; Command Center link moved to overflow. |
| **S4** | **Wire `AI_REST_SKIP` / `AI_REST_ADJUST`** | **BUILDER-SAFE** | rest-timer reducer/listener registry | "skip rest" and "cut rest to 45 seconds" produce the corresponding state change; 2 integration tests; unknown-intent path still returns the honest "didn't catch that" state. |
| **S5** | **Delete dead voice code** | **BUILDER-SAFE** | `DictationOrb/*` (R2), `useWorkoutLoggerDictation` (R3), Coach drawer pill (E3), Command Center dup (R7) | ≥800 LOC removed; zero grep hits for deleted symbols; **full suite green with no test deletions except tests of deleted files**; logger + drawer + planner still function on the *old* paths (drawer mic temporarily routes to shared hook). |

**Checkpoint A:** truth defects fixed, dead code gone, no behavior promised that doesn't exist.

## 6.2 Phase 2 — The Jarvis loop

| # | Slice | Owner | Files / symbols | Acceptance criteria |
|---|---|---|---|---|
| **S6** | **`useVoiceCapture`** (MediaRecorder primary) | **FINISHER-ONLY** *(iOS + permission + lifecycle judgment)* | `hooks/voice/useVoiceCapture.ts` (≤200), seeded from `useSurfaceCoachDock`'s MediaRecorder path | Permission requested **only** on user gesture; mime negotiated (`audio/webm;codecs=opus` → `audio/mp4`); hold-to-talk + tap-to-toggle both work; max 120s auto-stop; blob ≤ 8MB; visibilitychange/screen-lock → stop + retain blob + "Recording stopped when the screen locked — send it?"; denied permission → typed input focused with a reason line; verified manually on **iOS Safari 17+ standalone PWA** and Android Chrome (device matrix recorded in breadcrumb). |
| **S7** | **Two-phase transcript→decode service** | **FINISHER-ONLY** *(privacy + endpoint contract)* | `services/voice/decodeTranscript.ts`; Phase A = existing `POST /api/ai-chat/transcribe`; Phase B = existing History-Import parse lane (`transcript` **field** added if absent — no new route) | Transcript rendered ≤1.5s p50 on 4G with a 20s clip; decode returns within 6s p50 / 12s p95; server redacts roster before the LLM hop and **fails closed** (redactor error → 4xx, no LLM call); abort on unmount; retry-once on 5xx; 429 surfaces "Coach is busy — try again" and keeps the transcript editable. |
| **S8** | **`ReviewDecodedWorkout` (ONE surface, 3 doors)** | **FINISHER-ONLY** *(single write path, near byte-pinned payload)* | `components/voice/ReviewDecodedWorkout/*` (≤300/file), `utils/workout/mapDecodedWorkoutToRows.ts` | Bottom sheet ≤414px / modal ≥1280px; every field editable; low-confidence fields flagged (dotted underline + "check this"); pain flags render region+side + are **never auto-committed silently**; **Commit produces a byte-identical `POST /api/workout-forms` body vs manual entry** (spy test); Undo (5s) after commit; `draftMode` prop supports History Import; ESLint ban on `plannedExerciseToEntry` elsewhere passes. |
| **S9** | **`VoiceModeOverlay` + state ladder + clarify sub-state** | **FINISHER-ONLY** *(state machine ownership)* | `hooks/voice/useJarvisVoiceLoop.ts` (state machine only, ≤180), `components/voice/VoiceModeOverlay/*` | States exactly: `idle · listening · transcribing · decoding · review · clarifying · speaking · error`; **no state text lies** (each maps 1:1 to a real async phase); "Type instead" always visible and functional; `role="dialog" aria-modal`, focus trap, Esc closes, `aria-live="assertive"` on state, `polite` on transcript; **clarify is a sub-state of review** — one question max, 3s no-answer → best-effort + `needs-review` flag; ≥2 questions is impossible (unit test on the reducer); reduced-motion → static pulse. Behind `VOICE_MODE_V2` (OFF). |
| **S10** | **Cutover: one mic** | **FINISHER-ONLY** | ActionBar mic → overlay; planner FAB → overlay; drawer mic → overlay; setup import → "Import audio file" row | With `VOICE_MODE_V2=ON`: single-mic invariant test passes; **zero** other voice entry points render on the logger page; with flag OFF, pre-S6 behavior is intact (no half-wired surface); command lane still handles ≤6-word imperatives and still enforces Cortex 409/pain/eligibility (**voice widens input, never authority** — asserted by test: voice-dispatched blocked action returns 409 and opens the review modal). |
| **S11** | **Talk-back: `useCoachSpeech` + `voiceConfirmationTier` ON** | **BUILDER-SAFE** *(spec is complete; Finisher reviews the tier table)* | `hooks/voice/useCoachSpeech.ts` wrapping `useTextToSpeech`; activate `voiceConfirmationTier`; `pro` toggle for Gemini TTS | Default = **browser TTS ON for tier-1 confirmations only** ("Logged. Bench, three by eight at one eighty-five."); **no client names ever spoken** (unit test: any name token in the utterance → throws in dev, redacted in prod); half-duplex — mic press cancels speech within 100ms and speech never opens the mic; global mute persists; iOS unlock-on-first-gesture handled; Gemini TTS only when `requireSubscription('pro')` **and** user opts in (owner-gated flag). |

**Checkpoint B:** Sean's sentence works end-to-end on his phone, one mic, one review surface, Coach talks back, nothing auto-commits.

## 6.3 Phase 3 — PLAUD lane

| # | Slice | Owner | Acceptance criteria |
|---|---|---|---|
| **S12** | **PLAUD → same review surface** | **FINISHER-ONLY** *(replaces a direct DB write)* | PLAUD ingest lands as a **pending decoded session** in the trainer's review inbox instead of a separate dashboard DB write; opening it mounts `ReviewDecodedWorkout` (door 3); commit goes through `mapDecodedWorkoutToRows`; the separate dashboard becomes a link to the inbox; `PLAUD_INGEST` flag **explicitly set** in prod config (documented value, not "probably unset"); PowerShell launcher unchanged this cycle; direct-DB path removed only after the inbox path is verified with 3 real recordings. |

## 6.4 Phase 4 — Planner structure (must precede Lenses)

| # | Slice | Owner | Acceptance criteria |
|---|---|---|---|
| **S13** | **Golden snapshots + preserve-verbatim suite** | **BUILDER-SAFE** | Snapshot the current planner at 375/430/768/1280/1920; 409 ack-retry test; guided `/candidates` test; byte-pinned save body test; Rolodex-exists test. **These are the regression fence for S14–S18 and must be committed before any refactor.** |
| **S14** | **Pure-logic extraction** | **BUILDER-SAFE** | `plannerLogic/{resolveSaveBar, resolveNextBestAction, endpointFor, plannerSelectors}.ts` — all pure, all unit-tested (7 SaveBar rows, 6 NBA priorities, `endpointFor` property test). **No UI changes; snapshots unchanged.** |
| **S15** | **Contexts + prop-drilling kill** | **FINISHER-ONLY** *(179-prop cutover)* | 4 providers land; layout boundary ≤12 props; `WorkoutPlannerPage.tsx` ≤120 lines; page `useState` count ≤2; **all S13 golden snapshots unchanged**; no file >300 lines in changed dirs; ESLint: no `fetch` in presentational planner dirs. |
| **S16** | **Command Panel simplification + mode-conflict kill** | **FINISHER-ONLY** *(endpoint re-targeting)* | Context bar (client·phase·NBA) + Scope segmented + Generate + Advanced sheet; `endpointFor(scope)` is the **only** endpoint selector (property test); view toggle no longer writes generation mode (test); category force-lock is visible with an explanatory line; Guided/Power toggle gone; **409 gate behavior unchanged**. Behind `PLANNER_IA_V2` (OFF). |
| **S17** | **Mobile IA + SaveBar + skeleton/empty consolidation** | **BUILDER-SAFE** | At 375px: bottom tabs render, Rolodex is a sheet (never stacked above builder), Coach FAB visible above the fold, no horizontal scroll, all targets ≥44px; SaveBar renders exactly one primary in all 7 states; 1 skeleton + 1 empty + 1 error component (old idioms 0 grep hits); axe clean at 375/1280. Under `PLANNER_IA_V2`. |
| **S18** | **Rolodex upgrade (KEPT)** | **BUILDER-SAFE** | Filters button + sheet (5 chip rows gone); search autofocus + 150ms debounce; media preview lazy + reduced-motion static; NASM facet group; **pain-excluded items visible, dimmed, with reason + "Ask Coach for a substitute"**; Plan tab shows "already in this day/week" counts; single-tap add + 5s Undo; virtualization retained; **no new dependency** (verified `package.json` diff = 0). |

## 6.5 Phase 5 — Lenses, templates, plan-vs-actual

| # | Slice | Owner | Acceptance criteria |
|---|---|---|---|
| **S19** | **Lens registry + slots + `studio-classic`** | **FINISHER-ONLY** *(registry seam)* | `studio-classic` renders **byte-identical** to S13 golden snapshots at all 5 widths; registry lazy-loads; host has ErrorBoundary → falls back to `studio-classic`; `WorkoutPlannerLensFrame` remains a pass-through no-op; `lensId` persisted via existing prefs (field addition); conformance suite scaffolded and green for 1 lens. Behind `PLANNER_LENS_STYLES` (OFF). |
| **S20** | **Lenses 2–5** (`thumb-deck`, `ledger-grid`, `card-stack`, `week-ribbon`) | **BUILDER-SAFE** *(laws are mechanical once S19 lands)* | All 10 conformance laws pass per lens; each lens dir ≤300 lines/file and ≤25KB gz; switching lenses never triggers a fetch (network spy = 0 new requests); `endpointFor` identical across lenses; axe clean per lens at 375/1280. |
| **S21** | **Lenses 6–10** (`coach-console`, `blueprint`, `focus-lane`, `rolodex-first`, `signal-board`) | **BUILDER-SAFE** | Same laws; `focus-lane` passes reduced-motion + 200% zoom; `blueprint` matches the PDF export layout within tolerance; `signal-board` uses **Victory only**, exactly one chart, purple reserved for Coach and gold only for earned. |
| **S22** | **Lens switcher UI + Appearance entry** | **BUILDER-SAFE** | Carousel (mobile scroll-snap + dots `aria-hidden`) / grid (desktop); cards `role=button` + `aria-pressed`; active = purple border + cyan check; reduced-motion disables lift + smooth scroll; with `PLANNER_LENS_STYLES=OFF` the switcher does not render and only `studio-classic` loads. |
| **S23** | **Next-best-action wired** | **BUILDER-SAFE** | Boot with a client preselected per resolver priority; NBA chip copy matches the 6-row table; tap performs the stated action; **initials only, no names, resolver is client-side**; falls back cleanly to "Pick a client to start". Under `PLANNER_IA_V2`. |
| **S24** | **Template library** | **FINISHER-ONLY** *(cross-client data + gate interaction)* | "Save as template" strips client id + personal notes (unit-tested scrub, asserted zero PII); templates listed via existing route + `scope=templates`; "Start from template" applies to a client and **re-runs pain exclusions with visible substitution reasons**; applying a template still passes Cortex eligibility + 409 review (test: blocked template application opens the gate). `PLANNER_TEMPLATES` OFF; `PLANNER_TEMPLATES_ORG_SHARE` **owner-gated**, OFF. |
| **S25** | **Plan-vs-actual + activation/assignment** | **BUILDER-SAFE** | Program surface renders `✓/~/·` per day with per-exercise deltas + reasons; activation shows the replacement consequence before acting; assignment writes via the **existing** Plan Surfacing schedule links (cursor truth and Plan Reveal untouched — assert no changes in those files). |

## 6.6 Dark-flag strategy

| Flag | Default | Kill-switch behavior | Gate to flip |
|---|---|---|---|
| `VOICE_MODE_V2` | OFF | Reverts to pre-S6 mic path (fully wired, not half) | 10 real dictations on Sean's iPhone; ≥85% of exercises correct pre-edit; 0 auto-commits |
| `VOICE_TTS_DEFAULT_ON` | OFF → ON at S11 | Silent Coach, text confirmations only | Name-leak test suite green; barge-in <100ms verified |
| `PLANNER_IA_V2` | OFF | Old command panel + stack | S13 snapshots unchanged; axe clean at 375px |
| `PLANNER_LENS_STYLES` | OFF | Only `studio-classic` loads | Conformance suite green ×10 |
| `PLANNER_TEMPLATES` | OFF | No template UI | PII scrub test + gate test green |
| `PLANNER_TEMPLATES_ORG_SHARE` | OFF — **owner-gated** | Trainer-scoped only | Sean's explicit approval (permissions/billing adjacent) |
| `PLAUD_INGEST` | **explicitly set** in prod (documented) | Direct-DB legacy path retained until S12 verified | 3 real recordings through the inbox |

---

# §7 — THREE FAILURE MODES + DE-RISKS

### F1 — The phone won't record (iOS Safari/PWA mic policy, screen lock, gym noise)
**Mechanism:** iOS grants mic only on a direct user gesture, revokes on backgrounding, and standalone-PWA behavior differs from tab Safari; a screen lock mid-set silently kills the stream; 85dB gym noise + music wrecks STT accuracy on top of that. A browser-speech-first design dies here — which is exactly why SpeechRecognition is demoted.
**De-risk:**
1. **S6 is FINISHER-ONLY and device-gated:** it does not merge until hold-to-talk is verified on iOS Safari 17+ **standalone PWA**, iOS tab Safari, and Android Chrome — matrix recorded in the breadcrumb.
2. **Hold-to-talk, not always-on**: press is the gesture, release is the stop → permission model satisfied by construction; no background audio, no wake word, no continuous listening.
3. **Lock-safety:** `visibilitychange`/`pagehide` → stop recorder, **retain the blob**, show "Recording stopped when the screen locked — send it?" so no utterance is lost. Optional Screen Wake Lock where supported, never required.
4. **Noise:** `echoCancellation:true, noiseSuppression:true, autoGainControl:true` on `getUserMedia`; **vocab bias (S2)** carries exercise names + the client's recent loads (the "one-eighty-five" guard); Phase A shows the **raw transcript first and editable** — a misheard word is fixed in 2 taps before decode; hard failure path is always "Type instead", which is one tap away in every state.
5. **Kill-switch:** `VOICE_MODE_V2=OFF` restores the previous path fully wired.

### F2 — One bad parse and the trainer never trusts Coach again
**Mechanism:** rambling speech + 6-second LLM latency + a wrong weight written into a client's log = permanent abandonment. Trust is lost on the *first* bad row, not the tenth.
**De-risk:**
1. **Nothing auto-commits, ever.** Review is mandatory. This is a hard law of S8, tested by asserting no `POST /api/workout-forms` fires without an explicit Commit event.
2. **Confidence is visible:** parser confidence per field → low-confidence values get dotted underline + "check this"; the aggregate `needs-review` flag persists on the row after commit so a mistake is auditable, not invisible.
3. **One clarifying question max**, then best-effort + flag (S9). Interrogation is worse than a wrong guess the trainer can see and fix.
4. **Transcript is the receipt:** Phase A text stays visible next to the rows; the trainer can always see *what Coach heard*, so errors read as "mishearing" (forgivable) not "hallucination" (fatal).
5. **Undo (5s) on commit**, and edits after commit go through the normal row editor — no special path.
6. **Latency honesty:** decoding is a named state with elapsed indication; the mic is disabled during `transcribing`/`decoding` so a double-tap can't double-submit; >12s → "Coach is taking too long — keep your transcript and add rows manually."
7. **Cost/latency control:** decode is one call per utterance on the existing lane (no streaming, no retries beyond one), and short imperatives never hit the parser.

### F3 — The planner refactor breaks the safety gate or the byte-pinned payload
**Mechanism:** collapsing 179 props into contexts while simultaneously restructuring the command panel is the highest-regression change in this plan; the 409 ack-retry contract and the byte-pinned save body are exactly the kind of thing a mid-tier agent silently "improves."
**De-risk:**
1. **S13 lands first, always:** golden snapshots at 5 widths + a preserve-verbatim suite (409 ack-retry, guided `/candidates`, byte-pinned body, Rolodex existence) are the fence. **No refactor slice merges with a red fence.**
2. **Order is mandatory:** pure logic (S14, snapshots unchanged) → contexts (S15, snapshots unchanged) → UI change (S16/S17, snapshots *intentionally* updated with reviewed diffs). Never logic+UI in one slice.
3. **Refactor slices are FINISHER-ONLY** where they touch the endpoint selector, the contexts cutover, templates, or anything adjacent to the save payload; UI-mechanical slices are BUILDER-SAFE.
4. **Byte-pin protection:** one spy test compares the save body from voice, manual, template, and PLAUD paths — all four must be byte-identical for equivalent rows. A single mapper (S8) plus an ESLint import ban makes divergence a build failure, not a runtime surprise.
5. **Lens laws L2/L6:** every lens must render the SafetyGate slot and cannot alter endpoint selection — conformance suite runs 10×, so a decorative style can never become a write-path bug.

---

# §8 — WHAT MY HOSTILE SELF-REVIEW CHANGED

| # | My first draft said | Attack | Final ruling |
|---|---|---|---|
| 1 | Add a new `POST /api/voice/decode` endpoint for the two-phase flow. | Violates refuse-new-endpoint; adds a route to review, rate-limit, redact, and secure for zero capability gain — `/api/ai-chat/transcribe` and the History-Import parse lane already exist. | **Two phases on existing routes only.** Phase B accepts a `transcript` **field** on the existing parse route if absent. No new surface area. |
| 2 | Build the 10 Lenses right after the voice loop; the planner refactor could follow. | Ten styles on top of a 179-prop drill = 10× the prop-drilling pain and no safe way to prove no-regression. Lenses would *lock in* the mess. | **Structure before style:** S13–S18 (snapshots → pure logic → contexts → IA → Rolodex) are hard prerequisites for S19. `studio-classic` must be provably byte-identical, which is only possible if snapshots exist first. |
| 3 | Continuous listening with 2s silence auto-send (matching the drawer's existing pill). | This is the exact contract that made the current stack confusing, it drains battery, it's illegal-by-policy on iOS after backgrounding, and it fires on gym chatter and coaching cues shouted at other clients. | **Hold-to-talk only.** Press = gesture (satisfies iOS), release = stop (bounded blob), no VAD, no wake word. The auto-send pill is deleted (E3), not preserved. |
| 4 | Gemini TTS as the default talk-back (6 curated voices, "premium feel"). | It's a per-utterance network hop and a `pro` paywall on a **safety confirmation**, it adds latency to the one thing that must be instant, and it's another provider that could receive a name. | **Browser `speechSynthesis` is the default**; Gemini TTS is an opt-in `pro` upgrade behind an owner-gated flag. **No names are ever spoken or sent** to any TTS provider — enforced by a test that throws in dev on any name token. |
| 5 | Clarifying questions as their own blocking modal turn ("Was that dumbbell or barbell?"). | A modal mid-set with sweaty hands is worse than a wrong guess; and a modal invites *two* questions, then three. | **Clarify is a sub-state of review**, inline, one question max, 3s no-answer → best-effort + `needs-review` flag. Two questions is impossible at the reducer level (unit-tested). |
| 6 | Keep the setup-stage Voice/File Import as a second review path for files. | Two review surfaces = two mappers = eventual divergence from the byte-pinned payload. That's how the current 4-parse-path mess happened. | **One review surface, three doors** (live / file / history) + PLAUD as a fourth door in S12. One mapper, ESLint-enforced. |
| 7 | Fix the privacy copy "as part of" the voice-mode slice. | Bundling a P0 truth defect behind a flagged feature means the app keeps lying in production until the flag flips. | **S1 ships live, first, unflagged**, before any new capability. Same for S2/S3/S4 — the four truth defects precede everything. |
| 8 | Marked the contexts refactor BUILDER-SAFE ("mechanical prop plumbing"). | A 179-prop cutover adjacent to the 409 gate and the byte-pinned save body is the single most dangerous change here; "mechanical" is exactly how it gets broken quietly. | **S15 is FINISHER-ONLY**, and it is split from S14 (pure extraction, BUILDER-SAFE) so the risky part is small, isolated, and snapshot-fenced. |
| 9 | Templates as a new `/api/plan-templates` resource. | Same refuse-new-endpoint violation, plus it invents a cross-client permission model nobody approved. | **`isTemplate` field + `scope=templates` param on the existing saved-plans route.** Org sharing is a separate **owner-gated** flag, default OFF. |
| 10 | Left `PLAUD_INGEST` "as configured." | "Flags likely unset in prod" is not a state you can ship a review inbox on top of. | **S12 requires the prod flag value to be explicitly documented and set**, and the legacy direct-DB path stays until 3 real recordings are verified through the inbox. |
