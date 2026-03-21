/**
 * Command Registry — Category B: Workout Management (12 commands)
 */
import { z } from 'zod';
import { registerCommands, DateSchema, NASMPhaseSchema, PaginationSchema } from './baseSchemas.mjs';

const commands = [
  {
    type: 'build_workout_plan',
    description: 'Build a workout plan for a client (triggers AI debate)',
    naturalLanguagePatterns: ['build a workout plan for {client}', 'create a workout for {client}', 'design a program for {client}'],
    method: 'POST', endpoint: '/api/workouts/plans',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      nasmPhase: NASMPhaseSchema.optional(),
      durationWeeks: z.number().int().min(1).max(52).default(4),
      daysPerWeek: z.number().int().min(1).max(7).default(3),
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
    method: 'POST', endpoint: '/api/workouts/plans',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      nasmPhase: NASMPhaseSchema,
      durationWeeks: z.number().int().min(1).max(52).default(4),
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
    method: 'POST', endpoint: '/api/admin/clients/:clientId/workouts',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      exercises: z.array(z.object({
        name: z.string().min(1),
        sets: z.number().int().min(1).optional(),
        reps: z.number().int().min(1).optional(),
        weight: z.number().min(0).optional(),
        duration: z.number().min(0).optional(),
        notes: z.string().max(500).optional(),
      })).min(1),
      date: DateSchema.optional(),
      notes: z.string().max(1000).optional(),
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
      clientId: z.number().int().positive(),
      limit: z.number().int().default(1),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'B',
  },
  {
    type: 'generate_periodization',
    description: 'Generate a long-term periodization plan for a client',
    naturalLanguagePatterns: ['generate a 12-week periodization for {client}', 'long-term plan for {client}', 'periodization for {client}'],
    method: 'POST', endpoint: '/api/workouts/plans',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      durationWeeks: z.number().int().min(4).max(52).default(12),
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
    method: 'GET', endpoint: '/api/workouts/sessions/user/:clientId',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
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
      clientId: z.number().int().positive(),
      category: z.string().min(1),
      level: z.number().int().min(1).max(5),
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
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'B',
  },
  {
    type: 'view_exercise_recommendations',
    description: 'Show exercise recommendations for a client',
    naturalLanguagePatterns: ['show exercise recommendations for {client}', 'what exercises for {client}', 'recommend exercises for {client}'],
    method: 'GET', endpoint: '/api/workouts/recommendations/:clientId',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'B',
  },
  {
    type: 'create_workout_session',
    description: 'Create a workout session for a client on a specific date',
    naturalLanguagePatterns: ['create a workout session for {client} on {date}', 'add workout for {client} on {date}'],
    method: 'POST', endpoint: '/api/workouts/sessions',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
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
    method: 'DELETE', endpoint: '/api/workouts/plans/:planId',
    inputSchema: z.object({ planId: z.number().int().positive() }),
    destructive: true, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'B',
  },
  {
    type: 'view_workout_statistics',
    description: 'Show a client\'s workout statistics',
    naturalLanguagePatterns: ['show {client}\'s workout statistics', '{client}\'s workout stats', 'how often does {client} work out'],
    method: 'GET', endpoint: '/api/workouts/statistics/:clientId',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'B',
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
