/**
 * The render digest must hash what the CLIENT can see.
 * =====================================================
 * The digest exists to compare two machines. That makes the wire, not this
 * process's heap, the only honest subject — and the two differ in one specific
 * way that R2-8 (GLM 5.3 round 2) found.
 *
 * With the DEFAULT in-process store, the server holds the live params object, so
 * a key explicitly set to `undefined` is still a key. The client receives JSON,
 * where that key does not exist. Canonicalized, those are different documents,
 * so an entirely honest confirmation was refused as `render_mismatch` — fail
 * closed, but indistinguishable from tampering, with a security-flavoured error
 * pointed at a user who did nothing wrong.
 *
 * The Redis store never had the bug, because it serialises on the way in. That
 * is the worst possible distribution of a defect: it works in whichever
 * environment happens to have Redis and fails in the other, so the bug looks
 * like an environment problem rather than a logic one.
 */
import { describe, it, expect } from 'vitest';
import { renderDigestOf, digestSubject, canonicalJson } from '../../services/ai/renderDigest.mjs';

/** Exactly what a client receives: the record after JSON serialisation. */
const overTheWire = (op) => JSON.parse(JSON.stringify(op));

const base = {
  id: 'op-1',
  commandType: 'cancel_session',
  type: 'DELETE',
  description: 'Cancel session 184',
  affectedCount: 1,
  clientId: 42,
  kind: undefined,
};

describe('render digest — wire parity', () => {
  it('an explicitly-undefined param does not split the digest', () => {
    const stored = { ...base, params: { sessionId: 184, note: undefined } };

    expect(renderDigestOf(stored)).toBe(renderDigestOf(overTheWire(stored)));
  });

  it('holds for undefined NESTED inside params', () => {
    const stored = { ...base, params: { sessionId: 184, meta: { a: 1, b: undefined } } };

    expect(renderDigestOf(stored)).toBe(renderDigestOf(overTheWire(stored)));
  });

  it('holds for an undefined top-level subject field', () => {
    const stored = { ...base, params: { sessionId: 184 } };

    expect(renderDigestOf(stored)).toBe(renderDigestOf(overTheWire(stored)));
  });

  it('still DISTINGUISHES a real difference — parity must not be achieved by flattening', () => {
    // The failure mode of a parity fix is a digest that stops discriminating.
    // Two operations that differ in the field the whole program is about must
    // still hash differently.
    const a = { ...base, params: { sessionId: 184 }, clientId: 42 };
    const b = { ...base, params: { sessionId: 184 }, clientId: 43 };

    expect(renderDigestOf(a)).not.toBe(renderDigestOf(b));
    expect(renderDigestOf({ ...a, params: { sessionId: 185 } })).not.toBe(renderDigestOf(a));
    expect(renderDigestOf({ ...a, description: 'Cancel session 999' })).not.toBe(renderDigestOf(a));
  });

  it('null and absent stay equal, which is the rule the client half also follows', () => {
    const withNull = { ...base, params: { sessionId: 184, note: null } };
    const withUndef = { ...base, params: { sessionId: 184, note: undefined } };

    // Deliberate: canonicalJson maps undefined and null alike, and the wire drops
    // undefined entirely. All three roads must arrive at the same hash or the
    // client and server will disagree about a document neither one altered.
    expect(renderDigestOf(withUndef)).toBe(renderDigestOf(overTheWire(withUndef)));
    expect(canonicalJson(digestSubject(withNull))).toContain('"note":null');
  });
});
