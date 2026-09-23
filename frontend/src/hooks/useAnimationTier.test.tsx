// frontend/src/hooks/useAnimationTier.test.tsx
//
// P3 tests — the hook reads provider authority and performs no detection.
// Named cases come from 09-tests.md (P2 amendment) "P3" row.

import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/logger', () => ({
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

import { useAnimationTier, useTierFlags } from './useAnimationTier';
import { PerformanceTierProvider } from '../core/perf/PerformanceTierProvider';
import { PerformanceTierContext } from '../core/perf/PerformanceTierContext';
import { INITIAL_CAPABILITY_STATE } from '../core/perf/performanceTierPolicy';
import type { CapabilityState } from '../core/perf/performanceTierPolicy';

function installCapabilities(cores: number | undefined) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(window.navigator, 'hardwareConcurrency', {
    configurable: true,
    value: cores,
  });
  Object.defineProperty(window.navigator, 'deviceMemory', {
    configurable: true,
    value: 8,
  });
  Object.defineProperty(window.navigator, 'connection', {
    configurable: true,
    value: undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAnimationTier — reads the provider, never re-detects', () => {
  it('hook reads provider without a second detector', () => {
    // Establish the baseline: how many times does *the provider alone* read the
    // hardware surface? Then render consumers and assert the count does not grow
    // per consumer — a second detector inside the hook would make it grow.
    installCapabilities(2);
    let reads = 0;
    Object.defineProperty(window.navigator, 'hardwareConcurrency', {
      configurable: true,
      get: () => {
        reads += 1;
        return 2;
      },
    });

    const Bare: React.FC = () => {
      useAnimationTier();
      return null;
    };

    // Provider with a single consumer.
    const one = render(
      <PerformanceTierProvider>
        <Bare />
      </PerformanceTierProvider>,
    );
    const readsWithOne = reads;
    one.unmount();

    // Provider with four consumers.
    reads = 0;
    const many = render(
      <PerformanceTierProvider>
        <Bare />
        <Bare />
        <Bare />
        <Bare />
      </PerformanceTierProvider>,
    );

    // The provider's own detection cost is constant regardless of consumer count.
    // Under the old design each hook instance ran its own detector, so this would
    // scale with the number of consumers.
    expect(reads).toBe(readsWithOne);
    many.unmount();

    render(
      <PerformanceTierProvider>
        <Bare />
      </PerformanceTierProvider>,
    );
    expect(reads).toBeGreaterThan(0);
  });

  it('hook surfaces the canonical tier vocabulary', () => {
    installCapabilities(8);

    const Probe: React.FC = () => {
      const tier = useAnimationTier();
      return <div data-testid="tier">{tier}</div>;
    };

    render(
      <PerformanceTierProvider>
        <Probe />
      </PerformanceTierProvider>,
    );

    expect(screen.getByTestId('tier').textContent).toBe('full');
  });

  it('temporary aliases map exactly', () => {
    // The deprecation alias must agree with the canonical flag, never drift.
    const Probe: React.FC = () => {
      const tier = useAnimationTier();
      const flags = useTierFlags(tier);
      return (
        <div data-testid="out">
          {`${flags.isEssential === flags.isReduced}:${flags.isReduced}`}
        </div>
      );
    };

    render(
      <PerformanceTierProvider forceTier="reduced">
        <Probe />
      </PerformanceTierProvider>,
    );

    expect(screen.getByTestId('out').textContent).toBe('true:true');
  });

  it('final flags derive from canonical values', () => {
    const Probe: React.FC = () => {
      const tier = useAnimationTier();
      const flags = useTierFlags(tier);
      return (
        <div data-testid="flags">
          {[
            flags.isFull,
            flags.isLean,
            flags.isReduced,
            flags.showParallax,
            flags.showBlur,
            flags.showStagger,
          ].join(',')}
        </div>
      );
    };

    // full: parallax yes, blur yes, stagger yes
    const full = render(
      <PerformanceTierProvider forceTier="full">
        <Probe />
      </PerformanceTierProvider>,
    );
    expect(full.getByTestId('flags').textContent).toBe('true,false,false,true,true,true');
    full.unmount();

    // lean: no parallax, blur yes, stagger yes
    const lean = render(
      <PerformanceTierProvider forceTier="lean">
        <Probe />
      </PerformanceTierProvider>,
    );
    expect(lean.getByTestId('flags').textContent).toBe('false,true,false,false,true,true');
    lean.unmount();

    // reduced: nothing
    const reduced = render(
      <PerformanceTierProvider forceTier="reduced">
        <Probe />
      </PerformanceTierProvider>,
    );
    expect(reduced.getByTestId('flags').textContent).toBe('false,false,true,false,false,false');
  });
});

describe('useAnimationTier — shared authority', () => {
  it('two consumers observe the same update', () => {
    installCapabilities(8);

    let renderCount = 0;

    const Probe: React.FC<{ label: string }> = ({ label }) => {
      const tier = useAnimationTier();
      renderCount += 1;
      return <div data-testid={label}>{tier}</div>;
    };

    render(
      <PerformanceTierProvider>
        <Probe label="a" />
        <Probe label="b" />
      </PerformanceTierProvider>,
    );

    // Both consumers read the same single authority.
    expect(screen.getByTestId('a').textContent).toBe('full');
    expect(screen.getByTestId('b').textContent).toBe('full');
    expect(renderCount).toBeGreaterThanOrEqual(2);
  });

  it('a consumer outside the provider sees the safe pending default', () => {
    // No provider: the context default must be pending/reduced, never a resolved
    // full that could trigger an enhancement nobody authorized.
    const Probe: React.FC = () => {
      const tier = useAnimationTier();
      return <div data-testid="tier">{tier}</div>;
    };

    render(<Probe />);
    expect(screen.getByTestId('tier').textContent).toBe('reduced');
  });
});

describe('useTierFlags — direct state injection', () => {
  it('flags respond to an explicitly supplied state', () => {
    const states: CapabilityState[] = [
      { phase: 'ready', tier: 'full' },
      { phase: 'ready', tier: 'lean' },
      { phase: 'ready', tier: 'reduced' },
      INITIAL_CAPABILITY_STATE,
    ];

    const Probe: React.FC<{ state: CapabilityState }> = ({ state }) => {
      const flags = useTierFlags(state.tier);
      return <div data-testid="f">{`${flags.isFull}/${flags.isReduced}`}</div>;
    };

    const { rerender } = render(
      <PerformanceTierContext.Provider value={states[0]}>
        <Probe state={states[0]} />
      </PerformanceTierContext.Provider>,
    );
    expect(screen.getByTestId('f').textContent).toBe('true/false');

    rerender(
      <PerformanceTierContext.Provider value={states[3]}>
        <Probe state={states[3]} />
      </PerformanceTierContext.Provider>,
    );
    // Pending state carries tier 'reduced', so flags read reduced — but `phase`
    // is what callers must use to avoid latching. See performanceTierPolicy.
    expect(screen.getByTestId('f').textContent).toBe('false/true');
  });
});
