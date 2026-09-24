/**
 * QueryConsole — search the published brains (S3).
 *
 * ── THE THREE HONESTY RULES THIS COMPONENT EXISTS TO KEEP (T-W5) ────────────
 *
 * 1. ZERO HITS IS NOT THE SAME AS "NOTHING MATCHED". The engine answers
 *    `{hits: [], skipped: []}` for a query that matched nothing AND for a query
 *    against a store where every brain was skipped. Those are different facts
 *    and the operator acts on them differently — the first says "try other
 *    words", the second says "your store is damaged". So the zero-hit copy NAMES
 *    THE TERMS the operator typed, and the skipped list is rendered whenever it
 *    is non-empty, including on a zero-hit result.
 *
 * 2. `skipped` IS THE ENGINE'S OWN ACCOUNTING. Each entry is a document the
 *    engine could not read, with its own reason. It is shown in full and not
 *    summarised into a count, because "3 skipped" is a number an operator cannot
 *    act on while "brains/foo/rules.jsonl is invalid: Unexpected token" names the
 *    file to look at. Dropping them is how a partial brain comes to look complete.
 *
 * 3. A HIT SHOWS WHERE IN THE VIDEO IT CAME FROM. `watchUrl` already carries
 *    `?t=<seconds>` from the engine, and it is rendered as given rather than
 *    rebuilt here — the engine owns the timestamp, and a console that
 *    recomputed `tStartMs` would be a second source of truth for the same value.
 *
 * ── WHY THE QUERY IS NOT DEBOUNCED ──────────────────────────────────────────
 *
 * There is no search-as-you-type. The bridge is loopback and the store is local,
 * but a query walks every published brain, and firing one per keystroke would
 * turn a slow store into a busy one for no gain — the operator cannot read
 * results faster than they type. Search is an explicit act (Enter or the button),
 * which also makes the request count equal the number of deliberate queries.
 */

import { useCallback, useState } from 'react';
import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { ConsoleDataAdapter, QueryHit, QueryResult } from '../adapters';

const Panel = styled.section`
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.2));
  border-radius: var(--radius-card, 20px);
  background: var(--carbon, #141419);
  padding: var(--space-5, 24px);
`;

const Head = styled.h2`
  margin: 0 0 var(--space-4, 16px);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ice-wing, #60c0f0);
`;

const Form = styled.form`
  display: flex;
  gap: var(--space-3, 12px);
  margin-bottom: var(--space-4, 16px);
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  background: var(--obsidian-black, #0a0a0f);
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.24));
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--text-primary, #e0ecf4);
  font-size: 14px;
  &::placeholder { color: var(--text-faint, rgba(224, 236, 244, 0.38)); }
`;

const Button = styled.button`
  background: var(--ice-wing, #60c0f0);
  color: var(--obsidian-black, #0a0a0f);
  border: 0;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Note = styled.p`
  margin: 0 0 var(--space-3, 12px);
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
  line-height: 1.5;
`;

const Warning = styled.div`
  border-left: 3px solid var(--gilded-fern, #c6a84b);
  background: rgba(198, 168, 75, 0.08);
  padding: var(--space-3, 12px) var(--space-4, 16px);
  border-radius: 0 8px 8px 0;
  margin-bottom: var(--space-4, 16px);
  font-size: 13px;
`;

const Failure = styled(Warning)`
  border-left-color: var(--danger, #f06060);
  background: rgba(240, 96, 96, 0.08);
`;

const SkipItem = styled.li`
  font-family: var(--font-data, monospace);
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
  word-break: break-word;
`;

const SkipList = styled.ul`
  margin: var(--space-2, 8px) 0 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const HitList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
`;

const Hit = styled.li`
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.14));
  border-radius: 10px;
  padding: var(--space-3, 12px) var(--space-4, 16px);
`;

const HitMeta = styled.div`
  font-family: var(--font-data, monospace);
  font-size: 11px;
  color: var(--text-faint, rgba(224, 236, 244, 0.38));
  margin-bottom: 6px;
`;

const Statement = styled.p`
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.5;
`;

const Watch = styled.a`
  font-size: 13px;
  color: var(--ice-wing, #60c0f0);
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

/** Seconds are what the engine put in `?t=`; shown as mm:ss for a human. */
export function formatWatchStamp(tStartMs: number): string {
  if (!Number.isFinite(tStartMs) || tStartMs < 0) return '—';
  const total = Math.floor(tStartMs / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export interface QueryConsoleProps {
  adapter: ConsoleDataAdapter;
}

export function QueryConsole({ adapter }: QueryConsoleProps): ReactElement {
  const [term, setTerm] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [asked, setAsked] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    try {
      const res = await adapter.query(q);
      setResult(res);
      // The term that PRODUCED this result, held separately from the input box.
      // Reading the box here instead would let the operator type over a running
      // query and leave the copy naming a term that returned nothing.
      setAsked(q);
    } catch (e) {
      setResult(null);
      setAsked(q);
      // The adapter has already mapped the bridge envelope, so `message` is the
      // engine's own sentence — shown as given, never rewritten (Roster rule 3).
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [adapter]);

  const skipped = result?.skipped ?? [];
  const hits: QueryHit[] = result?.hits ?? [];

  return (
    <Panel data-testid="query-console">
      <Head>Search the brains</Head>
      <Form
        onSubmit={(e) => { e.preventDefault(); void run(term); }}
        role="search"
      >
        <Input
          aria-label="Search terms"
          placeholder="e.g. pricing, retention, cold start"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
        <Button type="submit" disabled={busy || !term.trim()}>
          {busy ? 'Searching…' : 'Search'}
        </Button>
      </Form>

      {error !== null ? (
        <Failure role="alert">{error}</Failure>
      ) : null}

      {/* The skipped list renders on EVERY result, including a zero-hit one. A
          damaged store is exactly the case where "no results" would otherwise be
          read as "nothing matched". */}
      {skipped.length > 0 ? (
        <Warning data-testid="query-skipped">
          <strong>{skipped.length} document(s) could not be read.</strong> These are
          the engine&rsquo;s own reasons — a partial brain is not a complete one.
          <SkipList>
            {skipped.map((s, i) => (
              <SkipItem key={i}>{formatSkip(s)}</SkipItem>
            ))}
          </SkipList>
        </Warning>
      ) : null}

      {result !== null && hits.length === 0 ? (
        <Note data-testid="query-zero-hit">
          No claim matched <strong>{asked}</strong>
          {skipped.length > 0 ? ' — and some documents could not be read, above' : ''}.
          Try a different term.
        </Note>
      ) : null}

      {hits.length > 0 ? (
        <>
          <Note>{hits.length} claim(s) matched &ldquo;{asked}&rdquo;.</Note>
          <HitList>
            {hits.map((h, i) => (
              <Hit key={`${h.claimId}:${i}`}>
                <HitMeta>
                  {h.creatorTitle} · {h.topic} · {formatWatchStamp(h.tStartMs)}
                </HitMeta>
                <Statement>{h.statement}</Statement>
                <Watch href={h.watchUrl} target="_blank" rel="noreferrer noopener">
                  ▶ watch at {formatWatchStamp(h.tStartMs)}
                </Watch>
              </Hit>
            ))}
          </HitList>
        </>
      ) : null}
    </Panel>
  );
}

/**
 * Render one `skipped` entry as a single readable line.
 *
 * The engine's entries are `Record<string, unknown>`, so this is deliberately
 * defensive: a shape this console does not recognise is rendered as JSON rather
 * than as `[object Object]`. Losing the reason while keeping the entry would be
 * worse than showing it raw — the whole point of the list is the reason.
 */
export function formatSkip(entry: Record<string, unknown>): string {
  const file = typeof entry.file === 'string' ? entry.file : null;
  const reason = typeof entry.reason === 'string' ? entry.reason
    : typeof entry.detail === 'string' ? entry.detail
      : typeof entry.message === 'string' ? entry.message : null;
  if (file && reason) return `${file}: ${reason}`;
  if (file) return file;
  if (reason) return reason;
  try { return JSON.stringify(entry); } catch { return '(unrenderable skipped entry)'; }
}
