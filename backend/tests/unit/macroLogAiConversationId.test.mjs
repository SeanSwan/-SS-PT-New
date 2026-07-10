import { describe, expect, it, vi } from 'vitest';

vi.mock('../../models/DailyMacroLog.mjs', () => ({
  default: { create: vi.fn(), sequelize: { transaction: vi.fn() } },
}));
vi.mock('../../utils/logger.mjs', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { buildMacroRow } from '../../services/nutrition/macroLogService.mjs';

describe('macro log AI conversation foreign-key contract', () => {
  it('keeps only positive integer conversation ids', () => {
    const base = { date: '2026-07-09', mealType: 'lunch', description: 'Bowl' };

    expect(buildMacroRow({ ...base, aiConversationId: 42 }, { userId: 7 }).aiConversationId).toBe(42);
    expect(buildMacroRow({ ...base, aiConversationId: '42' }, { userId: 7 }).aiConversationId).toBeNull();
    expect(buildMacroRow({ ...base, aiConversationId: -1 }, { userId: 7 }).aiConversationId).toBeNull();
    expect(buildMacroRow({ ...base, aiConversationId: 1.5 }, { userId: 7 }).aiConversationId).toBeNull();
  });
});
