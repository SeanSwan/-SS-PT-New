/**
 * FILE: messagingNotificationRecipientService.mjs
 * PURPOSE: Shared mute-aware recipient selection for message notifications.
 */

import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';

export async function getMessageNotificationRecipients({ conversationId, senderId }) {
  return sequelize.query(
    `SELECT cp.user_id as "userId", u.role
     FROM conversation_participants cp
     JOIN "Users" u ON u.id = cp.user_id
     WHERE cp.conversation_id = :conversationId
       AND cp.user_id != :senderId
       AND cp.deleted_at IS NULL
       AND NOT EXISTS (
         SELECT 1
         FROM conversation_mutes cm
         WHERE cm.conversation_id = cp.conversation_id
           AND cm.user_id = cp.user_id
           AND (cm.muted_until IS NULL OR cm.muted_until > NOW())
       )`,
    { replacements: { conversationId, senderId }, type: QueryTypes.SELECT }
  );
}