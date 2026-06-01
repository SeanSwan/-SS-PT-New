import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentPath = resolve(__dirname, './OPTPhaseIndicator.tsx');
const stylesPath = resolve(__dirname, './OPTPhaseIndicator.styles.ts');

const componentSource = readFileSync(componentPath, 'utf8');
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';
const combinedSource = `${componentSource}\n${stylesSource}`;

function lineCount(source: string): number {
  return source.trimEnd().split(/\r?\n/).length;
}

describe('OPTPhaseIndicator action and extraction contract', () => {
  it('keeps every modal/action control explicit and touch-safe', () => {
    expect(componentSource.match(/type="button"/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(combinedSource).toMatch(/const PhaseChip = styled\.button[\s\S]*min-height: 44px;/);
    expect(combinedSource).toMatch(/const PhaseOption = styled\.button[\s\S]*min-height: 44px;/);
    expect(combinedSource).toMatch(/const ModalButton = styled\.button[\s\S]*min-height: 44px;/);
    expect(combinedSource).toMatch(/&:focus-visible/);
  });

  it('keeps style bulk extracted and every file under the project cap', () => {
    expect(existsSync(stylesPath)).toBe(true);
    expect(lineCount(componentSource)).toBeLessThanOrEqual(300);
    expect(lineCount(stylesSource)).toBeLessThanOrEqual(300);
  });

  it('uses shared WorkoutLogger color tokens instead of one-off hardcoded phase colors', () => {
    expect(componentSource).not.toContain('#E05050');
    expect(componentSource).toContain('color: CS.error');
  });

  it('keeps modal overlay and action hover states on shared Crystalline Swan tokens', () => {
    expect(stylesSource).toContain('withAlpha');
    expect(stylesSource).not.toMatch(
      /rgba\((0, 0, 0|80, 160, 240|96, 192, 240|139, 92, 246|224, 236, 244)/
    );
  });
});
