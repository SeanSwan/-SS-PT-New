import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentPath = resolve(__dirname, './CompactProtocolSection.tsx');
const stylesPath = resolve(__dirname, './CompactProtocolSection.styles.ts');

const componentSource = readFileSync(componentPath, 'utf8');
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';
const combinedSource = `${componentSource}\n${stylesSource}`;

function lineCount(source: string): number {
  return source.trimEnd().split(/\r?\n/).length;
}

describe('CompactProtocolSection touch target and file-size contract', () => {
  it('keeps compact protocol chip actions explicit and touch-safe', () => {
    expect(componentSource).toMatch(/<ChipRemove[\s\S]*type="button"/);
    expect(componentSource).toMatch(/<RecommendedChip[\s\S]*type="button"/);
    expect(combinedSource).toMatch(/const ChipRemove = styled\.button[\s\S]*min-width: 44px;[\s\S]*min-height: 44px;/);
    expect(combinedSource).toMatch(/const RecommendedChip = styled\.button[\s\S]*min-width: 44px;[\s\S]*min-height: 44px;/);
  });

  it('keeps the protocol component and extracted styles under the project file cap', () => {
    expect(lineCount(componentSource)).toBeLessThanOrEqual(300);
    if (stylesSource) expect(lineCount(stylesSource)).toBeLessThanOrEqual(300);
  });

  it('keeps compact protocol visual states on shared Crystalline Swan tokens', () => {
    expect(stylesSource).toContain('withAlpha');
    expect(stylesSource).not.toMatch(/rgba\((20, 20, 25|96, 192, 240|139, 92, 246|224, 236, 244|255, 255, 255)/);
    expect(stylesSource).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
  });
});
