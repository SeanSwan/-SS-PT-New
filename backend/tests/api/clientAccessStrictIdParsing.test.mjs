import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const User = {
    findByPk: vi.fn(async () => ({ id: 1, role: 'client' })),
  };
  const ClientTrainerAssignment = {
    findOne: vi.fn(async () => ({ id: 1 })),
  };
  return { User, ClientTrainerAssignment };
});

vi.mock('../../models/index.mjs', () => ({
  getAllModels: () => ({
    User: mocks.User,
    ClientTrainerAssignment: mocks.ClientTrainerAssignment,
  }),
}));

const { ensureClientAccess } = await import('../../utils/clientAccess.mjs');

describe('clientAccess strict ID parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects ambiguous client IDs before model lookup', async () => {
    const ambiguousInputs = [true, ' 1', '01', '1e2', '1.0', {}, []];

    for (const input of ambiguousInputs) {
      const result = await ensureClientAccess({ user: { id: 9, role: 'admin' } }, input);
      expect(result).toMatchObject({ allowed: false, status: 400 });
    }

    expect(mocks.User.findByPk).not.toHaveBeenCalled();
    expect(mocks.ClientTrainerAssignment.findOne).not.toHaveBeenCalled();
  });

  it('rejects ambiguous requester IDs before model lookup', async () => {
    const result = await ensureClientAccess({ user: { id: true, role: 'admin' } }, '42');

    expect(result).toMatchObject({ allowed: false, status: 401 });
    expect(mocks.User.findByPk).not.toHaveBeenCalled();
    expect(mocks.ClientTrainerAssignment.findOne).not.toHaveBeenCalled();
  });
});
