import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(resolve(__dirname, name), 'utf8');

describe('Workout Design Lab v2 contract', () => {
  it('registers ten independently named design worlds', () => {
    const registry = read('./conceptRegistry.ts');
    expect(registry.match(/id: '/g)).toHaveLength(10);
    expect(registry).toContain("name: 'Alpine Precision'");
    expect(registry).toContain("name: 'Pit Wall'");
    expect(registry).toContain("name: 'After Dark Stories'");
    expect(registry).toContain("name: 'Field Manual'");
  });

  it('renders ten independent compositions instead of one themed workbench', () => {
    const page = read('./WorkoutDesignLabPage.tsx');
    const imports = page.match(/from '.\/concepts\/(?!conceptShared)/g) ?? [];
    expect(imports).toHaveLength(10);
    expect(page).not.toContain('Workbench');
    expect(page).not.toContain('WORKOUT_DESIGN_CONCEPTS');
    expect(page).not.toContain('Coach Flight Deck');
    expect(page).not.toContain('Swan Forge');
  });

  it('keeps the lab read-only, accessible, and grounded in the shared Rolodex contract', () => {
    const page = read('./WorkoutDesignLabPage.tsx');
    const shared = read('./concepts/conceptShared.tsx');
    expect(page).toContain('Ten independent workout interface directions');
    expect(page).toContain('/api/exercises/library');
    expect(shared).toContain('Prototype only');
    expect(shared).toContain('aria-live="polite"');
    const routes = read('../../UniversalDashboardLayout.routes.tsx');
    expect(routes).toContain('Ten read-only concepts for the unified client workout workflow');
  });
});
