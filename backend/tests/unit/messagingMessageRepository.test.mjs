import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeClientMessageId } from '../../services/messagingMessageRepository.mjs';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('messaging message repository source contract', () => {
  it('persists client message ids with a scoped unique replay guard', () => {
    const schema = read('services/messagingSchemaRepository.mjs');
    const migration = read('migrations/20260630040000-add-message-client-message-id.cjs');

    expect(schema).toContain('ADD COLUMN IF NOT EXISTS client_message_id VARCHAR(100)');
    expect(schema).toContain('idx_messages_sender_conversation_client_message');
    expect(schema).toContain('WHERE client_message_id IS NOT NULL');
    expect(migration).toContain('describeTable(TABLE_NAME)');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS client_message_id VARCHAR(100)');
    expect(migration).toContain('idx_messages_sender_conversation_client_message');
    expect(migration).toContain('DROP COLUMN IF EXISTS client_message_id');
  });

  it('normalizes client ids and returns existing rows for idempotent replays', () => {
    const repository = read('services/messagingMessageRepository.mjs');

    expect(normalizeClientMessageId(' abc-123 ')).toBe('abc-123');
    expect(normalizeClientMessageId('')).toBeNull();
    expect(normalizeClientMessageId('x'.repeat(101))).toBeNull();
    expect(repository).toContain('MAX_CLIENT_MESSAGE_ID_LENGTH = 100');
    expect(repository).toContain('export function normalizeClientMessageId');
    expect(repository).toContain('findMessageByClientMessageId');
    expect(repository).toContain('wasIdempotentReplay: true');
    expect(repository).toContain('client_message_id');
    expect(repository).toContain('SELECT');
    expect(repository).toContain('INSERT INTO messages');
  });
});