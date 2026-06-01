import { beforeEach, describe, expect, it, vi } from 'vitest';

const modelMocks = vi.hoisted(() => ({
  sessionCount: vi.fn(),
  sessionCreate: vi.fn(),
  sessionFindAll: vi.fn(),
  userFindByPk: vi.fn(),
}));

vi.mock('../../models/index.mjs', () => ({
  getSession: () => ({
    count: modelMocks.sessionCount,
    create: modelMocks.sessionCreate,
    findAll: modelMocks.sessionFindAll,
  }),
  getUser: () => ({
    findByPk: modelMocks.userFindByPk,
  }),
}));

const {
  dispatchRescheduleSession,
  dispatchScheduleSession,
} = await import('../../services/ai/dispatchers/scheduleWriteDispatchers.mjs');

describe('Swan Coach schedule write dispatchers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    modelMocks.sessionCount.mockResolvedValue(0);
  });

  it('creates a scheduled session for trainer dictation without deducting credits', async () => {
    modelMocks.userFindByPk.mockResolvedValue({ id: 44, firstName: 'Client' });
    modelMocks.sessionCreate.mockResolvedValue({
      id: 99,
      trainerId: 7,
      status: 'scheduled',
    });

    const result = await dispatchScheduleSession({
      clientId: 44,
      date: '2026-06-01',
      time: '15:30',
      duration: 45,
      notes: 'Dictated after intake',
    }, {
      user: { id: 7, role: 'trainer' },
    });

    expect(modelMocks.sessionCreate).toHaveBeenCalledWith(expect.objectContaining({
      userId: 44,
      trainerId: 7,
      duration: 45,
      status: 'scheduled',
      notes: 'Dictated after intake',
      notifyClient: true,
    }));
    expect(modelMocks.sessionCreate.mock.calls[0][0]).not.toHaveProperty('sessionDeducted');
    expect(result).toMatchObject({
      sessionId: 99,
      clientId: 44,
      trainerId: 7,
      status: 'scheduled',
      date: '2026-06-01',
      time: '15:30',
      duration: 45,
    });
  });

  it('keeps an admin-dictated trainer assignment when scheduling a client', async () => {
    modelMocks.userFindByPk
      .mockResolvedValueOnce({ id: 44, firstName: 'Client' })
      .mockResolvedValueOnce({ id: 12, role: 'trainer' });
    modelMocks.sessionCreate.mockResolvedValue({
      id: 100,
      trainerId: 12,
      status: 'scheduled',
    });

    await dispatchScheduleSession({
      clientId: 44,
      trainerId: 12,
      date: '2026-06-01',
      time: '15:30',
      duration: 60,
    }, {
      user: { id: 1, role: 'admin' },
    });

    expect(modelMocks.userFindByPk).toHaveBeenNthCalledWith(2, 12, {
      attributes: ['id', 'role']
    });
    expect(modelMocks.sessionCreate).toHaveBeenCalledWith(expect.objectContaining({
      userId: 44,
      trainerId: 12,
      status: 'scheduled',
    }));
  });

  it('rejects dictated scheduling that would double-book the client', async () => {
    modelMocks.userFindByPk.mockResolvedValue({ id: 44, firstName: 'Client' });
    modelMocks.sessionCount.mockResolvedValueOnce(1);

    await expect(dispatchScheduleSession({
      clientId: 44,
      date: '2026-06-01',
      time: '15:30',
      duration: 60,
    }, {
      user: { id: 7, role: 'trainer' },
    })).rejects.toThrow('Client double-booking conflict detected');

    expect(modelMocks.sessionCreate).not.toHaveBeenCalled();
  });

  it('rejects dictated scheduling that would double-book the trainer', async () => {
    modelMocks.userFindByPk.mockResolvedValue({ id: 44, firstName: 'Client' });
    modelMocks.sessionCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    await expect(dispatchScheduleSession({
      clientId: 44,
      date: '2026-06-01',
      time: '15:30',
      duration: 60,
    }, {
      user: { id: 7, role: 'trainer' },
    })).rejects.toThrow('Trainer double-booking conflict detected');

    expect(modelMocks.sessionCreate).not.toHaveBeenCalled();
  });

  it('moves exactly one matched scheduled session for trainer dictation', async () => {
    const session = {
      id: 55,
      duration: 60,
      status: 'confirmed',
      trainerId: 7,
      save: vi.fn(),
    };

    modelMocks.userFindByPk.mockResolvedValue({ id: 44, firstName: 'Client' });
    modelMocks.sessionFindAll.mockResolvedValue([session]);

    const result = await dispatchRescheduleSession({
      clientId: 44,
      originalDate: '2026-06-01',
      newDate: '2026-06-02',
      newTime: '16:15',
    }, {
      user: { id: 7, role: 'trainer' },
    });

    expect(modelMocks.sessionFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 44,
        trainerId: 7,
      }),
    }));
    expect(session.sessionDate.toISOString()).toBe('2026-06-02T16:15:00.000Z');
    expect(session.endDate.toISOString()).toBe('2026-06-02T17:15:00.000Z');
    expect(session.save).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      sessionId: 55,
      clientId: 44,
      trainerId: 7,
      status: 'confirmed',
      oldDate: '2026-06-01',
      newDate: '2026-06-02',
      newTime: '16:15',
    });
  });

  it('rejects dictated rescheduling that would double-book the client', async () => {
    const session = {
      id: 55,
      duration: 60,
      status: 'confirmed',
      trainerId: 7,
      save: vi.fn(),
    };

    modelMocks.userFindByPk.mockResolvedValue({ id: 44, firstName: 'Client' });
    modelMocks.sessionFindAll.mockResolvedValue([session]);
    modelMocks.sessionCount.mockResolvedValueOnce(1);

    await expect(dispatchRescheduleSession({
      clientId: 44,
      originalDate: '2026-06-01',
      newDate: '2026-06-02',
      newTime: '16:15',
    }, {
      user: { id: 7, role: 'trainer' },
    })).rejects.toThrow('Client double-booking conflict detected');

    expect(session.save).not.toHaveBeenCalled();
  });
});
