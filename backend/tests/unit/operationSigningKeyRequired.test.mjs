/**
 * S1 (blueprint 0.3): OPERATION_SIGNING_KEY is REQUIRED — the random-bytes
 * fallback is dead.
 * ===========================================================================
 * The fallback (`process.env.OPERATION_SIGNING_KEY || crypto.randomBytes(32)`)
 * was the standing P0: with a per-process random secret, every deploy or
 * restart silently invalidated in-flight approvals, two instances could never
 * verify each other's signatures, and the HMAC guarded nothing. Found by the
 * 2026-08-21 panel, still live on main on 2026-09-01.
 *
 * The law these tests pin:
 *   - unset key  → signing operations REFUSE with the exact remedy in the
 *     message (never a silent random key)
 *   - short key  → same refusal (a 4-char key is a typo, not a secret)
 *   - real key   → mint + verify round-trips
 *   - the boot assertion throws so a deploy without the key fails AT BOOT,
 *     visibly, not at the first destructive mint three days later
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const REAL_KEY = 'unit-signing-key-0123456789abcdef0123456789abcdef';
const ORIGINAL = process.env.OPERATION_SIGNING_KEY;

async function freshModule() {
  vi.resetModules();
  return import('../../services/ai/destructiveOperations.mjs');
}

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.OPERATION_SIGNING_KEY;
  else process.env.OPERATION_SIGNING_KEY = ORIGINAL;
  vi.resetModules();
});

describe('OPERATION_SIGNING_KEY is required (S1)', () => {
  it('unset key: preparing a destructive operation refuses with the remedy, never a random key', async () => {
    delete process.env.OPERATION_SIGNING_KEY;
    const mod = await freshModule();
    await expect(mod.prepareDestructiveOperation({
      type: 'DELETE',
      endpoint: '/api/sessions/1',
      commandParams: { id: 1 },
      commandType: 'cancel_session',
      userId: 7,
      description: 'unit',
      affectedRecords: [{ id: 1 }],
    })).rejects.toThrow(/OPERATION_SIGNING_KEY/);
  });

  it('short key: refused as a typo, not accepted as a secret', async () => {
    process.env.OPERATION_SIGNING_KEY = 'abc123';
    const mod = await freshModule();
    await expect(mod.prepareDestructiveOperation({
      type: 'DELETE',
      endpoint: '/api/sessions/1',
      commandParams: { id: 1 },
      commandType: 'cancel_session',
      userId: 7,
      description: 'unit',
      affectedRecords: [{ id: 1 }],
    })).rejects.toThrow(/OPERATION_SIGNING_KEY.*32|32.*OPERATION_SIGNING_KEY/);
  });

  it('boot assertion: throws on unset (a deploy without the key fails at boot, not at first mint)', async () => {
    delete process.env.OPERATION_SIGNING_KEY;
    const mod = await freshModule();
    expect(() => mod.assertOperationSigningKey()).toThrow(/OPERATION_SIGNING_KEY/);
  });

  it('boot assertion: passes with a real key, and mint + verify round-trips', async () => {
    process.env.OPERATION_SIGNING_KEY = REAL_KEY;
    const mod = await freshModule();
    expect(() => mod.assertOperationSigningKey()).not.toThrow();

    const prepared = await mod.prepareDestructiveOperation({
      type: 'DELETE',
      endpoint: '/api/sessions/1',
      commandParams: { id: 1 },
      commandType: 'cancel_session',
      userId: 7,
      description: 'unit round-trip',
      affectedRecords: [{ id: 1 }],
    });
    const result = await mod.verifyAndRetrieveOperation(prepared.operationId, 7);
    expect(result.verified).toBe(true);
    expect(result.operation.description).toBe('unit round-trip');
  });

  it('the random-bytes fallback is dead in source (grep-negative)', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../../services/ai/destructiveOperations.mjs', import.meta.url), 'utf8');
    expect(src).not.toMatch(/OPERATION_SIGNING_KEY\s*\|\|/);
  });
});
