/**
 * moneyPathLowSeverityHardening.test.mjs
 * ======================================
 * The LOW-tier cluster from the 2026-08-19 Kimi K3 / GLM-5.3 hostile review.
 * Individually small; each one either misreports money or turns a 400-shaped
 * problem into a 500, and three of the four are DRIFT — a sibling rail was
 * already hardened and this one was not.
 *
 * Kimi L1 — the ACH rail guarded its items with `!items?.length`, which is
 *   satisfied by a STRING ("abc".length === 3). The body then reached
 *   items.map() and threw: a 500 for a malformed request. The offline rail
 *   already used Array.isArray.
 *
 * Kimi L2 — the offline rail built `new Decimal(clientTotal || 0)` straight
 *   from the body. Decimal THROWS on garbage, the throw landed in the outer
 *   catch, and the client got a 500. The ACH rail added a finite check for
 *   exactly this; offline did not get it.
 *
 * Kimi L3 / GLM L1 — `refunds.data[length - 1]` was described as "the latest
 *   refund". Stripe list objects are NEWEST-FIRST, so that index is the OLDEST
 *   refund; and the embedded list is capped (has_more beyond ~10), so on a
 *   heavily-refunded charge the entry may be missing entirely. Either way the
 *   admin alert reported a wrong per-event amount — the same misreport the
 *   partial-refund fix was written to kill, one layer up in the payload.
 *
 * Kimi L4 — VIP fulfilment recorded a hardcoded `amount: 175`, so a price
 *   change or a discounted session recorded a false amount permanently.
 *
 * GLM L2 — /cancel-checkout makes 1-2 Stripe API calls per hit with no rate
 *   limiter: an authenticated caller could burn the Stripe quota.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dir = dirname(fileURLToPath(import.meta.url));

/**
 * Comments stripped before matching. Twice in this workstream a source guard
 * passed by matching the explanatory prose describing the very defect it was
 * meant to catch, so no assertion here may see a comment.
 */
const executableSource = (relativePath) => readFileSync(resolve(__dir, relativePath), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('Kimi L1 — ACH item validation matches the offline rail', () => {
  const source = executableSource('../../routes/achPaymentRoutes.mjs');

  it('requires an actual array, not merely something with a length', () => {
    expect(source).toContain('!Array.isArray(items)');
  });

  it('no longer relies on the truthy-length shortcut', () => {
    expect(source).not.toContain('!items?.length');
  });

  it('behaves the same way as the offline rail it drifted from', () => {
    const offline = executableSource('../../routes/offlinePaymentRoutes.mjs');
    expect(offline).toContain('!Array.isArray(items)');
  });
});

describe('Kimi L2 — offline totals reject garbage with a 400, not a 500', () => {
  const source = executableSource('../../routes/offlinePaymentRoutes.mjs');

  it('checks both client figures are finite before any Decimal work', () => {
    expect(source).toContain('Number.isFinite(clientTotalNumber)');
    expect(source).toContain('Number.isFinite(clientFeeNumber)');
  });

  it('the guard runs BEFORE the Decimal that used to throw', () => {
    const guardAt = source.indexOf('Number.isFinite(clientTotalNumber)');
    const decimalAt = source.indexOf('const expectedTotal = new Decimal(');
    expect(guardAt).toBeGreaterThan(-1);
    expect(decimalAt).toBeGreaterThan(guardAt);
  });

  it('returns 400 rather than falling into the outer 500 catch', () => {
    expect(source).toMatch(/Number\.isFinite\(clientFeeNumber\)\)[\s\S]{0,500}res\.status\(400\)/);
  });

  it('never constructs a Decimal from the raw body value again', () => {
    expect(source).not.toContain('new Decimal(clientTotal || 0)');
  });
});

describe('Kimi L3 / GLM L1 — the "latest" refund was the oldest one', () => {
  const source = executableSource('../../webhooks/stripeWebhook.mjs');

  it('no longer indexes the end of the list', () => {
    expect(source).not.toContain('refunds.data.length - 1');
  });

  it('selects by created timestamp instead of by position', () => {
    expect(source).toContain('Number(entry?.created ?? 0)');
  });

  it('treats a truncated list as untrustworthy', () => {
    expect(source).toContain('has_more');
    expect(source).toContain('refundListTruncated');
  });

  it('tells the alert reader when the amount is not an exact delta', () => {
    expect(source).toContain('amountIsExactDelta');
  });
});

describe('Kimi L4 — VIP amount comes from Stripe, not from a constant', () => {
  const source = executableSource('../../webhooks/stripeWebhook.mjs');

  it('reads the session total', () => {
    expect(source).toMatch(/amount:[\s\S]{0,300}session\.amount_total/);
  });

  it('keeps 175 only as a fallback, never as the primary value', () => {
    expect(source).not.toMatch(/^\s*amount: 175,\s*$/m);
  });
});

describe('GLM L2 — /cancel-checkout is rate limited', () => {
  const source = executableSource('../../routes/cartRoutes.mjs');

  it('applies a limiter to the route that calls Stripe', () => {
    expect(source).toMatch(/router\.post\(\s*'\/cancel-checkout',\s*protect,\s*\w*[Ll]imiter/);
  });
});
