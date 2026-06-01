import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGE_SOURCE = readFileSync(resolve(__dirname, './SwanCoachAssistantPage.tsx'), 'utf8');
const PENDING_FOOD_SOURCE = readFileSync(
  resolve(__dirname, './hooks/useSwanCoachPendingFoodQuery.ts'),
  'utf8',
);

describe('SwanCoachAssistantPage pending-food split', () => {
  it('page delegates pending RestaurantTab food query replay to a hook', () => {
    expect(PAGE_SOURCE).toMatch(/useSwanCoachPendingFoodQuery/);
    expect(PAGE_SOURCE).not.toMatch(/sessionStorage\.getItem\(['"]swan:pending-coach-food['"]\)/);
    expect(PAGE_SOURCE).not.toMatch(/sendMessageWithFood\(message,\s*foodContext\)/);
  });

  it('hook owns the storage key, food send, paywall, and success clear behavior', () => {
    expect(PENDING_FOOD_SOURCE).toMatch(/PENDING_COACH_FOOD_STORAGE_KEY\s*=\s*['"]swan:pending-coach-food['"]/);
    expect(PENDING_FOOD_SOURCE).toMatch(/sessionStorage\.getItem\(PENDING_COACH_FOOD_STORAGE_KEY\)/);
    expect(PENDING_FOOD_SOURCE).toMatch(/sendMessageWithFoodRef\.current\(message,\s*foodContext\)/);
    expect(PENDING_FOOD_SOURCE).toMatch(/showPaywallRef\.current\(['"]Swan Coach['"]/);
    expect(PENDING_FOOD_SOURCE).toMatch(/sessionStorage\.removeItem\(PENDING_COACH_FOOD_STORAGE_KEY\)/);
  });

  it('hook keeps the paywall retry contract by not clearing storage on paywall', () => {
    const paywallIdx = PENDING_FOOD_SOURCE.indexOf('resultRecord?.paywallRequired');
    expect(paywallIdx).toBeGreaterThan(0);
    const successIdx = PENDING_FOOD_SOURCE.indexOf('const succeeded', paywallIdx);
    expect(successIdx).toBeGreaterThan(paywallIdx);
    const paywallSlice = PENDING_FOOD_SOURCE.slice(paywallIdx, successIdx);
    expect(paywallSlice).toMatch(/return;/);
    expect(paywallSlice).not.toMatch(/removeItem/);
  });

  it('hook stays under the project file-size ceiling', () => {
    const lines = PENDING_FOOD_SOURCE.split(/\r?\n/).length;
    expect(lines).toBeLessThanOrEqual(300);
  });
});
