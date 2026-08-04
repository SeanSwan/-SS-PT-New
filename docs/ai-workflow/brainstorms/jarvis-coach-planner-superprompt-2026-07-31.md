---
decision: "SUPER PROMPT — Jarvis-grade Swan Coach voice loop + voice-stack simplification + Workout Planner overhaul + 10 Lens planner styles + PLAUD tie-in (feeds AI Village → Opus 5 → Kimi → Fable ultimate blueprint)"
status: open
supersedes: none
---

# SUPER PROMPT — SWAN COACH JARVIS + PLANNER WORLD-CLASS OVERHAUL (2026-07-31)
> You are reviewing/planning against a REAL production codebase (receipts below). Your output will be
> fused with two other AI reviews into one ultimate blueprint. **Before you return your plan, run a
> hostile review on your OWN plan — attack it, fix it, and only then return it, stating what your
> self-review changed.**

## 1. Sean's vision (owner, dictated 2026-07-31 — enhanced and gap-filled by Fable)
1. **Swan Coach = Jarvis on the Workout Logger.** On a phone, mid-session: tap the Coach button → TALK in
   plain language — "we did bench press, three sets of eight at one-eighty-five, slow tempo, knee was a
   little sore on set two, then we supersetted rows…" — and the system DECODES that rambling speech into
   structured, editable logger rows (exercises, sets×reps×weight, tempo, rest, pain flags, notes), the
   way his PLAUD recorder's AI organizes a raw recording. **No special keywords, no command syntax, no
   "say ADD EXERCISE" grammar — plain human speech.**
2. **Two-way VOICE.** Coach must talk BACK (speech synthesis): confirmations ("Logged. Bench, 3×8 at 185 —
   want a rest timer?"), clarifying questions ("Was that dumbbell or barbell?"), and coaching answers —
   a hands-busy, eyes-busy conversation loop. Trainer keeps training; the phone listens and answers.
3. **The current voice/dictation stack must get SIMPLER.** Sean's words: "complicated, confusing, overly
   done… bring it down to real life, make it as simple to use as possible, make sure it WORKS." This is
   a consolidation mandate: fewer entry points, one obvious mic, one pipeline, honest states.
4. **Workout Planner: world-class overhaul.** UI/UX audit + upgrade plan (the surface where Swan Coach
   generates plans). Fill the gaps vs the app vision (trainer-led B2B2C, next-best-action, low-click
   coaching depth). **The Exercise Rolodex is KEPT — upgrade it, never replace it** (backlog already
   names: media previews, NASM filters, pain-excluded-with-reason, Plan tab).
5. **Ten Lens styles for the planner surfaces**, exactly like the logger's Runner Styles: one engine,
   Lens-switchable presentation, so different trainers/clients get different ways to view the same
   information. Sources of taste: the Swan design brain (Crystalline Swan, SWAN-CINEMATIC-DESIGN-SYSTEM)
   + Mobbin research (see §4).
6. **PLAUD ties into the UI plan** (recording→upload→parse→review lane visible and simple), while the
   Coach voice loop covers live dictation.
7. Everything ties together coherently: one plan spine (the Plan Surfacing master plan, already locked),
   one voice pipeline, one style system — not parallel bolt-ons.

## 2. GROUND TRUTH A — the voice/dictation/Coach stack as it exists (repo-traced, file:line receipts held)
**SIX voice/import entry points reachable from the logger page** (the "confusing, overly done" complaint,
located): (1) ActionBar mic → dictation strip → `/api/ai-command/execute` → LLM intent classifier →
**ONE command per utterance** (5 logger events; NO pain slot — Sean's example sentence cannot decode
here); (2) Setup-stage Voice/File Import → `/api/workout-logs/upload` → Gemini STT → redaction →
**`workoutLogParserService` — THE JARVIS DECODER ALREADY EXISTS** (multi-exercise, sets/reps/weight/RPE/
tempo, 4 note channels, painFlags w/ body region+side, confidence) but wired to a FILE UPLOAD on the
wrong stage with no live record button; (3) Coach drawer voice pill — a SECOND SpeechRecognition impl
that AUTO-SENDS after 2s silence (opposite contract to the ActionBar mic's explicit Send); (4) Coach
drawer TTS toggle — **talk-back EXISTS**: browser `useTextToSpeech` live in the drawer, default OFF,
robotic; a premium Gemini TTS (`POST /api/ai-chat/tts`, 6 curated voices, iOS-fallback wired,
`requireSubscription('pro')`) exists but is Command-Center-only — one hook swap away; (5) History
Import (same parser, draft mode); (6) "Full Command Center" link → 3rd+4th voice stacks off-page.
**SEVEN SpeechRecognition implementations repo-wide** (one mature shared hook + six re-inventions incl. a
DEAD 500-LOC DictationOrb with zero importers); TWO parsed→rows mappers; FOUR competing parse paths.
~900 LOC deletable. The generic `useSurfaceCoachDock` already accepts `surface:'workout-logger'` and has
the MediaRecorder fallback the logger's own hook lacks.
**Confirmed defects:** ActionBar mic listens INVISIBLY on Setup/Finish/post-save (strip renders only in
Train pre-save); `AI_REST_SKIP`/`AI_REST_ADJUST` registered + backed but ZERO listeners ("skip rest"
always false-negatives); PLAUD vocab-bias silently dropped (3-arg call into a 2-arg signature — the
exact "one-eighty-five misheard" guard, dead); `voiceConfirmationTier` (when-should-Coach-speak rules)
deliberately dormant, waiting for this slice.
**Privacy:** every TEXT→LLM hop redacts + fails closed (command/chat/parse lanes verified). Every
AUDIO→STT hop sends raw audio to the provider (cannot pre-redact) — and the import UI copy OVERCLAIMS
("Names and personal details are removed before any AI processing") — **P0 truth defect, fix the copy +
disclose honestly.**
**PLAUD:** staged + operational but env-gated (flags default OFF, likely unset in prod), driven by a
PowerShell launcher, lands via DIRECT DB write on a separate dashboard — never touches the logger UI.
Strategic fact: PLAUD and the logger SHARE `parseWorkoutTranscript` — the device pipeline proves the
Jarvis decode works end-to-end TODAY.
**Phone reality [HYPOTHESIS to de-risk]:** Web Speech API is unreliable on iOS Safari/PWA — Sean's stated
use case. The MediaRecorder → server-STT lane is the device-independent one; a browser-speech-first
design fails on the exact phone in his pocket. The likely-correct capture primitive: hold-to-talk
MediaRecorder → `/api/workout-logs/upload` (or `/api/ai-chat/transcribe`) → existing parser → the
existing review card → editable rows. Command lane stays for short imperatives; paragraph logging goes
through the parser.

## 3. GROUND TRUTH B — the Workout Planner as it exists (repo-traced, file:line receipts held)
**Scale:** `admin-workout-planner/` = 164 files / 21,333 lines (93 source + 71 tests — 43% test density,
zero TODO/FIXME, zero dead files; hygiene is genuinely high). One component serves admin + trainer routes.
**Page anatomy (no tabs — one long vertical stack):** Command Panel (6 sections incl. a 6-control row:
client·OPT phase·category·goal·equipment·Generate; Guided/Power toggle; self-gen pill; plan-mode bar;
generation-mode bar Auto/Guide-Me/Deep-Grill; training style) → status strip → **ThreePanel grid**
(Exercise Rolodex rail w/ search + FIVE chip filter rows + 520px virtualized list ‖ Builder (generated
view OR manual rows) ‖ Teach Mode sidebar) → **Swan Coach dictation dock (BELOW the fold — the
differentiator is the least prominent thing on the page; hidden for self-planner viewers)** → Saved Plans
vault (backup, primary-arc, Blend). 6 overlay surfaces (4 modals + PDF vault + dock).
**Four AI generation paths:** (1) `POST /api/workout-builder/generate` single workout; (2) `/plan`
multi-week (SAME Generate button silently re-targets endpoints via plan-duration); (3) `/candidates`
guided per-slot picking; (4) Coach Command Center debate handoff via `debateJobId` polling. The 409
`SWAN_COACH_REVIEW_REQUIRED` SafetyGate contract is fully implemented and correct (ack-retry keeps modal
open on re-block) — PRESERVE VERBATIM. Coach dock dictation already does add/swap/remove/update/generate
with fuzzy name matching.
**Lens state:** planner IS wrapped in `WorkoutPlannerLensFrame`, but it's a VERIFIED NO-OP in production
(recipeResolution maps no live ids → null → pass-through, test-locked). Manifest exposes only 4 generic
hook points, and `collection.exercise` is wired to the SAVED-PLANS grid, not the builder rows the trainer
manipulates. **NONE of the Runner-Styles machinery exists for the planner** (no style registry, no
persisted store, no skin switch point, no RecipeConfig, no Appearance Studio tab). Two lanes exist:
Runner-Styles-pattern layout skins (recommended primary; insertion seam = the ThreePanel region) vs Lens
catalog-v2 world tokens (gated closed for production; 4 hook points only). [HYPOTHESIS to rule on:
combine — skins for the 10 layouts, world tokens tint whichever is active.]
**UX pain (measured):** ~179 props spread page→layout in one literal; layout's prop type = intersection
of 6 component prop types; 14 custom hooks + 10 useState in a 299-line page; 18 files over 250 lines;
only 23 media queries in 21k lines, smallest breakpoint 430px, and **below 1279px the ThreePanel
collapses to ONE column** (Rolodex's 520px list + 5 chip rows stack above the builder — the vision brief
mandates 375/414px and names "cramped chip rows" as the anti-pattern); save/activate matrix = 6
conditional buttons under 5 booleans in one header; 3 overlapping mode controls that can disagree
(view toggle silently writes generation mode; plan duration silently re-targets the Generate endpoint;
category force-locks to full_body for multi-week).
**Vision-doc gaps:** no next-best-action (boots to hardcoded defaults, no client pre-selected, no "Week 4
deload is next"); mobile-first mandate directly contradicted; NO cross-client template library
(Blend/Duplicate need an existing same-client plan); strengths to preserve: 409 gate, guided candidates,
skeleton/empty/error coverage (inconsistent form — 3 skeleton idioms, 4 empty-state components),
a11y discipline (aria labels/live, 44px, aria-pressed).

## 4. Design-language anchors (Mobbin, examined 2026-07-31)
- **Voice mode grammar:** Tolan (ambient companion orb + waveform strip + mic/stop), Alan (inline
  recording waveform + timer INSIDE an ongoing chat), Character AI (minimal full-screen voice mode),
  DeepSeek/Manus ("Recognising…" state ladder: listening → recognising → thinking → speaking).
  Lesson: a dedicated VOICE MODE with a visible state machine beats a mic icon bolted onto a text box.
- **Planner grammar:** Gymshark (create plan → add workout → exercise library multi-select → per-set
  reps/weight editing — thumb-first, zero clutter), Peloton Strength+ (program detail: hero, per-week
  day list, equipment chips, "suggested week"). Lesson: the plan-day editor and the program overview are
  DIFFERENT surfaces with different densities.
- Swan constraints on top: Crystalline Swan dark-first tokens via `var(--token,#fallback)`; the Lens
  world seam (`--world-*`) for anything themed; gold=earned ONLY; purple=Coach ONLY; 44px targets;
  ≤300-line files; styled-components only; Victory-only charts; M3 anti-jump on the logger.

## 5. What your plan MUST cover (the deliverable contract)
A. **Jarvis voice loop architecture:** capture (Web Speech API vs recorded-chunk upload vs streaming),
   transcription path, plain-speech → structured-workout decode (server-side LLM parse with the existing
   privacy redaction — NAMES NEVER reach the provider, Rule 8), confirm/repair conversation turns
   (mis-heard weights, ambiguous exercises → ONE short clarifying question max before best-effort +
   editable rows), TTS talk-back (browser speechSynthesis vs server TTS — recommend one, with the
   fallback), interruption/barge-in, offline/gym-noise reality, iOS Safari + PWA constraints (mic
   permissions, background audio, screen-lock), and how decoded rows land through the EXISTING engine
   (`plannedExerciseToEntry`-class mapping into editable rows — never a parallel write path; the
   byte-pinned save payload is untouchable).
B. **Simplification audit:** take the voice-surface inventory in §2 and produce the CUT LIST — what
   merges, what dies, what remains as the ONE mic. Every kept surface must name its job in one sentence.
C. **Planner overhaul:** IA + flow redesign (build a day in seconds, thumb-first mobile + dense desktop),
   Coach-generation UX (the 409 safety-review contract stays), Rolodex upgrade (KEPT), plan-vs-actual
   visibility, and activation/assignment flow. Tie into the locked Plan Surfacing spine (cursor truth,
   Plan Reveal, schedule links) — do not re-plan what's already locked.
D. **Ten planner Lens styles:** name ~10 concrete style directions (like Runner Styles' Focus Flow /
   Ledger Pro / Sheet Stack), what varies per style (density, layout, motion, information order — NEVER
   write-path behavior), and the conformance laws (equivalents of "skins render zero rest controls").
E. **PLAUD lane:** the upload→parse→review UX simplified into the same review surface the live voice
   loop uses (ONE "review decoded workout" surface, two entrances).
F. **Slices:** numbered, independently shippable, each with acceptance criteria + risks; flag anything
   billing/PII-adjacent as owner-gated. Mark what ships DARK behind flags. **Execution model (Sean
   2026-07-31): a mid-tier builder agent (Codex) builds most slices, then a senior finisher (Fable/Opus)
   completes and hardens.** Design slice boundaries as CLEAN CHECKPOINTS: each slice must be commit-able
   alone, resumable cold by a different agent from a short breadcrumb note, and no slice may leave a
   surface half-cutover (old+new voice paths may coexist behind a flag, never half-wired). Mark each
   slice BUILDER-SAFE (mechanical, fully specified) or FINISHER-ONLY (judgment-heavy: pipeline cutovers,
   Lens registry seams, anything near the byte-pinned save payload or billing).
G. **3 ways this fails** (be specific: gym noise, iOS mic policy, LLM decode latency/cost, trainer trust
   after one bad parse…) and the de-risk for each.

## 6. Hard laws (violating any = plan rejected)
Zero PII to LLM providers (client IDs only; roster-redaction stays in front of every provider call);
the Coach command lane's Cortex safety gates (blocking review 409, pain exclusions, fail-closed
eligibility) apply to every voice-dispatched ACTION — voice widens INPUT, never authority; trainer
indispensability (clients read+do, never decide); byte-pinned POST /api/workout-forms body; M3 anti-jump;
Rolodex KEPT; ≤300-line files; no MUI; reduced-motion guards; dictation must degrade to typed text
seamlessly (accessibility + broken-mic reality); Swan Coach is never called "AI" user-facing.

## 7. Return format
(1) One-page executive summary. (2) Architecture w/ diagrams-in-text. (3) The cut list (§5B).
(4) Planner overhaul spec (§5C). (5) The 10 styles (§5D). (6) Slice sequence w/ acceptance criteria.
(7) Failure modes + de-risks. (8) **What your own hostile self-review found and changed.**
