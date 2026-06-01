/**
 * Command Registry — Category F: Social & Content Moderation (6 commands)
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const positiveInt = z.coerce.number().int().positive();

const commands = [
  {
    type: 'view_moderation_queue',
    description: 'Show posts pending review',
    naturalLanguagePatterns: ['show me posts pending review', 'moderation queue', 'what needs moderation'],
    method: 'GET', endpoint: '/api/admin/content/queue',
    inputSchema: z.object({
      status: z.enum(['pending', 'flagged', 'all']).default('pending'),
      limit: z.coerce.number().int().min(1).max(25).default(10),
    }).optional(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'F',
  },
  {
    type: 'approve_post',
    description: 'Approve a post',
    naturalLanguagePatterns: ['approve post {id}', 'approve that post', 'mark post {id} as approved'],
    method: 'POST', endpoint: '/api/admin/content/moderate',
    inputSchema: z.object({
      postId: positiveInt,
      action: z.literal('approve').default('approve'),
      notifyUser: z.boolean().default(false),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'F',
  },
  {
    type: 'reject_post',
    description: 'Reject a post for a given reason',
    naturalLanguagePatterns: ['reject post {id}', 'reject post {id} for {reason}'],
    method: 'POST', endpoint: '/api/admin/content/moderate',
    inputSchema: z.object({
      postId: positiveInt,
      action: z.literal('reject').default('reject'),
      reason: z.string().min(1).max(500),
      notifyUser: z.boolean().default(false),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'F',
  },
  {
    type: 'block_user_posting',
    description: 'Block a user from posting',
    naturalLanguagePatterns: ['block {user} from posting', 'ban {user} from social'],
    method: 'PUT', endpoint: '/api/admin/content/posts/:postId',
    inputSchema: z.object({
      userId: z.number().int().positive(),
      blocked: z.literal(true),
    }),
    destructive: true, requiresConfirmation: true,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'F',
  },
  {
    type: 'view_moderation_stats',
    description: 'Show content moderation statistics',
    naturalLanguagePatterns: ['show moderation stats', 'moderation statistics', 'content stats'],
    method: 'GET', endpoint: '/api/admin/content/stats',
    inputSchema: z.object({}).optional(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'F',
  },
  {
    type: 'delete_post',
    description: 'Delete a social media post',
    naturalLanguagePatterns: ['delete post {id}', 'remove post {id}'],
    method: 'DELETE', endpoint: '/api/admin/content/posts/:postId',
    inputSchema: z.object({
      postId: positiveInt,
      reason: z.string().min(1).max(500).optional(),
      notifyUser: z.boolean().default(false),
    }),
    destructive: true, requiresConfirmation: true,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'F',
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
