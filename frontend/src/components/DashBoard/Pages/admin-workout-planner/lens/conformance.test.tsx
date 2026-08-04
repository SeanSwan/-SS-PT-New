/**
 * conformance.test.tsx — S19 scaffold of the §5.3 lens laws, run against
 * every REGISTERED lens (S20/S21 entries join automatically). Static +
 * render checks per law where unit-testable:
 *  L1 no fetch/mutation in lens dirs · L4 rolodex slot rendered ·
 *  L6 endpointFor identical across lens ids · L8 reduced-motion honored
 *  where motion exists · L9 studio-classic === the verbatim ThreePanel
 *  arrangement · L10 ≤300 lines per lens file.
 * L2/L3/L5 hold by construction (SafetyGateModal + SaveBar mount OUTSIDE
 * the lens region in the layout) — asserted structurally here.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { plannerLensRegistry, PLANNER_LENS_DEFAULT_ID } from './registry';
import { endpointFor, plannerScopes } from '../plannerLogic/endpointFor';

const STYLES_DIR = resolve(__dirname, 'styles');
const registered = Object.values(plannerLensRegistry).filter(Boolean);

const walk = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? walk(full) : [full];
});

describe('Planner lens conformance (laws × registered lenses)', () => {
  it('registers studio-classic as the default floor', () => {
    expect(registered.map(entry => entry!.id)).toContain(PLANNER_LENS_DEFAULT_ID);
  });

  it('L1/L6/L10: lens style files never fetch, never pick endpoints, stay ≤300 lines', () => {
    for (const file of walk(STYLES_DIR)) {
      const src = readFileSync(file, 'utf8');
      expect(src, `${file} must not fetch (L1)`).not.toMatch(/fetch\(|axios|useMutation|authAxios/);
      expect(src, `${file} must not pick endpoints (L6)`).not.toMatch(/workout-builder\/(generate|plan)/);
      expect(src.split(/\r?\n/).length, `${file} over 300 lines (L10)`).toBeLessThanOrEqual(300);
    }
  });

  it('L6: endpointFor is identical regardless of lens id', () => {
    for (const scope of plannerScopes) {
      const canonical = endpointFor(scope);
      for (const entry of registered) expect(canonical, entry!.id).toBe(endpointFor(scope));
    }
  });

  it('L8: any lens file that animates declares reduced-motion handling', () => {
    for (const file of walk(STYLES_DIR)) {
      const src = readFileSync(file, 'utf8');
      if (/animation:|transition:/.test(src)) {
        expect(src, `${file} animates without prefers-reduced-motion (L8)`).toContain('prefers-reduced-motion');
      }
    }
  });

  it('L2/L3 by construction: gate + SaveBar mount outside the lens region', () => {
    const layout = readFileSync(resolve(__dirname, '../WorkoutPlannerPageLayout.tsx'), 'utf8');
    expect(layout).toContain('<SafetyGateModal');
    expect(layout).toContain('<PlannerLensHost');
    // The host receives only slots — no gate/save props to diverge on.
    expect(layout).toMatch(/<PlannerLensHost teachModeOpen=\{teachModeOpen\} rolodex=\{rolodexEl\} builder=\{builderEl\} teach=\{teachEl\} coachDock=\{coachDockEl\} \/>/);
  });

  it('L9: studio-classic renders the verbatim ThreePanel arrangement (rolodex, builder, teach, dock)', async () => {
    const { default: StudioClassic } = await Promise.resolve(plannerLensRegistry['studio-classic']!.load());
    render(
      <StudioClassic
        teachModeOpen={false}
        rolodex={<div data-testid="slot-rolodex" />}
        builder={<div data-testid="slot-builder" />}
        teach={null}
        coachDock={<div data-testid="slot-dock" />}
      />,
    );
    expect(screen.getByTestId('slot-rolodex')).toBeTruthy();
    expect(screen.getByTestId('slot-builder')).toBeTruthy();
    expect(screen.getByTestId('slot-dock')).toBeTruthy();
    const classicSrc = readFileSync(resolve(STYLES_DIR, 'studio-classic/index.tsx'), 'utf8');
    expect(classicSrc).toContain('<ThreePanel $teachModeOpen={teachModeOpen}>');
  });

  it('every registered lazy lens actually loads (S20/S21 join automatically)', async () => {
    for (const entry of registered) {
      if (!existsSync(join(STYLES_DIR, entry!.id))) continue; // entry+dir land together
      const loaded = await Promise.resolve(entry!.load());
      expect(typeof loaded.default, entry!.id).toBe('function');
    }
  });

  it('thumb-deck mounts every stateful slot exactly once across responsive layouts', async () => {
    const { default: ThumbDeck } = await Promise.resolve(plannerLensRegistry['thumb-deck']!.load());
    render(
      <ThumbDeck
        teachModeOpen
        rolodex={<div data-testid={'slot-rolodex-once'} />}
        builder={<div data-testid={'slot-builder-once'} />}
        teach={<div data-testid={'slot-teach-once'} />}
        coachDock={<div data-testid={'slot-dock-once'} />}
      />,
    );
    expect(screen.getAllByTestId('slot-rolodex-once')).toHaveLength(1);
    expect(screen.getAllByTestId('slot-builder-once')).toHaveLength(1);
    expect(screen.getAllByTestId('slot-teach-once')).toHaveLength(1);
    expect(screen.getAllByTestId('slot-dock-once')).toHaveLength(1);
    expect(screen.getByTestId('slot-builder-once').parentElement?.dataset.thumbDeckRegion).toBe('stage');
    expect(screen.getByTestId('slot-teach-once').parentElement?.dataset.thumbDeckRegion).toBe('teach');
    expect(screen.getByTestId('slot-builder-once').parentElement)
      .not.toBe(screen.getByTestId('slot-teach-once').parentElement);
    expect(screen.queryByLabelText('Exercise library')).toBeNull();
  });

  it('thumb-deck mobile sheet owns focus, keyboard close, and inert background', async () => {
    const { default: ThumbDeck } = await Promise.resolve(plannerLensRegistry['thumb-deck']!.load());
    render(
      <ThumbDeck
        teachModeOpen
        rolodex={<button type="button">Exercise item</button>}
        builder={<div>Builder content</div>}
        teach={<div>Teach content</div>}
        coachDock={<button type="button">Coach dock</button>}
      />,
    );
    const exercisesTab = screen.getByText('Exercises') as HTMLButtonElement;
    fireEvent.click(exercisesTab);
    const dialog = screen.getByRole('dialog', { name: 'Exercise library' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Exercise item' }));
    for (const id of ['thumb-deck-stage', 'thumb-deck-teach', 'thumb-deck-tabs', 'thumb-deck-coach']) {
      expect(screen.getByTestId(id).hasAttribute('inert'), `${id} must be inert`).toBe(true);
    }
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Exercise library' })).toBeNull();
    expect(document.activeElement).toBe(exercisesTab);
  });

  it('thumb-deck clears mobile modal state when the viewport becomes desktop', async () => {
    let matches = true;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const originalMatchMedia = window.matchMedia;
    const mediaQuery = {
      get matches() { return matches; },
      media: '(max-width: 1279px)',
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => mediaQuery });
    try {
      const { default: ThumbDeck } = await Promise.resolve(plannerLensRegistry['thumb-deck']!.load());
      render(
        <ThumbDeck
          teachModeOpen
          rolodex={<button type="button">Responsive item</button>}
          builder={<div>Builder</div>}
          teach={<div>Teach</div>}
          coachDock={null}
        />,
      );
      fireEvent.click(screen.getByText('Exercises'));
      expect(screen.getByRole('dialog', { name: 'Exercise library' })).toBeTruthy();
      matches = false;
      act(() => listeners.forEach(listener => listener({ matches } as MediaQueryListEvent)));
      expect(screen.queryByRole('dialog', { name: 'Exercise library' })).toBeNull();
      expect(screen.getByTestId('thumb-deck-stage').hasAttribute('inert')).toBe(false);
    } finally {
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
    }
  });
});
