import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(__dirname, relativePath), 'utf8');

const homeSource = readSource('./TrainerHomeTab.tsx');
const heroSource = readSource('./TrainerHomeObservatoryHero.tsx');
const dockSource = readSource('./SwanCoachDockTrainer.tsx');

describe('SwanCoachDockTrainer theme bridge', () => {
  it('keeps the dock out of the active trainer overview hero', () => {
    expect(homeSource).toContain("import TrainerHomeObservatoryHero from './TrainerHomeObservatoryHero'");
    expect(homeSource).toContain('<TrainerHomeObservatoryHero');
    // hero is now the slim identity bar (2026-07-23 de-dup)
    expect(heroSource).toContain('aria-label="Trainer identity"');
    expect(heroSource).not.toContain("import SwanCoachDockTrainer from './SwanCoachDockTrainer'");
    expect(heroSource).not.toContain('<SwanCoachDockTrainer');
  });

  it('keeps the dormant dock theme-safe for direct uses and tests', () => {
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