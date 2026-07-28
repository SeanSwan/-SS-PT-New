import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('messaging REST send notification contract', () => {
  it('fans out canonical message notifications for REST sends through a mute-aware recipient helper', () => {
    const messageController = read('controllers/messaging/messageController.mjs');
    const socket = read('socket/socket.mjs');
    const recipientService = read('services/messagingNotificationRecipientService.mjs');

    expect(messageController).toContain('createMessageNotificationEvent');
    expect(messageController).toContain('getMessageNotificationRecipients');
    expect(messageController).toContain('REST message notification fanout failed');
    expect(messageController).toContain('getManagedSocketIO');
    expect(messageController).toContain("emit('new_message'");
    expect(messageController).toContain('content || \'[Attachment]\'');
    expect(socket).toContain('getMessageNotificationRecipients');
    expect(recipientService).toContain('conversation_mutes');
    expect(recipientService).toContain('cm.muted_until IS NULL OR cm.muted_until > NOW()');
    expect(recipientService).toContain('cp.deleted_at IS NULL');
    expect(recipientService).toContain('cp.user_id != :senderId');
  });

  it('uses clientMessageId for REST retry idempotency without duplicate live fanout', () => {
    const messageController = read('controllers/messaging/messageController.mjs');

    expect(messageController).toContain('normalizeClientMessageId');
    expect(messageController).toContain('req.body?.clientMessageId');
    expect(messageController).toContain('clientMessageId');
    expect(messageController).toContain('message.wasIdempotentReplay');
    expect(messageController).toContain('return res.status(200).json(messagePayload)');

    const replayBranchIndex = messageController.indexOf('message.wasIdempotentReplay');
    const emitIndex = messageController.indexOf("emit('new_message'");
    const fanoutIndex = messageController.indexOf('createMessageNotificationEvent({');
    expect(replayBranchIndex).toBeGreaterThan(-1);
    expect(emitIndex).toBeGreaterThan(replayBranchIndex);
    expect(fanoutIndex).toBeGreaterThan(replayBranchIndex);
  });
});