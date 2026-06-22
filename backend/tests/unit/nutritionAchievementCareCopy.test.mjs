import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '../..');
const repoRoot = path.resolve(backendRoot, '..');

const readBackendFile = (relativePath) =>
  fs.readFileSync(path.join(backendRoot, relativePath), 'utf8');

const readRepoFile = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const CARE_COPY_LINE_PATTERN =
  /nutrition|meal|sugar|eating|fuel|macro|calorie|protein|hydration|water|gallon/i;

const UNSAFE_NUTRITION_COPY_PATTERN =
  /\bcalorie target\b|\bperfect\w*\b|\bflawless\b|\bsugar free\b|zero added sugar|\bno added sugar\b|\bno sugar\b|\brestriction\b|\bgallon\b|\bdrink a gallon\b|\bwater in a single day\b/i;

describe('nutrition achievement care-first copy', () => {
  it('does not reward restriction, zero-sugar streaks, or perfection-chasing nutrition goals', () => {
    const seededSource = readBackendFile('seeders/20260301001000-seed-achievements.cjs');
    const manifestSource = readRepoFile('frontend/src/data/badge-manifest.json');
    const scriptManifestSource = readRepoFile('scripts/achievement-badge-manifest.json');
    const nutritionCopy = `${seededSource}\n${manifestSource}\n${scriptManifestSource}`
      .split('\n')
      .filter((line) => CARE_COPY_LINE_PATTERN.test(line))
      .join('\n');

    expect(nutritionCopy).not.toMatch(UNSAFE_NUTRITION_COPY_PATTERN);
    expect(nutritionCopy).toMatch(/\blog\b|\btrack\b|\breview\b|\bawareness\b|\bintentional\b/i);
  });

  it('ships a production data migration for the hydration badge copy repair', () => {
    const migrationPath = path.join(
      backendRoot,
      'migrations/20260622093500-update-gallon-achievement-care-copy.cjs'
    );

    expect(fs.existsSync(migrationPath)).toBe(true);

    const migrationSource = fs.existsSync(migrationPath)
      ? fs.readFileSync(migrationPath, 'utf8')
      : '';

    expect(migrationSource).toContain("name = 'gallon_a_day'");
    expect(migrationSource).toMatch(/Hydration Check-In/i);
    expect(migrationSource).toMatch(/Log a hydration check-in/i);
    expect(migrationSource).not.toMatch(UNSAFE_NUTRITION_COPY_PATTERN);
  });
});
