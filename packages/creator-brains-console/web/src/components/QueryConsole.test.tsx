/*
 * T-W5 (S3) — QueryConsole: zero-hit copy names the terms, the skipped list
 * renders, a hit shows a watch link carrying `?t=` seconds.
 *
 * EACH REQUIREMENT HAS A MUTANT IN MIND, and two of them are the reason this
 * file exists rather than trusting the happy path:
 *
 *   ZERO-HIT COPY NAMES THE TERMS. Not "no results" — the sentence must contain
 *   the term the operator typed. Mutant: hard-code "No results found" and the
 *   assertion fails, because the term is not in it. That matters because the
 *   operator's next action (refine the words) is chosen from WHAT they searched.
 *
 *   THE COPY NAMES THE TERM THAT PRODUCED THE RESULT, NOT THE CURRENT INPUT.
 *   The input box is editable while a query is in flight. Mutant: read the box
 *   at render time instead of storing the asked term, then type over a running
 *   query and the copy names a term that never returned anything.
 *
 *   SKIPPED RENDERS ON A ZERO-HIT RESULT TOO. This is the case the whole
 *   zero-hit/skipped distinction exists for: a damaged store returns no hits AND
 *   a non-empty skipped list, and rendering only the "no match" copy would read
 *   as "your words were wrong" when the truth is "your documents are unreadable".
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryConsole, formatWatchStamp, formatSkip } from '../components/QueryConsole';
import type { ConsoleDataAdapter, QueryHit, QueryResult } from '../adapters';

const hit = (over: Partial<QueryHit> = {}): QueryHit => ({
  claimId: 'vid1:12000',
  creatorId: 'UCaaaaaaaaaaaaaaaaaaaaaa',
  creatorTitle: 'Alpha',
  videoId: 'vid1',
  tStartMs: 12000,
  keyPhrase: 'pricing',
  statement: 'The price is fixed at the point of sale.',
  topic: 'pricing',
  watchUrl: 'https://youtu.be/vid1?t=12',
  ...over,
});

function harness(result: QueryResult | Error) {
  const query = vi.fn(async (_q: string) => {
    if (result instanceof Error) throw result;
    return result;
  });
  const adapter = { query } as unknown as ConsoleDataAdapter;
  return { adapter, query };
}

async function search(term: string) {
  fireEvent.change(screen.getByLabelText('Search terms'), { target: { value: term } });
  fireEvent.click(screen.getByRole('button', { name: /search/i }));
  await waitFor(() => expect(screen.queryByText(/Searching/)).toBeNull());
}

describe('T-W5 QueryConsole', () => {
  it('zero hits: the copy NAMES THE TERMS rather than saying "no results"', async () => {
    const h = harness({ hits: [], skipped: [] });
    render(<QueryConsole adapter={h.adapter} />);
    await search('retention curve');

    const zero = screen.getByTestId('query-zero-hit');
    expect(zero.textContent).toContain('retention curve');
    expect(h.query).toHaveBeenCalledWith('retention curve');
  });

  it('the copy names the term THAT PRODUCED the result, not what is in the box now', async () => {
    let release: (() => void) | null = null;
    const query = vi.fn((_q: string) => new Promise<QueryResult>((res) => {
      release = () => res({ hits: [], skipped: [] });
    }));
    render(<QueryConsole adapter={{ query } as unknown as ConsoleDataAdapter} />);

    fireEvent.change(screen.getByLabelText('Search terms'), { target: { value: 'first term' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    // Type over the in-flight query.
    fireEvent.change(screen.getByLabelText('Search terms'), { target: { value: 'second term' } });
    release!();

    await waitFor(() => expect(screen.getByTestId('query-zero-hit')).toBeTruthy());
    const zero = screen.getByTestId('query-zero-hit');
    expect(zero.textContent).toContain('first term');
    expect(zero.textContent).not.toContain('second term');
  });

  it('skipped renders AND zero-hit copy still appears when a damaged store returns neither hits nor silence', async () => {
    const h = harness({
      hits: [],
      skipped: [{ file: 'brains/alpha/rules.jsonl', reason: 'Unexpected token in JSON at position 0' }],
    });
    render(<QueryConsole adapter={h.adapter} />);
    await search('anything');

    const skipped = screen.getByTestId('query-skipped');
    // The REASON is rendered, not summarised into a count — "1 skipped" is a
    // number an operator cannot act on; the file name is what they open.
    expect(skipped.textContent).toContain('brains/alpha/rules.jsonl');
    expect(skipped.textContent).toContain('Unexpected token');
    expect(screen.getByTestId('query-zero-hit')).toBeTruthy();
  });

  it('a hit shows a watch link carrying the engine\'s own ?t= seconds', async () => {
    const h = harness({ hits: [hit()], skipped: [] });
    render(<QueryConsole adapter={h.adapter} />);
    await search('pricing');

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://youtu.be/vid1?t=12');
    expect(link.textContent).toContain('0:12');
  });

  it('a throwing query surfaces the engine sentence and renders no stale result', async () => {
    const h = harness(new Error('store is locked by another run (lock_held, pid 42)'));
    render(<QueryConsole adapter={h.adapter} />);
    await search('pricing');

    expect(screen.getByRole('alert').textContent).toContain('pid 42');
    expect(screen.queryByTestId('query-zero-hit')).toBeNull();
  });
});

describe('T-W5 formatting helpers', () => {
  it('formatWatchStamp is mm:ss and refuses nonsense rather than printing NaN', () => {
    expect(formatWatchStamp(0)).toBe('0:00');
    expect(formatWatchStamp(12000)).toBe('0:12');
    expect(formatWatchStamp(61000)).toBe('1:01');
    expect(formatWatchStamp(-1)).toBe('—');
    expect(formatWatchStamp(Number.NaN)).toBe('—');
  });

  it('formatSkip prefers file: reason, falls back to whatever the engine sent, never [object Object]', () => {
    expect(formatSkip({ file: 'a.jsonl', reason: 'bad' })).toBe('a.jsonl: bad');
    expect(formatSkip({ file: 'a.jsonl' })).toBe('a.jsonl');
    expect(formatSkip({ detail: 'only a detail' })).toBe('only a detail');
    expect(formatSkip({ weird: 1 })).toBe('{"weird":1}');
    expect(formatSkip({})).not.toContain('[object Object]');
  });
});
