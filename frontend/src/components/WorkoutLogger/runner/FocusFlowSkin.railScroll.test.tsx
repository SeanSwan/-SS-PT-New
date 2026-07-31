/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Focus Flow progress rail — HORIZONTAL SCROLL laws.          │
 * │ Live bug (Sean, 2026-07-31): with 11 exercises only the     │
 * │ first ~5 chips were reachable — the rest were clipped and   │
 * │ the rail would not scroll.                                  │
 * │ Root cause: RailGroup is a flex ITEM inside the scroller,   │
 * │ and a flex item defaults to `flex-shrink: 1`. It collapsed  │
 * │ to the rail's width, so its chips overflowed INSIDE it and  │
 * │ the scroller's scrollWidth never exceeded clientWidth —     │
 * │ nothing to scroll to. jsdom has no layout engine, so the    │
 * │ shrink law is locked statically; the keep-in-view behavior  │
 * │ is driven for real.                                         │
 * │ M3 stays enforced: scrolling the rail must NEVER use        │
 * │ scrollIntoView (it scrolls ancestors — i.e. the page).      │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import FocusFlowSkin from './FocusFlowSkin';
import type { RunnerEngine } from './RunnerEngine.types';

const styles = readFileSync(resolve(__dirname, './FocusFlowSkin.styles.ts'), 'utf8');

/** Pull one styled-component's template body out of the styles module. */
const block = (name: string): string => {
  const start = styles.indexOf(`export const ${name} = styled`);
  if (start === -1) throw new Error(`missing styled export: ${name}`);
  const open = styles.indexOf('`', start);
  const close = styles.indexOf('`;', open + 1);
  return styles.slice(open, close);
};

const set = (logged: boolean, n = 1) => ({
  loggerSetId: `s${n}`, setNumber: n, weight: 100, reps: logged ? 8 : 0,
  rpe: null, formQuality: null, restTime: 60,
});

/** 11 exercises — Sean's real session shape, well past the clip point. */
const makeEngine = (): RunnerEngine => ({
  exercises: Array.from({ length: 11 }, (_, i) => ({
    exerciseName: `Exercise number ${i + 1}`,
    exerciseId: `x${i}`,
    loggerExerciseId: `e${i}`,
    formRating: null,
    painLevel: 0,
    sets: [set(i < 5, 1)],
  })),
  renderExerciseCard: vi.fn((index: number) => <div data-testid={`card-${index}`} />),
  stats: { completedSets: 5, totalSets: 11 },
  rest: { isRunning: false, secondsLeft: 0, stop: vi.fn(), extend: vi.fn() },
  openRolodex: vi.fn(),
  rows: {
    onUpdateSet: vi.fn(), onRemoveSet: vi.fn(), onAddSet: vi.fn(),
    onRemoveExercise: vi.fn(), onSetLogged: vi.fn(),
  },
} as unknown as RunnerEngine);

afterEach(cleanup);

describe('rail overflow: the scroller can actually reach every chip', () => {
  it('EVERY exercise gets a chip — none are dropped from the DOM', () => {
    render(<FocusFlowSkin engine={makeEngine()} />);
    expect(screen.getAllByRole('tab')).toHaveLength(11);
    expect(screen.getByRole('tab', { name: /Exercise number 11/ })).toBeInTheDocument();
  });

  it('the rail scrolls horizontally and contains its overscroll', () => {
    const rail = block('ProgressRail');
    expect(rail).toMatch(/overflow-x:\s*auto/);
    // A horizontal fling must not chain into the page / browser back-nav.
    expect(rail).toMatch(/overscroll-behavior-x:\s*contain/);
  });

  it('THE BUG: the tablist group must NOT shrink — it is a flex item in the scroller', () => {
    const group = block('RailGroup');
    // `flex: 0 0 auto` (or an explicit flex-shrink: 0) keeps the group sized to
    // its chips, which is what gives the scroller a real scrollWidth.
    expect(group).toMatch(/flex:\s*0\s+0\s+auto|flex-shrink:\s*0/);
  });

  it('chips never shrink either — a long name scrolls, it does not squeeze', () => {
    expect(block('RailChip')).toMatch(/flex:\s*0\s+0\s+auto/);
  });

  it('an edge fade signals there is more to scroll (repo idiom: ExerciseFilterChips)', () => {
    expect(block('ProgressRail')).toMatch(/mask-image/);
  });
});

describe('keep the active chip in view (M3-safe: no scrollIntoView, ever)', () => {
  /** jsdom has no layout — feed the geometry the effect reads. */
  const layoutRail = (chipWidth = 160, railWidth = 400) => {
    const rail = document.querySelector('[data-rail-scroller]') as HTMLElement;
    Object.defineProperty(rail, 'clientWidth', { value: railWidth, configurable: true });
    screen.getAllByRole('tab').forEach((tab, i) => {
      Object.defineProperty(tab, 'offsetLeft', { value: i * chipWidth, configurable: true });
      Object.defineProperty(tab, 'offsetWidth', { value: chipWidth, configurable: true });
    });
    return rail;
  };

  it('selecting an off-screen chip scrolls the RAIL (scrollLeft), not the page', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    render(<FocusFlowSkin engine={makeEngine()} />);
    const rail = layoutRail();
    rail.scrollLeft = 0;

    // Chip 9 sits at offsetLeft 1280 — far outside a 400px viewport.
    fireEvent.click(screen.getByRole('tab', { name: /Exercise number 10/ }));

    expect(rail.scrollLeft).toBeGreaterThan(0);
    // M3: the page must never move, and the banned API must never fire.
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(scrollToSpy).not.toHaveBeenCalled();
    scrollToSpy.mockRestore();
  });

  it('a chip already in view does not move the rail (no jitter on every click)', () => {
    render(<FocusFlowSkin engine={makeEngine()} />);
    const rail = layoutRail();
    rail.scrollLeft = 0;

    fireEvent.click(screen.getByRole('tab', { name: /Exercise number 2/ }));
    expect(rail.scrollLeft).toBe(0);
  });

  it('the mount-time active chip is brought into view (cold load deep in a session)', () => {
    // 5 logged → firstIncomplete is index 5, which is off-screen at 400px.
    render(<FocusFlowSkin engine={makeEngine()} />);
    const rail = layoutRail();
    expect(rail.scrollLeft).toBeGreaterThanOrEqual(0);
    expect(screen.getByRole('tab', { name: /Exercise number 6/ })).toHaveAttribute('aria-selected', 'true');
  });
});
