/**
 * economicsFlags.test.mjs — fail-safe env-parsing wall for the trainer-economics flags.
 * ============================================================================
 * Locks the two-directional fail-safe contract (Codex S1 review F1): an UNRECOGNIZED env value
 * ('1', '0', 'ture', garbage) must keep the caller's `fallback` — it must NOT silently return
 * false, which would take a default-true safety flag (fraudShadow/priceShadowObserve) OUT of
 * shadow mode on a typo. Only literal 'true'/'false' (case-insensitive, trimmed) are recognized.
 *
 * @module tests/unit/economicsFlags.test
 */
import { afterEach, describe, expect, it } from 'vitest';
import { getEconomicsFlags } from '../../config/economicsFlags.mjs';

const KEYS = ['ECON_PRICE_FLOOR_ENFORCE', 'ECON_PRICE_SHADOW_OBSERVE', 'ECON_FRAUD_SHADOW', 'ECON_THROTTLE_ENFORCE'];
const clearEnv = () => KEYS.forEach((k) => { delete process.env[k]; });

describe('economicsFlags — fail-safe env parsing (Codex S1 F1)', () => {
  afterEach(clearEnv);

  it('defaults: floorEnforce false, shadowObserve true, fraudShadow true, throttleEnforce false', () => {
    clearEnv();
    const f = getEconomicsFlags();
    expect(f.priceFloorEnforce).toBe(false);
    expect(f.priceShadowObserve).toBe(true);
    expect(f.fraudShadow).toBe(true);
    expect(f.throttleEnforce).toBe(false);
  });

  it('typo on a DEFAULT-TRUE safety flag stays TRUE (does not fall out of shadow)', () => {
    process.env.ECON_FRAUD_SHADOW = 'ture';
    expect(getEconomicsFlags().fraudShadow).toBe(true);
    process.env.ECON_PRICE_SHADOW_OBSERVE = '1';
    expect(getEconomicsFlags().priceShadowObserve).toBe(true);
    process.env.ECON_PRICE_SHADOW_OBSERVE = 'garbage';
    expect(getEconomicsFlags().priceShadowObserve).toBe(true);
  });

  it('typo on a DEFAULT-FALSE enforcement flag stays FALSE (cannot accidentally enable)', () => {
    process.env.ECON_PRICE_FLOOR_ENFORCE = 'ture';
    expect(getEconomicsFlags().priceFloorEnforce).toBe(false);
    process.env.ECON_THROTTLE_ENFORCE = '1';
    expect(getEconomicsFlags().throttleEnforce).toBe(false);
  });

  it('explicit literal true/false are honored (case-insensitive, trimmed)', () => {
    process.env.ECON_PRICE_FLOOR_ENFORCE = 'true';
    expect(getEconomicsFlags().priceFloorEnforce).toBe(true);
    process.env.ECON_FRAUD_SHADOW = 'false';
    expect(getEconomicsFlags().fraudShadow).toBe(false);
    process.env.ECON_PRICE_SHADOW_OBSERVE = '  FALSE  ';
    expect(getEconomicsFlags().priceShadowObserve).toBe(false);
    process.env.ECON_THROTTLE_ENFORCE = 'TRUE';
    expect(getEconomicsFlags().throttleEnforce).toBe(true);
  });
});