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
    const hydrationCopy = [...source.matchAll(/hydration:\s*'([^']*)'/g)]
      .map((match) => match[1])
      .join('\n');

    expect(source).not.toMatch(/sugar crash|fast food \(inflammatory\)/i);
    expect(hydrationCopy).not.toMatch(/\b\d{1,3}\s*-\s*\d{1,3}\s*oz\b/i);
    expect(hydrationCopy).not.toMatch(/\bminimum\s+\d{1,3}\s*-\s*\d{1,3}\s*oz\b/i);
    expect(hydrationCopy).not.toMatch(/\bevery\s+\d{1,2}\s*-\s*\d{1,2}\s+holes\b/i);
    expect(source).not.toContain('<PresetSection><PresetLabel>Avoid</PresetLabel>');
    expect(source).toMatch(/Plan Around|pair|large high-fat meals|hydration/i);
  });
});
