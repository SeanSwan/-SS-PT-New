/**
 * OpsRail — the two operator actions (S3): repair, and backup.
 *
 * ── WHY ONE OF THESE IS DISABLED AND THE OTHER IS NOT ───────────────────────
 *
 * This component's whole reason for existing is the ASYMMETRY between its two
 * buttons, and getting it wrong in either direction is a defect:
 *
 *   REPAIR is live. It runs the engine's own repair path on the shared
 *   run-operation gate, and may answer `409 RUN_LOCKED {holder}` when a run holds
 *   the store. A refusal is shown verbatim — it names the pid and host, which is
 *   the only thing that tells the operator what to do.
 *
 *   BACKUP is VISIBLE BUT BLOCKED, with NO endpoint. This is not an unfinished
 *   button and must not be presented as one. `05 §2b`: `backup-command.mjs:46–59`
 *   copies the durable set INCLUDING RAW TRANSCRIPTS, and `01` bans transcript
 *   content from every console surface. A1-08 / D4 is Sean's open decision about
 *   whether an engine-only private backup is an allowed exception. Until he
 *   rules, the console says so — it does not offer a control that would either
 *   fail or, worse, do the banned thing.
 *
 * The button is DISABLED rather than absent because "we deliberately withheld
 * this" and "we forgot it" look identical from the outside, and only one of them
 * is true. It is disabled rather than hidden for the same reason. Its
 * `aria-describedby` names the reason, so the explanation is not carried by the
 * `title` attribute alone — a tooltip is not an explanation for a screen reader,
 * and this is the one control whose absence of function is the point.
 *
 * ── WHY THE RESULT IS SHOWN AS THREE COUNTS, NOT AS "DONE" ──────────────────
 *
 * The engine's repair answers `{repaired, built, emptied}` — three numbers about
 * what actually changed. Rendering "Repair complete" would discard all three and
 * make a repair that emptied 40 rows indistinguishable from one that changed
 * nothing. Each count is shown with its own label, and the summary sentence is
 * derived from them rather than asserted over them.
 */

import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { ConsoleDataAdapter } from '../adapters';
import { Blocked, Button, Head, Panel, Warning, Why } from './ops.styles';

const Counts = styled.dl`
  display: flex;
  gap: var(--space-5, 24px);
  margin: var(--space-4, 16px) 0 0;
  padding-top: var(--space-3, 12px);
  border-top: 1px solid var(--border-electric, rgba(96, 192, 240, 0.14));
`;

const Count = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const CountValue = styled.dd`
  margin: 0;
  font-family: var(--font-data, monospace);
  font-size: 20px;
  color: var(--frost-white, #e0ecf4);
`;

const CountLabel = styled.dt`
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-faint, rgba(224, 236, 244, 0.38));
`;

const Rail = styled(Panel)`
  margin-top: var(--space-5, 24px);
`;

const Actions = styled.div`
  display: flex;
  gap: var(--space-3, 12px);
  flex-wrap: wrap;
  align-items: flex-start;
`;

const Ok = styled(Warning)`
  border-left-color: var(--gilded-fern, #c6a84b);
  background: rgba(198, 168, 75, 0.08);
`;

export interface RepairCounts { repaired: number; built: number; emptied: number; }

/** The sentence is DERIVED from the counts; it never asserts success on its own. */
export function summariseRepair(c: RepairCounts): string {
  const parts: string[] = [];
  if (c.repaired) parts.push(`${c.repaired} state row(s) reconciled`);
  if (c.built) parts.push(`${c.built} brain(s) rebuilt`);
  if (c.emptied) parts.push(`${c.emptied} emptied`);
  return parts.length ? `${parts.join(', ')}.` : 'Repair ran and changed nothing.';
}

export interface OpsRailProps {
  adapter: ConsoleDataAdapter;
  /** Re-read whatever the repair may have changed. */
  onChanged?: () => void | Promise<void>;
}

export function OpsRail({ adapter, onChanged }: OpsRailProps): ReactElement {
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState<RepairCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const repair = useCallback(async () => {
    setBusy(true);
    setError(null);
    setCounts(null);
    try {
      const res = await adapter.repair();
      setCounts(res);
      if (onChanged) await onChanged();
    } catch (e) {
      // A RUN_LOCKED refusal arrives here carrying the engine's own sentence,
      // holder included — the adapter already mapped the envelope, so
      // `err.message` IS that sentence. It is shown verbatim (Roster's rule 3):
      // rewriting it into "could not repair" would discard the pid and host,
      // which are the only things that tell the operator what to do.
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [adapter, onChanged]);

  return (
    <Rail data-testid="ops-rail">
      <Head>Operations</Head>
      <Actions>
        <Button type="button" onClick={() => void repair()} disabled={busy} data-testid="repair-button">
          {busy ? 'Repairing…' : 'Repair the store'}
        </Button>

        <Blocked>
          {/* `disabled` AND an aria-describedby: the reason must reach assistive
              tech, not live only in a tooltip. */}
          <Button
            type="button"
            disabled
            aria-describedby="ops-backup-why"
            data-testid="backup-button"
          >
            Back up
          </Button>
          <Why id="ops-backup-why">
            Blocked: the engine&rsquo;s backup copies raw transcripts, which the
            console may not surface. Awaiting an owner decision (A1-08 / D4).
            There is no endpoint behind this button.
          </Why>
        </Blocked>
      </Actions>

      {error !== null ? (
        <Warning role="alert" data-testid="repair-error">{error}</Warning>
      ) : null}

      {counts !== null ? (
        <div data-testid="repair-result">
          <Counts>
            <Count>
              <CountValue>{counts.repaired}</CountValue>
              <CountLabel>rows reconciled</CountLabel>
            </Count>
            <Count>
              <CountValue>{counts.built}</CountValue>
              <CountLabel>brains rebuilt</CountLabel>
            </Count>
            <Count>
              <CountValue>{counts.emptied}</CountValue>
              <CountLabel>emptied</CountLabel>
            </Count>
          </Counts>
          <Ok>{summariseRepair(counts)}</Ok>
        </div>
      ) : null}
    </Rail>
  );
}
