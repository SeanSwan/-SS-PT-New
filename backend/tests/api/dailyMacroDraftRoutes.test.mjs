import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
}));

vi.mock('../../services/nutrition/reviewedNutritionDraftService.mjs', () => {
  class NutritionDraftValidationError extends Error {}
  class NutritionDraftConflictError extends Error {}
  return {
    NutritionDraftValidationError,
    NutritionDraftConflictError,
    saveReviewedNutritionDraft: mocks.save,
  };
});

vi.mock('../../utils/logger.mjs', () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import dailyMacroDraftRoutes from '../../routes/dailyMacroDraftRoutes.mjs';
import {
  NutritionDraftConflictError,
  NutritionDraftValidationError,
} from '../../services/nutrition/reviewedNutritionDraftService.mjs';

const makeApp = () => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = { id: 7, role: 'client' };
    next();
  });
  app.use('/api/macros/drafts', dailyMacroDraftRoutes);
  return app;
};

describe('daily macro draft route', () => {
  beforeEach(() => {
    mocks.save.mockReset();
  });

  it('returns 201 for a new atomic draft and 200 for an idempotent replay', async () => {
    mocks.save
      .mockResolvedValueOnce({ replayed: false, entries: [{ id: 101 }] })
      .mockResolvedValueOnce({ replayed: true, entries: [{ id: 101 }] });

    const first = await request(makeApp()).post('/api/macros/drafts').send({ draftId: 'draft-1' });
    const replay = await request(makeApp()).post('/api/macros/drafts').send({ draftId: 'draft-1' });

    expect(first.status).toBe(201);
    expect(replay.status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith({ draftId: 'draft-1' }, {
      userId: 7,
      loggedByUserId: 7,
    });
  });

  it('maps validation and in-progress conflicts to safe client responses', async () => {
    mocks.save.mockRejectedValueOnce(new NutritionDraftValidationError('bad private detail'));
    const invalid = await request(makeApp()).post('/api/macros/drafts').send({});
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe('Nutrition draft is invalid. Review the entry and try again.');

    mocks.save.mockRejectedValueOnce(new NutritionDraftConflictError('raw lock detail'));
    const conflict = await request(makeApp()).post('/api/macros/drafts').send({});
    expect(conflict.status).toBe(409);
    expect(conflict.body.error).toBe('This nutrition draft is already being saved. Try again in a moment.');
  });
});
