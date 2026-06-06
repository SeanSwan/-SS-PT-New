import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
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

  it('completes through the backend PATCH lifecycle endpoint', async () => {
    await sessionService.completeSession('42', 'Strong session');

    expect(apiMock.patch).toHaveBeenCalledWith('/api/sessions/42/complete', {
      notes: 'Strong session',
      completeWithoutLog: true
    });
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
});
