import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
}));

const loggerMock = vi.hoisted(() => ({
  warn: vi.fn(),
  log: vi.fn(),
}));

vi.mock('./api.service', () => ({
  default: apiMock,
}));

vi.mock('@/utils/logger', () => ({
  logger: loggerMock,
}));

const { UniversalMasterScheduleService } = await import('./universal-master-schedule-service');

describe('UniversalMasterScheduleService editable session updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes wrapped session list responses from GET /api/sessions', async () => {
    const sessions = [
      {
        id: '42',
        status: 'confirmed',
        sessionDate: '2026-06-26T15:00:00.000Z',
      },
    ];

    apiMock.get.mockResolvedValue({
      data: {
        success: true,
        sessions,
      },
    });

    const service = new UniversalMasterScheduleService();

    await expect(service.getSessions({ status: 'confirmed' })).resolves.toEqual(sessions);
    expect(apiMock.get).toHaveBeenCalledWith('/api/sessions?status=confirmed');
  });

  it('rejects non-list session responses before Redux stats filtering without a console error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    apiMock.get.mockResolvedValue({
      data: {
        success: false,
        message: 'Server error fetching sessions',
      },
    });

    const service = new UniversalMasterScheduleService();

    try {
      await expect(service.getSessions()).rejects.toThrow(
        /Invalid sessions response from \/api\/sessions/
      );
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(loggerMock.warn).toHaveBeenCalledWith(
        'Sessions endpoint returned an invalid list response:',
        expect.any(Error)
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
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
