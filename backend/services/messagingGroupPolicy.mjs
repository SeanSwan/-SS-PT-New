/**
 * FILE: messagingGroupPolicy.mjs
 * PURPOSE: Pure group-chat policy helpers for /api/messaging.
 *
 * These helpers keep role decisions testable outside Express/Sequelize so group
 * admin behavior stays consistent across controller branches and future socket
 * handlers.
 */

export const GROUP_ROLES = Object.freeze({
  owner: 'owner',
  admin: 'admin',
  member: 'member',
});

const VALID_ROLES = new Set(Object.values(GROUP_ROLES));

export function toStrictPositiveInt(value) {
  if (typeof value === 'number') return Number.isInteger(value) && value > 0 ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function normalizeGroupRole(value) {
  const role = String(value || '').trim().toLowerCase();
  return VALID_ROLES.has(role) ? role : GROUP_ROLES.member;
}

export function normalizeGroupName(value) {
  const name = String(value || '').replace(/\s+/g, ' ').trim();
  return (name || 'Swan Family').slice(0, 80);
}

export function normalizeUserIds(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(toStrictPositiveInt).filter(Boolean))];
}

export function normalizeParticipantIds(participantIds, creatorId) {
  const normalizedCreatorId = toStrictPositiveInt(creatorId);
  return [...new Set([normalizedCreatorId, ...normalizeUserIds(participantIds)])].filter(Boolean);
}

export function normalizeAdminIds(adminIds, participantIds, creatorId) {
  const allowed = new Set(normalizeUserIds(participantIds));
  allowed.delete(Number(creatorId));
  return normalizeUserIds(adminIds).filter((id) => allowed.has(id));
}

export function participantRoleForInsert(userId, creatorId, adminIds = []) {
  if (Number(userId) === Number(creatorId)) return GROUP_ROLES.owner;
  return normalizeUserIds(adminIds).includes(Number(userId))
    ? GROUP_ROLES.admin
    : GROUP_ROLES.member;
}

export function canManageGroup(role) {
  const normalized = normalizeGroupRole(role);
  return normalized === GROUP_ROLES.owner || normalized === GROUP_ROLES.admin;
}

export function canManageParticipantRole(role) {
  return normalizeGroupRole(role) === GROUP_ROLES.owner;
}

export function canRemoveParticipant({ actorRole, targetRole, sameUser }) {
  const actor = normalizeGroupRole(actorRole);
  const target = normalizeGroupRole(targetRole);

  if (target === GROUP_ROLES.owner) return false;
  if (sameUser) return true;
  if (actor === GROUP_ROLES.owner) return true;
  return actor === GROUP_ROLES.admin && target === GROUP_ROLES.member;
}
