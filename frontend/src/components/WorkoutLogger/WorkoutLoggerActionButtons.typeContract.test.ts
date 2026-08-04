import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const actionBarSource = readFileSync(resolve(__dirname, './runner/shell/zones/ActionBar.tsx'), 'utf8');
const overflowSource = readFileSync(resolve(__dirname, './runner/shell/zones/ContextOverflow.tsx'), 'utf8');
const restTimerSource = readFileSync(resolve(__dirname, './RestTimer.tsx'), 'utf8');

function lineCount(source: string): number {
  return source.trimEnd().split(/\r?\n/).length;
}

describe('WorkoutLogger action button contract', () => {
  it('keeps action-bar actions explicit non-submit buttons with touch-safe sizing', () => {
    expect(actionBarSource.match(/type='button'/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(actionBarSource).toMatch(/const Primary = styled\.button[\s\S]*min-height: 48px;/);
    expect(actionBarSource).toMatch(/const Primary = styled\.button[\s\S]*&:focus-visible/);
    expect(actionBarSource).toMatch(/const IconButton = styled\.button[\s\S]*min-height: 44px;[\s\S]*&:focus-visible/);
  });

  it('keeps action-bar visual states on shared theme tokens', () => {
    expect(actionBarSource).toMatch(/var\(--/);
    const offenders = actionBarSource
      .split(String.fromCharCode(10))
      .filter((line) => /#[0-9A-Fa-f]{3,8}|rgba?\(/.test(line))
      .filter((line) => !/var\(--|color-mix\(/.test(line));
    expect(offenders).toEqual([]);
  });

  it('keeps the summary action visible with an explicit save-first lock state', () => {
    const loggerSource = readFileSync(resolve(__dirname, './WorkoutLogger.tsx'), 'utf8');

    expect(overflowSource).toContain('summaryLockedReason?: string');
    expect(overflowSource).toContain('showGenerateSummary || summaryLockedReason');
    expect(overflowSource).toContain('disabled={!showGenerateSummary || isGeneratingSummary}');
    expect(overflowSource).toContain('Save Workout to Send Summary');
    expect(loggerSource).toContain('hasIncompleteWorkoutSets');
    expect(loggerSource).toContain('summaryLockedReason,');
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
    expect(lineCount(actionBarSource)).toBeLessThanOrEqual(300);
    expect(lineCount(overflowSource)).toBeLessThanOrEqual(300);
    expect(lineCount(restTimerSource)).toBeLessThanOrEqual(300);
  });
});
