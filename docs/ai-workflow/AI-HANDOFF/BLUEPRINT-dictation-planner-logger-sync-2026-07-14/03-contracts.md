# 03 — Contracts

## 1. New FRONTEND_DISPATCH planner commands (backend registry)
Add to `backend/services/ai/commandRegistry/workoutCommands.mjs`, EXACTLY mirroring the existing
five logger entries (e.g. `add_exercise_to_form`, lines ~222-314). All: `method:'FRONTEND_DISPATCH'`,
`requiresConfirmation:false`, roles `['admin','trainer']` (NOT client — trainer-led wedge; clients
keep `request_plan_adjustment`). `endpoint` unused; set `frontendEvent`.

| command type | frontendEvent | params (all optional unless ✱) |
|---|---|---|
| `planner_add_exercise` | `AI_PLANNER_ADD_EXERCISE` | `exerciseName✱`, `sets`, `reps`, `tempo`, `restSeconds`, `dayNumber`, `weekNumber` |
| `planner_swap_exercise` | `AI_PLANNER_SWAP_EXERCISE` | `fromExerciseName✱`, `toExerciseName✱`, `dayNumber`, `weekNumber` |
| `planner_remove_exercise` | `AI_PLANNER_REMOVE_EXERCISE` | `exerciseName✱`, `dayNumber`, `weekNumber` |
| `planner_update_exercise` | `AI_PLANNER_UPDATE_EXERCISE` | `exerciseName✱`, `sets`, `reps`, `tempo`, `restSeconds` |
| `planner_generate_workout` | `AI_PLANNER_GENERATE` | `category`, `goal`, `phase` |

Registry entry template (copy the shape of the existing block verbatim, changing only fields):
```js
planner_swap_exercise: {
  type: 'planner_swap_exercise',
  method: 'FRONTEND_DISPATCH',
  frontendEvent: 'AI_PLANNER_SWAP_EXERCISE',
  roles: ['admin', 'trainer'],
  requiresConfirmation: false,
  description: 'Swap one exercise for another in the open Workout Planner',
  examples: ['swap leg press for box squat', 'replace overhead press with band pull-aparts'],
},
```
Intent parsing: extend the SAME intent-parser tables the five logger commands use (find where
`add_exercise_to_form` phrases are matched; add planner phrasings there). When the planner dock
sends `context.surface==='workout-planner'`, ambiguous verbs ("add X", "remove X", "swap X for Y",
"make X three sets") MUST resolve to `planner_*` commands, not the logger `AI_*` family. When
`surface==='workout-logger'`, resolve to the existing logger family. Thread `surface` through the
execute request body → intent context (builder: find where `useCoachCommand` builds the POST body
and where the backend reads it; both sides get one added field).

## 2. Event payloads (frontend, CustomEvent detail)
```ts
// frontend/src/components/DashBoard/Pages/admin-workout-planner/workoutPlannerAiEvents.types.ts
export interface PlannerAddExercisePayload {
  exerciseName: string; sets?: number; reps?: string | number; tempo?: string;
  restSeconds?: number; dayNumber?: number; weekNumber?: number;
}
export interface PlannerSwapExercisePayload {
  fromExerciseName: string; toExerciseName: string; dayNumber?: number; weekNumber?: number;
}
export interface PlannerRemoveExercisePayload { exerciseName: string; dayNumber?: number; weekNumber?: number; }
export interface PlannerUpdateExercisePayload {
  exerciseName: string; sets?: number; reps?: string | number; tempo?: string; restSeconds?: number;
}
export interface PlannerGeneratePayload { category?: string; goal?: string; phase?: number; }
```
Resolution rules (DECIDED — implement exactly):
- Name matching: case-insensitive, whitespace-collapsed `includes()` against
  `formatWorkoutPlannerExerciseName(name)`; if >1 match, prefer exact; if still >1 → handled=false
  with receipt `Multiple matches for "<name>" — say more of the exercise name.`
- No `weekNumber/dayNumber` + a generatedPlan is open → target the CURRENTLY SELECTED day in the
  Detailed Schedule; no generatedPlan → target the single-day builder list.
- `to` exercise for swap/add MUST resolve to a Rolodex `ExerciseSlim` via the exercise search
  worker (exact-first, then first result). Unresolvable → handled=false + receipt
  `Couldn't find "<name>" in the exercise library.`
- Swap keeps slot programming (sets/reps/tempo/rest) — reuse `applyHorizonSwap` semantics;
  builder-row swaps go through the same replace path the manual swap button uses.
- Acknowledge every event via the SAME `acknowledgeAIWorkoutEvent(e, handled)` util the logger
  uses so `frontendDispatchReceipt` stays honest ("No Workout Planner is open…").

## 3. Hook signatures (frontend, new files)
```ts
// useWorkoutPlannerAiEvents.ts
export function useWorkoutPlannerAiEvents(args: {
  planExercises: PlanExercise[];
  setPlanExercises: React.Dispatch<React.SetStateAction<PlanExercise[]>>;
  generatedPlan: GeneratedPlan | null;
  setGeneratedPlan: React.Dispatch<React.SetStateAction<GeneratedPlan | null>>;
  selectedHorizonTarget: { weekNumber: number; dayIndex: number } | null; // from schedule view selection
  searchExercises: (query: string) => Promise<ExerciseSlim[]>;            // exercise-search worker wrapper
  onGenerate: () => void;                                                 // existing requestSwanCoachWorkoutForSelectedClient
  pushReceipt: (r: { ok: boolean; text: string }) => void;
}): void;

// useWorkoutPlannerCoachDock.ts
export function useWorkoutPlannerCoachDock(args: {
  selectedClientId: number | null;
  pushReceipt: (r: { ok: boolean; text: string }) => void;
}): {
  open: boolean; toggleOpen: () => void;
  dockText: string; setDockText: (t: string) => void;
  listening: boolean; interim: string; handleVoice: () => void;
  voiceOverlay: React.ReactNode;                 // VoiceRecordingOverlay wiring, recorder fallback
  submitting: boolean; handleSubmit: () => Promise<void>;   // → command lane w/ surface context
  receipts: Array<{ id: string; ok: boolean; text: string }>;
};

// useWorkoutLoggerDictation.ts (logger side)
export function useWorkoutLoggerDictation(args: { clientId: number | null }): {
  active: boolean; toggle: () => void; interim: string; text: string; setText: (t: string) => void;
  submitting: boolean; send: () => Promise<void>;   // command lane, surface:'workout-logger'
  receipt: { ok: boolean; text: string } | null;
};
```

## 4. Last-weight suggestion endpoint (S5)
`GET /api/workout-logs/last-weights?clientId=84&names=Leg%20Press,Chest%20Press%20Machine`
- Auth: `protect`; RBAC: same client-access check the logger's other client reads use
  (`verifyClientAccess*` precedent — copy from an existing workout-logs route in
  `backend/routes/` that scopes by clientId).
- Response 200: `{ "success": true, "weights": { "leg press": { "weight": 100, "reps": 11, "at": "2026-07-10" } } }`
  (keys are lowercase-normalized names; only names with a logged weight > 0 appear; source = most
  recent `workout_logs` row joined via `workout_sessions.userId`, `LIMIT` bounded).
- Errors: 400 missing params · 403 not your client · empty `weights:{}` is a SUCCESS, not error.
- Frontend: one fetch after plan load with the unique exercise names; fail-silent.

## 5. Receipt copy (exact strings)
- add: `Added <Name> — <sets>×<reps>` (+ ` (Week <w> · Day <d>)` when horizon-targeted)
- swap: `Swapped <From> → <To>` (+ week/day suffix)
- remove: `Removed <Name>` (+ suffix) · update: `Updated <Name> — <changed fields summary>`
- generate: `Generating a fresh workout…` then normal generation status flow.
- failure fallbacks as specified in §2 and 02-wireframes §B/D.
