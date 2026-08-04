/**
 * Command Registry — Category E: Nutrition (6 commands)
 */
import { z } from 'zod';
import { registerCommands, DateSchema } from './baseSchemas.mjs';

const BarcodeSchema = z.string().trim().regex(/^\d{8,14}$/, 'Barcode must be 8-14 digits');
const CLIENT_FACING_READ_ROLES = ['admin', 'trainer', 'client', 'user'];

const ScanFoodInputSchema = z.object({
  query: z.string().trim().min(1).max(200).optional(),
  barcode: BarcodeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(10).default(5),
}).superRefine((value, ctx) => {
  if (!value.query && !value.barcode) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['query'],
      message: 'Food name or barcode is required',
    });
  }
}).transform((value) => {
  const query = value.query?.trim();
  const barcode = value.barcode || (/^\d{8,14}$/.test(query || '') ? query : undefined);
  const normalized = { limit: value.limit };

  if (barcode) normalized.barcode = barcode;
  if (query && query !== barcode) normalized.query = query;

  return normalized;
});

const SodiumIntakeInputSchema = z.object({
  clientId: z.number().int().positive(),
  date: DateSchema.optional(),
  sodiumLimit: z.coerce.number().int().min(500).max(5000).default(2300),
  mealSodiumLimit: z.coerce.number().int().min(100).max(3000).default(800),
});
const MealTypeSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.enum(['breakfast', 'lunch', 'dinner', 'snack']).default('snack'),
);

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
        mealType: MealTypeSchema,
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
    description: "Show what a client ate on a day (today by default; up to 14 days back)",
    // S2.3 (2026-08-04): date is wired — optional YYYY-MM-DD, validated and
    // clamped in the dispatcher to a 14-day lookback, never a future date.
    naturalLanguagePatterns: ['{client}\'s meals today', 'show {client}\'s nutrition log', 'what did {client} eat today', 'what did {client} eat yesterday', '{client}\'s food log', 'what did {client} eat on {date}'],
    method: 'GET', endpoint: '/api/macros/summary?date={date}&userId={clientId}',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }),
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
    description: 'Search a food item or barcode for nutritional information',
    naturalLanguagePatterns: ['scan this food', 'what\'s in {food}', 'nutrition info for {food}'],
    method: 'GET', endpoint: '/api/food-scanner/search',
    inputSchema: ScanFoodInputSchema,
    destructive: false, requiresConfirmation: false,
    roleRequired: CLIENT_FACING_READ_ROLES,
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
    method: 'GET', endpoint: '/api/macros/summary?date=today&userId={clientId}',
    inputSchema: SodiumIntakeInputSchema,
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'E',
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
