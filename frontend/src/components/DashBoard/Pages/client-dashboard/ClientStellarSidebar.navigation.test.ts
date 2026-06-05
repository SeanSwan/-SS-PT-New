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

  it('keeps workout history directly in the training cluster', () => {
    const trainingLabels = clientNavConfig
      .find((group) => group.section === 'TRAIN')
      ?.items.map((item) => item.label);

    expect(trainingLabels).toEqual(['My Workouts', 'Book Session']);
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
