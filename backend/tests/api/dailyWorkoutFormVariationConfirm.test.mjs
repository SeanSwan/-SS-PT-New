import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(
  resolve(__dirname, '../../routes/dailyWorkoutFormRoutes.mjs'),
  'utf8',
);

describe('daily workout form rotation-history confirmation contract', () => {
  it('flips the same-day variation row to accepted AFTER the save transaction commits', () => {
    const commitIndex = routeSource.indexOf('await transaction.commit();');
    const confirmIndex = routeSource.indexOf('Rotation write-through confirmation');
    const findRowIndex = routeSource.indexOf('accepted: false,');

    expect(commitIndex).toBeGreaterThan(-1);
    expect(confirmIndex).toBeGreaterThan(commitIndex);
    expect(findRowIndex).toBeGreaterThan(confirmIndex);
    expect(routeSource).toContain('getVariationLog');
    expect(routeSource).toContain("await variationRow.update({ accepted: true, acceptedAt: new Date() });");
  });

  it('keeps the confirmation fail-soft so a history hiccup never breaks workout saves', () => {
    const block = routeSource.slice(
      routeSource.indexOf('Rotation write-through confirmation'),
      routeSource.indexOf('let challengeProgress'),
    );

    expect(block).toContain('try {');
    expect(block).toContain('catch (variationConfirmError)');
    expect(block).toContain('workout save unaffected');
    // Manual logs with no generated row skip silently — no row fabrication.
    expect(block).toContain('accepted: false');
  });
});
