import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/ui/StyledButton.tsx'),
  'utf8'
);

describe('UniversalMasterSchedule StyledButton theme bridge', () => {
  it('uses Crystalline Swan dashboard tokens for shared schedule buttons', () => {
    expect(SOURCE).toContain('SCHEDULE_BUTTON_THEME');
    expect(SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(SOURCE).toContain('var(--accent-secondary, #8B5CF6)');
    expect(SOURCE).toContain('var(--text-primary, #E0ECF4)');
    expect(SOURCE).toContain('var(--danger, #EF4444)');
    expect(SOURCE).toContain('var(--success, #10B981)');

    expect(SOURCE).not.toContain('galaxy-swan-theme');
    expect(SOURCE).not.toContain('galaxySwanTheme');
    expect(SOURCE).not.toContain('color: #ffffff;');
    expect(SOURCE).not.toContain('background: #ef4444;');
    expect(SOURCE).not.toContain('background: #10b981;');
    expect(SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
