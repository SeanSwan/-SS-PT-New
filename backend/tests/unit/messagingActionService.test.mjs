import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  normalizeEditMessagePayload,
  normalizeReactionPayload,
  normalizeReplyToMessageId,
} from '../../services/messagingActionService.mjs';

describe('messagingActionService normalization', () => {
  it('normalizes edit, reaction, and reply payloads safely', () => {
    expect(normalizeEditMessagePayload({ content: '  Updated   plan notes  ' })).toEqual({
      error: null,
      content: 'Updated plan notes',
    });
    expect(normalizeReactionPayload({ reaction: '  swan  ' })).toEqual({ error: null, reaction: 'swan' });
    expect(normalizeReplyToMessageId('42')).toBe(42);
  });

  it('rejects empty edits, oversized reactions, and invalid reply ids', () => {
    expect(normalizeEditMessagePayload({ content: '   ' }).error).toBe('Message content is required.');
    expect(normalizeReactionPayload({ reaction: 'x'.repeat(33) }).error).toBe('Reaction is too long.');
    expect(normalizeReplyToMessageId(-1)).toBeNull();
  });
});
const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('message action actor audit fields', () => {
  it('keeps sender-created, editor-updated, and deleter-deleted attribution wired through message actions', () => {
    const schemaSource = read('services/messagingSchemaRepository.mjs');
    const actionSource = read('services/messagingActionService.mjs');
    const controllerSource = read('controllers/messaging/actionController.mjs');
    const messageRepositorySource = read('services/messagingMessageRepository.mjs');
    const migrationSource = read('migrations/20260630080000-add-message-action-audit-fields.cjs');

    expect(schemaSource).toContain('ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES "Users"(id) ON DELETE SET NULL');
    expect(schemaSource).toContain('idx_messages_updated_by');
    expect(migrationSource).toContain('ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES "Users"(id) ON DELETE SET NULL');
    expect(migrationSource).toContain('idx_messages_updated_by');

    expect(actionSource).toContain('editMessageRecord({ messageId, content, updatedBy })');
    expect(actionSource).toContain('updated_by = :updatedBy');
    expect(actionSource).toContain('updated_by as "updatedBy"');
    expect(controllerSource).toContain('editMessageRecord({ messageId, content: normalized.content, updatedBy: userId })');

    expect(actionSource).toContain('deleted_by = :deletedBy');
    expect(messageRepositorySource).toContain('sender_id, content, reply_to_message_id, client_message_id, updated_by, created_at, updated_at');
    expect(messageRepositorySource).toContain(':clientMessageId, :senderId, NOW(), NOW()');
    expect(messageRepositorySource).toContain('updated_by as "updatedBy"');
  });
});