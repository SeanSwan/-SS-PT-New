/**
 * Command Registry — Category B: Workout Management (17 commands)
 */
import { z } from 'zod';
import { registerCommands, DateSchema, NASMPhaseSchema, PaginationSchema } from './baseSchemas.mjs';

const PlannedAssignmentBaseSchema = {
  assignmentKey: z.string().min(1).max(160),
  planId: z.union([z.string().min(1).max(160), z.coerce.number().int().positive()]),
  source: z.literal('workout_plan').default('workout_plan'),
  weekNumber: z.coerce.number().int().positive(),
  dayNumber: z.coerce.number().int().positive(),
};

const PlannedAssignmentSchema = z.union([
  z.object({
    ...PlannedAssignmentBaseSchema,
    assignmentType: z.enum(['homework', 'active_recovery']),
    isBillable: z.literal(false).default(false),
    shouldDeductSession: z.literal(false).default(false),
  }),
  z.object({
    ...PlannedAssignmentBaseSchema,
    assignmentType: z.literal('trainer_session'),
    isBillable: z.literal(true).default(true),
    shouldDeductSession: z.boolean().default(true),
  }),
]);

// NO coercion here: downstream consumers rely on a dictated "777" staying a
// string (scheduledSessionId contract) — the union already handles both shapes.
const ScheduledSessionIdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/),
]);

const commands = [
  {
    type: 'build_workout_plan',
    description: 'Build a workout plan for a client (triggers AI debate)',
    naturalLanguagePatterns: ['build a workout plan for {client}', 'create a workout for {client}', 'design a program for {client}'],
    method: 'POST', endpoint: '/api/workout-plans',
    inputSchema: z.object({
      clientId: z.coerce.number().int().positive(),
      nasmPhase: NASMPhaseSchema.optional(),
      durationWeeks: z.coerce.number().int().min(1).max(52).default(4),
      daysPerWeek: z.coerce.number().int().min(1).max(7).default(3),
      focus: z.string().max(200).optional(),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'B',
    isDebateRequired: true,
  },
  {
    type: 'create_nasm_program',
    description: 'Create a NASM phase-specific program for a client',
    naturalLanguagePatterns: ['create a phase {phase} program for {client}', 'NASM phase {phase} plan for {client}'],
    method: 'POST', endpoint: '/api/workout-plans',
    inputSchema: z.object({
      clientId: z.coerce.number().int().positive(),
      nasmPhase: NASMPhaseSchema,
      durationWeeks: z.coerce.number().int().min(1).max(52).default(4),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'B',
    isDebateRequired: true,
  },
  {
    type: 'log_workout',
    description: 'Log today\'s workout for a client',
    naturalLanguagePatterns: ['log today\'s workout for {client}', 'record {client}\'s workout', 'log exercises for {client}'],
    method: 'POST', endpoint: '/api/workout-forms',
    inputSchema: z.object({
      clientId: z.coerce.number().int().positive(),
      // Session-level fields
      title: z.string().max(200).optional().describe('Session title; auto-generated if absent'),
      date: DateSchema.optional(),
      duration: z.coerce.number().int().min(0).default(0).describe('Session duration in minutes'),
      intensity: z.coerce.number().int().min(1).max(10).optional().describe('Session intensity 1–10 when explicitly dictated'),
      notes: z.string().max(1000).optional(),
      scheduledSessionId: ScheduledSessionIdSchema.optional().describe('Booked session id when logging from the trainer schedule'),
      plannedAssignment: PlannedAssignmentSchema.optional().describe('Verified Today assignment metadata'),
      // Exercise array (flat format — sets is a count, not an array)
      exercises: z.array(z.object({
        name: z.string().min(1),
        sets: z.coerce.number().int().min(1).default(1).describe('Number of sets'),
        reps: z.coerce.number().int().min(0).default(0),
        weight: z.coerce.number().min(0).default(0),
        tempo: z.string().max(10).optional().describe('NASM tempo notation e.g. "4/2/1" (eccentric/isometric/concentric)'),
        restSeconds: z.coerce.number().int().min(0).max(600).optional().describe('Rest period in seconds between sets'),
        rpe: z.coerce.number().min(1).max(10).optional().describe('Rate of Perceived Exertion 1–10'),
        notes: z.string().max(500).optional(),
      })).min(1),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'B',
  },
  {
    type: 'view_last_workout',
    description: 'Show what exercises a client did last session',
    naturalLanguagePatterns: ['what did {client} do last session', 'last workout for {client}', '{client}\'s last exercises'],
    method: 'GET', endpoint: '/api/admin/clients/:clientId/workouts',
    inputSchema: z.object({
      clientId: z.coerce.number().int().positive(),
      limit: z.coerce.number().int().default(1),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'B',
  },
  {
    type: 'generate_periodization',
    description: 'Generate a long-term periodization plan for a client',
    naturalLanguagePatterns: ['generate a 12-week periodization for {client}', 'long-term plan for {client}', 'periodization for {client}'],
    method: 'POST', endpoint: '/api/workout-plans',
    inputSchema: z.object({
      clientId: z.coerce.number().int().positive(),
      durationWeeks: z.coerce.number().int().min(4).max(52).default(12),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'B',
    isDebateRequired: true,
  },
  {
    type: 'view_workout_history',
    description: 'Show a client\'s workout history',
    naturalLanguagePatterns: ['show {client}\'s workout history', '{client}\'s past workouts', 'workout log for {client}'],
    method: 'GET', endpoint: '/api/workout/sessions/user/:clientId',
    inputSchema: z.object({
      clientId: z.coerce.number().int().positive(),
    }).merge(PaginationSchema),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'B',
  },
  {
    type: 'update_nasm_level',
    description: 'Update a client\'s NASM progress level for a muscle group',
    naturalLanguagePatterns: ['update {client}\'s NASM level', 'change {client}\'s progress level', 'advance {client} to phase {phase}'],
    method: 'POST', endpoint: '/api/ai-chat/data-update',
    inputSchema: z.object({
      clientId: z.coerce.number().int().positive(),
      category: z.string().min(1),
      level: z.coerce.number().int().min(1).max(5),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'B',
    dataWriteType: 'progress_level',
  },
  {
    type: 'view_nasm_phase',
    description: 'Show a client\'s current NASM phase',
    naturalLanguagePatterns: ['what\'s {client}\'s current NASM phase', '{client}\'s phase', 'what phase is {client} in'],
    method: 'GET', endpoint: '/api/admin/clients/:clientId',
    inputSchema: z.object({ clientId: z.coerce.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'B',
  },
  {
    type: 'view_exercise_recommendations',
    description: 'Show exercise recommendations for a client',
    naturalLanguagePatterns: ['show exercise recommendations for {client}', 'what exercises for {client}', 'recommend exercises for {client}'],
    method: 'GET', endpoint: '/api/workout/recommendations/:clientId',
    inputSchema: z.object({
      clientId: z.coerce.number().int().positive(),
      goal: z.string().min(1).max(80).optional(),
      difficulty: z.string().min(1).max(80).optional(),
      equipment: z.array(z.string().min(1).max(80)).max(10).optional(),
      muscleGroups: z.array(z.string().uuid()).max(10).optional(),
      muscleGroupNames: z.array(z.string().min(1).max(80)).max(10).optional(),
      bodyRegions: z.array(z.enum(['upper_body', 'lower_body', 'core', 'full_body'])).max(4).optional(),
      excludeExercises: z.array(z.string().uuid()).max(25).optional(),
      limit: z.coerce.number().int().min(1).max(10).optional(),
      rehabFocus: z.boolean().optional(),
      optPhase: NASMPhaseSchema.optional(),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'B',
  },
  {
    type: 'create_workout_session',
    description: 'Create a workout session for a client on a specific date',
    naturalLanguagePatterns: ['create a workout session for {client} on {date}', 'add workout for {client} on {date}'],
    method: 'POST', endpoint: '/api/workout/sessions',
    inputSchema: z.object({
      clientId: z.coerce.number().int().positive(),
      date: DateSchema,
      notes: z.string().max(1000).optional(),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'B',
  },
  {
    type: 'delete_workout_plan',
    description: 'Delete a workout plan',
    naturalLanguagePatterns: ['delete workout plan {id}', 'remove plan {id}'],
    method: 'DELETE', endpoint: '/api/workout-plans/:planId',
    inputSchema: z.object({
      planId: z.union([z.string().uuid(), z.coerce.number().int().positive()]),
    }),
    destructive: true, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'B',
  },
  {
    type: 'view_workout_statistics',
    description: 'Show a client\'s workout statistics',
    naturalLanguagePatterns: ['show {client}\'s workout statistics', '{client}\'s workout stats', 'how often does {client} work out'],
    method: 'GET', endpoint: '/api/workout/statistics/:clientId',
    inputSchema: z.object({ clientId: z.coerce.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'B',
  },

  // ─── AI-as-Operator Commands (dispatch to frontend form) ───
  {
    type: 'load_phase_template',
    description: 'Load a NASM OPT phase template into the workout logger form',
    naturalLanguagePatterns: ['load phase {phase} template', 'use phase {phase}', 'start with phase {phase} workout'],
    method: 'FRONTEND_DISPATCH', endpoint: 'AI_LOAD_TEMPLATE',
    inputSchema: z.object({
      phase: NASMPhaseSchema,
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'B',
    frontendEvent: 'AI_LOAD_TEMPLATE',
  },
  {
    type: 'add_exercise_to_form',
    description: 'Add an exercise to the current workout form with optional set details',
    naturalLanguagePatterns: [
      'add {exercise} to the workout', 'add {sets} sets of {exercise} at {weight}',
      'put {exercise} in', 'include {exercise}',
    ],
    method: 'FRONTEND_DISPATCH', endpoint: 'AI_ADD_EXERCISE',
    inputSchema: z.object({
      exerciseName: z.string().min(1),
      sets: z.coerce.number().int().min(1).max(20).default(3),
      reps: z.coerce.number().int().min(1).max(100).default(10),
      weight: z.coerce.number().min(0).optional(),
      tempo: z.string().max(10).optional(),
      restSeconds: z.coerce.number().int().min(0).max(600).optional(),
      notes: z.string().max(500).optional(),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'B',
    frontendEvent: 'AI_ADD_EXERCISE',
  },
  {
    type: 'update_set_data',
    description: 'Update weight, reps, or RPE for a specific set in the workout logger',
    naturalLanguagePatterns: [
      'set {exercise} weight to {weight}', 'RPE {rpe} for {exercise}',
      '{client} did {reps} at {weight} on {exercise}',
    ],
    method: 'FRONTEND_DISPATCH', endpoint: 'AI_UPDATE_SET',
    inputSchema: z.object({
      exerciseName: z.string().min(1),
      setNumber: z.coerce.number().int().min(1).optional(),
      weight: z.coerce.number().min(0).optional(),
      reps: z.coerce.number().int().min(1).optional(),
      rpe: z.coerce.number().min(1).max(10).optional(),
      tempo: z.string().max(10).optional(),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'B',
    frontendEvent: 'AI_UPDATE_SET',
  },
  {
    type: 'toggle_nasm_item',
    description: 'Check or uncheck a warmup, cooldown, or balance/core item',
    naturalLanguagePatterns: [
      'mark {item} complete', 'check off {item}', 'mark all warmup complete',
      'done with {item}', 'finish {section}',
    ],
    method: 'FRONTEND_DISPATCH', endpoint: 'AI_TOGGLE_NASM_ITEM',
    inputSchema: z.object({
      section: z.enum(['warmup', 'balance_core', 'cooldown']),
      itemName: z.string().min(1).optional(),
      markAll: z.boolean().default(false),
      completed: z.boolean().default(true),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'B',
    frontendEvent: 'AI_TOGGLE_NASM_ITEM',
  },
  {
    type: 'submit_workout_form',
    description: 'Submit the current workout form (requires confirmation)',
    naturalLanguagePatterns: [
      'submit this workout', 'save the workout', 'done with the session',
      'complete and save', 'finish workout',
    ],
    method: 'FRONTEND_DISPATCH', endpoint: 'AI_SUBMIT_WORKOUT',
    inputSchema: z.object({
      intensity: z.coerce.number().int().min(1).max(10).optional(),
      notes: z.string().max(1000).optional(),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'B',
    frontendEvent: 'AI_SUBMIT_WORKOUT',
  },

  // ─── Planner AI-as-Operator Commands (dispatch to the open Workout Planner) ───
  // FRONTEND_DISPATCH only: the server NEVER writes workout_plans for these —
  // edits land in the open planner via browser events, and persistence stays
  // behind the human Save/Update buttons (trainer-indispensability doctrine).
  // Admin + trainer only; clients keep request_plan_adjustment.
  {
    type: 'planner_add_exercise',
    description: 'Add an exercise to the open Workout Planner',
    naturalLanguagePatterns: [
      'add {exercise} to the plan', 'give me {exercise} on day {day}',
      'put {exercise} in the plan', 'add {sets} sets of {exercise} to the plan',
    ],
    method: 'FRONTEND_DISPATCH', endpoint: 'AI_PLANNER_ADD_EXERCISE',
    inputSchema: z.object({
      exerciseName: z.string().min(1),
      sets: z.coerce.number().int().min(1).max(20).optional(),
      reps: z.union([z.coerce.number().int().min(1).max(100), z.string().max(20)]).optional(),
      tempo: z.string().max(10).optional(),
      restSeconds: z.coerce.number().int().min(0).max(600).optional(),
      dayNumber: z.coerce.number().int().min(1).max(7).optional(),
      weekNumber: z.coerce.number().int().min(1).max(52).optional(),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'B',
    frontendEvent: 'AI_PLANNER_ADD_EXERCISE',
  },
  {
    type: 'planner_swap_exercise',
    description: 'Swap one exercise for another in the open Workout Planner',
    naturalLanguagePatterns: [
      'swap {exercise} for {replacement}', 'replace {exercise} with {replacement}',
      'switch {exercise} to {replacement} in the plan',
    ],
    method: 'FRONTEND_DISPATCH', endpoint: 'AI_PLANNER_SWAP_EXERCISE',
    inputSchema: z.object({
      fromExerciseName: z.string().min(1),
      toExerciseName: z.string().min(1),
      dayNumber: z.coerce.number().int().min(1).max(7).optional(),
      weekNumber: z.coerce.number().int().min(1).max(52).optional(),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'B',
    frontendEvent: 'AI_PLANNER_SWAP_EXERCISE',
  },
  {
    type: 'planner_remove_exercise',
    description: 'Remove an exercise from the open Workout Planner',
    naturalLanguagePatterns: [
      'remove {exercise} from the plan', 'take {exercise} out of the plan',
      'drop {exercise} from day {day}',
    ],
    method: 'FRONTEND_DISPATCH', endpoint: 'AI_PLANNER_REMOVE_EXERCISE',
    inputSchema: z.object({
      exerciseName: z.string().min(1),
      dayNumber: z.coerce.number().int().min(1).max(7).optional(),
      weekNumber: z.coerce.number().int().min(1).max(52).optional(),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'B',
    frontendEvent: 'AI_PLANNER_REMOVE_EXERCISE',
  },
  {
    type: 'planner_update_exercise',
    description: 'Update sets, reps, tempo, or rest for an exercise in the open Workout Planner',
    naturalLanguagePatterns: [
      'make {exercise} {sets} sets', 'change {exercise} to {reps} reps',
      'set {exercise} rest to {seconds} seconds', 'make {exercise} two sets each',
    ],
    method: 'FRONTEND_DISPATCH', endpoint: 'AI_PLANNER_UPDATE_EXERCISE',
    inputSchema: z.object({
      exerciseName: z.string().min(1),
      sets: z.coerce.number().int().min(1).max(20).optional(),
      reps: z.union([z.coerce.number().int().min(1).max(100), z.string().max(20)]).optional(),
      tempo: z.string().max(10).optional(),
      restSeconds: z.coerce.number().int().min(0).max(600).optional(),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'B',
    frontendEvent: 'AI_PLANNER_UPDATE_EXERCISE',
  },
  {
    type: 'planner_generate_workout',
    description: 'Generate a fresh workout in the open Workout Planner',
    // Planner-flavored phrasings only — bare "generate a workout" stays with
    // build_workout_plan so Command Center flows are not hijacked (R1 fix).
    naturalLanguagePatterns: [
      'generate a workout in the planner', 'give me a leg day for this client',
      'build a fresh workout in the planner', 'make a new {category} workout in the planner',
    ],
    method: 'FRONTEND_DISPATCH', endpoint: 'AI_PLANNER_GENERATE',
    inputSchema: z.object({
      category: z.string().max(40).optional(),
      goal: z.string().max(40).optional(),
      phase: NASMPhaseSchema.optional(),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'B',
    frontendEvent: 'AI_PLANNER_GENERATE',
  },
  // Arc L / L3 rest-timer voice intents (Kimi: existing family, no parallel registry).
  {
    type: 'rest_skip',
    description: 'Skip the current rest period in the open workout logger',
    naturalLanguagePatterns: ['skip rest', 'skip the rest timer', 'back to work'],
    method: 'FRONTEND_DISPATCH', endpoint: 'AI_REST_SKIP',
    inputSchema: z.object({}).strict(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'B',
    frontendEvent: 'AI_REST_SKIP',
  },
  {
    type: 'rest_adjust',
    description: 'Adjust the rest timer duration in the open workout logger',
    naturalLanguagePatterns: ['add fifteen seconds of rest', 'plus fifteen', 'shorten the rest by 15'],
    method: 'FRONTEND_DISPATCH', endpoint: 'AI_REST_ADJUST',
    inputSchema: z.object({
      deltaSeconds: z.number().int().refine((v) => Math.abs(v) >= 15 && Math.abs(v) <= 60),
    }).strict(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'B',
    frontendEvent: 'AI_REST_ADJUST',
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
