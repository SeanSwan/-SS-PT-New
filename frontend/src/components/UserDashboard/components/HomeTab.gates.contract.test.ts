/**
 * HomeTab fetch-state gates — source contract.
 *
 * The defects in this workstream were never in the presentation components;
 * they were in HomeTab's DERIVATION of the gate. Every presentational test
 * passed while `isError && !data` silently asserted zeros for the whole
 * pending window, because those tests are handed the prop directly.
 *
 * There is no render test for HomeTab (it pulls ~12 hooks, auth, router and a
 * query client), so this pins the derivation at the source: reverting to a
 * hand-rolled gate must fail something.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, 'HomeTab.tsx'), 'utf8');

describe('HomeTab fetch-state gates', () => {
  it('derives every gate through the shared resolver', () => {
    expect(source).toContain("from '../hooks/resolveDataStatus'");
    expect(source).toContain('resolveDataStatus(workoutSessions)');
    expect(source).toContain('resolveDataStatus(gamProfile)');
  });

  it('hand-rolls no `isError && !data` gate — the expression that shipped three bugs', () => {
    expect(source).not.toMatch(/isError\s*&&\s*!\w+\.data/);
    expect(source).not.toMatch(/\.data\s*\?\s*'ready'/);
  });

  it('gates the gamification rail on the resolver, not on a raw error flag', () => {
    expect(source).toContain('const gamificationUnavailable = !isDataKnown(gamificationStatus)');
  });

  it('withholds the training-proof tiles from Quick Stats until the record is known', () => {
    // buildHomeTrainingProof always returns an object, so passing it
    // unconditionally made the ticker assert "This Week 0 / Training Time 0m".
    expect(source).toContain('trainingProof: sessionsKnown ? trainingProof : null');
  });

  it('refetches sessions when the local day rolls over', () => {
    // Without this, useDayBoundary slides the window but a workout logged
    // after midnight still lights no tile — nothing else refetches.
    expect(source).toContain('void refetchSessions()');
    expect(source).toMatch(/\[dayStart, refetchSessions\]/);
  });

  it('keys every clock-derived memo on the day boundary', () => {
    const memoDeps = source.match(/\[workoutSessions\.data[^\]]*\]/g) || [];
    expect(memoDeps.length).toBeGreaterThan(0);
    for (const dep of memoDeps) {
      expect(dep).toContain('dayStart');
    }
  });
});
