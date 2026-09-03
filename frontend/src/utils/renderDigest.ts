/**
 * renderDigest.ts — the client half of the confirmation render proof (card 1.1)
 * =============================================================================
 * MUST produce byte-identical digests to backend/services/ai/renderDigest.mjs.
 * Both sides are pinned by the SHARED fixture backend/tests/fixtures/
 * render-digest.json, which both test suites load — if these two implementations
 * ever drift, every confirmation in production fails closed (400 render_mismatch),
 * so the fixture is the contract, not a convenience.
 *
 * Canonicalization rules (identical to the backend, see its header for why):
 *   - object keys sorted lexicographically at every depth
 *   - arrays keep order (order is meaning)
 *   - undefined and null both serialize as null
 *   - numbers via String(n); non-finite → null
 *
 * The digest covers identity + everything the approver reads: id, commandType,
 * type, description, affectedCount, params. Never expiresAt (clock skew), never
 * the signature (server-only), never affectedRecords (truncated preview).
 *
 * WHAT IT PROVES: the client held the server's operation when it confirmed. It is
 * an integrity check, NOT proof a human read it.
 */

export interface DigestSubjectSource {
  id?: string | null;
  commandType?: string | null;
  type?: string | null;
  description?: string | null;
  affectedCount?: number | null;
  params?: unknown;
  clientId?: number | null;
  kind?: string | null;
}

export function canonicalJson(value: unknown): string {
  if (value === undefined || value === null) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
  }
  return 'null';
}

export function digestSubject(op: DigestSubjectSource | null | undefined) {
  return {
    id: op?.id ?? null,
    commandType: op?.commandType ?? null,
    type: op?.type ?? null,
    description: op?.description ?? null,
    affectedCount: op?.affectedCount ?? 0,
    params: op?.params ?? null,
    // F-12 (GLM 5.3 round 1): the operation can carry its client binding
    // TOP-LEVEL — this file's own consumer reads `params.clientId ??
    // operation.clientId` to render the chip — so the one field this program is
    // about sat outside the proof. Mirrors the backend subject exactly.
    clientId: op?.clientId ?? null,
    kind: op?.kind ?? null,
  };
}

/**
 * sha256 hex via Web Crypto. Async because SubtleCrypto is — callers await it
 * before enabling the confirm control, which is also where the arm delay lives.
 * Requires a secure context (https or localhost); the app is https in every
 * deployed environment and the sheet surfaces a plain error if it is unavailable
 * rather than silently confirming without a digest.
 */
export async function renderDigestOf(op: DigestSubjectSource | null | undefined): Promise<string> {
  const canonical = canonicalJson(digestSubject(op));
  const bytes = new TextEncoder().encode(canonical);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
