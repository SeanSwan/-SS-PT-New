/**
 * Command Registry — Category M: Hermes Agent Commands (2 commands)
 * ==================================================================
 * Sprint 1 (exec-substrate-v1): create_hermes_task, list_hermes_tasks
 *
 * Both commands:
 *   - requiresConfirmation: false — execution happens in stepExecute (Step 9)
 *   - destructive: false — no HMAC-signed pending op required
 *   - roleRequired: ['admin', 'trainer'] — clients cannot create or list tasks
 *
 * Execution path: stepExecute → commandDispatcher → hermesService
 * (Does NOT use command.endpoint for execution — endpoint is informational only)
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const HERMES_AGENT_TYPES = [
  'dev', 'coach', 'content', 'marketer', 'platform', 'ops', 'nutrition', 'life',
];

const commands = [
  {
    type: 'create_hermes_task',
    description: 'Queue a task for a Swan Hermes agent (dev, coach, content, marketing, etc.)',
    naturalLanguagePatterns: [
      'ask hermes to',
      'create a task for the dev agent',
      'tell the content agent to',
      'have hermes generate',
      'queue a hermes task',
      'send to hermes',
    ],
    method: 'POST',
    endpoint: '/api/hermes/tasks', // Informational — dispatcher executes, not REST runner
    inputSchema: z.object({
      agentType: z.enum(HERMES_AGENT_TYPES),
      taskTitle: z.string().min(3).max(200),
      taskDescription: z.string().min(10).max(2000),
      priority: z.enum(['low', 'normal', 'high']).default('normal'),
    }),
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'M',
  },
  {
    type: 'list_hermes_tasks',
    description: 'List pending and completed Hermes agent tasks',
    naturalLanguagePatterns: [
      'show hermes tasks',
      'what hermes tasks are pending',
      'list agent tasks',
      'hermes task status',
      'show pending hermes',
    ],
    method: 'GET',
    endpoint: '/api/hermes/tasks', // Informational — dispatcher executes
    inputSchema: z.object({
      agentType: z.enum(HERMES_AGENT_TYPES).optional(),
      status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']).optional(),
    }),
    destructive: false,
    requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false,
    category: 'M',
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
