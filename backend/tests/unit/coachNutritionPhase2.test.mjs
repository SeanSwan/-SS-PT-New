/**
 * Regression: Phase 2 coach-mind deepening (nutrition blueprint 2026-08-04).
 * Locks in: view_nutrition_log date clamp (14-day lookback oracle guard),
 * summarizeNutritionLogs adherence enrichment (zero new queries), and the
 * contract that the chat nutrition window is 14 days with description still
 * excluded (Rule 8).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8');

// ── summarizer enrichment (pure) ──
const { summarizeNutritionLogs } = await import('../../services/ai/contextEngine/coachNutritionContext.mjs');

describe('summarizeNutritionLogs enrichment (S2.4)', () => {
  it('derives log run, days-since-last-log, and inferred counts from loaded rows', () => {
    const rows = [
      { date: '2026-08-04', mealType: 'dinner', calories: 600, verified: true, source: 'manual' },
      { date: '2026-08-03', mealType: 'lunch', calories: 500, verified: false, source: 'coach_inferred' },
      { date: '2026-08-02', mealType: 'lunch', calories: 550, verified: false, source: 'manual' },
      { date: '2026-07-30', mealType: 'dinner', calories: 700, verified: true, source: 'manual' },
    ];
    const summary = summarizeNutritionLogs(rows);
    expect(summary.currentLogRun).toBe(3);            // 04,03,02 consecutive; gap before 07-30
    expect(summary.inferredEntryCount).toBe(1);
    expect(summary.loggedDays).toBe(4);
    expect(typeof summary.daysSinceLastLog).toBe('number');
  });

  it('handles Date objects and empty input without throwing', () => {
    expect(summarizeNutritionLogs([]).currentLogRun).toBe(0);
    expect(summarizeNutritionLogs([]).daysSinceLastLog).toBeNull();
    const summary = summarizeNutritionLogs([{ date: new Date('2026-08-04T00:00:00Z'), mealType: 'lunch' }]);
    expect(summary.currentLogRun).toBe(1);
  });
});

// ── view_nutrition_log date clamp (mocked model) ──
const mocks = vi.hoisted(() => ({ findAll: vi.fn() }));
vi.mock('../../models/DailyMacroLog.mjs', () => ({ default: { findAll: mocks.findAll } }));
vi.mock('../../services/foodScannerService.mjs', () => ({ default: { getProductByBarcode: vi.fn(), searchProducts: vi.fn() } }));
vi.mock('../../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const { viewNutritionLog } = await import('../../services/ai/dispatchers/nutritionDispatchers.mjs');

describe('view_nutrition_log date support (S2.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findAll.mockResolvedValue([]);
  });

  it('queries the requested date when within the 14-day window', async () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
    const result = await viewNutritionLog({ clientId: 5, date: yesterday }, {});
    expect(result.date).toBe(yesterday);
    expect(mocks.findAll.mock.calls[0][0].where.date).toBe(yesterday);
  });

  it('clamps future dates, ancient dates, and garbage to today (oracle guard)', async () => {
    const future = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    const ancient = '2020-01-01';
    for (const bad of [future, ancient, 'yesterday', '2026-13-45']) {
      const result = await viewNutritionLog({ clientId: 5, date: bad }, {});
      expect(result.date).not.toBe(bad);
    }
  });
});

// ── chat window + Rule 8 contract ──
describe('chat nutrition window (S2.3b)', () => {
  it('loads 14 days of aggregate macros with description still excluded', () => {
    const chat = read('services/aiChatService.mjs');
    const block = chat.match(/SELECT date, "mealType",[^;]+FROM daily_macro_logs[^;]+INTERVAL '14 days'/s)?.[0];
    expect(block).toBeTruthy();
    expect(block).not.toContain('description');
  });

  it('persists the nutrition debate outcome as an ai_generated draft (activation law)', () => {
    const orchestrator = read('services/ai/debate/debateOrchestrator.mjs');
    expect(orchestrator).toContain('persistNutritionDraftTarget');
    expect(orchestrator).toMatch(/source:\s*'ai_generated'/);
  });
});
