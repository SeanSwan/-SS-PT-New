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
    sequelize: { transaction: vi.fn() },
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
  NutritionDraftValidationError,
  saveReviewedNutritionDraft,
} from '../../services/nutrition/reviewedNutritionDraftService.mjs';

const draft = {
  contractVersion: '1.0',
  draftId: 'draft-atomic-1',
  date: '2026-07-09',
  userId: 7,
  loggedByUserId: 7,
  source: 'barcode',
  sourceLabel: 'Barcode scanner',
  sourceConfidence: 'provider',
  workoutProximity: 'post_workout',
  rawPayloadRef: {
    provider: 'Open Food Facts',
    barcode: '049000042566',
    externalId: '22',
    forbiddenRawPayload: 'must not persist',
  },
  foods: [
    {
      id: 'food-1',
      description: 'Protein Bites',
      mealType: 'snack',
      serving: { basis: 'label', quantity: 30, unit: 'g', label: '30 g' },
      nutrients: { calories: 120, protein: 3, carbs: 15, fat: 6, fiber: 1.5, sugar: 4, sodium: 90 },
      confidence: 0.82,
      provider: 'Open Food Facts',
    },
    {
      id: 'food-2',
      description: 'Banana',
      mealType: 'snack',
      serving: { basis: 'household', quantity: 1, unit: 'item', label: '1 medium' },
      nutrients: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14, sodium: 1 },
      confidence: 0.9,
      provider: 'USDA',
    },
  ],
};

describe('reviewedNutritionDraftService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation((callback) => callback('nutrition-tx'));
    mocks.sourceFindOrCreate.mockResolvedValue([{
      id: 90,
      update: mocks.sourceUpdate,
    }, true]);
    mocks.sourceUpdate.mockResolvedValue(undefined);
    mocks.macroCreate
      .mockResolvedValueOnce({ id: 101, calories: 120 })
      .mockResolvedValueOnce({ id: 102, calories: 105 });
  });

  it('commits all foods and provenance inside one transaction', async () => {
    const result = await saveReviewedNutritionDraft(draft, { userId: 7, loggedByUserId: 7 });

    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.sourceFindOrCreate).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 7, draftId: 'draft-atomic-1' },
      defaults: expect.objectContaining({
        contractVersion: '1.0',
        source: 'barcode',
        payloadDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
        rawPayloadRef: {
          provider: 'Open Food Facts',
          barcode: '049000042566',
          externalId: '22',
        },
      }),
      transaction: 'nutrition-tx',
    }));
    expect(mocks.macroCreate).toHaveBeenCalledTimes(2);
    expect(mocks.macroCreate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      userId: 7,
      loggedByUserId: 7,
      sourceRecordId: 90,
      draftId: 'draft-atomic-1',
      contractVersion: '1.0',
      servingBasis: 'label',
      servingQuantity: 30,
      servingUnit: 'g',
      caloriesReported: 120,
      caloriesCalculated: 126,
      reconciliationStatus: 'within_tolerance',
      confidenceScore: 0.6,
      reviewStatus: 'needs_review',
    }), { transaction: 'nutrition-tx' });
    expect(mocks.sourceUpdate).toHaveBeenCalledWith({
      status: 'committed',
      entryCount: 2,
    }, { transaction: 'nutrition-tx' });
    expect(result).toMatchObject({ replayed: false, entries: [{ id: 101 }, { id: 102 }] });
  });

  it('replays an already-committed draft without creating duplicate macro rows', async () => {
    mocks.sourceFindOrCreate.mockImplementation(async ({ defaults }) => [{
      id: 90, payloadDigest: defaults.payloadDigest,
      status: 'committed', entryCount: 2,
    }, false]);
    mocks.macroFindAll.mockResolvedValue([{ id: 101 }, { id: 102 }]);

    const result = await saveReviewedNutritionDraft(draft, { userId: 7, loggedByUserId: 7 });

    expect(mocks.macroCreate).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({
      replayed: true,
      entries: [{ id: 101 }, { id: 102 }],
    }));
  });

  it('rejects client attempts to save a draft for another user', async () => {
    await expect(saveReviewedNutritionDraft({ ...draft, userId: 999 }, {
      userId: 7,
      loggedByUserId: 7,
    })).rejects.toBeInstanceOf(NutritionDraftValidationError);

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('rejects coercive draft identities before starting a transaction', async () => {
    await expect(saveReviewedNutritionDraft({ ...draft, userId: ['7'] }, {
      userId: 7,
      loggedByUserId: 7,
    })).rejects.toBeInstanceOf(NutritionDraftValidationError);

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('derives trust from the capture source instead of accepting client-claimed verification', async () => {
    await saveReviewedNutritionDraft({
      ...draft,
      source: 'manual',
      sourceConfidence: 'verified',
      foods: [draft.foods[0]],
    }, { userId: 7, loggedByUserId: 7 });

    expect(mocks.sourceFindOrCreate).toHaveBeenCalledWith(expect.objectContaining({
      defaults: expect.objectContaining({
        sourceConfidence: 'community',
        confidenceScore: 0.6,
      }),
    }));
    expect(mocks.macroCreate).toHaveBeenCalledWith(expect.objectContaining({
      reviewReason: null,
      reviewStatus: 'client_confirmed',
      confidenceScore: 0.6,
      verified: false,
    }), { transaction: 'nutrition-tx' });
  });

  it('routes unverified AI estimates into the coach review queue', async () => {
    await saveReviewedNutritionDraft({
      ...draft,
      source: 'voice',
      sourceConfidence: 'verified',
      reviewReason: 'provider_estimate',
      foods: [{
        ...draft.foods[0],
        confidence: 1,
      }],
    }, { userId: 7, loggedByUserId: 7 });

    expect(mocks.sourceFindOrCreate).toHaveBeenCalledWith(expect.objectContaining({
      defaults: expect.objectContaining({
        sourceConfidence: 'ai_estimate',
        confidenceScore: 0.45,
      }),
    }));
    expect(mocks.macroCreate).toHaveBeenCalledWith(expect.objectContaining({
      reviewReason: 'unverified_estimate',
      reviewStatus: 'needs_review',
      confidenceScore: 0.45,
      verified: false,
    }), { transaction: 'nutrition-tx' });
  });

  it('does not persist zero as a meaningful serving quantity', async () => {
    await saveReviewedNutritionDraft({
      ...draft,
      foods: [{
        ...draft.foods[0],
        serving: { ...draft.foods[0].serving, quantity: 0 },
      }],
    }, { userId: 7, loggedByUserId: 7 });

    expect(mocks.macroCreate).toHaveBeenCalledWith(expect.objectContaining({
      servingQuantity: null,
    }), { transaction: 'nutrition-tx' });
  });

  it('propagates a row failure so the transaction can roll back the whole draft', async () => {
    mocks.macroCreate
      .mockReset()
      .mockResolvedValueOnce({ id: 101 })
      .mockRejectedValueOnce(new Error('second row failed'));

    await expect(saveReviewedNutritionDraft(draft, {
      userId: 7,
      loggedByUserId: 7,
    })).rejects.toThrow('second row failed');

    expect(mocks.sourceUpdate).not.toHaveBeenCalled();
  });
});
