import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('WorkoutLogger style extraction', () => {
  it('keeps the canonical logger focused on workout behavior instead of local styled declarations', () => {
    const source = read('WorkoutLogger.tsx');

    expect(source).toContain("from './WorkoutLogger.styles'");
    expect(source).toContain("from './WorkoutLoggerStatus.styles'");
    expect(source).not.toContain("import styled, { keyframes } from 'styled-components'");
    expect(source).not.toMatch(/const TimerFAB\s*=\s*styled/);
    expect(source).not.toMatch(/const WorkoutLoggerContainer\s*=\s*styled/);
    expect(source).not.toMatch(/const AddExerciseButton\s*=\s*styled/);
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(1500);
  });

  it('keeps the extracted logger style module below the project file cap', () => {
    const source = read('WorkoutLogger.styles.ts');

    expect(source).toContain('export const WorkoutLoggerContainer');
    expect(source).toContain('export const AddExerciseButton');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);

    const statusSource = read('WorkoutLoggerStatus.styles.ts');
    expect(statusSource).toContain('export const ModeToggle');
    expect(statusSource).toContain('export const RestTimerBadge');
    expect(statusSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('keeps active logger shell controls on shared theme tokens', () => {
    const source = read('WorkoutLogger.styles.ts');

    expect(source).not.toMatch(/rgba\((255, 255, 255|139, 92, 246|80, 160, 240|96, 192, 240|0, 0, 0)/);
    expect(source).not.toMatch(/#(?:ffffff|8B5CF6|E0ECF4)/i);
    expect(source).toContain('withAlpha(CS.secondary');
    expect(source).toContain('withAlpha(CS.gaming');
  });

  it('keeps the voice import panel bridged to dashboard surface tokens', () => {
    const source = read('WorkoutLogger.styles.ts');

    expect(source).toContain('var(--bg-elevated');
    expect(source).toContain('color-mix(in srgb, var(--bg-surface, #141419) 68%, transparent)');
    expect(source).toContain('var(--text-secondary, #8BA8C8)');
    expect(source).not.toContain('var(--surface-elevated');
    expect(source).not.toContain('rgba(20, 20, 25, 0.68)');
    expect(source).not.toContain('rgba(224, 236, 244, 0.72)');
  });
});
