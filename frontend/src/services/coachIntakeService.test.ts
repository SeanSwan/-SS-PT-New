import { describe, expect, it, vi } from 'vitest';
import apiService from './api.service';
import {
  getCoachIntakeHealth,
  getCoachIntakeRetention,
  getCoachIntakeRetentionPurgePlan,
} from './coachIntakeService';

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

  it('fetches the PII-safe Coach intake retention endpoint', async () => {
    vi.mocked(apiService.get).mockResolvedValue({
      data: {
        success: true,
        retention: {
          status: 'attention',
          schemaReady: true,
          summary: {
            totalWithRawArtifacts: 5,
            purgeReady: 2,
            reviewRequired: 1,
            retained: 2,
          },
          nextOperatorAction: {
            key: 'review_purge_candidates',
            label: 'Review raw artifact purge candidates',
          },
        },
      },
    });

    const retention = await getCoachIntakeRetention();

    expect(apiService.get).toHaveBeenCalledWith('/api/coach/intake/retention');
    expect(retention).toMatchObject({
      status: 'attention',
      summary: { purgeReady: 2, reviewRequired: 1 },
      nextOperatorAction: { key: 'review_purge_candidates' },
    });
  });

  it('fetches the dry-run Coach intake retention purge plan endpoint', async () => {
    vi.mocked(apiService.get).mockResolvedValue({
      data: {
        success: true,
        purgePlan: {
          enabled: false,
          dryRun: true,
          schemaReady: true,
          purgeReady: 2,
          purged: 0,
          skippedReason: 'disabled',
          candidateIds: ['11111111-1111-4111-8111-111111111111'],
          transcript: 'Do Not Return',
        },
      },
    });

    const purgePlan = await getCoachIntakeRetentionPurgePlan();

    expect(apiService.get).toHaveBeenCalledWith('/api/coach/intake/retention/purge-plan');
    expect(purgePlan).toMatchObject({
      enabled: false,
      dryRun: true,
      purgeReady: 2,
      skippedReason: 'disabled',
    });
    expect(JSON.stringify(purgePlan)).not.toMatch(/candidateIds|11111111|payload_cipher|transcript|Do Not Return/i);
  });
});
