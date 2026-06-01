/**
 * Social moderation command registry contracts
 * ============================================
 * Locks Swan Coach moderation commands to mounted admin-content routes and
 * keeps destructive / ambiguous commands gated.
 */
import { describe, expect, it } from 'vitest';
import socialCommands from '../../services/ai/commandRegistry/socialCommands.mjs';

const byType = (type) => socialCommands.find((command) => command.type === type);

describe('social moderation command registry contracts', () => {
  it('targets mounted admin content moderation routes', () => {
    expect(byType('view_moderation_queue')).toMatchObject({
      method: 'GET',
      endpoint: '/api/admin/content/queue',
      destructive: false,
      requiresConfirmation: false,
    });
    expect(byType('view_moderation_stats')).toMatchObject({
      method: 'GET',
      endpoint: '/api/admin/content/stats',
      destructive: false,
      requiresConfirmation: false,
    });
    expect(byType('approve_post')).toMatchObject({
      method: 'POST',
      endpoint: '/api/admin/content/moderate',
      destructive: false,
      requiresConfirmation: true,
    });
    expect(byType('reject_post')).toMatchObject({
      method: 'POST',
      endpoint: '/api/admin/content/moderate',
      destructive: false,
      requiresConfirmation: true,
    });
    expect(byType('delete_post')).toMatchObject({
      method: 'DELETE',
      endpoint: '/api/admin/content/posts/:postId',
      destructive: true,
      requiresConfirmation: true,
    });
  });

  it('accepts voice-friendly post ids and fills command-owned action defaults', () => {
    expect(byType('view_moderation_queue').inputSchema.parse({
      status: 'pending',
      limit: '3',
    })).toEqual({
      status: 'pending',
      limit: 3,
    });
    expect(byType('approve_post').inputSchema.parse({
      postId: '42',
    })).toEqual({
      postId: 42,
      action: 'approve',
      notifyUser: false,
    });
    expect(byType('reject_post').inputSchema.parse({
      postId: '42',
      reason: 'policy violation',
    })).toEqual({
      postId: 42,
      action: 'reject',
      reason: 'policy violation',
      notifyUser: false,
    });
    expect(byType('delete_post').inputSchema.parse({
      postId: '42',
      reason: 'duplicate',
    })).toEqual({
      postId: 42,
      reason: 'duplicate',
      notifyUser: false,
    });
  });

  it('keeps block-user posting gated while route ownership is ambiguous', () => {
    expect(byType('block_user_posting')).toMatchObject({
      destructive: true,
      requiresConfirmation: true,
      roleRequired: ['admin'],
    });
  });
});
