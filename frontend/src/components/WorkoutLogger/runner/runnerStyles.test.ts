/**
 * Runner Style store contract: default, persistence, unshipped rejection,
 * subscription fan-out. The Lens picker and the logger both ride this.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_RUNNER_STYLE,
  RUNNER_STYLES,
  readRunnerStyle,
  subscribeRunnerStyle,
  writeRunnerStyle,
} from './runnerStyles';

beforeEach(() => window.localStorage.clear());

describe('runnerStyles store', () => {
  it('defaults to focus-flow (the redesign IS the default view)', () => {
    expect(DEFAULT_RUNNER_STYLE).toBe('focus-flow');
    expect(readRunnerStyle()).toBe('focus-flow');
  });

  it('persists a shipped selection and notifies subscribers', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRunnerStyle(listener);
    writeRunnerStyle('classic-ledger');
    expect(readRunnerStyle()).toBe('classic-ledger');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    writeRunnerStyle('focus-flow');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('rejects unshipped styles at write AND read (stale key safety)', () => {
    writeRunnerStyle('sheet-stack');
    expect(readRunnerStyle()).toBe(DEFAULT_RUNNER_STYLE);
    window.localStorage.setItem('ss.runner.style.v1', 'stadium-hud');
    expect(readRunnerStyle()).toBe(DEFAULT_RUNNER_STYLE);
    window.localStorage.setItem('ss.runner.style.v1', 'not-a-style');
    expect(readRunnerStyle()).toBe(DEFAULT_RUNNER_STYLE);
  });

  it('registry: all 10 final styles + classic are present; exactly two ship in v1', () => {
    expect(RUNNER_STYLES).toHaveLength(11);
    const shipped = RUNNER_STYLES.filter((s) => s.shipped).map((s) => s.id);
    expect(shipped.sort()).toEqual(['classic-ledger', 'focus-flow']);
    RUNNER_STYLES.forEach((style) => {
      expect(style.name.length).toBeGreaterThan(0);
      expect(style.tagline.length).toBeGreaterThan(0);
    });
  });
});
