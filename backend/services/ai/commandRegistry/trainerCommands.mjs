/**
 * Command Registry — Category H: Trainer Management (6 commands)
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const commands = [
  {
    type: 'list_trainers',
    description: 'Show all trainers',
    naturalLanguagePatterns: ['show me all trainers', 'list trainers', 'who are the trainers'],
    method: 'GET', endpoint: '/api/auth/users/trainers',
    inputSchema: z.object({}).optional(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'H',
  },
  {
    type: 'promote_to_trainer',
    description: 'Promote a user to trainer role',
    naturalLanguagePatterns: ['promote {user} to trainer', 'make {user} a trainer'],
    method: 'POST', endpoint: '/api/auth/promote-client',
    inputSchema: z.object({
      userId: z.number().int().positive(),
      newRole: z.literal('trainer'),
    }),
    destructive: true, requiresConfirmation: true,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'H',
  },
  {
    type: 'set_trainer_permissions',
    description: 'Set permissions for a trainer',
    naturalLanguagePatterns: ['set {trainer}\'s permissions', 'update permissions for {trainer}'],
    method: 'POST', endpoint: '/api/trainer-permissions/trainer/:trainerId',
    inputSchema: z.object({
      trainerId: z.number().int().positive(),
      permissions: z.array(z.string()).min(1),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'H',
  },
  {
    type: 'revoke_trainer_permission',
    description: 'Revoke a specific permission from a trainer',
    naturalLanguagePatterns: ['revoke {permission} from {trainer}', 'remove {trainer}\'s {permission}'],
    method: 'DELETE', endpoint: '/api/trainer-permissions/trainer/:trainerId/:permission',
    inputSchema: z.object({
      trainerId: z.number().int().positive(),
      permission: z.string().min(1),
    }),
    destructive: true, requiresConfirmation: true,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'H',
  },
  {
    type: 'view_trainer_clients',
    description: 'Show a trainer\'s client list',
    naturalLanguagePatterns: ['show {trainer}\'s clients', '{trainer}\'s client list', 'who does {trainer} train'],
    method: 'GET', endpoint: '/api/sessions/trainer/:trainerId',
    inputSchema: z.object({ trainerId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'H',
  },
  {
    type: 'assign_client_to_trainer',
    description: 'Assign a client to a trainer',
    naturalLanguagePatterns: ['assign {client} to {trainer}', 'give {client} to {trainer}'],
    method: 'POST', endpoint: '/api/admin/clients/:clientId/assign-trainer',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      trainerId: z.number().int().positive(),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin'],
    requiresClientRef: true, category: 'H',
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
