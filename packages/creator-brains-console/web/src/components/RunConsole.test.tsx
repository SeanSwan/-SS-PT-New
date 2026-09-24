/**
 * T-W6 — RunConsole (S4). Three claims, and each one is a claim about HONESTY rather than layout:
 *
 *   1. an invalid ops/hour is refused CLIENT-SIDE, and the refusal says nothing was sent;
 *   2. a `409 RUN_LOCKED` renders the engine's OWN sentence, holder and all, verbatim;
 *   3. the polling loop STOPS on unmount — no timer survives the component.
 *
 * Plus the claim this slice exists for and which no other file can check: that a `202` is reported
 * as ACCEPTANCE and never as a finished run (`19 §5`, A1-05).
 *
 * ── WHY THE FAKE TIMERS ARE DRIVEN BY HAND ─────────────────────────────────
 *
 * The poll cadence is a real 2 s, and `vi.advanceTimersByTimeAsync` moves it. Asserting "the
 * component called getRunState twice" without advancing timers would only prove the initial read,
 * which is not the claim. The claim is that a SECOND read happens, and then that no THIRD happens
 * after unmount — so the timer must actually be walked.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';
import { RunConsole } from '../components/RunConsole';
import { MockAdapter } from '../adapters';
import type { MockAdapterOptions } from '../adapters/MockAdapter';
import type { RunState } from '../adapters';

// The WATCH-LIFECYCLE cases moved to `RunConsole.watch.test.tsx` (rule 4 seam). They are the only
// tests here that need fake timers walked by hand, and this file had reached 307 lines with them.
// Everything below is about what the panel RENDERS for a given engine answer.

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

describe('T-W6 RunConsole: invalid ops/hour is refused client-side', () => {
  it.each([
    ['', 'empty'],
    ['0', 'zero'],
    ['-3', 'negative'],
    ['2.5', 'fractional'],
    ['sixty', 'not a number at all'],
  ])('refuses %s (%s) without sending anything', async (value) => {
    const adapter = adapterWith({ ...RUNNING, journal: null });
    render(<RunConsole adapter={adapter} pollMs={0} />);

    fireEvent.change(screen.getByTestId('run-per-hour'), { target: { value } });
    fireEvent.click(screen.getByTestId('run-start'));

    await waitFor(() => expect(screen.getByTestId('run-invalid')).toBeTruthy());
    // THE LOAD-BEARING HALF: the refusal is OURS, and it says so. `19 §5` separates a confirmed
    // pre-write refusal from an engine refusal, and a client-side check that phrased itself as
    // "the engine refused it" would misattribute a request that never left the browser.
    expect(screen.getByTestId('run-invalid').textContent).toMatch(/Nothing was sent/);
    expect(adapter.callLog).not.toContain('startDailyRun');
  });

  it('control: a VALID budget does send, so the loop above is not passing for free', async () => {
    const adapter = adapterWith({ ...RUNNING, journal: null });
    render(<RunConsole adapter={adapter} pollMs={0} />);

    fireEvent.change(screen.getByTestId('run-per-hour'), { target: { value: '60' } });
    fireEvent.click(screen.getByTestId('run-start'));

    await waitFor(() => expect(adapter.callLog).toContain('startDailyRun'));
    expect(screen.queryByTestId('run-invalid')).toBeNull();
  });
});

describe('T-W6 RunConsole: a RUN_LOCKED refusal renders the holder', () => {
  it('shows the engine sentence verbatim rather than rewriting it', async () => {
    const holder = 'the store is held by pid 4242 on workstation (started 4 min ago)';
    const adapter = adapterWith({ ...RUNNING, journal: null }, {
      startDailyRun: {
        status: 409,
        body: { error: { code: 'RUN_LOCKED', message: holder } },
      },
    });
    render(<RunConsole adapter={adapter} pollMs={0} />);

    fireEvent.change(screen.getByTestId('run-per-hour'), { target: { value: '60' } });
    fireEvent.click(screen.getByTestId('run-start'));

    await waitFor(() => expect(screen.getByTestId('run-error')).toBeTruthy());
    const shown = screen.getByTestId('run-error').textContent ?? '';
    // The pid and the host are the ONLY two facts that tell the operator what to do about it.
    expect(shown).toContain('4242');
    expect(shown).toContain('workstation');
    expect(shown).toContain(holder);
    // And NO acceptance is claimed for a run that was refused.
    expect(screen.queryByTestId('run-accepted')).toBeNull();
  });

  it('also renders the two failure CLASSES differently, per 19 §5', async () => {
    // A transport failure is an UNKNOWN OUTCOME, not a pre-write refusal. The panel must not let
    // the operator read "nothing changed" from it — that is the distinction that stops one intended
    // write becoming two.
    const adapter = adapterWith({ ...RUNNING, journal: null }, {
      startDailyRun: { status: 500, body: { error: { code: 'INTERNAL', message: 'bridge died mid-request' } } },
    });
    render(<RunConsole adapter={adapter} pollMs={0} />);

    fireEvent.change(screen.getByTestId('run-per-hour'), { target: { value: '60' } });
    fireEvent.click(screen.getByTestId('run-start'));

    await waitFor(() => expect(screen.getByTestId('run-error')).toBeTruthy());
    const shown = screen.getByTestId('run-error').textContent ?? '';
    expect(shown).toContain('bridge died mid-request');
    expect(shown).not.toMatch(/Nothing was sent/);
  });
});

describe('T-W6 RunConsole: acceptance is reported as acceptance', () => {
  it('a 202 shows the requestId and says the engine names no run id', async () => {
    const adapter = adapterWith({ ...RUNNING, journal: null });
    render(<RunConsole adapter={adapter} pollMs={0} />);

    fireEvent.change(screen.getByTestId('run-per-hour'), { target: { value: '60' } });
    fireEvent.click(screen.getByTestId('run-start'));

    await waitFor(() => expect(screen.getByTestId('run-accepted')).toBeTruthy());
    expect(screen.getByTestId('run-accepted-id').textContent).toBe('req-mock-0001');
    // THE A1-05 CLAIM, pinned in the copy itself: the console says out loud that its own id cannot
    // be correlated with a run. If somebody later "improves" this into "Started run req-…", this
    // assertion fails — which is the point, because that improvement would be a fabrication.
    expect(screen.getByTestId('run-accepted').textContent)
      .toMatch(/no caller-supplied run id|nothing it can be correlated with/);
  });

  it('NEVER renders the requestId as the run id', async () => {
    // The journal names a DIFFERENT id from the request. If the panel ever showed the request id
    // as if it were the run, these two would be conflated — and the operator would go looking for
    // `req-mock-0001` in `runs/`, where it has never existed.
    const adapter = adapterWith(RUNNING);
    render(<RunConsole adapter={adapter} pollMs={0} />);

    fireEvent.change(screen.getByTestId('run-per-hour'), { target: { value: '60' } });
    fireEvent.click(screen.getByTestId('run-start'));

    await waitFor(() => expect(screen.getByTestId('run-verdict-sentence')).toBeTruthy());
    const verdict = screen.getByTestId('run-verdict-sentence').textContent ?? '';
    expect(verdict).toContain('RUN-2026-09-21');
    expect(verdict).not.toContain('req-mock-0001');
  });

  it('a journal that reports a FAILED run does not read as our request succeeding', async () => {
    const adapter = adapterWith({
      ...RUNNING,
      journal: { status: 'failed', runId: 'RUN-OLD' },
      lock: { held: false },
    });
    render(<RunConsole adapter={adapter} pollMs={0} />);

    fireEvent.change(screen.getByTestId('run-per-hour'), { target: { value: '60' } });
    fireEvent.click(screen.getByTestId('run-start'));

    await waitFor(() => expect(screen.getByTestId('run-accepted')).toBeTruthy());
    // Both facts are on screen at once and neither is softened: the request WAS accepted, and the
    // last run the engine recorded FAILED. A panel that showed only one of them would be lying by
    // omission in one direction or the other.
    expect(screen.getByTestId('run-accepted')).toBeTruthy();
    expect(screen.getByTestId('run-verdict-sentence').textContent).toContain('failed');
  });
});
