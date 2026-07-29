/**
 * Train state-language contract (§12-C2 calm-down).
 * Locks the 3-state set-row semantic — pending recedes, active is Ice Wing,
 * logged is earned Gilded Fern — and bans the old noise from returning:
 * purple pressed-states (purple = Coach only) and the Arctic data color
 * (--chart-primary) used as set-row chrome.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TRAIN } from '../../styles/train-tokens';

const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8');

const rowStyles = read('src/components/WorkoutLogger/ExerciseSetRow.styles.ts');
const controlStyles = read('src/components/WorkoutLogger/ExerciseSetRowControls.styles.ts');
const rowComponent = read('src/components/WorkoutLogger/ExerciseSetRowComponent.tsx');
const tokensSource = read('src/styles/train-tokens.ts');

describe('Train token module', () => {
  it('defines the five semantic states as themable vars with Crystalline fallbacks', () => {
    (['pending', 'active', 'done', 'coach', 'pr'] as const).forEach((key) => {
      expect(TRAIN[key].startsWith('var(--train-')).toBe(true);
    });
    expect(TRAIN.active).toContain('--accent-primary');
    expect(TRAIN.done).toContain('--accent-gold');
    expect(TRAIN.coach).toContain('--accent-secondary');
  });

  it('keeps gold reserved for earned states and purple for Coach', () => {
    expect(tokensSource).not.toContain('--chart-primary');
  });
});

describe('set-row state language', () => {
  it('both set-row style files consume the shared Train tokens', () => {
    expect(rowStyles).toContain("from '../../styles/train-tokens'");
    expect(controlStyles).toContain("from '../../styles/train-tokens'");
  });

  it('the row carries logged state and styles all three states', () => {
    expect(rowComponent).toContain('data-logged={isLogged');
    expect(rowStyles).toContain("[data-logged='true']");
    expect(rowStyles).toContain(':focus-within');
    expect(rowStyles).toContain('TRAIN.pending');
    expect(rowStyles).toContain('TRAIN.active');
    expect(rowStyles).toContain('TRAIN.done');
  });

  it('logged state is earned gold, never the old purple gradient', () => {
    const pressedBlock = controlStyles.slice(controlStyles.indexOf("[aria-pressed='true']"));
    expect(pressedBlock).toContain('TRAIN.done');
    expect(controlStyles).not.toContain('linear-gradient(135deg, ${CS.secondary}');
  });

  it('bans the Arctic data color from set-row chrome', () => {
    expect(rowStyles).not.toContain('CS.glow,');
    expect(rowStyles).not.toContain('${CS.glow}');
    expect(controlStyles).not.toContain('${CS.glow}');
  });

  it('declares no local hex colors — tokens only', () => {
    expect(rowStyles).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
    expect(controlStyles).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
  });
});
