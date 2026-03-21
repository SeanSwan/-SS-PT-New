/**
 * Command Registry — Category K: AI Village & System (4 commands)
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const commands = [
  {
    type: 'run_ai_village',
    description: 'Run AI Village validation on specified files',
    naturalLanguagePatterns: ['run ai village validation', 'validate with ai village', 'run validation on {files}'],
    method: 'POST', endpoint: '/api/admin/ai-village/run',
    inputSchema: z.object({
      files: z.array(z.string()).optional(),
      staged: z.boolean().default(false),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'K',
  },
  {
    type: 'view_validation_results',
    description: 'Show latest AI Village validation results',
    naturalLanguagePatterns: ['show latest validation results', 'ai village results', 'what did validation find'],
    method: 'GET', endpoint: '/api/admin/ai-village/latest',
    inputSchema: z.object({}).optional(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'K',
  },
  {
    type: 'view_ai_system_status',
    description: 'Show AI system monitoring status',
    naturalLanguagePatterns: ['what\'s the AI system status', 'AI status', 'ai monitoring'],
    method: 'GET', endpoint: '/api/ai-monitoring',
    inputSchema: z.object({}).optional(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'K',
  },
  {
    type: 'run_health_check',
    description: 'Run a comprehensive system health check',
    naturalLanguagePatterns: ['run a health check', 'check system health', 'is everything working'],
    method: 'GET', endpoint: '/health/db',
    inputSchema: z.object({}).optional(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'K',
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
