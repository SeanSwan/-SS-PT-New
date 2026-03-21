/**
 * Command Registry — Category L: Client Self-Service Mode (10 commands)
 */
import { z } from 'zod';
import { registerCommands, PainLevelSchema } from './baseSchemas.mjs';

const commands = [
  {
    type: 'my_workout_today',
    description: 'Show the client\'s workout plan for today',
    naturalLanguagePatterns: ['show my workout for today', 'what\'s my workout', 'what should I do today'],
    method: 'GET', endpoint: '/api/workouts/sessions/user/:myId',
    inputSchema: z.object({}),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['client'],
    requiresClientRef: false, category: 'L',
    selfService: true,
  },
  {
    type: 'log_my_nutrition',
    description: 'Log the client\'s own nutrition intake',
    naturalLanguagePatterns: ['log my nutrition', 'I ate {food}', 'record my meals'],
    method: 'POST', endpoint: '/api/ai-chat/data-update',
    inputSchema: z.object({
      meals: z.array(z.object({
        name: z.string().min(1),
        calories: z.number().min(0).optional(),
        protein: z.number().min(0).optional(),
        carbs: z.number().min(0).optional(),
        fat: z.number().min(0).optional(),
      })).min(1),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['client'],
    requiresClientRef: false, category: 'L',
    selfService: true,
    dataWriteType: 'macro_log',
  },
  {
    type: 'track_my_pain',
    description: 'Track the client\'s own pain levels',
    naturalLanguagePatterns: ['track my pain', 'I have pain in my {bodyPart}', 'log my pain'],
    method: 'POST', endpoint: '/api/pain/:myId',
    inputSchema: z.object({
      bodyPart: z.string().min(1).max(100),
      painLevel: PainLevelSchema,
      notes: z.string().max(500).optional(),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['client'],
    requiresClientRef: false, category: 'L',
    selfService: true,
  },
  {
    type: 'schedule_my_session',
    description: 'Schedule the client\'s next session',
    naturalLanguagePatterns: ['schedule my next session', 'book me a session', 'when can I come in'],
    method: 'GET', endpoint: '/api/availability/trainer/:trainerId',
    inputSchema: z.object({}),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['client'],
    requiresClientRef: false, category: 'L',
    selfService: true,
  },
  {
    type: 'my_progress',
    description: 'Show the client\'s own progress this month',
    naturalLanguagePatterns: ['show my progress', 'how am I doing', 'my progress this month'],
    method: 'GET', endpoint: '/api/measurements/user/:myId/stats',
    inputSchema: z.object({}),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['client'],
    requiresClientRef: false, category: 'L',
    selfService: true,
  },
  {
    type: 'nutrition_advice',
    description: 'Get personalized nutrition advice',
    naturalLanguagePatterns: ['what should I eat today', 'nutrition advice', 'meal suggestions'],
    method: 'GET', endpoint: '/api/ai-chat/conversations',
    inputSchema: z.object({}),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['client'],
    requiresClientRef: false, category: 'L',
    selfService: true,
    isConversational: true,
  },
  {
    type: 'my_xp',
    description: 'Show the client\'s XP and level',
    naturalLanguagePatterns: ['how many XP do I have', 'my XP', 'my level'],
    method: 'GET', endpoint: '/api/gamification',
    inputSchema: z.object({}),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['client'],
    requiresClientRef: false, category: 'L',
    selfService: true,
  },
  {
    type: 'my_streaks_badges',
    description: 'Show the client\'s streaks and badges',
    naturalLanguagePatterns: ['show my streaks', 'my badges', 'what badges do I have'],
    method: 'GET', endpoint: '/api/gamification',
    inputSchema: z.object({}),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['client'],
    requiresClientRef: false, category: 'L',
    selfService: true,
  },
  {
    type: 'request_plan_adjustment',
    description: 'Request an adjustment to the client\'s workout plan',
    naturalLanguagePatterns: ['request a plan adjustment', 'I need my plan changed', 'modify my workout plan'],
    method: 'POST', endpoint: '/api/ai-chat/data-update',
    inputSchema: z.object({
      reason: z.string().min(1).max(500),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['client'],
    requiresClientRef: false, category: 'L',
    selfService: true,
    dataWriteType: 'client_note',
  },
  {
    type: 'exercises_to_avoid',
    description: 'Show exercises the client should avoid based on pain entries',
    naturalLanguagePatterns: ['what exercises should I avoid', 'exercises to skip', 'what\'s bad for my injuries'],
    method: 'GET', endpoint: '/api/pain/:myId/active',
    inputSchema: z.object({}),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['client'],
    requiresClientRef: false, category: 'L',
    selfService: true,
    isConversational: true,
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
