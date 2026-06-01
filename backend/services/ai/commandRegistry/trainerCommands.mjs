/**
 * Command Registry — Category H: Trainer Management (6 commands)
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const PermissionTypeSchema = z.enum([
  'edit_workouts',
  'view_progress',
  'manage_clients',
  'access_nutrition',
  'modify_schedules',
  'view_analytics',
]);

const commands = [
  {
    type: 'list_trainers',
    description: 'Show all trainers',
    naturalLanguagePatterns: ['show me all trainers', 'list trainers', 'who are the trainers'],
    method: 'GET', endpoint: '/api/auth/users/trainers',
    inputSchema: z.object({
      includeAdmin: z.boolean().optional(),
      limit: z.number().int().min(1).max(25).optional(),
      page: z.number().int().min(1).optional(),
    }).optional(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'H',
  },
  {
    type: 'promote_to_trainer',
    description: 'Promote a user to trainer role',
    naturalLanguagePatterns: ['promote {user} to trainer', 'make {user} a trainer'],
    method: 'PUT', endpoint: '/api/admin/users/:id',
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
    method: 'POST', endpoint: '/api/trainer-permissions/grant',
    inputSchema: z.object({
      trainerId: z.number().int().positive(),
      permissions: z.array(PermissionTypeSchema).min(1).max(6),
      expiresAt: z.string().datetime().optional(),
      reason: z.string().trim().min(1).max(300).optional(),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'H',
  },
  {
    type: 'revoke_trainer_permission',
    description: 'Revoke a specific permission from a trainer',
    naturalLanguagePatterns: ['revoke {permission} from {trainer}', 'remove {trainer}\'s {permission}'],
    method: 'PUT', endpoint: '/api/trainer-permissions/:permissionId/revoke',
    inputSchema: z.object({
      permissionId: z.number().int().positive(),
      reason: z.string().trim().min(1).max(300).optional(),
    }),
    destructive: true, requiresConfirmation: true,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'H',
  },
  {
    type: 'view_trainer_clients',
    description: 'Show a trainer\'s client list',
    naturalLanguagePatterns: ['show {trainer}\'s clients', '{trainer}\'s client list', 'who does {trainer} train'],
    method: 'GET', endpoint: '/api/client-trainer-assignments/trainer/:trainerId',
    inputSchema: z.object({ trainerId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'H',
  },
  {
    type: 'assign_client_to_trainer',
    description: 'Assign a client to a trainer',
    naturalLanguagePatterns: ['assign {client} to {trainer}', 'give {client} to {trainer}'],
    method: 'POST', endpoint: '/api/assignments',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      trainerId: z.number().int().positive(),
      notes: z.string().trim().min(1).optional(),
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
