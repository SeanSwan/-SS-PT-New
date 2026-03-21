/**
 * Command Registry — Category E: Nutrition (6 commands)
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const commands = [
  {
    type: 'log_meals',
    description: 'Log a client\'s meals for today',
    naturalLanguagePatterns: ['log {client}\'s meals', 'record {client}\'s food', '{client} ate {food}'],
    method: 'POST', endpoint: '/api/ai-chat/data-update',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      meals: z.array(z.object({
        name: z.string().min(1),
        calories: z.number().min(0).optional(),
        protein: z.number().min(0).optional(),
        carbs: z.number().min(0).optional(),
        fat: z.number().min(0).optional(),
        servingSize: z.string().optional(),
      })).min(1),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'E',
    dataWriteType: 'macro_log',
  },
  {
    type: 'view_nutrition_log',
    description: 'Show what a client ate recently',
    naturalLanguagePatterns: ['what did {client} eat yesterday', '{client}\'s meals', 'show {client}\'s nutrition log'],
    method: 'GET', endpoint: '/api/macro/:clientId',
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
    description: 'Show a client\'s macro trends',
    naturalLanguagePatterns: ['show {client}\'s macro trends', '{client}\'s nutrition trends', 'macro history for {client}'],
    method: 'GET', endpoint: '/api/macro/:clientId',
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
