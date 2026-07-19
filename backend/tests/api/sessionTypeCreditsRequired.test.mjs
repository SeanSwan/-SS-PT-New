import { beforeEach, describe, expect, it, vi } from 'vitest';

const SessionType = {
  max: vi.fn(),
  create: vi.fn(),
  findByPk: vi.fn(),
};

vi.mock('../../models/index.mjs', () => ({
  getModel: vi.fn(() => SessionType),
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: {
    error: vi.fn(),
  },
}));

const {
  createSessionType,
  updateSessionType,
} = await import('../../controllers/sessionTypeController.mjs');

function response() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

describe('session type credit-cost API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    SessionType.max.mockResolvedValue(0);
  });

  it('persists an exact multi-credit cost when an admin creates a type', async () => {
    SessionType.create.mockImplementation(async (payload) => payload);
    const res = response();

    await createSessionType({
      body: { name: 'Partner Training', duration: 60, creditsRequired: 2 },
    }, res);

    expect(SessionType.create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Partner Training',
      creditsRequired: 2,
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it.each([-1, 1.5, 'two'])('rejects invalid credit cost %p', async (creditsRequired) => {
    const res = response();

    await createSessionType({
      body: { name: 'Invalid Type', creditsRequired },
    }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(SessionType.create).not.toHaveBeenCalled();
  });

  it('allows an admin to change a type to a zero-credit assessment', async () => {
    const sessionType = {
      name: 'Assessment',
      creditsRequired: 1,
      update: vi.fn().mockResolvedValue(undefined),
    };
    SessionType.findByPk.mockResolvedValue(sessionType);
    const res = response();

    await updateSessionType({
      params: { id: '4' },
      body: { creditsRequired: 0 },
    }, res);

    expect(sessionType.update).toHaveBeenCalledWith(expect.objectContaining({
      creditsRequired: 0,
    }));
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
