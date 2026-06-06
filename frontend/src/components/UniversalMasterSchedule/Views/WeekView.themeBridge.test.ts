import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), `src/components/UniversalMasterSchedule/Views/${path}`), 'utf8');

const COMBINED_SOURCE = [
  readSource('WeekView.logic.ts'),
  readSource('WeekView.layoutStyles.ts'),
  readSource('WeekView.sessionStyles.ts'),
  readSource('WeekViewSkeleton.tsx'),
].join('\n');

describe('WeekView theme bridge', () => {
  it('keeps the mounted week grid and loading state on universal theme variables', () => {
    expect(COMBINED_SOURCE).toContain('var(--bg-elevated, #141419)');
    expect(COMBINED_SOURCE).toContain('var(--border-soft');
    expect(COMBINED_SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(COMBINED_SOURCE).toContain('var(--text-primary, #E0ECF4)');

    [
      'rgba(0, 32, 96',
      'rgba(0, 206, 209',
      'rgba(255, 255, 255',
      'rgba(100, 100, 100',
    ].forEach((retiredFallback) => {
      expect(COMBINED_SOURCE).not.toContain(retiredFallback);
    });
  });
});
