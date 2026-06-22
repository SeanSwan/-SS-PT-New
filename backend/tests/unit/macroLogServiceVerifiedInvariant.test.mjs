import { describe, expect, it, vi } from 'vitest';

vi.mock('../../models/DailyMacroLog.mjs', () => ({
  default: {
    create: vi.fn(),
    sequelize: {
      transaction: vi.fn(),
    },
  },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import DailyMacroLog from '../../models/DailyMacroLog.mjs';
import { buildMacroRow, createSingleMacroEntry } from '../../services/nutrition/macroLogService.mjs';

const unsafeNutritionCopyPattern =
  /\b(cutting|bulking?|caloric deficit|cheat meal|clean eating|dirty bulk|sugar crash|inflammatory|deficien(?:t|cy|cies)|zero sugar|no sugar|guilt|spike insulin|wasted macros)\b/i;

describe('macroLogService verified invariant', () => {
  it('keeps AI-command macro rows unverified even when upstream input asks otherwise', () => {
    const row = buildMacroRow({
      date: '2026-06-21',
      mealType: 'lunch',
      description: 'Burrito bowl',
      calories: 620,
      verified: true,
    }, { userId: 42, source: 'ai_chat' });

    expect(row).toEqual(expect.objectContaining({
      userId: 42,
      source: 'ai_chat',
      verified: false,
    }));
  });

  it('keeps single-entry macro writes unverified even when caller input asks otherwise', async () => {
    DailyMacroLog.create.mockReset();
    DailyMacroLog.create.mockResolvedValue({ id: 77 });

    await createSingleMacroEntry({
      date: '2026-06-21',
      mealType: 'lunch',
      description: 'Burrito bowl',
      calories: 620,
      verified: true,
    }, { userId: 42, source: 'ai-chat' });

    expect(DailyMacroLog.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      source: 'ai_chat',
      verified: false,
    }));
  });

  it('does not coerce non-decimal macro values into trusted rows', () => {
    const row = buildMacroRow({
      date: '2026-06-21',
      mealType: 'lunch',
      description: 'Burrito bowl',
      calories: '0x10',
      protein: '1e2',
      carbs: [30],
      fat: '4.5',
    }, { userId: 42, source: 'ai_chat' });

    expect(row).toEqual(expect.objectContaining({
      calories: null,
      protein: null,
      carbs: null,
      fat: 4.5,
    }));
  });

  it('normalizes AI-command macro row mealType casing before persistence', () => {
    const row = buildMacroRow({
      date: '2026-06-21',
      mealType: ' Lunch ',
      description: 'Burrito bowl',
      calories: 620,
    }, { userId: 42, source: 'ai_chat' });

    expect(row.mealType).toBe('lunch');
  });

  it('scrubs AI-command macro row display copy before persistence', () => {
    const row = buildMacroRow({
      date: '2026-06-21',
      mealType: 'lunch',
      description: 'Clean eating cheat meal bowl with zero sugar sauce',
      calories: 620,
      items: [{ name: 'No sugar chicken', serving: '1 guilt-free bowl' }],
    }, { userId: 42, source: 'ai_chat' });

    expect(JSON.stringify({ description: row.description, items: row.items }))
      .not.toMatch(unsafeNutritionCopyPattern);
    expect(row.source).toBe('ai_chat');
    expect(row.verified).toBe(false);
  });

  it('keeps missing macro dates defaulted to the display timezone date', () => {
    const originalTz = process.env.SWAN_DISPLAY_TZ;
    process.env.SWAN_DISPLAY_TZ = 'America/Los_Angeles';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T06:30:00Z'));
    try {
      const row = buildMacroRow({
        mealType: 'lunch',
        description: 'Burrito bowl',
        calories: 620,
      }, { userId: 42, source: 'ai_chat' });

      expect(row.date).toBe('2026-06-21');
    } finally {
      vi.useRealTimers();
      if (originalTz === undefined) delete process.env.SWAN_DISPLAY_TZ;
      else process.env.SWAN_DISPLAY_TZ = originalTz;
    }
  });

  it('rejects impossible provided dates through the shared macro row builder', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T12:00:00Z'));
    try {
      expect(() => buildMacroRow({
        date: '2026-02-31',
        mealType: 'lunch',
        description: 'Burrito bowl',
        calories: 620,
      }, { userId: 42, source: 'ai_chat' })).toThrow('Date must be a real YYYY-MM-DD calendar date');
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects future macro dates beyond the one-day timezone grace in shared AI rows', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T12:00:00Z'));
    try {
      expect(() => buildMacroRow({
        date: '2026-06-22',
        mealType: 'lunch',
        description: 'Burrito bowl',
        calories: 620,
      }, { userId: 42, source: 'ai_chat' })).toThrow('Cannot log meals for a future date');
    } finally {
      vi.useRealTimers();
    }
  });

  it('allows one-day-ahead macro dates for client-local timezone grace', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-20T23:30:00Z'));
    try {
      const row = buildMacroRow({
        date: '2026-06-21',
        mealType: 'lunch',
        description: 'Burrito bowl',
        calories: 620,
      }, { userId: 42, source: 'ai_chat' });

      expect(row.date).toBe('2026-06-21');
    } finally {
      vi.useRealTimers();
    }
  });
});
