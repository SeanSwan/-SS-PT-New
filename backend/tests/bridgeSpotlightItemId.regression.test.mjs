/**
 * SwanGuard -> SwanStudios Spotlight bridge — ITEM IDENTITY regression (R5-02)
 * ==========================================================================
 * The defect. `validateSpotlightPayload` normalised EVERY field through one helper:
 *
 *     const str = (value, max) => { ...; return trimmed.slice(0, max); };
 *     const itemId = str(body.itemId, 36);
 *
 * `slice(0, max)` is the right rule for DISPLAY TEXT — a 200-character headline should be
 * clipped to 80, not rejected. It is the wrong rule for an IDENTITY. `itemId` is the natural
 * PRIMARY KEY (`SwanSpotlight.itemId STRING(36)`, G0-SOURCE-EXCERPTS.md:109) and the contract
 * bounds it at 36 (`:54`). So an over-long id was not merely accepted — it was silently
 * REWRITTEN into a different id. Two distinct items whose ids agree on the first 36 characters
 * were both stored as that shared prefix: one row, two items, no error anywhere.
 *
 * The fix. Identity is normalised by `identity()`, which REJECTS an over-long value instead of
 * shortening it, and display text keeps `str()` and its truncation. The two rules are now
 * separate functions with names that say which is which.
 *
 * Why this file exists rather than an addition to an existing suite. `tests/api/swanBridgeIngest.test.mjs`
 * owns "schema validation" but sits at 282 lines against the 300-line cap (`06-bans.md` #50), and
 * `bridgeSpotlightOrdering.contract.test.mjs` is already over it. Neither has any assertion about
 * the LENGTH of `itemId` — which is exactly how the defect survived.
 *
 * What this file proves, and what it does not. The direct cases drive the exported validator, so
 * they prove the RULE. The route case proves the rejection reaches the wire as 422 and that the
 * model is never asked to write. Nothing here reaches a database, DNS, or R2, so no claim is made
 * about what PostgreSQL would have done with the colliding key.
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockCreate, mockUpdate, mockFindByPk } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockFindByPk: vi.fn(),
}));

vi.mock('../models/social/SwanSpotlight.mjs', () => ({
  default: { findByPk: mockFindByPk, update: mockUpdate, create: mockCreate, findAll: vi.fn() },
}));
vi.mock('../services/photoStorageService.mjs', () => ({ uploadPhoto: vi.fn() }));
vi.mock('../services/spotlightImageFetch.mjs', () => ({ fetchAndDecodeSpotlightImage: vi.fn() }));

const {
  validateSpotlightPayload, SPOTLIGHT_MAX_ITEM_ID, SPOTLIGHT_MAX_HEADLINE, default: bridgeRouter,
} = await import('../routes/bridge/bridgeIngestRoutes.mjs');
const { signPayload } = await import('../services/swanBridgeSignature.mjs');

const SECRET = 'test-swan-bridge-secret-value-0123456789';
const app = express();
app.use('/api/bridge', bridgeRouter);

/** A contract-legal id: exactly 36 characters. */
const ITEM = '11111111-2222-3333-4444-555555555555';
/** The collision pair — DISTINCT ids that agree on their first 36 characters. */
const ITEM_A = `${ITEM}aaaa`;
const ITEM_B = `${ITEM}bbbb`;

const body = (overrides = {}) => ({
  itemId: ITEM,
  revision: 1,
  retracted: false,
  headline: 'A community garden doubled its harvest',
  ...overrides,
});

const post = async (payload) => {
  const raw = JSON.stringify(payload);
  const timestamp = new Date().toISOString();
  const signature = signPayload(timestamp, Buffer.from(raw), SECRET);
  return request(app)
    .post('/api/bridge/spotlight')
    .set('Content-Type', 'application/json')
    .set('X-Swan-Signature', signature)
    .set('X-Swan-Timestamp', timestamp)
    .send(raw);
};

beforeEach(() => {
  process.env.SPOTLIGHT_ENABLED = 'true';
  process.env.SWAN_BRIDGE_SECRET_V1 = SECRET;
  mockCreate.mockReset().mockResolvedValue({});
  mockUpdate.mockReset().mockResolvedValue([0]);
  mockFindByPk.mockReset().mockResolvedValue(null);
});

describe('R5-02 — itemId is an identity: rejected when over-long, never shortened', () => {
  it('the contract bound is the column width', () => {
    expect(SPOTLIGHT_MAX_ITEM_ID).toBe(36);
  });

  it('rejects an itemId longer than the contract bound', () => {
    const result = validateSpotlightPayload(body({ itemId: `${ITEM}x` }));
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('itemId');
    expect(result.reason).toContain('36');
  });

  it('rejects BOTH members of a pair that collides on the 36th character', () => {
    // Distinct inputs. Under `slice(0, 36)` both normalised to exactly `ITEM` — the two items
    // became one primary key. Neither may be accepted now.
    expect(ITEM_A).not.toBe(ITEM_B);

    const a = validateSpotlightPayload(body({ itemId: ITEM_A }));
    const b = validateSpotlightPayload(body({ itemId: ITEM_B }));

    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
    // The specific harm: neither may be rewritten into the shared prefix.
    expect(a.value?.itemId).not.toBe(ITEM);
    expect(b.value?.itemId).not.toBe(ITEM);
  });

  it('accepts an itemId of exactly the contract bound, unchanged', () => {
    expect(ITEM).toHaveLength(SPOTLIGHT_MAX_ITEM_ID);
    const result = validateSpotlightPayload(body({ itemId: ITEM }));
    expect(result.ok).toBe(true);
    expect(result.value.itemId).toBe(ITEM);
  });

  it('still trims surrounding whitespace rather than rejecting it', () => {
    const result = validateSpotlightPayload(body({ itemId: `  ${ITEM}  ` }));
    expect(result.ok).toBe(true);
    expect(result.value.itemId).toBe(ITEM);
  });

  it('rejects a missing, non-string, or whitespace-only itemId', () => {
    for (const itemId of [undefined, null, 42, '', '   ']) {
      expect(validateSpotlightPayload(body({ itemId })).ok).toBe(false);
    }
  });

  it('leaves DISPLAY text truncating — the two rules were separated, not merged', () => {
    // The other half of the fix: prose must still be clipped, not rejected. If the repair had
    // simply made every field reject its over-long input, this would fail.
    const long = 'x'.repeat(SPOTLIGHT_MAX_HEADLINE + 40);
    const result = validateSpotlightPayload(body({ headline: long }));
    expect(result.ok).toBe(true);
    expect(result.value.headline).toHaveLength(SPOTLIGHT_MAX_HEADLINE);
  });
});

describe('R5-02 — the rejection reaches the wire and never reaches the model', () => {
  it('answers 422 for an over-long itemId and writes nothing', async () => {
    const res = await post(body({ itemId: ITEM_A }));
    expect(res.status).toBe(422);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
