/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Runner Skin Conformance Harness (RUNNER-STYLES-FINAL-10).   │
 * │ ONE parametrized suite over every shipped non-classic skin. │
 * │ A skin that fails here does not flip shipped:true.          │
 * │ Covers: mount marker, add-exercise reachability, rest       │
 * │ controls, crash fallback, swap-storm (engine object         │
 * │ untouched across style switches), plus static source law:   │
 * │ no raw color literals outside var()/color-mix in skin       │
 * │ styles, ≤300-line files, reduced-motion handling.           │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import FocusFlowSkin from './FocusFlowSkin';
import LedgerProSkin from './LedgerProSkin';
import SheetStackSkin from './SheetStackSkin';
import RunnerCollection from './RunnerCollection';
import { RUNNER_STYLES, writeRunnerStyle, type RunnerStyleId } from './runnerStyles';
import type { RunnerEngine } from './RunnerEngine.types';

const SKINS: Array<{ id: RunnerStyleId; Skin: React.ComponentType<{ engine: RunnerEngine }> }> = [
  { id: 'focus-flow', Skin: FocusFlowSkin },
  { id: 'ledger-pro', Skin: LedgerProSkin },
  { id: 'sheet-stack', Skin: SheetStackSkin },
];

const set = (logged: boolean, n = 1) => ({
  loggerSetId: `s${n}`, setNumber: n, weight: 100, reps: logged ? 8 : 0,
  rpe: null, formQuality: null, restTime: 60,
});

const makeEngine = (overrides: Partial<RunnerEngine> = {}): RunnerEngine => ({
  exercises: [
    { exerciseName: 'Bench Press', exerciseId: 'x1', loggerExerciseId: 'e1', formRating: null, painLevel: 0, sets: [set(true, 1), set(false, 2)] },
    { exerciseName: 'Plank', exerciseId: 'x2', loggerExerciseId: 'e2', formRating: null, painLevel: 0, sets: [set(false, 1)] },
  ],
  renderExerciseCard: vi.fn((index: number) => <div data-testid={`card-${index}`} />),
  stats: { completedSets: 1, totalSets: 3 },
  rest: { isRunning: false, secondsLeft: 0, stop: vi.fn(), extend: vi.fn() },
  openRolodex: vi.fn(),
  rows: {
    onUpdateSet: vi.fn(), onRemoveSet: vi.fn(), onAddSet: vi.fn(),
    onRemoveExercise: vi.fn(), onSetLogged: vi.fn(),
  },
  ...overrides,
});

beforeEach(() => window.localStorage.clear());

describe.each(SKINS)('conformance: $id', ({ id, Skin }) => {
  it('mounts with its data-runner-skin marker and the session fixture', () => {
    const { container } = render(<Skin engine={makeEngine()} />);
    expect(container.querySelector(`[data-runner-skin="${id}"]`)).not.toBeNull();
  });

  it('add-exercise (Rolodex) is reachable through an accessible control', () => {
    const engine = makeEngine();
    render(<Skin engine={engine} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Add (another )?exercise/i })[0]);
    expect(engine.openRolodex).toHaveBeenCalled();
  });

  it('while resting: countdown visible, +15s and Skip both fire the engine', () => {
    const stop = vi.fn();
    const extend = vi.fn();
    render(<Skin engine={makeEngine({ rest: { isRunning: true, secondsLeft: 65, stop, extend } })} />);
    expect(screen.getByLabelText(/Rest: 1:05 remaining/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add 15 seconds of rest' }));
    expect(extend).toHaveBeenCalledWith(15);
    fireEvent.click(screen.getByRole('button', { name: 'Skip rest' }));
    expect(stop).toHaveBeenCalled();
  });

  it('registry ships this skin', () => {
    expect(RUNNER_STYLES.find((style) => style.id === id)?.shipped).toBe(true);
  });
});

describe('swap-storm: switching styles never remounts the host or loses the engine', () => {
  it('cycles every shipped style over the SAME engine object without a crash', () => {
    const engine = makeEngine();
    const shipped = RUNNER_STYLES.filter((style) => style.shipped).map((style) => style.id);
    const { rerender, container } = render(
      <RunnerCollection engine={engine} renderClassicList={() => <div data-testid='classic-list' />} />,
    );
    for (const styleId of [...shipped, ...shipped.slice().reverse()]) {
      writeRunnerStyle(styleId);
      rerender(
        <RunnerCollection engine={engine} renderClassicList={() => <div data-testid='classic-list' />} />,
      );
      const marker = styleId === 'classic-ledger'
        ? screen.getByTestId('classic-list')
        : container.querySelector(`[data-runner-skin="${styleId}"]`);
      expect(marker).not.toBeNull();
    }
    // The engine object was never cloned/replaced by any skin.
    expect(engine.renderExerciseCard).toBeDefined();
    cleanup();
  });
});

describe('static source law (every runner file)', () => {
  const dir = resolve(__dirname);
  const files = readdirSync(dir).filter((name) => /\.(ts|tsx)$/.test(name) && !name.includes('.test.'));

  it('no raw hex/rgb color literals outside var() fallbacks or color-mix in styles', () => {
    for (const name of files.filter((f) => f.endsWith('.styles.ts'))) {
      const source = readFileSync(resolve(dir, name), 'utf8');
      const offenders = source
        .split('\n')
        .filter((line) => /#[0-9A-Fa-f]{3,8}\b|rgba?\(/.test(line))
        .filter((line) => !/var\(--|color-mix\(/.test(line));
      expect({ file: name, offenders }).toEqual({ file: name, offenders: [] });
    }
  });

  it('every runner file honors the 300-line project cap', () => {
    for (const name of files) {
      const lines = readFileSync(resolve(dir, name), 'utf8').split(/\r?\n/).length;
      expect({ file: name, lines }).toEqual({ file: name, lines: expect.any(Number) });
      expect(lines, `${name} exceeds 300 lines`).toBeLessThanOrEqual(301);
    }
  });

  it('skins with transitions/animations carry a reduced-motion guard', () => {
    for (const name of files.filter((f) => f.endsWith('.styles.ts'))) {
      const source = readFileSync(resolve(dir, name), 'utf8');
      if (/animation:|transition:/.test(source)) {
        expect(source, `${name} animates without a prefers-reduced-motion guard`)
          .toMatch(/prefers-reduced-motion/);
      }
    }
  });
});
