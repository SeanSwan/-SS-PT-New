/**
 * AI data-write macro log contract
 *
 * Locks AI macro_log writes to the canonical ORM path's sanitization: date
 * fallback/rejection, untrusted source/mealType, copy scrub, malformed-number
 * rejection, and FDA flag computation. S0.7 (2026-08-04): the raw-SQL INSERT
 * was collapsed into buildMacroRow + DailyMacroLog.create, so the capture
 * point moved from sequelize.query replacements to DailyMacroLog.create.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
vi.mock('../../services/encryption/encryptionService.mjs', () => ({
  encrypt: vi.fn((value) => value),
}));
const macroCreateMock = vi.hoisted(() => vi.fn(async (row) => row));
vi.mock('../../models/DailyMacroLog.mjs', () => ({
  default: { create: macroCreateMock },
}));


const { processAIDataUpdates } = await import('../../services/aiDataWriteService.mjs');
const unsafeNutritionCopyPattern =
  /\b(cutting|bulking?|caloric deficit|cheat meal|clean eating|dirty bulk|sugar crash|inflammatory|deficien(?:t|cy|cies)|zero sugar|no sugar|guilt|spike insulin|wasted macros)\b/i;

function makeMacroCaptureSequelize(capture) {
  // macro_log no longer touches sequelize directly; the capture rides the
  // mocked DailyMacroLog.create. Other update types still receive sequelize.
  macroCreateMock.mockImplementation(async (row) => {
    capture.replacements = row;
    return row;
  });
  return { query: vi.fn(async () => [[], { rowCount: 1 }]), QueryTypes: { INSERT: 'INSERT' } };
}

function macroUpdate(overrides = {}) {
  return {
    type: 'macro_log',
    data: {
      description: 'Protein bowl',
      mealType: 'dinner',
      calories: 420,
      protein: 35,
      carbs: 32,
      fat: 14,
      ...overrides,
    },
  };
}

describe('aiDataWriteService macro_log date fallback', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('uses studio display date instead of UTC date when AI macro_log omits date', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T02:30:00.000Z'));

    const capture = {};
    const sequelize = makeMacroCaptureSequelize(capture);

    const result = await processAIDataUpdates(42, [macroUpdate()], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(capture.replacements?.date).toBe('2026-06-21');
    expect(capture.replacements?.verified).toBe(false);
    expect(capture.replacements?.source).toBe('ai_chat');
  });

  it('does not trust AI-provided macro_log source provenance', async () => {
    const capture = {};
    const sequelize = makeMacroCaptureSequelize(capture);

    const result = await processAIDataUpdates(42, [macroUpdate({ source: 'barcode' })], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(capture.replacements?.source).toBe('ai_chat');
  });

  it('does not trust AI-provided macro_log mealType values outside the model set', async () => {
    const capture = {};
    const sequelize = makeMacroCaptureSequelize(capture);

    const result = await processAIDataUpdates(42, [macroUpdate({ mealType: 'midnight-purge' })], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(capture.replacements?.mealType).toBe('snack');
  });

  it('normalizes AI-provided macro_log mealType casing before persistence', async () => {
    const capture = {};
    const sequelize = makeMacroCaptureSequelize(capture);

    const result = await processAIDataUpdates(42, [macroUpdate({ mealType: ' Lunch ' })], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(capture.replacements?.mealType).toBe('lunch');
  });

  it('scrubs generated macro_log display copy before persistence', async () => {
    const capture = {};
    const sequelize = makeMacroCaptureSequelize(capture);

    const result = await processAIDataUpdates(42, [macroUpdate({
      description: 'Clean eating cheat meal bowl with zero sugar sauce',
      brandName: 'No sugar clean eating cafe',
      mealSource: 'guilt-free model estimate',
    })], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(JSON.stringify({
      description: capture.replacements?.description,
      brandName: capture.replacements?.brandName,
      mealSource: capture.replacements?.mealSource,
    })).not.toMatch(unsafeNutritionCopyPattern);
    expect(capture.replacements?.verified).toBe(false);
    expect(capture.replacements?.source).toBe('ai_chat');
  });

  it('honors a server-owned macro source override for non-AI nutrition callers', async () => {
    const capture = {};
    const sequelize = makeMacroCaptureSequelize(capture);

    const result = await processAIDataUpdates(42, [macroUpdate()], 7, sequelize, { macroSource: 'barcode' });

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(capture.replacements?.source).toBe('barcode');
    expect(capture.replacements?.verified).toBe(false);
  });

  it('preserves explicit macro_log dates', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T02:30:00.000Z'));

    const capture = {};
    const sequelize = makeMacroCaptureSequelize(capture);

    const result = await processAIDataUpdates(42, [macroUpdate({ date: '2026-06-19' })], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(capture.replacements?.date).toBe('2026-06-19');
  });

  it('does not partially parse malformed macro numbers into persisted estimates', async () => {
    const capture = {};
    const sequelize = makeMacroCaptureSequelize(capture);

    const result = await processAIDataUpdates(42, [macroUpdate({
      calories: '420kcal',
      protein: [35],
      carbs: '0x10',
      fat: '1e2',
      fiber: true,
      sugar: { grams: 12 },
      sodium: '900mg',
      addedSugar: '13g',
      cholesterol: [110],
      saturatedFat: '8g',
      transFat: '0.5g',
      novaGroup: '4abc',
    })], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(capture.replacements).toMatchObject({
      calories: null,
      protein: null,
      carbs: null,
      fat: null,
      fiber: null,
      sugar: null,
      sodium: null,
      addedSugar: null,
      cholesterol: null,
      saturatedFat: null,
      transFat: null,
      novaGroup: null,
      flagSodium: false,
      flagSugar: false,
      flagCholesterol: false,
      flagSaturatedFat: false,
      flagTransFat: false,
      flagProcessed: false,
      verified: false,
      source: 'ai_chat',
    });
  });

  it('preserves plain decimal string macro numbers', async () => {
    const capture = {};
    const sequelize = makeMacroCaptureSequelize(capture);

    const result = await processAIDataUpdates(42, [macroUpdate({
      calories: '420.5',
      protein: '35.25',  // canonical path rounds to 1 decimal
      carbs: '32',
      fat: '14.75',
      sodium: '801',
      addedSugar: '12.5',
      novaGroup: '4',
    })], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(capture.replacements).toMatchObject({
      calories: 420.5,
      protein: 35.3,
      carbs: 32,
      fat: 14.8,
      sodium: 801,
      addedSugar: 12.5,
      novaGroup: 4,
      flagSodium: true,
      flagSugar: true,
      flagProcessed: true,
      verified: false,
      source: 'ai_chat',
    });
  });

  it.each([0, '0', 5, '5'])('does not clamp impossible NOVA group %s into a real processing classification', async (novaGroup) => {
    const capture = {};
    const sequelize = makeMacroCaptureSequelize(capture);

    const result = await processAIDataUpdates(42, [macroUpdate({
      novaGroup,
    })], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(capture.replacements).toMatchObject({
      novaGroup: null,
      flagProcessed: false,
      verified: false,
      source: 'ai_chat',
    });
  });

  it('rejects impossible explicit macro_log dates before any SQL write', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T02:30:00.000Z'));

    const capture = {};
    const sequelize = makeMacroCaptureSequelize(capture);

    const result = await processAIDataUpdates(42, [macroUpdate({ date: '2026-02-31' })], 7, sequelize);

    expect(result).toEqual({
      successful: 0,
      errors: [{
        type: 'macro_log',
        code: 'AI_DATA_WRITE_FAILED',
        message: 'Swan Coach could not apply that update. No data was changed.',
      }],
    });
    expect(capture.replacements).toBeUndefined();
  });

  it('rejects future explicit macro_log dates before any SQL write without leaking validation text', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T12:00:00.000Z'));

    const capture = {};
    const sequelize = makeMacroCaptureSequelize(capture);

    const result = await processAIDataUpdates(42, [macroUpdate({ date: '2026-06-22' })], 7, sequelize);

    expect(result).toEqual({
      successful: 0,
      errors: [{
        type: 'macro_log',
        code: 'AI_DATA_WRITE_FAILED',
        message: 'Swan Coach could not apply that update. No data was changed.',
      }],
    });
    expect(capture.replacements).toBeUndefined();
  });
});
