/**
 * ============================================================================
 * FILE: blockGuard.mjs
 * PURPOSE: Stop a blocked user from messaging the person who blocked them.
 * AUTHOR:  Claude (Opus 5) | CREATED: 2026-07-27 (launch audit)
 * ============================================================================
 *
 * THE DEFECT THIS CLOSES
 * `POST /api/social/friendships/block/:userId` sets Friendship.status =
 * 'blocked' (routes/social/friendships.mjs:337). Nothing on the messaging side
 * ever read that status:
 *   - REST  controllers/messaging/messageController.mjs sendMessage — checked
 *           conversation membership only
 *   - SOCKET socket/socket.mjs 'send_message'                    — same
 * So if two users already shared a conversation, blocking changed nothing: the
 * blocked party kept messaging. On a platform serving minors that is the
 * week-one incident shape, and "Block" was a button that lied (rule 75).
 *
 * SCOPE (deliberately narrow)
 * Enforced for DIRECT conversations — exactly two active participants. Group
 * conversations are governed by group membership/moderation, and silently
 * dropping a group message because one member blocked one other member would
 * be surprising and hard to explain. Direct messaging is where "Block" carries
 * its plain-language promise.
 *
 * DIRECTION
 * Blocking is symmetric here: if EITHER user blocked the other, neither may
 * send. A blocker who could still message the person they blocked is a
 * harassment vector, so the check is not "am I blocked" but "does a block
 * exist between us".
 *
 * FAILURE POSTURE — deliberately FAIL-OPEN, unlike most guards in this repo.
 * A DB hiccup must not take messaging down for every user. The blast radius of
 * failing open is one blocked message slipping through during an outage; the
 * blast radius of failing closed is total messaging failure for everyone. The
 * failure is logged loudly so it is visible.
 * ============================================================================
 */

import { getModel } from '../../models/index.mjs';
import sequelize from '../../database.mjs';
import { Op } from 'sequelize';
import logger from '../../utils/logger.mjs';

/**
 * Active participants of a conversation, excluding soft-deleted rows.
 * Raw query because conversation_participants is a snake_case join table with
 * no Sequelize model in this codebase.
 */
async function getActiveParticipantIds(conversationId) {
  const [rows] = await sequelize.query(
    `SELECT user_id
       FROM conversation_participants
      WHERE conversation_id = :conversationId
        AND deleted_at IS NULL`,
    { replacements: { conversationId } }
  );
  return (rows || []).map((r) => Number(r.user_id)).filter(Number.isInteger);
}

/**
 * Is there a block in EITHER direction between two users?
 * @returns {Promise<boolean>}
 */
export async function isBlockedBetween(userA, userB) {
  const a = Number(userA);
  const b = Number(userB);
  // Must be POSITIVE integers. Number(null) === 0 passes Number.isInteger, so a
  // null id would otherwise reach the query as user 0 (found by hostile review).
  if (!Number.isInteger(a) || a <= 0) return false;
  if (!Number.isInteger(b) || b <= 0) return false;
  if (a === b) return false;

  const Friendship = getModel('Friendship');
  const row = await Friendship.findOne({
    where: {
      status: 'blocked',
      [Op.or]: [
        { requesterId: a, recipientId: b },
        { requesterId: b, recipientId: a },
      ],
    },
    attributes: ['id'],
  });
  return !!row;
}

/**
 * May `senderId` send into `conversationId`?
 * Only constrains DIRECT (2-participant) conversations.
 *
 * @returns {Promise<{allowed: boolean, reason?: string}>}
 */
export async function canSendToConversation(conversationId, senderId) {
  const convId = Number(conversationId);
  const sender = Number(senderId);
  if (!Number.isInteger(convId) || !Number.isInteger(sender)) {
    return { allowed: true }; // shape problems are the caller's existing validation job
  }

  try {
    const participants = await getActiveParticipantIds(convId);

    // Group conversation (or degenerate data) — governed elsewhere.
    if (participants.length !== 2) return { allowed: true };

    const other = participants.find((id) => id !== sender);
    if (other === undefined) return { allowed: true };

    if (await isBlockedBetween(sender, other)) {
      return { allowed: false, reason: 'blocked' };
    }
    return { allowed: true };
  } catch (error) {
    // FAIL-OPEN on purpose — see header.
    logger.error('[messaging] block check failed — allowing send (fail-open)', {
      conversationId: convId,
      senderId: sender,
      error: error?.message,
    });
    return { allowed: true, reason: 'check_failed' };
  }
}

export const BLOCKED_MESSAGE = 'You can no longer send messages in this conversation.';

export default canSendToConversation;
