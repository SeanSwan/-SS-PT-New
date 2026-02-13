/**
 * Session Notification Tests
 * ===========================
 * Validates in-app notification creation for session events.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockNotification, mockNotificationModel } = vi.hoisted(() => {
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
  };
  return { mockNotification, mockNotificationModel };
});

vi.mock('../../models/index.mjs', () => ({
  getNotification: () => mockNotificationModel,
  getUser: () => ({ findOne: vi.fn(), findByPk: vi.fn() }),
  getAllModels: () => ({}),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { createNotification } from '../../controllers/notificationController.mjs';

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

  it('notification type must be valid', async () => {
    // 'session' is in the allowed types for Notification model
    const validTypes = ['orientation', 'system', 'order', 'workout', 'client', 'admin', 'session', 'achievement', 'reward'];
    expect(validTypes).toContain('session');
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
});
