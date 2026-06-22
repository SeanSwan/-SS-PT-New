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

describe('nutrition achievement care-first copy', () => {
  it('does not reward restriction, zero-sugar streaks, or perfect macro chasing', () => {
    const seededSource = readBackendFile('seeders/20260301001000-seed-achievements.cjs');
    const manifestSource = fs.readFileSync(
      path.join(repoRoot, 'frontend/src/data/badge-manifest.json'),
      'utf8'
    );
    const nutritionCopy = `${seededSource}\n${manifestSource}`
      .split('\n')
      .filter((line) => /nutrition|meal|sugar|eating|fuel/i.test(line))
      .join('\n');

    expect(nutritionCopy).not.toMatch(
      /\bcalorie target\b|\bperfect macro|\bsugar free\b|zero added sugar|\bno added sugar\b|\bno sugar\b|\brestriction\b/i
    );
    expect(nutritionCopy).toMatch(/\blog\b|\btrack\b|\breview\b|\bawareness\b|\bintentional\b/i);
  });
});
