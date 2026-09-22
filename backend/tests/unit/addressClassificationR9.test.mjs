/**
 * addressClassificationR9.test.mjs
 * ================================
 * REGRESSION GATE FOR HOSTILE-REVIEW ROUND 9, FINDING 1.
 *
 * WHAT WENT WRONG. The classifier validated only the FIRST colon-separated group of an
 * IPv6 literal and never parsed the rest. Three measured consequences:
 *
 *   2606:not-an-ip   -> head `2606` is in 2000::/3, so PUBLIC. The tail was never read.
 *   :8.8.8.8         -> a dotted-suffix shortcut matched before any validation ran.
 *   2002:7f00::1     -> PUBLIC, while `2002:7f00:0::1` — THE SAME ADDRESS written with an
 *                       explicit zero group — was PRIVATE.
 *
 * The third is the one that matters most, and it is why the fix is structural rather than
 * another prefix-list entry: if two spellings of one address can classify differently, no
 * enumeration of ranges is safe, because the attacker chooses the spelling.
 *
 * THE PROPERTY THESE TESTS PIN, stated once so it can be checked rather than admired:
 *   classification depends on the ADDRESS, never on its representation.
 *
 * These four inputs are Astra's, reproduced verbatim from the round-9 reply, so this file
 * is a transcript of the finding rather than my paraphrase of it.
 */

import { describe, it, expect } from 'vitest';
import { isPrivateOrLocalAddress } from '../../services/addressClassification.mjs';

describe('round 9 finding 1 — the classifier must read the whole address', () => {
  it('rejects a malformed literal whose FIRST group looks global (2606:not-an-ip)', () => {
    // Before the fix: `head` was 2606, inside 2000::/3, so this returned false (PUBLIC).
    // A string that is not an address is not a public address.
    expect(isPrivateOrLocalAddress('2606:not-an-ip')).toBe(true);
  });

  it('rejects a leading-dot-quad literal with an empty first group (:8.8.8.8)', () => {
    // Before the fix: the dotted-suffix shortcut matched before IPv6 validation.
    expect(isPrivateOrLocalAddress(':8.8.8.8')).toBe(true);
  });

  it('classifies 6to4 loopback as private in its COMPRESSED spelling', () => {
    expect(isPrivateOrLocalAddress('2002:7f00::1')).toBe(true);
  });

  it('classifies 6to4 loopback as private in its EXPANDED spelling', () => {
    expect(isPrivateOrLocalAddress('2002:7f00:0::1')).toBe(true);
  });

  it('THE SHARPEST ONE: both spellings of one address agree', () => {
    // This is the assertion that would have caught the bug. Anything less than equality
    // between spellings leaves the representation in charge of the answer.
    expect(isPrivateOrLocalAddress('2002:7f00::1')).toBe(
      isPrivateOrLocalAddress('2002:7f00:0::1'),
    );
  });
});

describe('round 9 finding 1 — the property generalises beyond the four measured cases', () => {
  // Astra's fix instruction: "Add the four cases above and equivalent compressed/expanded
  // representations." A fix that only satisfies the four literal strings is a fix to the
  // test, not to the classifier — so the spellings are enumerated here.
  const spellingsOfSameAddress = [
    '::ffff:127.0.0.1',
    '::ffff:0:127.0.0.1',
    '0:0:0:0:0:ffff:7f00:1',
    '0000:0000:0000:0000:0000:ffff:7f00:0001',
    '::ffff:7f00:1',
  ];

  for (const spelling of spellingsOfSameAddress) {
    it(`agrees that ${spelling} is loopback-adjacent and private`, () => {
      expect(isPrivateOrLocalAddress(spelling)).toBe(true);
    });
  }

  it('every spelling of ::ffff:0:127.0.0.1 gives the SAME answer', () => {
    const answers = new Set(spellingsOfSameAddress.map((s) => isPrivateOrLocalAddress(s)));
    expect(answers.size).toBe(1);
  });

  it('6to4 of a PUBLIC v4 address is still public (the fix does not over-block)', () => {
    // 2002:0808:0808::/48 embeds 8.8.8.8. Guarding against a fix that simply rejects
    // everything containing 2002, which would pass the tests above and break real traffic.
    expect(isPrivateOrLocalAddress('2002:808:808::1')).toBe(false);
  });

  it('NAT64 of loopback is private, via the well-known prefix', () => {
    expect(isPrivateOrLocalAddress('64:ff9b::7f00:1')).toBe(true);
  });

  it('ordinary global unicast is still public (no regression from the allowlist)', () => {
    expect(isPrivateOrLocalAddress('2001:4860:4860::8888')).toBe(false);
    expect(isPrivateOrLocalAddress('2606:4700:4700::1111')).toBe(false);
  });
});

describe('the allowlist is LOAD-BEARING, not decoration (found by mutation, M6)', () => {
  // WHY THIS BLOCK EXISTS. A mutation that replaced `return leading >= 0x2000 && leading
  // <= 0x3fff` with `return true` — i.e. "anything with a global-looking first group is
  // public" — SURVIVED the rest of this file: 54 tests, all green. Every case above either
  // tested a malformed string or a genuine global unicast address, so none of them could see
  // the allowlist being removed.
  //
  // The addresses below are WELL-FORMED IPv6 that simply are not global unicast. Under the
  // mutation they classify public. They must not: an address Node's own parser accepts, and
  // that is not in 2000::/3, is not something this system will fetch.
  const notGlobalUnicast = [
    ['4000::1', 'above 2000::/3 — unassigned'],
    ['6000::1', 'above 2000::/3'],
    ['8000::1', 'above 2000::/3'],
    ['a000::1', 'above 2000::/3'],
    ['c000::1', 'above 2000::/3'],
    ['e000::1', 'above 2000::/3'],
    ['1000::1', 'below 2000::/3'],
    ['1800::1', 'below 2000::/3'],
    ['1fff::1', 'just below the 2000::/3 floor'],
    ['0200::1', 'below 2000::/3'],
    ['0400::1', 'below 2000::/3'],
    ['0800::1', 'below 2000::/3'],
  ];

  for (const [addr, why] of notGlobalUnicast) {
    it(`treats ${addr} as private — ${why}`, () => {
      expect(isPrivateOrLocalAddress(addr)).toBe(true);
    });
  }

  it('the boundaries themselves: 2000::/3 is public, its neighbours are not', () => {
    expect(isPrivateOrLocalAddress('2000::1')).toBe(false);   // first address in /3
    expect(isPrivateOrLocalAddress('3fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(false); // last
    expect(isPrivateOrLocalAddress('1fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true);
    expect(isPrivateOrLocalAddress('4000::1')).toBe(true);    // first address after /3
  });
});

describe('the embedded-IPv4 decode must use BIT POSITION, not string position (found by mutation, M4)', () => {
  // WHY THIS BLOCK EXISTS. A mutation making `extractEmbeddedIPv4` read the RAW string
  // instead of the expanded one SURVIVED the rest of this file. It is close to equivalent —
  // I diffed both strategies over a 180-address corpus and found 61 extractor-level
  // disagreements, which collapsed to 5 classifier-level differences. These are they.
  //
  // The mechanism: on a raw string a leading `::` compresses away groups, so `g[1]` and
  // `g[2]` — the two groups 6to4 reads its IPv4 from — point at the WRONG groups, and the
  // other three groups never get counted at all. `2002:808:1` opens with `2002` but has no
  // explicit second and third group, so the raw read produced `8.8.0.0`; expanded it is
  // 8.8.0.0/… and the several missing groups make it a non-address.
  //
  // These are fail-OPEN differences (clean says private, mutant said public), which is the
  // D2 class, so they are pinned explicitly rather than left to a corpus study.
  //
  // ROUND 11 CORRECTION — two cases here were WRONG, and in opposite directions.
  //
  //   `2002:808::127.0.0.1` does NOT embed 127.0.0.1. It embeds 8.8.0.0, which is PUBLIC, and it
  //   is public for a reason this block's own title states: 6to4 (RFC 3056) carries the IPv4 in
  //   bits 16-47 — groups 1 and 2 — NOT in the trailing dotted quad. Reading `127.0.0.1` out of
  //   the dotted tail is the string-position mistake this block exists to forbid. It is now
  //   asserted PUBLIC, below, so the block tests its own principle instead of contradicting it.
  //
  //   `2002:808:1` and its shorter siblings are NOT valid addresses at all — the comment above
  //   says so — so "stays private" was passing for the wrong reason (an unparseable string is
  //   private by the fail-closed default, not by any 6to4 reasoning). They are moved to the
  //   malformed-input block, where they belong, and this block keeps only addresses that parse
  //   and whose EMBEDDED IPv4 is genuinely private.
  const mustStayPrivate = [
    '2002:7f00::1',                        // embeds 127.0.0.1 in bits 16-47
    '2002:7f00:0::1',                      // the same address, explicit zero group
    '2002:7f00:0:0:0:0:0:0:1',             // the same, fully uncompressed
    '2002:0a00::1',                        // embeds 10.0.0.0 — RFC1918
    '2002:c0a8::1',                        // embeds 192.168.0.0 — RFC1918
  ];

  for (const addr of mustStayPrivate) {
    it(`treats ${addr} as private`, () => {
      expect(isPrivateOrLocalAddress(addr)).toBe(true);
    });
  }

  it('6to4 reads bits 16-47, so a trailing dotted quad is NOT the embedded IPv4', () => {
    // `2002:808::127.0.0.1` embeds 8.8.0.0 (public), not 127.0.0.1 (loopback). A classifier that
    // decoded the dotted tail would call this loopback and hide a real routable address.
    expect(isPrivateOrLocalAddress('2002:808::127.0.0.1')).toBe(false);
    // And the converse, so the test cannot pass by ignoring 6to4 entirely:
    expect(isPrivateOrLocalAddress('2002:7f00::1')).toBe(true);
  });
});

describe('round 9 finding 1 — the malformed-input classes must stay closed', () => {
  const malformed = [
    '2606:not-an-ip',
    ':8.8.8.8',
    '2002:::',           // three colons
    '2001:db8::1::2',    // two `::` compressions
    '12345::1',          // group longer than 4 hex digits
    '1:2:3:4:5:6:7',     // seven groups, no compression
    'zzzz::1',           // non-hex group
    '::1.2.3.999',       // out-of-range octet in the dotted tail
    '::1.2.3',           // three-octet tail
    // MOVED HERE IN ROUND 11. These were asserted "private" inside the 6to4 block, where they
    // passed for the wrong reason: they do not parse, so they are private by the fail-closed
    // default rather than by any 6to4 reasoning. `2002:808:1` has no explicit second and third
    // group, so it is not an address and cannot be a 6to4 address. Pinning them HERE states the
    // real reason and keeps the 6to4 block's claims about 6to4.
    '2002:808:1',                    // missing groups — not an address
    '2002:808:0:0:1',                // ditto
    '2002:808:0:0:0:0:0:0:1.2.3.4',  // 6 explicit groups + a quad = 8 groups, but the
                                     // compression and the tail conflict; not a legal literal
    // ROUND 11: an illegal trailing separator. `isValidIPv6` used to `pop()` the empty group
    // that `split('::')` leaves behind, which discarded the only evidence of the stray colon
    // and let `2606::1:` through as a real address in 2000::/3, classified PUBLIC.
    '2606::1:',                      // trailing single colon after a `::`
    '2606:1:',                       // trailing colon, no `::`
  ];

  for (const addr of malformed) {
    it(`treats ${addr} as private (fail closed)`, () => {
      expect(isPrivateOrLocalAddress(addr)).toBe(true);
    });
  }
});
