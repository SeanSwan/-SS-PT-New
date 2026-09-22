/**
 * addressClassification.mjs
 * =========================
 * IS THIS ADDRESS PUBLICLY ROUTABLE? — the ONE copy of that answer.
 *
 * WHY THIS FILE EXISTS. Extracted from `applaudAudioFetcher.mjs` on 2026-09-21, in the
 * same way `spotlightImageUrlPolicy.mjs` was extracted from `spotlightImageFetch.mjs`:
 * `06-bans.md` #50 ("no source file reaches 300 lines") had already been breached there
 * (322 lines at HEAD), and hostile-review round 8's D2/D4 fix added more. The seam is
 * **classification vs transport** — this module answers a pure question about a string;
 * `applaudAudioFetcher.mjs` fetches audio and `spotlightImageUrlPolicy.mjs` admits URLs.
 *
 * `isPrivateOrLocalAddress` is RE-EXPORTED from `applaudAudioFetcher.mjs`, so the audio
 * path's importers and its tests are untouched by the move.
 *
 * WHY THERE IS ONLY ONE COPY. Two drifting copies of a private-range table is the failure
 * mode, not the fix — a range fixed in one copy and not the other is a silent hole. Both
 * consumers import from here.
 *
 * SYNTAX LIVES NEXT DOOR. `ipv6LiteralSyntax.mjs` answers "is this a legal IPv6 literal, and
 * what bits does it denote"; this file answers "given that, is it safe to reach". Round 9
 * finding 1 was precisely the consequence of not keeping those apart: classification read the
 * raw spelling, so two spellings of one address (2002:7f00::1, 2002:7f00:0::1) disagreed.
 *
 * THE FAIL-CLOSED INVERSION (round 8, D2/D4). This classifier used to DENYLIST: enumerate
 * the special ranges and call everything else public. Hostile review measured the cost —
 * `resolveAndValidate` ADMITTED `https://[::ffff:0:127.0.0.1]/` (a loopback literal)
 * because a bracketed literal escapes `net.isIP`, leaving this classifier as the only
 * guard; `dns.lookup` then normalised the address to the HEX form `::ffff:0:7f00:1`, and
 * the old mapped-IPv4 regex matched only the dotted form. It fell through to
 * `return false // public IPv6`, and the docblock's promise of fail-closed behaviour was
 * never true. The IPv6 branch now ALLOWLISTS: to be public an address must be recognisably
 * global unicast (`2000::/3`), and anything unrecognised is private.
 */

import { isValidIPv6, expandIPv6 } from './ipv6LiteralSyntax.mjs';

/**
 * The embedded IPv4 of an IPv6 address that carries one, decoded by BIT POSITION.
 *
 * WHY THIS IS SEPARATE AND EXPLICIT. The embedded IPv4 is the address the socket will
 * actually reach, so it must be classified as IPv4 — not as "IPv6, unrecognised". The
 * old code handled exactly one notation (`::ffff:1.2.3.4`) and silently admitted every
 * other, which is hostile review round 8 D4: `::ffff:0:7f00:1` IS `::ffff:0:127.0.0.1`,
 * i.e. loopback, and it was classified public.
 *
 * Forms handled, all by their RFC-defined offsets rather than by string shape:
 *   ::ffff:0:0/96   IPv4-mapped            last 32 bits (RFC 4291 §2.5.5.2)
 *   ::/96           IPv4-compatible        last 32 bits (deprecated, still routable)
 *   64:ff9b::/96    NAT64 well-known       last 32 bits (RFC 6052 §2.2)
 *   64:ff9b:1::/48  NAT64 local-use        RFC 8215 §5 — embedded IPv4 position VARIES
 *   2002::/16       6to4                   bits 16-47 (RFC 3056)
 *
 * REWRITTEN AFTER ROUND 9 FINDING 1. The previous version pattern-matched raw spellings, so
 * a compressed zero group changed the answer. Working on the expanded form removes that class
 * of bug rather than adding another case to the list.
 *
 * NARROWED AFTER ROUND 10 (2026-09-22). The 6to4 and NAT64 tests were BOTH prefix overreaches:
 *
 *   - 6to4 tested `g[0] === 0x2002` alone, so `2002:7f00:1234::1` — which embeds 127.0.0.1 in
 *     bits 16-47 per RFC 3056 — was classified by its bits 16-47 ONLY if they happened to look
 *     like a private quad; the /16 check is correct and is kept, but see the allowlist note.
 *   - NAT64 tested `g[0] === 0x0064 && g[1] === 0xff9b`, which is `64:ff9b::/32`. RFC 6052
 *     defines exactly `/96` (well-known, RFC 6052 §2.2) and `/48` (local-use, RFC 8215 §5).
 *     The /32 test therefore read an embedded IPv4 out of addresses that embed NONE:
 *     `64:ff9b:2::808:808` is not a NAT64 address, and its trailing groups are ordinary hex
 *     groups, but the classifier decoded `808:808` as `8.8.8.8` and answered PUBLIC on the
 *     strength of a quad the address does not carry. An invented quad is worse than no quad:
 *     it turns "we cannot tell" into "we checked, it is public".
 *
 * THE GENERAL RULE, learned twice now: a prefix test must be as NARROW as the RFC that defines
 * the embedding, because every group past the true prefix is data that must not be reinterpreted.
 *
 * @param {string} addr an unbracketed IPv6 literal
 * @returns {string|null} the embedded dotted-quad, or null if the form embeds none
 */
function extractEmbeddedIPv4(addr) {
  const expanded = expandIPv6(addr);
  if (expanded === null) return null;

  const g = expanded.split(':').map((x) => parseInt(x, 16));
  const quad = (hi, lo) => `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
  const isZeroPrefix = (n) => g.slice(0, n).every((x) => x === 0);

  // 6to4 — 2002::/16, IPv4 in bits 16-47 (groups 1 and 2). RFC 3056 §2.
  if (g[0] === 0x2002) return quad(g[1], g[2]);

  // NAT64 well-known 64:ff9b::/96 — the embedded IPv4 is the last 32 bits. RFC 6052 §2.2.
  // NOT /32: groups 2-5 must be zero for the last 32 bits to be the embedded address at all.
  if (g[0] === 0x0064 && g[1] === 0xff9b) {
    if (g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0) return quad(g[6], g[7]);
    // 64:ff9b:1::/48 is the local-use prefix (RFC 8215 §5), whose embedded-IPv4 location is
    // explicitly NOT fixed — §5 says the position of the IPv4 address MUST NOT be assumed.
    // So for the /48 we do NOT decode a quad; returning null means "no confidently-located
    // embedded IPv4". Callers then fall through to the allowlist, which answers PRIVATE for
    // 64:ff9b:1::/48 because it is outside global unicast. Fail closed, by not guessing.
    // Any OTHER 64:ff9b:xxxx address embeds nothing by any RFC, and also gets null.
    return null;
  }

  // IPv4-mapped ::ffff:0:0/96 — groups 0-4 zero, group 5 is ffff. Last 32 bits.
  if (isZeroPrefix(5) && g[5] === 0xffff) return quad(g[6], g[7]);

  // IPv4-compatible ::/96 — groups 0-5 zero (and not :: or ::1, which are handled upstream).
  if (isZeroPrefix(6)) return quad(g[6], g[7]);

  return null;
}

/**
 * Special-purpose IPv6 ranges INSIDE `2000::/3` that are nonetheless NOT publicly routable.
 *
 * WHY THIS LIST HAS TO EXIST. `2000::/3` is NECESSARY but NOT SUFFICIENT for routability. The
 * IANA IPv6 Special-Purpose Address Registry assigns sub-ranges inside 2000::/3 as
 * documentation, benchmarking or other non-global space, and the IETF has stated that new
 * special-purpose ranges will continue to be carved out of it. A classifier that answers
 * "PUBLIC" for everything in 2000::/3 therefore answers PUBLIC for addresses that are defined
 * to be unreachable, and it will keep doing so as the registry grows.
 *
 * Measured before this list existed (round 10):
 *   3fff::1    -> PUBLIC   but 3fff::/20 is DOCUMENTATION space (RFC 9637)
 *   2001:2::1  -> PUBLIC   but 2001:2::/48 is the benchmarking range, non-global (RFC 5180)
 *
 * This remains an allowlist-first design: an address must be inside 2000::/3 AND outside every
 * range below. The list is a DENY inside the allow — narrower than the old denylist, and
 * narrower than 2000::/3 alone, which was the defect.
 *
 * @param {number[]} g the eight expanded groups as integers
 * @returns {boolean} true if the address is in a special-purpose non-global range
 */
function isSpecialPurposeWithinGlobalUnicast(g) {
  // 2001:2::/48  — benchmarking (RFC 5180 §4). Group 0 = 2001, group 1 = 0002, group 2 = 0000.
  if (g[0] === 0x2001 && g[1] === 0x0002 && g[2] === 0) return true;

  // 2001:db8::/32 — documentation (RFC 3849 §2.1).
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true;

  // 3fff::/20 — documentation (RFC 9637 §3). THE MASK IS 20 BITS, NOT 12.
  // 3fff::/20 covers 3fff:0000:: – 3fff:0fff:ffff:..., i.e. group 0 is 0x3fff AND groups 1's
  // top 4 bits are zero. Writing this as `g[0] >= 0x3ff0 && g[0] <= 0x3fff` swallows the top
  // /12 of ALL global unicast — it made `3fff:ffff:...:ffff` (the LAST address in 2000::/3, and
  // ordinary routable space) classify as private. A prefix test must apply the prefix LENGTH,
  // not just the leading group: getting this wrong fails closed on legitimate addresses, which
  // is a different harm from failing open but still a defect.
  if (g[0] === 0x3fff && g[1] <= 0x0fff) return true;

  // 2001:10::/28 — ORCHID (deprecated, RFC 4843 §3.1); 2001:20::/28 — ORCHIDv2 (RFC 7343 §3.2).
  // Both are inside 2001::/16 and not globally routable.
  if (g[0] === 0x2001 && g[1] >= 0x0010 && g[1] <= 0x002f) return true;

  return false;
}

/**
 * The positive test: is this IPv6 literal a *global unicast* address?
 *
 * Deliberately conservative and deliberately ALLOWLISTING. Every previous version of this
 * classifier was denylisting — enumerate the bad ranges and call the rest public — which
 * meant a range nobody thought of was silently public. That is how `::ffff:0:7f00:1` got
 * through. Here the burden is inverted: an address is public only if it is recognisably
 * in the global unicast space.
 *
 * `2000::/3` is the currently-assigned global unicast range (2000:: – 3fff:...), so it is
 * NECESSARY. It is NOT SUFFICIENT: the IANA Special-Purpose Address Registry carves
 * non-global ranges out of it, and will keep doing so. See `isSpecialPurposeWithinGlobalUnicast`.
 *
 * ROUND 9 FINDING 1: the syntax check is NOT optional and must come first. Validating only
 * the leading group admitted `2606:not-an-ip`. A string that is not an IPv6 address cannot
 * be a publicly routable one.
 *
 * ROUND 10: THE LEADING GROUP IS READ FROM THE EXPANDED FORM, NOT THE SPELLING. The previous
 * version did `addr.split(':')[0]` on the RAW string, which is a representation-dependent read —
 * exactly the defect class this module was extracted to remove. On `::ffff:1.2.3.4` the raw
 * split yields `''`, and on a literal like `2000::1` the raw split happens to be correct, so the
 * bug is invisible until a form appears whose FIRST raw group is not its first expanded group.
 * Reading `g[0]` after `expandIPv6` removes the question entirely.
 *
 * @param {string} addr an unbracketed IPv6 literal
 * @returns {boolean} true only if the address is a legal address inside 2000::/3 and outside
 *   every registered special-purpose range inside it
 */
function isPubliclyRoutableIPv6(addr) {
  if (!isValidIPv6(addr)) return false;  // not an address => not a public address
  const expanded = expandIPv6(addr);
  // `isValidIPv6` is true for `::` while `expandIPv6('::')` is null (it elides all eight groups,
  // so there is no host to name). The unspecified address is handled upstream, and anything else
  // that cannot be expanded is not a public address — fail closed rather than assume.
  if (expanded === null) return false;

  const g = expanded.split(':').map((x) => parseInt(x, 16));
  // 2000::/3 — the first three bits are 001, so the first group is 0x2000-0x3fff.
  if (g[0] < 0x2000 || g[0] > 0x3fff) return false;
  return !isSpecialPurposeWithinGlobalUnicast(g);
}

/**
 * Reject any address that's NOT publicly routable.
 *
 * Covers IPv4 + IPv6:
 *   - 127.0.0.0/8       loopback
 *   - 10.0.0.0/8        RFC1918 private
 *   - 172.16.0.0/12     RFC1918 private
 *   - 192.168.0.0/16    RFC1918 private
 *   - 169.254.0.0/16    link-local
 *   - 100.64.0.0/10     CGNAT (carrier-grade NAT)
 *   - 224.0.0.0/4       multicast (224.0.0.0 - 239.255.255.255)
 *   - 0.0.0.0/8         "this network"
 *   - 240.0.0.0/4       reserved (240.0.0.0 - 255.255.255.255 incl broadcast)
 *   - ::                IPv6 unspecified
 *   - ::1, 0::1, ::1 in any expanded form   IPv6 loopback
 *   - ::ffff:a.b.c.d and ::ffff:hhhh:hhhh   IPv4-mapped IPv6 (BOTH notations)
 *   - ::a.b.c.d and ::hhhh:hhhh             IPv4-COMPATIBLE IPv6 (deprecated)
 *   - 64:ff9b::/96      NAT64 well-known prefix (embeds an IPv4)
 *   - 64:ff9b:1::/48    NAT64 local-use prefix
 *   - 2002::/16         IPv4-in-IPv6 6to4 (embeds an IPv4 in bits 16-47)
 *   - fc00::/7          IPv6 ULA
 *   - fe80::/10         IPv6 link-local
 *   - ff00::/8          IPv6 multicast
 *   - 100::/64          IPv6 discard-only
 *   - 2001:db8::/32     IPv6 documentation
 *
 * Defaults to "private" on unknown / un-parseable input (fail-closed).
 *
 * THE IPv6 DEFAULT IS FAIL-CLOSED, AND THAT IS A FIX, NOT AN ORIGINAL PROPERTY.
 * This branch used to `return false` ("public IPv6") for anything it did not
 * positively recognise, while the docblock claimed fail-closed behaviour. Hostile
 * review round 8 (2026-09-21, D2/D4) measured the gap and then found it was
 * load-bearing: `resolveAndValidate` ADMITTED `https://[::ffff:0:127.0.0.1]/`
 * because a bracketed literal escapes `net.isIP` (leaving the classifier as the only
 * guard), `dns.lookup` normalises it to the HEX form `::ffff:0:7f00:1`, and the old
 * mapped-IPv4 regex matched only the dotted form. Unrecognised no longer means public:
 * `isPubliclyRoutableIPv6` now has to say yes explicitly.
 */
export function isPrivateOrLocalAddress(ip) {
  if (typeof ip !== 'string' || ip.length === 0) return true;

  // IPv6
  if (ip.includes(':')) {
    // Brackets are a URL-authority artefact, not part of the address, and `net.isIP`
    // rejects them — so a bracketed literal arrives here as a "name". Strip first.
    const addr = ip.startsWith('[') && ip.endsWith(']') ? ip.slice(1, -1) : ip;

    if (addr === '::' || addr === '::1') return true;   // unspecified / loopback (canonical)
    if (/^[fF][cCdD]/.test(addr)) return true;          // fc00::/7 ULA
    // fe80::/10 link-local. Range covers fe80 - febf (NOT just fe80-fe89).
    // Bug fix per Codex NH-4 — original /^[fF][eE]8/ missed fea0-febf.
    if (/^[fF][eE][89aAbB]/.test(addr)) return true;    // fe80::/10 link-local
    if (/^[fF][fF]/.test(addr)) return true;            // ff00::/8 multicast
    if (/^100::/i.test(addr)) return true;              // 100::/64 discard-only
    if (/^2001:0?[dD][bB]8:/i.test(addr)) return true;  // 2001:db8::/32 documentation

    // IPv4-embedding IPv6 forms. These must be decoded BEFORE the generic check,
    // because the embedded IPv4 is the address that will actually be reached.
    const embedded = extractEmbeddedIPv4(addr);
    if (embedded) return isPrivateOrLocalAddress(embedded);

    // Everything else: only a positively-recognised global unicast address is public.
    // Unrecognised is private. This is the fail-closed default the docblock always
    // promised; see the note above.
    return !isPubliclyRoutableIPv6(addr);
  }

  // IPv4
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return true; // can't parse → fail closed
  const a = Number(m[1]);
  const b = Number(m[2]);
  // Every octet must be in range. The regex above accepts `8.8.8.999`, which is not an
  // address at all — hostile review round 8 (D2) reached this via the IPv6 branch's
  // `includes(':')` test, but the real defect is here: an out-of-range octet used to fall
  // through to the "public IPv4" return. Un-parseable must mean private, as the docblock says.
  if (m.slice(1).some((octet) => Number(octet) > 255)) return true;
  if (a === 0) return true;                              // 0.0.0.0/8
  if (a === 10) return true;                             // 10.0.0.0/8
  if (a === 127) return true;                            // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true;               // 169.254.0.0/16 link-local
  if (a === 172 && b >= 16 && b <= 31) return true;      // 172.16.0.0/12
  if (a === 192 && b === 168) return true;               // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true;     // 100.64.0.0/10 CGNAT
  if (a >= 224 && a <= 239) return true;                 // multicast
  if (a >= 240) return true;                             // reserved + broadcast
  return false;                                          // public IPv4
}
