/*
 * Shared error mapping for every ConsoleDataAdapter implementation.
 *
 * 05-contracts.md §2 fixes the envelope:
 *   { error: { code, message, file? } }
 *   code ∈ STORE_DAMAGED | RUN_LOCKED | VALIDATION | REFUSED | NOT_FOUND
 *
 * Both LocalEngineAdapter and MockAdapter MUST call `mapBridgeError`, so that
 * "identical error mapping" (T-W1) is true by construction and cannot drift
 * as one adapter is edited without the other.
 */

export type ErrorCode =
  | 'STORE_DAMAGED'
  | 'RUN_LOCKED'
  | 'VALIDATION'
  | 'REFUSED'
  | 'NOT_FOUND'
  | 'TRANSPORT'
  | 'UNKNOWN';

const KNOWN: readonly ErrorCode[] = [
  'STORE_DAMAGED',
  'RUN_LOCKED',
  'VALIDATION',
  'REFUSED',
  'NOT_FOUND',
];

export class ConsoleApiError extends Error {
  readonly code: ErrorCode;
  readonly file: string | null;
  readonly status: number | null;

  constructor(code: ErrorCode, message: string, opts: { file?: string | null; status?: number | null } = {}) {
    super(message);
    this.name = 'ConsoleApiError';
    this.code = code;
    this.file = opts.file ?? null;
    this.status = opts.status ?? null;
    Object.setPrototypeOf(this, ConsoleApiError.prototype);
  }

  /** A damaged store must render a refusal banner naming the file — never zeros. */
  get damageFile(): string | null {
    return this.code === 'STORE_DAMAGED' ? this.file : null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Map an HTTP status + already-parsed response body to a ConsoleApiError.
 * A body that is not the documented envelope degrades to UNKNOWN carrying the
 * status, rather than throwing — the UI must always get a renderable error.
 */
export function mapBridgeError(status: number, body: unknown): ConsoleApiError {
  const envelope = isRecord(body) && isRecord(body.error) ? body.error : null;

  if (envelope) {
    const rawCode = typeof envelope.code === 'string' ? envelope.code : '';
    const code = (KNOWN as readonly string[]).includes(rawCode) ? (rawCode as ErrorCode) : 'UNKNOWN';
    const message =
      typeof envelope.message === 'string' && envelope.message.length > 0
        ? envelope.message
        : `request failed with ${rawCode || 'unknown error'}`;
    const file = typeof envelope.file === 'string' ? envelope.file : null;
    return new ConsoleApiError(code, message, { file, status });
  }

  return new ConsoleApiError('UNKNOWN', `unexpected response shape (HTTP ${status})`, { status });
}

/** A network/abort failure — no response was ever received. */
export function mapTransportError(err: unknown): ConsoleApiError {
  const message = err instanceof Error ? err.message : String(err);
  return new ConsoleApiError('TRANSPORT', message, { status: null });
}

/** Render-ready copy for any thrown value. Never leaks a stack. */
export function describeError(err: unknown): { code: ErrorCode; message: string; file: string | null } {
  if (err instanceof ConsoleApiError) {
    return { code: err.code, message: err.message, file: err.damageFile };
  }
  return {
    code: 'UNKNOWN',
    message: err instanceof Error ? err.message : String(err),
    file: null,
  };
}
