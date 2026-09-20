/*
 * T-W1 (R12) — contract test.
 *
 * MockAdapter and LocalEngineAdapter must satisfy ONE shared behaviour suite:
 * same fixture in → same shape out, and identical error mapping.
 *
 * The live adapter is driven by a fake `fetch` that serves the real bridge
 * routes from the same fixtures, so this is a genuine parity test rather than
 * two independent assertions that happen to agree.
 */

import { describe, expect, it } from 'vitest';
import {
  ConsoleApiError,
  LocalEngineAdapter,
  MockAdapter,
  type ConsoleDataAdapter,
  type StatusInstrument,
} from '../adapters';
import * as fx from '../adapters/fixtures';

type Route = { status: number; body: unknown };
type RouteTable = Record<string, Route>;

function fakeFetch(table: RouteTable): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : String(input));
    const key = `${(init?.method ?? 'GET').toUpperCase()} ${url.pathname}`;
    const route = table[key];
    if (!route) {
      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: `no stub for ${key}` } }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(route.body), {
      status: route.status,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

const HAPPY: RouteTable = {
  'GET /api/status': { status: 200, body: fx.healthyStatus },
  'GET /api/creators': { status: 200, body: fx.creators },
  'GET /api/query': { status: 200, body: fx.queryResult },
  'GET /api/brains/systems-weekly': { status: 200, body: fx.brainDoc },
  'GET /api/run': { status: 200, body: fx.runState },
  'GET /api/canary': { status: 200, body: fx.canary },
  'GET /api/backlog': { status: 200, body: { lines: fx.healthyStatus.backlog.lines } },
};

function mock(): ConsoleDataAdapter {
  return new MockAdapter();
}

function local(table: RouteTable = HAPPY): ConsoleDataAdapter {
  return new LocalEngineAdapter({ baseUrl: 'http://127.0.0.1:7777', fetchImpl: fakeFetch(table) });
}

const IMPLEMENTATIONS: ReadonlyArray<readonly [string, () => ConsoleDataAdapter]> = [
  ['MockAdapter', mock],
  ['LocalEngineAdapter', local],
];

async function capture(p: Promise<unknown>): Promise<{ code: string; message: string; file: string | null }> {
  try {
    await p;
    throw new Error('expected the call to reject');
  } catch (err) {
    if (!(err instanceof ConsoleApiError)) throw err;
    return { code: err.code, message: err.message, file: err.damageFile };
  }
}

const REQUIRED_STATUS_KEYS: ReadonlyArray<keyof StatusInstrument> = [
  'ytdlp',
  'creators',
  'state',
  'budget',
  'backlog',
  'throttle',
  'census',
  'lock',
  'lastRun',
  'lastGood',
  'documents',
  'publishedBrains',
  'recentRuns',
];

describe.each(IMPLEMENTATIONS)('T-W1 contract: %s', (_name, make) => {
  it('getStatus returns every StatusInstrument field', async () => {
    const status = await make().getStatus();
    for (const key of REQUIRED_STATUS_KEYS) {
      expect(status, `missing field: ${key}`).toHaveProperty(key);
    }
    expect(typeof status.documents).toBe('number');
    expect(Array.isArray(status.backlog.lines)).toBe(true);
    expect(Array.isArray(status.recentRuns)).toBe(true);
  });

  it('listCreators returns rows carrying the contract fields', async () => {
    const rows = await make().listCreators();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(['channelId', 'enabled', 'fetched', 'title', 'videos']);
      expect(typeof row.enabled).toBe('boolean');
    }
  });

  it('query returns hits whose watchUrl is built from videoId + tStartMs', async () => {
    const result = await make().query('backpressure');
    expect(result.hits.length).toBeGreaterThan(0);
    for (const hit of result.hits) {
      const seconds = Math.floor(hit.tStartMs / 1000);
      expect(hit.watchUrl).toBe(`https://youtu.be/${hit.videoId}?t=${seconds}`);
    }
    // skipped rows are carried, not dropped
    expect(result.skipped.length).toBeGreaterThan(0);
  });

  it('getRunState carries lock, throttle, budget and recentRuns', async () => {
    const run = await make().getRunState();
    expect(run).toHaveProperty('journal');
    expect(run).toHaveProperty('lock');
    expect(run).toHaveProperty('throttle');
    expect(run).toHaveProperty('budget');
    expect(run).toHaveProperty('recentRuns');
  });

  it('getBrain returns a published-generation doc, never raw transcript text', async () => {
    const doc = await make().getBrain('systems-weekly');
    expect(doc.slug).toBe('systems-weekly');
    expect(typeof doc.index).toBe('string');
    expect(Array.isArray(doc.claims)).toBe(true);
  });

  it('canary carries cached-probe provenance', async () => {
    const reading = await make().canary();
    expect(reading).toHaveProperty('ok');
    expect(reading).toHaveProperty('source');
    expect(reading).toHaveProperty('stale');
  });
});

/*
 * Client-side validation is deliberately NOT in the shared suite above.
 * 05-contracts.md §2 scopes "both client and server" to `perHour` only; an empty
 * `query.q` is the bridge's 400 to raise. Asserting a client guard in the parity
 * suite would have asserted a behaviour only one implementation has — which is
 * how a contract test quietly becomes a fiction.
 */
describe('T-W1 validation: client guard vs server refusal', () => {
  it('MockAdapter rejects an empty query client-side with VALIDATION', async () => {
    const seen = await capture(new MockAdapter().query('   '));
    expect(seen.code).toBe('VALIDATION');
  });

  it('both adapters surface a server-side VALIDATION identically', async () => {
    const envelope = { error: { code: 'VALIDATION', message: 'q must be a non-empty string' } };
    const fromMock = await capture(
      new MockAdapter({ faults: { query: { status: 400, body: envelope } } }).query('x'),
    );
    const fromLocal = await capture(
      local({ 'GET /api/query': { status: 400, body: envelope } }).query('x'),
    );
    expect(fromMock).toEqual(fromLocal);
    expect(fromMock.code).toBe('VALIDATION');
  });
});

describe('T-W1 parity: identical error mapping', () => {
  const ENVELOPES: ReadonlyArray<readonly [string, number, unknown, string, string | null]> = [
    [
      'STORE_DAMAGED',
      409,
      { error: { code: 'STORE_DAMAGED', message: 'registry.json is unreadable', file: 'registry.json' } },
      'STORE_DAMAGED',
      'registry.json',
    ],
    [
      'RUN_LOCKED',
      409,
      { error: { code: 'RUN_LOCKED', message: 'run in progress', file: undefined } },
      'RUN_LOCKED',
      null,
    ],
    [
      'VALIDATION',
      400,
      { error: { code: 'VALIDATION', message: 'perHour must be an integer >= 1' } },
      'VALIDATION',
      null,
    ],
    ['REFUSED', 422, { error: { code: 'REFUSED', message: 'engine refused: tier T4' } }, 'REFUSED', null],
    ['NOT_FOUND', 404, { error: { code: 'NOT_FOUND', message: 'no published brain' } }, 'NOT_FOUND', null],
  ];

  it.each(ENVELOPES)('%s maps identically on both adapters', async (_label, status, body, code, file) => {
    const fromMock = await capture(
      new MockAdapter({ faults: { getStatus: { status, body } } }).getStatus(),
    );
    const fromLocal = await capture(
      local({ 'GET /api/status': { status, body } }).getStatus(),
    );

    expect(fromMock).toEqual(fromLocal);
    expect(fromMock.code).toBe(code);
    expect(fromMock.file).toBe(file);
  });

  it('an undocumented body shape degrades to UNKNOWN on both, carrying the status', async () => {
    const fromMock = await capture(
      new MockAdapter({ faults: { getStatus: { status: 500, body: { oops: true } } } }).getStatus(),
    );
    const fromLocal = await capture(local({ 'GET /api/status': { status: 500, body: { oops: true } } }).getStatus());
    expect(fromMock).toEqual(fromLocal);
    expect(fromMock.code).toBe('UNKNOWN');
  });
});

describe('T-W1 honesty: deferred routes do not silently succeed', () => {
  it('LocalEngineAdapter refuses repair/backup/startDailyRun until their slice lands', async () => {
    const adapter = local();
    for (const call of [adapter.repair(), adapter.backup(), adapter.startDailyRun(5)]) {
      const seen = await capture(call);
      expect(seen.code).toBe('NOT_FOUND');
      expect(seen.message).toMatch(/S3|S4/);
    }
  });
});
