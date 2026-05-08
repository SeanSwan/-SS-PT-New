/**
 * Command Registry - Category N: PLAUD Intake Workspace
 * =====================================================
 * Read-only voice commands for the PLAUD queue. Writes stay in the existing
 * merge/review flow until the structured Swan Coach apply actions are shipped.
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const PlaudScopeSchema = z.enum([
  'actionable',
  'today',
  'unprocessed',
  'processing',
  'ready_review',
  'failed',
  'needs_client',
  'all',
]).default('actionable');

const commands = [
  {
    type: 'view_plaud_intake_queue',
    description: 'Show PLAUD intake queue counts and the next queue item',
    naturalLanguagePatterns: [
      'show my PLAUD queue',
      'what PLAUD recordings need review',
      'show PLAUD uploads',
    ],
    method: 'GET',
    endpoint: '/api/plaud/intake',
    inputSchema: z.object({
      scope: PlaudScopeSchema,
      limit: z.number().int().min(1).max(20).default(10),
    }),
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'N',
    relatedCommands: ['review_next_plaud_intake', 'inspect_plaud_audio_pieces'],
  },
  {
    type: 'review_next_plaud_intake',
    description: 'Find the next PLAUD intake item to review',
    naturalLanguagePatterns: [
      'review next PLAUD intake',
      'review next PLAUD item',
      'open the next PLAUD recording',
      'what PLAUD file should I handle next',
    ],
    method: 'GET',
    endpoint: '/api/plaud/intake?scope=actionable',
    inputSchema: z.object({
      scope: PlaudScopeSchema.optional().default('actionable'),
      limit: z.number().int().min(1).max(20).default(20),
    }),
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'N',
    relatedCommands: ['view_plaud_intake_queue', 'inspect_plaud_audio_pieces'],
  },
  {
    type: 'inspect_plaud_audio_pieces',
    description: 'Summarize pending PLAUD audio pieces and chronology gaps before merge',
    naturalLanguagePatterns: [
      'help me order my PLAUD clips',
      'inspect pending PLAUD audio pieces',
      'summarize PLAUD audio pieces before merge',
      'which PLAUD sound bites go together',
    ],
    method: 'GET',
    endpoint: '/api/plaud/intake?scope=unprocessed',
    inputSchema: z.object({
      gapThresholdMinutes: z.number().int().min(5).max(240).default(45),
      limit: z.number().int().min(1).max(20).default(20),
    }),
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'N',
    relatedCommands: ['view_plaud_intake_queue', 'review_next_plaud_intake'],
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
