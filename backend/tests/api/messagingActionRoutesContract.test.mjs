import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('messaging action routes contract', () => {
  it('adds governed message actions without bypassing membership checks', () => {
    const routes = read('routes/messagingRoutes.mjs');
    const facade = read('controllers/messagingController.mjs');
    const actionController = read('controllers/messaging/actionController.mjs');
    const actionService = read('services/messagingActionService.mjs');
    const schema = read('services/messagingSchemaRepository.mjs');
    const repository = read('services/messagingMessageRepository.mjs');
    const messageController = read('controllers/messaging/messageController.mjs');
    const conversationReadModel = read('services/messagingConversationQueries.mjs');
    const participantRepository = read('services/messagingParticipantRepository.mjs');
    const socket = read('socket/socket.mjs');
    const saveMigration = read('migrations/20260701083000-create-message-saves.cjs');

    expect(schema).toContain('ADD COLUMN IF NOT EXISTS reply_to_message_id');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS message_reactions');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS message_pins');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS message_saves');
    expect(schema).toContain('ADD COLUMN IF NOT EXISTS archived_at');
    expect(schema).toContain('ADD COLUMN IF NOT EXISTS marked_unread_at');

    expect(routes).toContain("router.patch('/messages/:messageId'");
    expect(routes).toContain("router.delete('/messages/:messageId'");
    expect(routes).toContain("router.put('/messages/:messageId/reactions'");
    expect(routes).toContain("router.delete('/messages/:messageId/reactions'");
    expect(routes).toContain("router.put('/messages/:messageId/pin'");
    expect(routes).toContain("router.delete('/messages/:messageId/pin'");
    expect(routes).toContain("router.put('/messages/:messageId/save'");
    expect(routes).toContain("router.delete('/messages/:messageId/save'");
    expect(routes).toContain("router.patch('/conversations/:id/archive'");
    expect(routes).toContain("router.patch('/conversations/:id/mark-unread'");

    expect(facade).toContain('editConversationMessage');
    expect(facade).toContain('saveConversationMessage');
    expect(facade).toContain('unsaveConversationMessage');
    expect(actionController).toContain('getMessageActionContext');
    expect(actionController).toContain('getConversationMembership');
    expect(actionController).toContain('assertCanMessageConversation');
    expect(actionController).toContain('message.deletedAt');
    expect(actionController).toContain('...(req.query || {})');
    expect(actionService).toContain('INSERT INTO message_reactions');
    expect(actionService).toContain('INSERT INTO message_pins');
    expect(actionService).toContain('INSERT INTO message_saves');
    expect(actionService).toContain('deleted_at = NOW()');
    expect(conversationReadModel).toContain('cp.archived_at IS NULL');
    expect(conversationReadModel).toContain('cp.marked_unread_at IS NOT NULL');
    expect(participantRepository).toContain('archived_at = NULL');
    expect(participantRepository).toContain('marked_unread_at = NULL');
    expect(repository).toContain('reply_to_message_id');
    expect(messageController).toContain('normalizeReplyToMessageId');
    expect(messageController).toContain('FROM message_saves ms');
    expect(socket).toContain('Replies with attachments or reply references must use REST.');
    expect(socket).toContain('marked_unread_at = NULL');
    expect(saveMigration).toContain('CREATE TABLE IF NOT EXISTS message_saves');
    expect(saveMigration).toContain('UNIQUE(message_id, saved_by)');
  });
});