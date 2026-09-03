/**
 * Regression: a FAILED history extension must not delete the history.
 *
 * GLM 5.3 hostile round 1, blocker 1 — and it was right. `loadOlder`'s catch
 * wrote to `error`, and `error` drives an EARLY RETURN that replaces the whole
 * tab with a full-screen error card. So clicking "Load older workouts" on a bad
 * connection deleted the 50 workouts, the charts and the streak the member was
 * looking at — the exact opposite of what the feature promised.
 *
 * The prior contract test asserted `setCategories([])` was absent from the catch.
 * It passed. It was testing the wrong mechanism: nothing needed to clear the
 * categories, because the early return never reached them. This test renders the
 * failure instead of reading the source.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const authGet = vi.fn();
// STABLE identity, deliberately. fetchWorkouts is a useCallback keyed on
// authAxios and its effect re-runs when that identity changes, so a mock that
// builds a fresh object per render refetches page 1 forever and no click ever
// survives the churn. The real AuthContext memoizes its value; a mock that does
// not is testing a component that does not exist.
const authAxios = { get: authGet };
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios }),
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

// eslint-disable-next-line import/first
import WorkoutsTab from './WorkoutsTab';

/** A real exercise name: the transformer classifies by muscle group, so a
 *  placeholder like "Exercise 1" yields zero categories and the tab renders its
 *  empty state instead of the charts this test is about. */
const session = (i: number) => ({
  id: i,
  date: `2026-0${(i % 9) + 1}-01T10:00:00Z`,
  logs: [{ exerciseName: 'Bench Press' }],
});

describe('workouts history extension failure', () => {
  beforeEach(() => authGet.mockReset());

  /** Respond by requested page, so extra effect invocations cannot consume a
   *  queued one-shot mock and land a rejection on the wrong request. */
  const respondByPage = (handlers: Record<number, () => unknown>) => {
    authGet.mockImplementation((url?: string, config?: { params?: { page?: number } }) => {
      // The tab makes other authGet calls (some with no url/params at all);
      // only the sessions path is scripted here, everything else gets a
      // harmless empty payload.
      const page = config?.params?.page;
      if (!url?.includes('/workout/sessions') || page === undefined) {
        return Promise.resolve({ data: { data: {} } });
      }
      const handler = handlers[page];
      if (!handler) throw new Error(`unexpected page ${page}`);
      return handler();
    });
  };
  const ok = (rows: unknown[], hasMore: boolean) => () =>
    Promise.resolve({ data: { data: { sessions: rows, hasMore } } });
  const fail = () => () => Promise.reject(new Error('network down'));

  it('keeps the loaded window, charts and streak when the extension fails', async () => {
    respondByPage({ 1: ok([session(1), session(2)], true), 2: fail() });

    render(<WorkoutsTab />);
    fireEvent.click(await screen.findByRole('button', { name: /load older workouts/i }));

    // The failure is announced...
    await waitFor(() => expect(screen.getByTestId('extension-error')).toBeInTheDocument());
    // ...and the window the member was looking at is STILL THERE.
    expect(screen.getByTestId('chart-window-note')).toBeInTheDocument();
    expect(screen.queryByText(/Unable to load workout data/i)).toBeNull();
  });

  it('asks for the next page by counter, not by array length', async () => {
    respondByPage({
      1: ok([session(1)], true),
      2: ok([session(2)], true),
      3: ok([session(3)], false),
    });

    render(<WorkoutsTab />);
    fireEvent.click(await screen.findByRole('button', { name: /load older workouts/i }));
    await waitFor(() => expect(authGet.mock.calls.some((c) => c[1].params.page === 2)).toBe(true));
    fireEvent.click(await screen.findByRole('button', { name: /load older workouts/i }));
    // With one row per page, length-derived arithmetic would have re-requested
    // page 1 forever. The counter advances regardless of how many rows returned.
    await waitFor(() => expect(authGet.mock.calls.some((c) => c[1].params.page === 3)).toBe(true));
  });

  it('does not duplicate a row the shifting offset window repeats', async () => {
    // Offset pagination has a moving boundary: a workout logged between page 1
    // and "Load older" pushes every row down, so page 2 legitimately repeats a
    // row already on screen. Merging blind gives duplicate React keys and feeds
    // the streak calculation the same day twice. (GLM 5.3 round 2, finding 5.)
    respondByPage({
      1: ok([session(1), session(2)], true),
      2: ok([session(2), session(3)], false),  // session(2) repeats
    });

    render(<WorkoutsTab />);
    fireEvent.click(await screen.findByRole('button', { name: /load older workouts/i }));

    // 3 distinct sessions loaded, not 4 — the repeat is dropped, not shown twice.
    await waitFor(() =>
      expect(screen.getByTestId('chart-window-note')).toHaveTextContent(/all 3 workouts/i));
  });

  it('a double click cannot fire the same page twice', async () => {
    respondByPage({ 1: ok([session(1)], true), 2: ok([session(2)], true), 3: ok([session(3)], false) });

    render(<WorkoutsTab />);
    const button = await screen.findByRole('button', { name: /load older workouts/i });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(authGet.mock.calls.some((c) => c[1]?.params?.page === 2)).toBe(true));
    const pageTwoCalls = authGet.mock.calls.filter((c) => c[1]?.params?.page === 2);
    expect(pageTwoCalls).toHaveLength(1);
  });
});

