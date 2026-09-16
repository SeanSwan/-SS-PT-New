import { beforeEach, describe, expect, it, vi } from 'vitest';

const { admins, created, rooms, notificationModel, userModel, io } = vi.hoisted(() => {
  const admins = [{ id: 'admin-a' }, { id: 'admin-b' }];
  const created = [];
  const rooms = [];
  const notificationModel = {
    create: vi.fn(async (attributes) => {
      const row = { id: `notification-${created.length + 1}`, ...attributes };
      created.push(row);
      return row;
    }),
    count: vi.fn(async ({ where }) => created.filter((row) => row.userId === where.userId && !row.read).length),
  };
  const userModel = { findAll: vi.fn(async () => admins) };
  const io = { to: vi.fn((room) => ({ emit: vi.fn((event, payload) => rooms.push({ room, event, payload })) })) };
  return { admins, created, rooms, notificationModel, userModel, io };
});

vi.mock('../models/index.mjs', () => ({ getNotification: () => notificationModel, getUser: () => userModel }));
vi.mock('../socket/socketManager.mjs', () => ({ getIO: () => io }));
vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../utils/apiResponse.mjs', () => ({ successResponse: vi.fn(), errorResponse: vi.fn() }));

import { createAdminNotification } from '../controllers/notificationController.mjs';

describe('admin notification recipient ownership', () => {
  beforeEach(() => {
    created.length = 0;
    rooms.length = 0;
    notificationModel.create.mockClear();
    notificationModel.count.mockClear();
    userModel.findAll.mockClear();
    io.to.mockClear();
  });

  it('emits each persisted row only to its own recipient room', async () => {
    const result = await createAdminNotification({ title: 'Alert', message: 'Review', type: 'admin' });

    expect(result.success).toBe(true);
    expect(created.map((row) => row.userId)).toEqual(['admin-a', 'admin-b']);
    const newEvents = rooms.filter((entry) => entry.event === 'notification:new');
    expect(newEvents.map((entry) => entry.room)).toEqual(['user:admin-a', 'user:admin-b']);
    expect(newEvents.map((entry) => entry.payload.userId)).toEqual(['admin-a', 'admin-b']);
    const countEvents = rooms.filter((entry) => entry.event === 'notification:count');
    expect(countEvents.map((entry) => entry.payload.userId)).toEqual(['admin-a', 'admin-b']);
    expect(countEvents.map((entry) => entry.room)).toEqual(['user:admin-a', 'user:admin-b']);
    expect(newEvents.some((entry) => entry.room === 'admin')).toBe(false);
  });
});
