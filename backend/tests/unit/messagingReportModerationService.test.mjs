/**
 * FILE: messagingReportModerationService.test.mjs
 * PURPOSE: Locks admin message-report moderation query and resolution behavior.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  audit: vi.fn(async () => ({ success: true })),
}));

vi.mock('../../database.mjs', () => ({
  default: { query: mocks.query },
}));

vi.mock('../../services/communications/communicationAuditLogService.mjs', () => ({
  recordCommunicationAudit: mocks.audit,
}));

const {
  listMessageReportsForAdmin,
  normalizeMessageReportQueueQuery,
  normalizeMessageReportResolutionPayload,
  resolveMessageReportForAdmin,
} = await import('../../services/messagingReportModerationService.mjs');

describe('messagingReportModerationService', () => {
  beforeEach(() => {
    mocks.query.mockReset();
    mocks.audit.mockClear();
  });

  it('normalizes admin queue filters without allowing unbounded scans', () => {
    expect(normalizeMessageReportQueueQuery({ status: 'open', limit: '250' })).toMatchObject({
      error: null,
      status: 'open',
      limit: 100,
    });
    expect(normalizeMessageReportQueueQuery({ status: 'all', limit: '10' })).toMatchObject({
      error: null,
      status: 'all',
      limit: 10,
    });
    expect(normalizeMessageReportQueueQuery({ status: 'unknown' })).toMatchObject({
      error: 'Unsupported report status.',
    });
  });

  it('lists reports with message, reporter, sender, and conversation context for admin review', async () => {
    const rows = [{ id: 7, messageId: 44, status: 'open', conversationId: 12 }];
    mocks.query.mockResolvedValueOnce(rows);

    await expect(listMessageReportsForAdmin({ status: 'open', limit: 25 })).resolves.toEqual(rows);

    const [sql, options] = mocks.query.mock.calls[0];
    expect(sql).toContain('FROM message_reports r');
    expect(sql).toContain('JOIN messages m ON m.id = r.message_id');
    expect(sql).toContain('JOIN conversations c ON c.id = m.conversation_id');
    expect(sql).toContain('reporter');
    expect(sql).toContain('sender');
    expect(sql).not.toContain('email');
    expect(options.replacements).toMatchObject({ status: 'open', limit: 25 });
  });

  it('normalizes resolution payloads to reviewed, dismissed, or resolved only', () => {
    expect(normalizeMessageReportResolutionPayload({ status: 'dismissed', resolutionNote: ' duplicate ' })).toEqual({
      error: null,
      status: 'dismissed',
      resolutionNote: 'duplicate',
    });
    expect(normalizeMessageReportResolutionPayload({ status: 'open' })).toMatchObject({
      error: 'Unsupported report resolution status.',
    });
  });

  it('resolves only open reports, writes reviewer metadata, and records an audit event', async () => {
    const report = {
      id: 7,
      messageId: 44,
      reporterId: 3,
      senderId: 9,
      conversationId: 12,
      status: 'resolved',
    };
    mocks.query.mockResolvedValueOnce([[report]]);

    await expect(resolveMessageReportForAdmin({
      reportId: 7,
      resolverId: 2,
      status: 'resolved',
      resolutionNote: 'Handled offline',
    })).resolves.toEqual({ error: null, report });

    const [sql, options] = mocks.query.mock.calls[0];
    expect(sql).toContain("WHERE r.id = :reportId AND r.status = 'open'");
    expect(sql).toContain('resolver_id = :resolverId');
    expect(sql).toContain('resolved_at = NOW()');
    expect(options.replacements).toMatchObject({
      reportId: 7,
      resolverId: 2,
      status: 'resolved',
      resolutionNote: 'Handled offline',
    });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 2,
      recipientId: 9,
      action: 'message.report.resolved',
      entityType: 'message_report',
      entityId: 7,
      metadata: expect.objectContaining({ messageId: 44, conversationId: 12, status: 'resolved' }),
    }));
  });

  it('returns a conflict instead of rewriting already closed reports', async () => {
    mocks.query
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce([{ id: 7, status: 'dismissed' }]);

    await expect(resolveMessageReportForAdmin({
      reportId: 7,
      resolverId: 2,
      status: 'resolved',
      resolutionNote: 'late duplicate',
    })).resolves.toEqual({
      error: 'Report is already closed.',
      statusCode: 409,
      report: { id: 7, status: 'dismissed' },
    });
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
