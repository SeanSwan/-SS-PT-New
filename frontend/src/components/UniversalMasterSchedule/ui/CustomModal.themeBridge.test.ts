import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const COMPONENT_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/ui/CustomModal.tsx'),
  'utf8'
);
const STYLE_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/UniversalMasterSchedule/ui/CustomModal.styles.ts'),
  'utf8'
);

describe('UniversalMasterSchedule CustomModal theme bridge', () => {
  it('keeps portal modal chrome on extracted Crystalline Swan styles', () => {
    expect(COMPONENT_SOURCE).toContain('./CustomModal.styles');
    expect(STYLE_SOURCE).toContain('CUSTOM_MODAL_THEME');
    expect(STYLE_SOURCE).toContain('var(--bg-base, #0A0A0F)');
    expect(STYLE_SOURCE).toContain('var(--danger, #EF4444)');
    expect(STYLE_SOURCE).not.toContain('rgba(255');
    expect(STYLE_SOURCE).not.toContain('#ffffff');
    expect(STYLE_SOURCE).not.toContain('#1e293b');
    expect(STYLE_SOURCE).not.toContain('#0f172a');
    expect(COMPONENT_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(STYLE_SOURCE.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
