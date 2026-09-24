/*
 * RunConsole — start a daily pass, and report it honestly (S4, R7; T-W6).
 *
 * ── THE ONE RULE THAT SHAPES EVERY LINE BELOW ───────────────────────────────
 *
 * `19 §5` / A1-05: **acceptance is not completion**. `POST /api/run/daily` answers
 * `202 {requestId, runId: null}` and `runId` is null because the engine accepts no caller-supplied
 * id. So this panel is handed an id it cannot correlate with anything, and it must never pretend
 * otherwise. Three specific temptations, each of which would be a lie:
 *
 * 1. **"Started" after a 202.** The 202 means the request was ACCEPTED. It does not mean a run
 *    began, and it certainly does not mean one reached the store. The panel says what it knows:
 *    accepted, progress read from the engine.
 * 2. **"Finished" when the poll stops showing a run.** The poll stops being *driven* when the
 *    verdict is no longer in-flight — that is a fact about a journal file. It is not evidence that
 *    the run succeeded, and the panel reports the journal's own status instead of a conclusion.
 * 3. **Showing OUR requestId as the run id.** It would be the most natural correlation in the
 *    world and it is fabricated — the engine never saw that string. The run id shown is the
 *    JOURNAL's, and when the journal has none the panel shows none.
 *
 * The verdict logic lives in `runVerdict.ts` and the loop in `useRunPoll.ts`; this file is the
 * layout and the two interactions. That split is deliberate: it makes the honesty rules testable
 * without a DOM, and it keeps the panel's copy inseparable from the state that justifies it.
 *
 * ── A RUN_LOCKED REFUSAL IS SHOWN VERBATIM ─────────────────────────────────
 *
 * The adapter has already mapped the bridge envelope, so `err.message` IS the engine's sentence with
 * the holder's pid and host in it. Rewriting it into "could not start" would discard the only two
 * facts that tell the operator what to do about it (Roster rule 3).
 */

import { useCallback, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { ConsoleDataAdapter } from '../adapters';
import { sinceText, validatePerHour, verdictOf } from './runVerdict';
import { useRunPoll } from '../hooks/useRunPoll';
import {
  Button, Field, FieldLabel, Head, Input, Note, Ok, Panel, Warning,
} from './ops.styles';

/**
 * The default clock, hoisted to module scope.
 *
 * An inline `() => Date.now()` default is a NEW function identity per render, and `now` reaches the
 * polling hook — where an unstable dependency tears the loop down and re-arms it on every render,
 * which is an infinite loop that only shows up as a hung test. Hoisting it here (and stabilising
 * inside the hook) means a caller cannot reintroduce it, deliberately or by accident.
 */
function defaultNow(): number {
  return Date.now();
}

export interface RunConsoleProps {
  adapter: ConsoleDataAdapter;
  /** Cadence while a run is in flight. 0 disables the loop entirely (tests). */
  pollMs?: number;
  /** Injectable clock, so the watch's grace window is testable without real waiting. */
  now?: () => number;
}

export function RunConsole({ adapter, pollMs = 2000, now = defaultNow }: RunConsoleProps): ReactElement {
  const [perHour, setPerHour] = useState('60');
  const [accepted, setAccepted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** A client-side refusal is a DIFFERENT class from an engine refusal (`19 §5`), so it is held
   *  separately and worded as ours: "nothing was sent" is a claim only we can make. */
  const [invalid, setInvalid] = useState<string | null>(null);

  /**
   * The verdict the loop's cadence is derived from.
   *
   * `useRunPoll` is told `active` before it has produced the reading that determines it, so this
   * lags by exactly one read. It does NOT gate the loop — an earlier version made it the on/off
   * switch and the component then made precisely one read ever, because a ref written during render
   * does not re-render and the transition the hook waited for never arrived. The cadence carries the
   * policy now: in flight → 2 s, idle → 5 s.
   */
  const drivenBy = useRef(false);

  const poll = useRunPoll(adapter, { active: drivenBy.current, pollMs });
  const verdict = verdictOf(poll.state, accepted);

  // Advance the lag by exactly one read. Assigning after the hook call is what keeps it at one
  // read rather than feeding back within the same render.
  drivenBy.current = verdict.active;

  const start = useCallback(async () => {
    const problem = validatePerHour(perHour);
    if (problem !== null) {
      setInvalid(problem);
      setAccepted(null);
      setError(null);
      return;
    }
    setInvalid(null);
    setError(null);
    setBusy(true);
    try {
      const res = await adapter.startDailyRun(Number(perHour.trim()));
      // Only the requestId is kept. `res.runId` is null by contract (A1-05) and is deliberately
      // NOT stored: a stored null invites a template that renders it as "no id" beside a real run.
      setAccepted(res.requestId);
      // Read immediately rather than waiting a full cadence: if the run reached the store, the
      // journal already says so, and the operator should not be told "unknown" for 2 seconds.
      poll.refresh();
    } catch (e) {
      // The engine's own sentence, holder included (Roster rule 3). NOT "could not start".
      setAccepted(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [adapter, perHour, poll]);

  return (
    <Panel data-testid="run-console">
      <Head>Daily pass</Head>

      <form
        onSubmit={(e) => { e.preventDefault(); void start(); }}
        style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}
      >
        <Field>
          <FieldLabel htmlFor="run-per-hour">Operations per hour</FieldLabel>
          <Input
            id="run-per-hour"
            inputMode="numeric"
            value={perHour}
            onChange={(e) => { setPerHour(e.target.value); setInvalid(null); }}
            aria-describedby={invalid !== null ? 'run-per-hour-why' : undefined}
            aria-invalid={invalid !== null}
            data-testid="run-per-hour"
          />
        </Field>
        <Button type="submit" disabled={busy} data-testid="run-start">
          {busy ? 'Requesting…' : 'Run a daily pass'}
        </Button>
      </form>

      {invalid !== null ? (
        <Warning role="alert" data-testid="run-invalid" id="run-per-hour-why">
          {invalid} <em>Nothing was sent — this was checked here, not refused by the engine.</em>
        </Warning>
      ) : null}

      {error !== null ? (
        <Warning role="alert" data-testid="run-error">{error}</Warning>
      ) : null}

      {accepted !== null ? (
        <Ok role="status" data-testid="run-accepted">
          Accepted as request <code data-testid="run-accepted-id">{accepted}</code>. This is the
          console&rsquo;s own request id — the engine accepts no caller-supplied run id, so there is
          nothing it can be correlated with. Progress is read from the engine below.
        </Ok>
      ) : null}

      <Note data-testid="run-verdict">
        <strong data-testid="run-verdict-sentence">{verdict.sentence}</strong>{' '}
        {poll.readAt !== null ? `(observed ${sinceText(poll.readAt, now())})` : ''}
      </Note>

      {/* The last read failed but a previous reading is still on screen. Saying so, rather than
          silently ageing the sentence above, is the difference between a stale reading and a wrong
          one — and the operator cannot tell those apart from the sentence alone. */}
      {poll.error !== null ? (
        <Warning role="alert" data-testid="run-read-failed">
          The last read of the run state failed ({poll.error.code}), so the line above is the
          previous reading and may be out of date. {poll.error.message}
        </Warning>
      ) : null}
    </Panel>
  );
}

export default RunConsole;
