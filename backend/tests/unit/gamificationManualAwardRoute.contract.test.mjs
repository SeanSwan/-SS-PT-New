import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

describe('master prompt gamification manual award route contract', () => {
  it('uses the canonical PointTransaction ledger service and does not expose internals', () => {
    const source = readFileSync(
      resolve(__dirname, '../../routes/masterPrompt/gamification.mjs'),
      'utf8'
    );

    expect(source).toContain('GamificationPointsService.recordLedgerEntry');
    expect(source).not.toContain('gamificationEngine.awardPoints(userId, points, action, metadata)');
    expect(source).not.toContain("message: 'Failed to award points',\n        error: error.message");
  });
});
