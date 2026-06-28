import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('./api.service', () => ({
  default: apiMock,
}));

vi.mock('@/utils/logger', () => ({
  logger: { warn: vi.fn(), log: vi.fn() },
}));

const { UniversalMasterScheduleService } = await import('./universal-master-schedule-service');

describe('UniversalMasterScheduleService schedule AI proposal API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts schedule AI proposal requests through the canonical schedule service', async () => {
    apiMock.post.mockResolvedValue({
      data: {
        success: true,
        type: 'proposal_generated',
        proposal: { id: 'p1', action: 'draft_booking' },
      },
    });

    const service = new UniversalMasterScheduleService();
    const result = await service.createScheduleAiProposal({
      message: 'Find an opening tomorrow',
      context: { surface: 'universal_master_schedule', mode: 'admin' },
    });

    expect(apiMock.post).toHaveBeenCalledWith('/api/schedule-ai/proposals', {
      message: 'Find an opening tomorrow',
      context: { surface: 'universal_master_schedule', mode: 'admin' },
    });
    expect(result).toMatchObject({
      success: true,
      proposal: { action: 'draft_booking' },
    });
  });
});
