/**
 * groupAccessService — access-rule truth table
 * ============================================
 * Locks the privacy/membership rules for community groups:
 * public = browsable content, private = active members only,
 * admins bypass VIEW gates but never the posting gate.
 */
import { describe, it, expect } from 'vitest';
import {
  canModerateGroup,
  canPostInGroup,
  canViewGroupContent,
  isActiveMember,
  isGroupOwner,
} from '../../services/social/groupAccessService.mjs';

const publicGroup = { privacy: 'public', isArchived: false };
const privateGroup = { privacy: 'private', isArchived: false };
const archivedGroup = { privacy: 'public', isArchived: true };

const member = { role: 'member', status: 'active' };
const moderator = { role: 'moderator', status: 'active' };
const owner = { role: 'owner', status: 'active' };
const pending = { role: 'member', status: 'pending' };
const banned = { role: 'member', status: 'banned' };

const user = { id: 10, role: 'user' };
const admin = { id: 1, role: 'admin' };

describe('isActiveMember', () => {
  it('only active status counts', () => {
    expect(isActiveMember(member)).toBe(true);
    expect(isActiveMember(pending)).toBe(false);
    expect(isActiveMember(banned)).toBe(false);
    expect(isActiveMember(null)).toBe(false);
  });
});

describe('canViewGroupContent', () => {
  it('public group: any authed user, even non-members', () => {
    expect(canViewGroupContent(publicGroup, null, user)).toBe(true);
  });
  it('private group: non-members and pending are blocked', () => {
    expect(canViewGroupContent(privateGroup, null, user)).toBe(false);
    expect(canViewGroupContent(privateGroup, pending, user)).toBe(false);
    expect(canViewGroupContent(privateGroup, banned, user)).toBe(false);
  });
  it('private group: active members see content', () => {
    expect(canViewGroupContent(privateGroup, member, user)).toBe(true);
  });
  it('admins bypass the private gate (moderation duty)', () => {
    expect(canViewGroupContent(privateGroup, null, admin)).toBe(true);
  });
  it('archived groups hide content from everyone, including admins', () => {
    expect(canViewGroupContent(archivedGroup, owner, user)).toBe(false);
    expect(canViewGroupContent(archivedGroup, null, admin)).toBe(false);
  });
});

describe('canPostInGroup', () => {
  it('requires ACTIVE membership — no membership means no posting', () => {
    expect(canPostInGroup(publicGroup, null)).toBe(false);
    expect(canPostInGroup(publicGroup, pending)).toBe(false);
    expect(canPostInGroup(publicGroup, banned)).toBe(false);
    expect(canPostInGroup(publicGroup, member)).toBe(true);
  });
  it('archived groups accept no posts', () => {
    expect(canPostInGroup(archivedGroup, owner)).toBe(false);
  });
});

describe('canModerateGroup / isGroupOwner', () => {
  it('moderator and owner can moderate; member cannot', () => {
    expect(canModerateGroup(member, user)).toBe(false);
    expect(canModerateGroup(moderator, user)).toBe(true);
    expect(canModerateGroup(owner, user)).toBe(true);
  });
  it('pending/banned moderators have no power', () => {
    expect(canModerateGroup({ role: 'moderator', status: 'pending' }, user)).toBe(false);
    expect(canModerateGroup({ role: 'moderator', status: 'banned' }, user)).toBe(false);
  });
  it('platform admins can moderate and act as owner', () => {
    expect(canModerateGroup(null, admin)).toBe(true);
    expect(isGroupOwner(null, admin)).toBe(true);
  });
  it('only the owner role is owner', () => {
    expect(isGroupOwner(moderator, user)).toBe(false);
    expect(isGroupOwner(owner, user)).toBe(true);
  });
});
