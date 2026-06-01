import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { parseTrainerForgeClientId } from './TrainerWorkoutForgePage.data';

const pageSourcePath = resolve(__dirname, './TrainerWorkoutForgePage.tsx');

describe('TrainerWorkoutForgePage client identity boundary', () => {
  it('parses only strict positive integer client ids', () => {
    expect(parseTrainerForgeClientId('424242')).toBe(424242);
    expect(parseTrainerForgeClientId(' 424242 ')).toBe(424242);
    expect(parseTrainerForgeClientId(424242)).toBe(424242);
    expect(parseTrainerForgeClientId('424242junk')).toBeNull();
    expect(parseTrainerForgeClientId('0')).toBeNull();
    expect(parseTrainerForgeClientId(Number.NaN)).toBeNull();
    expect(parseTrainerForgeClientId(null)).toBeNull();
  });

  it('does not let loose Number conversion drive draft save or Swan Coach generation', () => {
    const source = readFileSync(pageSourcePath, 'utf8');

    expect(source).toContain('const parsedClientId = parseTrainerForgeClientId(clientId);');
    expect(source).toContain('buildPlanPayload(parsedClientId)');
    expect(source).toContain('parsedClientId === null');
    expect(source).toContain('parsedClientId !== null');
    expect(source).not.toContain('const parsedClientId = Number(clientId);');
    expect(source).not.toContain('Number.isFinite(parsedClientId)');
  });
});
