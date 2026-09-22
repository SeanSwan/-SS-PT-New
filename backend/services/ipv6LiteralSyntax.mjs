/**
 * ipv6LiteralSyntax.mjs
 * =====================
 * IS THIS STRING AN IPv6 ADDRESS, AND WHAT DOES IT SAY? — syntax only, no policy.
 *
 * WHY THIS FILE EXISTS. Extracted from `addressClassification.mjs` on 2026-09-21, after
 * hostile-review round 9 finding 1, when validating the address and deciding whether it is
 * routable turned out to be two separate concerns that had been interleaved:
 *
 *   - **Syntax** (here): given a string, is it a legal IPv6 literal, and what bits does it
 *     denote? This is a pure function of the string, with no opinion about safety.
 *   - **Policy** (`addressClassification.mjs`): given a well-formed address, is it
 *     publicly routable? That is a judgement, and it is the one that must fail closed.
 *
 * Mixing them is what produced round 9's finding 1 — classification consulted the raw
 * spelling, so the answer depended on how the address was written rather than what it was.
 *
 * THE PROPERTY THIS MODULE EXISTS TO GUARANTEE. Two spellings of the same address must
 * behave identically. `2002:7f00::1` and `2002:7f00:0::1` are one address; before this
 * module they classified differently (public vs private), which is a bypass with extra
 * steps. Every function here works on the EXPANDED 8-group form, so representation cannot
 * reach the answer.
 */

/**
 * Split a literal into its part before the trailing dotted quad and the quad itself.
 *
 * WHY THIS IS A FUNCTION AND NOT A REGEX. `^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$` has a
 * greedy group 1, so it captures through the LAST colon. That is harmless on its own, but the
 * obvious follow-up — stripping that colon with `replace(/:$/, '')` — is WRONG for exactly one
 * spelling, and it is the spelling this module exists to handle:
 *
 *     `64:ff9b::8.8.8.8`  -> group 1 is `64:ff9b::`  -> stripping a colon yields `64:ff9b:`
 *                            and the `::` compression marker is GONE.
 *     `1:2:3:4:5:6:1.2.3.4` -> group 1 is `1:2:3:4:5:6:` -> stripping a colon is CORRECT.
 *
 * The strip is required in the second case and destructive in the first, and no single regex can
 * tell them apart. The rule that actually holds is: **a `::` must never be split.** So split the
 * head on the LAST colon, and when that colon is part of a `::`, keep both colons in the head and
 * let the `::` handling downstream see a marker that is still intact.
 *
 * Returns `null` when there is no trailing quad, so callers can distinguish "no dotted tail" from
 * "a dotted tail at index 0".
 */
function splitDottedTail(addr) {
  const dottedTail = addr.match(/^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (!dottedTail) return null;
  const head = dottedTail[1];
  // `head` ends in at least one colon. If it ends in TWO, the final pair is a `::` compression
  // that sits immediately before the quad (`64:ff9b::8.8.8.8`, `::8.8.8.8`) — keep both colons.
  // Otherwise the single colon is the group separator (`1:2:3:4:5:6:1.2.3.4`) — drop it, because
  // the quad is re-attached as its own two groups and the separator must not survive as a group.
  const endsWithDoubleColon = head.endsWith('::');
  return {
    head: endsWithDoubleColon ? head : head.slice(0, -1),
    quad: dottedTail[2],
  };
}

/**
 * The positive test: is this a *syntactically valid* IPv6 literal?
 *
 * IMPLEMENTED WITHOUT A DEPENDENCY, and deliberately strict: a full 8-group form, or a
 * `::`-compressed form, with a trailing dotted quad permitted only where RFC 4291 allows
 * one (as the final 32 bits). Anything else is NOT an address.
 *
 * WHY STRICTNESS IS THE WHOLE POINT. The previous validator checked only the first
 * colon-separated group and never looked at the rest, so `2606:not-an-ip` was accepted as
 * an address in `2000::/3` and classified PUBLIC. A string that is not an address cannot
 * be a publicly routable address; "we could not parse it" must not read as "it is fine".
 *
 * @param {string} addr an unbracketed IPv6 literal
 * @returns {boolean} true only if the string is a legal IPv6 address
 */
export function isValidIPv6(addr) {
  if (typeof addr !== 'string' || addr.length === 0) return false;

  // A trailing dotted quad is legal only as the LAST 32 bits (RFC 4291 §2.2). Split it off,
  // validate it as IPv4, and treat it as two groups for the group-count arithmetic below.
  let head = addr;
  let dottedGroups = 0;
  const dotted = splitDottedTail(addr);
  if (dotted) {
    const octets = dotted.quad.split('.');
    if (octets.length !== 4) return false;
    if (octets.some((o) => !/^\d{1,3}$/.test(o) || Number(o) > 255)) return false;
    head = dotted.head;
    dottedGroups = 2; // an IPv4 tail occupies two 16-bit groups
  } else if (addr.includes('.')) {
    return false; // a dotted part that is not a clean trailing quad
  }

  // A `::` compression may appear at most once.
  if (head.split('::').length > 2) return false; // more than one `::` is illegal

  const hasDoubleColon = head.includes('::');
  let groups;
  if (hasDoubleColon) {
    const [left, right] = head.split('::');
    const parse = (part) => (part === '' ? [] : part.split(':'));
    const l = parse(left);
    const r = parse(right);
    // A `::` must stand for AT LEAST one elided group.
    if (l.length + r.length + dottedGroups >= 8) return false;
    groups = [...l, ...r];
  } else {
    groups = head.split(':');
    // Without `::` the address must have exactly 8 groups (6 + a dotted tail's 2).
    if (groups.length + dottedGroups !== 8) return false;
  }

  // Every group must be 1-4 hex digits. This rejects an empty group, which is the ONLY way a
  // stray separator can survive to here — so the earlier `r[r.length-1] === '' && r.pop()`,
  // which silently discarded the evidence of an illegal trailing `:` (accepting `2606::1:`),
  // is not needed and must not come back. `2001:db8::` still parses: `split('::')` yields
  // `['2001:db8', '']`, and `parse('')` is `[]` by construction.
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/i.test(g))) return false;
  return groups.length + dottedGroups <= 8;
}

/**
 * Expand an IPv6 literal to its full 8-group hex form.
 *
 * WHY. Round 9 finding 1 showed that prefix parsing on the RAW string is representation-
 * dependent: `2002:7f00::1` and `2002:7f00:0::1` are the same address, but a regex anchored
 * on explicit groups matched only the second. Normalising first makes every downstream
 * extraction a function of the ADDRESS rather than of how it was spelled.
 *
 * Returns null if the input is not a valid literal, so a caller cannot silently parse a
 * malformed input. Callers that need to distinguish "not an address" from "an address that
 * embeds no IPv4" check `isValidIPv6` first; `null` remains unambiguous for both.
 *
 * @param {string} addr a valid, unbracketed IPv6 literal
 * @returns {string|null} 8 colon-separated 4-hex-digit groups, or null if invalid
 */
export function expandIPv6(addr) {
  if (!isValidIPv6(addr)) return null;

  let head = addr;
  let tailGroups = [];
  const dotted = splitDottedTail(addr);
  if (dotted) {
    // Same split as the validator: a `::` immediately before the quad keeps both colons, so the
    // compression marker survives to the fill-count arithmetic below. The old
    // `replace(/:$/, '')` here erased it, which is why `64:ff9b::8.8.8.8` expanded to eight
    // explicit groups with no elision at all — a different address from the one written.
    head = dotted.head;
    const [a, b, c, d] = dotted.quad.split('.').map(Number);
    tailGroups = [
      (((a << 8) | b) >>> 0).toString(16),
      (((c << 8) | d) >>> 0).toString(16),
    ];
  }

  let groups;
  if (head.includes('::')) {
    // `::ffff:127.0.0.1` splits left `''` / right `ffff`; `64:ff9b::8.8.8.8` splits left
    // `64:ff9b` / right `''`. The dotted tail is already peeled off into tailGroups.
    const [left, right] = head.split('::');
    const parse = (part) => (part === '' ? [] : part.split(':'));
    const l = parse(left);
    const r = parse(right);
    const fill = 8 - tailGroups.length - l.length - r.length;
    // A `::` must elide at least one group; more than 7 would mean it stands for everything and
    // the address is not 8 groups. `::` alone elides all 8 and is NOT expandable to a host
    // address — it is the unspecified address, and `isValidIPv6('::')` is true while this
    // returns null. That disagreement is deliberate and documented: syntax admits it, expansion
    // has no host to name. Callers that need to treat `::` specially must check for it.
    if (fill < 1 || fill > 7) return null;
    groups = [...l, ...Array(fill).fill('0'), ...r];
  } else {
    groups = head.split(':');
  }

  const all = [...groups, ...tailGroups];
  if (all.length !== 8) return null;
  return all.map((g) => g.padStart(4, '0').toLowerCase()).join(':');
}
