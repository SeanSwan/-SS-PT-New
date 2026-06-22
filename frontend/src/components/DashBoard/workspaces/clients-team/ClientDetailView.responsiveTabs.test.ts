import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesSource = readFileSync(resolve(__dirname, './MasterDetailDetailStyles.ts'), 'utf8');

describe('ClientDetailView responsive tab contract', () => {
  it('uses wrapped mobile grid tabs instead of clipped single-row labels', () => {
    expect(stylesSource).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
    expect(stylesSource).toContain('grid-auto-rows: minmax(48px, auto)');
    expect(stylesSource).toContain('white-space: normal');
    expect(stylesSource).toContain('line-height: 1.15');
    expect(stylesSource).not.toContain('font-size: 9px');
  });

  it('raises detail-tab readability for 4K monitor-class screens', () => {
    expect(stylesSource).toContain('@media (min-width: 2560px)');
    expect(stylesSource).toContain('font-size: 13px');
    expect(stylesSource).toContain('@media (min-width: 3840px)');
    expect(stylesSource).toContain('font-size: 14px');
  });
});
