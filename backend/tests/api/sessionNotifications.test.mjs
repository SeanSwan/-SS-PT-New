/**
 * Session Notification Tests
 * ===========================
 * Validates in-app notification creation for session events.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const { loggerWarnMock, mockNotification, mockNotificationModel } = vi.hoisted(() => {
  const mockNotification = {
    id: 1,
    userId: 3,
    title: 'New Session Scheduled',
    message: 'A training session has been scheduled',
    type: 'session',
    read: false,
    link: '/schedule',
  };
  const mockNotificationModel = {
    create: vi.fn().mockResolvedValue(mockNotification),
    findAll: vi.fn(),
  };
  return { loggerWarnMock: vi.fn(), mockNotification, mockNotificationModel };
});

vi.mock('../../models/index.mjs', () => ({
  getNotification: () => mockNotificationModel,
  getUser: () => ({ findOne: vi.fn(), findByPk: vi.fn() }),
  getAllModels: () => ({}),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: loggerWarnMock, error: vi.fn(), debug: vi.fn() },
}));

import { createNotification, getAllNotifications } from '../../controllers/notificationController.mjs';

describe('Session Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Session Created ───

  it('creates notification when session is scheduled for a client', async () => {
    const result = await createNotification({
      userId: 3,
      title: 'New Session Scheduled',
      message: 'A training session has been scheduled for Monday, March 3',
      type: 'session',
      link: '/schedule',
      senderId: 1,
    });

    expect(result.success).toBe(true);
    expect(mockNotificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 3,
        title: 'New Session Scheduled',
        type: 'session',
        read: false,
      })
    );
  });

  it('notification includes link to schedule page', async () => {
    const result = await createNotification({
      userId: 3,
      title: 'New Session Scheduled',
      message: 'Session on Monday',
      type: 'session',
      link: '/schedule',
    });

    expect(result.success).toBe(true);
    expect(mockNotificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ link: '/schedule' })
    );
  });

  // ─── Session Cancelled ───

  it('creates notification when session is cancelled', async () => {
    const result = await createNotification({
      userId: 3,
      title: 'Session Cancelled',
      message: 'Your training session has been cancelled: schedule conflict',
      type: 'session',
      link: '/schedule',
      senderId: 1,
    });

    expect(result.success).toBe(true);
    expect(mockNotificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 3,
        title: 'Session Cancelled',
        type: 'session',
      })
    );
  });

  // ─── Session Rescheduled ───

  it('creates notification when session is rescheduled', async () => {
    const result = await createNotification({
      userId: 3,
      title: 'Session Rescheduled',
      message: 'Your training session has been moved to Wednesday, March 5',
      type: 'session',
      link: '/schedule',
    });

    expect(result.success).toBe(true);
    expect(mockNotificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Session Rescheduled',
        type: 'session',
      })
    );
  });

  // ─── Edge Cases ───

  it('notification defaults to read=false', async () => {
    await createNotification({
      userId: 3,
      title: 'Test Notification',
      message: 'Test message',
      type: 'session',
    });

    expect(mockNotificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ read: false })
    );
  });

  it('handles missing Notification model gracefully', async () => {
    mockNotificationModel.create.mockRejectedValueOnce(new Error('Model error'));

    const result = await createNotification({
      userId: 3,
      title: 'Test',
      message: 'Test',
      type: 'session',
    });

    expect(result.success).toBe(false);
  });

  it('notification type must be valid — checked against the MODEL, not a local copy', async () => {
    // WAS: a `validTypes` array literal declared here, asserted to contain one of its own
    // elements. Mathematically incapable of failing, and it was the named guard for exactly
    // the bug that shipped: all 8 session notifications wrote type:'session' while the live
    // enum_notifications_type lacked that label, so every one silently failed for months.
    // Now: read the real model's allowlist. Live-DB coverage of the same class lives in
    // tests/unit/enumLabelDrift.test.mjs (model enums vs a pg_enum snapshot).
    const src = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../models/Notification.mjs'), 'utf8');
    const isIn = src.match(/isIn:\s*\{[\s\S]{0,80}?args:\s*\[\[([\s\S]*?)\]\]/);
    expect(isIn, 'Notification.mjs must declare an isIn allowlist for `type`').toBeTruthy();
    const modelTypes = [...isIn[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(modelTypes).toContain('session');
  });

  it('admin notification uses type admin', async () => {
    const result = await createNotification({
      userId: 3,
      title: 'Admin Message',
      message: 'Important update from your trainer',
      type: 'admin',
      senderId: 1,
    });

    expect(result.success).toBe(true);
    expect(mockNotificationModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'admin' })
    );
  });

  it('loads notification senders with the canonical User.photo attribute', async () => {
    mockNotificationModel.findAll.mockResolvedValueOnce([
      { id: 1, userId: 3, read: false, title: 'Session booked' },
    ]);
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await getAllNotifications({ user: { id: 3 } }, res);

    const query = mockNotificationModel.findAll.mock.calls[0][0];
    expect(query.include[0].attributes).toEqual(['id', 'firstName', 'lastName', 'photo']);
    expect(loggerWarnMock).not.toHaveBeenCalledWith(
      'Sender include failed, falling back to basic query:',
      expect.anything(),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
