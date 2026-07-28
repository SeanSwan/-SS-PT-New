/**
 * FILE: communicationAuditLogService.mjs
 * PURPOSE: Fail-soft append-only audit logging for communication actions.
 */

import logger from '../../utils/logger.mjs';
import { getCommunicationAuditLog } from '../../models/index.mjs';

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

const cleanOptionalString = (value, maxLength) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim().replace(/\s+/g, ' ');
  if (!text) return null;
  return text.slice(0, maxLength);
};

const toPlainObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...value };
};

export function normalizeCommunicationAuditAction(value) {
  return cleanOptionalString(value, 80)?.toLowerCase() || null;
}

export function buildCommunicationAuditPayload(options = {}) {
  const action = normalizeCommunicationAuditAction(options.action);
  if (!action) return null;

  return {
    eventId: cleanOptionalString(options.eventId, 120),
    actorId: toPositiveInt(options.actorId),
    recipientId: toPositiveInt(options.recipientId),
    notificationId: toPositiveInt(options.notificationId),
    action,
    entityType: cleanOptionalString(options.entityType, 80)?.toLowerCase() || null,
    entityId: cleanOptionalString(options.entityId, 120),
    metadata: toPlainObject(options.metadata),
  };
}

export async function recordCommunicationAudit(options = {}) {
  const payload = buildCommunicationAuditPayload(options);
  if (!payload) return { success: false, error: 'Valid communication audit action is required.' };

  try {
    const CommunicationAuditLog = getCommunicationAuditLog();
    if (!CommunicationAuditLog) return { success: false, error: 'CommunicationAuditLog model not initialized.' };

    const auditLog = await CommunicationAuditLog.create(payload);
    return { success: true, auditLog };
  } catch (error) {
    logger.warn(`Communication audit skipped: ${error.message}`);
    return { success: false, error: error.message };
  }
}