/**
 * Command Registry — Category A: Client Management (14 commands)
 */
import { z } from 'zod';
import { registerCommands, ClientRefSchema, PaginationSchema } from './baseSchemas.mjs';

const ClientSourceSchema = z.enum(['swanstudios', 'move_fitness', 'external']);
const ExternalClientSourceSchema = z.enum(['move_fitness', 'external']);
const BooleanishSchema = z.union([z.boolean(), z.literal('true'), z.literal('false')])
  .transform((value) => value === true || value === 'true');
const UpdateClientSchema = z.object({
  clientId: z.number().int().positive(),
  phone: z.string().trim().min(1).max(64).optional(),
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  dateOfBirth: z.string().trim().min(1).optional(),
  gender: z.string().trim().min(1).max(80).optional(),
  weight: z.coerce.number().positive().optional(),
  height: z.coerce.number().positive().optional(),
  fitnessGoal: z.string().trim().min(1).max(500).optional(),
  trainingExperience: z.string().trim().min(1).max(2000).optional(),
  healthConcerns: z.string().trim().min(1).max(2000).optional(),
  emergencyContact: z.string().trim().min(1).max(500).optional(),
  clientSource: ClientSourceSchema.optional(),
  accountStatus: z.enum(['stub', 'invited', 'active']).optional(),
  canGenerateWorkoutPlans: BooleanishSchema.optional(),
}).strict().refine(
  ({ clientId, ...updates }) => Object.values(updates).some((value) => value !== undefined),
  { message: 'At least one supported client profile field is required' },
);

const commands = [
  {
    type: 'create_client',
    description: 'Create a new client account',
    naturalLanguagePatterns: ['add a new client', 'create client', 'add {name} as a client', 'sign up {name}'],
    method: 'POST', endpoint: '/api/admin/clients',
    inputSchema: z.object({
      firstName: z.string().min(1).max(50),
      lastName: z.string().min(1).max(50),
      email: z.string().email(),
      phone: z.string().optional(),
      clientSource: ClientSourceSchema.optional(),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'A',
    relatedCommands: ['create_external_client', 'start_onboarding'],
  },
  {
    type: 'create_external_client',
    description: 'Create a Move Fitness or external gym client',
    naturalLanguagePatterns: ['add {name} from move fitness', 'add {name} as a move fitness client', 'create external client'],
    method: 'POST', endpoint: '/api/admin/clients/create-external',
    inputSchema: z.object({
      firstName: z.string().min(1).max(50),
      lastName: z.string().min(1).max(50),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      clientSource: ExternalClientSourceSchema.default('move_fitness'),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'A',
  },
  {
    type: 'view_client_profile',
    description: 'Show a client\'s full profile',
    naturalLanguagePatterns: ['show me {client}\'s profile', 'pull up {client}', 'view client {client}'],
    method: 'GET', endpoint: '/api/admin/clients/:clientId',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'A',
  },
  {
    type: 'update_client',
    description: 'Update a client\'s profile information',
    naturalLanguagePatterns: ['change {client}\'s phone', 'edit {client}\'s profile', 'update {client}\'s training notes'],
    method: 'PUT', endpoint: '/api/admin/clients/:clientId',
    inputSchema: UpdateClientSchema,
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'A',
  },
  {
    type: 'deactivate_client',
    description: 'Deactivate a client\'s account (soft delete)',
    naturalLanguagePatterns: ['deactivate {client}', 'disable {client}\'s account', 'remove {client}'],
    method: 'DELETE', endpoint: '/api/admin/clients/:clientId',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      softDelete: z.literal(true).default(true),
    }),
    destructive: true, requiresConfirmation: true,
    roleRequired: ['admin'],
    requiresClientRef: true, category: 'A',
  },
  {
    type: 'lock_client',
    description: 'Lock a client\'s account',
    naturalLanguagePatterns: ['lock {client}\'s account', 'suspend {client}'],
    method: 'PUT', endpoint: '/api/admin/clients/:clientId',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      isLocked: z.literal(true).default(true),
      locked: z.literal(true).optional(),
    }).transform(({ clientId, isLocked }) => ({ clientId, isLocked })),
    destructive: true, requiresConfirmation: true,
    roleRequired: ['admin'],
    requiresClientRef: true, category: 'A',
  },
  {
    type: 'assign_trainer',
    description: 'Assign a trainer to a client',
    naturalLanguagePatterns: ['assign {trainer} to {client}', 'set {client}\'s trainer to {trainer}'],
    method: 'POST', endpoint: '/api/assignments',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      trainerId: z.number().int().positive(),
      notes: z.string().trim().max(500).default('Assigned via Swan Coach command center'),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin'],
    requiresClientRef: true, category: 'A',
  },
  {
    type: 'reset_client_password',
    description: 'Send a secure password reset email to a client',
    naturalLanguagePatterns: ['reset {client}\'s password', 'send password reset to {client}'],
    method: 'POST', endpoint: '/api/admin/clients/:clientId/send-password-reset',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin'],
    requiresClientRef: true, category: 'A',
  },
  {
    type: 'upload_client_photo',
    description: 'Upload a photo for a client',
    naturalLanguagePatterns: ['upload a photo for {client}', 'add photo for {client}'],
    method: 'POST', endpoint: '/api/admin/clients/:clientId/upload-photo',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'A',
  },
  {
    type: 'list_active_clients',
    description: 'Show all active clients',
    naturalLanguagePatterns: ['show me all active clients', 'list clients', 'who are my clients'],
    method: 'GET', endpoint: '/api/admin/clients',
    inputSchema: PaginationSchema.extend({ status: z.enum(['active', 'inactive', 'all']).default('active') }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'A',
  },
  {
    type: 'at_risk_clients',
    description: 'Show at-risk clients who need attention',
    naturalLanguagePatterns: ['who are my at-risk clients', 'show at-risk clients', 'clients needing attention'],
    method: 'GET', endpoint: '/api/admin/compliance/at-risk',
    inputSchema: z.object({}).optional(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'A',
  },
  {
    type: 'client_billing_overview',
    description: 'Show a client\'s billing overview',
    naturalLanguagePatterns: ['show {client}\'s billing', '{client}\'s payment history', 'billing for {client}'],
    method: 'GET', endpoint: '/api/admin/clients/:clientId/billing-overview',
    inputSchema: z.object({ clientId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: true, category: 'A',
  },
  {
    type: 'notify_client',
    description: 'Send a notification to a client',
    naturalLanguagePatterns: ['notify {client} about {message}', 'send {client} a message'],
    method: 'POST', endpoint: '/api/admin/clients/:clientId/notify',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      title: z.string().min(1).max(100).default('Coach update'),
      message: z.string().min(1).max(500),
      type: z.enum(['admin', 'system', 'session', 'achievement', 'reminder']).default('admin'),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'A',
  },
  {
    type: 'export_client_list',
    description: 'Export all clients as a list',
    naturalLanguagePatterns: ['export client list', 'download clients', 'export all clients'],
    method: 'GET', endpoint: '/api/admin/clients/export',
    inputSchema: z.object({
      format: z.enum(['json', 'csv']).default('csv'),
      status: z.enum(['active', 'inactive']).optional(),
      clientSource: ClientSourceSchema.optional(),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'A',
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
