/**
 * FILE: messagingAttachmentService.mjs
 * PURPOSE: Governed structured attachments for Swan messaging.
 */

import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';

const MAX_ATTACHMENTS = 4;
const MAX_TITLE_LENGTH = 120;
const MAX_METADATA_BYTES = 4000;
const CARD_KINDS = new Set(['workout_card', 'session_card', 'nutrition_card']);
const BINARY_KINDS = new Set(['image', 'video', 'file', 'voice_note']);
const LINK_KIND = 'link';

const cleanText = (value) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

const toPositiveInt = (value) => {
  const next = Number(value);
  return Number.isInteger(next) && next > 0 ? next : null;
};

const internalUrl = (value) => {
  const url = cleanText(value);
  if (!url || !url.startsWith('/') || url.startsWith('//')) return null;
  return url.slice(0, 500);
};

const metadataJson = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const json = JSON.stringify(value);
  return Buffer.byteLength(json, 'utf8') <= MAX_METADATA_BYTES ? json : null;
};

const expectedEntityType = (kind) => {
  if (kind === 'workout_card') return 'workout';
  if (kind === 'session_card') return 'session';
  if (kind === 'nutrition_card') return 'nutrition';
  return null;
};

export function normalizeAttachmentUploadGate() {
  return {
    allowed: false,
    reason: 'scanner_required',
    message: 'File attachments require malware scanning before storage.',
  };
}

export function normalizeMessageAttachments(rawAttachments) {
  if (rawAttachments === undefined || rawAttachments === null) return { error: null, attachments: [] };
  if (!Array.isArray(rawAttachments)) return { error: 'attachments must be an array.', attachments: [] };
  if (rawAttachments.length > MAX_ATTACHMENTS) return { error: `Maximum ${MAX_ATTACHMENTS} attachments per message.`, attachments: [] };

  const attachments = [];
  for (const raw of rawAttachments) {
    const kind = cleanText(raw?.kind).toLowerCase();
    const title = cleanText(raw?.title).slice(0, MAX_TITLE_LENGTH);
    if (!title) return { error: 'Attachment title is required.', attachments: [] };

    if (BINARY_KINDS.has(kind)) return { error: normalizeAttachmentUploadGate().message, attachments: [] };

    if (CARD_KINDS.has(kind)) {
      const entityType = cleanText(raw.entityType).toLowerCase();
      const entityId = toPositiveInt(raw.entityId);
      if (entityType !== expectedEntityType(kind) || !entityId) {
        return { error: 'Card attachments require a valid matching entity reference.', attachments: [] };
      }
      attachments.push({
        kind,
        title,
        entityType,
        entityId,
        url: internalUrl(raw.url),
        metadata: metadataJson(raw.metadata),
        scanStatus: 'not_required',
      });
      continue;
    }

    if (kind === LINK_KIND) {
      const url = internalUrl(raw.url);
      if (!url) return { error: 'Attachment links must be internal app paths.', attachments: [] };
      attachments.push({ kind, title, entityType: null, entityId: null, url, metadata: metadataJson(raw.metadata), scanStatus: 'not_required' });
      continue;
    }

    return { error: 'Unsupported attachment kind.', attachments: [] };
  }

  return { error: null, attachments };
}

export async function createMessageAttachments({ conversationId, messageId, createdBy, attachments }) {
  if (!attachments?.length) return [];

  const created = [];
  for (const attachment of attachments) {
    const [rows] = await sequelize.query(
      `INSERT INTO message_attachments (
         conversation_id, message_id, created_by, kind, title, url,
         entity_type, entity_id, metadata, scan_status, created_at
       ) VALUES (
         :conversationId, :messageId, :createdBy, :kind, :title, :url,
         :entityType, :entityId, CAST(:metadata AS jsonb), :scanStatus, NOW()
       )
       RETURNING id, conversation_id as "conversationId", message_id as "messageId",
         kind, title, url, entity_type as "entityType", entity_id as "entityId",
         metadata, scan_status as "scanStatus", created_at as "createdAt"`,
      {
        replacements: {
          conversationId,
          messageId,
          createdBy,
          kind: attachment.kind,
          title: attachment.title,
          url: attachment.url,
          entityType: attachment.entityType,
          entityId: attachment.entityId,
          metadata: attachment.metadata || null,
          scanStatus: attachment.scanStatus,
        },
      }
    );
    created.push(rows[0] || rows);
  }
  return created;
}

export async function getMessageAttachments(messageIds) {
  const ids = [...new Set((messageIds || []).map(toPositiveInt).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const rows = await sequelize.query(
    `SELECT id, conversation_id as "conversationId", message_id as "messageId",
            kind, title, url, entity_type as "entityType", entity_id as "entityId",
            metadata, scan_status as "scanStatus", created_at as "createdAt"
     FROM message_attachments
     WHERE message_id IN (:ids)
     ORDER BY created_at ASC, id ASC`,
    { replacements: { ids }, type: QueryTypes.SELECT }
  );

  return rows.reduce((map, row) => {
    const key = Number(row.messageId);
    const existing = map.get(key) || [];
    existing.push(row);
    map.set(key, existing);
    return map;
  }, new Map());
}