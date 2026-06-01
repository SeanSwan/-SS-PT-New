import { readFileSync } from 'fs';
import { resolve } from 'path';

const stylesPath = resolve(__dirname, 'ClientMyWorkoutsStyles.ts');
const pagePath = resolve(__dirname, 'ClientMyWorkoutsPage.tsx');

describe('ClientMyWorkoutsStyles line-cap extraction', () => {
  it('keeps the canonical style barrel under the 300-line cap', () => {
    const source = readFileSync(stylesPath, 'utf8');
    const lineCount = source.split(/\r?\n/).length;

    expect(lineCount).toBeLessThanOrEqual(300);
    expect(source).toContain("from './ClientMyWorkoutsStateStyles'");
  });

  it('preserves the page import surface while state styles move behind it', () => {
    const pageSource = readFileSync(pagePath, 'utf8');

    expect(pageSource).toContain("from './ClientMyWorkoutsStyles'");
    expect(pageSource).not.toContain("from './ClientMyWorkoutsStateStyles'");
  });
});
