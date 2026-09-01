/**
 * The charging rule — one function, because it used to be two.
 * ============================================================================
 *
 * `chargedUsd` was computed in `composeStills` for the synchronous lane and again in
 * `localBatchRunner` for the async one, and the async copy's own comment said so: "the same
 * rule the synchronous lane already applies". The two had ALREADY diverged — sync multiplied
 * `cost.unitUsd` raw, so an absent price gave NaN and shipped to the client as `null`; async
 * coerced and gave 0. Same rule, two answers, on the money path.
 *
 * A parity test between the lanes is impossible: the only async lane is local, `unitUsd` is
 * 0 there, so both sides return 0 whatever they do. A test that cannot fail protects
 * nothing. One shared function does, because there is nothing left to drift from — and the
 * function itself CAN be tested, which is what this file does.
 */

import { describe, it, expect } from 'vitest';
import { chargedUsdFor } from '../../services/atelier/composeLimits.mjs';

describe('what a batch is charged — one rule, two lanes', () => {
  it('is unit price times stills DELIVERED, not requested', () => {
    // A batch of ten that returns eight must quote eight. Charging for the request is how
    // a partial failure becomes a billing dispute.
    expect(chargedUsdFor(0.04, 8)).toBeCloseTo(0.32, 10);
  });

  it('an absent unit price is 0, not NaN', () => {
    // THE DIVERGENCE THIS FUNCTION EXISTS TO END. The synchronous lane multiplied
    // `cost.unitUsd` raw, so an absent price produced NaN — which JSON.stringify ships to
    // the client as `null`, with nothing logged and no error. The async lane coerced and
    // produced 0. Same rule, two answers, on the money path.
    expect(chargedUsdFor(undefined, 4)).toBe(0);
    expect(chargedUsdFor(null, 4)).toBe(0);
    expect(chargedUsdFor('not a price', 4)).toBe(0);
    expect(Number.isNaN(chargedUsdFor(undefined, 4))).toBe(false);
  });

  it('a nonsensical count is 0 rather than a negative charge', () => {
    // A negative charge is a refund nobody authorised.
    expect(chargedUsdFor(0.04, -1)).toBe(0);
    expect(chargedUsdFor(0.04, undefined)).toBe(0);
  });

  it('delivering nothing costs nothing', () => {
    expect(chargedUsdFor(0.04, 0)).toBe(0);
  });

  it('a free lane is free however many it delivers', () => {
    // The local lane's unitUsd is 0. This is the case that makes the async lane
    // unobservable — and the reason one shared function beats a parity test there.
    expect(chargedUsdFor(0, 4)).toBe(0);
  });
});
