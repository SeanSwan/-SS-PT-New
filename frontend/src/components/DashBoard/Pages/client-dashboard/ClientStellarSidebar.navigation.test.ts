import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { clientNavConfig } from './ClientStellarSidebar';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const NAV_STYLE_SOURCE = readFileSync(
  resolve(__dirname, './ClientStellarSidebar.nav.styles.ts'),
  'utf8',
);

describe('ClientStellarSidebar navigation priority', () => {
  it('puts progress and logging in the first dashboard cluster', () => {
    const firstClusterLabels = clientNavConfig[0].items.map((item) => item.label);

    expect(firstClusterLabels).toEqual(['Home', 'My Progress', 'Log Workout']);
  });

  it('routes primary Log Workout navigation to the today-loaded logger', () => {
    const logWorkout = clientNavConfig[0].items.find((item) => item.label === 'Log Workout');

    expect(logWorkout?.path).toBe('/dashboard/client/log-workout?loadPlan=today');
  });

  it('keeps workout history directly in the training cluster', () => {
    const trainingLabels = clientNavConfig
      .find((group) => group.section === 'TRAIN')
      ?.items.map((item) => item.label);

    // Contract intent: workout history LEADS the cluster. Swan Coach was
    // appended 2026-07-13 (dashboard audit — routable but invisible in nav);
    // My Equipment landed later still.
    //
    // A frozen exact array does not express that intent — it fails on every
    // legitimate addition, and the only way to "fix" it is to re-anchor it to
    // whatever the nav currently says, which defends nothing. Worse, a nav
    // test that is always red is a nav test nobody reads. Pin the ordering
    // guarantee and the required members instead: demoting workout history,
    // or dropping one of these destinations, still fails.
    expect(trainingLabels?.[0]).toBe('My Workouts');
    expect(trainingLabels).toEqual(
      expect.arrayContaining(['My Workouts', 'Book Session', 'Swan Coach']),
    );
  });

  it('keeps active client nav chrome connected to dashboard theme tokens', () => {
    expect(NAV_STYLE_SOURCE).toContain('color-mix(in srgb, var(--accent-secondary, #8B5CF6)');
    expect(NAV_STYLE_SOURCE).toContain('color-mix(in srgb, var(--accent-primary, #60C0F0)');
    expect(NAV_STYLE_SOURCE).toContain('color-mix(in srgb, var(--bg-surface, #1A1A24)');
    expect(NAV_STYLE_SOURCE).not.toContain('rgba(139, 92, 246');
    expect(NAV_STYLE_SOURCE).not.toContain('rgba(96, 192, 240');
    expect(NAV_STYLE_SOURCE).not.toContain('rgba(26, 26, 36');
    expect(NAV_STYLE_SOURCE).not.toContain('rgba(10, 10, 15');
    expect(NAV_STYLE_SOURCE).not.toContain('var(--ice-wing');
  });
});
