import { describe, expect, it, vi } from 'vitest';
import apiService from './api.service';
import { getCoachIntakeHealth } from './coachIntakeService';

vi.mock('./api.service', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('coachIntakeService', () => {
  it('fetches the PII-safe Coach intake health endpoint', async () => {
    vi.mocked(apiService.get).mockResolvedValue({
      data: {
        success: true,
        health: {
          status: 'degraded',
          schemaReady: true,
          counts: {
            total: 4,
            actionable: 3,
            readyReview: 1,
            failed: 1,
            needsClient: 2,
            stuckProcessing: 1,
          },
          nextOperatorAction: {
            key: 'inspect_stuck_processing',
            label: 'Inspect stuck processing intake',
          },
        },
      },
    });

    const health = await getCoachIntakeHealth();

    expect(apiService.get).toHaveBeenCalledWith('/api/coach/intake/health');
    expect(health).toMatchObject({
      status: 'degraded',
      counts: { stuckProcessing: 1 },
      nextOperatorAction: { key: 'inspect_stuck_processing' },
    });
  });
});
