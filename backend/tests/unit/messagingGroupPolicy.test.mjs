import { describe, expect, it } from 'vitest';
import {
  GROUP_ROLES,
  canManageGroup,
  canManageParticipantRole,
  canRemoveParticipant,
  normalizeAdminIds,
  normalizeGroupName,
  normalizeParticipantIds,
  normalizeUserIds,
  participantRoleForInsert,
  toStrictPositiveInt,
} from '../../services/messagingGroupPolicy.mjs';

describe('messaging group policy', () => {
  it('dedupes numeric participants while keeping the creator in the member set', () => {
    expect(normalizeParticipantIds([7, '7', '8', null, 'bad', 0], 5)).toEqual([5, 7, 8]);
  });

  it('rejects boolean, decimal, blank, and malformed IDs instead of coercing them', () => {
    expect(toStrictPositiveInt(true)).toBeNull();
    expect(toStrictPositiveInt('1.5')).toBeNull();
    expect(toStrictPositiveInt('42abc')).toBeNull();
    expect(toStrictPositiveInt('003')).toBeNull();
    expect(toStrictPositiveInt('')).toBeNull();
    expect(normalizeUserIds([true, false, '2', '003', '4.0'])).toEqual([2]);
    expect(normalizeParticipantIds([true, '7'], '5')).toEqual([5, 7]);
  });

  it('names blank group chats as Swan Family and trims long custom names', () => {
    expect(normalizeGroupName('')).toBe('Swan Family');
    expect(normalizeGroupName('  Team Alpha  ')).toBe('Team Alpha');
    expect(normalizeGroupName('x'.repeat(90))).toHaveLength(80);
  });

  it('assigns owner/admin/member roles at creation without letting adminIds override creator ownership', () => {
    const participantIds = [5, 7, 8];
    expect(normalizeAdminIds([5, '7', '999', 'bad'], participantIds, 5)).toEqual([7]);
    expect(participantRoleForInsert(5, 5, [7])).toBe(GROUP_ROLES.owner);
    expect(participantRoleForInsert(7, 5, [7])).toBe(GROUP_ROLES.admin);
    expect(participantRoleForInsert(8, 5, [7])).toBe(GROUP_ROLES.member);
  });

  it('allows owners and admins to manage membership but reserves role changes to owners', () => {
    expect(canManageGroup(GROUP_ROLES.owner)).toBe(true);
    expect(canManageGroup(GROUP_ROLES.admin)).toBe(true);
    expect(canManageGroup(GROUP_ROLES.member)).toBe(false);
    expect(canManageParticipantRole(GROUP_ROLES.owner)).toBe(true);
    expect(canManageParticipantRole(GROUP_ROLES.admin)).toBe(false);
  });

  it('blocks removing owners and requires owner authority for admin removal', () => {
    expect(canRemoveParticipant({ actorRole: GROUP_ROLES.admin, targetRole: GROUP_ROLES.member, sameUser: false })).toBe(true);
    expect(canRemoveParticipant({ actorRole: GROUP_ROLES.admin, targetRole: GROUP_ROLES.admin, sameUser: false })).toBe(false);
    expect(canRemoveParticipant({ actorRole: GROUP_ROLES.owner, targetRole: GROUP_ROLES.admin, sameUser: false })).toBe(true);
    expect(canRemoveParticipant({ actorRole: GROUP_ROLES.owner, targetRole: GROUP_ROLES.owner, sameUser: false })).toBe(false);
    expect(canRemoveParticipant({ actorRole: GROUP_ROLES.member, targetRole: GROUP_ROLES.member, sameUser: true })).toBe(true);
  });
});
