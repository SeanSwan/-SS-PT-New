/**
 * ============================================================================
 * FILE: groupChatLinkService.mjs
 * PURPOSE: Best-effort bridge between community groups (SocialGroups) and
 *          the messaging stack — every group gets a linked chat conversation.
 * AUTHOR: Claude Fable 5 | LAST MODIFIED: 2026-07-14
 * ============================================================================
 *
 * CONTRACT: every function here may throw (messaging tables are created
 * lazily and live on the raw-SQL stack). Callers treat chat linkage as
 * best-effort: a messaging failure must never break a group operation.
 */

import {
  createConversationRecord,
  ensureMessagingTables,
  reviveParticipant,
  softDeleteParticipant,
  upsertConversationParticipant,
} from '../messagingRepository.mjs';

/** Create the group's chat conversation with the owner inside. Returns id. */
export async function ensureGroupConversation(group, ownerUserId) {
  await ensureMessagingTables();
  const conversation = await createConversationRecord({
    type: 'group',
    name: group.name,
    transaction: null,
  });
  await upsertConversationParticipant({
    conversationId: conversation.id,
    userId: ownerUserId,
    role: 'owner',
    transaction: null,
  });
  return conversation.id;
}

/** Add (or re-activate) a member in the group's chat. */
export async function addUserToGroupChat(conversationId, userId) {
  await ensureMessagingTables();
  await upsertConversationParticipant({ conversationId, userId, role: 'member', transaction: null });
  await reviveParticipant(conversationId, userId);
}

/** Soft-remove a member from the group's chat. */
export async function removeUserFromGroupChat(conversationId, userId) {
  await ensureMessagingTables();
  await softDeleteParticipant(conversationId, userId);
}
