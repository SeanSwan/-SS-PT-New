import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Op } from 'sequelize';

const sessionFindAll = vi.fn();

const mockSession = {
  sequelize: {},
  findAll: sessionFindAll
};

const mockUser = {};

vi.mock('../../models/index.mjs', () => ({
  getSession: () => mockSession,
  getUser: () => mockUser,
  getOrder: vi.fn(),
  getOrderItem: vi.fn(),
  getStorefrontItem: vi.fn(),
  getFinancialTransaction: vi.fn(),
  getAdminNotification: vi.fn()
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

const { TrainerAssignmentService } = await import('../../services/TrainerAssignmentService.mjs');

describe('TrainerAssignmentService Sequelize operators', () => {
  beforeEach(() => {
    sessionFindAll.mockReset();
    sessionFindAll.mockResolvedValue([]);
  });

  it('uses the imported Op helper for client assignment reads', async () => {
    const service = new TrainerAssignmentService();

    await expect(service.getClientAssignments(12)).resolves.toMatchObject({
      clientId: 12,
      totalSessions: 0,
      trainers: []
    });

    const where = sessionFindAll.mock.calls[0][0].where;
    expect(where.userId).toBe(12);
    expect(where.trainerId[Op.not]).toBeNull();
  });

  it('uses the imported Op helper for assignment removal filters', async () => {
    const service = new TrainerAssignmentService();

    await expect(service.removeTrainerAssignment([44], 1)).resolves.toMatchObject({
      success: true,
      unassigned: 0
    });

    const where = sessionFindAll.mock.calls[0][0].where;
    expect(where.id).toEqual([44]);
    expect(where.trainerId[Op.not]).toBeNull();
  });

  it('does not write null into assignment audit notes', async () => {
    const service = new TrainerAssignmentService();
    const session = {
      id: 55,
      notes: null,
      update: vi.fn()
    };

    await service.performSessionAssignment([session], 7, 1);

    const notes = session.update.mock.calls[0][0].notes;
    expect(notes).toContain('Assigned to trainer 7');
    expect(notes).not.toMatch(/^null\s*\|/);
  });

  it('does not write null into unassignment audit notes', async () => {
    const service = new TrainerAssignmentService();
    const session = {
      id: 56,
      notes: null,
      update: vi.fn()
    };
    sessionFindAll.mockResolvedValueOnce([session]);

    await service.removeTrainerAssignment([56], 1);

    const notes = session.update.mock.calls[0][0].notes;
    expect(notes).toContain('Trainer assignment removed by admin 1');
    expect(notes).not.toMatch(/^null\s*\|/);
  });
});
