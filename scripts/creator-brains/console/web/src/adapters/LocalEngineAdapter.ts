/*
 * LocalEngineAdapter — ConsoleDataAdapter over the bridge HTTP API.
 *
 * Talks ONLY to the nine routes that actually exist at S0 (05-contracts.md §2a).
 * `repair` and `backup` are contract members whose routes are DEFERRED to S3
 * (§2b); they throw a typed error instead of silently succeeding, so a caller
 * can never mistake "not implemented" for "done".
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

const DEFERRED_TO_S3 =
  'route not implemented until S3 — see 05-contracts.md §2b; the bridge has no such route yet';

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
        headers: { accept: 'application/json', ...(init?.body ? { 'content-type': 'application/json' } : {}) },
        ...init,
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

  async startDailyRun(_perHour: number): Promise<{ runId: string }> {
    // POST /api/run/daily is deferred to S4 (05-contracts.md §2b).
    throw new ConsoleApiError('NOT_FOUND', DEFERRED_TO_S3.replace('S3', 'S4'), { status: null });
  }

  canary(): Promise<CanaryReading> {
    return this.request<CanaryReading>('/api/canary');
  }

  async repair(): Promise<{ requeued: number }> {
    // POST /api/repair is deferred to S3 (05-contracts.md §2b).
    throw new ConsoleApiError('NOT_FOUND', DEFERRED_TO_S3, { status: null });
  }

  async backup(_dest?: string): Promise<{ dest: string; ok: boolean }> {
    // POST /api/backup is deferred to S3 (05-contracts.md §2b).
    throw new ConsoleApiError('NOT_FOUND', DEFERRED_TO_S3, { status: null });
  }
}
