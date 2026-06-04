import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const VIEW_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/Views/DayViewStacked.tsx'),
  'utf8'
);
const STYLE_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/Views/DayViewStacked.styles.ts'),
  'utf8'
);

describe('UniversalMasterSchedule DayViewStacked theme bridge', () => {
  it('keeps the mounted stacked day grid on extracted Crystalline Swan styles', () => {
    expect(VIEW_SOURCE).toContain('./DayViewStacked.styles');
    expect(VIEW_SOURCE).not.toContain('galaxy-swan-theme');
    expect(VIEW_SOURCE).not.toContain('galaxySwanTheme');
    expect(VIEW_SOURCE).not.toContain('styled-components');
    expect(STYLE_SOURCE).toContain('STACKED_DAY_VIEW_THEME');
    expect(STYLE_SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(STYLE_SOURCE).not.toContain('galaxy-swan-theme');
    expect(STYLE_SOURCE).not.toContain('galaxySwanTheme');
    expect(STYLE_SOURCE).not.toContain('rgba(255');
    expect(VIEW_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(STYLE_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
