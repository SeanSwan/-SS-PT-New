/**
 * Command Registry — Category J: Onboarding & Forms (6 commands)
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const commands = [
  {
    type: 'start_onboarding',
    description: 'Start onboarding process for a client',
    naturalLanguagePatterns: ['start onboarding for {client}', 'begin {client}\'s onboarding', 'onboard {client}'],
    method: 'POST', endpoint: '/api/admin/clients/:clientId/onboarding',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'J',
  },
  {
    type: 'view_onboarding_status',
    description: 'Check where a client is in onboarding',
    naturalLanguagePatterns: ['where is {client} in onboarding', '{client}\'s onboarding status', 'onboarding progress for {client}'],
    method: 'GET', endpoint: '/api/admin/clients/:clientId/onboarding',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'J',
  },
  {
    type: 'fill_baseline_measurements',
    description: 'Fill out a client\'s baseline measurements via voice',
    naturalLanguagePatterns: ['fill out {client}\'s baseline measurements', 'baseline for {client}', 'initial measurements for {client}'],
    method: 'POST', endpoint: '/api/admin/baseline-measurements',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      weight: z.number().min(0).optional(),
      height: z.number().min(0).optional(),
      bodyFat: z.number().min(0).max(100).optional(),
      restingHeartRate: z.number().int().min(30).max(200).optional(),
      bloodPressure: z.string().optional(),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'J',
  },
  {
    type: 'view_orientation_queue',
    description: 'Show the orientation queue',
    naturalLanguagePatterns: ['show orientation queue', 'who needs orientation', 'onboarding queue'],
    method: 'GET', endpoint: '/api/admin/onboarding',
    inputSchema: z.object({
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(20).optional(),
      status: z.enum(['all', 'complete', 'draft', 'not_started', 'archived']).optional(),
      package: z.string().min(1).max(120).optional(),
    }).optional(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'J',
  },
  {
    type: 'onboarding_questions',
    description: 'Start interactive onboarding questionnaire for a client',
    naturalLanguagePatterns: ['ask me the onboarding questions for {client}', 'run onboarding interview for {client}'],
    method: 'GET', endpoint: '/api/admin/clients/:clientId/onboarding',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'J',
    isInteractive: true,
  },
  {
    type: 'submit_onboarding',
    description: 'Submit a client\'s completed onboarding',
    naturalLanguagePatterns: ['submit {client}\'s onboarding', 'complete onboarding for {client}', 'finalize {client}\'s onboarding'],
    method: 'POST', endpoint: '/api/admin/clients/:clientId/onboarding',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      status: z.literal('submitted'),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'J',
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
