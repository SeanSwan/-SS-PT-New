import { readFileSync } from 'fs';
import { resolve } from 'path';

const hookPath = resolve(__dirname, 'useClientProgressCharts.ts');
const sanitizerPath = resolve(__dirname, 'useClientProgressChartsSanitizers.ts');

describe('useClientProgressCharts contract extraction', () => {
  it('keeps the runtime hook under the 300-line cap', () => {
    const source = readFileSync(hookPath, 'utf8');
    const lineCount = source.split(/\r?\n/).length;

    expect(lineCount).toBeLessThanOrEqual(300);
    expect(source).toContain("from './useClientProgressCharts.types'");
  });

  it('keeps sanitizer type imports out of the runtime hook barrel', () => {
    const sanitizerSource = readFileSync(sanitizerPath, 'utf8');

    expect(sanitizerSource).toContain("from './useClientProgressCharts.types'");
    expect(sanitizerSource).not.toContain("from './useClientProgressCharts'");
  });
});
