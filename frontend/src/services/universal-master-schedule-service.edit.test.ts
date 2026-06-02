import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
}));

vi.mock('./api.service', () => ({
  default: apiMock,
}));

const { UniversalMasterScheduleService } = await import('./universal-master-schedule-service');

describe('UniversalMasterScheduleService editable session updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends editable session detail fields through PUT /api/sessions/:id', async () => {
    apiMock.put.mockResolvedValue({
      data: {
        success: true,
        session: {
          id: '42',
          sessionDate: '2026-06-15T16:45:00.000Z',
          duration: 45,
          location: 'Park',
          notifyClient: false,
        },
      },
    });

    const service = new UniversalMasterScheduleService();
    const updated = await service.updateSession('42', {
      sessionDate: '2026-06-15T16:45:00.000Z',
      duration: 45,
      location: 'Park',
      notes: 'Bring bands',
      notifyClient: false,
    });

    expect(apiMock.put).toHaveBeenCalledWith('/api/sessions/42', {
      sessionDate: '2026-06-15T16:45:00.000Z',
      duration: 45,
      location: 'Park',
      notes: 'Bring bands',
      notifyClient: false,
    });
    expect(updated).toMatchObject({
      id: '42',
      duration: 45,
      location: 'Park',
    });
  });
});
