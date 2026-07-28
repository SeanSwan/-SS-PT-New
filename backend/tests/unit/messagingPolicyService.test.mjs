import { describe, expect, it } from 'vitest';
import { canMessageByRole, normalizeMessagingRole, requiresAdminMessagingOverride } from '../../services/messagingPolicyService.mjs';

describe('messagingPolicyService role rules', () => {
  it('normalizes regular users into the client communication lane', () => {
    expect(normalizeMessagingRole('user')).toBe('client');
    expect(normalizeMessagingRole('CLIENT')).toBe('client');
    expect(normalizeMessagingRole('trainer')).toBe('trainer');
  });

  it('allows admins to message any active role', () => {
    expect(canMessageByRole({ actorRole: 'admin', targetRole: 'client' })).toBe(true);
    expect(canMessageByRole({ actorRole: 'admin', targetRole: 'trainer' })).toBe(true);
    expect(canMessageByRole({ actorRole: 'admin', targetRole: 'user' })).toBe(true);
  });

  it('allows trainers to message staff and assigned clients only', () => {
    expect(canMessageByRole({ actorRole: 'trainer', targetRole: 'admin' })).toBe(true);
    expect(canMessageByRole({ actorRole: 'trainer', targetRole: 'trainer' })).toBe(true);
    expect(canMessageByRole({ actorRole: 'trainer', targetRole: 'client', isAssignedPair: true })).toBe(true);
    expect(canMessageByRole({ actorRole: 'trainer', targetRole: 'client', isAssignedPair: false })).toBe(false);
  });

  it('allows clients to message admins and assigned trainers, not arbitrary peers', () => {
    expect(canMessageByRole({ actorRole: 'client', targetRole: 'admin' })).toBe(true);
    expect(canMessageByRole({ actorRole: 'client', targetRole: 'trainer', isAssignedPair: true })).toBe(true);
    expect(canMessageByRole({ actorRole: 'client', targetRole: 'trainer', isAssignedPair: false })).toBe(false);
    expect(canMessageByRole({ actorRole: 'client', targetRole: 'client', isAssignedPair: true })).toBe(false);
  });

  it('marks only admin-to-client contact as a messaging override candidate', () => {
    expect(requiresAdminMessagingOverride({ actorRole: 'admin', targetRole: 'client' })).toBe(true);
    expect(requiresAdminMessagingOverride({ actorRole: 'admin', targetRole: 'user' })).toBe(true);
    expect(requiresAdminMessagingOverride({ actorRole: 'admin', targetRole: 'trainer' })).toBe(false);
    expect(requiresAdminMessagingOverride({ actorRole: 'trainer', targetRole: 'client' })).toBe(false);
  });
});