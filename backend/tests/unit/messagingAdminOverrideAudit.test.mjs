import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const mocks = vi.hoisted(() => ({
  recordCommunicationAudit: vi.fn(),
}));

vi.mock('../../services/communications/communicationAuditLogService.mjs', () => ({
  recordCommunicationAudit: mocks.recordCommunicationAudit,
}));

const readBackendFile = (relativePath) => readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('messaging admin override audit service', () => {
  beforeEach(() => {
    mocks.recordCommunicationAudit.mockReset();
    mocks.recordCommunicationAudit.mockResolvedValue({ success: true });
  });

  it('records one fail-soft communication audit entry per overridden client target', async () => {
    const { recordMessagingAdminOverrideAudit } = await import('../../services/messagingAdminOverrideAuditService.mjs');

    const result = await recordMessagingAdminOverrideAudit({
      actorId: 1,
      targetUserIds: [7, 8, 7, null],
      conversationId: 42,
      action: 'conversation.created',
    });

    expect(result).toEqual({ success: true, attempted: 2, recorded: 2 });
    expect(mocks.recordCommunicationAudit).toHaveBeenCalledTimes(2);
    expect(mocks.recordCommunicationAudit).toHaveBeenNthCalledWith(1, expect.objectContaining({
      action: 'messaging.admin_override',
      actorId: 1,
      entityId: 42,
      entityType: 'conversation',
      eventId: 'messaging-admin-override:42:1:7:conversation.created',
      recipientId: 7,
      metadata: {
        overrideAction: 'conversation.created',
        targetUserIds: [7, 8],
      },
    }));
    expect(JSON.stringify(mocks.recordCommunicationAudit.mock.calls)).not.toMatch(/message|content|body|title/i);
  });

  it('does not block the caller when one audit write fails', async () => {
    const { recordMessagingAdminOverrideAudit } = await import('../../services/messagingAdminOverrideAuditService.mjs');
    mocks.recordCommunicationAudit
      .mockRejectedValueOnce(new Error('audit table unavailable'))
      .mockResolvedValueOnce({ success: true });

    const result = await recordMessagingAdminOverrideAudit({
      actorId: 2,
      targetUserIds: [9, 10],
      conversationId: 55,
      action: 'conversation.participants_added',
    });

    expect(result).toEqual({ success: false, attempted: 2, recorded: 1 });
    expect(mocks.recordCommunicationAudit).toHaveBeenCalledTimes(2);
  });
});

describe('messaging admin override controller wiring', () => {
  it('audits admin override targets after new conversation creation succeeds', () => {
    const source = readBackendFile('controllers/messaging/conversationController.mjs');

    expect(source).toContain('recordMessagingAdminOverrideAudit');
    expect(source).toContain('targetUserIds: policy.adminOverrideUserIds');
    expect(source).toContain("action: 'conversation.created'");
  });

  it('audits admin override targets after group participant adds succeed', () => {
    const source = readBackendFile('controllers/messaging/groupController.mjs');

    expect(source).toContain('recordMessagingAdminOverrideAudit');
    expect(source).toContain('targetUserIds: policy.adminOverrideUserIds');
    expect(source).toContain("action: 'conversation.participants_added'");
  });
});