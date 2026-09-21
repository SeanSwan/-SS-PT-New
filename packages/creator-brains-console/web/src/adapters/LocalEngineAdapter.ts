/*
 * LocalEngineAdapter — ConsoleDataAdapter over the bridge HTTP API.
 *
 * Talks ONLY to the routes that actually exist. At S0 that was the nine read
 * routes of `05-contracts.md` §2a. Since then the write routes have landed slice
 * by slice: S3 added `POST /api/repair`, so `repair` is now a real call.
 *
 * The remaining non-calls are TWO DIFFERENT THINGS and are kept apart on purpose:
 *   - `startDailyRun` — a slice not yet built (S4). Deferred.
 *   - `backup` — a route the contract WITHHOLDS (A1-08 / D4 still open). Not an
 *     unbuilt slice, and it must not be described as one: a reader who files it
 *     under "S4 work" would route it to the wrong owner, and the boundary it
 *     defends (the engine copy includes raw transcripts, which `01` bans from
 *     every served surface) is a ruling, not a backlog item.
 * Both throw a typed error instead of silently succeeding, so a caller can never
 * mistake "not implemented" for "done".
 */

import { ConsoleApiError, mapBridgeError, mapTransportError } from './errors';
import { parseStatusInstrument } from './validate';
import type {
  BrainDoc,
  CanaryReading,
  ConsoleDataAdapter,
  CreatorRow,
  QueryResult,
  RunState,
  StatusInstrument,
} from './types';

export interface LocalEngineAdapterOptions {
  /** Bridge origin. Defaults to the page origin (the bridge serves the app). */
  baseUrl?: string;
  /** Injected for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * The one route still awaiting its slice (S4). This began as a shared
 * `DEFERRED_TO_S3` string that callers patched with `.replace('S3','S4')` — a
 * construction whose only merit was brevity, and which silently produced a
 * sentence about S3 whenever the patch was forgotten. S3 has now landed
 * `repair`, so exactly one caller remains and it names its own slice.
 */
const DEFERRED_TO_S4 =
  'route not implemented until S4 — see 05-contracts.md §2b; the bridge has no such route yet';

/**
 * The bridge's write gate requires this header on every mutating request
 * (`lib/write-gate.mjs`, A1-09). It is duplicated rather than imported because
 * `web/src` may not reach outside itself (T-W2, `no-engine-import.test.ts`), and
 * `bridge.writegate.test.mjs` asserts this literal still matches the gate — a
 * client that fails its own bridge's gate is a 403 with no clue why.
 */
const WRITE_HEADER = 'x-console-write';

export class LocalEngineAdapter implements ConsoleDataAdapter {
  private readonly baseUrl: string;
  private readonly doFetch: typeof fetch;

  constructor(opts: LocalEngineAdapterOptions = {}) {
    this.baseUrl = opts.baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1');
    this.doFetch = opts.fetchImpl ?? ((...args) => fetch(...args));
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await this.doFetch(`${this.baseUrl}${path}`, {
        // `...init` spreads FIRST so that a caller passing its own `headers`
        // cannot drop the write header and turn every write into a 403.
        ...init,
        headers: {
          accept: 'application/json',
          ...(init?.headers as Record<string, string> | undefined),
          [WRITE_HEADER]: '1',
          ...(init?.body ? { 'content-type': 'application/json' } : {}),
        },
      });
    } catch (err) {
      throw mapTransportError(err);
    }

    let body: unknown = null;
    const text = await res.text();
    if (text.length > 0) {
      try {
        body = JSON.parse(text);
      } catch {
        // Non-JSON body (e.g. an HTML 404 page) degrades to UNKNOWN below.
        body = null;
      }
    }

    if (!res.ok) throw mapBridgeError(res.status, body);
    // Still an unchecked cast for the eight routes no S1 component reads;
    // `/api/status` is validated by its caller below (S1-H18). The scope
    // decision and the follow-ups are recorded in adapters/validate.ts.
    return body as T;
  }

  async getStatus(): Promise<StatusInstrument> {
    // Validated, not cast: a 200 of the wrong shape becomes a typed
    // ConsoleApiError that `useStatus` can catch, instead of a render throw that
    // blanks the console (S1-H18).
    return parseStatusInstrument(await this.request<unknown>('/api/status'));
  }

  listCreators(): Promise<CreatorRow[]> {
    return this.request<CreatorRow[]>('/api/creators');
  }

  addCreator(ref: string): Promise<CreatorRow> {
    return this.request<CreatorRow>('/api/creators', {
      method: 'POST',
      body: JSON.stringify({ ref }),
    });
  }

  setCreatorEnabled(channelId: string, enabled: boolean): Promise<CreatorRow> {
    return this.request<CreatorRow>(`/api/creators/${encodeURIComponent(channelId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
  }

  query(q: string, creator?: string): Promise<QueryResult> {
    const params = new URLSearchParams({ q });
    if (creator) params.set('creator', creator);
    return this.request<QueryResult>(`/api/query?${params.toString()}`);
  }

  getBrain(slug: string): Promise<BrainDoc> {
    return this.request<BrainDoc>(`/api/brains/${encodeURIComponent(slug)}`);
  }

  getRunState(): Promise<RunState> {
    return this.request<RunState>('/api/run');
  }

  async startDailyRun(_perHour: number): Promise<{ requestId: string; runId: string | null }> {
    // POST /api/run/daily is deferred to S4 (05-contracts.md §2b).
    throw new ConsoleApiError('NOT_FOUND', DEFERRED_TO_S4, { status: null });
  }

  canary(): Promise<CanaryReading> {
    return this.request<CanaryReading>('/api/canary');
  }

  /**
   * S3: the repair route now exists (`POST /api/repair`), so this no longer
   * throws a placeholder. It is a POST with no body — the operation takes no
   * parameters, and the exclusion gate is the bridge's business, not the
   * client's. A `409 RUN_LOCKED` refusal arrives as a ConsoleApiError carrying
   * the engine's own sentence, holder included.
   */
  repair(): Promise<{ repaired: number; built: number; emptied: number }> {
    return this.request<{ repaired: number; built: number; emptied: number }>(
      '/api/repair', { method: 'POST' },
    );
  }

  /**
   * STILL BLOCKED, AND DELIBERATELY SO (A1-08 / D4, `05 §2b`). This is not a
   * slice that has not landed — it is a route the contract WITHHOLDS, because
   * the engine's backup copies raw transcripts and `01` bans those from every
   * console surface.
   *
   * The throw is kept rather than deleted. If the UI ever calls this without the
   * button being disabled, the failure is a named `NOT_FOUND` with this sentence
   * rather than a 404 from the bridge that reads like a routing bug. The button
   * in `OpsRail` is disabled and says the same thing to the operator.
   *
   * IT REJECTS RATHER THAN THROWS SYNCHRONOUSLY. The signature is
   * `Promise<{dest,ok}>`, so a synchronous throw is a method that does not honour
   * its own return type: `adapter.backup().catch(…)` — the shape every caller
   * here uses — misses it entirely, and the exception escapes as an
   * unhandled error at the call site. `async` makes the rejection arrive where
   * the type says it will. This was caught by a test that had always passed,
   * because until S3 all three deferred members threw synchronously and the
   * harness never had to distinguish.
   */
  async backup(_dest?: string): Promise<{ dest: string; ok: boolean }> {
    throw new ConsoleApiError(
      'NOT_FOUND',
      'backup is withheld by the console contract (A1-08 / D4) — the engine copy includes raw '
      + 'transcripts; there is no endpoint. Not an unbuilt slice.',
      { status: null },
    );
  }
}
