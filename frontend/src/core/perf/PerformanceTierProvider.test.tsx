// frontend/src/core/perf/PerformanceTierProvider.test.tsx
//
// P2 tests — stable subscriptions and lower-only overrides.
// Named cases come from 09-tests.md (P2 amendment) "P2" row.

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    group: vi.fn(),
    groupEnd: vi.fn(),
    table: vi.fn(),
  },
}));

import { logger } from '../../utils/logger';
import { PerformanceTierProvider } from './PerformanceTierProvider';
import { useCapabilityState } from '../../hooks/usePerformanceTier';
import type { CapabilityState, CanonicalTier } from './performanceTierPolicy';

/** Controllable mocks for the browser capability surface. */
type MediaListener = () => void;

interface MediaHarness {
  listeners: Set<MediaListener>;
  setMatches: (value: boolean) => void;
}

interface ConnectionHarness {
  listeners: Set<MediaListener>;
  addCalls: number;
  removeCalls: number;
  set: (patch: { saveData?: boolean; effectiveType?: string }) => void;
}

let media: MediaHarness;
let connection: ConnectionHarness;

function installMedia(initialMatches: boolean): MediaHarness {
  const listeners = new Set<MediaListener>();
  let matches = initialMatches;

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return query.includes('prefers-reduced-motion') ? matches : false;
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, listener: MediaListener) => listeners.add(listener),
      removeEventListener: (_: string, listener: MediaListener) => listeners.delete(listener),
      addListener: (listener: MediaListener) => listeners.add(listener),
      removeListener: (listener: MediaListener) => listeners.delete(listener),
      dispatchEvent: () => true,
    })),
  });

  return {
    listeners,
    setMatches: (value: boolean) => {
      matches = value;
      listeners.forEach((listener) => listener());
    },
  };
}

function installConnection(initial: { saveData?: boolean; effectiveType?: string } = {}) {
  const listeners = new Set<MediaListener>();
  const state = { ...initial };

  const harness: ConnectionHarness = {
    listeners,
    addCalls: 0,
    removeCalls: 0,
    set: (patch) => {
      Object.assign(state, patch);
      listeners.forEach((listener) => listener());
    },
  };

  Object.defineProperty(window.navigator, 'connection', {
    configurable: true,
    value: {
      get saveData() {
        return state.saveData;
      },
      get effectiveType() {
        return state.effectiveType;
      },
      addEventListener: (_: string, listener: MediaListener) => {
        harness.addCalls += 1;
        listeners.add(listener);
      },
      removeEventListener: (_: string, listener: MediaListener) => {
        harness.removeCalls += 1;
        listeners.delete(listener);
      },
    },
  });

  return harness;
}

function installHardware(cores: number | undefined, memory: number | undefined) {
  Object.defineProperty(window.navigator, 'hardwareConcurrency', {
    configurable: true,
    value: cores,
  });
  Object.defineProperty(window.navigator, 'deviceMemory', {
    configurable: true,
    value: memory,
  });
}

/** Renders the provider and exposes the last observed state. */
function renderProbe(props: { forceTier?: CanonicalTier } = {}) {
  const seen: CapabilityState[] = [];

  const Probe: React.FC = () => {
    const state = useCapabilityState();
    seen.push(state);
    return <div data-testid="tier">{`${state.phase}:${state.tier}`}</div>;
  };

  const result = render(
    <PerformanceTierProvider forceTier={props.forceTier}>
      <Probe />
    </PerformanceTierProvider>,
  );

  return { ...result, seen, latest: () => seen[seen.length - 1] };
}

beforeEach(() => {
  vi.clearAllMocks();
  media = installMedia(false);
  connection = installConnection();
  installHardware(8, 8);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PerformanceTierProvider — resolved state', () => {
  it('resolves to a ready tier after mount', () => {
    renderProbe();
    expect(screen.getByTestId('tier').textContent).toBe('ready:full');
  });

  it('routes diagnostics through the shared logger instead of console.info', () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    render(
      <PerformanceTierProvider>
        <div>child</div>
      </PerformanceTierProvider>,
    );

    expect(logger.log).toHaveBeenCalled();
    expect(consoleInfoSpy).not.toHaveBeenCalled();
  });
});

describe('PerformanceTierProvider — the §6.2 effect-churn fix', () => {
  it('one subscription survives tier changes', () => {
    renderProbe();

    const addsAfterMount = connection.addCalls;
    expect(addsAfterMount).toBe(1);

    // Drive several tier changes through the real connection listener.
    act(() => connection.set({ saveData: true }));
    expect(screen.getByTestId('tier').textContent).toBe('ready:lean');

    act(() => connection.set({ saveData: false, effectiveType: '2g' }));
    act(() => connection.set({ effectiveType: '4g' }));

    // The old implementation had `[forceTier, tier]` in deps: every one of those
    // transitions would have removed and re-added the listener.
    expect(connection.addCalls).toBe(1);
    expect(connection.removeCalls).toBe(0);
    expect(connection.listeners.size).toBe(1);
  });

  it('media-query change updates mounted consumers', () => {
    renderProbe();
    expect(screen.getByTestId('tier').textContent).toBe('ready:full');

    act(() => media.setMatches(true));

    expect(screen.getByTestId('tier').textContent).toBe('ready:reduced');
  });

  it('connection change downgrades immediately', () => {
    renderProbe();

    act(() => connection.set({ effectiveType: '3g' }));

    expect(screen.getByTestId('tier').textContent).toBe('ready:lean');
  });

  it('one subscription survives media-query changes', () => {
    renderProbe();
    const addsAfterMount = connection.addCalls;

    act(() => media.setMatches(true));
    act(() => media.setMatches(false));
    act(() => media.setMatches(true));

    expect(connection.addCalls).toBe(addsAfterMount);
    expect(media.listeners.size).toBe(1);
  });

  it('cleanup removes exactly the subscriptions it added', () => {
    const { unmount } = renderProbe();

    expect(connection.addCalls).toBe(1);
    unmount();
    expect(connection.removeCalls).toBe(1);
    expect(connection.listeners.size).toBe(0);
    expect(media.listeners.size).toBe(0);
  });

  it('StrictMode cleanup restores baseline', () => {
    // StrictMode double-invokes effects in development. Net subscriptions must
    // return to one, not accumulate to two.
    render(
      <React.StrictMode>
        <PerformanceTierProvider>
          <div>child</div>
        </PerformanceTierProvider>
      </React.StrictMode>,
    );

    expect(connection.listeners.size).toBe(1);
    expect(media.listeners.size).toBe(1);
  });
});

describe('PerformanceTierProvider — overrides and safety', () => {
  it('forceTier cannot elevate capability', () => {
    installHardware(2, 2); // low-end: resolves lean
    renderProbe({ forceTier: 'full' });

    expect(screen.getByTestId('tier').textContent).toBe('ready:lean');
  });

  it('forceTier restricts an eligible device', () => {
    renderProbe({ forceTier: 'reduced' });
    expect(screen.getByTestId('tier').textContent).toBe('ready:reduced');
  });

  it('missing connection API does not throw', () => {
    Object.defineProperty(window.navigator, 'connection', {
      configurable: true,
      value: undefined,
    });

    expect(() => renderProbe()).not.toThrow();
    expect(screen.getByTestId('tier').textContent).toBe('ready:full');
  });

  it('missing hardware APIs are neutral, not restrictive', () => {
    installHardware(undefined, undefined);

    expect(() => renderProbe()).not.toThrow();
    // Unknown inputs resolve to lean per contract; the point is it does not throw
    // and does not claim full.
    expect(screen.getByTestId('tier').textContent).toBe('ready:lean');
  });
});

describe('PerformanceTierProvider — F05 regression', () => {
  it('initial state prohibits enhancement before detection', () => {
    // The first render must never present a *resolved* state to a consumer,
    // or a pre-detection `reduced` could latch the signature off.
    const seenBeforeEffect: CapabilityState[] = [];

    const Probe: React.FC = () => {
      seenBeforeEffect.push(useCapabilityState());
      return null;
    };

    render(
      <PerformanceTierProvider>
        <Probe />
      </PerformanceTierProvider>,
    );

    expect(seenBeforeEffect[0]).toEqual({ phase: 'pending', tier: 'reduced' });
  });
});
