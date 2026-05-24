/**
 * Command Registry — Category I: Goals & Gamification (6 commands)
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const commands = [
  {
    type: 'create_goal',
    description: 'Set a goal for a client',
    naturalLanguagePatterns: ['set a goal for {client}', 'create goal for {client}', '{client}\'s goal is {goal}'],
    method: 'POST', endpoint: '/api/goals',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      title: z.string().min(1).max(200),
      description: z.string().max(1000).optional(),
      targetDate: z.string().optional(),
      category: z.enum(['weight_loss', 'strength', 'endurance', 'flexibility', 'nutrition', 'custom']).optional(),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'I',
  },
  {
    type: 'view_goals',
    description: 'Show a client\'s goals and progress',
    naturalLanguagePatterns: ['show {client}\'s goals', '{client}\'s goals and progress', 'what are {client}\'s goals'],
    method: 'GET', endpoint: '/api/goals',
    inputSchema: z.object({ userId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'I',
  },
  {
    type: 'update_goal_progress',
    description: 'Update a client\'s goal progress',
    naturalLanguagePatterns: ['update {client}\'s goal progress', '{client} is at {percent}% on goal'],
    method: 'PATCH', endpoint: '/api/goals/:goalId/progress',
    inputSchema: z.object({
      goalId: z.number().int().positive(),
      progress: z.number().min(0).max(100),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'I',
  },
  {
    type: 'view_leaderboard',
    description: 'Show the gamification leaderboard',
    naturalLanguagePatterns: ['show leaderboard', 'who\'s on top', 'rankings'],
    method: 'GET', endpoint: '/api/gamification/leaderboard',
    inputSchema: z.object({}).optional(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer', 'client'],
    requiresClientRef: false, category: 'I',
  },
  {
    type: 'award_badge',
    description: 'Award a badge to a client',
    naturalLanguagePatterns: ['award achievement {achievementId} to {client}', 'give {client} achievement {achievementId}'],
    method: 'POST', endpoint: '/api/gamification/users/:userId/achievements/:achievementId',
    inputSchema: z.object({
      userId: z.number().int().positive(),
      achievementId: z.number().int().positive(),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'I',
  },
  {
    type: 'view_xp_streaks',
    description: 'Show a client\'s XP and streaks',
    naturalLanguagePatterns: ['show {client}\'s XP', '{client}\'s streaks', 'how many points does {client} have'],
    method: 'GET', endpoint: '/api/gamification/profile',
    inputSchema: z.object({ userId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer', 'client'],
    requiresClientRef: true, category: 'I',
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
