/**
 * FILE: conversationController.mjs
 * PURPOSE: Conversation list, creation, and self-hide/leave handlers.
 */

import { validationResult } from 'express-validator';
import {
  normalizeAdminIds,
  normalizeGroupName,
  normalizeGroupRole,
  normalizeParticipantIds,
  participantRoleForInsert,
} from '../../services/messagingGroupPolicy.mjs';
import {
  createConversationRecord,
  ensureAdminConversation,
  ensureMessagingTables,
  fetchActiveUserIds,
  findDirectConversation,
  getConversationForViewer,
  getConversationMembership,
  getConversationsForViewer,
  reviveParticipant,
  sequelize,
  softDeleteParticipant,
  touchConversation,
  upsertConversationParticipant,
} from '../../services/messagingRepository.mjs';
import { assertCanMessageUsers, MESSAGING_POLICY_DENIED_MESSAGE } from '../../services/messagingPolicyService.mjs';
import { recordMessagingAdminOverrideAudit } from '../../services/messagingAdminOverrideAuditService.mjs';

const CREATE_CONVERSATION_FAILED_MESSAGE = 'Failed to create conversation.';
const FETCH_CONVERSATIONS_FAILED_MESSAGE = 'Failed to fetch conversations.';
const CONVERSATION_NOT_FOUND_MESSAGE = 'Conversation not found.';
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

export const getConversations = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  try {
    await ensureMessagingTables();
    await ensureAdminConversation(userId);
    const conversations = await getConversationsForViewer(userId);
    return res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: FETCH_CONVERSATIONS_FAILED_MESSAGE });
  }
};

export const createConversation = async (req, res) => {
  if (requestHasValidationErrors(req, res)) return undefined;

  const creatorId = req.user?.id;
  if (!creatorId) return res.status(401).json({ error: 'Authentication required.' });

  const allParticipantIds = normalizeParticipantIds(req.body.participantIds, creatorId);
  const otherParticipantIds = allParticipantIds.filter((id) => Number(id) !== Number(creatorId));
  const requestedType = req.body.type === 'group' || otherParticipantIds.length > 1 ? 'group' : 'direct';

  if (otherParticipantIds.length === 0) {
    return res.status(400).json({ error: 'At least one other participant is required.' });
  }

  try {
    await ensureMessagingTables();
    if (!(await assertActiveParticipants(allParticipantIds))) {
      return res.status(400).json({ error: INVALID_PARTICIPANTS_MESSAGE });
    }

    const policy = await assertCanMessageUsers({ actorId: creatorId, targetUserIds: otherParticipantIds });
    if (!policy.allowed) return res.status(403).json({ error: MESSAGING_POLICY_DENIED_MESSAGE });

    if (requestedType === 'direct' && otherParticipantIds.length === 1) {
      const existing = await findDirectConversation(creatorId, otherParticipantIds[0]);
      if (existing) {
        await reviveParticipant(existing.id, creatorId);
        const existingConversation = await getConversationForViewer(existing.id, creatorId);
        return res.status(200).json(existingConversation);
      }
    }

    const groupAdminIds = requestedType === 'group'
      ? normalizeAdminIds(req.body.adminIds, allParticipantIds, creatorId)
      : [];
    const trx = await sequelize.transaction();

    try {
      const conversation = await createConversationRecord({
        type: requestedType,
        name: requestedType === 'group' ? normalizeGroupName(req.body.name) : null,
        transaction: trx,
      });

      for (const participantId of allParticipantIds) {
        const role = requestedType === 'group'
          ? participantRoleForInsert(participantId, creatorId, groupAdminIds)
          : 'member';
        await upsertConversationParticipant({ conversationId: conversation.id, userId: participantId, role, transaction: trx });
      }

      await trx.commit();
      await recordMessagingAdminOverrideAudit({
        actorId: creatorId,
        targetUserIds: policy.adminOverrideUserIds,
        conversationId: conversation.id,
        action: 'conversation.created',
      });
      const newConversation = await getConversationForViewer(conversation.id, creatorId);
      return res.status(201).json(newConversation);
    } catch (insertError) {
      await trx.rollback();
      throw insertError;
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    return res.status(500).json({ error: CREATE_CONVERSATION_FAILED_MESSAGE });
  }
};

export const deleteConversation = async (req, res) => {
  const conversationId = toPositiveInt(req.params.id);
  const userId = req.user?.id;
  if (!conversationId || !userId) return res.status(400).json({ error: 'Valid conversation ID is required.' });

  try {
    await ensureMessagingTables();
    const membership = await getConversationMembership(conversationId, userId);
    if (!membership) return res.status(404).json({ error: CONVERSATION_NOT_FOUND_MESSAGE });
    if (membership.type === 'group' && normalizeGroupRole(membership.viewerRole) === 'owner') {
      return res.status(400).json({ error: 'Transfer ownership before leaving this group.' });
    }

    await softDeleteParticipant(conversationId, userId);
    await touchConversation(conversationId);
    return res.json({ success: true, message: membership.type === 'group' ? 'You left the group.' : 'Conversation hidden.' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return res.status(500).json({ error: 'Failed to delete conversation.' });
  }
};
