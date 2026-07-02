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

describe('clientAccess client-equivalent role handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows a raw user requester to read their own client current-workout surface', async () => {
    mocks.User.findByPk.mockResolvedValueOnce({ id: 42, role: 'client' });

    const result = await ensureClientAccess({ user: { id: 42, role: 'user' } }, '42');

    expect(result).toMatchObject({ allowed: true, clientId: 42 });
    expect(mocks.ClientTrainerAssignment.findOne).not.toHaveBeenCalled();
  });

  it('treats persisted user-role client records as client-equivalent for assigned trainers', async () => {
    mocks.User.findByPk.mockResolvedValueOnce({ id: 42, role: 'user' });
    mocks.ClientTrainerAssignment.findOne.mockResolvedValueOnce({ id: 9 });

    const result = await ensureClientAccess({ user: { id: 7, role: 'trainer' } }, 42);

    expect(result).toMatchObject({ allowed: true, clientId: 42 });
    expect(mocks.ClientTrainerAssignment.findOne).toHaveBeenCalledWith({
      where: { clientId: 42, trainerId: 7, status: 'active' },
    });
  });

  it('still rejects raw user cross-client access before trainer assignment checks', async () => {
    mocks.User.findByPk.mockResolvedValueOnce({ id: 43, role: 'user' });

    const result = await ensureClientAccess({ user: { id: 42, role: 'user' } }, '43');

    expect(result).toMatchObject({ allowed: false, status: 403 });
    expect(mocks.ClientTrainerAssignment.findOne).not.toHaveBeenCalled();
  });
});
