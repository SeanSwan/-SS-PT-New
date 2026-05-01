# Workout System Overhaul — Catalog

**Created:** 2026-04-30
**Source prompt:** Sean's voice-dictated audit of the workout system across admin → Clients & Team → Training tab + client log-workout + signup
**Sequencing (Sean-confirmed 2026-04-30):**
1. UI bugs first (no AI Village)
2. Then AI Village run on architecture
3. Then ship architecture work
4. THEN return to paused items (Triage Slice 2 / Phase A smoke / trainer-account smoke)

---

## A. UI BUGS — No AI Village needed (Pass 1)

Each row is a candidate slice. Order is roughly low-risk → high-risk and standalone-first. Every fix needs its own Rule 26 canonical surface receipt before code changes.

| ID | Title | Surface(s) | Effort | Dep | Design? |
|---|---|---|---|---|---|
| **UI-1** | Form Rating shown twice (per-exercise top header + per-set column) | `ExerciseCardComponent.tsx:77`; `WorkoutLogger.tsx:350-886` (eight `formRating` initializations) | S | — | YES — keep one or both? |
| **UI-2** | Rest timer has no audio beep | `RestTimer.tsx`, `FloatingRestTimer.tsx`, `useRestTimer.ts` | S | — | minor (sound file choice) |
| **UI-3** | Workout History "PR" trophy display ("225 × 5") needs explaining text | `EnhancedWorkoutsModal.tsx`, `ClientWorkoutsModal.tsx`, `GamificationOverview.tsx` | S | — | small copy change |
| **UI-4** | "Today's Plan" button — unclear what it loads (or if it loads anything) | `WorkoutLogger.tsx:?` | M | — | YES — define behavior |
| **UI-5** | Export PDF broken (no PDF generated) | Find handler in `WorkoutLogger.tsx`, compare to working `PricingSheetPDF.tsx` pattern | M | — | none |
| **UI-6** | "Complete & Save Workout" button doesn't actually complete/save | `WorkoutLoggerFooter.tsx`, `WorkoutLogger.submitSuccess.test.tsx`; investigate submit handler | M-L | — | none — bug |
| **UI-7** | Coach Copilot tab shows nothing | `copilot-local-styles.ts` exists but no main panel found; needs investigation | M | — | YES — define what it should show |
| **UI-8** | Equipment tab Swan Coach scan throws error on photo upload | `EquipmentManagerPage.tsx`; tied to `dashboard-tabs.ts` | M-L | UI-9? | YES — define scan flow if currently undefined |
| **UI-9** | Admin trainer↔client assignment selector regressed (was there, gone now) | `ClientsManagementSection.tsx`, `TrainersManagementSection.tsx`, `ClientDetailsPanel.tsx` — git log to find when it disappeared | M | — | none — restore prior behavior |
| **UI-10** | Signup form missing Move Fitness vs Swan Studios client-tier choice | `OptimizedSignupModal.tsx`; `User` model `clientSource` field already exists per earlier grep; need form field + backend acceptance | M | DB-check | YES — exact form copy |
| **UI-11** | Phase change exercises don't update to match new phase spec (Phase 5→1 dialog) | `WorkoutLogger.tsx` phase-change handler; `workoutBuilderGoalConfig.mjs` phase params | M-L | — | none — bug |
| **UI-12** | "Estimated duration" — Sean noticed it DOES update, but verify it updates on every change | `WorkoutLogger.tsx` duration calc | XS | — | none — verify only |

**Severity legend:** S=hours / M=half-day / L=1-2 days

**Rule 26 discipline:** before each fix, produce: route mount file:line, mounted JSX file:line, consumer hook, frontend API path string, backend route match, model field walk if any data path involved.

**Design decisions Sean must call:**
- UI-1: keep top header AND per-set, drop top, drop per-set, or restructure?
- UI-4: what should "Today's Plan" load — a saved plan for today, the active mesocycle's day, or something else?
- UI-7: what is Coach Copilot supposed to be? AI chat assistant for the trainer, exercise suggester, form coach?
- UI-8: scan flow design — instant identify + auto-tag, or scan→preview→user-confirms?
- UI-10: copy choices for "Swan Studios (paid)" vs "Move Fitness (free)" radio/select labels

---

## B. ARCHITECTURE — AI Village (15-brain) needed (Pass 2)

These items are cross-service, change data flow significantly, and Sean explicitly tagged them for Village review.

### B-1: NASM Workout Rolodex as canonical exercise source
**Current state:** Exercise DB exists (`backend/models/Exercise.mjs`, `CustomExercise.mjs`, `WorkoutExercise.mjs`, `ExerciseMuscleGroup.mjs`, etc.) and ~736 exercises seeded per memory. Workout sections in the logger UI (Warm-up & Corrective, Balance/Core/Stability, Cool-down & Recovery, Main) currently don't pull from this Rolodex — they use static lists or stubs.

**Target state:**
- Warm-up & Corrective: filtered Rolodex view tagged `warmup` + `corrective` only
- Balance / Core / Stability: filtered to those NASM categories
- Cool-down & Recovery: filtered to `cooldown` + `recovery`
- Main workout logger: full Rolodex with search, autocomplete (already partially in `ExerciseAutocomplete.tsx`)

**Village questions:**
- Tagging schema — extend Exercise model with category enum, or use a join table?
- Migration path — backfill ~736 existing exercises with category tags via what authority?
- UI: shared search component vs four separate filtered views?

### B-2: Workout Builder uses form tabs to generate
**Current state:** Workout Builder is a chatbot (`SwanStudios Workout Builder. Ask me anything about workout generation.`). It does not consume the form tabs (Plan Details, Equipment, Phase, Goals, etc.) on the same page.

**Target state:** "Generate Workout" button reads every visible field on the form and feeds them as structured context to the generation pipeline.

### B-3: Program Architect duration ladder
**Current state:** Program Architect has plan generation but limited duration choices.

**Target state:** Add 1d / 1w / 1m / 3m / 6m / 9m / 12m mesocycle plans following NASM OPT periodization. Sean's primary use is 3-month plans.

### B-4: Equipment tab → Swan Coach photo scan → AI identify → tagged storage
**Current state:** Equipment scan errors on upload (UI-8 surfaces the error). No AI identification pipeline.

**Target state:**
- Photo upload → temp storage
- Send to Swan Coach hivemind (Gemini Flash) for identification
- Auto-tag with equipment name + category
- File under named profile (Gym / Move Fitness / Park / etc.)
- Surface in Program Architect dropdown so generation knows what's available per location

### B-5: Swan Coach hivemind connection to generation pipeline
**Current state:** Swan Coach exists as chat. Generation uses `workoutBuilderService.mjs` + goal config but doesn't pull client history / pain chart / personalization.

**Target state:** Generation pipeline calls hivemind with full client context (prior workouts, pain entries, goals, equipment available, NASM phase) and gets a personalized output, not a template.

### B-6: Trainer-client assignment regression (UI-9 above) tied to hivemind awareness
The hivemind needs to know which trainer is assigned to which client. UI-9 fixes the selector; B-6 ensures the data the selector writes flows to the hivemind context.

---

## C. CONTENT — Sports-specific exercise library (Pass 3, parallelizable)

**Current state:** `backend/services/workoutBuilderGoalConfig.mjs:42,90,91,152,197,200,201` — only `golf_performance` exists as a sport-specific goal.

**Target state:** Add per-sport goal entries for:
- Basketball, Football, Soccer, Baseball, Swimming, Volleyball, Track & Field, Bodybuilding, Ice Skating, Tennis

Each needs:
- Phase-by-phase exercise selection bias
- Sport-specific exercise additions to the Rolodex (currently 736, target unknown)
- Research-sourced from NASM, Reddit, coaching forums, sport-specific sources

**Approach:** AI Village deep-research mode (Brain #1 UX, Brain #5 Competitive Intel, Brain #13 Strategic Research per memory have Google Search Grounding). Each sport gets a dedicated research pass. Output → seed file → migration → Rolodex.

---

## D. WORKFLOW AUTOMATION (Pass 4, separate)

### D-1: PLAUD multi-file auto-merge + auto-attribution
**Current state:** Plaud upload + parser exists at `/api/workout-logs/upload` + `workoutLogParserService.mjs` (per memory). Merge across files is manual.

**Target state:**
- Drop multiple .mp3/.wav files; system auto-merges
- AI attributes each segment to the correct client by name detection
- Manual fallback when ambiguous (UI prompts trainer to disambiguate)

---

## E. PAUSED — Resume after A + B + C ship

- **Triage Slice 2:** WorkoutLogger 500 (`/api/workouts/<id>/current` eager-load bug in `clientWorkoutRoutes.mjs:60-71`). Needs Sean's DevTools probe of response body.
- **Phase A 6-step smoke:** workout-builder/workout-planner generation verification (see prior session prompt).
- **Test-trainer / test-client smoke:** trainer id=98, client id=99 already created. Needs admin to create active assignment, then run `c:/tmp/production-smoke-authd-2026-04-30.py`.

---

## Open questions for Sean (block Pass 1 starts)

1. **Pass 1 ordering — go in catalog order (UI-1 → UI-12)?** Or pick a different first one (e.g., "I need Save Workout working before anything else because I'm training a client tomorrow")?
2. **UI-1 design call:** Form Rating per-set + per-exercise — keep both, drop one, or restructure?
3. **UI-4 design call:** What should "Today's Plan" do?
4. **UI-7 design call:** What is Coach Copilot supposed to be?
5. **UI-8 design call:** Scan flow design — fully automated identify + tag, or human-in-loop confirm?
6. **UI-10 design call:** Exact tier-choice copy ("Swan Studios" vs "Move Fitness", or different terms)?

I can tackle UI-2 / UI-3 / UI-12 immediately without design input — those are pure execution. The design-flagged items need your call before I write code.

---

**Status:** CATALOG. No code changes from this doc. Next: Sean answers the questions above; I start with the first design-clear UI bug, full Rule 26 receipt, ship, repeat.
