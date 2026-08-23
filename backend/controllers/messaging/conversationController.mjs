/**
 * FILE: conversationController.mjs
 * PURPOSE: Conversation list, creation, and self-hide/leave handlers.
 */

import { validationResult } from 'express-validator';
import logger from '../../utils/logger.mjs';
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
    let conversations = await getConversationsForViewer(userId);

    // A relationship-only viewer (no community entitlement) sees ONLY threads
    // whose other members are all assigned counterparties. Without this they
    // would keep seeing previews and participant names for legacy community
    // threads they can no longer open -- see requireMessagingAccess, list scope.
    if (req.messagingAccessLane === 'relationship' && req.messagingCounterparties) {
      const allowed = req.messagingCounterparties;
      const viewerId = Number(userId);

      // `participants` is a json_agg column. The driver normally hands it back
      // parsed, but if it ever arrives as a string every id becomes NaN, every
      // thread is filtered, and the inbox silently EMPTIES — for precisely the
      // package-paying clients this lane exists to serve, with no error anywhere.
      // Two post-ship reviewers (ox-alpha, grok) flagged the shape assumption
      // independently. Rather than assume, normalize and make the unparseable
      // case loud instead of silent.
      const readParticipants = (conversation) => {
        const raw = conversation?.participants;
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
          } catch { /* fall through to the loud path */ }
        }
        return null;
      };

      let unreadable = 0;
      conversations = conversations.filter((conversation) => {
        const participants = readParticipants(conversation);
        if (participants === null) {
          unreadable += 1;
          // Cannot prove this is a relationship thread, so it stays hidden —
          // the same direction the gate fails. The count below makes it visible.
          return false;
        }
        const others = participants
          .map((participant) => ({
            id: Number(participant?.id ?? participant?.userId),
            role: participant?.role,
          }))
          .filter((p) => Number.isInteger(p.id) && p.id !== viewerId);

        // Staff count as reachable. ensureAdminConversation creates a direct
        // support thread with the default admin for every viewer; the admin is
        // not a TRAINING counterparty, so narrowing on assignments alone hid
        // that thread from exactly the clients it exists for — the system
        // created a support channel they could never see (GLM 5.3, post-ship
        // panel). This lane exists to hide COMMUNITY threads, not staff.
        return others.length > 0 && others.every(
          (p) => allowed.has(p.id) || p.role === 'admin' || p.role === 'trainer',
        );
      });

      if (unreadable > 0) {
        logger.error(
          '[messaging] conversation participants column was unreadable; those threads '
          + 'were hidden from a relationship-lane viewer. Check the json_agg shape.',
          { unreadable, viewerId },
        );
      }
    }
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
