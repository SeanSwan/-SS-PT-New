# Swan Coach Hive-Mind — C0 Canonical Receipt

**Slice:** C0 — Locate (no code, per master prompt v2)
**Executed:** 2026-07-24
**Tree:** worktree `c:/tmp/ss-coach-hive-20260724`, branch `claude/coach-hive-mind-20260724` off `origin/main@e57f6804a` (2026-07-23)
**Governing plan:** `SWAN-COACH-HIVE-MIND-MASTER-PROMPT-V2-2026-07-25.md`
**Rules exercised:** 26 (canonical receipt), 27 (surface classification), 30 (subagent skepticism — n/a, no subagents used), 51 (confidence tags), 52 (anti-rework burden of proof)

---

## 0. Why this receipt exists

C0's mandate: *"where the Coach backend actually lives (`backend/services/swanCoach/` is empty), the full `AI_*` tool inventory across all four surfaces, current dictation entry points, and every write path that would carry `inputOrigin`. No code. You cannot unify what you have not located."*

It answered all four questions. In doing so it established that **five of the master prompt's premises are materially wrong** (§2, §3, §4, §5, §2b), surfaced **two scope corrections** (§7 — dictation is already half-unified; a fifth Coach surface exists), and found **one previously-unnamed P0 safety defect already live in `main`** (§6). All are recorded below with file:line evidence.

This receipt went through **five hostile-review rounds**; rounds 1–3 each found a real error in my own draft, and those corrections are recorded inline rather than silently patched (Rule 51). Rounds 4–5 ran clean.

---

## 1. Ground truth — RE-VERIFIED, matches exactly

The v2 prompt's surface table was verified against a tree 1092 commits stale. Re-run against fresh `origin/main@e57f6804a`:

| Surface | v2 claim | Fresh main | Verdict |
|---|---|---|---|
| `frontend/src/components/DashBoard/Pages/coach-assistant` | 369 | **369** | ✅ exact |
| `frontend/src/components/WorkoutLogger` | 203 | **203** | ✅ exact |
| `frontend/src/components/DashBoard/Pages/admin-workout-planner` | 160 | **160** | ✅ exact |
| `frontend/src/components/BootcampBuilder` | 64 | **64** | ✅ exact |
| `backend/services/bootcamp` | 10 | **10** | ✅ exact |
| `backend/services/swanCoach` | 0 / does not exist | **does not exist** | ✅ exact |
| `WorkoutLogger.tsx` | 866 lines | **866 lines** | ✅ exact |

`[VERIFIED]` — `find <dir> -type f | wc -l` and `wc -l` on fresh main. The inventory numbers are trustworthy; only the *interpretations* below were wrong.

---

## 2. CORRECTION 1 — The Coach backend is not missing. It is the largest service tree in the app.

The v2 prompt states the Coach backend location is **"UNKNOWN and must be located first."** That is false. `backend/services/swanCoach/` never existed because the Coach backend was never named that.

**It lives at `backend/services/ai/` — 165 files**, organized:

| Subdir | Contents |
|---|---|
| `commandRegistry/` | 21 files = **19 domain registries** (each exporting `register()`) + 2 infra (`baseSchemas.mjs`, `index.mjs`). Registries: `workoutCommands` `trainerCommands` `clientCommands` `scheduleCommands` `painChartCommands` `bootcampCommands` `nutritionCommands` `plannerSequenceCommands` `coachIntakeCommands` `plaudCommands` `plaudStructuredActionCommands` `onboardingCommands` `goalCommands` `healthCommands` `socialCommands` `systemCommands` `dashboardCommands` `hermesCommands` `clientSelfService` |
| `dispatchers/` | **49 dispatchers** — the execution layer |
| `contextEngine/` | `coachContextEngine.mjs` (316 ln), `coachGamificationContext`, `coachNutritionContext`, `clientAccess` |
| `adapters/` | `anthropicAdapter` `geminiAdapter` `openaiAdapter` `veniceAdapter` `adapterUtils` |
| `pipeline/` | `EthicalAIPipeline.mjs` |
| `debate/` | — |

Plus, outside that tree: `backend/controllers/coachIntakeController.mjs`, `backend/routes/coachIntakeRoutes.mjs`, `backend/routes/coachProposalRoutes.mjs`, and ~30 `coach*Service.mjs` files at `backend/services/ai/*`.

`index.mjs:6-12` self-documents the scale — `initializeRegistry()` merges **~119 commands across categories A–N**: Client Management 14 · Workouts 17 · Scheduling 10 · Health & Pain 8 · Nutrition 6 · Social 6 · Dashboard 8 · Trainer Mgmt 6 · Goals 6 · Onboarding 6 · System 4 · Client Self-Service 10 · Hermes Agent 2 · Intake Workspace 16.

**Consequence for the program:** there is no greenfield. C2's "typed intent events" must extend a 19-registry / 49-dispatcher / ~119-command system that already routes commands, or it forks the lane and creates exactly the drift the program exists to remove.

### 2b. The typed-intent contract and confirmation taxonomy already exist (affects C2 and C3)

`backend/services/ai/commandRegistry/baseSchemas.mjs` already defines both things v2 treats as new:

**`ClassifiedIntentSchema` (`:18-27`)** — the typed intent, with confidence already modeled:

```js
export const ClassifiedIntentSchema = z.object({
  intent:     z.string().min(1).max(100),
  clientRef:  z.string().max(200).nullable().optional(),
  params:     z.record(z.unknown()).nullable().optional(),
  confidence: z.number().min(0).max(1),
}).strict();
```

v2 requires the memory to record *"who it was about, **at what confidence**, and whether it landed."* Two of those three fields **already exist**. Only "whether it landed" (reconciliation state) is missing — which is exactly C2's contribution, and now a much smaller one.

> The `clientRef` field carries a `:20-23` comment recording a **production incident root-caused 2026-07-15**: `.optional()` alone rejected the literal `null` the classifier emits, *"collapsing EVERY client-less command to the chat fallback."* Live evidence that this contract is load-bearing and that changes to it have already broken production once. C2 must treat `baseSchemas.mjs` as a careful-lane file.

**`CommandDefinition` (`:31-45`)** — the confirmation taxonomy, partially modeled:

| Existing field | Maps to v2's C3 tier |
|---|---|
| `destructive: boolean` | deliberate-confirm trigger |
| `requiresConfirmation: boolean` | deliberate-confirm tier |
| `roleRequired: string[]` | trainer-only gating (trainer-indispensability) |
| `requiresClientRef: boolean` | **client-resolution requirement — per command** |

C3's tiered model is therefore **an extension of `CommandDefinition`, not a new contract**: the missing pieces are the *fire-and-forget* and *read-back* tiers (currently the boolean collapses everything into confirm/no-confirm) and the voice-specific behavior. `requiresClientRef` is also the natural per-command hook for the C0.5 client-lock invariant.

---

## 3. CORRECTION 2 — An eval harness already exists and is CI-wired. C4 is an extension, not a build.

v2 schedules **C4 — Evaluation harness** as new work: *"Nothing else measures whether the mind is right."*

`backend/eval/` already contains:

| File | Size | Role |
|---|---|---|
| `goldenDataset.mjs` | 33,951 B | 53 synthetic scenarios, `DATASET_VERSION = '2.0.0'` |
| `evalRunner.mjs` | 9,065 B | suite runner |
| `evalThresholds.mjs` | 2,255 B | per-category CI gates |
| `driftDetector.mjs` | 4,608 B | regression drift |
| `evalReport.mjs` | 5,859 B | markdown/JSON report |
| `runEval.mjs` | 5,788 B | CLI entry |
| `ab/` | dir | provider A/B |

Wired in `backend/package.json:88-96` — `npm run eval`, `eval:report`, `eval:baseline`, `eval:drift`, `eval:drift:strict`, `provider:ab*`. Test at `backend/tests/unit/evalHarness.test.mjs`.

**But the coverage is a different axis.** `evalThresholds.mjs` gates: `schema_valid`, `pii_detection`, `schema_invalid`, `contraindication`, `scope_of_practice`, `adversarial`, `warnings`. That validates **AI output correctness**. It does **not** validate **utterance → intent resolution**, which is what C4 is actually for.

`[VERIFIED]` The two are complementary, not duplicative. C4 remains necessary — but as a **new category inside the existing harness**, reusing runner/thresholds/drift/report/CI. Building a parallel harness would be the drift failure mode applied to test infrastructure.

---

## 4. CORRECTION 3 — The C4 seed already exists and is DORMANT (Rule 27)

`backend/eval/coachCommandCenterGoldenScenarios.mjs` exports `COACH_COMMAND_CENTER_SCENARIOS` — 4 scenarios shaped **exactly** like C4 needs:

```js
{
  id: 'coach_recall_named_client_last_workout',
  surface: 'coach_command_center',
  input: 'what did Ava Stone do last workout',
  expectedIntent: 'view_last_workout',
  expectedClientRef: 'Ava Stone',          // ← the wrong-client axis, already modeled
  safetyContract: 'read-only recall; no workout write',
}
```

**Classification: DORMANT.** `[VERIFIED]` — **unfiltered** repo-wide grep (no `--include` filter, excluding only `node_modules` and the generated `.understand-anything` index) for `COACH_COMMAND_CENTER_SCENARIOS` and `coachCommandCenterGoldenScenarios` returns **one code hit: the declaration itself** (`coachCommandCenterGoldenScenarios.mjs:8`). Nothing imports it. It is not referenced by `runEval.mjs` or any npm script.

**Independently corroborated:** `docs/ai-workflow/REPO-HYGIENE-INVENTORY-2026-07-16.md:122` already classified this file as *"planned/unimplemented blueprint — recently added synthetic scenarios, no current importer,"* and `:262` lists *"Wiring or archiving"* as an open action. A prior hygiene pass reached the same conclusion eight days earlier and it has not moved since. C4 closes this open item.

Someone built the right seed and never wired it. `expectedClientRef` is already the correct field for wrong-client-resolution testing — C4 should adopt this file rather than invent a new shape.

---

## 5. CORRECTION 4 — The event bus is partially built, in ONE file

v2's C2 calls for a typed intent event system as if greenfield. `[VERIFIED]` — repo-wide grep for `export const AI_[A-Z_]* =` across `frontend/src` (non-test) returns **three** files, but only one declares **dispatched events**:

| File | Declares | Event? |
|---|---|---|
| `frontend/src/utils/aiWorkoutEvents.ts` | the four `AI_*` families | ✅ **yes — sole event registry** |
| `frontend/src/hooks/aiMessageLimits.ts:1-2` | `AI_COMMAND_MESSAGE_MAX_CHARS = 2000`, `AI_CHAT_MESSAGE_MAX_CHARS = 12000` | ❌ numeric char limits |
| `frontend/src/components/Shared/AITerminalPanel.types.ts:3` | `AI_CONTEXTS = [...]` | ❌ context array |

`[VERIFIED]` — `dispatchEvent`/`CustomEvent` hits for `AI_CHAT_MESSAGE_MAX_CHARS`, `AI_COMMAND_MESSAGE_MAX_CHARS`, `AI_CONTEXTS`, `AI_CERTS` = **0 each**. The `AI_` prefix on those is naming coincidence, not event vocabulary.

> Correction recorded per Rule 51: round-1 hostile review caught this section originally asserting "exactly one non-test file declares `AI_*`." That was wrong as written — three files declare `AI_`-prefixed constants. The substantive claim (one event registry) survives with the qualifier.

The sole event registry:

**`frontend/src/utils/aiWorkoutEvents.ts` — 193 lines**, authored 2026-03-21, declaring four families in one shared vocabulary:

| Family | Events | Surface |
|---|---|---|
| `AI_*` (logger) | `AI_LOAD_TEMPLATE` `AI_ADD_EXERCISE` `AI_UPDATE_SET` `AI_TOGGLE_NASM_ITEM` `AI_SUBMIT_WORKOUT` | WorkoutLogger |
| `AI_PLANNER_*` | ADD/SWAP/REMOVE/UPDATE_EXERCISE, GENERATE, REARRANGE, **UNDO** (7, exported as `AI_PLANNER_EVENTS`) | admin-workout-planner |
| `AI_BOOTCAMP_*` | SET_FORMAT/STRUCTURE/DURATION, PLACE_EXERCISE, LOAD_TEMPLATE (5, `AI_BOOTCAMP_EVENTS`) | BootcampBuilder |
| `AI_PAINCHART_*` | SELECT_REGION (1, `AI_PAINCHART_EVENTS`) | Pain Chart |

Full observed vocabulary (usage counts, repo-wide) also includes operational events not in the four families: `AI_RATE_LIMITED` `AI_USER_RATE_LIMITED` `AI_GLOBAL_RATE_LIMITED` `AI_DEGRADED_MODE` `AI_PARSE_ERROR` `AI_VALIDATION_ERROR` `AI_PII_LEAK` `AI_WAIVER_MISSING` `AI_WAIVER_VERSION_OUTDATED` `AI_CONSENT_REQUIRED` `AI_CONSENT_MISSING` `AI_ASSIGNMENT_DENIED` `AI_UNKNOWN`.

**What exists:** a shared typed-event vocabulary, DOM `CustomEvent` transport, an acknowledge contract (`59e643ae0`), and real-previous Undo on the planner family (`249716c38`).

**What does not exist:** persistence, replay, an event *log*, `inputOrigin`, an offline queue, or reconciliation state.

**Consequence:** C2 is *"make the existing bus event-sourced,"* not *"build a bus."* The file is 193 lines against a 300-line cap — the event-sourcing core must be a **new sibling module**, not an expansion of this file.

---

## 6. THE CATASTROPHIC FAILURE MODE — a live instance, found on first pass 🔴

v2 names wrong-client writes as *the* catastrophic failure mode. **It is not hypothetical. It exists in `main` today.**

### The guard that exists

`backend/services/ai/dispatchers/clientScope.mjs` (14 lines) — the whole defense:

```js
export const resolveCommandClientId = (params = {}, ctx = {}) => (
  toPositiveClientId(ctx.resolvedClient?.id) ?? toPositiveClientId(params.clientId)
);
```

Route-resolved client (what the trainer has selected) **wins over** the classifier's extracted `params.clientId`. Correct precedence. **But it is advisory — a dispatcher must choose to call it.**

`[VERIFIED]` **21 of 49 dispatchers import it** (`grep -l resolveCommandClientId *.mjs` → 22 files incl. the definition).

### The two that do not

`[VERIFIED]` — of the 4 dispatchers reading `params.clientId` directly, 2 do not import the guard:

**🔴 `scheduleWriteDispatchers.mjs` — GENUINELY UNGUARDED (P0)**

```
:112  export async function dispatchScheduleSession(params, ctx) {
:113    assertTrainerOrAdmin(ctx);            ← ctx IS in scope
:115    const client = await resolveClient(params.clientId);   ← ignores ctx.resolvedClient
:120    const trainerId = ctx.user.role === 'trainer' ...      ← ctx used again
:131    const session = await Session.create({ userId: client.id, ... })   ← WRITE
```

Identical defect at `:154-157` (`dispatchRescheduleSession` → `:161` `Session.findAll` → reschedule write).

`ctx` is demonstrably available (used at `:113` and `:120`) and is simply not consulted for client identity. **A misparsed pronoun in "schedule her for Tuesday at 3" writes a session against the wrong client's record even when the trainer has a client selected.** This is precisely the trust-ending, liability-adjacent write v2 describes.

**🟡 `workoutSessionCommandDispatchers.mjs` — FALSE POSITIVE, but a drift risk**

```
:33  const clientId = Number(ctx.resolvedClient?.id ?? params.clientId);
```

Functionally **identical** precedence to the shared helper, inlined rather than imported. **Not a live vulnerability.** It is duplication that will drift the moment the shared rule changes (e.g. when C2 adds client-lock). Flagged, not escalated.

> Self-correction recorded per Rule 51: my first pass flagged both as unguarded. Reading the source disproved the second. Only `scheduleWriteDispatchers.mjs` is a live defect.

### Why C2 cannot be where this gets fixed

C2 is a large slice (bus + memory + offline + client-lock + logger decomposition). This defect is **two functions and a one-line precedence change**, it is on `main`, and it is a wrong-client **write**. It should not wait behind an architecture slice.

**→ Recommend a C0.5 hotfix slice.** See §9.

---

## 7. Dictation entry points — already half-unified; 6 stragglers remain

> **Round-3 self-correction (Rule 51).** This section originally claimed *"the real fragmentation is 9, not 4."* That was **overstated and wrong**. A shared speech primitive already exists with five consumers. The corrected picture is better news for the program, and is recorded here rather than quietly fixed.

### The shared lane that already exists

**`coach-assistant/hooks/useCoachBrowserSpeechInput.ts`** is the canonical browser-speech primitive. `[VERIFIED]` — five non-test consumers:

| Consumer | Line | Surface |
|---|---|---|
| `CoachDock/useSurfaceCoachDock.ts` | `:105` | generalized dock (`63da01407`) |
| `coach-assistant/CoachCommandCenter.voiceCapture.ts` | `:112` | Command Center |
| `coach-assistant/CoachInputBar.tsx` | `:66` | Coach input bar |
| `DashBoard/workspaces/clients-team/ClientTrainingCommandBar.tsx` | `:173` | **client training command bar** |
| `WorkoutLogger/useWorkoutLoggerDictation.ts` | `:38` | logger |

`useWorkoutLoggerDictation.ts` (114 ln) **owns no speech code** — it composes the shared hook with `useCoachCommand`. The logger is already on the shared lane.

`coach-assistant/hooks/useVoiceRecorder.ts` is **complementary, not competing** — the recorder-transcription fallback that `voiceCapture.ts:1-3` composes alongside browser speech ("browser dictation, recorder transcription fallback, and reviewed composer handoff").

**⚠️ `ClientTrainingCommandBar.tsx` is a fifth Coach-driven surface** outside v2's four-surface model (`DashBoard/workspaces/clients-team/`). C3 and C5 must include it or it drifts by omission.

### The 6 that still implement speech independently

`[VERIFIED]` — own a `SpeechRecognition`/`MediaRecorder` construction and do **not** consume the shared hook:

| # | File | Note |
|---|---|---|
| 1 | `AIAssistant/DictationOrb.tsx` (500 ln) | largest independent impl; also breaches the 300-line cap |
| 2 | `FoodTracker/useNutritionDictation.ts` | nutrition |
| 3 | `UniversalMasterSchedule/ScheduleAiOperatorDock.tsx` | schedule |
| 4 | `Shared/CrystallineVoicePill.tsx` | shared UI pill with its own speech |
| 5 | `UserDashboard/components/SwanCoachActionLauncher.tsx` | client-facing launcher |
| 6 | `pages/support/useSupportDictation.ts` (160 ln) | `:32-35` — declares its own `RecognitionCtor`, reads `speechWindow.SpeechRecognition` |

> **Method disclosure:** the first detection regex (`new SpeechRecognition` / `window.SpeechRecognition`) produced a **false negative** on #6, which aliases `window` to a local `speechWindow` before reading the constructor. Found by reading the file. Any C3 convergence sweep must grep for the aliased pattern too, or it will miss the same file.

**Consequence for C3 (favorable):** the target is not "unify 9 implementations." It is **converge 6 stragglers onto a shared hook that already has 5 consumers**, and add the tiered confirmation contract at that shared seam. `voiceCapture.ts` remains the strongest host. `CrystallineVoicePill.tsx` is the highest-leverage single fix — it is *shared UI* that bypasses the *shared hook*, so converging it likely moves several call sites at once.

---

## 8. The `inputOrigin` write path

`[VERIFIED]` — `inputOrigin` / `input_origin` appears **nowhere** in `frontend/src` or `backend`. The telemetry gap v2 describes is real and total.

**Landing site — `backend/services/ai/dispatchers/workoutLogWriteDispatcher.mjs` (30 lines, fully quoted in §6 evidence gathering):**

```js
export const dispatchLogWorkout = async (params = {}, ctx = {}) => {
  const clientId = resolveCommandClientId(params, ctx);      // ✅ guarded
  return submitAiWorkoutLogAsDailyForm({
    clientId, exercises, date, notes, title, duration, intensity,
    plannedAssignment, scheduledSessionId,
    trainerId: ctx.user.id, userRole: ctx.user.role, sequelize,
  });
};
```

A clean param bag delegating to `backend/services/workout/aiWorkoutDailyFormService.mjs`. `inputOrigin` threads through here with minimal disruption — but it must reach the **persistence layer**, so `aiWorkoutDailyFormService` and the underlying model/migration are in scope for C2. Not yet traced to the column — deferred to C2's schema cross-check (Rule 29/58).

---

## 9. Revised slice plan (the C1 ask)

C0's findings change sequencing. Deltas from v2, with rationale:

| Slice | v2 | Revised | Why |
|---|---|---|---|
| **C0.5 — wrong-client write hotfix** | *(absent)* | **NEW, next** | A live P0 wrong-client write on `main` (§6). Two functions. Must not wait behind an architecture slice. Ships with a RED→GREEN regression test asserting `ctx.resolvedClient` beats `params.clientId` on both schedule writes, plus an executable invariant test that **every write dispatcher** resolves client identity through the shared helper — so the guard cannot silently regress and `workoutSessionCommandDispatchers.mjs`'s inlined copy converges. |
| **C1 — Informed mind (SWA-63)** | 1st | **2nd** | Unchanged in substance. But `coachIntakeContextService.mjs` (322 ln) and `coachContextEngine.mjs` (316 ln) already exist — C1 must open both and re-scope to the actual gap before planning. Both exceed the 300-line cap, so C1 inherits a decomposition obligation. |
| **C2 — bus + memory + offline** | 2nd | 3rd | Re-scoped: **extend** `aiWorkoutEvents.ts` (193 ln) into an event-sourced log via a new sibling module (cap discipline), and extend the 19-registry / 49-dispatcher / ~119-command backend rather than forking it. |
| **C3 — confirmation taxonomy** | 3rd | 4th | Re-scoped twice: **extend `CommandDefinition`** (§2b), which already has `destructive` / `requiresConfirmation` / `roleRequired` / `requiresClientRef` — add the fire-and-forget and read-back tiers the current boolean collapses. Delivery target is **converging 6 straggler speech impls onto the existing shared hook** (§7), not unifying 9. Host: `CoachCommandCenter.voiceCapture.ts`. Must include the **fifth surface**, `ClientTrainingCommandBar.tsx`. |
| **C4 — eval harness** | 4th | 5th | Re-scoped: **adopt the dormant `coachCommandCenterGoldenScenarios.mjs`** and add an `intent_resolution` category to the existing `evalThresholds.mjs`. Do not build a parallel harness. |
| **C5 — intent bar** / **C6 — telemetry** | 5th / 6th | unchanged | — |

**Net:** one slice added, four re-scoped from "build" to "extend." The program gets smaller and safer, and stops rebuilding what shipped.

---

## 10. What I could not prove (Rule 73 disclosure)

- **No code was written or executed** — C0 is explicitly a no-code slice. All findings are static: `find`, `grep`, `wc`, and direct file reads. No test proves the `scheduleWriteDispatchers` defect *fires* at runtime; the claim is that `ctx.resolvedClient` is in scope and not consulted, which is `[VERIFIED]` by reading `:112-157`. A RED regression test is C0.5's first deliverable.
- **No live authenticated browser** in this environment — no dictation surface was exercised end-to-end.
- **`tsc --noEmit` OOMs at 8GB** on this repo (pre-existing baseline). No typecheck coverage claimed.
- **`backend/services/ai/debate/` was not enumerated** — appeared in the subdir listing, contents not inspected. Low relevance to C0's four questions; flagged so it is not mistaken for covered.
- **`inputOrigin` persistence not traced** past `submitAiWorkoutLogAsDailyForm` to a DB column (§8).
- **Linear issues SWA-51/59/46/63/64 were not read** this pass — C0 was scoped to repo location. C1 planning should read them.

---

## 11. Bottom line

C0's mandate was to locate. It located — and disproved five premises the rest of the program was going to be built on:

1. The Coach backend is **not** missing → `backend/services/ai/`, 165 files, 19 registries, 49 dispatchers, ~119 commands.
2. An eval harness **exists and is CI-wired** → C4 extends it on a new axis.
3. The C4 seed **exists and is dormant** → adopt `coachCommandCenterGoldenScenarios.mjs` (open hygiene item since 2026-07-16).
4. The event bus **is partially built** → `aiWorkoutEvents.ts`, 4 families, one file.
5. The **typed-intent contract and confirmation taxonomy already exist** → `ClassifiedIntentSchema` (with `confidence`) and `CommandDefinition` (with `destructive` / `requiresConfirmation` / `requiresClientRef`) in `baseSchemas.mjs`.

**The through-line: almost nothing in this program is greenfield.** Five of seven slices are extensions of shipped systems. A builder who took v2 literally would have rebuilt an eval harness, a command bus, an intent schema, and a confirmation model that already exist — and would have shipped the drift the program was written to eliminate.

Two scope corrections also came out of the hostile rounds: dictation is **already half-unified** (one shared hook, 5 consumers, 6 stragglers — §7), and there is a **fifth Coach surface**, `ClientTrainingCommandBar.tsx`, outside v2's four-surface model.

And it found what the plan said would be the program's worst outcome, already shipped: **a wrong-client write path in `main`** (§6).

**Next: C0.5.**