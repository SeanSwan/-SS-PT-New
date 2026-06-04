import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const COMPONENT_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/ui/SearchableSelect.tsx'),
  'utf8'
);
const STYLE_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/ui/SearchableSelect.styles.ts'),
  'utf8'
);

describe('UniversalMasterSchedule SearchableSelect theme bridge', () => {
  it('keeps the searchable client picker on extracted Crystalline Swan styles', () => {
    expect(COMPONENT_SOURCE).toContain('./SearchableSelect.styles');
    expect(STYLE_SOURCE).toContain('SEARCHABLE_SELECT_THEME');
    expect(STYLE_SOURCE).toContain('var(--accent-primary, #60C0F0)');
    expect(STYLE_SOURCE).not.toContain('#00CED1');
    expect(STYLE_SOURCE).not.toContain('rgba(255');
    expect(STYLE_SOURCE).not.toContain('#cbd5e1');
    expect(STYLE_SOURCE).not.toContain('#e2e8f0');
    expect(COMPONENT_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(STYLE_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
