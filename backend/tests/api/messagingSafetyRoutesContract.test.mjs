import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('messaging safety route contract', () => {
  it('adds server-side search and moderation governance without bypassing membership policy', () => {
    const routes = read('routes/messagingRoutes.mjs');
    const facade = read('controllers/messagingController.mjs');
    const safetyController = read('controllers/messaging/safetyController.mjs');
    const safetyService = read('services/messagingSafetyService.mjs');
    const reportModerationService = read('services/messagingReportModerationService.mjs');
    const schema = read('services/messagingSchemaRepository.mjs');
    const policy = read('services/messagingPolicyService.mjs');
    const socket = read('socket/socket.mjs');
    const conversationReadModel = read('services/messagingConversationQueries.mjs');

    expect(routes).toContain("router.get('/conversations/:id/messages/search'");
    expect(routes).toContain("router.post('/messages/:messageId/report'");
    expect(routes).toContain("router.get('/admin/reports'");
    expect(routes).toContain("router.patch('/admin/reports/:reportId'");
    expect(routes).toContain('listAdminMessageReports,');
    expect(routes).toContain('resolveAdminMessageReport,');
    expect(routes).toContain('adminOnly');
    expect(routes).toContain("router.post('/users/:userId/block'");
    expect(routes).toContain("router.delete('/users/:userId/block'");
    expect(routes).toContain("router.put('/conversations/:id/mute'");
    expect(routes).toContain("router.delete('/conversations/:id/mute'");
    expect(facade).toContain('searchConversationMessages');
    expect(facade).toContain('reportConversationMessage');
    expect(facade).toContain('listAdminMessageReports');
    expect(facade).toContain('resolveAdminMessageReport');
    expect(facade).toContain('blockMessagingUser');
    expect(facade).toContain('muteMessagingConversation');

    expect(schema).toContain('CREATE TABLE IF NOT EXISTS user_blocks');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS conversation_mutes');
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS message_reports');
    expect(schema).toContain('ADD COLUMN IF NOT EXISTS resolver_id');
    expect(schema).toContain('ADD COLUMN IF NOT EXISTS resolved_at');
    expect(schema).toContain('ADD COLUMN IF NOT EXISTS resolution_note');
    expect(policy).toContain('fetchBlockingPairs');
    expect(policy).toContain('blockedUserIds');
    expect(socket).toContain('const policy = await assertCanMessageConversation');
    expect(socket).toContain('return failSend(MESSAGING_POLICY_DENIED_MESSAGE)');

    expect(safetyController).toContain('ensureMessagingTables');
    expect(safetyController).toContain('getConversationMembership');
    expect(safetyController).toContain('searchMessagesForConversation');
    expect(safetyController).toContain('createMessageReport');
    expect(safetyController).toContain('listMessageReportsForAdmin');
    expect(safetyController).toContain('resolveMessageReportForAdmin');
    expect(safetyService).toContain('m.conversation_id = :conversationId');
    expect(safetyService).toContain('m.content ILIKE :query');
    expect(safetyService).toContain('INSERT INTO message_reports');
    expect(reportModerationService).toContain('FROM message_reports r');
    expect(reportModerationService).toContain("WHERE r.id = :reportId AND r.status = 'open'");
    expect(reportModerationService).toContain('message.report.resolved');
    expect(safetyService).toContain('INSERT INTO user_blocks');
    expect(safetyService).toContain('INSERT INTO conversation_mutes');
    expect(conversationReadModel).toContain('conversation_mutes cm');
    expect(conversationReadModel).toContain('"isMuted"');
    expect(conversationReadModel).toContain('"mutedUntil"');
  });
});
