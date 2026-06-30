import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const guardedSources = [
  { path: '../../services/gamification/goalChallengeService.mjs', enforceLineCount: true },
  { path: '../../services/gamification/goalChallengeTemplates.mjs', enforceLineCount: true },
  { path: '../../services/gamification/challengeTemplateCatalog.mjs', enforceLineCount: true },
  { path: '../../services/gamification/challengeCreationService.mjs', enforceLineCount: true },
  { path: '../../services/gamification/challengeListService.mjs', enforceLineCount: true },
  { path: '../../services/gamification/challengeProgressEventService.mjs', enforceLineCount: true },
  { path: '../../services/gamificationComboService.mjs', enforceLineCount: true },
  { path: '../../services/weeklyChallengeCron.mjs', enforceLineCount: true },
  { path: '../../../scripts/achievement-badge-manifest.json', enforceLineCount: true },
  { path: '../../../scripts/badge-manifest.json', enforceLineCount: false }
];

const asciiGeneratedSources = [
  '../../services/gamification/goalChallengeTemplates.mjs',
  '../../services/gamification/challengeTemplateCatalog.mjs',
  '../../services/gamification/challengeCreationService.mjs',
  '../../services/gamification/challengeListService.mjs',
  '../../services/gamification/challengeProgressEventService.mjs',
  '../../services/weeklyChallengeCron.mjs'
];

describe('backend generated challenge language', () => {
  it('uses stretching and flexibility language instead of forbidden wellness terms', () => {
    for (const { path: sourcePath, enforceLineCount } of guardedSources) {
      const source = readFileSync(resolve(__dirname, sourcePath), 'utf8');

      if (enforceLineCount) {
        expect(source.split(/\r?\n/).length, `${sourcePath} line count`).toBeLessThanOrEqual(300);
      }
      expect(source, sourcePath).not.toMatch(/\byoga\b/i);
      expect(source, sourcePath).not.toMatch(/\bmeditation\b/i);
      expect(source, sourcePath).not.toMatch(/\bmindfulness\b/i);
      expect(source, sourcePath).not.toMatch(/\bzen\b|\bchakra\b/i);
    }
  });

  it('keeps generated challenge templates and operator messages ASCII-clean', () => {
    for (const sourcePath of asciiGeneratedSources) {
      const source = readFileSync(resolve(__dirname, sourcePath), 'utf8');

      expect(source, sourcePath).not.toMatch(/[^\x00-\x7F]/);
    }
  });
});
