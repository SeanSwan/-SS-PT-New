import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(backendRoot, '..');

const readRepoFile = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

describe('golf nutrition preset care-first copy', () => {
  it('keeps preset guidance performance-focused instead of fear or moral framing', () => {
    const source = [
      readRepoFile('backend/services/mealPlanService.mjs'),
      readRepoFile('frontend/src/components/FoodTracker/MealPlanTab.sections.tsx'),
    ].join('\n');

    expect(source).not.toMatch(/sugar crash|fast food \(inflammatory\)/i);
    expect(source).not.toContain('<PresetSection><PresetLabel>Avoid</PresetLabel>');
    expect(source).toMatch(/Plan Around|pair|large high-fat meals|hydration/i);
  });
});
