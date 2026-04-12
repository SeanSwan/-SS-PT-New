/**
 * Command Registry — Category D: Health & Pain Management (8 commands)
 */
import { z } from 'zod';
import { registerCommands, PainLevelSchema } from './baseSchemas.mjs';

const commands = [
  {
    type: 'add_pain_entry',
    description: 'Add a pain entry for a client',
    naturalLanguagePatterns: ['add a pain entry for {client}', '{client} has pain in {bodyRegion}', 'log pain for {client}'],
    method: 'POST', endpoint: '/api/pain-entries/:userId',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      bodyRegion: z.string().min(1).max(100),
      painLevel: PainLevelSchema,
      notes: z.string().max(500).optional(),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'D',
  },
  {
    type: 'view_active_pain',
    description: 'Show a client\'s active pain entries',
    naturalLanguagePatterns: ['what are {client}\'s active pain entries', '{client}\'s pain', 'show pain for {client}'],
    method: 'GET', endpoint: '/api/pain-entries/:userId/active',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'D',
  },
  {
    type: 'resolve_pain_entry',
    description: 'Resolve a client\'s active pain entry by body region',
    naturalLanguagePatterns: ['resolve {client}\'s {bodyRegion} pain', 'mark {client}\'s {bodyRegion} pain as resolved', '{client}\'s {bodyRegion} pain is resolved'],
    method: 'PUT', endpoint: '/api/pain-entries/:userId/:entryId/resolve',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      bodyRegion: z.string().min(1).max(100),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'D',
  },
  {
    type: 'update_pain_entry',
    description: 'Update a client\'s active pain level or notes by body region',
    naturalLanguagePatterns: ['update {client}\'s {bodyRegion} pain level', 'change {client}\'s {bodyRegion} pain to {level}', 'update pain notes for {client}\'s {bodyRegion}'],
    method: 'PUT', endpoint: '/api/pain-entries/:userId/:entryId',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      bodyRegion: z.string().min(1).max(100),
      painLevel: PainLevelSchema.optional(),
      notes: z.string().max(500).optional(),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'D',
  },
  {
    type: 'log_measurements',
    description: 'Log body measurements for a client',
    naturalLanguagePatterns: ['log {client}\'s measurements', 'record measurements for {client}', 'add measurements for {client}'],
    method: 'POST', endpoint: '/api/measurements',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      weight: z.number().min(0).max(1000).optional(),
      bodyFat: z.number().min(0).max(100).optional(),
      chest: z.number().min(0).optional(),
      waist: z.number().min(0).optional(),
      hips: z.number().min(0).optional(),
      arms: z.number().min(0).optional(),
      thighs: z.number().min(0).optional(),
      notes: z.string().max(500).optional(),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'D',
  },
  {
    type: 'view_latest_measurements',
    description: 'Show a client\'s latest measurements',
    naturalLanguagePatterns: ['what are {client}\'s latest measurements', '{client}\'s measurements', 'latest stats for {client}'],
    method: 'GET', endpoint: '/api/measurements/user/:clientId/latest',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'D',
  },
  {
    type: 'log_weighin',
    description: 'Log a weigh-in for a client',
    naturalLanguagePatterns: ['log a weigh-in for {client}', '{client} weighs {weight}', 'record {client}\'s weight'],
    method: 'POST', endpoint: '/api/measurements',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      weight: z.number().min(0).max(1000),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'D',
  },
  {
    type: 'view_measurement_trends',
    description: 'Show measurement trends for a client',
    naturalLanguagePatterns: ['show measurement trends for {client}', '{client}\'s progress trends', 'how is {client} progressing'],
    method: 'GET', endpoint: '/api/measurements/user/:clientId/stats',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'D',
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
