/**
 * ipv6LiteralSyntax.test.mjs
 * ==========================
 * DIRECT tests for the IPv6 syntax primitives — the module's own contract.
 *
 * WHY THIS FILE EXISTS (it exists because a mutation SURVIVED). Deleting the whole-address
 * validation in `isValidIPv6` left `addressClassificationR9.test.mjs` fully GREEN, because
 * that suite reaches this module only THROUGH `isPubliclyRoutableIPv6`, which applies its
 * own `isValidIPv6` guard. The syntax check was therefore redundant on that path and the
 * suite could not see its removal. A test that cannot see the deletion of the code it
 * claims to cover is not covering it.
 *
 * So the primitives are exercised where they are DEFINED, not only where they happen to be
 * called. After this file, removing the validation goes RED.
 *
 * Two properties, stated plainly:
 *   - `isValidIPv6` answers "is this a legal address", and is strict: malformed input is
 *     rejected rather than partially parsed.
 *   - `expandIPv6` is the equaliser: every spelling of one address returns one string, so
 *     no downstream answer can depend on the spelling.
 */

import { describe, it, expect } from 'vitest';
import { isValidIPv6, expandIPv6 } from '../../services/ipv6LiteralSyntax.mjs';

describe('isValidIPv6 — malformed literals are rejected', () => {
  const malformed = [
    ['', 'empty string'],
    ['2606:not-an-ip', 'non-hex tail group'],
    [':8.8.8.8', 'empty leading group before a dotted quad'],
    ['2002:::', 'trailing triple colon'],
    ['2001:db8::1::2', 'two `::` compressions'],
    ['12345::1', 'group wider than 4 hex digits'],
    ['1:2:3:4:5:6:7', 'seven groups with no compression'],
    ['zzzz::1', 'non-hex group'],
    ['::1.2.3.999', 'octet above 255 in the dotted tail'],
    ['::1.2.3', 'three-octet dotted tail'],
    ['2001:db8:0:0:0:0:0:0:0', 'nine groups'],
    ['::1.2.3.4.5', 'five-octet dotted tail'],
  ];

  for (const [addr, why] of malformed) {
    it(`rejects ${JSON.stringify(addr)} — ${why}`, () => {
      expect(isValidIPv6(addr)).toBe(false);
    });
  }

  it('rejects non-string input rather than throwing', () => {
    expect(isValidIPv6(undefined)).toBe(false);
    expect(isValidIPv6(null)).toBe(false);
    expect(isValidIPv6(42)).toBe(false);
  });
});

describe('isValidIPv6 — legal literals are accepted', () => {
  const valid = [
    '::1',
    '::',
    '2001:db8::1',
    '2002:7f00::1',
    '2002:7f00:0::1',
    '::ffff:127.0.0.1',
    '::ffff:0:127.0.0.1',
    '64:ff9b::7f00:1',
    '2001:4860:4860::8888',
    '0:0:0:0:0:0:0:1',
    'fe80::1',
    'fc00::1',
  ];

  for (const addr of valid) {
    it(`accepts ${addr}`, () => {
      expect(isValidIPv6(addr)).toBe(true);
    });
  }
});

describe('expandIPv6 — spelling is erased', () => {
  it('returns 8 groups of 4 hex digits', () => {
    const out = expandIPv6('2001:db8::1');
    expect(out).not.toBeNull();
    const groups = out.split(':');
    expect(groups).toHaveLength(8);
    for (const g of groups) expect(g).toMatch(/^[0-9a-f]{4}$/);
  });

  it('THE EQUALISER: the round-9 pair expands to ONE string', () => {
    // 2002:7f00::1 and 2002:7f00:0::1 are the same address. Before round 9's fix these
    // classified differently; this assertion is the reason they can no longer.
    expect(expandIPv6('2002:7f00::1')).toBe(expandIPv6('2002:7f00:0::1'));
  });

  it('agrees across four spellings that ARE the same address', () => {
    // These four differ only in compression and zero-padding; Node reports the same
    // address for each, and they must therefore expand to one string.
    const spellings = [
      '::ffff:7f00:1',
      '0:0:0:0:0:ffff:7f00:1',
      '0000:0000:0000:0000:0000:ffff:7f00:0001',
      '::FFFF:7F00:1',
    ];
    const expanded = new Set(spellings.map((s) => expandIPv6(s)));
    expect(expanded.size).toBe(1);
    expect([...expanded][0]).toBe('0000:0000:0000:0000:0000:ffff:7f00:0001');
  });

  it('does NOT conflate ::ffff:127.0.0.1 with ::ffff:0:127.0.0.1 — they are DIFFERENT addresses', () => {
    // Measured, not assumed. Node is the authority:
    //   net.isIP('::ffff:127.0.0.1')   === 6   dns.lookup -> '::ffff:127.0.0.1'
    //   net.isIP('::ffff:0:127.0.0.1') === 6   dns.lookup -> '::ffff:0:127.0.0.1'
    // The first is RFC 4291 IPv4-mapped (groups 0-4 zero, group 5 = ffff). The second
    // carries an extra zero group, so its ffff sits in group 4 — a different address in
    // the ::ffff:0:0:0/96 block. An earlier draft of this file asserted they expand
    // identically; that assertion was WRONG, and these two expansions are the correction.
    // Both are still IPv6 loopback-ish and both must classify private, which is the
    // property that actually matters — see addressClassificationR9.test.mjs.
    expect(expandIPv6('::ffff:127.0.0.1')).toBe('0000:0000:0000:0000:0000:ffff:7f00:0001');
    expect(expandIPv6('::ffff:0:127.0.0.1')).toBe('0000:0000:0000:0000:ffff:0000:7f00:0001');
    expect(expandIPv6('::ffff:127.0.0.1')).not.toBe(expandIPv6('::ffff:0:127.0.0.1'));
  });

  it('folds a dotted quad into the LAST two groups', () => {
    // The dotted quad is an alternative spelling of the final 32 bits, never of an
    // earlier pair: ::ffff:1.2.3.4 must equal ::ffff:0102:0304, not ::ffff:0000:0102.
    expect(expandIPv6('::ffff:1.2.3.4')).toBe('0000:0000:0000:0000:0000:ffff:0102:0304');
    expect(expandIPv6('::ffff:1.2.3.4')).toBe(expandIPv6('::ffff:102:304'));
    expect(expandIPv6('1:2:3:4:5:6:1.2.3.4')).toBe('0001:0002:0003:0004:0005:0006:0102:0304');
  });

  it('returns null for anything invalid, so callers cannot parse garbage', () => {
    for (const bad of ['2606:not-an-ip', ':8.8.8.8', '2002:::', '', 'zzzz::1']) {
      expect(expandIPv6(bad)).toBeNull();
    }
  });
});
