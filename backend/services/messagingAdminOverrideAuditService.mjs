/**
 * FILE: messagingAdminOverrideAuditService.mjs
 * PURPOSE: Fail-soft audit logging for admin messaging policy overrides.
 */

import logger from '../utils/logger.mjs';
import { recordCommunicationAudit } from './communications/communicationAuditLogService.mjs';

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

const cleanAction = (value) => {
  const text = String(value || '').trim().toLowerCase();
  return text || 'messaging.override';
};

export async function recordMessagingAdminOverrideAudit({ actorId, targetUserIds, conversationId, action } = {}) {
  const normalizedActorId = toPositiveInt(actorId);
  const normalizedConversationId = toPositiveInt(conversationId);
  const overrideAction = cleanAction(action);
  const targets = [...new Set((targetUserIds || []).map(toPositiveInt).filter(Boolean))]
    .filter((targetId) => targetId !== normalizedActorId);

  if (!normalizedActorId || targets.length === 0) return { success: true, attempted: 0, recorded: 0 };

  let recorded = 0;
  for (const targetId of targets) {
    try {
      const result = await recordCommunicationAudit({
        eventId: `messaging-admin-override:${normalizedConversationId || 'unknown'}:${normalizedActorId}:${targetId}:${overrideAction}`,
        actorId: normalizedActorId,
        recipientId: targetId,
        action: 'messaging.admin_override',
        entityType: 'conversation',
        entityId: normalizedConversationId,
        metadata: {
          overrideAction,
          targetUserIds: targets,
        },
      });
      if (result?.success) recorded += 1;
    } catch (error) {
      logger.warn(`Messaging admin override audit skipped: ${error.message}`);
    }
  }

  return { success: recorded === targets.length, attempted: targets.length, recorded };
}