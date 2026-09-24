/*
 * T-W4 (R4) — Roster: add form validation, enable toggle calls adapter,
 * optimistic-free re-read renders truth.
 *
 * THE THREE REQUIREMENTS ARE SEPARATE AND EACH HAS A MUTANT IN MIND.
 *
 *   form validation   the add button is inert while the ref is empty, and the
 *                     handler does not call the adapter for whitespace. A form
 *                     that posts "   " and lets the engine refuse is not
 *                     validation, it is a round trip.
 *   toggle calls it   `setCreatorEnabled` is called with the channelId and the
 *                     NEGATED current state. Asserting "the adapter was called"
 *                     would pass for a toggle that sends the same value twice.
 *   NO OPTIMISM       the rendered rows come from the ADAPTER after the write,
 *                     never from the value the write returned. The mutation that
 *                     proves this: make `onChanged` a no-op and require the row
 *                     to keep its OLD state — a test that only checked the new
 *                     state would pass for an optimistic UI.
 *
 * The last one is the reason `onChanged` is called at all, so it is pinned
 * directly rather than inferred from the happy path.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Roster } from '../components/Roster';
import type { ConsoleDataAdapter, CreatorRow } from '../adapters';

const row = (over: Partial<CreatorRow> = {}): CreatorRow => ({
  channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa',
  title: 'Alpha',
  enabled: false,
  videos: 12,
  fetched: 10,
  ...over,
});

/** A minimal adapter double: only the two write methods the Roster uses. */
function harness(initial: CreatorRow[] = [row()]) {
  let rows = initial;
  const listCreators = vi.fn(async () => rows);
  const addCreator = vi.fn(async (ref: string) => {
    const created = row({ channelId: 'UCbbbbbbbbbbbbbbbbbbbbbb', title: ref, enabled: false });
    rows = [...rows, created];
    return created;
  });
  const setCreatorEnabled = vi.fn(async (id: string, on: boolean) => {
    rows = rows.map((r) => (r.channelId === id ? { ...r, enabled: on } : r));
    return rows.find((r) => r.channelId === id)!;
  });
  const adapter = { listCreators, addCreator, setCreatorEnabled } as unknown as ConsoleDataAdapter;
  return { adapter, addCreator, setCreatorEnabled, listCreators, getRows: () => rows };
}

describe('T-W4 Roster', () => {
  it('add form: the button is inert until a non-blank ref is present', async () => {
    const h = harness();
    render(<Roster adapter={h.adapter} rows={h.getRows()} onChanged={async () => {}} />);

    const button = screen.getByTestId('roster-add-button');
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByTestId('roster-add-input'), { target: { value: '   ' } });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByTestId('roster-add-input'), { target: { value: '@alpha' } });
    expect(button).toBeEnabled();
  });

  it('add form: whitespace alone never reaches the adapter', async () => {
    const h = harness();
    render(<Roster adapter={h.adapter} rows={h.getRows()} onChanged={async () => {}} />);

    fireEvent.change(screen.getByTestId('roster-add-input'), { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('roster-add-button'));
    expect(h.addCreator).not.toHaveBeenCalled();
  });

  it('add: the REF IS TRIMMED before it reaches the adapter', async () => {
    const h = harness();
    render(<Roster adapter={h.adapter} rows={h.getRows()} onChanged={async () => {}} />);

    fireEvent.change(screen.getByTestId('roster-add-input'), { target: { value: '  @alpha  ' } });
    fireEvent.click(screen.getByTestId('roster-add-button'));
    await waitFor(() => expect(h.addCreator).toHaveBeenCalledWith('@alpha'));
  });

  it('add: a fresh creator is reported as NOT enabled (it arrives disabled by design)', async () => {
    const h = harness();
    render(<Roster adapter={h.adapter} rows={h.getRows()} onChanged={async () => {}} />);

    fireEvent.change(screen.getByTestId('roster-add-input'), { target: { value: '@alpha' } });
    fireEvent.click(screen.getByTestId('roster-add-button'));

    // The console must SAY so rather than leaving the operator to infer it from a
    // toggle that reads "Enable".
    await waitFor(() => {
      expect(screen.getByTestId('roster-notice')).toHaveTextContent(/not enabled yet/i);
    });
  });

  it('toggle: calls setCreatorEnabled with the channelId and the NEGATED state', async () => {
    const h = harness([row({ enabled: false })]);
    render(<Roster adapter={h.adapter} rows={h.getRows()} onChanged={async () => {}} />);

    fireEvent.click(screen.getByTestId('roster-toggle-UCaaaaaaaaaaaaaaaaaaaaaa'));
    await waitFor(() => {
      expect(h.setCreatorEnabled).toHaveBeenCalledWith('UCaaaaaaaaaaaaaaaaaaaaaa', true);
    });
  });

  it('toggle: an ENABLED row is sent `false`, not `true` — the negation is real', async () => {
    const h = harness([row({ enabled: true })]);
    render(<Roster adapter={h.adapter} rows={h.getRows()} onChanged={async () => {}} />);

    fireEvent.click(screen.getByTestId('roster-toggle-UCaaaaaaaaaaaaaaaaaaaaaa'));
    await waitFor(() => {
      expect(h.setCreatorEnabled).toHaveBeenCalledWith('UCaaaaaaaaaaaaaaaaaaaaaa', false);
    });
  });

  it('a refusal is shown as the ENGINE\'S OWN SENTENCE, verbatim', async () => {
    const h = harness();
    const reason = "'@nope' did not resolve to a YouTube channel id";
    h.addCreator.mockRejectedValueOnce(new Error(reason));
    render(<Roster adapter={h.adapter} rows={h.getRows()} onChanged={async () => {}} />);

    fireEvent.change(screen.getByTestId('roster-add-input'), { target: { value: '@nope' } });
    fireEvent.click(screen.getByTestId('roster-add-button'));
    await waitFor(() => {
      expect(screen.getByTestId('roster-error')).toHaveTextContent(reason);
    });
  });

  it('NO OPTIMISM: with a no-op onChanged the row keeps its OLD state', async () => {
    const h = harness([row({ enabled: false })]);
    // `rows` is the prop the parent passed; `onChanged` deliberately does NOT
    // re-read. If the component updated itself from the write's return value, the
    // button label would flip anyway — that is the defect this pins.
    render(<Roster adapter={h.adapter} rows={h.getRows()} onChanged={async () => {}} />);

    fireEvent.click(screen.getByTestId('roster-toggle-UCaaaaaaaaaaaaaaaaaaaaaa'));
    await waitFor(() => expect(h.setCreatorEnabled).toHaveBeenCalled());

    expect(screen.getByTestId('roster-toggle-UCaaaaaaaaaaaaaaaaaaaaaa')).toHaveTextContent(/^Enable$/);
  });

  it('NO OPTIMISM: with a real re-read the row renders the adapter\'s truth', async () => {
    const h = harness([row({ enabled: false })]);
    // A parent that re-reads after the write, as App does.
    function Parent() {
      const [rows, setRows] = useState(h.getRows());
      return (
        <Roster
          adapter={h.adapter}
          rows={rows}
          onChanged={async () => { setRows(await h.adapter.listCreators()); }}
        />
      );
    }
    render(<Parent />);

    fireEvent.click(screen.getByTestId('roster-toggle-UCaaaaaaaaaaaaaaaaaaaaaa'));
    await waitFor(() => {
      expect(screen.getByTestId('roster-toggle-UCaaaaaaaaaaaaaaaaaaaaaa')).toHaveTextContent(/^Disable$/);
    });
    expect(h.listCreators).toHaveBeenCalled();
  });

  it('a NULL count renders as absent, never as 0 (S1-H9)', () => {
    const h = harness([row({ videos: null, fetched: null })]);
    render(<Roster adapter={h.adapter} rows={h.getRows()} onChanged={async () => {}} />);

    const stats = screen.getByTestId('roster-stats-UCaaaaaaaaaaaaaaaaaaaaaa');
    expect(stats).toHaveTextContent('—');
    expect(stats).not.toHaveTextContent('0 videos');
    // ...and it says WHY, so the absence is attributable.
    expect(stats.getAttribute('title')).toMatch(/could not be taken/);
  });

  it('an empty roster says so rather than rendering an empty box', () => {
    const h = harness([]);
    render(<Roster adapter={h.adapter} rows={[]} onChanged={async () => {}} />);
    expect(screen.getByText(/No creators yet/)).toBeInTheDocument();
  });
});
