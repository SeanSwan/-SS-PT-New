import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/ui/Spinner.tsx'),
  'utf8'
);

describe('UniversalMasterSchedule Spinner theme bridge', () => {
  it('uses Crystalline Swan dashboard tokens for schedule loading states', () => {
    expect(SOURCE).toContain('SCHEDULE_SPINNER_THEME');
    expect(SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(SOURCE).toContain('var(--bg-base, #0A0A0F)');
    expect(SOURCE).toContain('var(--bg-surface, #1A1A24)');
    expect(SOURCE).toContain('var(--text-primary, #E0ECF4)');

    expect(SOURCE).not.toContain('galaxy-swan-theme');
    expect(SOURCE).not.toContain('galaxySwanTheme');
    expect(SOURCE).not.toContain('#0f172a');
    expect(SOURCE).not.toContain('#1e293b');
    expect(SOURCE).not.toContain('#e2e8f0');
    expect(SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
