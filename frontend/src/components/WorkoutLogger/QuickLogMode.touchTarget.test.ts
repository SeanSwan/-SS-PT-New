import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentPath = resolve(__dirname, './QuickLogMode.tsx');
const stylesPath = resolve(__dirname, './QuickLogMode.styles.ts');

const componentSource = readFileSync(componentPath, 'utf8');
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';
const combinedSource = `${componentSource}\n${stylesSource}`;

function lineCount(source: string): number {
  return source.trimEnd().split(/\r?\n/).length;
}

describe('QuickLogMode touch target and file-size contract', () => {
  it('keeps all quick-log buttons explicit and touch-safe', () => {
    expect(componentSource.match(/type="button"/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(combinedSource).toMatch(/const SetDot = styled\.button[\s\S]*min-width: 44px;[\s\S]*min-height: 44px;/);
    expect(combinedSource).toMatch(/const SetDot = styled\.button[\s\S]*&:focus-visible/);
  });

  it('keeps quick-log controls on shared Crystalline Swan tokens', () => {
    expect(stylesSource).toContain('withAlpha');
    expect(stylesSource).not.toMatch(/rgba\((80, 160, 240|10, 10, 15)/);
    expect(stylesSource).not.toMatch(/#ffffff/i);
  });

  it('keeps the quick-log component and extracted styles under the project file cap', () => {
    expect(lineCount(componentSource)).toBeLessThanOrEqual(300);
    if (stylesSource) expect(lineCount(stylesSource)).toBeLessThanOrEqual(300);
  });
});
