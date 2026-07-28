/**
 * FILE: messagingPolicyService.mjs
 * PURPOSE: Role, relationship, and blocking policy for Swan messaging contacts.
 */

import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';

export const MESSAGING_POLICY_DENIED_MESSAGE = 'Messaging is limited to assigned training relationships and staff support.';

const ACTIVE_USER_WHERE = '"deletedAt" IS NULL AND ("isActive" = true OR "isActive" IS NULL)';

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

export function normalizeMessagingRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'trainer') return normalized;
  return 'client';
}

export function canMessageByRole({ actorRole, targetRole, isAssignedPair = false, isMutualConnection = false } = {}) {
  const actor = normalizeMessagingRole(actorRole);
  const target = normalizeMessagingRole(targetRole);

  if (actor === 'admin') return true;
  if (actor === 'trainer') return target === 'admin' || target === 'trainer' || (target === 'client' && isAssignedPair);
  if (target === 'admin') return true;
  if (target === 'trainer') return isAssignedPair;
  return Boolean(isMutualConnection) && target === 'client';
}

export function requiresAdminMessagingOverride({ actorRole, targetRole } = {}) {
  return normalizeMessagingRole(actorRole) === 'admin' && normalizeMessagingRole(targetRole) === 'client';
}

async function fetchPolicyUsers(userIds) {
  const ids = [...new Set(userIds.map(toPositiveInt).filter(Boolean))];
  if (ids.length === 0) return [];
  return sequelize.query(
    `SELECT id, role
     FROM "Users"
     WHERE id IN (:ids)
       AND ${ACTIVE_USER_WHERE}`,
    { replacements: { ids }, type: QueryTypes.SELECT }
  );
}

async function fetchAssignmentPairs(userIds) {
  const ids = [...new Set(userIds.map(toPositiveInt).filter(Boolean))];
  if (ids.length === 0) return [];
  return sequelize.query(
    `SELECT "clientId", "trainerId"
     FROM client_trainer_assignments
     WHERE status = 'active'
       AND ("clientId" IN (:ids) OR "trainerId" IN (:ids))`,
    { replacements: { ids }, type: QueryTypes.SELECT }
  );
}

async function fetchBlockingPairs(userIds) {
  const ids = [...new Set(userIds.map(toPositiveInt).filter(Boolean))];
  if (ids.length === 0) return [];
  return sequelize.query(
    `SELECT blocker_id as "blockerId", blocked_id as "blockedId"
     FROM user_blocks
     WHERE blocker_id IN (:ids)
        OR blocked_id IN (:ids)`,
    { replacements: { ids }, type: QueryTypes.SELECT }
  );
}

const isAssignedPair = (assignments, actorId, targetId) => assignments.some((assignment) => {
  const clientId = Number(assignment.clientId);
  const trainerId = Number(assignment.trainerId);
  return (clientId === Number(actorId) && trainerId === Number(targetId))
    || (trainerId === Number(actorId) && clientId === Number(targetId));
});

const blockedIdsForActor = (blockingPairs, actorId) => {
  const blockedUserIds = new Set();
  blockingPairs.forEach((pair) => {
    if (Number(pair.blockerId) === Number(actorId)) blockedUserIds.add(Number(pair.blockedId));
    if (Number(pair.blockedId) === Number(actorId)) blockedUserIds.add(Number(pair.blockerId));
  });
  return blockedUserIds;
};

export async function assertCanMessageUsers({ actorId, targetUserIds }) {
  const normalizedActorId = toPositiveInt(actorId);
  const targets = [...new Set((targetUserIds || []).map(toPositiveInt).filter(Boolean))]
    .filter((id) => id !== normalizedActorId);
  if (!normalizedActorId) return { allowed: false, deniedUserIds: targets, blockedUserIds: [] };
  if (targets.length === 0) return { allowed: true, deniedUserIds: [], blockedUserIds: [] };

  const users = await fetchPolicyUsers([normalizedActorId, ...targets]);
  const actor = users.find((user) => Number(user.id) === normalizedActorId);
  if (!actor) return { allowed: false, deniedUserIds: targets, blockedUserIds: [] };

  const userById = new Map(users.map((user) => [Number(user.id), user]));
  const assignments = await fetchAssignmentPairs([normalizedActorId, ...targets]);
  const blockedUserIds = blockedIdsForActor(await fetchBlockingPairs([normalizedActorId, ...targets]), normalizedActorId);
  const deniedUserIds = targets.filter((targetId) => {
    const target = userById.get(targetId);
    if (!target || blockedUserIds.has(targetId)) return true;
    return !canMessageByRole({
      actorRole: actor.role,
      targetRole: target.role,
      isAssignedPair: isAssignedPair(assignments, normalizedActorId, targetId),
    });
  });
  const adminOverrideUserIds = targets.filter((targetId) => {
    const target = userById.get(targetId);
    return target
      && !blockedUserIds.has(targetId)
      && requiresAdminMessagingOverride({ actorRole: actor.role, targetRole: target.role });
  });

  return {
    allowed: deniedUserIds.length === 0,
    deniedUserIds,
    blockedUserIds: deniedUserIds.filter((id) => blockedUserIds.has(id)),
    adminOverrideUserIds,
  };
}

export async function assertCanMessageConversation({ actorId, conversationId }) {
  const normalizedConversationId = toPositiveInt(conversationId);
  const normalizedActorId = toPositiveInt(actorId);
  if (!normalizedConversationId || !normalizedActorId) return { allowed: false, deniedUserIds: [], blockedUserIds: [] };

  const participants = await sequelize.query(
    `SELECT user_id as "userId"
     FROM conversation_participants
     WHERE conversation_id = :conversationId
       AND user_id != :actorId
       AND deleted_at IS NULL`,
    { replacements: { conversationId: normalizedConversationId, actorId: normalizedActorId }, type: QueryTypes.SELECT }
  );

  return assertCanMessageUsers({
    actorId: normalizedActorId,
    targetUserIds: participants.map((participant) => participant.userId),
  });
}

export async function getMessagingSearchScope(actorId) {
  const normalizedActorId = toPositiveInt(actorId);
  if (!normalizedActorId) return { unrestricted: false, allowedUserIds: [] };
  const [actor] = await fetchPolicyUsers([normalizedActorId]);
  if (!actor) return { unrestricted: false, allowedUserIds: [] };

  const blockingPairs = await fetchBlockingPairs([normalizedActorId]);
  const blockedUserIds = blockedIdsForActor(blockingPairs, normalizedActorId);
  const actorRole = normalizeMessagingRole(actor.role);
  if (actorRole === 'admin') return { unrestricted: true, allowedUserIds: null, blockedUserIds: [...blockedUserIds] };

  const allowed = new Set();
  const visibleStaffRoles = actorRole === 'trainer' ? ['admin', 'trainer'] : ['admin'];
  const staffRows = await sequelize.query(
    `SELECT id
     FROM "Users"
     WHERE role IN (:roles)
       AND id != :actorId
       AND ${ACTIVE_USER_WHERE}
     LIMIT 100`,
    { replacements: { roles: visibleStaffRoles, actorId: normalizedActorId }, type: QueryTypes.SELECT }
  );
  staffRows.forEach((row) => allowed.add(Number(row.id)));

  const assignments = await fetchAssignmentPairs([normalizedActorId]);
  assignments.forEach((assignment) => {
    if (actorRole === 'trainer' && Number(assignment.trainerId) === normalizedActorId) allowed.add(Number(assignment.clientId));
    if (actorRole === 'client' && Number(assignment.clientId) === normalizedActorId) allowed.add(Number(assignment.trainerId));
  });

  allowed.delete(normalizedActorId);
  blockedUserIds.forEach((id) => allowed.delete(id));
  return { unrestricted: false, allowedUserIds: [...allowed].filter(Boolean), blockedUserIds: [...blockedUserIds] };
}