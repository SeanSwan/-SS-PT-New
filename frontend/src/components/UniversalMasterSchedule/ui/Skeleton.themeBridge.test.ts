import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/ui/Skeleton.tsx'),
  'utf8'
);
const THEME_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/ui/Skeleton.theme.ts'),
  'utf8'
);

describe('UniversalMasterSchedule Skeleton theme bridge', () => {
  it('uses shared Crystalline Swan loading tokens without retired Galaxy theme drift', () => {
    expect(SOURCE).toContain('SCHEDULE_SKELETON_THEME');
    expect(THEME_SOURCE).toContain('var(--border-soft, rgba(96, 192, 240, 0.18))');
    expect(SOURCE).not.toContain('galaxy-swan-theme');
    expect(SOURCE).not.toContain('galaxySwanTheme');
    expect(SOURCE).not.toContain('rgba(255, 255, 255');
    expect(THEME_SOURCE).not.toContain('rgba(255, 255, 255');
    expect(SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(THEME_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(100);
  });
});
