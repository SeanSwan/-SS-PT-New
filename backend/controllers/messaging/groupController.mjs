/**
 * FILE: groupController.mjs
 * PURPOSE: Group rename, membership, and role-management handlers.
 */

import { validationResult } from 'express-validator';
import {
  canManageGroup,
  canManageParticipantRole,
  canRemoveParticipant,
  normalizeAdminIds,
  normalizeGroupName,
  normalizeGroupRole,
  normalizeUserIds,
} from '../../services/messagingGroupPolicy.mjs';
import {
  ensureMessagingTables,
  fetchActiveUserIds,
  getActiveParticipant,
  getConversationForViewer,
  getConversationMembership,
  renameConversation,
  sequelize,
  softDeleteParticipant,
  touchConversation,
  updateParticipantRoleRecord,
  upsertConversationParticipant,
} from '../../services/messagingRepository.mjs';
import { assertCanMessageUsers, MESSAGING_POLICY_DENIED_MESSAGE } from '../../services/messagingPolicyService.mjs';
import { recordMessagingAdminOverrideAudit } from '../../services/messagingAdminOverrideAuditService.mjs';

const UPDATE_CONVERSATION_FAILED_MESSAGE = 'Failed to update conversation.';
const ADD_PARTICIPANTS_FAILED_MESSAGE = 'Failed to add participants.';
const UPDATE_PARTICIPANT_FAILED_MESSAGE = 'Failed to update participant.';
const REMOVE_PARTICIPANT_FAILED_MESSAGE = 'Failed to remove participant.';
const CONVERSATION_NOT_FOUND_MESSAGE = 'Conversation not found.';
const GROUP_REQUIRED_MESSAGE = 'This action is only available for group conversations.';
const GROUP_MANAGER_REQUIRED_MESSAGE = 'Group admin access is required.';
const OWNER_REQUIRED_MESSAGE = 'Group owner access is required.';
const INVALID_PARTICIPANTS_MESSAGE = 'One or more participants are not available.';

const requestHasValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ error: errors.array()[0]?.msg || 'Invalid messaging request.' });
  return true;
};

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

async function assertActiveParticipants(userIds) {
  const activeIds = await fetchActiveUserIds(userIds);
  const activeSet = new Set(activeIds);
  return userIds.every((id) => activeSet.has(Number(id)));
}

async function requireGroupManager(conversationId, userId) {
  const membership = await getConversationMembership(conversationId, userId);
  if (!membership) return { status: 404, error: CONVERSATION_NOT_FOUND_MESSAGE };
  if (membership.type !== 'group') return { status: 400, error: GROUP_REQUIRED_MESSAGE };
  if (!canManageGroup(membership.viewerRole)) return { status: 403, error: GROUP_MANAGER_REQUIRED_MESSAGE };
  return { membership };
}

export const updateConversation = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;

  const conversationId = toPositiveInt(req.params.id);
  const userId = req.user?.id;
  if (!conversationId || !userId) return res.status(400).json({ error: 'Valid conversation ID is required.' });

  try {
    await ensureMessagingTables();
    const manager = await requireGroupManager(conversationId, userId);
    if (manager.error) return res.status(manager.status).json({ error: manager.error });

    await renameConversation(conversationId, normalizeGroupName(req.body.name));
    const conversation = await getConversationForViewer(conversationId, userId);
    return res.json(conversation);
  } catch (error) {
    console.error('Error updating conversation:', error);
    return res.status(500).json({ error: UPDATE_CONVERSATION_FAILED_MESSAGE });
  }
};

export const addConversationParticipants = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;

  const conversationId = toPositiveInt(req.params.id);
  const userId = req.user?.id;
  const participantIds = normalizeUserIds(req.body.participantIds);
  if (!conversationId || !userId) return res.status(400).json({ error: 'Valid conversation ID is required.' });
  if (participantIds.length === 0) return res.status(400).json({ error: 'At least one participant is required.' });

  try {
    await ensureMessagingTables();
    const manager = await requireGroupManager(conversationId, userId);
    if (manager.error) return res.status(manager.status).json({ error: manager.error });
    if (!(await assertActiveParticipants(participantIds))) {
      return res.status(400).json({ error: INVALID_PARTICIPANTS_MESSAGE });
    }

    const policy = await assertCanMessageUsers({ actorId: userId, targetUserIds: participantIds });
    if (!policy.allowed) return res.status(403).json({ error: MESSAGING_POLICY_DENIED_MESSAGE });

    const adminIds = canManageParticipantRole(manager.membership.viewerRole)
      ? normalizeAdminIds(req.body.adminIds, participantIds, userId)
      : [];
    const trx = await sequelize.transaction();

    try {
      for (const participantId of participantIds) {
        const role = adminIds.includes(Number(participantId)) ? 'admin' : 'member';
        await upsertConversationParticipant({ conversationId, userId: participantId, role, transaction: trx });
      }
      await touchConversation(conversationId, trx);
      await trx.commit();
      await recordMessagingAdminOverrideAudit({
        actorId: userId,
        targetUserIds: policy.adminOverrideUserIds,
        conversationId,
        action: 'conversation.participants_added',
      });
    } catch (insertError) {
      await trx.rollback();
      throw insertError;
    }

    const conversation = await getConversationForViewer(conversationId, userId);
    return res.status(200).json(conversation);
  } catch (error) {
    console.error('Error adding conversation participants:', error);
    return res.status(500).json({ error: ADD_PARTICIPANTS_FAILED_MESSAGE });
  }
};

export const updateParticipantRole = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;

  const conversationId = toPositiveInt(req.params.id);
  const actorId = req.user?.id;
  const targetUserId = toPositiveInt(req.params.userId);
  const role = normalizeGroupRole(req.body.role);
  if (!conversationId || !actorId || !targetUserId) {
    return res.status(400).json({ error: 'Valid conversation and participant IDs are required.' });
  }

  try {
    await ensureMessagingTables();
    const manager = await requireGroupManager(conversationId, actorId);
    if (manager.error) return res.status(manager.status).json({ error: manager.error });
    if (!canManageParticipantRole(manager.membership.viewerRole)) return res.status(403).json({ error: OWNER_REQUIRED_MESSAGE });

    const target = await getActiveParticipant(conversationId, targetUserId);
    if (!target) return res.status(404).json({ error: 'Participant not found.' });
    if (normalizeGroupRole(target.role) === 'owner') return res.status(400).json({ error: 'Group owners cannot be changed here.' });

    await updateParticipantRoleRecord({ conversationId, userId: targetUserId, role });
    await touchConversation(conversationId);
    const conversation = await getConversationForViewer(conversationId, actorId);
    return res.json(conversation);
  } catch (error) {
    console.error('Error updating conversation participant:', error);
    return res.status(500).json({ error: UPDATE_PARTICIPANT_FAILED_MESSAGE });
  }
};

export const removeConversationParticipant = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;

  const conversationId = toPositiveInt(req.params.id);
  const actorId = req.user?.id;
  const targetUserId = toPositiveInt(req.params.userId);
  if (!conversationId || !actorId || !targetUserId) {
    return res.status(400).json({ error: 'Valid conversation and participant IDs are required.' });
  }

  try {
    await ensureMessagingTables();
    const actor = await getConversationMembership(conversationId, actorId);
    if (!actor) return res.status(404).json({ error: CONVERSATION_NOT_FOUND_MESSAGE });
    if (actor.type !== 'group') return res.status(400).json({ error: GROUP_REQUIRED_MESSAGE });

    const target = await getActiveParticipant(conversationId, targetUserId);
    if (!target) return res.status(404).json({ error: 'Participant not found.' });

    const sameUser = Number(actorId) === Number(targetUserId);
    if (!canRemoveParticipant({ actorRole: actor.viewerRole, targetRole: target.role, sameUser })) {
      return res.status(403).json({ error: GROUP_MANAGER_REQUIRED_MESSAGE });
    }

    await softDeleteParticipant(conversationId, targetUserId);
    await touchConversation(conversationId);
    if (sameUser) return res.json({ success: true, message: 'You left the group.' });

    const conversation = await getConversationForViewer(conversationId, actorId);
    return res.json(conversation);
  } catch (error) {
    console.error('Error removing conversation participant:', error);
    return res.status(500).json({ error: REMOVE_PARTICIPANT_FAILED_MESSAGE });
  }
};
