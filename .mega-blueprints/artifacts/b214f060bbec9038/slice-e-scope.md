# Slice E — H20 (Sprint progression / deload handling) — SCOPE

**Status: SCOPED, NOT STARTED.** Read-only investigation; no repo file was modified except this one.

**Canonical checkout:** `tmp/worktrees/rolodex-luna-01a098de-20260913`

**Headline verdict:** H20 is **partly implemented** — deload *scheduling*, the deload *label*, the deload *toggle validation*, and the workload↔impact decoupling are all real and tested. What is **not** implemented is that any progression/deload value **changes a prescribed number**. `progressionStrategy` is stored, validated, surfaced in the UI, and read at exactly one site — and the function it selects **never executes**, proven by probe. The one value that survives is written into a log string that no Sprint surface renders.

---

## H20 — verbatim register criteria

**H20 is NOT defined in `H01-H30-REMAINING-SCOPE.md`, `FINAL-HOSTILE-REVIEW-20260913.md`, or `execution-ledger.md`.** That first file says only:

> `### E. H20 progression / deload`
> `Untouched. Needs its own requirement read before scoping further — **do not guess its criteria from the name.**`
> — `H01-H30-REMAINING-SCOPE.md:460-462`

`grep -rn "H20" .mega-blueprints/` returns zero matches in `FINAL-HOSTILE-REVIEW-20260913.md`, and `H20|deload|progression` returns **zero matches** in `execution-ledger.md`. The criteria live in the readiness registers and document 13, not in the H-register prose.

### Requirement entry (verbatim) — `readiness-active.json:432-438`

```json
{
  "id": "R-H20",
  "acceptance": "Progression and deload labels reflect actual prescribed data and never equate workload with impact eligibility",
  "tests": ["H20"]
}
```

### Test entry (verbatim) — `readiness-active.json:955-978`

```json
{
  "id": "H20",
  "requirements": ["R-H20"],
  "command": "Implement the requirement-linked fixtures and run the exact service/hook/browser commands in 13-server-repair-contract.md or 14-frontend-repair-contract.md; these future acceptance runs have not occurred.",
  "status": "NOT RUN",
  "reason": "Application repair has not started. Existing baselines and diagnostic probes do not satisfy this complete repair acceptance contract.",
  "evidence": [
    { "path": "docs/ai-workflow/blueprints/agent-ready-workout-planner-2026-09-06/12-hostile-reconciliation-and-repair.md", "sha256": "6230f64d..." },
    { "path": "docs/ai-workflow/blueprints/agent-ready-workout-planner-2026-09-06/13-server-repair-contract.md", "sha256": "e6c356c4..." },
    { "path": "docs/ai-workflow/blueprints/agent-ready-workout-planner-2026-09-06/14-frontend-repair-contract.md", "sha256": "e6aab8b4..." }
  ],
  "coverageNote": "This plan status never certifies the implementation. Expanded cases and real boundaries remain required per the detailed contract."
}
```

Status: **`NOT RUN`**. (Identical in `readiness-relocated-s03.json:438,962` and `docs/.../audit-readiness.json:427,950`.)

### Register rows (verbatim)

> `| H20 | P2 | Explicit progression/deload prescription contract; workload does not change impact eligibility | Backend §6–7; server contract |`
> — `15-audit-findings-and-fix-register.md:61`

> `| R-H20 | Progression and deload labels reflect actual prescribed data and never equate workload with impact eligibility | H20 | policy-dependent extension |`
> — `12-hostile-reconciliation-and-repair.md:68`

> `H20's numeric prescription and compatibility choices are specified in the server contract and must never equate impact with workload.`
> — `12-hostile-reconciliation-and-repair.md:254`

> `| H20 | Actual typed progression/deload independent of impact eligibility | Pending document13 numeric policy implementation |`
> — `18-astra-comprehensive-handoff-2026-09-13.md:146`

### Failure modes H20 exists to prevent (verbatim) — `13-server-repair-contract.md:29-30`

> `| A generated label can claim progress while prescriptions remain unchanged | Actual typed prescriptions and recorded before/after values govern labels; conditional future advice is labeled conditional | R-H11, H20 |`
> `| A deload is mislabeled as an active-recovery movement day | Keep strength days as training/homework with a volume deload; only actual recovery selections use active_recovery | R-H20 |`

### The operative criteria — `13-server-repair-contract.md` §6, lines 228-272 (verbatim, abridged to the binding clauses)

> `## 6. H20 — concrete conservative progression contract`
>
> `### Single-session measured progression`
>
> `Keep nasmOptPolicy.mjs:21–85 as the single phase range/tempo source. Keep the existing micro-progression rule in workoutProgressionService.mjs:104–173: last comparable logged performance, one rep first, then +2.5 lb upper-body or +5 lb lower-body at the phase rep ceiling, with existing pain/high-RPE/readiness holds. Do not introduce compound weekly percentage load increases or a second phase table.` (`:234`)
>
> `Repair fidelity: when progression.action supplies targetReps, the actual typed prescription used by Logger/save must match it, not only progression.note.` (`:236`)
>
> `### Planner horizon and deload`
>
> `A future planned session is not evidence that the prior planned session was completed. Do not recursively compound the same logged performance through 12–52 future weeks.` (`:240`)
>
> `Use the existing scheduled fourth-week deload and the existing Sprint factor 0.7 as the explicit default **volume** factor.` (`:242`)
>
> `- If sets >= 2, deloadSets = max(1, floor(baseSets * 0.7)); keep reps/load/rest/tempo. Examples: 4→2, 3→2, 2→1. Integer sets mean the effective reduction is often larger than 30%; report actual before/after, not "exactly 30% less work."` (`:244`)
> `- If there is only one set, reduce a positively parsed integer rep target or both bounds of a numeric rep range with max(1, floor(value * 0.7)); preserve order.` (`:245`)
> `- If no reducible supported field exists, leave the prescription unchanged with applied:false, reason:'unsupported_prescription'; mark manual review. Never stamp "deload applied" on unchanged data.` (`:246`)
> `- Do not reduce rest, increase load or alter tempo to compensate. Regenerate setScheme/repGoal from the new typed values. Persist baseline/actual values and policyVersion.` (`:247`)
> `- Strength deload days retain dayType:'training', assignmentType:'homework' plus isDeloadWeek/progression metadata.` (`:248`)
>
> `### Sprint scheduling versus impact`
>
> `Delete the semantic conversion through intensityCategoryFromModifier. Sprint workload does not select high_impact, medium_impact, flexibility or any other impact/movement category.` (`:254`)
>
> `Keep the existing strategy functions as **requested work-duration modifiers**: linear min(1 + 0.05*(ordinalWeek-1), 1.5); undulating [1,0.85,1.1]; block 0.9/1/1.1/1.05 for current week bands; deload 0.7. For random, preserve the [0.85,1.15) band but use a stable seed derived from Sprint ID + ordinal week + policyVersion, persisted/resolved once. Regeneration/retry does not reroll the week's load.` (`:256`)
>
> `Default persisted 1.0 does not prove a trainer override. Add Sprint.metadata.progressionPolicyV1 with version, overrideByWeek and resolved modifier provenance. New create resolves strategy defaults; a PUT containing intensityModifier marks that week explicit even when it equals 1.0. Legacy non-deload 1.0 is treated as old scaffold default; legacy non-1 values are retained as legacy overrides if finite and within 0.7–1.5. [...] Toggling deload preserves the underlying override for later reuse; it does not overwrite it with 1.0. Deload takes precedence while enabled.` (`:258`)
>
> `2. Proposed main work interval = max(1, round(baseWorkSec * requestedModifier)). Add a conservative 60-second ceiling for automatically progressed ordinary work intervals; a manually saved longer interval is preserved as an override and does not receive automated increases.` (`:263`)
>
> `4. A factor < 1 reduces main work duration and can finish early. Do not silently fill saved time with extra work. Preserve start/end work data and show actual work seconds before/after.` (`:265`)
>
> `5. Persist progression:{policyVersion, mode:'scheduled_work_duration', requestedModifier, source, baseWorkSec, appliedWorkSec, baseWorkTotalSec, appliedWorkTotalSec, applied, reason} in slot generatedClassData and template manifest. A cap/rounding hold is explicitly applied:false, not a claimed increase.` (`:266`)
>
> `Protocol invariants are stronger than the scalar. For EMOM/Tabata/AMRAP paced blocks, pyramid, or any style whose timing/load semantics are not ordinary standard intervals, keep the exact protocol and return mode:'manual_protocol', applied:false` (`:270`)

### Reserved test IDs and filenames (verbatim) — `13-server-repair-contract.md:298-300`

> `| S-H20a → R-H20 | backend/tests/unit/workoutPrescriptionProgression.test.mjs: 4/3/2/1 sets, reps/ranges/durations, unsupported text, actual recovery | Measurable conservative deload; no fake active_recovery label; no rest/load increase; single-set limits disclosed |`
> `| S-H20b → R-H20 | Same helper suite + sprintGenerationSemantics.test.mjs: default1 vs explicit1 override, deload toggle, all strategies, stable random, ordinary timeline budget, paced class | Default no longer masks strategy; modifier never changes impact; actual intervals and compiled totals agree; caps/unsupported protocols report hold |`
> `| S-H20c → R-H20 | Extend backend/__tests__/workoutProgressionService.test.mjs and generation integration fixture | TargetReps affects real prescription; no increase through pain/readiness holds; future plans do not compound one old exposure; canonical phase table unchanged |`

**Note:** `sprintGenerationSemantics.test.mjs` (S-H20b) does **not** exist. The nearest file is `backend/tests/unit/bootcampGenerationSemantics.test.mjs` (174 lines). Whoever takes S-H20b must decide whether to rename or to extend the existing file — do not silently create a near-duplicate.

---

## What already exists (with file:line)

### Deload scheduling — IMPLEMENTED

| What | Evidence |
|---|---|
| Every 4th week is a deload | `sprintCalendarContract.mjs:251` → `const isDeload = (w + 1) % 4 === 0;` |
| Deload week stored as `isDeloadWeek: true`, `intensityModifier: 0.7`, `theme: 'Deload & Recovery'` | `sprintCalendarContract.mjs:256-258` |
| Non-deload week stored as `isDeloadWeek: false`, **`intensityModifier: 1.0`**, `theme: null` | `sprintCalendarContract.mjs:257-258` |
| Scaffold persists both to `sprint_weeks` | `sprintStructure.mjs:38-39` |
| `SprintWeek.intensityModifier` default `1.0`, `isDeloadWeek` default `false` | `models/SprintWeek.mjs:37-44` |
| Week deload toggle validated; derives modifier and **wins** over a supplied one | `sprintUpdateContract.mjs:75-87` |

### Progression strategy — validated, persisted, surfaced … and read but never executed

| What | Evidence |
|---|---|
| Four strategy functions exist | `sprintGenerator.mjs:32-49` (`linear`, `undulating`, `block`, `random`) — matches contract `:256` exactly |
| Strategy validated at create against the model allowlist | `sprintCalendarContract.mjs:150-152, 181-184, 199` |
| Persisted on create | `sprintService.mjs:110`, `models/BootcampSprint.mjs:70-76` |
| Updatable | `sprintService.mjs:180-187` (allowlist includes `progressionStrategy`) |
| Returned by the list endpoint | `sprintService.mjs:167` |
| Returned to the client type | `useSprintAPI.ts:60`, `:101` |
| Rendered as UI text | `SprintPlannerPage.tsx:141` → `{sprint.progressionStrategy}` |
| Chosen in the create modal | `CreateSprintModal.tsx:74` |
| **Read site (the only one)** | `sprintGenerator.mjs:122` → `const progressionFn = PROGRESSION[sprint.progressionStrategy] \|\| PROGRESSION.linear;` |
| **Its result is discarded** | `sprintGenerator.mjs:130-132` (see below) |

```js
// sprintGenerator.mjs:130-132
const weekModifier = week.isDeloadWeek
  ? 0.7
  : (week.intensityModifier || progressionFn(week.weekNumber, sprint.durationWeeks));
```

`week.intensityModifier` is persisted as `1.0` for **every** non-deload week (`sprintCalendarContract.mjs:257`, `sprintStructure.mjs:39`, model default `SprintWeek.mjs:43`). `1.0` is truthy, so `||` short-circuits and **`progressionFn` is never invoked**.

**Executed probe (real `buildSprintSchedule`, 12 weeks, instrumented spy in place of `progressionFn`):**

```json
{ "spyCallsForProgressionFn": 0,
  "weeks": [ {"weekNumber":1,"isDeloadWeek":false,"storedModifier":1,"truthy":true,"resolvedWeekModifier":1},
             {"weekNumber":4,"isDeloadWeek":true,"storedModifier":0.7,"truthy":true,"resolvedWeekModifier":0.7},
             ... all 12 weeks: non-deload resolved 1, deload resolved 0.7 ] }
```

**Zero calls across all 12 weeks.** The strategy table is dead code for every Sprint the app can create. This is exactly the "stored-default override blocker" recorded at `evidence/hostile-20260913/backend-audit.md:86`.

### …and even the value that survives reaches nothing

| What | Evidence |
|---|---|
| `weekModifier`'s **only** consumer is a log string | `sprintGenerator.mjs:159-165` — pushes `{ type:'intensity', message: 'Week N intensity modifier X (deload) — no intensity category applied.' }` into `classData.explanations` |
| The class generator is called with **no** modifier, intensity, duration, or count parameter | `sprintGenerator.mjs:145-154` — passes only `classFormat`, `classStyle`, `dayType`, `spaceProfileId`, `trainerId`, `exclusionKeys`, `includeStretch`, `stretchDurationMin` |
| `generateBootcampClass` has no slot for one | `bootcampGenerator.mjs:470-488` — destructures trainerId, requesterRole, classFormat, stationCount, exercisesPerStation, classStyle, dayType, intensityCategory, targetDuration, expectedParticipants, spaceProfileId, equipmentProfileId, name, includeStretch, stretchDurationMin, exclusionKeys. No modifier. |
| Nothing renders that explanation in the Sprint Planner | `SlotDetailPanel.tsx:136-138` reads only `exercises` and `stations` from `slot.generatedClassData`. No `explanations` reference exists anywhere under `frontend/src/components/SprintPlanner/` (`ExplanationsStrip` is a BootcampBuilder component). |
| Nothing renders `intensityModifier` either | `useSprintAPI.ts:42` is the **only** occurrence of `intensityModifier` in `frontend/src` — a type declaration that no component reads |
| `regenerateSlot` has **no** progression logic at all | `sprintGenerator.mjs:237-298` — no week read, no modifier, no explanation. A regenerated slot loses even the label the batch path writes. |

### Workload ↔ impact decoupling — ALREADY DONE (BE-F3c)

- `intensityCategoryFromModifier` is **removed**; `sprintGenerator.mjs:51-55` is a tombstone comment explaining it violated the persisted `intensityCategory` enum and ranked nothing. A repo-wide grep for the symbol returns only that comment.
- The modifier is now recorded honestly as an explanation instead: `sprintGenerator.mjs:156-165`.

This discharges the first sentence of contract `:254` ("Delete the semantic conversion through intensityCategoryFromModifier").

### Measured micro-progression — EXISTS, but is not wired to Sprint

- `computeMicroProgression` — `workoutProgressionService.mjs:107-154` (one rep first, then `smallestLoadIncrementFor`, with pain and high-RPE/readiness holds). Matches contract `:234`.
- `applyMicroProgressionToExercises` — `workoutProgressionService.mjs:160-174`.
- **Only caller: `workoutBuilderService.mjs:735`** (the Planner/WorkoutBuilder path). The Sprint generator never imports it. So contract `:234`'s rule is satisfied for Planner classes and entirely absent for Sprint classes.

### UI deload label — IMPLEMENTED

- `SprintPlannerPage.tsx:239` → `<WeekRow key={week.id} $isDeload={week.isDeloadWeek}>`
- `SprintPlannerPage.tsx:242` → `{week.isDeloadWeek && <span className="deload">Deload</span>}`
- Style at `SprintPlannerStyles.ts:269`.

This label is driven by **real stored data** — it is the one part of R-H20's wording that is already truthful.

### NOT implemented anywhere

| Contract clause | Search | Result |
|---|---|---|
| `Sprint.metadata.progressionPolicyV1` (`:258`) | `grep -rn "progressionPolicyV1\|overrideByWeek"` repo-wide | Only in the contract docs. **No code.** |
| `Sprint.metadata` read or write | `grep "\.metadata\|metadata:"` over `backend/**/*sprint*.mjs` | **Zero matches.** The column exists (`models/BootcampSprint.mjs:91-94`) and is completely dormant. |
| `progression:{policyVersion, mode, requestedModifier, …}` in `generatedClassData` (`:266`) | `grep -rn "policyVersion"` | Only in contract/handoff docs. |
| Volume-deload set reduction (`:244-247`) | `grep` for any `floor(*0.7)` / `deloadSets` transform | **No implementation.** |

---

## The real gap

**R-H20's literal failure mode is present in the code today: the generator emits a progress claim with nothing behind it.**

Three independent breaks, in series — fixing any one alone changes no behaviour:

1. **The strategy never resolves.** `sprintGenerator.mjs:132` uses `||` against a column that is always persisted as the truthy `1.0`. Probe: 0 of 12 weeks invoke the strategy function.
2. **The resolved value reaches no prescription.** `weekModifier` is consumed only by a string in `classData.explanations` (`sprintGenerator.mjs:159-165`). `generateBootcampClass` is called without it (`:145-154`) and has no parameter for it (`bootcampGenerator.mjs:470-488`).
3. **The claim is invisible anyway.** The Sprint Planner renders neither `explanations` (`SlotDetailPanel.tsx:136-138`) nor `intensityModifier` (`useSprintAPI.ts:42`, unread).

Net effect: a trainer sets `undulating`, sees "undulating" on the sprint card (`SprintPlannerPage.tsx:141`), and receives 12 weeks of byte-identical prescriptions. If the explanation were rendered, it would read *"Week 2 intensity modifier 1 — no intensity category applied"* while the sprint card advertises undulating. Contract `:29` names this exact row: **"A generated label can claim progress while prescriptions remain unchanged."**

**What is NOT the gap** (stated plainly so the next agent does not rebuild it): deload scheduling every 4th week, the deload label and its styling, the deload toggle's validation and precedence, the strategy allowlist and its persistence, and the workload↔impact decoupling all already exist and are tested.

### A trap that would produce a second dead path

The obvious place to apply the modifier is `resolveBootcampStructure`'s `durationSec` computation at `bootcampGenerator.mjs:455`:

```js
const durationSec = Math.max(20, Math.min(60, Math.round(availableWorkSec / Math.max(1, totalSlots))));
```

**That line is unreachable for every default Sprint class.** `resolveBootcampStructure` early-returns at `:435` when the caller passes no `stationCount`/`exercisesPerStation` and the format is not `custom`:

```js
// bootcampGenerator.mjs:424-435
if (!hasCustomStructure) {
  ...
  return { classFormat: resolvedClassFormat, format: baseFormat, stationCount: resolvedStationCount };
}
```

The Sprint's default format is `stations_4x` (`sprintCalendarContract.mjs:144`, `models/BootcampSprint.mjs:54`), whose config is `{ exercisesPerStation: 4, durationSec: 35, fixedStations: 5, rounds: 2 }` (`bootcampConstants.mjs:45`). `sprintGenerator.mjs:145-154` passes neither `stationCount` nor `exercisesPerStation` nor `targetDuration`. So `hasCustomStructure === false`, the early return wins, and `durationSec` is the constant `35` from `FORMAT_CONFIG`.

A modifier wired only into the `:455` path would be dead for 100% of default Sprints — introducing a second no-op directly on top of the one being fixed. Any slice must modulate the **returned `format` object** on both branches.

**Second trap on the same code:** `:435` returns `format: baseFormat` **by reference**, and `FORMAT_CONFIG` (`bootcampConstants.mjs:11-60`) is **not** `Object.freeze`d. Mutating `format.durationSec` in place would permanently corrupt the module-level config for every subsequent class in the process. `bootcampGenerator.mjs:514` and `:527` already use copy-on-write (`format = { ...format, fixedStations: stationCount }`) for this reason. Follow that pattern.

---

## Authoritative schema columns

### `models/BootcampSprint.mjs:12-98` (`tableName: 'bootcamp_sprints'`, `:100`)

| # | Column | Type / constraint | Line |
|---|---|---|---|
| 1 | `id` | INTEGER PK autoIncrement | `:13-17` |
| 2 | `trainerId` | INTEGER NOT NULL | `:18-21` |
| 3 | `name` | STRING(200) NOT NULL | `:22-25` |
| 4 | `startDate` | DATEONLY NOT NULL | `:26-29` |
| 5 | `endDate` | DATEONLY NOT NULL | `:30-33` |
| 6 | `durationWeeks` | INTEGER NOT NULL default 12 | `:34-38` |
| 7 | `classesPerWeek` | INTEGER NOT NULL default 3 | `:39-43` |
| 8 | `frequencyPattern` | JSONB default `['monday','wednesday','friday']` | `:44-47` |
| 9 | `focusRotation` | JSONB default `['lower_body','upper_body','full_body']` | `:48-51` |
| 10 | `defaultFormat` | STRING(30) default `'stations_4x'` | `:52-55` |
| 11 | `defaultStyle` | STRING(30) default `'standard'` | `:56-59` |
| 12 | `spaceProfileId` | INTEGER (nullable) | `:60-62` |
| 13 | `status` | STRING(20) default `'draft'`, isIn `[draft, generating, active, completed, archived]` | `:63-69` |
| 14 | **`progressionStrategy`** | **STRING(20) default `'linear'`, isIn `[linear, undulating, block, random]`** | **`:70-76`** |
| 15 | `totalClassesPlanned` | INTEGER default 0 | `:77-80` |
| 16 | `totalClassesCompleted` | INTEGER default 0 | `:81-84` |
| 17 | `previousSprintId` | INTEGER | `:85-87` |
| 18 | `notes` | TEXT | `:88-90` |
| 19 | **`metadata`** | **JSONB default `{}`** | **`:91-94`** |
| 20 | `generationVersion` | INTEGER default 1 (**no `allowNull: false`**) | `:95-98` |

### `models/SprintWeek.mjs:12-47` (`tableName: 'sprint_weeks'`, `:49`)

| Column | Type / constraint | Line |
|---|---|---|
| `id` | INTEGER PK autoIncrement | `:13-17` |
| `sprintId` | INTEGER NOT NULL | `:18-21` |
| `weekNumber` | INTEGER NOT NULL | `:22-25` |
| `startDate` / `endDate` | DATEONLY NOT NULL | `:26-33` |
| `theme` | STRING(100) | `:34-36` |
| `isDeloadWeek` | BOOLEAN default `false` | `:37-40` |
| `intensityModifier` | FLOAT default `1.0` | `:41-44` |
| `notes` | TEXT | `:45-47` |

### `models/SprintClassSlot.mjs:12-78` (`tableName: 'sprint_class_slots'`, `:80`)

`id` `:13-17` · `weekId` `:18-21` · `sprintId` `:22-25` · `templateId` `:26-28` · `classLogId` `:29-31` · `dayOfWeek` `:32-35` · `scheduledDate` DATEONLY `:36-39` · `dayType` STRING(30) `:40-43` · `classFormat` STRING(30) `:44-47` · `classStyle` STRING(30) `:48-51` · `status` STRING(20) isIn `[planned, generated, taught, skipped]` `:52-58` · `wasUsed` BOOLEAN `:59-62` · `usedDate` DATEONLY `:63-65` · `trainerConfirmedAt` DATE `:66-68` · `exerciseKeys` JSONB `:69-72` · **`generatedClassData` JSONB `:73-75`** · `notes` TEXT `:76-78`.

### Drift table

Only one Sprint migration exists: `backend/migrations/20260401000002-create-bootcamp-sprint-tables.cjs`. No later migration touches these columns.

| Model column | Model type (`file:line`) | Migration type (`file:line`) | Verdict |
|---|---|---|---|
| `progressionStrategy` | STRING(20) + isIn | **`Sequelize.ENUM('linear','undulating','block','random')`** `:75-78` | **TYPE DRIFT** — model declares STRING, DB is a PostgreSQL ENUM |
| `status` (sprint) | STRING(20) + isIn `BootcampSprint.mjs:63-69` | `Sequelize.ENUM(...)` `:71-74` | **TYPE DRIFT** (same class) |
| `status` (slot) | STRING(20) + isIn `SprintClassSlot.mjs:52-58` | `Sequelize.ENUM('planned','generated','taught','skipped')` `:225-228` | **TYPE DRIFT** (same class) |
| `isDeloadWeek` | BOOLEAN default false `SprintWeek.mjs:37-40` | BOOLEAN default false `:146-149` | MATCH |
| `intensityModifier` | FLOAT default 1.0 `SprintWeek.mjs:41-44` | FLOAT default 1.0, comment `'0.7 = deload, 1.0 = normal, 1.1 = push week'` `:150-154` | MATCH |
| `metadata` | JSONB default `{}` `BootcampSprint.mjs:91-94` | JSONB default `{}` `:95-98` | MATCH |
| `generatedClassData`, `exerciseKeys` | JSONB `SprintClassSlot.mjs:69-75` | JSONB `:242-250` | MATCH |

**No `occurrenceId`-class silent drop exists in the Sprint tree.** Every field every caller writes resolves to a real model column — verified caller by caller:

| Caller site | Fields written | Verdict |
|---|---|---|
| `sprintService.mjs:98-115` (`createSprint`) | trainerId, name, startDate, endDate, durationWeeks, classesPerWeek, frequencyPattern, focusRotation, defaultFormat, defaultStyle, spaceProfileId, progressionStrategy, previousSprintId, totalClassesPlanned, notes, status | all present |
| `sprintService.mjs:180-187` (`updateSprint` allowlist) | name, defaultFormat, defaultStyle, progressionStrategy, spaceProfileId, notes, status | all present |
| `sprintUpdateContract.mjs:72-87` (`validateWeekUpdate`) | theme, notes, isDeloadWeek, intensityModifier | all present |
| `sprintUpdateContract.mjs:48-62` (`validateSlotUpdate`) | dayType, classFormat, classStyle, status, notes | all present |
| `sprintStructure.mjs:32-52` (scaffold) | weekId, sprintId, dayOfWeek, scheduledDate, dayType, classFormat, classStyle, status · sprintId, weekNumber, startDate, endDate, theme, isDeloadWeek, intensityModifier | all present |
| `sprintSlotWrite.mjs:46-50` (atomic slot write) | generatedClassData, exerciseKeys, status | all present |

**Read-path note for a provenance slice:** `getSprintById` uses `buildSprintReadOptions` with no `attributes` filter (`sprintStructure.mjs:58-72`), so it returns `metadata`. But `listSprints` uses an explicit attribute list that **excludes `metadata`** (`sprintService.mjs:165-169`). Provenance surfaced on the list endpoint would require adding it there.

---

## Existing tests

**Verified run — all sprint calendar/contract/structure/vocabulary unit tests pass:**

```
node node_modules/vitest/vitest.mjs run tests/unit/sprintCalendarContract.test.mjs \
  tests/unit/sprintUpdateContract.test.mjs tests/unit/sprintCreateVocabulary.test.mjs \
  tests/unit/sprintStructure.test.mjs --reporter=dot
→ Test Files 4 passed (4) | Tests 71 passed (71) | Duration 267ms
```

| File | Lines | What it asserts about progression / deload |
|---|---|---|
| `backend/tests/unit/sprintCalendarContract.test.mjs` | 300 | `:169-170` — week 4 is `{isDeloadWeek: true, intensityModifier: 0.7, theme: 'Deload & Recovery'}`; week 1 is `{isDeloadWeek: false, intensityModifier: 1.0, theme: null}`. Locks **scheduling** and the **stored 1.0 default** — the very value that shadows the strategy. Asserts nothing about a prescription changing. |
| `backend/tests/unit/sprintUpdateContract.test.mjs` | 341 | `:92-95` rejects a non-boolean `isDeloadWeek`; `:97-101` derives `intensityModifier` from `isDeloadWeek` and lets it win (`{isDeloadWeek:true, intensityModifier:9}` → 0.7); `:104-107` accepts a finite modifier when `isDeloadWeek` is absent, rejects NaN; `:122,137-143` field-allowlist matrix (`isDeloadWeek` deliberately also emits `intensityModifier`). **Validation only.** |
| `backend/tests/unit/sprintStructure.test.mjs` | 174 | `:33-46, 123-124` — scaffolding persists `isDeloadWeek` / `intensityModifier` verbatim. **Persistence only.** |
| `backend/tests/unit/sprintCreateVocabulary.test.mjs` | 180 | `:91-95` rejects a strategy outside the model `isIn` list (`'exponential'` → error); `:100` default resolves to `'linear'`; `:138,164,168` fixture. **Vocabulary only.** |
| `backend/tests/unit/sprintGeneratorOwnership.test.mjs` | 142 | The **only** test that imports the real `generateSprintClasses` (`:45-46`). Asserts authorization only: foreign actor no memory read (`:95-99`), bad actor / malformed id (`:101-107`), FINDING-3 claim ordering (`:115-141`). It **never completes a generation** and its own comment concedes the pipeline is un-mocked (`:137-138`). **Zero progression assertions.** |
| `backend/tests/unit/sprintHostileReviewRegressions.test.mjs` | 204 | Mocks `sprintGenerator.mjs` wholesale (`:51-54`), so it cannot exercise the generator at all. |
| `backend/tests/api/sprintRoutesSecurity.test.mjs` | 232 | Mocks the generator (`:74-75`). |
| `backend/tests/api/sprintRoutesErrorMapping.test.mjs` | 249 | Mocks the generator (`:60-61`). |
| `backend/tests/unit/sprintSlotWrite.test.mjs` | 135 | Atomic slot+memory write (slice B). Not progression. |
| `frontend/src/hooks/useSprintAPI.generateStream.test.ts` | — | Slice D stream recovery only; 6 `it` blocks, none about progression. |
| `frontend/src/components/SprintPlanner/SprintPlannerPage.terminalNotice.test.tsx` | 113 | Slice D terminal notice. Fixture `:48 progressionStrategy: 'linear'` is inert. |
| `backend/__tests__/workoutProgressionService.test.mjs` | 97 | Measured micro-progression (`computeMicroProgression` / `applyMicroProgressionToExercises`). This is **S-H20c** territory and is **not** wired to Sprint. |
| `backend/tests/unit/nasmOptPolicySingleSource.test.mjs` | 113 | `:104-112` deliberately documents a live drift: `nasmProgressionService.mjs` says rep range `'1-10'` while canonical power reps are `[1,5]`. A known-open conflict inside H20's blast radius. |

**Net: zero tests assert that any progression strategy or any deload changes a prescribed value.** Every existing test asserts storage, validation, scheduling, or a label.

**No test file covers the generator's modifier resolution** — the `sprintGenerator.mjs:122/130-132` logic is entirely untested.

---

## Proposed smallest slice + RED test

### Recommended slice: **H20-α — "resolve, don't discard, and apply to one real prescribed value"**

This is deliberately smaller than any of S-H20a/b/c. It targets only the proven defect: the strategy resolves and the modifier reaches a number that is actually prescribed.

**In scope**
1. `backend/services/bootcamp/sprintGenerator.mjs` — make `:132` resolve the strategy when no explicit override exists, and pass the resolved modifier into `generateBootcampClass` at `:145-154`.
2. `backend/services/bootcamp/bootcampGenerator.mjs` — `generateBootcampClass` (`:470-488`) accepts the modifier and `resolveBootcampStructure` (`:407`) applies it to the returned `format.durationSec` **on both branches** (custom `:455`-style arithmetic and the non-custom early return `:435`), copying rather than mutating, with the contract's 60s automatic ceiling (`:263`).
3. `backend/tests/unit/workoutPrescriptionProgression.test.mjs` — **NEW**, the filename document 13 §8 line 298 already reserves.

**Out of scope — must be named, not silently dropped**
- S-H20a volume-deload set/rep transform (`13-server-repair-contract.md:244-247`)
- `Sprint.metadata.progressionPolicyV1` provenance and default-1.0-vs-explicit-1.0 (`:258`)
- `progression:{…}` persistence in `generatedClassData` (`:266`)
- `manual_protocol` handling for EMOM/Tabata/AMRAP (`:270`)
- measured micro-progression wiring to Sprint (`:234`, S-H20c)
- `regenerateSlot` parity (`sprintGenerator.mjs:237-298` writes no progression metadata)
- any UI change (the explanation still is not rendered; `SlotDetailPanel.tsx:136-138`)

### The RED test

**File to create:** `backend/tests/unit/workoutPrescriptionProgression.test.mjs`

**RED must be an intended assertion failure, not a missing import.** Document 13 §8 line 285 states this explicitly: *"RED must be an intended assertion failure, not missing imports/setup."* A test written against a brand-new `deloadTransform.mjs` would fail at import — invalid RED by the contract's own rule. This slice avoids that by asserting against `resolveBootcampStructure`, which is **already exported today** (`bootcampGenerator.mjs:407`).

**Assertion R1 — the arithmetic (pure, no I/O, no mocks).**
```
const base = resolveBootcampStructure({ classFormat: 'custom', stationCount: 4,
                                         exercisesPerStation: 4, targetDuration: 50 });
const deload = resolveBootcampStructure({ ...same, requestedModifier: 0.7 });
expect(deload.format.durationSec).toBe(Math.max(1, Math.round(base.format.durationSec * 0.7)));
```
Pre-fix, `requestedModifier` is an unknown option, the early/existing path returns the unmodified duration, and `deload.format.durationSec === base.format.durationSec` → **assertion failure**. Also assert the automatic ceiling: `requestedModifier: 1.5` on 35s must not exceed the contract's 60s bound (`:263`), and a **manually supplied longer interval is preserved unchanged** (`:263`, "does not receive automated increases").

**Assertion R2 — the discriminating one: the `||` dead-code defect.**
Drive the **real** `generateSprintClasses` (the fixture pattern in `sprintGeneratorOwnership.test.mjs:24-48` already proves this is importable with mocked models), with a sprint whose `progressionStrategy` is `'undulating'` and a week carrying `{ isDeloadWeek: false, intensityModifier: 1.0 }`. Assert the modifier resolved for week 2 is **0.85** (`sprintGenerator.mjs:39`, `[1.0, 0.85, 1.1]`) — not `1.0`.

Pre-fix the value is exactly `1.0`, so this fails. This single assertion is what kills the proven defect and is the reason to take this slice first.

**Assertion R3 — the modifier must not be label-only.**
With `generateBootcampClass` mocked, assert the **argument it receives** carries the resolved modifier (and that `week.isDeloadWeek === true` yields `0.7` with deload precedence over any strategy — contract `:258`). R3 alone would be weak evidence (it proves wiring, not a prescribed result); paired with R1's arithmetic on the real pure helper, the pair is defensible.

**Assertion R4 — anti-regression on the trap.** Assert `FORMAT_CONFIG.stations_4x.durationSec` is still `35` after a modulated call, proving the implementation copied rather than mutated the shared config (`bootcampConstants.mjs:11-60` is not frozen; `bootcampGenerator.mjs:435` returns it by reference).

### Blocking design decision the next agent MUST settle before editing `:132`

`sprintCalendarContract.test.mjs:170` **pins** `intensityModifier: 1.0` for non-deload weeks. Contract `:258` says *"Default persisted 1.0 does not prove a trainer override"* — i.e. the fix requires telling "no override" apart from "explicit 1.0", which the current schema cannot do without the `progressionPolicyV1` provenance (separate slice, out of scope here).

So there are three mutually exclusive options, and picking one silently is how this slice would regress something:

- **(a)** Change the calendar to persist `null` for non-deload weeks → breaks `sprintCalendarContract.test.mjs:170`; requires deciding whether the test or the contract is wrong (the discipline slice D used at `H01-H30-REMAINING-SCOPE.md:448-452`).
- **(b)** Keep `1.0` and treat it as "no override" → **must** be paired with `progressionPolicyV1` to distinguish an explicit 1.0, so H20-α cannot be fully correct alone. Honest, but the slice must say so.
- **(c)** `??` instead of `||` → preserves today's shadowing and fixes nothing.

**Recommendation: (b)**, with the slice explicitly recording that explicit-1.0 provenance is deferred to the `progressionPolicyV1` slice. Option (a) bundles a behavior change to the calendar contract and an existing-test decision into a feature fix — the exact unbundling failure recorded at `H01-H30-REMAINING-SCOPE.md:320-323`.

### Scope-bookkeeping rules that bind this slice

- **300-line cap.** `sprintGenerator.mjs` is at **298/299** and `bootcampGenerator.mjs` at **982** (already over, pre-existing). Adding to the generator will breach the cap, so the modifier resolution belongs in an extracted helper — mirroring the `sprintSlotWrite.mjs` precedent from slice B. Trim comments first.
- **No production DB, no migration, no main push, no provider calls** (`H01-H30-REMAINING-SCOPE.md:470-474`).
- This slice needs its own architecture doc before code, per the established packet format (`:480`).

---

## Uncertainties / things I could not verify

- `[UNVERIFIED]` Whether any **production** `sprint_weeks` row has `intensityModifier` NULL. The model default (`SprintWeek.mjs:43`) plus the calendar always writing a value (`sprintCalendarContract.mjs:257`) make it unlikely, but I did not query a database. If NULL rows exist, `:132`'s `||` *would* fall through to the strategy for those rows only — the defect would be partial, not total. The probe proves the code path; it does not prove every row's stored value.
- `[UNVERIFIED]` Whether `resolveBootcampStructure`'s `format.durationSec` reaches a **persisted** prescribed field end-to-end. I traced it to `bootcampGenerator.mjs:798` (`exerciseDurationSec: format.durationSec`) and `:871,944,954` (`durationSec: format.durationSec`), but did not execute a full generation to confirm what lands in `slot.generatedClassData`. R1 asserts the helper's output, not the persisted payload.
- `[UNVERIFIED]` The **live database** column type of `progressionStrategy`. The migration declares a PostgreSQL ENUM (`20260401000002-...:75-78`); I did not query `information_schema` to confirm the deployed schema matches, nor whether any later out-of-band change altered it.
- `[UNVERIFIED]` Whether `sprintGenerator.mjs:16`'s header claim — *"Deload weeks get reduced exercise counts"* — was ever implemented. I found **no** implementation of it (the loop at `:129-212` has no deload-conditional count logic and passes no count to `generateBootcampClass`). Either the comment is stale or the feature was removed; I did not run git archaeology to determine which. Flagged as a probable false comment, not asserted as a regression.
- `[UNVERIFIED]` Whether S-H20b's named file `sprintGenerationSemantics.test.mjs` has an intended location elsewhere in the repo. I searched `backend/` for `GenerationSemantics` and found only `bootcampGenerationSemantics.test.mjs`. The contract's name may simply be aspirational.
- `[UNVERIFIED]` Whether any other consumer outside `backend/` and `frontend/src` reads `progressionStrategy` (e.g. a PDF export or report template). My greps scoped to those two trees plus the migration/model files.
- The `13-server-repair-contract.md` §6 text was read from the live path and is byte-identical to `evidence/hostile-20260913/approval-originals/13-server-repair-contract.md`. A third variant, `13-server-before-diagram-fix.md`, carries the same §6 body. I did not diff them in full — only the §6/§8 line ranges cited above.
