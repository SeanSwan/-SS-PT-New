import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/ui/StyledCard.tsx'),
  'utf8'
);

describe('UniversalMasterSchedule StyledCard theme bridge', () => {
  it('uses Crystalline Swan dashboard tokens for shared schedule cards', () => {
    expect(SOURCE).toContain('SCHEDULE_CARD_THEME');
    expect(SOURCE).toContain('var(--bg-elevated, #141419)');
    expect(SOURCE).toContain('var(--border-soft, rgba(96, 192, 240, 0.18))');
    expect(SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(SOURCE).toContain('var(--text-muted, rgba(224, 236, 244, 0.65))');
    expect(SOURCE).toContain('var(--success, #10B981)');
    expect(SOURCE).toContain('var(--danger, #EF4444)');
    expect(SOURCE).toContain('var(--shadow-soft');

    expect(SOURCE).not.toContain('galaxy-swan-theme');
    expect(SOURCE).not.toContain('galaxySwanTheme');
    expect(SOURCE).not.toContain('rgba(255, 255, 255');
    expect(SOURCE).not.toContain('box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);');
    expect(SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
