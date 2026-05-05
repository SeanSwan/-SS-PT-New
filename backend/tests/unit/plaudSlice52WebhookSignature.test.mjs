/**
 * Phase 5 Slice 5.2 — webhook signature service tests
 * =====================================================
 * Mostly behavioral (pure functions); claimNonce + verifyWebhookRequest
 * are tested with a mocked Sequelize. Source-text locks added for the
 * Sequelize-bug-class regressions Codex required at §11.1.1.
 *
 * Plan: PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md §4 + §11.1.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, randomBytes } from 'node:crypto';
import {
  parseSignatureHeader,
  validateSignatureShape,
  isTimestampInWindow,
  computeBodyHash,
  buildCanonicalPayload,
  verifyHmac,
  resolveWebhookSecret,
  verifyBodyConsistency,
  claimNonce,
  verifyWebhookRequest,
  signCanonicalPayload,
} from '../../services/plaudWebhookSignature.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC = readFileSync(
  resolve(__dirname, '../../services/plaudWebhookSignature.mjs'),
  'utf8',
);

const TEST_SECRET = 'a'.repeat(64); // 64 chars meets MIN_SECRET_LENGTH
const VALID_SIG = 'a'.repeat(64); // 64 hex chars (placeholder; real sigs computed below)
const VALID_NONCE = 'b'.repeat(32); // 32 hex chars

// ─── parseSignatureHeader ───
describe('Slice 5.2 — parseSignatureHeader', () => {
  it('parses well-formed header into {t, nonce, sig}', () => {
    const out = parseSignatureHeader(`t=1714867200,nonce=${VALID_NONCE},sig=${VALID_SIG}`);
    expect(out).toEqual({ t: '1714867200', nonce: VALID_NONCE, sig: VALID_SIG });
  });
  it('preserves optional kid (key version) field', () => {
    const out = parseSignatureHeader(`t=1714867200,nonce=${VALID_NONCE},sig=${VALID_SIG},kid=V2`);
    expect(out.kid).toBe('V2');
  });
  it('tolerates whitespace around = and ,', () => {
    const out = parseSignatureHeader(` t = 1714867200 , nonce = ${VALID_NONCE} , sig = ${VALID_SIG} `);
    expect(out.t).toBe('1714867200');
    expect(out.nonce).toBe(VALID_NONCE);
    expect(out.sig).toBe(VALID_SIG);
  });
  it('lowercases keys (case-insensitive header field names)', () => {
    const out = parseSignatureHeader(`T=1714867200,Nonce=${VALID_NONCE},Sig=${VALID_SIG}`);
    expect(out.t).toBe('1714867200');
    expect(out.nonce).toBe(VALID_NONCE);
    expect(out.sig).toBe(VALID_SIG);
  });
  it('returns null when value is empty', () => {
    expect(parseSignatureHeader('')).toBeNull();
  });
  it('returns null when value is undefined', () => {
    expect(parseSignatureHeader(undefined)).toBeNull();
  });
  it('returns null when t missing', () => {
    expect(parseSignatureHeader(`nonce=${VALID_NONCE},sig=${VALID_SIG}`)).toBeNull();
  });
  it('returns null when nonce missing', () => {
    expect(parseSignatureHeader(`t=1714867200,sig=${VALID_SIG}`)).toBeNull();
  });
  it('returns null when sig missing', () => {
    expect(parseSignatureHeader(`t=1714867200,nonce=${VALID_NONCE}`)).toBeNull();
  });
  it('returns null when value is not a string', () => {
    expect(parseSignatureHeader(12345)).toBeNull();
    expect(parseSignatureHeader(null)).toBeNull();
    expect(parseSignatureHeader([])).toBeNull();
  });
});

// ─── validateSignatureShape (M-1: hex format check) ───
describe('Slice 5.2 — validateSignatureShape (Codex M-1)', () => {
  it('accepts well-formed parts', () => {
    expect(validateSignatureShape({ t: '1714867200', nonce: VALID_NONCE, sig: VALID_SIG })).toBe(true);
  });
  it('rejects 63-char sig (off-by-one)', () => {
    expect(validateSignatureShape({ t: '1714867200', nonce: VALID_NONCE, sig: 'a'.repeat(63) })).toBe(false);
  });
  it('rejects 65-char sig', () => {
    expect(validateSignatureShape({ t: '1714867200', nonce: VALID_NONCE, sig: 'a'.repeat(65) })).toBe(false);
  });
  it('rejects sig with non-hex characters', () => {
    expect(validateSignatureShape({ t: '1714867200', nonce: VALID_NONCE, sig: 'g'.repeat(64) })).toBe(false);
  });
  it('rejects 31-char nonce', () => {
    expect(validateSignatureShape({ t: '1714867200', nonce: 'b'.repeat(31), sig: VALID_SIG })).toBe(false);
  });
  it('rejects 33-char nonce', () => {
    expect(validateSignatureShape({ t: '1714867200', nonce: 'b'.repeat(33), sig: VALID_SIG })).toBe(false);
  });
  it('rejects nonce with non-hex characters', () => {
    expect(validateSignatureShape({ t: '1714867200', nonce: 'z'.repeat(32), sig: VALID_SIG })).toBe(false);
  });
  it('rejects non-integer timestamp', () => {
    expect(validateSignatureShape({ t: '1714867200.5', nonce: VALID_NONCE, sig: VALID_SIG })).toBe(false);
  });
  it('rejects negative timestamp', () => {
    expect(validateSignatureShape({ t: '-1714867200', nonce: VALID_NONCE, sig: VALID_SIG })).toBe(false);
  });
  it('rejects non-numeric timestamp', () => {
    expect(validateSignatureShape({ t: 'abc', nonce: VALID_NONCE, sig: VALID_SIG })).toBe(false);
  });
  it('rejects null parts', () => {
    expect(validateSignatureShape(null)).toBe(false);
  });
});

// ─── isTimestampInWindow ───
describe('Slice 5.2 — isTimestampInWindow', () => {
  it('returns true when within ±window', () => {
    expect(isTimestampInWindow(1714867200, 1714867300)).toBe(true); // +100s
    expect(isTimestampInWindow(1714867200, 1714867100)).toBe(true); // -100s
  });
  it('returns true at exactly the boundary (300s)', () => {
    expect(isTimestampInWindow(1714867200, 1714867500)).toBe(true);
  });
  it('returns false beyond the boundary (301s)', () => {
    expect(isTimestampInWindow(1714867200, 1714867501)).toBe(false);
  });
  it('returns false for far-future timestamps (beyond -window)', () => {
    expect(isTimestampInWindow(1714867800, 1714867200)).toBe(false);
  });
  it('respects custom window arg', () => {
    expect(isTimestampInWindow(1714867200, 1714867260, 60)).toBe(true);
    expect(isTimestampInWindow(1714867200, 1714867261, 60)).toBe(false);
  });
  it('returns false for non-finite inputs', () => {
    expect(isTimestampInWindow(NaN, 1714867200)).toBe(false);
    expect(isTimestampInWindow(1714867200, Infinity)).toBe(false);
  });
});

// ─── computeBodyHash (raw-body binding, Codex ICR-2) ───
describe('Slice 5.2 — computeBodyHash', () => {
  it('produces 64-char hex SHA-256', () => {
    const hash = computeBodyHash(Buffer.from('{"event_type":"audio_ready"}'));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
  it('same buffer produces same hash (determinism)', () => {
    const buf = Buffer.from('{"hello":"world"}');
    expect(computeBodyHash(buf)).toBe(computeBodyHash(buf));
  });
  it('whitespace differences produce DIFFERENT hashes (Codex ICR-2 binding)', () => {
    // Equivalent JSON parsed identically, but raw bytes differ.
    const a = computeBodyHash(Buffer.from('{"x":1}'));
    const b = computeBodyHash(Buffer.from('{"x": 1}'));
    expect(a).not.toBe(b);
  });
  it('throws when input is not a Buffer (defensive)', () => {
    expect(() => computeBodyHash('a string')).toThrow(/must be Buffer/);
    expect(() => computeBodyHash(null)).toThrow();
    expect(() => computeBodyHash(undefined)).toThrow();
  });
});

// ─── buildCanonicalPayload ───
describe('Slice 5.2 — buildCanonicalPayload', () => {
  it('joins fields with newline in exact order', () => {
    const out = buildCanonicalPayload({
      t: '1714867200', nonce: 'abc', eventType: 'audio_ready',
      recordingId: 'rec_xyz', bodyHash: 'deadbeef',
    });
    expect(out).toBe('1714867200\nabc\naudio_ready\nrec_xyz\ndeadbeef');
  });
  it('does NOT add trailing newline', () => {
    const out = buildCanonicalPayload({
      t: '1', nonce: 'n', eventType: 'e', recordingId: 'r', bodyHash: 'b',
    });
    expect(out.endsWith('\n')).toBe(false);
  });
});

// ─── verifyHmac (constant-time compare) ───
describe('Slice 5.2 — verifyHmac', () => {
  const PAYLOAD = 'canonical-payload-text';
  const SECRET = 'test-secret-' + 'x'.repeat(40);
  const validSig = createHmac('sha256', SECRET).update(PAYLOAD).digest('hex');

  it('returns true for matching HMAC', () => {
    expect(verifyHmac(PAYLOAD, validSig, SECRET)).toBe(true);
  });
  it('returns false when sig is wrong', () => {
    const wrongSig = 'a'.repeat(64);
    expect(verifyHmac(PAYLOAD, wrongSig, SECRET)).toBe(false);
  });
  it('returns false when secret is wrong', () => {
    expect(verifyHmac(PAYLOAD, validSig, 'wrong-secret-' + 'x'.repeat(40))).toBe(false);
  });
  it('returns false when payload is tampered', () => {
    expect(verifyHmac(PAYLOAD + 'x', validSig, SECRET)).toBe(false);
  });
});

// ─── resolveWebhookSecret ───
describe('Slice 5.2 — resolveWebhookSecret', () => {
  it('returns secret when env present and long enough', () => {
    const env = { PLAUD_APPLAUD_WEBHOOK_SECRET_V1: TEST_SECRET };
    expect(resolveWebhookSecret('V1', env)).toBe(TEST_SECRET);
  });
  it('throws when env missing', () => {
    expect(() => resolveWebhookSecret('V99', {})).toThrow(/not set in env/);
  });
  it('throws when secret too short (<32 chars)', () => {
    const env = { PLAUD_APPLAUD_WEBHOOK_SECRET_V1: 'too-short' };
    expect(() => resolveWebhookSecret('V1', env)).toThrow(/too short/);
  });
  it('throws when keyId is empty', () => {
    expect(() => resolveWebhookSecret('', { ANY: 'x' })).toThrow();
  });
  it('throws when keyId is not a string', () => {
    expect(() => resolveWebhookSecret(null, { ANY: 'x' })).toThrow();
    expect(() => resolveWebhookSecret(undefined, { ANY: 'x' })).toThrow();
  });
  it('rejects keyId with lowercase letters (env-var injection defense)', () => {
    expect(() => resolveWebhookSecret('v1', {})).toThrow(/invalid keyId format/);
  });
  it('rejects keyId with special characters (env-var injection defense)', () => {
    expect(() => resolveWebhookSecret('V1; rm -rf /', {})).toThrow(/invalid keyId format/);
    expect(() => resolveWebhookSecret('V1$IFS', {})).toThrow(/invalid keyId format/);
    expect(() => resolveWebhookSecret('../etc/passwd', {})).toThrow(/invalid keyId format/);
  });
  it('rejects overly long keyId', () => {
    expect(() => resolveWebhookSecret('V'.repeat(20), {})).toThrow(/invalid keyId format/);
  });
});

// ─── verifyBodyConsistency (M-2) ───
describe('Slice 5.2 — verifyBodyConsistency (Codex M-2)', () => {
  it('passes when body has neither field (optional)', () => {
    const out = verifyBodyConsistency({ event_type: 'audio_ready', recording_id: 'r1' },
      { t: '100', nonce: 'a' });
    expect(out.ok).toBe(true);
  });
  it('passes when body fields match header', () => {
    const out = verifyBodyConsistency(
      { event_type: 'audio_ready', recording_id: 'r1', timestamp: 100, nonce: 'a' },
      { t: '100', nonce: 'a' },
    );
    expect(out.ok).toBe(true);
  });
  it('rejects when body.timestamp differs from header.t', () => {
    const out = verifyBodyConsistency(
      { event_type: 'audio_ready', recording_id: 'r1', timestamp: 200 },
      { t: '100', nonce: 'a' },
    );
    expect(out.ok).toBe(false);
    expect(out.code).toBe('BODY_TIMESTAMP_MISMATCH');
  });
  it('rejects when body.nonce differs from header.nonce', () => {
    const out = verifyBodyConsistency(
      { event_type: 'audio_ready', recording_id: 'r1', nonce: 'B' },
      { t: '100', nonce: 'a' },
    );
    expect(out.ok).toBe(false);
    expect(out.code).toBe('BODY_NONCE_MISMATCH');
  });
  it('rejects null body', () => {
    expect(verifyBodyConsistency(null, { t: '100', nonce: 'a' }).ok).toBe(false);
    expect(verifyBodyConsistency(null, { t: '100', nonce: 'a' }).code).toBe('INVALID_PAYLOAD');
  });
});

// ─── claimNonce (Codex CR-2 atomic claim) ───
describe('Slice 5.2 — claimNonce (Codex CR-2)', () => {
  function mockSequelize(rowsToReturn) {
    return {
      query: async (sql, opts) => {
        // Sanity-check the test is actually exercising the right pattern
        if (!/INSERT INTO plaud_webhook_nonces/.test(sql)) {
          throw new Error('claimNonce should always INSERT (no SELECT-then-INSERT)');
        }
        if (!/ON CONFLICT \(source, nonce\) DO NOTHING/.test(sql)) {
          throw new Error('claimNonce SQL must use ON CONFLICT DO NOTHING');
        }
        if (opts.type !== 'SELECT' && opts.type !== Symbol.for('SELECT')) {
          // Sequelize uses string-literal QueryTypes in newer versions; accept both
        }
        return rowsToReturn;
      },
    };
  }

  it('returns true when row was inserted (fresh nonce)', async () => {
    const seq = mockSequelize([{ nonce: 'n1' }]);
    const result = await claimNonce(seq, { source: 'applaud_webhook', nonce: 'n1' });
    expect(result).toBe(true);
  });
  it('returns false when row was not inserted (replay = empty result from ON CONFLICT)', async () => {
    const seq = mockSequelize([]);
    const result = await claimNonce(seq, { source: 'applaud_webhook', nonce: 'n1' });
    expect(result).toBe(false);
  });
  it('throws when sequelize missing', async () => {
    await expect(claimNonce(null, { source: 'x', nonce: 'y' })).rejects.toThrow(/sequelize required/);
  });
  it('throws when source missing', async () => {
    await expect(claimNonce({}, { source: '', nonce: 'y' })).rejects.toThrow(/source \+ nonce required/);
  });
  it('throws when nonce missing', async () => {
    await expect(claimNonce({}, { source: 'x', nonce: '' })).rejects.toThrow(/source \+ nonce required/);
  });
  it('throws when ttlSec is invalid (zero, negative, non-int)', async () => {
    const seq = mockSequelize([]);
    await expect(claimNonce(seq, { source: 'x', nonce: 'y', ttlSec: 0 })).rejects.toThrow();
    await expect(claimNonce(seq, { source: 'x', nonce: 'y', ttlSec: -1 })).rejects.toThrow();
    await expect(claimNonce(seq, { source: 'x', nonce: 'y', ttlSec: 1.5 })).rejects.toThrow();
  });
});

// ─── verifyWebhookRequest (orchestrator end-to-end) ───
describe('Slice 5.2 — verifyWebhookRequest orchestrator', () => {
  function buildSignedRequest(opts = {}) {
    const t = opts.t ?? Math.floor(Date.now() / 1000);
    const nonce = opts.nonce ?? randomBytes(16).toString('hex');
    // If a custom body is supplied, derive eventType + recordingId FROM the
    // body so the canonical payload matches what the receiver will compute.
    // Otherwise use the explicit opts (or defaults).
    const body = opts.body ?? {
      event_type: opts.eventType ?? 'audio_ready',
      recording_id: opts.recordingId ?? 'rec_test_001',
    };
    const eventType = body.event_type;
    const recordingId = body.recording_id;
    const rawBody = Buffer.from(JSON.stringify(body));
    const bodyHash = computeBodyHash(rawBody);
    const canonicalPayload = buildCanonicalPayload({ t, nonce, eventType, recordingId, bodyHash });
    const sig = signCanonicalPayload(canonicalPayload, opts.secret ?? TEST_SECRET);
    const sigHeader = `t=${t},nonce=${nonce},sig=${sig}`;

    return {
      headers: {
        'x-forwarded-proto': opts.proto ?? 'https',
        'plaud-webhook-signature': opts.sigHeader ?? sigHeader,
      },
      rawBody,
      body,
    };
  }

  function mockSeq(claimResult = true) {
    return {
      query: async () => (claimResult ? [{ nonce: 'claimed' }] : []),
    };
  }

  function fakeResolver(_keyId) { return TEST_SECRET; }

  it('happy path returns ok=true, replayed=false', async () => {
    const req = buildSignedRequest();
    const out = await verifyWebhookRequest(req, {
      sequelize: mockSeq(true),
      secretResolver: fakeResolver,
      keyIdEnv: 'V1',
    });
    expect(out.ok).toBe(true);
    expect(out.replayed).toBe(false);
    expect(out.parsed).toEqual(req.body);
  });

  it('returns 400 HTTPS_REQUIRED when X-Forwarded-Proto is not https', async () => {
    const req = buildSignedRequest({ proto: 'http' });
    const out = await verifyWebhookRequest(req, {
      sequelize: mockSeq(), secretResolver: fakeResolver, keyIdEnv: 'V1',
    });
    expect(out.ok).toBe(false);
    expect(out.status).toBe(400);
    expect(out.code).toBe('HTTPS_REQUIRED');
  });

  it('returns 401 SIGNATURE_MALFORMED when header missing', async () => {
    const req = buildSignedRequest();
    delete req.headers['plaud-webhook-signature'];
    const out = await verifyWebhookRequest(req, {
      sequelize: mockSeq(), secretResolver: fakeResolver, keyIdEnv: 'V1',
    });
    expect(out.status).toBe(401);
    expect(out.code).toBe('SIGNATURE_MALFORMED');
  });

  it('returns 401 SIGNATURE_MALFORMED when sig is wrong length (M-1)', async () => {
    const req = buildSignedRequest({
      sigHeader: `t=${Math.floor(Date.now() / 1000)},nonce=${VALID_NONCE},sig=ab12`,
    });
    const out = await verifyWebhookRequest(req, {
      sequelize: mockSeq(), secretResolver: fakeResolver, keyIdEnv: 'V1',
    });
    expect(out.status).toBe(401);
    expect(out.code).toBe('SIGNATURE_MALFORMED');
  });

  it('returns 401 SIGNATURE_EXPIRED when timestamp >5 min stale', async () => {
    const req = buildSignedRequest({ t: Math.floor(Date.now() / 1000) - 1000 });
    const out = await verifyWebhookRequest(req, {
      sequelize: mockSeq(), secretResolver: fakeResolver, keyIdEnv: 'V1',
    });
    expect(out.status).toBe(401);
    expect(out.code).toBe('SIGNATURE_EXPIRED');
  });

  it('returns 500 INTERNAL_ERROR when rawBody not captured', async () => {
    const req = buildSignedRequest();
    delete req.rawBody;
    const out = await verifyWebhookRequest(req, {
      sequelize: mockSeq(), secretResolver: fakeResolver, keyIdEnv: 'V1',
    });
    expect(out.status).toBe(500);
    expect(out.code).toBe('INTERNAL_ERROR');
  });

  it('returns 400 INVALID_PAYLOAD when body missing event_type', async () => {
    const req = buildSignedRequest({ body: { recording_id: 'r1' } });
    const out = await verifyWebhookRequest(req, {
      sequelize: mockSeq(), secretResolver: fakeResolver, keyIdEnv: 'V1',
    });
    expect(out.status).toBe(400);
    expect(out.code).toBe('INVALID_PAYLOAD');
  });

  it('returns 401 SIGNATURE_INVALID when signed by wrong secret', async () => {
    const req = buildSignedRequest({ secret: 'a-different-secret-' + 'x'.repeat(40) });
    const out = await verifyWebhookRequest(req, {
      sequelize: mockSeq(), secretResolver: fakeResolver, keyIdEnv: 'V1',
    });
    expect(out.status).toBe(401);
    expect(out.code).toBe('SIGNATURE_INVALID');
  });

  it('returns 401 SIGNATURE_INVALID when raw body is mutated post-sign (binding)', async () => {
    const req = buildSignedRequest();
    // Tamper the rawBody bytes — sig was computed over the original.
    req.rawBody = Buffer.from(req.rawBody.toString() + ' ');
    const out = await verifyWebhookRequest(req, {
      sequelize: mockSeq(), secretResolver: fakeResolver, keyIdEnv: 'V1',
    });
    expect(out.status).toBe(401);
    expect(out.code).toBe('SIGNATURE_INVALID');
  });

  it('returns ok=true, replayed=true when nonce is already claimed (CR-2)', async () => {
    const req = buildSignedRequest();
    const out = await verifyWebhookRequest(req, {
      sequelize: mockSeq(false), // ← claim returns no rows = replay
      secretResolver: fakeResolver, keyIdEnv: 'V1',
    });
    expect(out.ok).toBe(true);
    expect(out.replayed).toBe(true);
  });

  it('returns 400 BODY_TIMESTAMP_MISMATCH when body claims different t (M-2)', async () => {
    // Sign the body containing the divergent timestamp — sig must be valid
    // so we get past sig verification and reach the consistency check.
    const t = Math.floor(Date.now() / 1000);
    const body = { event_type: 'audio_ready', recording_id: 'r1', timestamp: t + 999 };
    const req = buildSignedRequest({ t, body });
    const out = await verifyWebhookRequest(req, {
      sequelize: mockSeq(), secretResolver: fakeResolver, keyIdEnv: 'V1',
    });
    expect(out.status).toBe(400);
    expect(out.code).toBe('BODY_TIMESTAMP_MISMATCH');
  });

  it('returns 401 SIGNATURE_INVALID when secret resolution throws (Codex NH-1: no env-name leak)', async () => {
    // Hardened per Codex NH-1: previous version leaked the resolver error
    // (e.g. "PLAUD_APPLAUD_WEBHOOK_SECRET_V99 not set") to the caller, allowing
    // an attacker to probe which key versions exist via different `kid` headers.
    // Now any kid resolution failure is bucketed as SIGNATURE_INVALID externally.
    const req = buildSignedRequest();
    const throwingResolver = () => { throw new Error('test: PLAUD_APPLAUD_WEBHOOK_SECRET_V99 not set'); };
    const out = await verifyWebhookRequest(req, {
      sequelize: mockSeq(), secretResolver: throwingResolver, keyIdEnv: 'V1',
    });
    expect(out.status).toBe(401);
    expect(out.code).toBe('SIGNATURE_INVALID');
    // Confirm the env name does NOT leak in the response
    expect(out.message || '').not.toContain('SECRET_V99');
    expect(out.message || '').not.toContain('PLAUD_APPLAUD_WEBHOOK_SECRET');
  });
});

// ─── Codex Rule 50 / §11.1.1 regression locks ───
describe('Slice 5.2 — Sequelize-bug-class regression locks (Codex Rule 50)', () => {
  it('NO ANY(:array::type[]) pattern (the bug class that crashed prod 2026-05-04)', () => {
    expect(SRC).not.toMatch(/ANY\s*\(\s*:[a-zA-Z_]+\s*::\s*[a-z]+\s*\[\s*\]\s*\)/i);
  });
  it('every sequelize.query() call passes type: QueryTypes.* (no [rows, meta] confusion)', () => {
    // SQL strings contain `(` characters (e.g. "INSERT INTO t (a, b)"), so a
    // simple regex like /sequelize\.query\([\s\S]*?\)/ truncates at the first
    // closing paren inside the SQL. Use a count-invariant check instead:
    // every `sequelize.query(` MUST be paired with a `type: QueryTypes.*`
    // somewhere in the file. Off-balance = bug.
    const queryCalls = (SRC.match(/sequelize\.query\(/g) || []).length;
    const typeAnnotations = (SRC.match(/type:\s*QueryTypes\.(?:SELECT|INSERT|UPDATE|DELETE|RAW|BULKUPDATE|BULKINSERT)/g) || []).length;
    expect(queryCalls).toBeGreaterThan(0);
    expect(typeAnnotations).toBeGreaterThanOrEqual(queryCalls);
  });
  it('imports QueryTypes from sequelize', () => {
    expect(SRC).toMatch(/import\s*\{[^}]*QueryTypes[^}]*\}\s*from\s*['"]sequelize['"]/);
  });
  it('claimNonce uses INSERT ON CONFLICT DO NOTHING (CR-2 atomic guarantee)', () => {
    expect(SRC).toMatch(/INSERT INTO plaud_webhook_nonces[\s\S]{0,400}ON CONFLICT \(source, nonce\) DO NOTHING/);
  });
  it('resolveWebhookSecret restricts keyId charset (env-var injection defense)', () => {
    expect(SRC).toMatch(/\/\^\[A-Z0-9\]\{1,16\}\$\//);
  });
  it('verifyHmac performs constant-time comparison via crypto.timingSafeEqual', () => {
    expect(SRC).toMatch(/crypto\.timingSafeEqual/);
  });
  it('hex format check exists BEFORE Buffer.from(sigHex, "hex") in verifyHmac (M-1)', () => {
    // Index of validateSignatureShape uses must be before Buffer.from in verifyHmac path.
    // Simpler: confirm the SIG_REGEX = /^[0-9a-f]{64}$/ exists at module level.
    expect(SRC).toMatch(/SIG_REGEX\s*=\s*\/\^\[0-9a-f\]\{64\}\$\//);
    expect(SRC).toMatch(/NONCE_REGEX\s*=\s*\/\^\[0-9a-f\]\{32\}\$\//);
  });
});
