/**
 * renderDigest.mjs — proof that the client rendered the operation the server holds
 * ================================================================================
 * Blueprint v2 card 1.1 / mechanism M1. The confirmation UI used to render
 * `ctx.intent.params` (what the user ASKED) while the executor ran the STORED
 * operation (what the server MINTED — with a server-injected clientId and any
 * stepConfirmation transforms). Two artifacts, one shown and one executed,
 * divergent by construction. Nothing detected a mismatch, and a stale tab could
 * display operation A while confirming operation B's id.
 *
 * The fix: the sheet reads the stored op (GET /pending/:id), hashes exactly the
 * fields a human reads plus the operation identity, and sends that digest with
 * the confirm. The server recomputes from ITS copy and refuses on mismatch.
 *
 * WHAT THIS PROVES AND WHAT IT DOES NOT. It proves the client HAD the true
 * payload when it confirmed. It is an integrity check, NOT an attestation that
 * a human read it — an XSSed or scripted client computes digests perfectly well.
 * Never describe it as proof of human review; the ceremony (arm delay, physical
 * confirm for identity-crossing voice writes) is what addresses the human.
 *
 * CANONICALIZATION is the whole game: both sides must serialize identically or
 * every confirm fails. Rules, mirrored byte-for-byte in
 * frontend/src/utils/renderDigest.ts and pinned by a SHARED fixture
 * (backend/tests/fixtures/render-digest.json) that both test suites load:
 *   - object keys sorted lexicographically at every depth
 *   - arrays keep order (order is meaning: "affects these three, in this order")
 *   - undefined and null both serialize as null (JS `undefined` round-trips
 *     through JSON as absent; treating them alike removes a whole class of
 *     "works locally, mismatches over the wire")
 *   - numbers via String(n); no locale, no precision games
 *   - the digest covers: id, commandType, type, description, affectedCount, params
 *     — identity + everything the approver reads. NOT expiresAt (clock skew),
 *     NOT signature (server-only), NOT affectedRecords (previews are truncated
 *     to 10 and their count is already covered).
 */
import crypto from 'crypto';

/** Deterministic JSON: sorted keys, arrays in order, undefined ≡ null. */
export function canonicalJson(value) {
  if (value === undefined || value === null) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return 'null'; // functions, symbols, bigint — not representable, never present
}

/** The exact subset both sides hash. Exported so the fixture can assert it. */
export function digestSubject(op) {
  return {
    id: op?.id ?? null,
    commandType: op?.commandType ?? null,
    type: op?.type ?? null,
    description: op?.description ?? null,
    affectedCount: op?.affectedCount ?? 0,
    params: op?.params ?? null,
  };
}

/** sha256 hex of the canonical subject. */
export function renderDigestOf(op) {
  return crypto.createHash('sha256').update(canonicalJson(digestSubject(op))).digest('hex');
}

/** Constant-time compare of two hex digests; false on any shape problem. */
export function digestMatches(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length || !/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
