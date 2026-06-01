import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, './FloatingRestTimer.tsx'), 'utf8');
const stylesSource = readFileSync(resolve(__dirname, './FloatingRestTimer.styles.ts'), 'utf8');

describe('FloatingRestTimer touch target contract', () => {
  it('keeps all floating timer buttons explicit and 44px touch-safe', () => {
    expect(source).toMatch(/<IconBtn[\s\S]{0,120}type="button"[\s\S]{0,160}aria-label="Minimize"/);
    expect(source).toMatch(/<IconBtn[\s\S]{0,120}type="button"[\s\S]{0,160}aria-label="Close timer"/);
    expect(source).toMatch(/<AdjustBtn[\s\S]{0,120}type="button"[\s\S]{0,160}aria-label="Decrease 15 seconds"/);
    expect(source).toMatch(/<AdjustBtn[\s\S]{0,120}type="button"[\s\S]{0,160}aria-label="Increase 15 seconds"/);
    expect(source).toMatch(/<ControlBtn[\s\S]{0,120}type="button"[\s\S]{0,160}aria-label=\{isRunning \? 'Pause' : 'Start'\}/);
    expect(source).toMatch(/<ControlBtn[\s\S]{0,120}type="button"[\s\S]{0,160}aria-label="Reset timer"/);
  });

  it('keeps compact timer controls at or above the project touch target floor', () => {
    expect(stylesSource).toMatch(/export const IconBtn = styled\.button`[\s\S]*min-width: 44px;[\s\S]*min-height: 44px;[\s\S]*&:focus-visible/);
    expect(stylesSource).toMatch(/export const AdjustBtn = styled\.button`[\s\S]*min-width: 44px;[\s\S]*min-height: 44px;[\s\S]*&:focus-visible/);
  });

  it('keeps the timer component and styles split under the project file cap', () => {
    expect(source.split('\n').length).toBeLessThanOrEqual(300);
    expect(stylesSource.split('\n').length).toBeLessThanOrEqual(300);
  });

  it('keeps floating timer visual states on shared Crystalline Swan tokens', () => {
    expect(stylesSource).toContain('WorkoutLoggerCS');
    expect(stylesSource).toContain('withAlpha');
    expect(stylesSource).not.toMatch(/rgba\((96, 192, 240|201, 42, 84|0, 0, 0|224, 236, 244|139, 92, 246)/);
    expect(stylesSource).not.toMatch(/#(C92A54|C6A84B|60C0F0|8B5CF6|E0ECF4|1A1A24|002060)/i);
  });
});
