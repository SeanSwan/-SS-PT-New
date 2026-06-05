import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceSource = readFileSync(resolve(__dirname, './session-service.ts'), 'utf8');

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
    axiosMocks.axiosInstance.get.mockResolvedValue({
      data: [
        {
          id: 10,
          name: 'SwanStudios 10-Pack',
          description: '10 personal training sessions.',
          sessions: 10,
          price: 1750,
          savings: 0,
          popular: false
        }
      ]
    });
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

  it('matches the numeric StorefrontItem contract for direct session packages', async () => {
    expect(serviceSource).toContain('id: number;');
    expect(serviceSource).toContain('async purchaseSessionPackage(packageId: number | string)');

    const packages = await sessionService.getSessionPackages();

    expect(packages.data?.[0].id).toBe(10);
    await sessionService.purchaseSessionPackage(10);
    expect(axiosMocks.authAxiosInstance.post).toHaveBeenCalledWith('/api/session-packages/purchase', {
      packageId: 10
    });
  });
});
