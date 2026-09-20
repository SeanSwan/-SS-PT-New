/*
 * T-W11 — the console must survive a payload it did not expect.
 *
 * WHY THIS FILE EXISTS (S1-H17 / S1-H18, round 5 pass 3). The UI's entire
 * defence against a payload of the wrong shape is that no component happens to
 * throw on the payloads anyone has tried. `LocalEngineAdapter.request` ends with
 * `return body as T` — an **unchecked cast** — and there is **no error boundary**
 * above `App`. In React 18 an uncaught error during render unmounts the whole
 * root, so the operator gets a **blank page**: no status, no message, and no clue
 * which field was wrong.
 *
 * The trigger is not exotic. `console/web/dist/` is a BUILD ARTIFACT served by a
 * separately-versioned bridge, so a `dist/` older or newer than the bridge is
 * enough to change the payload's shape. One missing top-level key — `recentRuns`,
 * `census`, `backlog.lines` — is all it takes, because `StatusBoard` dereferences
 * every one of them on its first render.
 *
 * The last case in this file is the control: a healthy payload must still render
 * the board, so the guard cannot be satisfied by refusing everything.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';
import { App } from '../App';
import { LocalEngineAdapter, MockAdapter } from '../adapters';
import type { StatusInstrument } from '../adapters';
import { ErrorBoundary } from '../components/ErrorBoundary';
import * as fx from '../adapters/fixtures';

/** A bridge that answers 200 with a payload the console did not expect. */
const wrongShape = (payload: unknown) => new MockAdapter({ status: payload as StatusInstrument });

/** JSON `Response`, so the live adapter is driven through its real request path. */
const jsonOk = (body: unknown) => async () => new Response(JSON.stringify(body), {
  status: 200,
  headers: { 'content-type': 'application/json' },
});

describe('T-W11 payload-shape robustness', () => {
  it('a wrong-shaped payload produces a NAMED failure, not a blank console', async () => {
    render(<App adapter={wrongShape({ unexpected: true })} pollMs={0} />);

    const fault = await screen.findByTestId('console-fault');

    expect(fault).toBeInTheDocument();
    // The shell is still mounted: the page did not go blank.
    expect(document.body.textContent).not.toBe('');
    expect(document.body.textContent).toMatch(/Creator Brains Console/);
    // ...and it says something actionable rather than showing nothing.
    expect(fault.textContent?.length ?? 0).toBeGreaterThan(10);
  });

  it('a payload missing ONE nested key is caught the same way', async () => {
    const almost: Record<string, unknown> = { ...fx.healthyStatus };
    delete almost.recentRuns;

    render(<App adapter={wrongShape(almost)} pollMs={0} />);

    expect(await screen.findByTestId('console-fault')).toBeInTheDocument();
  });

  it('a payload whose array field is not an array is caught too', async () => {
    // `status.backlog.lines.length` then `.join(...)` — a string has `.length`
    // but no `.join`, so this throws one dereference deeper than a missing key.
    const bent = { ...fx.healthyStatus, backlog: { lines: 'not an array' } };

    render(<App adapter={wrongShape(bent)} pollMs={0} />);

    expect(await screen.findByTestId('console-fault')).toBeInTheDocument();
  });

  it('the LIVE adapter refuses a wrong-shaped 200 with a typed error, not an unchecked cast', async () => {
    const adapter = new LocalEngineAdapter({
      baseUrl: 'http://127.0.0.1:9',
      fetchImpl: jsonOk({ unexpected: true }) as unknown as typeof fetch,
    });

    await expect(adapter.getStatus()).rejects.toMatchObject({ name: 'ConsoleApiError' });
  });

  it('the LIVE adapter names the OFFENDING PATH when a nested field is bent', async () => {
    // The same payload that blanks the board through a non-validating adapter
    // (the case above) must instead arrive as a refusal that says which field
    // was wrong. Asserted precisely, because "it threw something" would pass
    // against a guard that refuses every payload.
    const bent = { ...fx.healthyStatus, backlog: { lines: 'not an array' } };
    const adapter = new LocalEngineAdapter({
      baseUrl: 'http://127.0.0.1:9',
      fetchImpl: jsonOk(bent) as unknown as typeof fetch,
    });

    const err = await adapter.getStatus().then(
      () => null,
      (e: unknown) => e as { name: string; code: string; status: number; message: string },
    );

    expect(err?.name).toBe('ConsoleApiError');
    expect(err?.code).toBe('UNKNOWN');
    expect(err?.status).toBe(200);
    expect(err?.message).toMatch(/body\.backlog\.lines: expected an array/);
  });

  it('the LIVE adapter refuses a payload missing exactly ONE top-level key', async () => {
    // The motivating scenario stated plainly: the bridge and this build disagree
    // about one field. Layer 1 must name it, not hand it to the boundary.
    const almost: Record<string, unknown> = { ...fx.healthyStatus };
    delete almost.recentRuns;
    const adapter = new LocalEngineAdapter({
      baseUrl: 'http://127.0.0.1:9',
      fetchImpl: jsonOk(almost) as unknown as typeof fetch,
    });

    const err = await adapter.getStatus().then(
      () => null,
      (e: unknown) => e as { name: string; message: string },
    );

    expect(err?.name).toBe('ConsoleApiError');
    expect(err?.message).toMatch(/body\.recentRuns: expected an array/);
  });

  it('the boundary contains a throw from ANY child, not only the status board', () => {
    // Proves the mechanism itself, independently of StatusBoard — this is what
    // makes the `main.tsx` mount point safe even though no test renders it.
    const Bomb = (): ReactElement => {
      throw new Error('T-W11g deliberate render throw');
    };

    render(
      <ErrorBoundary scope="The probe">
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('console-fault')).toBeInTheDocument();
    expect(screen.getByTestId('console-fault-detail').textContent).toMatch(/T-W11g deliberate render throw/);
    expect(screen.getByTestId('console-fault').textContent).toMatch(/The probe/);
  });

  it('a HEALTHY payload still renders the board — the guard is not a blanket refusal', async () => {
    render(<App adapter={new MockAdapter()} pollMs={0} />);

    expect(await screen.findByTestId('status-board')).toBeInTheDocument();
    expect(screen.queryByTestId('console-fault')).not.toBeInTheDocument();
  });

  it('a HEALTHY payload survives the LIVE adapter path too', async () => {
    // The control for the validator: `healthyStatus` must pass the shape guard,
    // or the console would refuse the very bridge it was built against.
    const adapter = new LocalEngineAdapter({
      baseUrl: 'http://127.0.0.1:9',
      fetchImpl: jsonOk(fx.healthyStatus) as unknown as typeof fetch,
    });

    await expect(adapter.getStatus()).resolves.toMatchObject({ publishedBrains: 12 });
  });

  it('an UNKNOWN published count passes the guard and is NOT defaulted (R3-02)', async () => {
    // The contained enumerator answers `null` when it refuses, and names the
    // damage beside it. The shape guard must accept that, and the client must pass
    // it through UNCHANGED — defaulting it to 0 here would recreate the exact
    // falsehood ("nothing is published") the route went to the trouble of avoiding.
    const adapter = new LocalEngineAdapter({
      baseUrl: 'http://127.0.0.1:9',
      fetchImpl: jsonOk(fx.damagedBrainsStatus) as unknown as typeof fetch,
    });

    await expect(adapter.getStatus()).resolves.toMatchObject({
      publishedBrains: null,
      publishedBrainsDamaged: { file: 'current.json' },
    });
  });
});
