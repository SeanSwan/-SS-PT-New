import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/ui/Typography.tsx'),
  'utf8'
);

describe('UniversalMasterSchedule Typography theme bridge', () => {
  it('uses Crystalline Swan dashboard tokens for shared schedule typography', () => {
    expect(SOURCE).toContain('SCHEDULE_TYPOGRAPHY_THEME');
    expect(SOURCE).toContain('var(--text-primary, #E0ECF4)');
    expect(SOURCE).toContain('var(--text-secondary, rgba(224, 236, 244, 0.82))');
    expect(SOURCE).toContain('var(--text-muted, rgba(224, 236, 244, 0.65))');
    expect(SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(SOURCE).toContain('var(--danger, #EF4444)');

    expect(SOURCE).not.toContain('galaxy-swan-theme');
    expect(SOURCE).not.toContain('galaxySwanTheme');
    expect(SOURCE).not.toContain('color: #ef4444;');
    expect(SOURCE).toContain('export const Caption = styled.span.withConfig');
    expect(SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
