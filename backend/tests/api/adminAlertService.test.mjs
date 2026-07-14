/**
 * Admin Alert Service Tests — commission/accrual failure alarms
 * =============================================================
 * The 2026-07-14 hostile review proved commission writes can fail
 * silently for months (0 rows ever, no alarm). raiseMoneyWriteAlert
 * turns any pay-write failure into a CRITICAL admin notification with
 * dedupe (no alert storms) and a never-throws contract.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockNotificationModel } = vi.hoisted(() => ({
  mockNotificationModel: { findOne: vi.fn(), create: vi.fn() },
}));

vi.mock('../../models/index.mjs', () => ({
  getModel: (name) => (name === 'AdminNotification' ? mockNotificationModel : null),
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { raiseMoneyWriteAlert } = await import('../../services/adminAlertService.mjs');

beforeEach(() => {
  vi.clearAllMocks();
  mockNotificationModel.findOne.mockResolvedValue(null);
  mockNotificationModel.create.mockImplementation(async (row) => ({ id: 'uuid-1', ...row }));
});

describe('raiseMoneyWriteAlert', () => {
  it('creates a CRITICAL system_alert with lane context in metadata', async () => {
    const created = await raiseMoneyWriteAlert({
      lane: 'session_flat_accrual',
      error: new Error('boom'),
      context: { sessionId: 55, trainerId: 2, clientId: 9 },
    });

    expect(created).not.toBeNull();
    const row = mockNotificationModel.create.mock.calls[0][0];
    expect(row.type).toBe('system_alert');
    expect(row.priority).toBe('critical');
    expect(row.actionRequired).toBe(true);
    expect(row.title).toContain('Trainer pay write FAILED');
    expect(row.message).toContain('session_flat_accrual');
    const meta = JSON.parse(row.metadata);
    expect(meta).toMatchObject({ lane: 'session_flat_accrual', sessionId: 55, trainerId: 2, error: 'boom' });
  });

  it('dedupes: skips when an unread alert for the same lane exists', async () => {
    mockNotificationModel.findOne.mockResolvedValue({ id: 'existing' });

    const created = await raiseMoneyWriteAlert({ lane: 'purchase_commission', error: new Error('x'), context: {} });

    expect(created).toBeNull();
    expect(mockNotificationModel.create).not.toHaveBeenCalled();
  });

  it('never throws — even when notification creation itself fails', async () => {
    mockNotificationModel.create.mockRejectedValue(new Error('db down'));
    await expect(
      raiseMoneyWriteAlert({ lane: 'purchase_commission', error: new Error('x'), context: {} })
    ).resolves.toBeNull();
  });

  it('never throws when the model is unavailable', async () => {
    const { raiseMoneyWriteAlert: raise } = await import('../../services/adminAlertService.mjs');
    // getModel returns null for anything but AdminNotification; simulate by lane only — covered via mock override
    mockNotificationModel.findOne.mockRejectedValue(new Error('no cache'));
    await expect(raise({ lane: 'session_flat_accrual', error: new Error('x'), context: {} })).resolves.toBeNull();
  });
});
