import { beforeEach, describe, expect, it, vi } from 'vitest';

const dashboardMocks = vi.hoisted(() => {
  const apiClient = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    }
  };

  return {
    apiClient,
    axiosCreate: vi.fn(() => apiClient),
    io: vi.fn()
  };
});

vi.mock('axios', () => ({
  default: {
    create: dashboardMocks.axiosCreate
  }
}));

vi.mock('socket.io-client', () => ({
  io: dashboardMocks.io
}));

import clientDashboardService from './enhancedClientDashboardService';

describe('enhanced client dashboard schedule service routes', () => {
  beforeEach(() => {
    dashboardMocks.apiClient.post.mockResolvedValue({
      data: {
        session: {
          id: '42',
          title: 'Training',
          start: '2026-05-30T10:00:00.000Z',
          end: '2026-05-30T11:00:00.000Z',
          status: 'scheduled'
        }
      }
    });
    dashboardMocks.apiClient.patch.mockResolvedValue({ data: { success: true } });
    vi.clearAllMocks();
  });

  it('books through the unified session booking route', async () => {
    await clientDashboardService.bookSession('42');

    expect(dashboardMocks.apiClient.post).toHaveBeenCalledWith('/api/sessions/42/book', {});
    expect(dashboardMocks.apiClient.post).not.toHaveBeenCalledWith('/api/schedule/book', {
      sessionId: '42'
    });
  });

  it('cancels through the unified session cancellation route', async () => {
    await clientDashboardService.cancelSession('42');

    expect(dashboardMocks.apiClient.patch).toHaveBeenCalledWith('/api/sessions/42/cancel', {
      reason: 'Cancelled from client dashboard'
    });
    expect(dashboardMocks.apiClient.post).not.toHaveBeenCalled();
  });
});
