/**
 * GET /api/sessions/:id/cancel-warning — fee truth contract
 *
 * The endpoint served `lateFeeAmount: 88` to every client regardless of package.
 * 88 is Math.round(175 * 0.5), so a client on the $110 rate was told their late
 * fee was $88 when half their rate is $55 — and cancelSession applies no fee to a
 * client-initiated cancellation at all, so the copy promised something the code
 * does not do.
 *
 * This is the fourth instance of the same placeholder in this workstream. The
 * first three were fixed in the frontend hook, the cancel panel, and the
 * server-side charge derivation; the number kept surviving one layer further
 * back. These assertions stop it coming back here.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(resolve(__dirname, '../../routes/sessions.mjs'), 'utf8');

const warningHandler = () => {
  const start = SRC.indexOf('router.get("/:id/cancel-warning"');
  expect(start).toBeGreaterThan(-1);
  const end = SRC.indexOf('router.', start + 10);
  return SRC.slice(start, end === -1 ? SRC.length : end);
};

describe('cancel-warning fee truth', () => {
  it('does not serve a hardcoded late fee', () => {
    const handler = warningHandler();
    expect(handler).not.toMatch(/lateFeeAmount:\s*\d/);
    expect(handler).not.toMatch(/A fee of \$\$\{cancellationPolicy\.lateFeeAmount\}/);
  });

  it('derives the fee from the session package helper', () => {
    const handler = warningHandler();
    expect(handler).toContain('getSessionPackagePricing(session)');
  });

  it('returns null rather than a guess when pricing is only a fallback', () => {
    const handler = warningHandler();
    expect(handler).toContain('!packageInfo.isFallback');
    expect(handler).toContain('let lateFeeAmount = null;');
  });

  it('tells the client the credit is forfeited, which is what actually happens', () => {
    const handler = warningHandler();
    expect(handler).toMatch(/session credit will not be returned/i);
  });

  it('keeps one constant for the late-fee rate instead of inline copies', () => {
    expect(SRC).toContain('const LATE_FEE_RATE = 0.5;');
    // No bare 0.5 multipliers left on fee math.
    expect(SRC).not.toMatch(/lateFeeAmount:\s*Math\.round\([A-Za-z]+ \* 0\.5\)/);
  });
});

// GLM panel finding, 2026-08-26. The suite above scopes every assertion to the
// cancel-warning HANDLER via warningHandler(), which slices from
// router.get("/:id/cancel-warning") to the next router. call. getSessionPackagePricing
// is defined ~2,900 lines EARLIER and was never in that slice — so the handler was
// proven safe while the helper it calls still fabricated a fee from a hardcoded
// 175/110 whenever no package was found. The handler guard (!packageInfo.isFallback)
// meant this never reached a client, but a second consumer read it unguarded, and any
// future consumer would have inherited the same trap.
//
// Eliminated at source rather than guarded per-consumer: the helper now returns null.
describe('getSessionPackagePricing helper (outside the handler slice)', () => {
  const helper = () => {
    const start = SRC.indexOf('const getSessionPackagePricing =');
    expect(start).toBeGreaterThan(-1);
    const end = SRC.indexOf('\nconst ', start + 10);
    return SRC.slice(start, end === -1 ? SRC.length : end);
  };

  it('is genuinely outside the handler slice the other tests assert on', () => {
    // Positive control. If this ever fails, the tests below are duplicating the suite
    // above rather than covering the gap they were written for.
    const start = SRC.indexOf('const getSessionPackagePricing =');
    const handlerStart = SRC.indexOf('router.get("/:id/cancel-warning"');
    expect(start).toBeLessThan(handlerStart);
  });

  it('never derives a client-visible fee from the hardcoded fallback price', () => {
    const h = helper();
    expect(h).not.toMatch(/lateFeeAmount:\s*Math\.round\(fallbackPrice \* LATE_FEE_RATE\)/);
    expect(h).not.toMatch(/lateFeeAmount:\s*Math\.round\(defaultChargeAmount \* LATE_FEE_RATE\)/);
  });

  it('returns null for the fee when the package lookup fell back', () => {
    const h = helper();
    expect(h).toContain('lateFeeAmount: null');
    expect(h).toContain('!packageInfo.isFallback');
  });

  it('still exposes defaultChargeAmount, which is operator-facing and review-gated', () => {
    // Narrowing check: the fix must not have collaterally removed the operator default.
    const h = helper();
    expect(h).toContain('defaultChargeAmount');
  });
});
