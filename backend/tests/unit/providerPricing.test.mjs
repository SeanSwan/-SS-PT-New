import test from 'node:test';
import assert from 'node:assert/strict';
import {
  estimateCents,
  checkCap,
  attributionFor,
  PricingError,
  PRICING,
  BASIS,
} from '../../config/providerPricing.mjs';

const FIXED_NOW = Date.parse('2026-08-11T12:00:00Z');

test('per-second estimate matches the quoted real-world price', () => {
  // 8s at 1080p on hosted H3 = 64c. This is the $0.64/hero figure quoted to Sean;
  // if this assertion ever changes, the cost story told to the operator changed too.
  const r = estimateCents({ provider: 'minimax-h3-hosted', durationSec: 8, resolution: '1080p', nowMs: FIXED_NOW });
  assert.equal(r.cents, 64);
  assert.equal(r.basis, BASIS.PER_SECOND);
  assert.equal(r.stale, false);
});

test('the 512p -> 1080p ladder is an 8x saving (the whole reason previews exist)', () => {
  const cheap = estimateCents({ provider: 'minimax-h3-hosted', durationSec: 8, resolution: '512p', nowMs: FIXED_NOW });
  const full = estimateCents({ provider: 'minimax-h3-hosted', durationSec: 8, resolution: '1080p', nowMs: FIXED_NOW });
  assert.equal(cheap.cents, 8);
  assert.equal(full.cents / cheap.cents, 8);
});

test('partial seconds round UP so an estimate is never optimistic', () => {
  const r = estimateCents({ provider: 'minimax-h3-hosted', durationSec: 7.2, resolution: '1080p', nowMs: FIXED_NOW });
  assert.equal(r.cents, 64); // ceil(7.2) = 8s
});

test('per-image estimate scales with count', () => {
  const one = estimateCents({ provider: 'gemini-image-flash', nowMs: FIXED_NOW });
  const three = estimateCents({ provider: 'gemini-image-flash', imageCount: 3, nowMs: FIXED_NOW });
  assert.equal(one.cents, 4);
  assert.equal(three.cents, 12);
  assert.equal(three.basis, BASIS.PER_IMAGE);
});

test('local GPU is zero dollars but declares a wall-clock budget', () => {
  const r = estimateCents({ provider: 'local-gpu', durationSec: 5, resolution: '720p', nowMs: FIXED_NOW });
  assert.equal(r.cents, 0);
  // Time, not money, is the scarce resource on the local lane.
  assert.ok(PRICING['local-gpu'].wallClockSecondsPerOutputSecond['720p'] > 0);
});

test('FAIL-CLOSED: unknown provider throws, never returns 0', () => {
  assert.throws(
    () => estimateCents({ provider: 'some-new-model', durationSec: 5, resolution: '1080p', nowMs: FIXED_NOW }),
    (e) => e instanceof PricingError && e.code === 'E_UNKNOWN_PROVIDER',
  );
});

test('FAIL-CLOSED: unknown resolution throws and names what it knows', () => {
  assert.throws(
    () => estimateCents({ provider: 'minimax-h3-hosted', durationSec: 5, resolution: '4k', nowMs: FIXED_NOW }),
    (e) => e instanceof PricingError && e.code === 'E_UNKNOWN_RESOLUTION' && /512p/.test(e.message),
  );
});

test('FAIL-CLOSED: missing or bad duration throws', () => {
  for (const bad of [undefined, 0, -3, NaN]) {
    assert.throws(
      () => estimateCents({ provider: 'minimax-h3-hosted', durationSec: bad, resolution: '1080p', nowMs: FIXED_NOW }),
      (e) => e.code === 'E_BAD_DURATION',
    );
  }
});

test('stale pricing is reported, not silently trusted', () => {
  const muchLater = FIXED_NOW + 200 * 86_400_000;
  const r = estimateCents({ provider: 'minimax-h3-hosted', durationSec: 8, resolution: '1080p', nowMs: muchLater });
  assert.equal(r.stale, true);
  assert.equal(r.cents, 64); // still quotes, but flags that the number has aged
});

test('FAIL-CLOSED: no configured cap is NOT permission to spend', () => {
  const d = checkCap({ spentCents: 0, estimateCents: 64, capCents: undefined });
  assert.equal(d.allowed, false);
  assert.equal(d.reason, 'E_NO_CAP_CONFIGURED');
});

test('cap blocks when projected spend exceeds it', () => {
  const d = checkCap({ spentCents: 4950, estimateCents: 64, capCents: 5000 });
  assert.equal(d.allowed, false);
  assert.equal(d.reason, 'E_CAP_EXCEEDED');
  assert.equal(d.projectedCents, 5014);
});

test('cap allows under budget and warns at the threshold', () => {
  const ok = checkCap({ spentCents: 100, estimateCents: 64, capCents: 5000 });
  assert.equal(ok.allowed, true);
  assert.equal(ok.warn, false);

  const warning = checkCap({ spentCents: 4000, estimateCents: 64, capCents: 5000, warnAtPercent: 80 });
  assert.equal(warning.allowed, true);
  assert.equal(warning.warn, true); // 4064 >= 4000
});

test('licence-required attribution is exposed for H3 and absent elsewhere', () => {
  assert.equal(attributionFor('minimax-h3-hosted'), 'MiniMax H3');
  assert.equal(attributionFor('gemini-image-flash'), null);
  assert.equal(attributionFor('nonexistent'), null);
});

test('every pricing entry carries provenance so numbers can be re-checked', () => {
  for (const [key, entry] of Object.entries(PRICING)) {
    assert.ok(entry.verifiedOn, `${key} missing verifiedOn`);
    assert.ok(entry.source, `${key} missing source`);
    assert.ok(['verified', 'claimed'].includes(entry.confidence), `${key} bad confidence`);
  }
});
