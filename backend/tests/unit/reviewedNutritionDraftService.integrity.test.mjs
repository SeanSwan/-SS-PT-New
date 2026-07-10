import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  sourceFindOrCreate: vi.fn(),
  sourceUpdate: vi.fn(),
  macroCreate: vi.fn(),
  macroFindAll: vi.fn(),
}));

vi.mock('../../database.mjs', () => ({
  default: { transaction: mocks.transaction },
}));
vi.mock('../../models/NutritionSourceRecord.mjs', () => ({
  default: { findOrCreate: mocks.sourceFindOrCreate },
}));
vi.mock('../../models/DailyMacroLog.mjs', () => ({
  default: {
    create: mocks.macroCreate,
    findAll: mocks.macroFindAll,
  },
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
  NutritionDraftConflictError,
  NutritionDraftValidationError,
  saveReviewedNutritionDraft,
} from '../../services/nutrition/reviewedNutritionDraftService.mjs';

const baseDraft = {
  contractVersion: '1.0',
  draftId: 'integrity-draft-1',
  date: '2026-07-09',
  userId: 7,
  loggedByUserId: 7,
  source: 'search',
  sourceLabel: 'Food Search',
  sourceConfidence: 'verified',
  workoutProximity: 'none',
  rawPayloadRef: { provider: 'USDA', externalId: 'fdc-123' },
  foods: [{
    id: 'food-1',
    description: 'Greek yogurt',
    mealType: 'snack',
    serving: { basis: 'label', quantity: 170, unit: 'g', label: '170 g' },
    nutrients: {
      calories: 120,
      protein: 17,
      carbs: 8,
      fat: 2,
      fiber: 0,
      sugar: 6,
      sodium: 65,
    },
    confidence: 1,
    provider: 'USDA',
  }],
};

describe('reviewed nutrition draft integrity policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation((callback) => callback('tx'));
    mocks.sourceFindOrCreate.mockResolvedValue([{
      id: 90,
      update: mocks.sourceUpdate,
    }, true]);
    mocks.sourceUpdate.mockResolvedValue(undefined);
    mocks.macroCreate.mockImplementation(async (attributes) => ({ id: 101, ...attributes }));
  });

  it('rejects provider-grade source claims without a durable provider reference', async () => {
    await expect(saveReviewedNutritionDraft({
      ...baseDraft,
      rawPayloadRef: null,
    }, { userId: 7, loggedByUserId: 7 })).rejects.toBeInstanceOf(NutritionDraftValidationError);

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('does not let a caller-provided reason suppress metabolic reconciliation', async () => {
    await saveReviewedNutritionDraft({
      ...baseDraft,
      reviewReason: 'provider_estimate',
      foods: [{
        ...baseDraft.foods[0],
        nutrients: { ...baseDraft.foods[0].nutrients, calories: 500, protein: 0, carbs: 0, fat: 0 },
      }],
    }, { userId: 7, loggedByUserId: 7 });

    expect(mocks.macroCreate).toHaveBeenCalledWith(expect.objectContaining({
      reviewReason: 'metabolic_deviation',
      reviewStatus: 'needs_review',
    }), { transaction: 'tx' });
  });

  it('downgrades Open Food Facts community data and queues it for review', async () => {
    await saveReviewedNutritionDraft({
      ...baseDraft,
      rawPayloadRef: { provider: 'Open Food Facts', externalId: 'off-123' },
      foods: [{ ...baseDraft.foods[0], provider: 'Open Food Facts' }],
    }, { userId: 7, loggedByUserId: 7 });

    expect(mocks.sourceFindOrCreate).toHaveBeenCalledWith(expect.objectContaining({
      defaults: expect.objectContaining({
        sourceConfidence: 'community',
        confidenceScore: 0.6,
      }),
    }));
    expect(mocks.macroCreate).toHaveBeenCalledWith(expect.objectContaining({
      reviewReason: 'unverified_estimate',
      reviewStatus: 'needs_review',
      confidenceScore: 0.6,
    }), { transaction: 'tx' });
  });

  it('rejects a changed payload that reuses an already-committed draft id', async () => {
    mocks.sourceFindOrCreate.mockResolvedValue([{
      id: 90,
      payloadDigest: '0'.repeat(64),
      status: 'committed',
      entryCount: 1,
    }, false]);
    mocks.macroFindAll.mockResolvedValue([{ id: 101 }]);

    await expect(saveReviewedNutritionDraft(baseDraft, {
      userId: 7,
      loggedByUserId: 7,
    })).rejects.toBeInstanceOf(NutritionDraftConflictError);
    expect(mocks.macroFindAll).not.toHaveBeenCalled();
  });

  it('rejects replay when committed row count no longer matches the receipt', async () => {
    mocks.sourceFindOrCreate.mockImplementation(async ({ defaults }) => [{
      id: 90,
      payloadDigest: defaults.payloadDigest,
      status: 'committed',
      entryCount: 2,
    }, false]);
    mocks.macroFindAll.mockResolvedValue([{ id: 101 }]);

    await expect(saveReviewedNutritionDraft(baseDraft, {
      userId: 7,
      loggedByUserId: 7,
    })).rejects.toBeInstanceOf(NutritionDraftConflictError);
  });

  it('returns a bounded save receipt instead of model ciphertext or meal text', async () => {
    mocks.macroCreate.mockImplementation(async (attributes) => ({
      id: 101,
      ...attributes,
      description: '$SSE$ciphertext',
    }));

    const result = await saveReviewedNutritionDraft(baseDraft, {
      userId: 7,
      loggedByUserId: 7,
    });

    expect(result.entries).toEqual([expect.objectContaining({
      id: 101,
      reviewStatus: 'client_confirmed',
    })]);
    expect(result.entries[0]).not.toHaveProperty('description');
    expect(JSON.stringify(result)).not.toContain('$SSE$');
  });
});
