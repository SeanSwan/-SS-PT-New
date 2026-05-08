/**
 * Command Registry - Category N: Structured PLAUD Coach Actions
 * =============================================================
 * Read/propose/manual-confirmation commands for PLAUD work entering the
 * unified Swan Coach intake lane. These commands never perform final workout
 * log writes; they only prepare operator-visible action metadata.
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const CoachIntakeScopeSchema = z.enum([
  'actionable',
  'today',
  'unprocessed',
  'processing',
  'ready_review',
  'needs_clarification',
  'duplicate_hold',
  'failed',
  'needs_client',
  'all',
]).default('actionable');

const CoachIntakeAudioActionSchema = z.object({
  scope: CoachIntakeScopeSchema.optional().default('actionable'),
  limit: z.number().int().min(1).max(20).default(20),
  intakeId: z.string().trim().min(1).max(128).optional(),
});

const PlaudConfirmationTypeSchema = z.enum([
  'audio_order',
  'client',
  'date',
  'duplicate',
  'merge_boundary',
]).default('audio_order');

const commands = [
  {
    type: 'plaud_list_intake_items',
    description: 'List unified Swan Coach intake items that include PLAUD work',
    naturalLanguagePatterns: [
      'list PLAUD intake items',
      'show PLAUD items in Coach intake',
      'show training intake items from PLAUD',
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
    relatedCommands: ['plaud_analyze_clip_set', 'plaud_propose_clip_order'],
  },
  {
    type: 'plaud_analyze_clip_set',
    description: 'Analyze a PLAUD clip set without exposing transcripts or writing logs',
    naturalLanguagePatterns: [
      'analyze this PLAUD clip set',
      'inspect PLAUD clip set {intakeId}',
      'summarize the PLAUD clips before review',
    ],
    method: 'GET',
    endpoint: '/api/coach/intake/queue?scope=actionable',
    inputSchema: CoachIntakeAudioActionSchema,
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'N',
    relatedCommands: ['plaud_propose_clip_order', 'plaud_request_confirmation'],
  },
  {
    type: 'plaud_propose_clip_order',
    description: 'Propose PLAUD clip order for manual confirmation',
    naturalLanguagePatterns: [
      'propose PLAUD clip order',
      'order these PLAUD clips',
      'what order should the PLAUD clips be in',
    ],
    method: 'GET',
    endpoint: '/api/coach/intake/queue?scope=actionable',
    inputSchema: CoachIntakeAudioActionSchema,
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'N',
    relatedCommands: ['plaud_request_confirmation', 'plaud_group_session_candidates'],
  },
  {
    type: 'plaud_group_session_candidates',
    description: 'Propose likely PLAUD session groups for manual confirmation',
    naturalLanguagePatterns: [
      'group PLAUD session candidates',
      'which PLAUD clips belong together',
      'group these PLAUD clips into sessions',
    ],
    method: 'GET',
    endpoint: '/api/coach/intake/queue?scope=actionable',
    inputSchema: CoachIntakeAudioActionSchema,
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'N',
    relatedCommands: ['plaud_propose_clip_order', 'plaud_merge_candidate_group'],
  },
  {
    type: 'plaud_merge_candidate_group',
    description: 'Prepare a PLAUD merge candidate group for manual confirmation only',
    naturalLanguagePatterns: [
      'prepare PLAUD merge candidate group',
      'stage this PLAUD group for confirmation',
      'prepare these PLAUD clips for merge review',
    ],
    method: 'GET',
    endpoint: '/api/coach/intake/queue?scope=actionable',
    inputSchema: CoachIntakeAudioActionSchema,
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'N',
    relatedCommands: ['plaud_request_confirmation', 'plaud_propose_clip_order'],
  },
  {
    type: 'plaud_request_confirmation',
    description: 'Request manual confirmation for a PLAUD client, date, order, duplicate, or boundary decision',
    naturalLanguagePatterns: [
      'request confirmation for this PLAUD intake',
      'ask me to confirm PLAUD order',
      'confirm this PLAUD boundary decision',
    ],
    method: 'GET',
    endpoint: '/api/coach/intake/queue?scope=actionable',
    inputSchema: CoachIntakeAudioActionSchema.extend({
      confirmationType: PlaudConfirmationTypeSchema,
    }),
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'N',
    relatedCommands: ['plaud_propose_clip_order', 'plaud_group_session_candidates'],
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
