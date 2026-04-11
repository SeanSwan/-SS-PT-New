/**
 * Command Registry — Category E: Nutrition (6 commands)
 */
import { z } from 'zod';
import { registerCommands, DateSchema } from './baseSchemas.mjs';

const commands = [
  {
    type: 'log_meals',
    description: "Log a client's meals for a given day",
    naturalLanguagePatterns: ['log {client}\'s meals', 'record {client}\'s food', '{client} ate {food}', 'log meals for {client}'],
    method: 'POST', endpoint: '/api/macros',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      date: DateSchema.optional(),  // defaults to today in dispatcher if absent
      meals: z.array(z.object({
        description: z.string().min(1).max(500),              // food description (required by DailyMacroLog)
        mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).default('snack'),
        calories: z.number().min(0).optional(),
        protein:  z.number().min(0).optional(),
        carbs:    z.number().min(0).optional(),
        fat:      z.number().min(0).optional(),
      })).min(1),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'E',
  },
  {
    type: 'view_nutrition_log',
    description: "Show what a client ate today (current-day snapshot)",
    // NOTE: date support is not yet wired — this command always returns today's log.
    // "yesterday" pattern removed: the Zod schema has no date field, so extracted dates
    // are stripped at stepValidate. Honest scope: today only.
    naturalLanguagePatterns: ['{client}\'s meals today', 'show {client}\'s nutrition log', 'what did {client} eat today', '{client}\'s food log'],
    method: 'GET', endpoint: '/api/macros/summary?date=today&userId={clientId}',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'E',
  },
  {
    type: 'create_nutrition_plan',
    description: 'Create a nutrition plan for a client',
    naturalLanguagePatterns: ['create a nutrition plan for {client}', 'meal plan for {client}', 'diet plan for {client}'],
    method: 'POST', endpoint: '/api/nutrition/:clientId',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      goal: z.enum(['weight_loss', 'muscle_gain', 'maintenance', 'performance']).optional(),
      calorieTarget: z.number().int().min(800).max(6000).optional(),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'E',
    isDebateRequired: true,
  },
  {
    type: 'scan_food',
    description: 'Scan a food item for nutritional information',
    naturalLanguagePatterns: ['scan this food', 'what\'s in {food}', 'nutrition info for {food}'],
    method: 'POST', endpoint: '/api/food-scanner/scan',
    inputSchema: z.object({
      query: z.string().min(1).max(200),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer', 'client'],
    requiresClientRef: false, category: 'E',
  },
  {
    type: 'view_macro_trends',
    description: "Show a client's 7-day macro trends",
    naturalLanguagePatterns: ['show {client}\'s macro trends', '{client}\'s nutrition trends', 'macro history for {client}', '{client}\'s weekly nutrition'],
    method: 'GET', endpoint: '/api/macros/weekly?userId={clientId}',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'E',
  },
  {
    type: 'flag_sodium_intake',
    description: 'Flag a client\'s sodium intake for review',
    naturalLanguagePatterns: ['flag {client}\'s sodium', 'check {client}\'s sodium intake'],
    method: 'GET', endpoint: '/api/macro/:clientId',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'E',
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
