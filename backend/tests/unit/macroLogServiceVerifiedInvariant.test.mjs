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

import { buildMacroRow } from '../../services/nutrition/macroLogService.mjs';

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
});
