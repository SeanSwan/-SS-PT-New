import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const guardedSources = [
  '../../services/gamification/goalChallengeService.mjs',
  '../../services/gamification/goalChallengeTemplates.mjs',
  '../../services/gamificationComboService.mjs',
  '../../services/weeklyChallengeCron.mjs'
];

const asciiGeneratedSources = [
  '../../services/gamification/goalChallengeTemplates.mjs',
  '../../services/weeklyChallengeCron.mjs'
];

describe('backend generated challenge language', () => {
  it('uses stretching and flexibility language instead of forbidden wellness terms', () => {
    for (const sourcePath of guardedSources) {
      const source = readFileSync(resolve(__dirname, sourcePath), 'utf8');

      expect(source.split(/\r?\n/).length, `${sourcePath} line count`).toBeLessThanOrEqual(300);
      expect(source, sourcePath).not.toMatch(/\byoga\b/i);
      expect(source, sourcePath).not.toMatch(/\bmeditation\b/i);
      expect(source, sourcePath).not.toMatch(/\bmindfulness\b/i);
    }
  });

  it('keeps generated challenge templates and operator messages ASCII-clean', () => {
    for (const sourcePath of asciiGeneratedSources) {
      const source = readFileSync(resolve(__dirname, sourcePath), 'utf8');

      expect(source, sourcePath).not.toMatch(/[^\x00-\x7F]/);
    }
  });
});
