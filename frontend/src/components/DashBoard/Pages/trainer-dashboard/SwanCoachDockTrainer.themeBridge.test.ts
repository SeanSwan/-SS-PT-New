import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(__dirname, relativePath), 'utf8');

const dashboardLayoutSource = readFileSync(
  resolve(__dirname, '../../UniversalDashboardLayout.tsx'),
  'utf8'
);
const homeSource = readSource('./TrainerHomeTab.tsx');
const heroSource = readSource('./TrainerHomeObservatoryHero.tsx');
const dockSource = readSource('./SwanCoachDockTrainer.tsx');

describe('SwanCoachDockTrainer theme bridge', () => {
  it('is mounted through the active trainer overview route', () => {
    expect(dashboardLayoutSource).toContain("const TrainerHomeTab = React.lazy(() => import('./Pages/trainer-dashboard/TrainerHomeTab'))");
    expect(dashboardLayoutSource).toContain("{ path: '/overview', component: TrainerHomeTab");
    expect(homeSource).toContain("import TrainerHomeObservatoryHero from './TrainerHomeObservatoryHero'");
    expect(homeSource).toContain('<TrainerHomeObservatoryHero');
    expect(heroSource).toContain("import SwanCoachDockTrainer from './SwanCoachDockTrainer'");
    expect(heroSource).toContain('<SwanCoachDockTrainer');
  });

  it('uses theme variables for dock, skeleton, avatar, and chip chrome', () => {
    expect(dockSource).toContain('SWAN_COACH_DOCK_THEME');
    expect(dockSource).toContain('var(--accent-secondary, #8B5CF6)');
    expect(dockSource).toContain('var(--text-primary, #E0ECF4)');
    expect(dockSource).toContain('color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent)');
    expect(dockSource).toContain('color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent)');
    expect(dockSource).toContain('box-sizing: border-box');
    expect(dockSource).toContain('min-width: 0');

    expect(dockSource).not.toMatch(/rgba\(139,\s*92,\s*246/);
    expect(dockSource).not.toMatch(/rgba\(255,\s*255,\s*255/);
    expect(dockSource).not.toMatch(/rgba\(0,\s*48,\s*128/);
    expect(dockSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});