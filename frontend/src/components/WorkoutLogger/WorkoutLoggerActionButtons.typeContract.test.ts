import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const footerSource = readFileSync(resolve(__dirname, './WorkoutLoggerFooter.tsx'), 'utf8');
const restTimerSource = readFileSync(resolve(__dirname, './RestTimer.tsx'), 'utf8');

function lineCount(source: string): number {
  return source.trimEnd().split(/\r?\n/).length;
}

describe('WorkoutLogger action button contract', () => {
  it('keeps footer actions explicit non-submit buttons with touch-safe sizing', () => {
    expect(footerSource.match(/type="button"/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(footerSource).toMatch(/const Button = styled\(motion\.button\)[\s\S]*min-height: 48px;/);
    expect(footerSource).toMatch(/const Button = styled\(motion\.button\)[\s\S]*&:focus-visible/);
  });

  it('keeps footer visual states on shared Crystalline Swan tokens', () => {
    expect(footerSource).toContain('withAlpha');
    expect(footerSource).not.toMatch(/rgba\((255, 255, 255|80, 160, 240|96, 192, 240|239, 68, 68)/);
    expect(footerSource).not.toMatch(/#(?:ffffff|f87171)/i);
  });

  it('keeps the summary action visible with an explicit save-first lock state', () => {
    const loggerSource = readFileSync(resolve(__dirname, './WorkoutLogger.tsx'), 'utf8');

    expect(footerSource).toContain('summaryLockedReason?: string');
    expect(footerSource).toContain('showGenerateSummary || summaryLockedReason');
    expect(footerSource).toContain('disabled={!showGenerateSummary || isGeneratingSummary}');
    expect(footerSource).toContain('Save Workout to Send Summary');
    expect(loggerSource).toContain('hasIncompleteWorkoutSets');
    expect(loggerSource).toContain('summaryLockedReason={summaryLockedReason}');
    expect(loggerSource).toContain('Enter reps or weight, then save');
  });

  it('keeps inline rest timer controls explicit non-submit buttons with touch-safe sizing', () => {
    expect(restTimerSource.match(/type="button"/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(restTimerSource).toMatch(/const TimerButton = styled\.button[\s\S]*min-height: 44px;[\s\S]*min-width: 44px;/);
    expect(restTimerSource).toMatch(/const TimerButton = styled\.button[\s\S]*&:focus-visible/);
  });

  it('keeps inline rest timer hover states on shared Crystalline Swan tokens', () => {
    expect(restTimerSource).toContain('withAlpha');
    expect(restTimerSource).not.toMatch(/rgba\((245, 158, 11|80, 160, 240)/);
  });

  it('keeps action components under the project file cap', () => {
    expect(lineCount(footerSource)).toBeLessThanOrEqual(300);
    expect(lineCount(restTimerSource)).toBeLessThanOrEqual(300);
  });
});
