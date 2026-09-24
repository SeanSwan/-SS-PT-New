/**
 * T-W6(h) — the RunConsole WATCH LIFECYCLE: the polling cadence, and what happens on unmount.
 *
 * Split out of `RunConsole.test.tsx` for rule 4 (that file reached 307 lines with these in it).
 * The seam is real rather than arithmetic: `RunConsole.test.tsx` is about what the panel RENDERS
 * for a given engine answer — refusals, acceptance, verdict sentences. This file is about the
 * TIMER, which is a different subject and the only one that needs fake timers walked by hand.
 *
 * ── WHY THE FAKE TIMERS ARE DRIVEN BY HAND, AND WHY THE CADENCE IS ASSERTED AS A BOUND ──
 *
 * The poll cadence is a real 2 s. Asserting "the component called getRunState twice" without
 * advancing timers would only prove the initial read, which is not the claim. So the timer is
 * actually walked.
 *
 * The cadence claim is asserted as a BOUND (fewer than N reads over T seconds), never as an exact
 * count. An exact count would pin the phase of the timeout chain and turn any harmless re-arm
 * into a red test — and Astra round 1 (P2d) correctly noted the reverse hazard too: a bound loose
 * enough to accept a wrong cadence proves nothing. The bounds below separate 2 s from 5 s
 * (20 vs 8 reads over 40 s), so they discriminate without pinning.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { RunConsole } from '../components/RunConsole';
import { MockAdapter } from '../adapters';
import type { MockAdapterOptions } from '../adapters/MockAdapter';
import type { RunState } from '../adapters';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const RUNNING: RunState = {
  journal: { status: 'running', runId: 'RUN-2026-09-21' },
  lock: { held: true, pid: 4242, host: 'workstation', alive: true },
  throttle: { active: false, text: 'none' },
  budget: { used: 12, perHour: 60, unit: 'operations', byKind: {} },
  recentRuns: [],
};

function adapterWith(state: RunState, faults: MockAdapterOptions['faults'] = {}) {
  return new MockAdapter({ runState: state, faults, latencyMs: 0 });
}

/** A clock the test drives, so the watch's grace window needs no real waiting. */
function clock(startMs = 1_000_000) {
  let t = startMs;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

const reads = (a: MockAdapter) => a.callLog.filter((c) => c === 'getRunState').length;

describe('T-W6 RunConsole: the polling loop stops', () => {
  it('no read is scheduled after unmount — the timer does not survive the component', async () => {
    // The contract: a watch that outlives its component is a leak, and on this panel a leak means
    // an unmounted screen is still reading the engine.
    vi.useFakeTimers();
    const c = clock();
    const adapter = adapterWith(RUNNING);
    const view = render(<RunConsole adapter={adapter} pollMs={2000} now={c.now} />);

    await vi.advanceTimersByTimeAsync(0);
    for (let i = 0; i < 3; i += 1) { c.advance(2000); await vi.advanceTimersByTimeAsync(2000); }
    const beforeUnmount = reads(adapter);
    expect(beforeUnmount).toBeGreaterThan(1); // precondition: the loop was actually running

    view.unmount();
    for (let i = 0; i < 20; i += 1) { c.advance(2000); await vi.advanceTimersByTimeAsync(2000); }
    expect(reads(adapter)).toBe(beforeUnmount); // no read may happen after unmount
  });

  it('a RUNNING run polls at the active cadence, and an IDLE store does not', async () => {
    // The cadence exists so a run in flight is noticed quickly without paying that rate forever on
    // a store that is doing nothing. Asserted as a comparison between the two states at the SAME
    // elapsed time, which is the honest form: it does not depend on the absolute rate.
    vi.useFakeTimers();
    const cActive = clock();
    const active = adapterWith({ ...RUNNING, journal: { status: 'running', runId: 'R' } });
    const activeView = render(<RunConsole adapter={active} pollMs={2000} now={cActive.now} />);
    await vi.advanceTimersByTimeAsync(0);
    const activeAfterMount = reads(active);
    for (let i = 0; i < 10; i += 1) { cActive.advance(2000); await vi.advanceTimersByTimeAsync(2000); }
    const activeReads = reads(active) - activeAfterMount;
    activeView.unmount();

    vi.useRealTimers();
    vi.useFakeTimers();
    const cIdle = clock();
    const idle = adapterWith({ ...RUNNING, journal: null, lock: { held: false } });
    const idleView = render(<RunConsole adapter={idle} pollMs={2000} now={cIdle.now} />);
    await vi.advanceTimersByTimeAsync(0);
    const idleAfterMount = reads(idle);
    for (let i = 0; i < 10; i += 1) { cIdle.advance(2000); await vi.advanceTimersByTimeAsync(2000); }
    const idleReads = reads(idle) - idleAfterMount;
    idleView.unmount();

    expect(activeReads).toBeGreaterThan(idleReads); // a run in flight must be polled MORE often than an idle store — that is the whole policy;
  });
});

describe('T-W6 RunConsole: the watch teardown, including with polling DISABLED (Astra round 1, P2f)', () => {
  it('unmounting with polling DISABLED leaves no timer armed', async () => {
    // ⚠️ READ BEFORE TRUSTING THIS. Astra's P2f is REAL — `pollMs={0}` made the effect return
    // before the cleanup, so `mounted.current` was never cleared and an outstanding initial read
    // could resolve into a dead component. The FIX is applied (useRunPoll.ts returns the teardown
    // on both paths).
    //
    // But the leak's EFFECT is NOT observable through React's public surface on React 18.3.1: a
    // setState after unmount is a silent no-op and the dev warning was removed in 18. This was
    // measured, not assumed — two earlier drafts of this test (one on console.error text, one on
    // the detached container staying empty) BOTH PASSED with the fix reverted. They were
    // decorative, which is the exact defect class this review round concerns. So this asserts the
    // part that IS observable — that no timer survives — and P2f's residual is filed as UNPROVEN
    // rather than dressed up as a passing test.
    vi.useFakeTimers();
    let release: ((s: RunState) => void) | undefined;
    const adapter = adapterWith(RUNNING);
    const held = new Promise<RunState>((res) => { release = res; });
    (adapter as unknown as { getRunState: () => Promise<RunState> }).getRunState = () => held;

    const view = render(<RunConsole adapter={adapter} pollMs={0} />);
    expect(reads(adapter)).toBe(0); // the read is outstanding, not resolved
    view.unmount();

    await act(async () => { release!(RUNNING); await vi.advanceTimersByTimeAsync(0); });
    const afterUnmount = reads(adapter);
    for (let i = 0; i < 15; i += 1) await vi.advanceTimersByTimeAsync(2000);
    expect(reads(adapter)).toBe(afterUnmount); // no read may be scheduled after unmount, at any cadence;
  });

  it('control: with polling ENABLED the same store keeps reading, so the test above can fail', async () => {
    // Without this, the assertion above would also pass if the hook never polled at all.
    vi.useFakeTimers();
    const c = clock();
    const adapter = adapterWith(RUNNING);
    const view = render(<RunConsole adapter={adapter} pollMs={2000} now={c.now} />);
    await vi.advanceTimersByTimeAsync(0);
    const mounted = reads(adapter);
    for (let i = 0; i < 3; i += 1) { c.advance(2000); await vi.advanceTimersByTimeAsync(2000); }
    expect(reads(adapter)).toBeGreaterThan(mounted); // an enabled watch must keep reading — otherwise the unmount test is vacuous;
    view.unmount();
  });
});
