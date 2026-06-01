import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosMocks = vi.hoisted(() => ({
  axiosInstance: {
    get: vi.fn()
  },
  authAxiosInstance: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn()
  }
}));

vi.mock('../utils/axiosConfig', () => axiosMocks);

import sessionService from './session-service';

describe('legacy global session-service lifecycle routes', () => {
  beforeEach(() => {
    axiosMocks.authAxiosInstance.post.mockResolvedValue({
      data: {
        message: 'Session booked successfully',
        session: { id: '42' }
      }
    });
    axiosMocks.authAxiosInstance.patch.mockResolvedValue({
      data: {
        message: 'Session cancelled successfully',
        session: { id: '42' }
      }
    });
    vi.clearAllMocks();
  });

  it('books through the unified session booking route', async () => {
    await sessionService.bookSession('42');

    expect(axiosMocks.authAxiosInstance.post).toHaveBeenCalledWith('/api/sessions/42/book', {});
    expect(axiosMocks.authAxiosInstance.post).not.toHaveBeenCalledWith('/api/sessions/book', {
      sessionId: '42'
    });
  });

  it('cancels through the unified PATCH cancellation route', async () => {
    await sessionService.cancelSession('42', 'Client requested cancellation');

    expect(axiosMocks.authAxiosInstance.patch).toHaveBeenCalledWith('/api/sessions/42/cancel', {
      reason: 'Client requested cancellation'
    });
    expect(axiosMocks.authAxiosInstance.post).not.toHaveBeenCalled();
  });
});
