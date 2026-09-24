/*
 * Roster — the creator list and the two bounded writes (S2).
 *
 * SCOPE. S2 is: the roster, add/enable/disable through the engine functions, and
 * the BrainDrawer. This component owns the roster and the writes; the drawer is
 * separate so the damage-banner concern is not entangled with the list.
 *
 * ── THE THREE HONESTY RULES THIS COMPONENT EXISTS TO KEEP ───────────────────
 *
 * 1. A NULL COUNT IS NOT ZERO (S1-H9). `CreatorRow.videos`/`.fetched` are `null`
 *    when `state.json` is damaged and the count COULD NOT BE TAKEN. Rendering
 *    `null` as "0 videos" claims a measurement nobody took. Absent is rendered
 *    as absent — the em dash, with the reason available.
 *
 * 2. THE WRITE IS NOT THE REFRESH. `addCreator` can take seconds because it
 *    resolves a channel through yt-dlp. The button is disabled WHILE THE CALL IS
 *    IN FLIGHT and says so; it does not optimistically insert a row, because a
 *    row that appears before the engine commits is a claim the console cannot
 *    support. After it resolves the roster is re-read from the bridge.
 *
 * 3. A REFUSAL IS THE ENGINE'S SENTENCE. `addCreator` reports `{ok:false,reason}`
 *    and the bridge surfaces it as 422 with that text verbatim. It is shown as
 *    given — not rewritten into "invalid channel", which would discard the one
 *    detail that tells the operator what to fix.
 *
 * ── AND THE ONE INTERACTION DEFECT WORTH PREVENTING UP FRONT ────────────────
 *
 * The enable toggle is PER-ROW. A single `pending` boolean would disable every
 * row's toggle while one row is being written, which reads as "the console has
 * locked up" rather than "that one row is saving". So the in-flight state is
 * keyed by channelId — the S1-H12 lesson applied to the UI: a shared flag is a
 * freeze the operator cannot attribute to a cause.
 */

import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';

import type { ConsoleDataAdapter, CreatorRow } from '../adapters';

import {
  AddForm, Button, Channel, Count, Empty, Input, List, Name, Notice, Panel,
  PanelHead, PanelTitle, Row, RowTitle, Stat,
} from './roster.styles';


export interface RosterProps {
  adapter: ConsoleDataAdapter;
  rows: CreatorRow[];
  /** Re-read the roster from the source of truth. Called after every write. */
  onChanged: () => void | Promise<void>;
}

/** `null` renders as absent, and says why in the title attribute. */
export function formatCount(n: number | null): string {
  return n === null ? '—' : String(n);
}

export function Roster({ adapter, rows, onChanged }: RosterProps): ReactElement {
  const [ref, setRef] = useState('');
  const [adding, setAdding] = useState(false);
  // Keyed by channelId, NOT a single flag: one row saving must not disable another.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mark = useCallback((id: string, on: boolean) => {
    setPending((p) => {
      const next = { ...p };
      if (on) next[id] = true; else delete next[id];
      return next;
    });
  }, []);

  const onAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const value = ref.trim();
    if (!value || adding) return;
    setAdding(true);
    setError(null);
    setNotice(null);
    try {
      const created = await adapter.addCreator(value);
      setRef('');
      // REPORT WHAT THE ENGINE DID, not what we hoped: `enabled` is false on a
      // fresh add by design (tier T2 — enabling is a separate act), and saying so
      // is the difference between a console that surprises and one that informs.
      setNotice(
        created.enabled
          ? `Added ${created.title} (${created.channelId}).`
          : `Added ${created.title} (${created.channelId}). It is not enabled yet — `
            + 'turn it on when you want its transcripts fetched.',
      );
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  }, [adapter, ref, adding, onChanged]);

  const onToggle = useCallback(async (row: CreatorRow) => {
    if (pending[row.channelId]) return;
    mark(row.channelId, true);
    setError(null);
    setNotice(null);
    try {
      await adapter.setCreatorEnabled(row.channelId, !row.enabled);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      mark(row.channelId, false);
    }
  }, [adapter, pending, mark, onChanged]);

  return (
    <Panel data-testid="roster">
      <PanelHead>
        <PanelTitle>Creators</PanelTitle>
        <Count data-testid="roster-count">
          {rows.filter((r) => r.enabled).length} of {rows.length} enabled
        </Count>
      </PanelHead>

      {error !== null && <Notice $tone="error" role="alert" data-testid="roster-error">{error}</Notice>}
      {notice !== null && <Notice $tone="info" role="status" data-testid="roster-notice">{notice}</Notice>}

      <AddForm onSubmit={onAdd}>
        <Input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="@handle, channel URL, or UC… id"
          aria-label="Creator reference"
          disabled={adding}
          data-testid="roster-add-input"
        />
        <Button type="submit" disabled={adding || ref.trim() === ''} data-testid="roster-add-button">
          {adding ? 'Resolving…' : 'Add'}
        </Button>
      </AddForm>

      {rows.length === 0 ? (
        <Empty>No creators yet. Add one above — a fresh creator arrives disabled.</Empty>
      ) : (
        <List>
          {rows.map((row) => (
            <Row key={row.channelId} data-testid={`roster-row-${row.channelId}`}>
              <RowTitle>
                <Name title={row.title}>{row.title}</Name>
                <Channel>{row.channelId}</Channel>
              </RowTitle>
              <Stat
                title={row.videos === null ? 'state.json is damaged — the count could not be taken' : undefined}
                data-testid={`roster-stats-${row.channelId}`}
              >
                {formatCount(row.videos)} videos · {formatCount(row.fetched)} fetched
              </Stat>
              <Button
                type="button"
                onClick={() => onToggle(row)}
                disabled={pending[row.channelId] === true}
                aria-pressed={row.enabled}
                data-testid={`roster-toggle-${row.channelId}`}
              >
                {pending[row.channelId] === true ? 'Saving…' : row.enabled ? 'Disable' : 'Enable'}
              </Button>
            </Row>
          ))}
        </List>
      )}
    </Panel>
  );
}

export default Roster;
