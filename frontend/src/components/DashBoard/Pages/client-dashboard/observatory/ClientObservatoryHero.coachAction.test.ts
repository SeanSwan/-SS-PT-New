import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourcePath = resolve(dirname(fileURLToPath(import.meta.url)), 'ClientObservatoryHero.tsx');

describe('ClientObservatoryHero Coach action', () => {
  it('keeps Ask Coach in the first-screen hero actions', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain('MessageCircle');
    expect(source).toContain('coachPath?: string');
    expect(source).toContain('CLIENT_OVERVIEW_COACH_PATH');
    expect(source).toContain('Ask Coach');
  });

  it('keeps Ask Coach in the primary action pair beside Log Workout', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const logIndex = source.indexOf("onNavigate('/dashboard/client/log-workout')");
    const coachIndex = source.indexOf('onNavigate(coachPath)');
    const progressIndex = source.indexOf("onNavigate('/dashboard/client/progress')");

    expect(logIndex).toBeGreaterThanOrEqual(0);
    expect(coachIndex).toBeGreaterThan(logIndex);
    expect(progressIndex).toBeGreaterThan(coachIndex);
    expect(source).toMatch(/<PrimaryButton[\s\S]*Ask Coach[\s\S]*<\/PrimaryButton>/);
  });
});
