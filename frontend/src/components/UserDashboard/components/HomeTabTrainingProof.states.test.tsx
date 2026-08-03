/**
 * Training-proof card — the three states, rendered.
 *
 * Round-5 vantage: every earlier test hit the BUILDER. This renders the
 * component itself, which is where the "outage reads as an outage" doctrine
 * actually has to hold, and where the live-region/button nesting lives.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HomeTabTrainingProof from './HomeTabTrainingProof';
import { buildHomeTrainingProof } from './HomeTabProofViewModel';

afterEach(() => cleanup());

const NOW = new Date(2026, 7, 6, 10, 0, 0).getTime();
const emptyProof = buildHomeTrainingProof([], NOW);
const realProof = buildHomeTrainingProof(
  [{ date: new Date(2026, 7, 5, 9).toISOString(), duration: 45, title: 'Lower Body' }],
  NOW,
);

describe('HomeTabTrainingProof', () => {
  it('claims no logged workouts ONLY when the sessions actually loaded', () => {
    render(<HomeTabTrainingProof proof={emptyProof} onShareProgress={() => {}} />);

    expect(screen.getByText(/No logged workouts yet/i)).toBeTruthy();
  });

  it('never claims "no logged workouts" while the fetch is failing', () => {
    render(
      <HomeTabTrainingProof
        proof={emptyProof}
        sessionsUnavailable
        onRetrySessions={() => {}}
        onShareProgress={() => {}}
      />,
    );

    expect(screen.queryByText(/No logged workouts yet/i)).toBeNull();
    expect(screen.getByText(/couldn't load your training history/i)).toBeTruthy();
    expect(screen.getByText(/Nothing you logged is lost/i)).toBeTruthy();
  });

  it('keeps the Retry control OUTSIDE the live region so it is not re-announced', () => {
    render(
      <HomeTabTrainingProof
        proof={emptyProof}
        sessionsUnavailable
        onRetrySessions={() => {}}
        onShareProgress={() => {}}
      />,
    );

    const status = screen.getByRole('status');
    const retry = screen.getByRole('button', { name: /retry/i });

    expect(status.contains(retry)).toBe(false);
  });

  it('retries on click', () => {
    const onRetrySessions = vi.fn();
    render(
      <HomeTabTrainingProof
        proof={emptyProof}
        sessionsUnavailable
        onRetrySessions={onRetrySessions}
        onShareProgress={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(onRetrySessions).toHaveBeenCalledTimes(1);
  });

  it('renders real proof and does not show either empty or error copy', () => {
    render(<HomeTabTrainingProof proof={realProof} onShareProgress={() => {}} />);

    expect(screen.queryByText(/No logged workouts yet/i)).toBeNull();
    expect(screen.queryByText(/couldn't load/i)).toBeNull();
    expect(screen.getByText(/Lower Body/)).toBeTruthy();
  });

  it('offers the share action only when there is something real to share', () => {
    const onShareProgress = vi.fn();
    render(<HomeTabTrainingProof proof={realProof} onShareProgress={onShareProgress} />);

    const share = screen.getByRole('button', { name: /share my week/i });
    fireEvent.click(share);

    expect(onShareProgress).toHaveBeenCalledTimes(1);
    expect(onShareProgress.mock.calls[0][0]).toContain('1 workout');
  });
});
