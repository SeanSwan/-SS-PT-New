import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const gridPath = resolve(__dirname, './CanonicalProgressChartsGrid.tsx');
const stylesPath = resolve(__dirname, './CanonicalProgressChartsGrid.styles.ts');
const primaryCardsPath = resolve(__dirname, './CanonicalProgressChartsGrid.primaryCards.tsx');
const detailCardsPath = resolve(__dirname, './CanonicalProgressChartsGrid.detailCards.tsx');

const read = (path: string) => readFileSync(path, 'utf8');
const lineCount = (source: string) => source.split(/\r?\n/).length;

describe('CanonicalProgressChartsGrid theme bridge', () => {
  it('keeps the grid entry shell extracted and below the component line cap', () => {
    const source = read(gridPath);
    const styleSource = existsSync(stylesPath) ? read(stylesPath) : '';

    expect(source).toContain("from './CanonicalProgressChartsGrid.styles'");
    expect(source).toContain("from './CanonicalProgressChartsGrid.primaryCards'");
    expect(source).toContain("from './CanonicalProgressChartsGrid.detailCards'");
    expect(source).not.toContain("from 'styled-components'");
    expect(source).not.toMatch(/styled\./);
    expect(styleSource).toContain('var(--bg-elevated');
    expect(styleSource).toContain('color-mix(in srgb, var(--accent-primary, #60C0F0)');
    expect(styleSource).not.toContain('rgba(96, 192, 240');
    expect(lineCount(source)).toBeLessThanOrEqual(300);
  });

  it('keeps extracted card modules scoped under the line cap', () => {
    expect(existsSync(primaryCardsPath)).toBe(true);
    expect(existsSync(detailCardsPath)).toBe(true);

    const primarySource = existsSync(primaryCardsPath) ? read(primaryCardsPath) : '';
    const detailSource = existsSync(detailCardsPath) ? read(detailCardsPath) : '';

    expect(lineCount(primarySource)).toBeLessThanOrEqual(300);
    expect(lineCount(detailSource)).toBeLessThanOrEqual(300);
    expect(primarySource + detailSource).not.toMatch(/DEMO_DATA|Preview/);
  });
});
