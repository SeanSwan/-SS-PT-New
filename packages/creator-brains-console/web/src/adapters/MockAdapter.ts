/*
 * MockAdapter — fixtures-backed ConsoleDataAdapter (05-contracts.md §1).
 *
 * Fault injection is expressed as the *wire* form (HTTP status + envelope body)
 * and pushed through the same `mapBridgeError` the live adapter uses. That is
 * deliberate: T-W1 requires identical error mapping, and the only way to prove
 * it is for the mock to fail the way the bridge fails.
 */

import { mapBridgeError, ConsoleApiError } from './errors';
import * as fx from './fixtures';
import type {
  BrainDoc,
  CanaryReading,
  ConsoleDataAdapter,
  CreatorRow,
  QueryResult,
  RunState,
  StatusInstrument,
} from './types';

export interface MockFault {
  status: number;
  body: unknown;
}

export interface MockAdapterOptions {
  /** Per-method faults, keyed by adapter method name. */
  faults?: Partial<Record<keyof ConsoleDataAdapter, MockFault>>;
  /** Artificial latency in ms; 0 in tests unless a test wants a pending state. */
  latencyMs?: number;
  status?: StatusInstrument;
  creators?: CreatorRow[];
  queryResult?: QueryResult;
  brainDoc?: BrainDoc;
  runState?: RunState;
  canary?: CanaryReading;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export class MockAdapter implements ConsoleDataAdapter {
  private readonly opts: MockAdapterOptions;
  private readonly calls: string[] = [];

  constructor(opts: MockAdapterOptions = {}) {
    this.opts = opts;
  }

  /** Call log, so tests can assert the adapter is the only seam being used. */
  get callLog(): readonly string[] {
    return this.calls;
  }

  private async resolve<T>(method: keyof ConsoleDataAdapter, value: T): Promise<T> {
    this.calls.push(method);
    if (this.opts.latencyMs && this.opts.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.opts.latencyMs));
    }
    const fault = this.opts.faults?.[method];
    if (fault) throw mapBridgeError(fault.status, fault.body);
    return clone(value);
  }

  getStatus(): Promise<StatusInstrument> {
    return this.resolve('getStatus', this.opts.status ?? fx.healthyStatus);
  }

  listCreators(): Promise<CreatorRow[]> {
    return this.resolve('listCreators', this.opts.creators ?? fx.creators);
  }

  async addCreator(ref: string): Promise<CreatorRow> {
    const trimmed = ref.trim();
    if (!trimmed) {
      throw new ConsoleApiError('VALIDATION', 'ref must be a non-empty string', { status: 400 });
    }
    const row: CreatorRow = {
      channelId: trimmed.startsWith('UC') ? trimmed : `UC${trimmed.replace(/^@/, '')}`,
      title: trimmed,
      enabled: false, // created DISABLED — 05-contracts.md §2a
      videos: 0,
      fetched: 0,
    };
    return this.resolve('addCreator', row);
  }

  async setCreatorEnabled(channelId: string, enabled: boolean): Promise<CreatorRow> {
    const base = (this.opts.creators ?? fx.creators).find((c) => c.channelId === channelId);
    if (!base) {
      throw new ConsoleApiError('NOT_FOUND', `no creator with id ${channelId}`, { status: 404 });
    }
    return this.resolve('setCreatorEnabled', { ...base, enabled });
  }

  async query(q: string, _creator?: string): Promise<QueryResult> {
    if (!q.trim()) {
      throw new ConsoleApiError('VALIDATION', 'q must be a non-empty string', { status: 400 });
    }
    return this.resolve('query', this.opts.queryResult ?? fx.queryResult);
  }

  async getBrain(slug: string): Promise<BrainDoc> {
    const doc = this.opts.brainDoc ?? fx.brainDoc;
    if (doc.slug !== slug) {
      throw new ConsoleApiError('NOT_FOUND', `no published brain for ${slug}`, { status: 404 });
    }
    return this.resolve('getBrain', doc);
  }

  getRunState(): Promise<RunState> {
    return this.resolve('getRunState', this.opts.runState ?? fx.runState);
  }

  async startDailyRun(perHour: number): Promise<{ requestId: string; runId: string | null }> {
    // MIRRORS THE BRIDGE'S RULE, not a stricter one of the mock's own. `lib/errors.mjs` accepts a
    // numeric string and coerces it; the mock accepts the same set (`>= 1`, integral after
    // coercion), so a component tested against the mock cannot pass here and fail on the bridge.
    const n = typeof perHour === 'string' ? Number(perHour) : perHour;
    if (!Number.isInteger(n) || n < 1) {
      throw new ConsoleApiError('VALIDATION', 'perHour must be an integer >= 1', { status: 400 });
    }
    // R3-05: `runId` is null on acceptance, because acceptance is not completion
    // (05 §2b). The mock must produce the shape the route will, or it teaches the
    // UI a contract that no route honours.
    return this.resolve('startDailyRun', { requestId: 'req-mock-0001', runId: null });
  }

  canary(): Promise<CanaryReading> {
    return this.resolve('canary', this.opts.canary ?? fx.canary);
  }

  repair(): Promise<{ repaired: number; built: number; emptied: number }> {
    // R3-05: the projected engine result, not the rejected `{ requeued: 3 }`.
    return this.resolve('repair', { repaired: 3, built: 1, emptied: 0 });
  }

  backup(dest?: string): Promise<{ dest: string; ok: boolean }> {
    return this.resolve('backup', { dest: dest ?? '/tmp/backup-mock', ok: true });
  }
}
