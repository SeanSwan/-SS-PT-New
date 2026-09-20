/*
 * T-W3 (R2/R3) — StatusBoard component.
 *
 * R3 is the load-bearing half: a damaged store must produce a REFUSAL naming the
 * file. The test asserts the absence of zeros explicitly, because "0 enabled of
 * 0" is the exact failure mode this requirement exists to prevent — it reads as
 * a real measurement when it is actually a refusal.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBoard } from '../components/StatusBoard';
import type { StatusState } from '../hooks/useStatus';
import * as fx from '../adapters/fixtures';

function ready(status: typeof fx.healthyStatus): StatusState {
  return { phase: 'ready', status, error: null, initial: false };
}

describe('T-W3 StatusBoard', () => {
  it('renders the fixture instruments when the store is healthy', () => {
    render(<StatusBoard state={ready(fx.healthyStatus)} />);

    expect(screen.getByTestId('status-board')).toBeInTheDocument();
    expect(screen.getByText(/9 enabled of 12/)).toBeInTheDocument();
    expect(screen.getByText(/366 of 418/)).toBeInTheDocument();
    expect(screen.getByText(/87\.6%/)).toBeInTheDocument();
    expect(screen.getByText(/ok · 2025\.09\.17/)).toBeInTheDocument();
    expect(screen.queryByTestId('refusal-banner')).not.toBeInTheDocument();
  });

  it('shows a refusal naming registry.json when the roster is damaged — never zeros', () => {
    const { container } = render(<StatusBoard state={ready(fx.damagedRegistryStatus)} />);

    const banner = screen.getByTestId('refusal-banner');
    expect(banner).toHaveTextContent('registry.json');
    expect(banner).toHaveTextContent(/withheld rather than reported as zero/i);

    // the refusal marker is present...
    expect(screen.getByTestId('refused-value')).toBeInTheDocument();
    // ...and no zero-count was rendered in its place
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/0 enabled of 0/);
    expect(text).not.toMatch(/\b0 of 0\b/);
  });

  it('withholds coverage when state.json is damaged', () => {
    const { container } = render(<StatusBoard state={ready(fx.damagedStateStatus)} />);

    expect(screen.getByTestId('refusal-banner')).toHaveTextContent('state.json');
    expect(screen.getByText(/Coverage unknown/i)).toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(/\b0 of 0\b/);
    // the roster is NOT damaged here, so its real numbers still render
    expect(screen.getByText(/9 enabled of 12/)).toBeInTheDocument();
  });

  it('renders a skeleton on the first load only', () => {
    const { rerender } = render(
      <StatusBoard state={{ phase: 'loading', status: null, error: null, initial: true }} />,
    );
    expect(screen.getByText(/Reading the store/i)).toBeInTheDocument();

    rerender(<StatusBoard state={ready(fx.healthyStatus)} />);
    expect(screen.queryByText(/Reading the store/i)).not.toBeInTheDocument();
  });

  it('names the failure when the bridge never answered', () => {
    render(
      <StatusBoard
        state={{
          phase: 'error',
          status: null,
          error: { code: 'TRANSPORT', message: 'fetch failed', file: null },
          initial: false,
        }}
      />,
    );
    expect(screen.getByTestId('refusal-banner')).toHaveTextContent('TRANSPORT');
  });

  it('keeps showing the last good reading when a later poll fails', () => {
    render(
      <StatusBoard
        state={{
          phase: 'error',
          status: fx.healthyStatus,
          error: { code: 'TRANSPORT', message: 'fetch failed', file: null },
          initial: false,
        }}
      />,
    );
    // stale-but-labelled beats blank: the instrument is still there...
    expect(screen.getByText(/9 enabled of 12/)).toBeInTheDocument();
    // ...and the failure is disclosed rather than hidden
    expect(screen.getByText(/last poll failed \(TRANSPORT\)/)).toBeInTheDocument();
  });

  it('withholds the census counts when the sweep errored — absent, not zero (S1-H2)', () => {
    const { container } = render(<StatusBoard state={ready(fx.censusErroredStatus)} />);

    const refused = screen.getByTestId('refused-census');
    expect(refused).toHaveTextContent(/the sweep failed/i);
    expect(refused).toHaveTextContent(/EACCES/);

    // The landmine: rendering inFlight.length/everSwept here would print
    // "0 in flight · 0 swept" — a fabricated measurement. R3 forbids it.
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/0 in flight/);
    expect(text).not.toMatch(/0 swept/);
  });

  it('withholds the document count when state.json is damaged (S1-H3)', () => {
    render(<StatusBoard state={ready(fx.damagedStateStatus)} />);

    // `documents: 0` in that fixture is status.mjs's own guard, not a
    // measurement — so the board refuses instead of claiming "no documents".
    expect(screen.getByTestId('refused-documents')).toHaveTextContent(/state\.json unreadable/);
    // publishedBrains reads the brains directory, not state.json: it stays REAL.
    expect(screen.getByTestId('published-brains')).toHaveTextContent(String(fx.healthyStatus.publishedBrains));
  });

  it('keeps the document count real when only the roster is damaged (S1-H5 fidelity)', () => {
    render(<StatusBoard state={ready(fx.damagedRegistryStatus)} />);

    // registry damage does not touch the docs directory — withholding the
    // count here would be its own falsehood, in the opposite direction.
    expect(screen.queryByTestId('refused-documents')).not.toBeInTheDocument();
    expect(screen.getByTestId('published-brains')).toHaveTextContent(String(fx.healthyStatus.publishedBrains));
  });
});

/*
 * ── R2-01 · health is rendered with its PROVENANCE ──────────────────────────
 *
 * The old rendering was one ternary on `ok`, so a stale success and a live one
 * produced the SAME string, and "never checked" produced the same string as "the
 * check failed". These three tests fail against that version — which is the only
 * reason to write them. A test that passes both before and after a fix is not
 * evidence of the fix.
 */
describe('R2-01 health provenance', () => {
  it('a LIVE ok reading reads as ok and does not claim to be history', () => {
    render(<StatusBoard state={ready(fx.healthyStatus)} />);

    const line = screen.getByTestId('ytdlp-health');
    expect(line).toHaveTextContent(/ok · 2025\.09\.17/);
    expect(line).not.toHaveTextContent(/not a live one/);
    expect(line).not.toHaveTextContent(/not yet checked/);
  });

  it('a HISTORY ok reading is labelled as not live, and carries its age', () => {
    render(<StatusBoard state={ready(fx.staleHistoryStatus)} />);

    // The value is good; the verdict is old. BOTH must reach the screen — this
    // is the case the old ternary rendered as a bare "ok".
    const line = screen.getByTestId('ytdlp-health');
    expect(line).toHaveTextContent(/ok/);
    expect(line).toHaveTextContent(/from the last recorded check, not a live one/);
    expect(line).toHaveTextContent(/as of 2026-09-17T04:12:00\.000Z/);
    expect(line).toHaveTextContent(/ago/);
  });

  it('an UNKNOWN reading says no verdict was taken — it does not say "not resolved"', () => {
    render(<StatusBoard state={ready(fx.uncheckedStatus)} />);

    // `ok:false` here means "we have not looked", not "it is broken". The old
    // rendering said "not resolved — " with an empty reason, which reads as a
    // failure and blames nothing.
    const line = screen.getByTestId('ytdlp-health');
    expect(line).toHaveTextContent(/not yet checked/);
    expect(line).toHaveTextContent(/no verdict has been taken/);
    expect(line).not.toHaveTextContent(/not resolved/);
    expect(line).not.toHaveTextContent(/failed/);
  });

  it('a live FAILURE names the reason, and is distinguishable from unknown', () => {
    render(<StatusBoard state={ready(fx.failedProbeStatus)} />);

    const line = screen.getByTestId('ytdlp-health');
    expect(line).toHaveTextContent(/failed/);
    expect(line).toHaveTextContent(/unable to extract player/);
    expect(line).not.toHaveTextContent(/not yet checked/);
  });
});
