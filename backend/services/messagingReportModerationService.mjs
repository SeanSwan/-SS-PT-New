/**
 * FILE: messagingReportModerationService.mjs
 * PURPOSE: Admin queue and resolution SQL for reported conversation messages.
 */

import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';
import { recordCommunicationAudit } from './communications/communicationAuditLogService.mjs';

const QUEUE_STATUSES = new Set(['open', 'reviewed', 'dismissed', 'resolved', 'all']);
const RESOLUTION_STATUSES = new Set(['reviewed', 'dismissed', 'resolved']);
const REPORT_AUDIT_ACTIONS = Object.freeze({
  reviewed: 'message.report.reviewed',
  dismissed: 'message.report.dismissed',
  resolved: 'message.report.resolved',
});
const DEFAULT_QUEUE_LIMIT = 25;
const MAX_QUEUE_LIMIT = 100;
const MAX_RESOLUTION_NOTE = 2000;

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

const cleanText = (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

export function normalizeMessageReportQueueQuery(queryParams = {}) {
  const status = cleanText(queryParams.status).toLowerCase() || 'open';
  const requestedLimit = toPositiveInt(queryParams.limit) || DEFAULT_QUEUE_LIMIT;

  if (!QUEUE_STATUSES.has(status)) {
    return { error: 'Unsupported report status.', status, limit: DEFAULT_QUEUE_LIMIT };
  }

  return { error: null, status, limit: Math.min(requestedLimit, MAX_QUEUE_LIMIT) };
}

export function normalizeMessageReportResolutionPayload(body = {}) {
  const status = cleanText(body.status).toLowerCase();
  const resolutionNote = cleanText(body.resolutionNote ?? body.note).slice(0, MAX_RESOLUTION_NOTE);

  if (!RESOLUTION_STATUSES.has(status)) {
    return { error: 'Unsupported report resolution status.', status, resolutionNote };
  }

  return { error: null, status, resolutionNote };
}

const baseReportSelect = () => `SELECT
       r.id,
       r.message_id as "messageId",
       r.reporter_id as "reporterId",
       r.reason,
       r.details,
       r.status,
       r.created_at as "createdAt",
       r.updated_at as "updatedAt",
       r.resolved_at as "resolvedAt",
       r.resolver_id as "resolverId",
       r.resolution_note as "resolutionNote",
       m.conversation_id as "conversationId",
       m.sender_id as "senderId",
       LEFT(COALESCE(m.content, ''), 320) as "messageExcerpt",
       m.created_at as "messageCreatedAt",
       m.deleted_at as "messageDeletedAt",
       c.type as "conversationType",
       c.name as "conversationName",
       json_build_object(
         'id', reporter.id,
         'firstName', reporter."firstName",
         'lastName', reporter."lastName",
         'username', reporter.username,
         'photo', reporter.photo,
         'role', CASE WHEN reporter.role = 'user' THEN 'client' ELSE reporter.role END
       ) as reporter,
       json_build_object(
         'id', sender.id,
         'firstName', sender."firstName",
         'lastName', sender."lastName",
         'username', sender.username,
         'photo', sender.photo,
         'role', CASE WHEN sender.role = 'user' THEN 'client' ELSE sender.role END
       ) as sender
     FROM message_reports r
     JOIN messages m ON m.id = r.message_id
     JOIN conversations c ON c.id = m.conversation_id
     JOIN "Users" reporter ON reporter.id = r.reporter_id
     JOIN "Users" sender ON sender.id = m.sender_id`;

export async function listMessageReportsForAdmin({ status = 'open', limit = DEFAULT_QUEUE_LIMIT } = {}) {
  const whereClause = status === 'all' ? '' : 'WHERE r.status = :status';
  return sequelize.query(
    `${baseReportSelect()}
     ${whereClause}
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT :limit`,
    { replacements: { status, limit }, type: QueryTypes.SELECT }
  );
}

async function getMessageReportStatus(reportId) {
  const [report] = await sequelize.query(
    `SELECT id, status
     FROM message_reports
     WHERE id = :reportId
     LIMIT 1`,
    { replacements: { reportId }, type: QueryTypes.SELECT }
  );
  return report || null;
}

export async function resolveMessageReportForAdmin({ reportId, resolverId, status, resolutionNote }) {
  const [rows] = await sequelize.query(
    `UPDATE message_reports r
     SET status = :status,
         resolver_id = :resolverId,
         resolved_at = NOW(),
         resolution_note = :resolutionNote,
         updated_at = NOW()
     FROM messages m
     WHERE r.id = :reportId AND r.status = 'open'
       AND m.id = r.message_id
     RETURNING
       r.id,
       r.message_id as "messageId",
       r.reporter_id as "reporterId",
       r.reason,
       r.details,
       r.status,
       r.created_at as "createdAt",
       r.updated_at as "updatedAt",
       r.resolved_at as "resolvedAt",
       r.resolver_id as "resolverId",
       r.resolution_note as "resolutionNote",
       m.conversation_id as "conversationId",
       m.sender_id as "senderId"`,
    { replacements: { reportId, resolverId, status, resolutionNote: resolutionNote || null } }
  );

  const report = Array.isArray(rows) ? rows[0] : rows;
  if (!report) {
    const existing = await getMessageReportStatus(reportId);
    if (!existing) return { error: 'Report not found.', statusCode: 404, report: null };
    return { error: 'Report is already closed.', statusCode: 409, report: existing };
  }

  await recordCommunicationAudit({
    eventId: `message-report-resolution:${report.id}`,
    actorId: resolverId,
    recipientId: report.senderId,
    action: `message.report.${status}`,
    entityType: 'message_report',
    entityId: report.id,
    metadata: {
      messageId: report.messageId,
      conversationId: report.conversationId,
      reporterId: report.reporterId,
      status,
    },
  });

  return { error: null, report };
}
