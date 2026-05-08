/**
 * Command Registry - Category N: Unified Coach Intake Workspace
 * ============================================================
 * Read-only voice commands for the unified intake queue. These commands cover
 * Coach-created intake drafts and PLAUD items without granting write authority.
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const CoachIntakeScopeSchema = z.enum([
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
    type: 'view_coach_intake_health',
    description: 'Show Coach intake health, stuck processing counts, and next operator action',
    naturalLanguagePatterns: [
      'show Coach intake health',
      'is the Coach intake queue healthy',
      'what is stuck in the intake queue',
      'show hive mind queue health',
    ],
    method: 'GET',
    endpoint: '/api/coach/intake/health',
    inputSchema: z.object({}),
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'N',
    relatedCommands: ['view_coach_intake_queue', 'review_next_coach_intake'],
  },
  {
    type: 'view_coach_intake_retention',
    description: 'Show Coach intake raw artifact retention candidates and next privacy action',
    naturalLanguagePatterns: [
      'show Coach intake retention',
      'show raw artifact retention',
      'what Coach intake artifacts can be purged',
      'show hive mind retention',
    ],
    method: 'GET',
    endpoint: '/api/coach/intake/retention',
    inputSchema: z.object({}),
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'N',
    relatedCommands: ['view_coach_intake_health', 'view_coach_intake_queue'],
  },
  {
    type: 'view_coach_intake_retention_purge_plan',
    description: 'Show the dry-run Coach intake cleanup plan without purging raw artifacts',
    naturalLanguagePatterns: [
      'show Coach intake cleanup plan',
      'show Coach retention cleanup plan',
      'what would Coach intake cleanup purge',
      'show hive mind cleanup plan',
    ],
    method: 'GET',
    endpoint: '/api/coach/intake/retention/purge-plan',
    inputSchema: z.object({}),
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'N',
    relatedCommands: ['view_coach_intake_retention', 'view_coach_intake_health'],
  },
  {
    type: 'view_coach_intake_queue',
    description: 'Show the unified Swan Coach intake queue counts and next work item',
    naturalLanguagePatterns: [
      'show my Coach intake queue',
      'show my intake queue',
      'what voice notes need review',
      'show hive mind intake',
    ],
    method: 'GET',
    endpoint: '/api/coach/intake/queue',
    inputSchema: z.object({
      scope: CoachIntakeScopeSchema,
      limit: z.number().int().min(1).max(20).default(10),
    }),
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'N',
    relatedCommands: ['review_next_coach_intake', 'inspect_coach_audio_pieces'],
  },
  {
    type: 'review_next_coach_intake',
    description: 'Find the next Coach or PLAUD intake item to review',
    naturalLanguagePatterns: [
      'review next Coach intake',
      'review next intake',
      'open the next voice intake',
      'what workout note should I process next',
    ],
    method: 'GET',
    endpoint: '/api/coach/intake/queue?scope=actionable',
    inputSchema: z.object({
      scope: CoachIntakeScopeSchema.optional().default('actionable'),
      limit: z.number().int().min(1).max(20).default(20),
    }),
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'N',
    relatedCommands: ['view_coach_intake_queue', 'inspect_coach_audio_pieces'],
  },
  {
    type: 'inspect_coach_audio_pieces',
    description: 'Summarize pending Coach and PLAUD audio pieces before ordering, merge, or review',
    naturalLanguagePatterns: [
      'inspect pending Coach audio pieces',
      'inspect Coach intake {intakeId} audio pieces',
      'inspect pending audio pieces',
      'help me order my voice notes',
      'which voice notes go together',
      'summarize Coach audio pieces before merge',
    ],
    method: 'GET',
    endpoint: '/api/coach/intake/queue?scope=actionable',
    inputSchema: z.object({
      scope: CoachIntakeScopeSchema.optional().default('actionable'),
      limit: z.number().int().min(1).max(20).default(20),
      intakeId: z.string().trim().min(1).max(128).optional(),
    }),
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'N',
    relatedCommands: ['view_coach_intake_queue', 'review_next_coach_intake'],
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
