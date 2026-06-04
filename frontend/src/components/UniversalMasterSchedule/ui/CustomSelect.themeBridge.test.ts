import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const COMPONENT_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/ui/CustomSelect.tsx'),
  'utf8'
);
const STYLE_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/ui/CustomSelect.styles.ts'),
  'utf8'
);

describe('UniversalMasterSchedule CustomSelect theme bridge', () => {
  it('keeps the portal select on extracted Crystalline Swan styles', () => {
    expect(COMPONENT_SOURCE).toContain('./CustomSelect.styles');
    expect(COMPONENT_SOURCE).toContain('./CustomSelect.types');
    expect(STYLE_SOURCE).toContain('CUSTOM_SELECT_THEME');
    expect(STYLE_SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(STYLE_SOURCE).toContain('var(--danger, #EF4444)');
    expect(STYLE_SOURCE).not.toContain('rgba(255');
    expect(STYLE_SOURCE).not.toContain('#ffffff');
    expect(STYLE_SOURCE).not.toContain('#3b82f6');
    expect(STYLE_SOURCE).not.toContain('#00d4ff');
    expect(COMPONENT_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(STYLE_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
