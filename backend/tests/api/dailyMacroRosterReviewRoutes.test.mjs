import request from 'supertest';
import { Op } from 'sequelize';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeApp, mocks, resetRosterRouteMocks } from './dailyMacroRosterTriageRoutes.harness.mjs';

describe('coach-only nutrition review routes', () => {
  beforeEach(resetRosterRouteMocks);

  it('blocks clients from roster triage before assignment checks or macro queries', async () => {
    mocks.user = { id: 101, role: 'client' };

    const response = await request(makeApp())
      .get('/api/macros/roster-triage?date=2026-06-20&userIds=101');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Nutrition review access denied');
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(mocks.dailyMacroLogFindAll).not.toHaveBeenCalled();
  });

  it('blocks clients from the estimate review queue before assignment checks or macro queries', async () => {
    mocks.user = { id: 101, role: 'client' };

    const response = await request(makeApp())
      .get('/api/macros/review-queue?date=2026-06-20&userIds=101');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Nutrition review access denied');
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(mocks.dailyMacroLogFindAndCountAll).not.toHaveBeenCalled();
  });

  it('blocks clients from marking their own nutrition estimates verified', async () => {
    mocks.user = { id: 101, role: 'client' };

    const response = await request(makeApp())
      .patch('/api/macros/client-timeline/77/verify');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Nutrition review access denied');
    expect(mocks.dailyMacroLogFindOne).not.toHaveBeenCalled();
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
  });

  it('returns selected-client nutrition timeline entries after assignment checks', async () => {
    mocks.dailyMacroLogFindAll.mockResolvedValue([{
      id: 77,
      userId: 101,
      date: '2026-06-20',
      mealType: 'lunch',
      description: 'chicken bowl',
      calories: 620,
      protein: 44,
      source: 'photo',
      verified: false,
      createdAt: '2026-06-20T19:00:00.000Z',
    }]);

    const response = await request(makeApp())
      .get('/api/macros/client-timeline?date=2026-06-20&userId=101');

    expect(response.status).toBe(200);
    expect(mocks.assertAssignmentOrAdmin).toHaveBeenCalledWith(9001, 'admin', 101);
    const query = mocks.dailyMacroLogFindAll.mock.calls[0][0];
    expect(query.attributes).toEqual(expect.arrayContaining([
      'id', 'userId', 'date', 'mealType', 'description', 'calories', 'protein',
      'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'source', 'verified', 'createdAt',
    ]));
    expect(query.attributes).not.toContain('addedSugar');
    expect(response.body.entries).toEqual([
      expect.objectContaining({
        id: 77,
        mealType: 'lunch',
        description: 'chicken bowl',
        calories: 620,
        protein: 44,
        source: 'photo',
        verified: false,
      }),
    ]);
  });

  it('marks an assigned nutrition estimate verified through the coach review route', async () => {
    const update = vi.fn().mockResolvedValue({
      id: 77,
      userId: 101,
      mealType: 'lunch',
      description: 'chicken bowl',
      verified: true,
    });
    mocks.dailyMacroLogFindOne.mockResolvedValue({
      id: 77,
      userId: 101,
      mealType: 'lunch',
      description: 'chicken bowl',
      verified: false,
      update,
    });

    const response = await request(makeApp())
      .patch('/api/macros/client-timeline/77/verify');

    expect(response.status).toBe(200);
    const query = mocks.dailyMacroLogFindOne.mock.calls[0][0];
    expect(query.attributes).toEqual(expect.arrayContaining(['id', 'userId', 'verified', 'createdAt']));
    expect(query.attributes).not.toContain('addedSugar');
    expect(mocks.assertAssignmentOrAdmin).toHaveBeenCalledWith(9001, 'admin', 101);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      verified: true,
      reviewStatus: 'verified',
      reviewedByUserId: 9001,
      reviewedAt: expect.any(Date),
    }));
    expect(response.body.entry).toEqual(expect.objectContaining({
      id: 77,
      verified: true,
    }));
  });

  it('preserves the original reviewer receipt when verification is retried', async () => {
    const update = vi.fn();
    mocks.dailyMacroLogFindOne.mockResolvedValue({
      id: 77,
      userId: 101,
      mealType: 'lunch',
      description: 'chicken bowl',
      verified: true,
      reviewStatus: 'verified',
      reviewedByUserId: 55,
      reviewedAt: '2026-07-08T19:00:00.000Z',
      update,
    });

    const response = await request(makeApp())
      .patch('/api/macros/client-timeline/77/verify');

    expect(response.status).toBe(200);
    expect(update).not.toHaveBeenCalled();
    expect(response.body.entry).toEqual(expect.objectContaining({
      reviewedByUserId: 55,
      reviewedAt: '2026-07-08T19:00:00.000Z',
    }));
  });

  it('returns estimate review queue entries with a schema-tolerant column set', async () => {
    mocks.dailyMacroLogFindAndCountAll.mockResolvedValue({ count: 61, rows: [{
      id: 77,
      userId: 101,
      date: '2026-06-20',
      mealType: 'lunch',
      description: 'chicken bowl',
      calories: 620,
      protein: 44,
      source: 'photo',
      verified: false,
      createdAt: '2026-06-20T19:00:00.000Z',
    }] });

    const response = await request(makeApp())
      .get('/api/macros/review-queue?date=2026-06-20&userIds=101');

    expect(response.status).toBe(200);
    const query = mocks.dailyMacroLogFindAndCountAll.mock.calls[0][0];
    expect(query.attributes).toEqual(expect.arrayContaining([
      'id', 'userId', 'date', 'mealType', 'description', 'calories', 'protein',
      'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'source', 'verified', 'createdAt',
    ]));
    expect(query.attributes).not.toContain('addedSugar');
    expect(query.where.verified).toBe(false);
    expect(query.where[Op.or]).toEqual([
      { reviewStatus: 'needs_review' },
      {
        reviewStatus: null,
        source: { [Op.in]: ['ai_chat', 'barcode', 'photo', 'usda_lookup', 'voice'] },
      },
    ]);
    expect(response.body.entries).toEqual([
      expect.objectContaining({
        id: 77,
        userId: 101,
        source: 'photo',
        verified: false,
      }),
    ]);
    expect(response.body).toEqual(expect.objectContaining({
      total: 61,
      limit: 50,
      offset: 0,
      hasMore: true,
    }));
  });

  it('supports bounded queue pagination without silently hiding older clients', async () => {
    mocks.dailyMacroLogFindAndCountAll.mockResolvedValue({ count: 80, rows: [] });

    const response = await request(makeApp())
      .get('/api/macros/review-queue?date=2026-06-20&userIds=101&limit=25&offset=50');

    expect(response.status).toBe(200);
    expect(mocks.dailyMacroLogFindAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      limit: 25,
      offset: 50,
    }));
    expect(response.body).toEqual(expect.objectContaining({
      total: 80,
      limit: 25,
      offset: 50,
      hasMore: true,
    }));
  });

  it('rejects future estimate review queue dates before assignment checks or macro queries', async () => {
    const response = await request(makeApp())
      .get('/api/macros/review-queue?date=9999-12-31&userIds=101');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Future date');
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(mocks.dailyMacroLogFindAndCountAll).not.toHaveBeenCalled();
  });

  it('rejects future client timeline dates before assignment checks or macro queries', async () => {
    const response = await request(makeApp())
      .get('/api/macros/client-timeline?date=9999-12-31&userId=101');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Future date');
    expect(mocks.assertAssignmentOrAdmin).not.toHaveBeenCalled();
    expect(mocks.dailyMacroLogFindAll).not.toHaveBeenCalled();
  });

  it('returns safe fixed copy when the estimate review queue query fails', async () => {
    mocks.dailyMacroLogFindAndCountAll.mockRejectedValue(new Error('SQLSTATE raw tenant trace'));

    const response = await request(makeApp())
      .get('/api/macros/review-queue?date=2026-06-20&userIds=101');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      success: false,
      error: 'Failed to get nutrition review queue',
    });
    expect(JSON.stringify(response.body)).not.toMatch(/SQLSTATE|tenant trace/i);
  });
});
