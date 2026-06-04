import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/ui/StyledInput.tsx'),
  'utf8'
);

describe('UniversalMasterSchedule StyledInput theme bridge', () => {
  it('keeps shared schedule form controls on Crystalline Swan theme variables', () => {
    expect(SOURCE).toContain('SCHEDULE_INPUT_THEME');
    expect(SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(SOURCE).toContain('var(--danger, #EF4444)');
    expect(SOURCE).not.toContain('rgba(255');
    expect(SOURCE).not.toContain('#ffffff');
    expect(SOURCE).not.toContain('#3b82f6');
    expect(SOURCE).not.toContain('#ef4444');
    expect(SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
