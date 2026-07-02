/**
 * Command Registry — Category I: Goals & Gamification (6 commands)
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const GoalCategorySchema = z.enum([
  'fitness',
  'strength',
  'cardio',
  'flexibility',
  'nutrition',
  'weight',
  'body_composition',
  'mindfulness',
  'sleep',
  'social',
  'habit',
  'streak',
  'custom',
]);

const GoalPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
const GoalStatusSchema = z.enum(['draft', 'active', 'completed', 'paused', 'cancelled', 'failed']);
const CLIENT_FACING_READ_ROLES = ['admin', 'trainer', 'client', 'user'];

const GoalIdSchema = z.union([z.string().trim().min(1), z.number().int().positive()])
  .transform((value) => String(value));

const CreateGoalSchema = z.object({
  clientId: z.number().int().positive(),
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().max(1000).optional(),
  targetValue: z.coerce.number().positive(),
  currentValue: z.coerce.number().min(0).default(0),
  unit: z.string().trim().min(1).max(50),
  deadline: z.string().trim().min(1).optional(),
  targetDate: z.string().trim().min(1).optional(),
  category: GoalCategorySchema.default('fitness'),
  priority: GoalPrioritySchema.default('medium'),
  status: GoalStatusSchema.optional(),
  notes: z.string().trim().max(500).optional(),
})
  .refine((value) => Boolean(value.deadline || value.targetDate), {
    message: 'deadline or targetDate is required',
  })
  .transform(({ targetDate, ...value }) => ({
    ...value,
    deadline: value.deadline || targetDate,
  }));

const UpdateGoalProgressSchema = z.object({
  clientId: z.number().int().positive(),
  goalId: GoalIdSchema,
  currentValue: z.coerce.number().min(0).optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().trim().max(500).optional(),
}).refine((value) => value.currentValue !== undefined || value.progress !== undefined, {
  message: 'currentValue or progress is required',
});

const LeaderboardSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
  page: z.coerce.number().int().positive().default(1),
  tier: z.string().trim().min(1).max(50).optional(),
}).partial().transform((value) => ({
  limit: value.limit ?? 10,
  page: value.page ?? 1,
  ...(value.tier ? { tier: value.tier } : {}),
}));

const AwardBadgeSchema = z.object({
  clientId: z.number().int().positive(),
  achievementId: z.union([z.string().trim().min(1), z.number().int().positive()])
    .transform((value) => String(value)),
});

const commands = [
  {
    type: 'create_goal',
    description: 'Set a goal for a client',
    naturalLanguagePatterns: ['set a goal for {client}', 'create goal for {client}', '{client}\'s goal is {goal}'],
    method: 'POST', endpoint: '/api/client-progress/:clientId/goals',
    inputSchema: CreateGoalSchema,
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'I',
  },
  {
    type: 'view_goals',
    description: 'Show a client\'s goals and progress',
    naturalLanguagePatterns: ['show {client}\'s goals', '{client}\'s goals and progress', 'what are {client}\'s goals'],
    method: 'GET', endpoint: '/api/client-progress/:clientId/goals',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'I',
  },
  {
    type: 'update_goal_progress',
    description: 'Update a client\'s goal progress',
    naturalLanguagePatterns: ['update {client}\'s goal progress', '{client} is at {percent}% on goal'],
    method: 'PUT', endpoint: '/api/client-progress/:clientId/goals/:goalId',
    inputSchema: UpdateGoalProgressSchema,
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'I',
  },
  {
    type: 'view_leaderboard',
    description: 'Show the gamification leaderboard',
    naturalLanguagePatterns: ['show leaderboard', 'who\'s on top', 'rankings'],
    method: 'GET', endpoint: '/api/gamification/leaderboard',
    inputSchema: LeaderboardSchema,
    destructive: false, requiresConfirmation: false,
    roleRequired: CLIENT_FACING_READ_ROLES,
    requiresClientRef: false, category: 'I',
  },
  {
    type: 'award_badge',
    description: 'Award a badge to a client',
    naturalLanguagePatterns: ['award achievement {achievementId} to {client}', 'give {client} achievement {achievementId}'],
    method: 'POST', endpoint: '/api/gamification/users/:userId/achievements/:achievementId',
    inputSchema: AwardBadgeSchema,
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'I',
  },
  {
    type: 'view_xp_streaks',
    description: 'Show a client\'s XP and streaks',
    naturalLanguagePatterns: ['show {client}\'s XP', '{client}\'s streaks', 'how many points does {client} have'],
    method: 'GET', endpoint: '/api/gamification/users/:userId/profile',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer', 'client'],
    requiresClientRef: true, category: 'I',
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
