/**
 * AI data-write macro log date contract
 *
 * Locks legacy macro_log writes to the same display-date fallback as the
 * canonical nutrition command paths when callers omit a date.
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

const { processAIDataUpdates } = await import('../../services/aiDataWriteService.mjs');

function makeMacroCaptureSequelize(capture) {
  return {
    query: vi.fn(async (sql, options) => {
      if (typeof sql === 'string' && sql.includes('INSERT INTO daily_macro_logs')) {
        capture.replacements = options?.replacements || null;
      }
      return [[], { rowCount: 1 }];
    }),
    QueryTypes: { INSERT: 'INSERT' },
  };
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
      protein: '35.25',
      carbs: '32',
      fat: '14.75',
      sodium: '801',
      addedSugar: '12.5',
      novaGroup: '4',
    })], 7, sequelize);

    expect(result).toEqual({ successful: 1, errors: [] });
    expect(capture.replacements).toMatchObject({
      calories: 420.5,
      protein: 35.25,
      carbs: 32,
      fat: 14.75,
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
