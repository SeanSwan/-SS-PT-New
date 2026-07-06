import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
}));

vi.mock('./api.service', () => ({
  default: apiMock
}));

import sessionService from './sessionService';

describe('sessionService lifecycle route contract', () => {
  beforeEach(() => {
    apiMock.get.mockResolvedValue({ data: [] });
    apiMock.post.mockResolvedValue({ data: { hasHardConflicts: false } });
    apiMock.patch.mockResolvedValue({ data: { id: 42 } });
    apiMock.put.mockResolvedValue({ data: { id: 42 } });
    apiMock.delete.mockResolvedValue({ data: undefined });
    vi.clearAllMocks();
  });

  it('confirms through the backend PATCH lifecycle endpoint', async () => {
    await sessionService.confirmSession('42');

    expect(apiMock.patch).toHaveBeenCalledWith('/api/sessions/42/confirm');
    expect(apiMock.put).not.toHaveBeenCalled();
  });

  it('cancels through the backend PATCH lifecycle endpoint with billing options preserved', async () => {
    await sessionService.cancelSession('42', 'Client cancelled early');

    expect(apiMock.patch).toHaveBeenCalledWith('/api/sessions/42/cancel', {
      reason: 'Client cancelled early'
    });
    expect(apiMock.put).not.toHaveBeenCalled();
  });

  it('completes through the backend PATCH lifecycle endpoint letting the server decide billing', async () => {
    await sessionService.completeSession('42', 'Strong session');

    // No deductSessionCredit key: an explicit false is a waive request that
    // requires a recorded reason (server-side completion billing, Slice 0.1).
    expect(apiMock.patch).toHaveBeenCalledWith('/api/sessions/42/complete', {
      notes: 'Strong session',
      completeWithoutLog: true
    });
    const [, payload] = apiMock.patch.mock.calls[0];
    expect(payload).not.toHaveProperty('deductSessionCredit');
    expect(apiMock.put).not.toHaveBeenCalled();
  });

  it('assigns trainers through the backend PATCH lifecycle endpoint', async () => {
    await sessionService.assignSessionToTrainer('42', '7');

    expect(apiMock.patch).toHaveBeenCalledWith('/api/sessions/42/assign', {
      trainerId: '7'
    });
    expect(apiMock.put).not.toHaveBeenCalled();
  });

  it('treats delete as a soft cancellation because the backend has no DELETE session route', async () => {
    await sessionService.deleteSession('42');

    expect(apiMock.patch).toHaveBeenCalledWith('/api/sessions/42/cancel', {
      reason: 'Deleted from schedule'
    });
    expect(apiMock.delete).not.toHaveBeenCalled();
  });

  it('gets date-range sessions through canonical query params instead of a colliding named route', async () => {
    await sessionService.getSessionsByDateRange('2026-06-01', '2026-06-07');

    expect(apiMock.get).toHaveBeenCalledWith('/api/sessions?startDate=2026-06-01&endDate=2026-06-07');
    expect(apiMock.get).not.toHaveBeenCalledWith(expect.stringContaining('/api/sessions/date-range'));
  });

  it('bulk deletes through the canonical DELETE bulk endpoint', async () => {
    await sessionService.bulkDeleteSessions(['42', '43']);

    expect(apiMock.delete).toHaveBeenCalledWith('/api/sessions/bulk', {
      data: { sessionIds: ['42', '43'] }
    });
    expect(apiMock.post).not.toHaveBeenCalledWith('/api/sessions/bulk-delete', expect.anything());
  });

  it('gets session statistics through the unified stats endpoint and returns the stats payload', async () => {
    apiMock.get.mockResolvedValueOnce({
      data: {
        success: true,
        stats: { totalSessions: 3, completedSessions: 2 }
      }
    });

    const stats = await sessionService.getSessionStatistics();

    expect(apiMock.get).toHaveBeenCalledWith('/api/sessions/stats');
    expect(stats).toEqual({ totalSessions: 3, completedSessions: 2 });
  });

  it('checks availability through the canonical conflict endpoint', async () => {
    const start = new Date('2026-06-01T09:00:00.000Z');
    const end = new Date('2026-06-01T10:00:00.000Z');

    const available = await sessionService.checkSessionAvailability(start, end, '7');

    expect(apiMock.post).toHaveBeenCalledWith('/api/sessions/check-conflicts', {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      trainerId: '7'
    });
    expect(available).toBe(true);
  });
});
