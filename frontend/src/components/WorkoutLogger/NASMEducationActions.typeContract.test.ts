import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workoutLoggerSource = readFileSync(resolve(__dirname, './WorkoutLogger.tsx'), 'utf8');
const learningModeSource = readFileSync(resolve(__dirname, './NASMLearningMode.tsx'), 'utf8');
const phaseGuideSource = readFileSync(resolve(__dirname, './NASMPhaseGuide.tsx'), 'utf8');

function lineCount(source: string): number {
  return source.trimEnd().split(/\r?\n/).length;
}

describe('NASM education action contract', () => {
  it('keeps the education controls on the active WorkoutLogger route', () => {
    expect(workoutLoggerSource).toContain('<NASMLearningProvider>');
    expect(workoutLoggerSource).toContain('<LearningModeToggle />');
    expect(workoutLoggerSource).toContain('<NASMPhaseGuide');
  });

  it('keeps every NASM education button explicit and touch-safe', () => {
    expect(learningModeSource.match(/type="button"/g)?.length ?? 0).toBeGreaterThanOrEqual(1);
    expect(phaseGuideSource.match(/type="button"/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(learningModeSource).toMatch(/const ToggleWrapper = styled\.button[\s\S]*min-height: 44px;[\s\S]*&:focus-visible/);
    expect(phaseGuideSource).toMatch(/const GuideHeader = styled\.button[\s\S]*min-height: 48px;[\s\S]*&:focus-visible/);
    expect(phaseGuideSource).toMatch(/const LoadTemplateBtn = styled\.button[\s\S]*min-height: 48px;[\s\S]*&:focus-visible/);
  });

  it('keeps the active education files under the project file cap', () => {
    expect(lineCount(learningModeSource)).toBeLessThanOrEqual(300);
    expect(lineCount(phaseGuideSource)).toBeLessThanOrEqual(300);
  });

  it('keeps NASM learning toggle visuals on shared Crystalline Swan tokens', () => {
    expect(learningModeSource).toContain('withAlpha');
    expect(learningModeSource).not.toMatch(
      /rgba\((0, 0, 0|80, 160, 240|96, 192, 240|139, 92, 246|224, 236, 244)/
    );
  });
});
