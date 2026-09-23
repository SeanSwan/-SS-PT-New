---
title: "Round 10 review packet — are the round-9 FIXES real? (adversarial pass)"
purpose: >
  Adjudicate the fixes that round 9 produced, at source level, with every artifact inlined. Round 9
  shipped a fix that did not work; this packet is built on the assumption that round 10's author is
  as capable of the same error as round 9's.
predecessor: Z:/HostileReviews/2026-09-21-212053-social-bridge-spotlight-round-9-astra-classifier.md
target_commit: 14833065a
repo: SS-PT
branch: creator-brains-engine-r2-20260915
built_utc: 2026-09-22T17:47:40.390Z
built_by: build-round10-packet.mjs
---

# Round 10 review packet — are the round-9 FIXES real?

## §0 — Read this first: the unusual thing about this round

Round 9 returned `DEFECTS-FOUND` — 0 critical / 0 high / 3 medium / 2 low, 5 unproven — and the
three medium findings were fixed. **Then one of the fixes turned out not to work.**

The finding-2 fix called `response.body.cancel()` to release the response body on the error path.
It throws:

```
Invalid state: ReadableStream is locked
```

because `getReader()` had already taken the lock, and an empty `catch` swallowed the throw. The fix
was written, reviewed, committed as `7a23939cf`, and described as complete — **and it did nothing.**
It was caught only because finding 3 forced settlement to be recorded *after* the await, which is a
different finding entirely.

**That is the defect class this round exists to hunt.** Not "is the code wrong", but: *does the
evidence supporting "the code is right" actually entail it?* Round 8 found it (R6-01), round 9 found
it in itself, and the loop keeps finding it, so assume it is here again.

**What you are being asked to do:** falsify the claims in §2. In particular, do not accept the
mutation records as proof — ask whether the recorded mutations are the ones that would *matter*,
and whether the assertions are written to catch them.

**Nothing below is cited by reference.** Every source, every test, every commit and both reviews are
embedded in full, each with its sha256 computed from the same bytes you are reading.

**What you can and cannot do.** You are read-only and shell-less: you **cannot execute** anything.
Do not attempt socket tests or mutation runs. Their absence is expected and is accounted for in §5.

---

## §1 — Remit

Adversarial pass. Your job is to **falsify** the claims below, not to endorse them. For each claim
return `CONFIRMED`, `FALSIFIED`, or `BLOCKED / unproven`, naming the line of source that supports
your verdict. A `CONFIRMED` must name what you read.

- **PART A — C1–C8: is each round-9 fix real?** A fix is real only if the *mechanism* is gone, not
  if the symptom is quiet. Round 9's own packet is the cautionary example.
- **PART B — the honesty audit.** Round 8 falsified two overclaiming comments; round 9 corrected
  them. Re-check every comment that asserts what the code does. **Comments are claims.** This
  includes the comments round 9 *added* while correcting round 8.
- **PART C — the mutation records.** Round 9 reports six mutations, all now detected, zero
  survivors. That is a strong claim about test quality and the highest-value thing to attack. Ask
  which mutation would *still* survive, and whether a surviving mutation could be invisible in a
  record that only contains the tidy outcome.
- **PART D — scope and verdict**, including whether any claim is *unfalsifiable as stated*.

**Grade in both directions.** Do not inflate a residual into a vulnerability; do not deflate one you
could not reach. If a claim's truth depends on a runtime fact you cannot measure, name the fact and
mark it `BLOCKED`, not `FALSIFIED`.

---

## §2 — PART A: the claims

| # | Claim | Decidable by reading? |
|---|---|---|
| **C1** | The classifier now fails closed STRUCTURALLY: every spelling of one address yields one classification, because validation happens before parsing and embedded IPv4 is decoded by BIT POSITION, not string shape | **yes, fully** |
| **C2** | The finding-2 fix uses the call that actually releases a LOCKED stream (`reader.cancel()`), not the one that throws (`body.cancel()`) | **yes, fully** |
| **C3** | That fix is load-bearing: reverting it makes a named test fail, and that test asserts release, not merely invocation | **yes** — the assertion is quoted in §3.6 |
| **C4** | Settlement is recorded AFTER the await, so the harness distinguishes "cancelled" from "cancellation attempted" | **yes, fully** |
| **C5** | Six mutations, all detected, zero survivors — and the three that initially SURVIVED are recorded rather than tidied | reading + the mutation record |
| **C6** | No existing security guard or test was removed to make these fixes land | **yes** — the commits are below, in full |
| **C7** | The source's own comments do not overclaim — including the comments added in round 9 while fixing round 8's overclaims | **yes, fully** |
| **C8** | Ban #50 is met by SPLITTING, not by trimming: no source file reaches 300 lines, and the extracted modules preserve import compatibility for their consumers | **yes, fully** |

### C5 note, stated up front

This is the claim most likely to be softer than it looks. "All six mutations detected" is a claim
about a *test suite's* sensitivity, and a mutation record can be fabricated as easily as written.
You cannot re-run them. What you *can* do is check that the recorded mutations target the mechanisms
the claims depend on, and that the assertion which goes RED is the right assertion.

**Three of the six initially SURVIVED** (M1, M2, M6), and each exposed a real gap in the author's
own tests — M6 most seriously: dropping the `2000::/3` allowlist made `4000::1`, `8000::1` and
`e000::1` classify PUBLIC with the suite still green. A record containing only successes would be
the thing to distrust. Judge whether the record is honest *and* whether honest is enough.

---

## §3 — The artifacts, inlined

### 3.1 The sources under review

#### `backend/services/ipv6LiteralSyntax.mjs`

sha256 `f562ae9dd43503a4c95d319c3ba327f9e42adb9a807e43ce122ba55e4e3f1846` · 137 lines

NEW in round 9. The syntax/policy split required by ban #50: `isValidIPv6` and `expandIPv6`. C1.

```mjs
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
  const dottedTail = addr.match(/^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dottedTail) {
    const octets = dottedTail[2].split('.');
    if (octets.length !== 4) return false;
    if (octets.some((o) => !/^\d{1,3}$/.test(o) || Number(o) > 255)) return false;
    // NOTE THE TRAILING COLON. `(.*:)` is greedy, so group 1 of `::ffff:127.0.0.1` is
    // `::ffff:` INCLUDING the separator colon. Leaving it on makes the group count wrong
    // for every mixed-form address (`1:2:3:4:5:6:1.2.3.4`, a legal address Node accepts,
    // was rejected as a result). Strip exactly that one colon.
    head = dottedTail[1].replace(/:$/, '');
    dottedGroups = 2; // an IPv4 tail occupies two 16-bit groups
  } else if (addr.includes('.')) {
    return false; // a dotted part that is not a clean trailing quad
  }

  // Strip exactly one leading/trailing colon pair from a `::` compression.
  const hasDoubleColon = head.includes('::');
  if (head.split('::').length > 2) return false; // more than one `::` is illegal

  let groups;
  if (hasDoubleColon) {
    const [left, right] = head.split('::');
    const parse = (part) => (part === '' ? [] : part.split(':'));
    const l = parse(left);
    const r = parse(right);
    if (r.length && r[r.length - 1] === '') r.pop(); // trailing colon of `::` handled by split
    // A `::` must stand for AT LEAST one elided group.
    if (l.length + r.length + dottedGroups >= 8) return false;
    groups = [...l, ...r];
  } else {
    groups = head.split(':');
    // Without `::` the address must have exactly 8 groups (6 + a dotted tail's 2).
    if (groups.length + dottedGroups !== 8) return false;
  }

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
  const dottedTail = addr.match(/^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (dottedTail) {
    // NOTE THE TRAILING COLON. `(.*:)` is greedy, so group 1 of `::ffff:127.0.0.1` is
    // `::ffff:` INCLUDING the separator colon. Leaving it on splits to a trailing empty
    // group, which silently added a phantom group and shifted every fill count — the
    // `::ffff:127.0.0.1` -> `...:ffff:0000:7f00:0001` bug. Strip it here, once.
    head = dottedTail[1].replace(/:$/, '');
    const [a, b, c, d] = dottedTail[2].split('.').map(Number);
    tailGroups = [
      (((a << 8) | b) >>> 0).toString(16),
      (((c << 8) | d) >>> 0).toString(16),
    ];
  }

  let groups;
  if (head.includes('::')) {
    // `::ffff:127.0.0.1` splits to left `::ffff` / right `127.0.0.1`, and the dotted tail
    // has ALREADY been peeled off into tailGroups — so the right side parses to [].
    const [left, right] = head.split('::');
    const parse = (part) => (part === '' ? [] : part.split(':'));
    const l = parse(left);
    const r = parse(right);
    const fill = 8 - tailGroups.length - l.length - r.length;
    if (fill < 1 || fill > 7) return null;
    groups = [...l, ...Array(fill).fill('0'), ...r];
  } else {
    groups = head.split(':');
  }

  const all = [...groups, ...tailGroups];
  if (all.length !== 8) return null;
  return all.map((g) => g.padStart(4, '0').toLowerCase()).join(':');
}
```

#### `backend/services/addressClassification.mjs`

sha256 `5596560edeaaa91d8253bf81b7a123c87a540d1fd15b04329f76acf1b0e9dec8` · 198 lines

The allowlist classifier. Round 9 inverted this from a denylist; C1 and C7 live here.

```mjs
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
 *   64:ff9b::/96    NAT64 well-known       last 32 bits (RFC 6052)
 *   64:ff9b:1::/48  NAT64 local-use        last 32 bits
 *   2002::/16       6to4                   bits 16-47 (RFC 3056)
 *
 * REWRITTEN AFTER ROUND 9 FINDING 1. The previous version pattern-matched raw spellings, so
 * a compressed zero group changed the answer. Working on the expanded form removes that class
 * of bug rather than adding another case to the list.
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

  // 6to4 — 2002::/16, IPv4 in bits 16-47 (groups 1 and 2).
  if (g[0] === 0x2002) return quad(g[1], g[2]);

  // NAT64 well-known (64:ff9b::/96) and local-use (64:ff9b:1::/48): last 32 bits.
  if (g[0] === 0x0064 && g[1] === 0xff9b) return quad(g[6], g[7]);

  // IPv4-mapped ::ffff:0:0/96 — groups 0-4 zero, group 5 is ffff. Last 32 bits.
  if (isZeroPrefix(5) && g[5] === 0xffff) return quad(g[6], g[7]);

  // IPv4-compatible ::/96 — groups 0-5 zero (and not :: or ::1, which are handled upstream).
  if (isZeroPrefix(6)) return quad(g[6], g[7]);

  return null;
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
 * `2000::/3` is the entire currently-assigned global unicast range (2000:: – 3fff:...).
 * Addresses outside it are special-purpose by definition.
 *
 * ROUND 9 FINDING 1: the syntax check is NOT optional and must come first. Validating only
 * the leading group admitted `2606:not-an-ip`. A string that is not an IPv6 address cannot
 * be a publicly routable one.
 *
 * @param {string} addr an unbracketed IPv6 literal
 * @returns {boolean} true only if the address is a legal address inside 2000::/3
 */
function isPubliclyRoutableIPv6(addr) {
  if (!isValidIPv6(addr)) return false;  // not an address => not a public address
  const [head] = addr.split(':');
  if (!/^[0-9a-f]{1,4}$/i.test(head)) return false;   // leading '::' — not global unicast
  const leading = parseInt(head, 16);
  // 2000::/3 — the first three bits are 001, so the first group is 0x2000-0x3fff.
  return leading >= 0x2000 && leading <= 0x3fff;
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
```

#### `backend/services/spotlightImageDecode.mjs`

sha256 `718a3432e1847a684b12c052992a37a6f4f738318a2e245f7bb386fbbdcc4428` · 98 lines

NEW in round 9 — extracted when the finding-2 comment pushed spotlightImageFetch.mjs to 300 lines. C8.

```mjs
/**
 * spotlightImageDecode.mjs
 * ========================
 * PROVE THE BYTES ARE AN IMAGE, THEN RE-ENCODE THEM.
 *
 * WHY THIS FILE EXISTS. Extracted from `spotlightImageFetch.mjs` on 2026-09-21, when the
 * round-9 finding-2 fix (releasing the body on the mid-read error path, which added the one
 * comment that pushed that file to exactly 300 lines) breached `06-bans.md` #50. The seam was
 * already there and is the honest one: everything left in `spotlightImageFetch.mjs` is about
 * TRANSPORT — admission, the pinned socket, the read caps. Nothing here touches the network.
 *
 * `decodeSpotlightImage` is RE-EXPORTED from `spotlightImageFetch.mjs`, so every existing
 * importer and its tests are untouched by the move. That matters: the extraction was forced by
 * a line limit, and a line limit is not a reason to change anyone's import.
 */

import sharp from 'sharp';
import { sniffFileType } from './photoStorageService.mjs';
// The error type lives with the URL policy; importing it here does NOT create a cycle, because
// `spotlightImageUrlPolicy.mjs` never imports this file. The dependency runs one way:
// policy -> decode -> fetch, with fetch re-exporting both.
import { SpotlightImageError } from './spotlightImageUrlPolicy.mjs';

/** Reject an image whose decoded pixel count exceeds this. */
export const MAX_IMAGE_PIXELS = 16_000_000;

/** Longest edge of the stored artefact, in pixels. */
export const MAX_STORED_EDGE = 1600;

/** Raster formats we will store. `sniffFileType` also recognises mp4/webm/avi/pdf. */
const RASTER_EXT = new Set(['jpg', 'png', 'gif', 'webp', 'heic']);

/**
 * Prove the bytes really are a single-frame raster image, then re-encode them.
 *
 * Three things happen here, and each is a control rather than a tidy-up:
 *   1. `sniffFileType` reads the magic bytes. The declared Content-Type is
 *      attacker-controlled and is not consulted. SVG is not in the signature table, so
 *      it is rejected here — an SVG served from our own R2 domain is stored XSS.
 *   2. `sharp` decodes it. A file that sniffs as PNG but does not decode is a polyglot,
 *      and this is where it dies. `limitInputPixels` makes the decode itself bounded.
 *   3. Re-encode. Strips EXIF (including GPS — this is a fitness app), normalises the
 *      stored artefact, and guarantees the bytes we serve are bytes we produced.
 *
 * @param {Buffer} buffer raw bytes from the network
 * @param {{maxPixels?: number, maxEdge?: number}} [opts]
 * @returns {Promise<{buffer: Buffer, contentType: string, ext: string}>}
 * @throws {SpotlightImageError}
 */
export async function decodeSpotlightImage(buffer, opts = {}) {
  const { maxPixels = MAX_IMAGE_PIXELS, maxEdge = MAX_STORED_EDGE } = opts;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new SpotlightImageError('IMAGE_EMPTY', 'no bytes to decode');
  }

  const sniffed = sniffFileType(buffer);
  if (!sniffed) {
    throw new SpotlightImageError('IMAGE_TYPE_REJECTED', 'bytes match no accepted image signature');
  }
  if (!RASTER_EXT.has(sniffed.ext)) {
    // sniffFileType also recognises mp4/webm/avi/pdf — valid uploads elsewhere, not here.
    throw new SpotlightImageError('IMAGE_TYPE_REJECTED', `not a raster image: ${sniffed.ext}`);
  }

  let metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: maxPixels }).metadata();
  } catch (err) {
    throw new SpotlightImageError('IMAGE_DECODE_FAILED', err.message);
  }

  if (!metadata?.width || !metadata?.height) {
    throw new SpotlightImageError('IMAGE_DECODE_FAILED', 'no dimensions');
  }
  if (metadata.width * metadata.height > maxPixels) {
    throw new SpotlightImageError('IMAGE_TOO_LARGE', `${metadata.width}x${metadata.height} exceeds ${maxPixels} px`);
  }
  // An animated image is a frame budget, not an image. `pages` is 1 for stills.
  if (Number(metadata.pages) > 1) {
    throw new SpotlightImageError('IMAGE_ANIMATION_REJECTED', `${metadata.pages} frames`);
  }

  // Preserve alpha by choosing PNG; otherwise JPEG, which is far smaller for photographs.
  const pipeline = sharp(buffer, { limitInputPixels: maxPixels })
    .rotate() // bake EXIF orientation in before the metadata that carries it is dropped
    .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true });

  const keepAlpha = Boolean(metadata.hasAlpha);
  const outBuffer = keepAlpha
    ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
    : await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();

  return {
    buffer: outBuffer,
    contentType: keepAlpha ? 'image/png' : 'image/jpeg',
    ext: keepAlpha ? 'png' : 'jpg',
  };
}
```

#### `backend/services/spotlightImageFetch.mjs`

sha256 `4937b63cb7a4bd3f243bc9b64ebe958805dd0c4b3bf5da96cc024a2a7c371086` · 236 lines

The finding-2 fix — `reader.cancel()`, not `body.cancel()`. C2, C3, C4.

```mjs
/**
 * spotlightImageFetch.mjs
 * =======================
 * SSRF-hardened fetch + decode for the SwanGuard → SwanStudios Spotlight image.
 *
 * WHY THIS EXISTS. `rehostImage()` in routes/bridge/bridgeIngestRoutes.mjs used to
 * validate the URL by checking the protocol and calling fetch with defaults. That
 * check constrains the URL you PASS, not the URL you CONNECT to: `fetch` follows
 * redirects by default, so any host returning `302 → http://169.254.169.254/...`
 * defeated it. The 8 MiB cap was also applied AFTER `arrayBuffer()` had buffered the
 * whole response, so it bounded what was STORED, not what was CONSUMED.
 *
 * THE PRECEDENT. `applaudAudioFetcher.mjs` already solves this threat model for the
 * PLAUD audio path (Codex CR-4: exact host, HTTPS, no credentials, DNS-resolved
 * private-IP rejection, `redirect:'error'`, streamed caps). This module reuses its
 * `isPrivateOrLocalAddress` rather than growing a second, drifting copy — two copies
 * of a private-range table is the failure mode, not the fix.
 *
 * WHAT IS DELIBERATELY DIFFERENT FROM THE AUDIO PRECEDENT. The audio path can demand
 * an EXACT hostname match because it only ever fetches one vendor. A Spotlight image
 * URL is chosen by the curator in SwanGuard and points at an arbitrary publisher, so
 * an exact-host allowlist is not available. The controls below are therefore the ones
 * that survive an arbitrary host: HTTPS, no credentials, DNS-resolved private-range
 * rejection, no redirect following, a streamed byte cap, byte-sniffed type, and a
 * re-encode that strips metadata and normalises the stored artefact.
 *
 * FAILURE IS ALWAYS NON-FATAL TO THE CALLER. Every export returns a result object or
 * throws SpotlightImageError; the caller maps any failure to `imageUrl = null`. A
 * dropped Spotlight is worse than an imageless one (blueprint ban #4).
 */
import logger from '../utils/logger.mjs';
import {
  SpotlightImageError,
  DNS_LOOKUP_TIMEOUT_MS,
  validateSpotlightImageUrl,
  resolveAndValidate,
  createPinnedDispatcher,
} from './spotlightImageUrlPolicy.mjs';
import { decodeSpotlightImage, MAX_IMAGE_PIXELS, MAX_STORED_EDGE } from './spotlightImageDecode.mjs';

// RE-EXPORTED, so every existing importer keeps working after the extractions. Both splits were
// forced by `06-bans.md` #50 ("no source file reaches 300 lines"), not by design: URL admission
// lives in `spotlightImageUrlPolicy.mjs`, the byte-level decode in `spotlightImageDecode.mjs`,
// and TRANSPORT — the pinned socket and the read caps — is what remains here.
export { SpotlightImageError, DNS_LOOKUP_TIMEOUT_MS, validateSpotlightImageUrl };
export { decodeSpotlightImage, MAX_IMAGE_PIXELS, MAX_STORED_EDGE };

/** 5 MiB compressed input — the ceiling on what we will read off the wire. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Total budget for connect + headers + body. */
export const IMAGE_FETCH_TIMEOUT_MS = 5_000;

/**
 * Fetch an image with `redirect: 'error'`, a pinned connect, and a streamed byte cap.
 * Returns { ok: true, bytes, contentType } or { ok: false, code, message } — never throws.
 */
export async function fetchSpotlightImage(rawUrl, opts = {}) {
  const {
    maxBytes = MAX_IMAGE_BYTES,
    timeoutMs = IMAGE_FETCH_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
    // Injectable so a test can OBSERVE the dispatcher's lifetime rather than infer it. The
    // D1 defect (hostile review round 8) was an ordering bug — the pool was closed before
    // the body was settled — and ordering is only visible to a caller that holds the object.
    // Defaults to the real factory, so every production caller is unaffected.
    dispatcherFactory = createPinnedDispatcher,
  } = opts;

  // Admission returns the addresses it approved, not merely a verdict. Passing a bare URL onward
  // would let the transport resolve the name a second time — the TOCTOU this pin exists to close.
  let url;
  let addrs;
  try {
    ({ url, addrs } = await resolveAndValidate(rawUrl));
  } catch (err) {
    return { ok: false, code: err.code || 'IMAGE_URL_INVALID', message: err.message };
  }

  // The socket may only go where the check looked.
  let dispatcher;
  try {
    dispatcher = dispatcherFactory(addrs);
  } catch (err) {
    return { ok: false, code: err.code || 'IMAGE_URL_INVALID', message: err.message };
  }

  // THE AGENT IS A LIVE SOCKET POOL, AND ITS LIFETIME IS THE WHOLE OPERATION — NOT JUST THE HEADERS.
  //
  // WHAT WAS WRONG (hostile review round 8, D1 — graded HIGH). This used to be a `finally` that
  // awaited `dispatcher.close()` the moment `fetch()` returned, i.e. as soon as the RESPONSE HEADERS
  // had arrived. But `fetch()` resolves while the BODY may still be streaming, and every path below
  // — the 4xx/5xx cancel, the declared-size cancel, the streamed read — was therefore reached only
  // AFTER the pool had been asked to shut down. `close()` drains idle sockets "once in-flight
  // requests settle", and a body still being read IS an in-flight request, so the order made the
  // shutdown wait on the very body this function was about to cancel. Wrong by construction:
  // settlement first, then closure.
  //
  // WHAT REPLACES IT. The close now happens in the `finally` of a block that wraps the ENTIRE
  // fetch-and-body operation, and the body is settled explicitly on every path (`settleBody`)
  // before that `finally` runs. So the pool closes over a body that has already been consumed,
  // cancelled, or abandoned by an aborted signal.
  const closeDispatcher = async () => {
    try { await dispatcher.close(); } catch { /* close is best-effort */ }
  };

  let response;
  try {
    try {
      response = await fetchImpl(url.toString(), {
        method: 'GET',
        // THE FIRST-HOP FIX. Following a redirect re-enters the network with a URL that was never
        // validated — the protocol/host/DNS checks above only ever saw the first hop.
        redirect: 'error',
        // THE CONNECT FIX. The agent answers `connect.lookup` from the validated addresses, so the
        // name is not resolved a second time and cannot flip to a private address between the check
        // and the socket. `redirect: 'error'` above is what keeps the connected host the validated
        // host — together they mean there is no unvalidated hop (DNS-rebinding TOCTOU, closed).
        dispatcher,
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: 'image/*' },
      });
    } catch (err) {
      const msg = err?.message || '';
      if (err?.code === 'UND_ERR_RES_EXCEEDED_MAX_REDIRECTS' || /redirect/i.test(msg)) {
        return { ok: false, code: 'IMAGE_URL_REDIRECT_REJECTED', message: msg || 'redirect rejected' };
      }
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError' || /timeout|aborted/i.test(msg)) {
        return { ok: false, code: 'IMAGE_FETCH_TIMEOUT', message: 'image fetch timed out' };
      }
      return { ok: false, code: 'IMAGE_FETCH_FAILED', message: msg || 'image fetch failed' };
    }

    return await readImageBody(response, { maxBytes });
  } finally {
    // Runs after `readImageBody` has settled the body on every path — consumed, cancelled, or
    // aborted. This is the ordering the old code had backwards.
    await closeDispatcher();
  }
}

/**
 * Turn an already-headed response into bytes, settling its body before this returns.
 *
 * Split out of `fetchSpotlightImage` so the dispatcher's `finally` can wrap this whole unit: the
 * pool must not be closed while a body is still being read (hostile review round 8, D1).
 * Every exit path either consumes the stream to completion or cancels it, and `cancel` on an
 * already-errored stream is itself best-effort.
 *
 * @param {Response} response
 * @param {{ maxBytes: number }} opts
 * @returns {Promise<{ ok: true, bytes: Buffer, contentType: string } | { ok: false, code: string, message: string }>}
 */
async function readImageBody(response, { maxBytes }) {
  if (!response.ok) {
    // RELEASE THE SOCKET. Returning here without draining or cancelling leaves the response body
    // open until GC, so an upstream that answers 4xx/5xx with a large body holds one connection
    // per request for an unbounded time (hostile review D8 / R2-03).
    try { await response.body?.cancel('upstream not ok'); } catch { /* release is best-effort */ }
    return { ok: false, code: 'IMAGE_FETCH_FAILED', message: `upstream returned ${response.status}` };
  }

  // Optional early exit. The streamed cap below is the authoritative gate, because a
  // declared Content-Length is a claim, not a fact.
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    // Same release as above: an over-cap declaration is a reason to stop reading, and stopping
    // means cancelling the stream rather than walking away from an open one.
    try { await response.body?.cancel('declared length over cap'); } catch { /* release is best-effort */ }
    return { ok: false, code: 'IMAGE_TOO_LARGE', message: `Content-Length ${declared} > cap ${maxBytes}` };
  }

  if (!response.body) {
    return { ok: false, code: 'IMAGE_FETCH_FAILED', message: 'response has no body' };
  }

  const chunks = [];
  let total = 0;
  // Declared OUTSIDE the try so the catch can reach it. The correct release for a stream that
  // threw mid-read is the READER's cancel, not the body's — see the catch.
  let reader;
  try {
    reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      total += chunk.length;
      // Cap enforced WHILE reading. The previous code buffered the entire body with
      // arrayBuffer() and only then compared its length — so a multi-gigabyte response
      // was fully materialised before being rejected.
      if (total > maxBytes) {
        try { await reader.cancel('size cap exceeded'); } catch { /* release is best-effort */ }
        return { ok: false, code: 'IMAGE_TOO_LARGE', message: `streamed ${total} bytes > cap ${maxBytes}` };
      }
      chunks.push(chunk);
    }
  } catch (err) {
    // RELEASE THE READER, NOT THE BODY (hostile review round 9, finding 2 — corrected).
    //
    // The first version of this fix called `response.body.cancel(...)`. It looked right and it
    // NEVER WORKED: once `getReader()` has been called the body is LOCKED, so `body.cancel()`
    // throws `Invalid state: ReadableStream is locked` and the empty catch swallowed it. The
    // socket stayed open, and — worse — the empty catch made the release look handled. A test
    // that recorded "cancel was attempted" passed; only recording "cancel SETTLED" exposed it.
    //
    // `reader.cancel()` is the call that actually releases a locked stream, and `reader` is in
    // scope here because it is declared outside the try. This also matches the over-cap path
    // above, which cancels through the reader for the same reason.
    try { await reader?.cancel('stream read failed'); } catch { /* release is best-effort */ }
    return { ok: false, code: 'IMAGE_FETCH_FAILED', message: `stream read failed: ${err.message}` };
  }

  return {
    ok: true,
    bytes: Buffer.concat(chunks),
    contentType: response.headers.get('content-type') || 'application/octet-stream',
  };
}


/**
 * One call for the route: validate → fetch → decode.
 * Any failure is a value, never an exception, so the ingest path cannot be broken by an image.
 */
export async function fetchAndDecodeSpotlightImage(rawUrl, opts = {}) {
  const fetched = await fetchSpotlightImage(rawUrl, opts);
  if (!fetched.ok) return fetched;

  try {
    const decoded = await decodeSpotlightImage(fetched.bytes, opts);
    return { ok: true, ...decoded, sourceContentType: fetched.contentType };
  } catch (err) {
    if (err instanceof SpotlightImageError) return { ok: false, code: err.code, message: err.message };
    logger.warn(`Spotlight image decode failed unexpectedly: ${err.message}`);
    return { ok: false, code: 'IMAGE_DECODE_FAILED', message: err.message };
  }
}
```

#### `backend/services/applaudAudioFetcher.mjs`

sha256 `db112664465854a42e4010b6e54db084ccaf6d65882e5e90d1ff00dd3df5f5f6` · 295 lines

The SHARED consumer. Its own suite is the regression gate for the extraction. C8.

```mjs
/**
 * applaudAudioFetcher.mjs
 * ========================
 * URL allowlist validation + bounded HTTP fetch for Applaud-served audio.
 *
 * Phase 5 Slice 5.3 (2026-05-04). Plan: PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md §3.3 V1.4 + §4.2 step 8 + §5.2.
 *
 * Codex CR-4 requirements (no compromises):
 *   1. Parse via `new URL()` — reject on parse fail
 *   2. EXACT hostname match against allowed base — no prefix/suffix/wildcard
 *   3. EXACT port match
 *   4. HTTPS-only (`https:`)
 *   5. No credentials in URL (reject `https://allowed@evil.com`)
 *   6. DNS resolution — reject if ANY resolved address is private/loopback/
 *      link-local/multicast (defeats DNS rebinding)
 *   7. `redirect: 'error'` on fetch — no redirect-following
 *   8. Content-Length cap (declared) + streamed-bytes cap (in case header lies)
 *   9. 30-second fetch timeout
 *
 * Public API:
 *   validateAudioUrl(rawUrl, allowedBaseUrl) -> URL | throws AudioUrlError
 *   fetchAudioWithCaps(audioUrl, declaredSizeBytes, opts) -> {ok, bytes, mimetype} | {error, errorCode, errorStatus, message}
 *   isPrivateOrLocalAddress(ip) -> bool   (exported for tests)
 *
 * Error classes:
 *   AudioUrlError(code) — URL validation failures
 *   AudioFetchError(code, status) — HTTP fetch failures
 */
import { promises as dns } from 'node:dns';
// Imported for local use at line ~114 (the resolved-address rejection in `validateAudioUrl`)
// AND re-exported at the foot of this file. A bare `export ... from` would not bind the name
// in this module's scope, so a caller here would silently reference nothing.
import { isPrivateOrLocalAddress } from './addressClassification.mjs';

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024; // 25 MB — matches PLAUD_MAX_FILE_BYTES
const DEFAULT_TIMEOUT_MS = 30_000;          // 30s per §5.2

export class AudioUrlError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'AudioUrlError';
    this.code = code;
  }
}

export class AudioFetchError extends Error {
  constructor(code, status, message) {
    super(message || code);
    this.name = 'AudioFetchError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Validate `rawUrl` against `allowedBaseUrl`. Throws AudioUrlError on any
 * violation; returns the parsed URL on success.
 *
 * Codex CR-4: "exact match, HTTPS, no creds, DNS-resolved private-IP rejection".
 * Q2 (regex vs exact) is CLOSED — exact only. No wildcards, no patterns.
 */
export async function validateAudioUrl(rawUrl, allowedBaseUrl) {
  if (!allowedBaseUrl || typeof allowedBaseUrl !== 'string') {
    // §13.2 startup validation should prevent this in production, but
    // fail-closed at runtime as defense in depth.
    throw new AudioUrlError('AUDIO_URL_ALLOWLIST_UNCONFIGURED');
  }

  let incoming;
  try {
    incoming = new URL(rawUrl);
  } catch {
    throw new AudioUrlError('AUDIO_URL_MALFORMED');
  }

  let allowed;
  try {
    allowed = new URL(allowedBaseUrl);
  } catch {
    throw new AudioUrlError('AUDIO_URL_ALLOWLIST_UNCONFIGURED');
  }

  // 1. HTTPS only — defeats `http://allowed.com`, `gopher://`, `file://`, `data:`
  if (incoming.protocol !== 'https:') {
    throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', 'protocol must be https');
  }

  // 2. No credentials in URL — defeats `https://allowed@evil.com` where
  //    Node's URL parser puts evil.com in hostname but URLs with @ embed
  //    credentials before the authority.
  if (incoming.username || incoming.password) {
    throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', 'credentials in URL not allowed');
  }

  // 3. EXACT hostname match (Codex CR-4 — no prefix/suffix tricks)
  if (incoming.hostname !== allowed.hostname) {
    throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', `hostname ${incoming.hostname} != allowed ${allowed.hostname}`);
  }

  // 4. EXACT port match. Empty port string == default for protocol;
  //    URL.port is '' when default, so empty == empty matches.
  if (incoming.port !== allowed.port) {
    throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', `port ${incoming.port || '(default)'} != allowed ${allowed.port || '(default)'}`);
  }

  // 5. DNS resolution check — every address the name resolves to is checked before the
  //    fetch is allowed to proceed.
  //
  //    HONEST SCOPE (hostile review round 9, C8). An earlier version of this comment said
  //    this "defeats DNS rebinding". It does not, on its own, and the difference matters.
  //    This checks the result of ONE `dns.lookup`, then `fetchAudioWithCaps` below fetches
  //    by HOSTNAME — which performs its OWN lookup. Between the two, a name whose TTL has
  //    expired (or an attacker's resolver answering differently) can return a public address
  //    here and a private one there. That is the TOCTOU window, and it is still open on this
  //    path.
  //
  //    It is closed on the IMAGE path, which is the one that fetches user-supplied URLs:
  //    `spotlightImageUrlPolicy.mjs` resolves once and hands a PINNED dispatcher (an
  //    `undici.Agent` whose `connect.lookup` answers only from the pre-validated addresses)
  //    to the request, so the socket cannot go anywhere the check did not see.
  //
  //    So: this is a real check and it stops the common case, but it is not a rebinding
  //    defence and should not be described as one until an equivalent pin is wired here.
  let addrs;
  try {
    addrs = await dns.lookup(incoming.hostname, { all: true });
  } catch (err) {
    throw new AudioUrlError('AUDIO_URL_DNS_FAILED', `DNS lookup failed: ${err.message}`);
  }
  if (!Array.isArray(addrs) || addrs.length === 0) {
    throw new AudioUrlError('AUDIO_URL_DNS_FAILED', 'DNS lookup returned no addresses');
  }
  for (const { address } of addrs) {
    if (isPrivateOrLocalAddress(address)) {
      throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', `host resolves to private/local address ${address}`);
    }
  }

  return incoming;
}

/**
 * Fetch audio bytes with timeout, content-length cap, streamed-bytes cap,
 * and redirect: 'error' (no redirect following — defeats SSRF redirect chains).
 *
 * Returns {ok: true, bytes, mimetype} on success.
 * Returns {error: true, errorCode, errorStatus, message} on any failure
 * — never throws (controller composes it into a JSON error response).
 */
export async function fetchAudioWithCaps(audioUrl, declaredSizeBytes, opts = {}) {
  const {
    allowedBaseUrl = process.env.PLAUD_APPLAUD_MEDIA_BASE_URL,
    maxBytes = DEFAULT_MAX_BYTES,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
  } = opts;

  // Pre-validate URL
  let validatedUrl;
  try {
    validatedUrl = await validateAudioUrl(audioUrl, allowedBaseUrl);
  } catch (err) {
    if (err instanceof AudioUrlError) {
      const status = err.code === 'AUDIO_URL_ALLOWLIST_UNCONFIGURED'
        || err.code === 'AUDIO_URL_DNS_FAILED'
        ? 500
        : 400;
      return { error: true, errorCode: err.code, errorStatus: status, message: err.message };
    }
    return { error: true, errorCode: 'AUDIO_URL_VALIDATION_INTERNAL', errorStatus: 500, message: err.message };
  }

  // Pre-check declared Content-Length (saves a fetch round-trip on obvious bigs)
  const declared = Number(declaredSizeBytes);
  if (Number.isFinite(declared) && declared > maxBytes) {
    return {
      error: true,
      errorCode: 'AUDIO_TOO_LARGE',
      errorStatus: 413,
      message: `declared size ${declared} > cap ${maxBytes}`,
    };
  }

  // Issue the fetch with redirect:'error' + timeout
  let response;
  try {
    response = await fetchImpl(validatedUrl.toString(), {
      method: 'GET',
      redirect: 'error',                          // CR-4: no redirect chains
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    // Node's fetch throws on redirect when redirect:'error' is set
    if (err && (err.code === 'UND_ERR_RES_EXCEEDED_MAX_REDIRECTS'
        || err.code === 'UND_ERR_REDIRECT'
        || /redirect/i.test(err.message || ''))) {
      return {
        error: true,
        errorCode: 'AUDIO_URL_REDIRECT_REJECTED',
        errorStatus: 400,
        message: err.message || 'redirect rejected',
      };
    }
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError'
        || /timeout|aborted/i.test(err.message || ''))) {
      return {
        error: true,
        errorCode: 'AUDIO_FETCH_TIMEOUT',
        errorStatus: 500,
        message: 'audio fetch timed out',
      };
    }
    return {
      error: true,
      errorCode: 'AUDIO_FETCH_FAILED',
      errorStatus: 500,
      message: err.message || 'audio fetch failed',
    };
  }

  if (!response.ok) {
    return {
      error: true,
      errorCode: 'AUDIO_FETCH_FAILED',
      errorStatus: 500,
      message: `upstream returned ${response.status}`,
    };
  }

  // Content-Length header check — abort before streaming if too big.
  // This is OPTIONAL because Applaud may not set it; the streamed cap
  // below is the authoritative gate.
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return {
      error: true,
      errorCode: 'AUDIO_TOO_LARGE',
      errorStatus: 413,
      message: `Content-Length ${contentLength} > cap ${maxBytes}`,
    };
  }

  // Streamed read with size cap. Aborts mid-stream if cumulative bytes
  // exceed cap — defeats lying Content-Length headers.
  const chunks = [];
  let totalBytes = 0;
  try {
    if (!response.body) {
      return {
        error: true,
        errorCode: 'AUDIO_FETCH_FAILED',
        errorStatus: 500,
        message: 'response has no body',
      };
    }
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        // Cancel the upstream stream to release the socket
        try { await reader.cancel('size cap exceeded'); } catch { /* ignore */ }
        return {
          error: true,
          errorCode: 'AUDIO_TOO_LARGE',
          errorStatus: 413,
          message: `streamed bytes ${totalBytes} > cap ${maxBytes}`,
        };
      }
      chunks.push(chunk);
    }
  } catch (err) {
    return {
      error: true,
      errorCode: 'AUDIO_FETCH_FAILED',
      errorStatus: 500,
      message: `stream read failed: ${err.message}`,
    };
  }

  return {
    ok: true,
    bytes: Buffer.concat(chunks),
    mimetype: response.headers.get('content-type') || 'application/octet-stream',
  };
}


// THE ADDRESS CLASSIFIER LIVES IN ITS OWN MODULE (2026-09-21). It was extracted to
// `addressClassification.mjs` because this file had already breached `06-bans.md` #50
// (322 lines at HEAD) and round 8's D2/D4 fix added more. Re-exported here so every
// existing importer — including `tests/unit/plaudSlice53AudioFetcher.test.mjs`, which
// imports the name from THIS module — keeps working unchanged.
export { isPrivateOrLocalAddress } from './addressClassification.mjs';
```

#### `backend/services/spotlightImageUrlPolicy.mjs`

sha256 `9eeb2470c863d96b2ddfecf63ce462a40d8dcde5204ac859b2c6634ef134353e` · 241 lines

The pinned lookup/dispatcher factories the transport tests exercise. C2, C5.

```mjs
/**
 * spotlightImageUrlPolicy.mjs
 * ===========================
 * URL ADMISSION for the SwanGuard → SwanStudios Spotlight image path.
 *
 * WHY THIS FILE EXISTS. Split out of `spotlightImageFetch.mjs` on 2026-09-20, when the D8 / R2-03
 * hardening (a bounded DNS lookup) pushed that file to 320 lines against `06-bans.md` #50 — "no
 * source file reaches 300 lines". The seam is **admission vs transport**: this module decides
 * whether a URL may be fetched at all; `spotlightImageFetch.mjs` performs the fetch and the decode.
 * Both exports are re-exported from `spotlightImageFetch.mjs`, so no existing importer changed.
 *
 * WHAT IS DELIBERATELY DIFFERENT FROM THE PLAUD AUDIO PRECEDENT. `applaudAudioFetcher.mjs` can
 * demand an EXACT hostname match because it only ever fetches one vendor. A Spotlight image URL is
 * chosen by the curator in SwanGuard and points at an arbitrary publisher, so an exact-host
 * allowlist is not available. The controls here are therefore the ones that survive an arbitrary
 * host: HTTPS only, no embedded credentials, and DNS-resolved private-range rejection that fails
 * closed and checks EVERY resolved address rather than the first.
 *
 * The private-range table is IMPORTED, never re-implemented — two copies of that table is the
 * failure mode, not the fix.
 *
 * THE PREFIX PIN (2026-09-21). The first version of this module resolved, validated, and then
 * THREW THE ADDRESSES AWAY — so the later `fetch()` re-resolved the same name independently and a
 * name that flipped between the two lookups reached a private address anyway (DNS-rebinding TOCTOU).
 * `resolveAndValidate` now RETURNS the validated addresses, and `createPinnedDispatcher` turns them
 * into an `undici.Agent` whose `connect.lookup` answers from that fixed set. The socket can only go
 * where the check looked. See the pin note further down for the honest residual.
 */
import { promises as dns } from 'node:dns';
import net from 'node:net';
import { Agent } from 'undici';
import { isPrivateOrLocalAddress } from './applaudAudioFetcher.mjs';

export class SpotlightImageError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = 'SpotlightImageError';
    this.code = code;
  }
}

/**
 * Budget for the pre-flight DNS lookup, SEPARATE from `IMAGE_FETCH_TIMEOUT_MS` in the fetch module.
 *
 * The fetch timeout is created as part of the `fetch()` call, and the lookup happens BEFORE that
 * call — so resolver time sat entirely outside the budget it appeared to bound. A host with a slow
 * or hanging resolver held the request open indefinitely (hostile review D8 / R2-03). Bounded here
 * instead, with its own code so "the resolver hung" is distinguishable from "the name does not
 * resolve".
 */
export const DNS_LOOKUP_TIMEOUT_MS = 3_000;

/**
 * `dns.lookup` accepts no AbortSignal, so the lookup is bounded by racing it against a timer.
 * The timer is cleared in `finally`, so a fast lookup leaves no pending handle behind — and a
 * timer that outlived its race would keep the process alive for no reason.
 *
 * WHAT THE BOUND DOES AND DOES NOT DO (hostile review round 8, C10 item 3; re-measured round 9).
 * It bounds the CALLER'S WAIT. It does NOT stop the resolver. `dns.promises.lookup(hostname,
 * options)` takes no signal and returns a bare Promise — verified on this host: the signature is
 * `function lookup(hostname, options)`, and it mentions no `AbortSignal`. `Promise.race` therefore
 * releases this function while the underlying libuv threadpool lookup is still outstanding, and a
 * lookup that never answers can hold a threadpool slot (default size 4) past this call's return.
 *
 * HONEST LIMIT ON THAT CLAIM. The source-level fact is decided above. The RUNTIME consequence —
 * that a hung lookup measurably starves the pool — was NOT reproduced here: every probe name on
 * this host resolved or failed within ~58ms, so no lookup could be kept pending long enough to
 * measure. The claim is CONFIRMED as a source fact and UNPROVEN as a measured impact, and is
 * recorded that way rather than inflated. No cancellation is implemented, because none can be
 * added additively: `dns.resolve*` is a different operation (no `/etc/hosts`, no OS resolver) and
 * the callback form would change the shape callers depend on.
 */
const lookupWithTimeout = async (hostname, ms) => {
  let timer;
  try {
    return await Promise.race([
      dns.lookup(hostname, { all: true }),
      new Promise((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new SpotlightImageError('IMAGE_URL_DNS_TIMEOUT', `DNS lookup exceeded ${ms}ms`)),
          ms
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Validate a curator-supplied image URL.
 * HTTPS only; no embedded credentials; every resolved address must be publicly routable.
 *
 * `dnsTimeoutMs` is injectable so the bound can be tested without waiting the real budget out.
 * It defaults to the production value, so every existing caller is unaffected.
 *
 * @param {string} rawUrl
 * @param {{ dnsTimeoutMs?: number }} [opts]
 * @returns {Promise<URL>} the parsed URL
 * @throws {SpotlightImageError}
 */
export async function validateSpotlightImageUrl(rawUrl, opts) {
  const { url } = await resolveAndValidate(rawUrl, opts);
  return url;
}

/**
 * The full admission result: the parsed URL AND the addresses it was admitted on.
 *
 * This exists as a separate export because the two facts travel together — a caller that validates
 * but does not pin has only a check, not a control. `validateSpotlightImageUrl` is kept as the
 * URL-only front door so the twelve existing call sites and the re-export in
 * `spotlightImageFetch.mjs` are untouched; the fetch path calls THIS one.
 *
 * @param {string} rawUrl
 * @param {{ dnsTimeoutMs?: number }} [opts]
 * @returns {Promise<{ url: URL, addrs: Array<{ address: string, family: number }> }>}
 * @throws {SpotlightImageError}
 */
export async function resolveAndValidate(rawUrl, { dnsTimeoutMs = DNS_LOOKUP_TIMEOUT_MS } = {}) {
  let incoming;
  try {
    incoming = new URL(String(rawUrl));
  } catch {
    throw new SpotlightImageError('IMAGE_URL_MALFORMED', 'not a parseable URL');
  }

  // HTTPS only. `http:` was previously accepted, which allowed plaintext internal probes.
  if (incoming.protocol !== 'https:') {
    throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', `protocol must be https, got ${incoming.protocol}`);
  }

  // `https://allowed@evil.com` — the userinfo section is not part of the host, so a
  // check that only inspects hostname would read this as evil.com with credentials.
  if (incoming.username || incoming.password) {
    throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', 'credentials in URL not allowed');
  }

  // An IP-literal host (`https://10.0.0.1/`) has no name to resolve, and `dns.lookup` on a literal
  // returns the literal — so it is validated here directly and pinned as itself. Without this the
  // literal case would take the lookup path and depend on resolver behaviour for a value that was
  // never a name.
  //
  // STRIP THE BRACKETS FIRST (hostile review round 8, D4). `URL.hostname` KEEPS the brackets on an
  // IPv6 authority — `new URL('https://[::1]/').hostname === '[::1]'` — and `net.isIP('[::1]')` is
  // **0**, so every IPv6 literal used to fall past this branch and take the DNS path. That was not
  // harmless: `dns.lookup` normalises the address, and the classifier below only recognised the
  // DOTTED IPv4-mapped form, so `https://[::ffff:0:127.0.0.1]/` — a loopback literal — was
  // ADMITTED and pinned as `::ffff:0:7f00:1`. The classifier's fail-closed inversion closes that
  // too; this stripping is the second half, so a literal is classified AS a literal rather than
  // depending on how a resolver happens to normalise it.
  const hostname = incoming.hostname.startsWith('[') && incoming.hostname.endsWith(']')
    ? incoming.hostname.slice(1, -1)
    : incoming.hostname;
  const literalFamily = net.isIP(hostname);
  if (literalFamily) {
    if (isPrivateOrLocalAddress(hostname)) {
      throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', `host is a private/local address ${hostname}`);
    }
    return { url: incoming, addrs: [{ address: hostname, family: literalFamily }] };
  }

  // Resolve first, then reject. A name that resolves to 127.0.0.1 / 169.254.169.254 / 10.x
  // is refused before any socket is opened, which closes direct internal targeting.
  let addrs;
  try {
    addrs = await lookupWithTimeout(incoming.hostname, dnsTimeoutMs);
  } catch (err) {
    // A timeout keeps its own code: "the resolver hung" and "the name does not resolve" are
    // different operational facts, and collapsing them would hide a hanging resolver.
    if (err?.code === 'IMAGE_URL_DNS_TIMEOUT') throw err;
    throw new SpotlightImageError('IMAGE_URL_DNS_FAILED', `DNS lookup failed: ${err.message}`);
  }
  if (!Array.isArray(addrs) || addrs.length === 0) {
    throw new SpotlightImageError('IMAGE_URL_DNS_FAILED', 'DNS lookup returned no addresses');
  }
  for (const { address } of addrs) {
    if (isPrivateOrLocalAddress(address)) {
      throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', `host resolves to private/local address ${address}`);
    }
  }

  return { url: incoming, addrs };
}

/**
 * The `connect.lookup` hook that answers from a fixed address set, exported so its contract can
 * be tested directly rather than by reaching into `undici`'s internals.
 *
 * The signature is `net`'s: `lookup(hostname, options, callback)`. Two answer shapes exist
 * because `net` calls it both ways — `{ all: true }` expects an array of `{address, family}`,
 * otherwise a bare address plus a separate family argument. Answering only one shape would make
 * the pin work for one caller and silently fall through for the other.
 *
 * `hostname` is deliberately ignored. The whole point is that the name carries no authority at
 * this layer — the decision was made upstream, and this hook has no second opinion to offer.
 *
 * @param {Array<{ address: string, family: number }>} addrs
 * @returns {(hostname: string, options: object, callback: Function) => void}
 */
export function createPinnedLookup(addrs) {
  const pinned = addrs.map(({ address, family }) => ({ address, family }));
  return (_hostname, options, callback) => {
    if (options?.all) return callback(null, pinned);
    const first = pinned[0];
    return callback(null, first.address, first.family);
  };
}

/**
 * Turn a validated address set into a dispatcher that can ONLY connect to that set.
 *
 * WHY. Validating and then calling a plain `fetch()` leaves a TOCTOU window: `fetch` resolves the
 * hostname again, independently, so a name that was public at check time can answer with a private
 * address at connect time. Pinning the answer inside `connect.lookup` closes the window at the
 * layer that actually opens the socket — the connection is handed the addresses the check approved
 * and has no second opinion available to it.
 *
 * THE HONEST RESIDUAL. This pins the CONNECT for the host we validated. It does not, by itself,
 * cover a `Location:` redirect to a different host — that is handled one layer up by
 * `redirect: 'error'` in `spotlightImageFetch.mjs`, which refuses to follow any redirect at all.
 * The two controls are complementary: this one makes the first hop honest, that one prevents a
 * second hop from existing. Neither is a defence for a caller that ignores it.
 *
 * The agent is a live socket pool, so the CALLER MUST `close()` it. `close()` is on the returned
 * object (it is a real `Agent`), and closing drains idle sockets and lets the event loop exit.
 *
 * @param {Array<{ address: string, family: number }>} addrs validated addresses
 * @returns {Agent} a dispatcher pinned to `addrs`
 */
export function createPinnedDispatcher(addrs) {
  if (!Array.isArray(addrs) || addrs.length === 0) {
    // Fail closed. A dispatcher with no addresses would fall through to the system resolver, which
    // is precisely the behaviour this function exists to prevent.
    throw new SpotlightImageError('IMAGE_URL_DNS_FAILED', 'cannot pin an empty address set');
  }

  // `connect.lookup` is the same hook `net`/`tls` expose: it is asked to resolve the hostname
  // immediately before the socket is opened, and its answer is used verbatim. Answering from the
  // validated set means no resolver is consulted on this connection at all.
  return new Agent({ connect: { lookup: createPinnedLookup(addrs) } });
}
```


### 3.2 The tests

#### `backend/tests/unit/ipv6LiteralSyntax.test.mjs`

sha256 `359e64f069e7d669d2311f7ce5ef0f3f4b6d5813dfb2ce4bed029862e3f0fe10` · 134 lines

NEW in round 9 — direct tests of the syntax primitives. Exists because mutation M1 SURVIVED. C1, C5.

```mjs
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
```

#### `backend/tests/unit/addressClassificationR9.test.mjs`

sha256 `ae89e2dd57146e0bf6e1fd91311ec3e42a4ae82a87f3d7427fca9a22ea0a437c` · 188 lines

NEW in round 9 — the regression gate, including the blocks added to kill M4 and M6. C1, C5, C7.

```mjs
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
  const mustStayPrivate = [
    '2002:808:1',
    '2002:808:0:0:1',
    '2002:808:0:0:0:0:0:0:1',
    '2002:808::127.0.0.1',
    '2002:808:0:0:0:0:0:0:1.2.3.4',
  ];

  for (const addr of mustStayPrivate) {
    it(`treats ${addr} as private`, () => {
      expect(isPrivateOrLocalAddress(addr)).toBe(true);
    });
  }

  it('6to4 with a FEWER-group spelling is still private (the compression trap)', () => {
    // The raw-read bug is invisible on `2002:7f00:0::1` (which has both groups explicit) and
    // only appears when the address is short. Pinned as the minimal reproducer.
    expect(isPrivateOrLocalAddress('2002:808:1')).toBe(true);
    expect(isPrivateOrLocalAddress('2002:808:0:0:0:0:0:0:1')).toBe(true);
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
  ];

  for (const addr of malformed) {
    it(`treats ${addr} as private (fail closed)`, () => {
      expect(isPrivateOrLocalAddress(addr)).toBe(true);
    });
  }
});
```

#### `backend/tests/unit/spotlightImageLifecycle.test.mjs`

sha256 `4a538399e99e0e2b31e43ffb79e36eafe5d2b0bbb204eb62e9946ec4ee070b42` · 145 lines

The finding-2/3 test. The assertion quoted in §3.6 lives here. C3, C4.

```mjs
/**
 * spotlightImageLifecycle — the dispatcher outlives the BODY, not just the headers
 * ==============================================================================
 * WHAT THIS PROVES. `fetchSpotlightImage` must not ask the socket pool to close until the
 * response body has been settled — consumed, cancelled, or abandoned by an abort.
 *
 * WHY IT IS A SEPARATE FILE FROM THE PIN SUITE. The pin suite answers "is the connection
 * pinned to the approved address". This file answers a different question — "what is the
 * lifetime of the pool relative to the response" — and the two answers come from different
 * mechanisms. Splitting also keeps both files inside `06-bans.md` #50.
 *
 * THE DEFECT THIS ENCODES (hostile review round 8, D1, graded HIGH). The old code awaited
 * `dispatcher.close()` in a `finally` around `fetch()`. But `fetch()` resolves when the
 * HEADERS arrive and the body may still be streaming, so every body-handling path — the
 * 4xx/5xx cancel, the over-cap declared-length cancel, the streamed read — ran AFTER the
 * pool had been asked to shut down. `close()` drains idle sockets "once in-flight requests
 * settle", and a body still being read IS an in-flight request. The order was backwards by
 * construction: settlement must come first.
 *
 * WHY THE ASSERTIONS ARE ORDERING ASSERTIONS. A test asserting "close() was called" passes
 * on the broken code — that is the R6-01 failure mode (a green suite whose green does not
 * entail the property). Every assertion below compares the INDEX of two recorded events, so
 * reverting the fix turns this file red. That was verified by mutation, not assumed.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createPinnedDispatcher } from '../../services/spotlightImageUrlPolicy.mjs';
import { fetchSpotlightImage } from '../../services/spotlightImageFetch.mjs';
import { mockDns, PUBLIC_IP, orderedLifecycleHarness } from '../helpers/spotlightImageFixtures.mjs';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Settlement must be recorded, and must precede closure. */
const settleThenClose = (timeline, settledEvent) => {
  expect(timeline).toContain(settledEvent);
  expect(timeline).toContain('dispatcher-closed');
  expect(timeline.indexOf(settledEvent)).toBeLessThan(timeline.indexOf('dispatcher-closed'));
};

describe('the dispatcher outlives the response body (round 8, D1)', () => {
  it('hands the headers over before the pool closes', async () => {
    mockDns(PUBLIC_IP);
    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
    await fetchSpotlightImage('https://example.com/a.png', build());

    // Sanity on the harness itself: if the fetch never resolved, the ordering claims below
    // would be comparing indices in a timeline that never recorded the thing under test.
    expect(timeline[0]).toBe('fetch-returned');
    expect(timeline).toContain('dispatcher-closed');
  });

  it('settles an over-cap DECLARED length before closing the pool', async () => {
    mockDns(PUBLIC_IP);
    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
    const result = await fetchSpotlightImage('https://example.com/a.png', build({
      headers: { 'content-length': '4096' },
    }));

    expect(result).toMatchObject({ ok: false, code: 'IMAGE_TOO_LARGE' });
    settleThenClose(timeline, 'body-settled');
  });

  it('settles a 4xx body before closing the pool', async () => {
    mockDns(PUBLIC_IP);
    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
    const result = await fetchSpotlightImage('https://example.com/a.png', build({ status: 500 }));

    expect(result).toMatchObject({ ok: false, code: 'IMAGE_FETCH_FAILED' });
    settleThenClose(timeline, 'body-settled');
  });

  it('settles an over-cap STREAMED read before closing the pool', async () => {
    mockDns(PUBLIC_IP);
    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
    const result = await fetchSpotlightImage('https://example.com/a.png', build({
      maxBytes: 8,
      chunks: [Buffer.alloc(6), Buffer.alloc(6)],
    }));

    expect(result).toMatchObject({ ok: false, code: 'IMAGE_TOO_LARGE' });
    settleThenClose(timeline, 'body-settled');
  });

  it('drains a within-cap body before closing the pool', async () => {
    mockDns(PUBLIC_IP);
    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
    const result = await fetchSpotlightImage('https://example.com/a.png', build({
      chunks: [Buffer.from('abc')],
    }));

    expect(result.ok).toBe(true);
    // A fully-consumed stream fires no `cancel`, so the drain marker stands in for settlement.
    settleThenClose(timeline, 'stream-drained');
  });

  it('settles a body that ERRORS mid-read before closing the pool (round 9, finding 2)', async () => {
    // THE PATH THIS PINS. Every other exit from `readImageBody` released the body; the
    // `catch (err)` around the read loop returned WITHOUT cancelling, so a stream that failed
    // mid-read left a live socket behind. It was the single exception, and it was on the path
    // where a connection is most likely to be stranded.
    //
    // The assertion is on the timeline, not on the code: if the release is removed, no
    // `body-settled` entry is recorded and `settleThenClose` fails. A test that only checked
    // `result.ok === false` would pass either way.
    mockDns(PUBLIC_IP);
    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
    const result = await fetchSpotlightImage('https://example.com/a.png', build({
      chunks: [Buffer.alloc(4)],
      errorAfter: 'ECONNRESET',
    }));

    expect(result).toMatchObject({ ok: false, code: 'IMAGE_FETCH_FAILED' });
    expect(result.message).toMatch(/ECONNRESET/);

    // The stream had ALREADY errored, so `reader.cancel()` rejects with that error rather than
    // resolving — measured, and it is the spec's behaviour. What must be true is that the cancel
    // RAN to completion (either outcome) and, critically, that it was not REFUSED as locked.
    //
    // `body-cancel-locked` is the assertion that has teeth. The first version of this fix called
    // `response.body.cancel()` on a stream whose body was LOCKED by the reader; that throws
    // `Invalid state: ReadableStream is locked`, the empty catch swallowed it, and the socket was
    // never released — while a marker-before-await harness reported success. This is that bug,
    // pinned so it cannot come back.
    expect(timeline).not.toContain('body-cancel-locked');
    const settled = timeline.filter((e) => e === 'body-settled' || e === 'body-settled-after-error');
    expect(settled.length).toBeGreaterThan(0);
    expect(timeline).toContain('dispatcher-closed');
    expect(timeline.indexOf(settled[0])).toBeLessThan(timeline.indexOf('dispatcher-closed'));
  });

  it('closes the pool even when the fetch itself throws', async () => {
    // The failure path must not leak the dispatcher. `fetchImpl` throwing is the case the
    // original `finally` DID handle correctly — so this case guards against a fix that
    // moved cleanup inside the body handler and lost the error path.
    mockDns(PUBLIC_IP);
    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
    const built = build();
    const exploding = { ...built, fetchImpl: async () => { throw new Error('socket exploded'); } };

    const result = await fetchSpotlightImage('https://example.com/a.png', exploding);

    expect(result).toMatchObject({ ok: false, code: 'IMAGE_FETCH_FAILED' });
    expect(timeline).toContain('dispatcher-closed');
  });
});
```

#### `backend/tests/helpers/spotlightImageFixtures.mjs`

sha256 `2172ef02c443df6531588f8f9f630dc9128bd5a1ab981c4e29ed9bec4a36f64f` · 264 lines

The recording harness. Settlement is recorded AFTER the await; three distinct events. C4.

```mjs
/**
 * spotlightImageFixtures — shared fixtures for the Spotlight image-fetch suites
 * ============================================================================
 * Extracted so the two suites that use them stay inside the repo's 299-line limit.
 * Nothing here is a test, and this directory sits outside the test-file glob.
 *
 * WHICH PARTS ARE REAL, AND WHICH ARE NOT (corrected after hostile review round 9, C8).
 *
 * REAL: the HTTP transport (real `http` servers on loopback — the decision point in the
 * transport tests is the network, not an assertion about a mock's shape), the response
 * BODIES (real `Readable` streams, so the streamed byte cap and the cancellation paths are
 * exercised as streams), and the images (`sharp` generates real encodable bytes, so the
 * decoder decodes rather than being told it succeeded).
 *
 * MOCKED, and it matters which: **`dns.lookup`**. `mockDns`, `mockDnsFail` and `mockDnsHang`
 * replace it outright. An earlier version of this header said "these are deliberately REAL
 * artefacts, not stubs" without that qualification, which read as a claim the file does not
 * have. The honest statement is: everything except name resolution is real.
 *
 * WHAT THE MOCK DOES AND DOES NOT ESTABLISH. It establishes what the code does GIVEN a
 * resolution result — the admission decision, the pin's address set, the behaviour when the
 * resolver fails or hangs. It cannot establish that a real resolver returns what the mock
 * claims, so no test here is evidence about real DNS. In particular a rebinding attack is
 * represented by choosing mock values, not by performing one.
 */
import { vi } from 'vitest';
import * as dnsModule from 'node:dns';
import sharp from 'sharp';

/** A publicly routable address — the happy-path resolution. */
export const PUBLIC_IP = [{ address: '93.184.216.34', family: 4 }];

export const mockDns = (addresses) =>
  vi.spyOn(dnsModule.promises, 'lookup').mockResolvedValue(addresses);

export const mockDnsFail = (message = 'ENOTFOUND') =>
  vi.spyOn(dnsModule.promises, 'lookup').mockRejectedValue(new Error(message));

/** A DNS mock that NEVER settles — the hanging-resolver case the lookup budget must bound. */
export const mockDnsHang = () =>
  vi.spyOn(dnsModule.promises, 'lookup').mockImplementation(() => new Promise(() => {}));

/**
 * Like `streamResponse`, but records cancellation so a test can prove the body was RELEASED
 * rather than merely abandoned. `ReadableStream.cancel()` invokes this underlying `cancel`,
 * so `cancels` is evidence of the release, not of an intention to release.
 */
export function cancellableStreamResponse(chunks, { status = 200, headers = {} } = {}) {
  const cancels = [];
  let i = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(new Uint8Array(chunks[i++]));
      else controller.close();
    },
    cancel(reason) { cancels.push(reason); },
  });
  return { ok: status >= 200 && status < 300, status, headers: new Headers(headers), body, cancels };
}

/**
 * A response whose stream EMITS some chunks and then ERRORS mid-read, recording cancellation.
 *
 * WHY THE ERRORING CASE NEEDS ITS OWN FIXTURE (hostile review round 9, finding 2). A stream
 * that closes cleanly and a stream that throws are different code paths in `readImageBody`:
 * the first exits the read loop via `done`, the second via `catch`. The suite had fixtures for
 * "over the cap" and "not ok" and could show cancellation on both, but nothing that errored
 * mid-read — which is exactly the path that used to skip the release. `cancels` is the
 * evidence: an entry here means the body was released, not merely dropped.
 */
export function erroringStreamResponse(chunks, { status = 200, headers = {}, error = 'ECONNRESET' } = {}) {
  const cancels = [];
  let i = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(new Uint8Array(chunks[i++]));
      else controller.error(new Error(error));
    },
    cancel(reason) { cancels.push(reason); },
  });
  return { ok: status >= 200 && status < 300, status, headers: new Headers(headers), body, cancels };
}

/** A real Response-shaped object whose body is a real stream, so the cap is exercised. */
export function streamResponse(chunks, { status = 200, headers = {} } = {}) {
  let i = 0;
  const body = new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(new Uint8Array(chunks[i++]));
      else controller.close();
    },
  });
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    body,
  };
}

export const pngBuffer = (w = 8, h = 8) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 40, b: 40 } } })
    .png()
    .toBuffer();

export const jpegBuffer = (w = 8, h = 8) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 40, b: 40 } } })
    .jpeg()
    .toBuffer();

/** A PNG that genuinely carries an alpha channel — `hasAlpha` is what selects the output codec. */
export const alphaPngBuffer = (w = 8, h = 8) =>
  sharp({ create: { width: w, height: h, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 0.5 } } })
    .png()
    .toBuffer();

/**
 * A genuine 2-frame GIF89a. Each frame needs its Graphics Control Extension or libvips
 * rejects the frame data — the GCE is what makes this a valid animation rather than a
 * corrupt single-frame GIF.
 */
export function animatedGifBuffer() {
  const gce = Buffer.from([0x21, 0xf9, 0x04, 0x00, 0x0a, 0x00, 0x00, 0x00]);
  const frame = Buffer.from([
    0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x80,
    0x00, 0x00, 0x00, 0xff, 0xff, 0xff,
    0x02, 0x02, 0x44, 0x01, 0x00,
  ]);
  return Buffer.concat([
    Buffer.from('GIF89a', 'latin1'),
    Buffer.from([0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]),
    gce, frame, gce, frame,
    Buffer.from([0x3b]),
  ]);
}

/**
 * A response + fetch + dispatcher wired so every stage records into ONE timeline.
 *
 * WHY THIS LIVES HERE. The D1 defect (hostile review round 8) was an ORDERING bug — the pool was
 * asked to close before the body was settled — and an ordering bug can only be caught by a test
 * that observes the sequence. `cancellableStreamResponse` supplies the cancel hook; this supplies
 * the close hook and the drain marker, and keeps the test file inside the repo's line ceiling.
 *
 * Events recorded:
 *   'fetch-returned'    the fetch impl resolved (headers in hand, body maybe still streaming)
 *   'body-settled'      `body.cancel()` was called — the response was released
 *   'stream-drained'    the reader reached `done` — the body was fully consumed
 *   'dispatcher-closed' `dispatcher.close()` was called
 *
 * @param {(addrs: Array<{address: string, family: number}>) => object} makeDispatcher
 *        injected so this helper does not import the module under test
 * @returns {{ timeline: string[], build: (opts?: object) => object }}
 */
export function orderedLifecycleHarness(makeDispatcher) {
  const timeline = [];

  const trackedDispatcher = () => {
    const dispatcher = makeDispatcher([{ address: PUBLIC_IP[0].address, family: 4 }]);
    const originalClose = dispatcher.close.bind(dispatcher);
    dispatcher.close = async (...args) => {
      timeline.push('dispatcher-closed');
      return originalClose(...args);
    };
    return dispatcher;
  };

  // The tracked factory is what the module under test calls, so the returned object is the
  // one whose `close()` we record. `trackedDispatcher` is invoked per `build()` so each test
  // gets a fresh timeline entry rather than sharing one pool.
  const trackedFactory = () => trackedDispatcher();

  const build = (opts = {}) => {
    // `opts.errorAfter` selects the ERRORING stream instead of the clean one, so the
    // mid-read-failure path (round 9, finding 2) is observable in the same timeline as the
    // others. Without this the harness could only produce streams that close.
    const response = opts.errorAfter !== undefined
      ? erroringStreamResponse(opts.chunks || [Buffer.from('x')], {
        status: opts.status ?? 200,
        headers: opts.headers || {},
        error: opts.errorAfter,
      })
      : cancellableStreamResponse(opts.chunks || [Buffer.from('x')], {
        status: opts.status ?? 200,
        headers: opts.headers || {},
      });

    // Record the release — but only once it has actually SETTLED (round 9, finding 3).
    //
    // The previous version pushed the marker BEFORE awaiting the underlying cancel, so it
    // recorded the CALL, not the completion. A cancel that hung or resolved late would still
    // read as "body-settled" and `settleThenClose` would pass on an unsettled body — the exact
    // property the ordering assertion exists to check.
    //
    // WHY A REJECTION IS STILL "SETTLED". `reader.cancel()` on a stream that has ALREADY errored
    // rejects with that stream's own error rather than resolving — measured directly, and it is
    // the spec's behaviour, not a quirk of this fixture. So for the erroring path a rejecting
    // cancel IS the release having run to completion. The two cases are recorded as distinct
    // events so no test can confuse "cancelled successfully" with "cancel was refused":
    //
    //   body-settled             the cancel completed in the ordinary way
    //   body-settled-after-error the stream had already failed, and the cancel ran under that
    //   body-cancel-locked       the cancel was REFUSED (e.g. the body is locked) — a real leak
    //
    // 'body-cancel-locked' is the one that matters: it is what the first version of this fix
    // produced by calling `body.cancel()` on a locked stream, and it means NO release happened.
    const classifyCancelFailure = (err) => {
      const msg = String(err?.message || err);
      return /locked/i.test(msg) ? 'body-cancel-locked' : 'body-settled-after-error';
    };

    const originalCancel = response.body.cancel.bind(response.body);
    response.body.cancel = async (reason) => {
      try {
        const result = await originalCancel(reason);
        timeline.push('body-settled');
        return result;
      } catch (err) {
        timeline.push(classifyCancelFailure(err));
        throw err;
      }
    };

    // Record the drain, for the path that consumes rather than cancels — and the READER-level
    // cancel, which is a DIFFERENT call from `body.cancel()`. The streamed over-cap path cancels
    // through the reader it already holds, so hooking only `body.cancel` records nothing there.
    // (Learned the hard way: the first version of this harness missed that path.)
    const originalGetReader = response.body.getReader.bind(response.body);
    response.body.getReader = () => {
      const reader = originalGetReader();
      const originalRead = reader.read.bind(reader);
      reader.read = async () => {
        const step = await originalRead();
        if (step.done) timeline.push('stream-drained');
        return step;
      };
      // Same correction as `body.cancel` above: record AFTER the await, so the marker means
      // the reader-level cancel completed rather than merely started (round 9, finding 3).
      const originalReaderCancel = reader.cancel.bind(reader);
      reader.cancel = async (reason) => {
        try {
          const result = await originalReaderCancel(reason);
          timeline.push('body-settled');
          return result;
        } catch (err) {
          timeline.push(classifyCancelFailure(err));
          throw err;
        }
      };
      return reader;
    };

    return {
      timeline,
      fetchImpl: async () => { timeline.push('fetch-returned'); return response; },
      // `fetchSpotlightImage` builds its own dispatcher from the validated addresses, so the
      // observation point is the FACTORY, not a pre-built object. Injected via the module's
      // `dispatcherFactory` opt — the only way to hold the object whose lifetime is under test.
      dispatcherFactory: trackedFactory,
      maxBytes: opts.maxBytes ?? 1024,
    };
  };

  return { timeline, build };
}
```

#### `backend/tests/unit/spotlightImageTransportPin.test.mjs`

sha256 `9b6a75aa369c64dbb083002c7c62dfee7c9f00b77409941cc9e5891ba4850c96` · 236 lines

The transport pin test, with round 9's `pinned[0]` attribution corrected. C5.

```mjs
/**
 * spotlightImageTransportPin — what the pin does when `net` actually opens a socket
 * ==============================================================================
 * WHY THIS FILE EXISTS (hostile review round 8, D3).
 *
 * `spotlightImageDnsPin.test.mjs` has a test whose honest name now reads "...but this calls the
 * hook directly, it does not drive a socket". That rename was the correct fix for an overstated
 * claim, but it left a real hole: NOTHING in the repo observed `net` consulting `connect.lookup`
 * during an actual connection. Astra's sharper discriminator (round 7) is the one encoded here —
 * replace the pinned dispatcher with a default `Agent` and see whether the two cases are
 * DISTINGUISHABLE. If they are not, the test is asserting on dispatcher PRESENCE rather than on
 * TRANSPORT, and it would stay green against a pin that does nothing.
 *
 * WHAT MAKES THIS A TRANSPORT TEST AND NOT ANOTHER HARNESS TEST.
 *
 *   - Two REAL servers listen on two DIFFERENT loopback addresses (127.0.0.1 and 127.0.0.2),
 *     on the SAME PORT, so the port in the URL is valid for both and the only variable left is
 *     which ADDRESS the pin chose. (Verified: two 127/8 addresses may hold one port number.)
 *   - A REAL undici `Agent` is built by the production factory, pinning ONE of them.
 *   - A REAL `fetch()` is issued against a URL whose HOST is a NAME, not a literal.
 *   - The assertion is on WHICH SERVER ANSWERED — observed from the server side, over the wire.
 *
 * So the observation point is the network, not our own hook. That is the difference the review
 * asked for: if `net` stops calling our lookup, the request lands on the OTHER server and this
 * fails, rather than passing because we called our own function.
 *
 * WHY A NAME AND NOT A LITERAL. `net` short-circuits an IP literal — there is no name to resolve,
 * so `connect.lookup` is never consulted and a pin has no say. That limit is already documented
 * in the sibling file. Here the host is a NAME precisely so the lookup path is the one exercised.
 *
 * WHY THE NAME IS NEVER ACTUALLY RESOLVED. The pin's whole value is that the name is NOT resolved
 * at connect time. The name used below (`pin-probe.invalid`) is a `.invalid` TLD, reserved by
 * RFC 2606, which can never resolve. If the pin were absent, the connection would fail with DNS
 * failure rather than reach a server — so a passing test also proves the socket never consulted
 * the system resolver.
 *
 * THE FAILURE THIS FILE ALREADY CAUGHT, RECORDED BECAUSE IT IS THE WHOLE POINT. The first draft
 * pinned 127.0.0.2 but built the URL from 127.0.0.1's port, and failed with
 * `ECONNREFUSED 127.0.0.2:<the-other-port>`. That is a defect in the TEST, but the error is also
 * the proof: the socket had gone to 127.0.0.2, the address nothing in the URL pointed at. Fixing
 * it by giving both servers one port removes the confound rather than papering over it.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createServer } from 'node:http';
import { Agent } from 'undici';
import { createPinnedDispatcher, createPinnedLookup } from '../../services/spotlightImageUrlPolicy.mjs';

/** A name that can never resolve: `.invalid` is reserved by RFC 2606. */
const UNRESOLVABLE_NAME = 'pin-probe.invalid';

/** Bind a loopback server that names the address it answered on. */
const listenOn = (address, port) =>
  new Promise((resolve, reject) => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(`served-by:${address}`);
    });
    server.once('error', reject);
    server.listen(port, address, () => resolve(server));
  });

/**
 * Two servers, two addresses, ONE port — so the URL's port is valid for both and the address is
 * the only thing the pin can change. Returns both plus a closer.
 */
const serveTwoAddresses = async () => {
  const first = await listenOn('127.0.0.1', 0);
  const { port } = first.address();
  const second = await listenOn('127.0.0.2', port);
  return {
    port,
    close: async () => {
      await new Promise((resolve) => second.close(resolve));
      await new Promise((resolve) => first.close(resolve));
    },
  };
};

describe('the pin observed at the transport, not at the hook', () => {
  let teardown = null;
  afterEach(async () => {
    if (teardown) await teardown();
    teardown = null;
  });

  it('the socket opens to the PINNED address even though the URL names neither address', async () => {
    const pair = await serveTwoAddresses();
    teardown = pair.close;

    // Pin 127.0.0.2 while both are listening on this port. If the pin is load-bearing the second
    // server answers; if it is inert the request either fails to resolve or reaches the first.
    const dispatcher = createPinnedDispatcher([{ address: '127.0.0.2', family: 4 }]);
    try {
      const response = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher });
      // The socket went where the CHECK pointed, not where the NAME pointed — and the name could
      // not have resolved at all, so this outcome is reachable only through the pin.
      expect(await response.text()).toBe('served-by:127.0.0.2');
    } finally {
      await dispatcher.close();
    }
  });

  it('a default Agent is DISTINGUISHABLE — it fails on the same unresolvable name', async () => {
    // THE DISCRIMINATOR. If this case behaved like the pinned one, the previous test would be
    // proving nothing about transport. It must FAIL, and specifically by DNS, not by anything else.
    const pair = await serveTwoAddresses();
    teardown = pair.close;

    const dispatcher = new Agent();
    try {
      const outcome = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher })
        .then(async (r) => ({ reached: true, body: await r.text() }), (err) => ({ reached: false, err }));
      expect(outcome.reached).toBe(false);
      // Named so a future reader can tell "the pin is gone" from "the network is down".
      const detail = String(outcome.err?.cause?.code || outcome.err?.code || outcome.err?.message);
      expect(detail).toMatch(/ENOTFOUND|EAI_AGAIN|getaddrinfo/i);
    } finally {
      await dispatcher.close();
    }
  });

  it('pinning the OTHER address flips which server answers — the pin is the only variable', async () => {
    // The control that makes the first case non-accidental: hold everything constant except the
    // pinned address, and the answering server changes. A test that could not tell 127.0.0.1 from
    // 127.0.0.2 is not observing an address at all.
    const pair = await serveTwoAddresses();
    teardown = pair.close;

    const dispatcher = createPinnedDispatcher([{ address: '127.0.0.1', family: 4 }]);
    try {
      const response = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher });
      expect(await response.text()).toBe('served-by:127.0.0.1');
    } finally {
      await dispatcher.close();
    }
  });

  it('with TWO pinned addresses, the FIRST pinned one is the one connected to', async () => {
    // ADDED AFTER A MUTATION SURVIVED. Rotating the pinned set (`addrs.slice(1).concat(addrs[0])`
    // inside `createPinnedDispatcher`) left this whole file GREEN, because every case above pins a
    // SINGLE address — with one element there is nothing to rotate, so the mutation was invisible
    // by construction, not by accident. That is a real hole in this file's coverage and this case
    // closes it: two live addresses on one port, and an assertion about WHICH one wins.
    //
    // WHICH BRANCH THIS ACTUALLY EXERCISES — corrected 2026-09-21 after measuring it.
    //
    //   This comment previously said "`connect.lookup` is called WITHOUT `all`, and our
    //   `createPinnedLookup` answers with `pinned[0]`". That is FALSE, and round 9's finding 5
    //   ("comments claiming properties their code does not establish") named this file for
    //   asserting `{ all: false }` while never observing the lookup options. Measured: undici's
    //   `Agent` calls `connect.lookup` with `{ family, hints, all: true }` — `all: true` on
    //   EVERY call. So this case takes the `options.all` branch, and the single-address branch
    //   (`pinned[0]`) is unreachable through undici.
    //
    //   Proved by mutation, both directions: rotating the order inside the `all` branch
    //   (`[...pinned].reverse()`) FAILS this case; rotating the single-address branch
    //   (`pinned[pinned.length - 1]`) leaves the whole file GREEN, because that branch never
    //   runs. The lookup-level cases at the bottom of this file cover the unreachable branch
    //   directly, so that mutation is no longer invisible.
    //
    // WHAT THIS CASE THEREFORE PINS: the validated ORDER is preserved through the pin, and the
    // first validated address is the one a socket takes. That is still OUR contract and still
    // the property worth holding — a pin that silently reordered its set would connect somewhere
    // the check DID approve but the caller did not prefer, and would look correct in every
    // single-address case above. Only the mechanism described above was wrong, not the claim.
    const pair = await serveTwoAddresses();
    teardown = pair.close;

    const dispatcher = createPinnedDispatcher([
      { address: '127.0.0.2', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);
    try {
      const response = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher });
      // 127.0.0.2 is FIRST, so it is the one that must answer — not the second entry.
      expect(await response.text()).toBe('served-by:127.0.0.2');
    } finally {
      await dispatcher.close();
    }
  });
});

/**
 * The lookup itself — including the branch undici never takes.
 *
 * WHY THESE ARE HERE AND NOT ONLY IN THE TRANSPORT CASES ABOVE (round 9, finding 5).
 *
 *   Measured: undici's `Agent` calls `connect.lookup` with `{ family, hints, all: true }` —
 *   `all: true` on EVERY call. So the transport cases above exercise ONE of
 *   `createPinnedLookup`'s two branches, and the single-address branch is unreachable through
 *   undici. Mutating it (`pinned[pinned.length - 1]` in place of `pinned[0]`) left the entire
 *   transport file GREEN — a mutation invisible by construction. That is the same structural
 *   hole the two-address case above was written to close, and did not close.
 *
 *   `createPinnedLookup` is EXPORTED, so the branch is not dead by contract, only by current
 *   caller. Deleting it would be the other honest option; testing it is the safer one, because
 *   a future non-undici caller — or an `Agent` configured with a fixed `family` — would reach
 *   it and must still get a pinned answer rather than a resolver.
 *
 *   These are unit cases on purpose: they observe the OPTIONS and the ANSWER directly, which is
 *   exactly what finding 5 said this file claimed and never did.
 */
describe('createPinnedLookup — both branches, observed directly', () => {
  const addrs = () => [{ address: '127.0.0.2', family: 4 }, { address: '127.0.0.1', family: 4 }];

  it('with { all: true } it answers the FULL set, in the validated order', () => {
    const answers = [];
    createPinnedLookup(addrs())('any.invalid', { all: true }, (err, res) => answers.push([err, res]));

    expect(answers).toHaveLength(1);
    const [err, res] = answers[0];
    expect(err).toBe(null);
    // Order is the property under test: undici connects to the first entry it is handed.
    expect(res).toEqual([{ address: '127.0.0.2', family: 4 }, { address: '127.0.0.1', family: 4 }]);
  });

  it('WITHOUT { all } it answers the FIRST validated address, in the 3-arg callback form', () => {
    const answers = [];
    createPinnedLookup(addrs())('any.invalid', {}, (...args) => answers.push(args));

    expect(answers).toHaveLength(1);
    // THE MUTATION THIS CASE EXISTS TO CATCH: `pinned[pinned.length - 1]` in place of
    // `pinned[0]`. No transport case can see it, because undici never takes this branch.
    expect(answers[0]).toEqual([null, '127.0.0.2', 4]);
  });

  it('it consults no resolver — the hostname is ignored entirely', () => {
    const forOne = [];
    const forAnother = [];
    createPinnedLookup(addrs())('one.invalid', { all: true }, (e, r) => forOne.push(r));
    createPinnedLookup(addrs())('something-else.invalid', { all: true }, (e, r) => forAnother.push(r));

    // The same answer for two different names is the pin's whole point: the name is never
    // resolved, so a rebinding resolver has nothing to influence.
    expect(forOne[0]).toEqual(forAnother[0]);
  });
});
```

#### `backend/tests/unit/spotlightImageDnsPin.test.mjs`

sha256 `e6dfd8139de4d70ff1c258fbb41430b5c4262105e5a01326192bf8a48ed38fd4` · 284 lines

The pre-existing pin suite. C5.

```mjs
/**
 * spotlightImageDnsPin — the DNS-rebinding pin at the connect boundary
 * =====================================================================
 * WHAT THIS PROVES, AND WHY IT NEEDS ITS OWN FILE.
 *
 * `spotlightImageUrlPolicy.mjs` used to resolve a curator's image host, reject private
 * addresses, and then DISCARD the addresses it had approved — handing only the URL to
 * `fetch()`, which resolved the name a second time. A name that answered publicly on the
 * first lookup and privately on the second (classic DNS rebinding) therefore reached an
 * internal address even though the validator had "checked" it. The gap was honestly
 * documented, but documented is not closed.
 *
 * The fix pins the approved addresses into the connection via `undici.Agent`'s
 * `connect.lookup`, so the socket can only go where the check looked. The lookup hook is
 * exported as a named factory so its contract is tested directly, and the dispatcher is
 * exercised against a REAL loopback server rather than asserted on by shape.
 *
 * The decisive test is under "the TOCTOU the pin closes": it stands up a real server and
 * shows the unpinned fetch reaching it while the pinned one cannot. If the pinned half ever
 * starts succeeding, the pin has stopped being load-bearing and this file is lying to you.
 *
 * Nothing here asserts on `undici` internals EXCEPT one deliberate, narrow reach described at the
 * point of use (the `Symbol(options)` access in the wiring block, which reads the connect options
 * to see WHICH addresses were pinned). Hostile review round 8 (C8) caught an earlier version of
 * this header claiming "no symbol-poking" while the code did exactly that — the claim was false,
 * so the claim is what changed. Everything the network can answer is observed from the network
 * side instead.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createServer } from 'node:http';
import {
  SpotlightImageError,
  resolveAndValidate,
  createPinnedLookup,
  createPinnedDispatcher,
} from '../../services/spotlightImageUrlPolicy.mjs';
import { fetchSpotlightImage } from '../../services/spotlightImageFetch.mjs';
import { mockDns, PUBLIC_IP, streamResponse, orderedLifecycleHarness } from '../helpers/spotlightImageFixtures.mjs';

afterEach(() => {
  vi.restoreAllMocks();
});

/** Drive the `net`-style lookup hook synchronously and capture its answer. */
const callLookup = (lookup, hostname, options) => {
  let captured;
  lookup(hostname, options, (...args) => { captured = args; });
  return captured;
};

/** Stand up a real loopback server and hand back its URL plus a closer. */
const withLoopbackServer = async () => {
  const server = createServer((_req, res) => { res.writeHead(200); res.end('private'); });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
};

// ─── createPinnedLookup: the hook answers from the validated set ─────────
describe('createPinnedLookup', () => {
  it('answers the all:true form with every pinned address', () => {
    const lookup = createPinnedLookup([
      { address: '93.184.216.34', family: 4 },
      { address: '93.184.216.35', family: 4 },
    ]);
    const [err, answer] = callLookup(lookup, 'rebind.example', { all: true });
    expect(err).toBeNull();
    expect(answer).toEqual([
      { address: '93.184.216.34', family: 4 },
      { address: '93.184.216.35', family: 4 },
    ]);
  });

  it('answers the single-address form with a bare address and family', () => {
    const lookup = createPinnedLookup([{ address: '93.184.216.34', family: 4 }]);
    const [err, address, family] = callLookup(lookup, 'rebind.example', { all: false });
    expect(err).toBeNull();
    expect(address).toBe('93.184.216.34');
    expect(family).toBe(4);
  });

  it('ignores the requested hostname — the answer is the pinned set', () => {
    const lookup = createPinnedLookup([{ address: '93.184.216.34', family: 4 }]);
    // Two different names, one pinned answer: a rebinding name cannot talk its way out.
    const [, a] = callLookup(lookup, 'attacker.example', { all: true });
    const [, b] = callLookup(lookup, 'rebind.example', { all: true });
    expect(a).toEqual([{ address: '93.184.216.34', family: 4 }]);
    expect(b).toEqual(a);
  });

  it('preserves an IPv6 pinned address with its family', () => {
    const lookup = createPinnedLookup([{ address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 }]);
    const [, answer] = callLookup(lookup, 'example.com', { all: true });
    expect(answer).toEqual([{ address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 }]);
  });
});

// ─── createPinnedDispatcher: fail-closed construction ────────────────────
describe('createPinnedDispatcher', () => {
  it('fails closed on an empty address set rather than falling back to the resolver', () => {
    // A dispatcher with no pinned addresses would let `net` use the system resolver — exactly
    // the behaviour the pin exists to remove — so it must refuse to exist at all.
    expect(() => createPinnedDispatcher([])).toThrow(SpotlightImageError);
    expect(() => createPinnedDispatcher([])).toThrow(/cannot pin an empty address set/i);
  });

  it('refuses a non-array address set', () => {
    expect(() => createPinnedDispatcher(undefined)).toThrow(/cannot pin an empty address set/i);
  });

  it('builds a dispatcher that can be closed', async () => {
    const dispatcher = createPinnedDispatcher([{ address: '93.184.216.34', family: 4 }]);
    // `undici`'s close() resolves to null; the contract that matters is that it settles and
    // leaves no live pool behind, not the resolved value.
    await expect(dispatcher.close()).resolves.toBeNull();
  });
});

// ─── the TOCTOU the pin closes ─────────────────────────────────────────
//
// These use only DETERMINISTIC, LOCAL sockets. An earlier draft pinned the connection to a
// TEST-NET address (192.0.2.1) to show the request failing; that address is filtered rather
// than refused, so the connect simply hung and the test died on its own timeout. A hung test
// is worse than no test, so the design here is: every case either completes against loopback
// or completes against a literal-bypass, and none of them depend on how the network answers.
//
// WHAT THESE CASES DO *NOT* ESTABLISH (hostile review round 8, D3). The unpinned control at
// T:126 shows that a bare `fetch()` reaches loopback — a real escape, and a real detector.
// But none of these cases drives a NAMED host through `net` and observes which address the
// socket opened to. The lookup contract cases above call our hook DIRECTLY, which is a test
// of our function, not of `net` using it. That gap is named in the lifecycle/transport
// suites rather than papered over with a comment claiming it is "measured here, live".
describe('the TOCTOU the pin closes', () => {
  it('an unpinned fetch reaches the loopback server (the escape)', async () => {
    // The CONTROL, not the fix. It shows a `fetch()` handed only a URL walks straight to the
    // private address — so the escape was real, and this harness can detect it.
    const server = await withLoopbackServer();
    try {
      const response = await globalThis.fetch(server.url);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe('private');
    } finally {
      await server.close();
    }
  });

  it('the hook answers a NAME from the pinned set — but this calls the hook directly, it does not drive a socket', async () => {
    // WHAT THIS ACTUALLY MEASURES, RENAMED AFTER HOSTILE REVIEW ROUND 8 D3. The old name was
    // "the pin is consulted for a NAMED host — the lookup hook fires, the literal path does not",
    // which overstated it: `createPinnedLookup` is invoked BY THIS TEST, so all it shows is that
    // our factory returns the pinned set for a name. It does NOT show `net` consulting the hook
    // during a connection, and it does not measure the literal asymmetry at all — the literal
    // case is covered separately below. Renaming is the honest fix; a claim in a test NAME is
    // still a claim.
    const hookCalls = [];
    const probe = (hostname) => new Promise((resolve) => {
      const lookup = createPinnedLookup([{ address: '127.0.0.2', family: 4 }]);
      lookup(hostname, { all: true }, (_e, answer) => { hookCalls.push({ hostname, answer }); resolve(answer); });
    });

    await probe('rebind.invalid');
    expect(hookCalls).toHaveLength(1);
    expect(hookCalls[0].answer).toEqual([{ address: '127.0.0.2', family: 4 }]);
  });

  it('an IP-LITERAL host bypasses the pin entirely, so the VALIDATOR must refuse it', async () => {
    // A documented LIMIT, encoded so it cannot be mistaken for a defence.
    //
    // `net` short-circuits an IP literal: there is no name to resolve, so `connect.lookup` is
    // never called and a pin has no say. This proves both halves — the pin is bypassed, AND the
    // admission check is what actually catches the literal (before any dispatcher exists).
    //
    // CORRECTED AFTER HOSTILE REVIEW ROUND 8 (C6). Half two used to call `resolveAndValidate`
    // with `server.url`, which is an **`http://`** URL — so `P:114` rejected the PROTOCOL and
    // address admission was never reached. The assert passed for the wrong reason and proved
    // nothing about literals. It now uses an https URL whose host is the literal, so the only
    // thing that can refuse it is address admission.
    const server = await withLoopbackServer();
    const dispatcher = createPinnedDispatcher([{ address: '127.0.0.2', family: 4 }]);
    try {
      // Half one: the pin does not stop the literal from reaching the server.
      const reached = await globalThis.fetch(server.url, { dispatcher })
        .then(() => true, () => false);
      expect(reached).toBe(true);

      // Half two: the validator refuses the same LITERAL HOST on its own merits. https, so the
      // protocol guard cannot be what refuses it; the code asserted is the ADMISSION code.
      await expect(resolveAndValidate(`https://127.0.0.1:${new URL(server.url).port}/a.png`))
        .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
    } finally {
      await dispatcher.close();
      await server.close();
    }
  });

  it('refuses a bracketed IPv6 literal at the LITERAL branch, not via the resolver', async () => {
    // Hostile review round 8, D4. `URL.hostname` KEEPS the brackets on an IPv6 authority, and
    // `net.isIP('[::1]')` is 0 — so every IPv6 literal used to slip past the literal branch and
    // take the DNS path, where the classifier depended on the resolver's normalisation to catch
    // it. It did not: `https://[::ffff:0:127.0.0.1]/` was ADMITTED and pinned as `::ffff:0:7f00:1`.
    // The message assertion pins the FIX — refusal must name the bare address, which is only
    // possible if the brackets were stripped before classification.
    const lookup = mockDns(PUBLIC_IP);
    await expect(resolveAndValidate('https://[::1]/a.png'))
      .rejects.toMatchObject({
        code: 'IMAGE_URL_NOT_ALLOWED',
        message: expect.stringContaining('::1'),
      });
    // And the fix must not route a literal through the resolver to get there.
    expect(lookup).not.toHaveBeenCalled();
  });

  it('refuses an IPv4-mapped loopback literal that the DNS path laundered', async () => {
    // The D4 bypass, encoded. This address normalises to the HEX mapped form, which the old
    // classifier's dotted-only regex missed and then called public.
    mockDns(PUBLIC_IP);
    await expect(resolveAndValidate('https://[::ffff:0:127.0.0.1]/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
  });
});

// ─── the pin is actually WIRED into the fetch path ──────────────────────
//
// This block exists because of a mutation result, and it is the most important block here.
//
// Removing `dispatcher` from the fetch call in `spotlightImageFetch.mjs` left every other test
// in this file GREEN. The reason is instructive: those tests exercise `createPinnedLookup` and
// `createPinnedDispatcher` DIRECTLY, so they pass whether or not the production fetch ever calls
// them. A pin that is constructed but never passed is not a control — it is dead code with a good
// comment. These assertions observe the CALL, which is the only thing that makes the pin real.
describe('fetchSpotlightImage wires the pin into the transport', () => {
  it('passes a dispatcher to fetchImpl', async () => {
    mockDns(PUBLIC_IP);
    const seen = [];
    const fetchImpl = async (url, init) => {
      seen.push(init);
      return streamResponse([Buffer.from('x')]);
    };

    await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });

    expect(seen).toHaveLength(1);
    expect(seen[0].dispatcher).toBeDefined();
    expect(typeof seen[0].dispatcher.close).toBe('function'); // it is a real Agent
  });

  it('pins the addresses the validator approved, not the URL alone', async () => {
    // The dispatch must be built from the RESOLVED addresses, so a name that would answer
    // differently on a second lookup has no second lookup available to it.
    mockDns(PUBLIC_IP);
    let captured = null;
    const fetchImpl = async (url, init) => {
      captured = init.dispatcher;
      return streamResponse([Buffer.from('x')]);
    };

    await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });

    // Reach the pinned answer through the dispatcher's own connect options — the value that
    // `net` will be handed. `Symbol(options)` is undici's, so this reaches in deliberately and
    // narrowly, for the one thing that cannot be observed from outside: WHICH addresses were pinned.
    const opts = captured[Object.getOwnPropertySymbols(captured).find((s) => s.toString() === 'Symbol(options)')];
    const answer = await new Promise((resolve) => {
      opts.connect.lookup('example.com', { all: true }, (_e, a) => resolve(a));
    });
    expect(answer).toEqual(PUBLIC_IP);
  });

  it('refuses to fetch when the pinned address set is empty (fail closed)', async () => {
    // If admission ever returned no addresses, the fetch must fail rather than fall through to a
    // resolver-backed connection. An empty answer is not a reason to resolve for ourselves.
    mockDns([]);
    let called = false;
    const fetchImpl = async () => { called = true; return streamResponse([Buffer.from('x')]); };

    const result = await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('IMAGE_URL_DNS_FAILED');
    expect(called).toBe(false);
  });
});
```

#### `backend/tests/unit/spotlightImageAdmission.test.mjs`

sha256 `278c547cc32f5375e67343abfe979735bab98de26b4114d39daa449b584ad215` · 146 lines

The admission-layer regression cases. C5, C8.

```mjs
/**
 * spotlightImageAdmission — what `resolveAndValidate` lets through, and what it refuses
 * ================================================================================
 * WHAT THIS PROVES. URL admission: HTTPS-only, no embedded credentials, and every resolved
 * address publicly routable — plus the IP-LITERAL branch, which is the one place where no
 * resolver is consulted at all.
 *
 * WHY IT IS A SEPARATE FILE. The pin suite answers "is the connection pinned"; this answers
 * "was the URL admitted". Different mechanism, different failure mode, and `06-bans.md` #50
 * wants each file under 300 lines.
 *
 * THE REGRESSION CASES AT THE FOOT (round 8, D2/D4). Hostile review measured that
 * `isPrivateOrLocalAddress` called `"::ffff:7f00:1"` PUBLIC, and that `resolveAndValidate`
 * consequently ADMITTED `https://[::ffff:0:127.0.0.1]/` — a loopback literal. The mechanism:
 * `URL.hostname` keeps brackets on an IPv6 authority, so `net.isIP` returned 0, the literal
 * branch was skipped, `dns.lookup` normalised the address to a HEX mapped form, and the
 * classifier's dotted-only mapped regex missed it and fell through to "public IPv6".
 *
 * The fix has two halves and BOTH are asserted here: brackets stripped before `net.isIP`, and
 * the classifier's IPv6 default inverted to fail closed. Either half alone leaves a hole, so a
 * test that only covered one would not have caught the defect.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveAndValidate } from '../../services/spotlightImageUrlPolicy.mjs';
import { isPrivateOrLocalAddress } from '../../services/addressClassification.mjs';
import { mockDns, PUBLIC_IP } from '../helpers/spotlightImageFixtures.mjs';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveAndValidate', () => {
  it('returns both the URL and the validated addresses', async () => {
    mockDns(PUBLIC_IP);
    const { url, addrs } = await resolveAndValidate('https://example.com/a.png');
    expect(url).toBeInstanceOf(URL);
    expect(url.hostname).toBe('example.com');
    // The addresses must SURVIVE the call — discarding them is the defect being fixed.
    expect(addrs).toEqual(PUBLIC_IP);
  });

  it('validates an IP-literal host without a lookup and pins the literal', async () => {
    // A literal is not a name; resolving it is meaningless. It must be validated and pinned
    // as itself, and the DNS mock must never be consulted.
    const lookup = mockDns(PUBLIC_IP);
    const { url, addrs } = await resolveAndValidate('https://93.184.216.34/a.png');
    expect(url.hostname).toBe('93.184.216.34');
    expect(addrs).toEqual([{ address: '93.184.216.34', family: 4 }]);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('rejects a private IP-literal before any lookup', async () => {
    const lookup = mockDns(PUBLIC_IP);
    await expect(resolveAndValidate('https://10.0.0.1/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('rejects the cloud metadata IP-literal before any lookup', async () => {
    const lookup = mockDns(PUBLIC_IP);
    await expect(resolveAndValidate('https://169.254.169.254/latest/meta-data/'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('still rejects when ANY resolved address is private', async () => {
    mockDns([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);
    await expect(resolveAndValidate('https://mixed.example/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
  });
});

// ─── round 8, D2: the classifier's fail-closed contract ─────────────────
//
// `isPrivateOrLocalAddress` is imported from its OWN module (`addressClassification.mjs`),
// which is where the round-8 fix moved it. Importing from there rather than through the
// audio fetcher's re-export keeps this suite honest about which unit is under test.
describe('the classifier fails CLOSED on shapes it does not recognise (round 8, D2)', () => {
  const mustBePrivate = [
    // The four inputs hostile review measured as `false` (i.e. "public").
    [':', 'a bare colon is not an address'],
    ['8.8.8.999', 'an out-of-range octet is not a public IPv4'],
    ['0:0:0:0:0:0:0:1', 'the expanded form of IPv6 loopback'],
    ['::ffff:7f00:1', 'the HEX form of IPv4-mapped loopback'],
    // Forms the same defect class reaches.
    ['::ffff:0:127.0.0.1', 'the D4 bypass — a mapped address that normalises to ::ffff:0:7f00:1'],
    ['::127.0.0.1', 'IPv4-compatible (deprecated, still routable)'],
    ['::7f00:1', 'IPv4-compatible, hex'],
    ['64:ff9b::127.0.0.1', 'NAT64 embedding loopback'],
    ['2002:7f00:1::', '6to4 embedding loopback'],
    ['0::1', 'loopback with a leading zero group'],
    ['::0001', 'loopback with an expanded final group'],
    ['[::1]', 'a bracketed literal, which is how a URL authority presents it'],
    ['fe00::1', 'outside the global-unicast range'],
    ['4000::1', 'outside the global-unicast range'],
  ];

  for (const [ip, why] of mustBePrivate) {
    it(`treats ${JSON.stringify(ip)} as private — ${why}`, () => {
      expect(isPrivateOrLocalAddress(ip)).toBe(true);
    });
  }

  const mustBePublic = [
    ['93.184.216.34', 'a plain public IPv4'],
    ['2606:2800:220:1:248:1893:25c8:1946', 'example.com, in 2000::/3'],
    ['2001:4860:4860::8888', 'Google public DNS over IPv6'],
    ['2a00:1450:4001:80a::200e', 'a Google edge address'],
    ['3fff::1', 'the top of the global-unicast range'],
  ];

  for (const [ip, why] of mustBePublic) {
    it(`treats ${JSON.stringify(ip)} as public — ${why}`, () => {
      expect(isPrivateOrLocalAddress(ip)).toBe(false);
    });
  }
});

// ─── round 8, D4: the admitted loopback literal ─────────────────────────
describe('IPv6 literals are classified AS literals, not laundered through a resolver (round 8, D4)', () => {
  it('refuses the mapped-loopback literal that the DNS path previously admitted', async () => {
    mockDns(PUBLIC_IP);
    await expect(resolveAndValidate('https://[::ffff:0:127.0.0.1]/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
  });

  it('refuses bracketed IPv6 loopback without consulting the resolver at all', async () => {
    // The mechanism assertion: if this went through `dns.lookup`, the fix is only half applied —
    // the address would be refused, but by a resolver's normalisation rather than by our own
    // literal branch, which is exactly how the D4 bypass worked.
    const lookup = mockDns(PUBLIC_IP);
    await expect(resolveAndValidate('https://[0:0:0:0:0:0:0:1]/a.png'))
      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
    expect(lookup).not.toHaveBeenCalled();
  });

  it('refuses the unspecified address and its expanded forms', async () => {
    mockDns(PUBLIC_IP);
    for (const host of ['[::]', '[0:0:0:0:0:0:0:0]']) {
      await expect(resolveAndValidate(`https://${host}/a.png`))
        .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
    }
  });
});
```


### 3.3 The commits under review, in full

### `14833065a` — the round-9 fixes, RE-LANDED. The originals (67de00ee0, 7a23939cf) and their parent (6cca20594) are absent from this store; this commit carries the same content. C2, C3, C6.

```diff
commit 14833065a608da2af8b1ce4e933aa25832cfe5f7
parent 6fcfdc6adc19ac882d7e716716d50d8abc9b9a05
author SeanSwan
date Mon Sep 21 22:25:11 2026 -0700
subject fix(security): land the round-9 spotlight fixes — allowlist classifier, reader release

diff --git a/backend/services/addressClassification.mjs b/backend/services/addressClassification.mjs
new file mode 100644
index 000000000..775306bf7
--- /dev/null
+++ b/backend/services/addressClassification.mjs
@@ -0,0 +1,199 @@
+/**
+ * addressClassification.mjs
+ * =========================
+ * IS THIS ADDRESS PUBLICLY ROUTABLE? — the ONE copy of that answer.
+ *
+ * WHY THIS FILE EXISTS. Extracted from `applaudAudioFetcher.mjs` on 2026-09-21, in the
+ * same way `spotlightImageUrlPolicy.mjs` was extracted from `spotlightImageFetch.mjs`:
+ * `06-bans.md` #50 ("no source file reaches 300 lines") had already been breached there
+ * (322 lines at HEAD), and hostile-review round 8's D2/D4 fix added more. The seam is
+ * **classification vs transport** — this module answers a pure question about a string;
+ * `applaudAudioFetcher.mjs` fetches audio and `spotlightImageUrlPolicy.mjs` admits URLs.
+ *
+ * `isPrivateOrLocalAddress` is RE-EXPORTED from `applaudAudioFetcher.mjs`, so the audio
+ * path's importers and its tests are untouched by the move.
+ *
+ * WHY THERE IS ONLY ONE COPY. Two drifting copies of a private-range table is the failure
+ * mode, not the fix — a range fixed in one copy and not the other is a silent hole. Both
+ * consumers import from here.
+ *
+ * SYNTAX LIVES NEXT DOOR. `ipv6LiteralSyntax.mjs` answers "is this a legal IPv6 literal, and
+ * what bits does it denote"; this file answers "given that, is it safe to reach". Round 9
+ * finding 1 was precisely the consequence of not keeping those apart: classification read the
+ * raw spelling, so two spellings of one address (2002:7f00::1, 2002:7f00:0::1) disagreed.
+ *
+ * THE FAIL-CLOSED INVERSION (round 8, D2/D4). This classifier used to DENYLIST: enumerate
+ * the special ranges and call everything else public. Hostile review measured the cost —
+ * `resolveAndValidate` ADMITTED `https://[::ffff:0:127.0.0.1]/` (a loopback literal)
+ * because a bracketed literal escapes `net.isIP`, leaving this classifier as the only
+ * guard; `dns.lookup` then normalised the address to the HEX form `::ffff:0:7f00:1`, and
+ * the old mapped-IPv4 regex matched only the dotted form. It fell through to
+ * `return false // public IPv6`, and the docblock's promise of fail-closed behaviour was
+ * never true. The IPv6 branch now ALLOWLISTS: to be public an address must be recognisably
+ * global unicast (`2000::/3`), and anything unrecognised is private.
+ */
+
+import { isValidIPv6, expandIPv6 } from './ipv6LiteralSyntax.mjs';
+
+/**
+ * The embedded IPv4 of an IPv6 address that carries one, decoded by BIT POSITION.
+ *
+ * WHY THIS IS SEPARATE AND EXPLICIT. The embedded IPv4 is the address the socket will
+ * actually reach, so it must be classified as IPv4 — not as "IPv6, unrecognised". The
+ * old code handled exactly one notation (`::ffff:1.2.3.4`) and silently admitted every
+ * other, which is hostile review round 8 D4: `::ffff:0:7f00:1` IS `::ffff:0:127.0.0.1`,
+ * i.e. loopback, and it was classified public.
+ *
+ * Forms handled, all by their RFC-defined offsets rather than by string shape:
+ *   ::ffff:0:0/96   IPv4-mapped            last 32 bits (RFC 4291 §2.5.5.2)
+ *   ::/96           IPv4-compatible        last 32 bits (deprecated, still routable)
+ *   64:ff9b::/96    NAT64 well-known       last 32 bits (RFC 6052)
+ *   64:ff9b:1::/48  NAT64 local-use        last 32 bits
+ *   2002::/16       6to4                   bits 16-47 (RFC 3056)
+ *
+ * REWRITTEN AFTER ROUND 9 FINDING 1. The previous version pattern-matched raw spellings, so
+ * a compressed zero group changed the answer. Working on the expanded form removes that class
+ * of bug rather than adding another case to the list.
+ *
+ * @param {string} addr an unbracketed IPv6 literal
+ * @returns {string|null} the embedded dotted-quad, or null if the form embeds none
+ */
+function extractEmbeddedIPv4(addr) {
+  const expanded = expandIPv6(addr);
+  if (expanded === null) return null;
+
+  const g = expanded.split(':').map((x) => parseInt(x, 16));
+  const quad = (hi, lo) => `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
+  const isZeroPrefix = (n) => g.slice(0, n).every((x) => x === 0);
+
+  // 6to4 — 2002::/16, IPv4 in bits 16-47 (groups 1 and 2).
+  if (g[0] === 0x2002) return quad(g[1], g[2]);
+
+  // NAT64 well-known (64:ff9b::/96) and local-use (64:ff9b:1::/48): last 32 bits.
+  if (g[0] === 0x0064 && g[1] === 0xff9b) return quad(g[6], g[7]);
+
+  // IPv4-mapped ::ffff:0:0/96 — groups 0-4 zero, group 5 is ffff. Last 32 bits.
+  if (isZeroPrefix(5) && g[5] === 0xffff) return quad(g[6], g[7]);
+
+  // IPv4-compatible ::/96 — groups 0-5 zero (and not :: or ::1, which are handled upstream).
+  if (isZeroPrefix(6)) return quad(g[6], g[7]);
+
+  return null;
+}
+
+/**
+ * The positive test: is this IPv6 literal a *global unicast* address?
+ *
+ * Deliberately conservative and deliberately ALLOWLISTING. Every previous version of this
+ * classifier was denylisting — enumerate the bad ranges and call the rest public — which
+ * meant a range nobody thought of was silently public. That is how `::ffff:0:7f00:1` got
+ * through. Here the burden is inverted: an address is public only if it is recognisably
+ * in the global unicast space.
+ *
+ * `2000::/3` is the entire currently-assigned global unicast range (2000:: – 3fff:...).
+ * Addresses outside it are special-purpose by definition.
+ *
+ * ROUND 9 FINDING 1: the syntax check is NOT optional and must come first. Validating only
+ * the leading group admitted `2606:not-an-ip`. A string that is not an IPv6 address cannot
+ * be a publicly routable one.
+ *
+ * @param {string} addr an unbracketed IPv6 literal
+ * @returns {boolean} true only if the address is a legal address inside 2000::/3
+ */
+function isPubliclyRoutableIPv6(addr) {
+  if (!isValidIPv6(addr)) return false;  // not an address => not a public address
+  const [head] = addr.split(':');
+  if (!/^[0-9a-f]{1,4}$/i.test(head)) return false;   // leading '::' — not global unicast
+  const leading = parseInt(head, 16);
+  // 2000::/3 — the first three bits are 001, so the first group is 0x2000-0x3fff.
+  return leading >= 0x2000 && leading <= 0x3fff;
+}
+
+/**
+ * Reject any address that's NOT publicly routable.
+ *
+ * Covers IPv4 + IPv6:
+ *   - 127.0.0.0/8       loopback
+ *   - 10.0.0.0/8        RFC1918 private
+ *   - 172.16.0.0/12     RFC1918 private
+ *   - 192.168.0.0/16    RFC1918 private
+ *   - 169.254.0.0/16    link-local
+ *   - 100.64.0.0/10     CGNAT (carrier-grade NAT)
+ *   - 224.0.0.0/4       multicast (224.0.0.0 - 239.255.255.255)
+ *   - 0.0.0.0/8         "this network"
+ *   - 240.0.0.0/4       reserved (240.0.0.0 - 255.255.255.255 incl broadcast)
+ *   - ::                IPv6 unspecified
+ *   - ::1, 0::1, ::1 in any expanded form   IPv6 loopback
+ *   - ::ffff:a.b.c.d and ::ffff:hhhh:hhhh   IPv4-mapped IPv6 (BOTH notations)
+ *   - ::a.b.c.d and ::hhhh:hhhh             IPv4-COMPATIBLE IPv6 (deprecated)
+ *   - 64:ff9b::/96      NAT64 well-known prefix (embeds an IPv4)
+ *   - 64:ff9b:1::/48    NAT64 local-use prefix
+ *   - 2002::/16         IPv4-in-IPv6 6to4 (embeds an IPv4 in bits 16-47)
+ *   - fc00::/7          IPv6 ULA
+ *   - fe80::/10         IPv6 link-local
+ *   - ff00::/8          IPv6 multicast
+ *   - 100::/64          IPv6 discard-only
+ *   - 2001:db8::/32     IPv6 documentation
+ *
+ * Defaults to "private" on unknown / un-parseable input (fail-closed).
+ *
+ * THE IPv6 DEFAULT IS FAIL-CLOSED, AND THAT IS A FIX, NOT AN ORIGINAL PROPERTY.
+ * This branch used to `return false` ("public IPv6") for anything it did not
+ * positively recognise, while the docblock claimed fail-closed behaviour. Hostile
+ * review round 8 (2026-09-21, D2/D4) measured the gap and then found it was
+ * load-bearing: `resolveAndValidate` ADMITTED `https://[::ffff:0:127.0.0.1]/`
+ * because a bracketed literal escapes `net.isIP` (leaving the classifier as the only
+ * guard), `dns.lookup` normalises it to the HEX form `::ffff:0:7f00:1`, and the old
+ * mapped-IPv4 regex matched only the dotted form. Unrecognised no longer means public:
+ * `isPubliclyRoutableIPv6` now has to say yes explicitly.
+ */
+export function isPrivateOrLocalAddress(ip) {
+  if (typeof ip !== 'string' || ip.length === 0) return true;
+
+  // IPv6
+  if (ip.includes(':')) {
+    // Brackets are a URL-authority artefact, not part of the address, and `net.isIP`
+    // rejects them — so a bracketed literal arrives here as a "name". Strip first.
+    const addr = ip.startsWith('[') && ip.endsWith(']') ? ip.slice(1, -1) : ip;
+
+    if (addr === '::' || addr === '::1') return true;   // unspecified / loopback (canonical)
+    if (/^[fF][cCdD]/.test(addr)) return true;          // fc00::/7 ULA
+    // fe80::/10 link-local. Range covers fe80 - febf (NOT just fe80-fe89).
+    // Bug fix per Codex NH-4 — original /^[fF][eE]8/ missed fea0-febf.
+    if (/^[fF][eE][89aAbB]/.test(addr)) return true;    // fe80::/10 link-local
+    if (/^[fF][fF]/.test(addr)) return true;            // ff00::/8 multicast
+    if (/^100::/i.test(addr)) return true;              // 100::/64 discard-only
+    if (/^2001:0?[dD][bB]8:/i.test(addr)) return true;  // 2001:db8::/32 documentation
+
+    // IPv4-embedding IPv6 forms. These must be decoded BEFORE the generic check,
+    // because the embedded IPv4 is the address that will actually be reached.
+    const embedded = extractEmbeddedIPv4(addr);
+    if (embedded) return isPrivateOrLocalAddress(embedded);
+
+    // Everything else: only a positively-recognised global unicast address is public.
+    // Unrecognised is private. This is the fail-closed default the docblock always
+    // promised; see the note above.
+    return !isPubliclyRoutableIPv6(addr);
+  }
+
+  // IPv4
+  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
+  if (!m) return true; // can't parse → fail closed
+  const a = Number(m[1]);
+  const b = Number(m[2]);
+  // Every octet must be in range. The regex above accepts `8.8.8.999`, which is not an
+  // address at all — hostile review round 8 (D2) reached this via the IPv6 branch's
+  // `includes(':')` test, but the real defect is here: an out-of-range octet used to fall
+  // through to the "public IPv4" return. Un-parseable must mean private, as the docblock says.
+  if (m.slice(1).some((octet) => Number(octet) > 255)) return true;
+  if (a === 0) return true;                              // 0.0.0.0/8
+  if (a === 10) return true;                             // 10.0.0.0/8
+  if (a === 127) return true;                            // 127.0.0.0/8 loopback
+  if (a === 169 && b === 254) return true;               // 169.254.0.0/16 link-local
+  if (a === 172 && b >= 16 && b <= 31) return true;      // 172.16.0.0/12
+  if (a === 192 && b === 168) return true;               // 192.168.0.0/16
+  if (a === 100 && b >= 64 && b <= 127) return true;     // 100.64.0.0/10 CGNAT
+  if (a >= 224 && a <= 239) return true;                 // multicast
+  if (a >= 240) return true;                             // reserved + broadcast
+  return false;                                          // public IPv4
+}
diff --git a/backend/services/applaudAudioFetcher.mjs b/backend/services/applaudAudioFetcher.mjs
index 9146d6fde..e2b67d10f 100644
--- a/backend/services/applaudAudioFetcher.mjs
+++ b/backend/services/applaudAudioFetcher.mjs
@@ -27,6 +27,10 @@
  *   AudioFetchError(code, status) — HTTP fetch failures
  */
 import { promises as dns } from 'node:dns';
+// Imported for local use at line ~114 (the resolved-address rejection in `validateAudioUrl`)
+// AND re-exported at the foot of this file. A bare `export ... from` would not bind the name
+// in this module's scope, so a caller here would silently reference nothing.
+import { isPrivateOrLocalAddress } from './addressClassification.mjs';
 
 const DEFAULT_MAX_BYTES = 25 * 1024 * 1024; // 25 MB — matches PLAUD_MAX_FILE_BYTES
 const DEFAULT_TIMEOUT_MS = 30_000;          // 30s per §5.2
@@ -99,8 +103,24 @@ export async function validateAudioUrl(rawUrl, allowedBaseUrl) {
     throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', `port ${incoming.port || '(default)'} != allowed ${allowed.port || '(default)'}`);
   }
 
-  // 5. DNS resolution check — defeats DNS rebinding where allowed.com
-  //    resolves to 127.0.0.1 / 169.254.169.254 / 10.0.0.1 / etc.
+  // 5. DNS resolution check — every address the name resolves to is checked before the
+  //    fetch is allowed to proceed.
+  //
+  //    HONEST SCOPE (hostile review round 9, C8). An earlier version of this comment said
+  //    this "defeats DNS rebinding". It does not, on its own, and the difference matters.
+  //    This checks the result of ONE `dns.lookup`, then `fetchAudioWithCaps` below fetches
+  //    by HOSTNAME — which performs its OWN lookup. Between the two, a name whose TTL has
+  //    expired (or an attacker's resolver answering differently) can return a public address
+  //    here and a private one there. That is the TOCTOU window, and it is still open on this
+  //    path.
+  //
+  //    It is closed on the IMAGE path, which is the one that fetches user-supplied URLs:
+  //    `spotlightImageUrlPolicy.mjs` resolves once and hands a PINNED dispatcher (an
+  //    `undici.Agent` whose `connect.lookup` answers only from the pre-validated addresses)
+  //    to the request, so the socket cannot go anywhere the check did not see.
+  //
+  //    So: this is a real check and it stops the common case, but it is not a rebinding
+  //    defence and should not be described as one until an equivalent pin is wired here.
   let addrs;
   try {
     addrs = await dns.lookup(incoming.hostname, { all: true });
@@ -267,56 +287,10 @@ export async function fetchAudioWithCaps(audioUrl, declaredSizeBytes, opts = {})
   };
 }
 
-/**
- * Reject any address that's NOT publicly routable.
- *
- * Covers IPv4 + IPv6:
- *   - 127.0.0.0/8       loopback
- *   - 10.0.0.0/8        RFC1918 private
- *   - 172.16.0.0/12     RFC1918 private
- *   - 192.168.0.0/16    RFC1918 private
- *   - 169.254.0.0/16    link-local
- *   - 100.64.0.0/10     CGNAT (carrier-grade NAT)
- *   - 224.0.0.0/4       multicast (224.0.0.0 - 239.255.255.255)
- *   - 0.0.0.0/8         "this network"
- *   - 240.0.0.0/4       reserved (240.0.0.0 - 255.255.255.255 incl broadcast)
- *   - ::1               IPv6 loopback
- *   - fc00::/7          IPv6 ULA
- *   - fe80::/10         IPv6 link-local
- *   - ff00::/8          IPv6 multicast
- *
- * Defaults to "private" on unknown / un-parseable input (fail-closed).
- */
-export function isPrivateOrLocalAddress(ip) {
-  if (typeof ip !== 'string' || ip.length === 0) return true;
 
-  // IPv6
-  if (ip.includes(':')) {
-    if (ip === '::1' || ip === '::') return true;
-    if (/^[fF][cCdD]/.test(ip)) return true;            // fc00::/7 ULA
-    // fe80::/10 link-local. Range covers fe80 - febf (NOT just fe80-fe89).
-    // Bug fix per Codex NH-4 — original /^[fF][eE]8/ missed fea0-febf.
-    if (/^[fF][eE][89aAbB]/.test(ip)) return true;      // fe80::/10 link-local
-    if (/^[fF][fF]/.test(ip)) return true;              // ff00::/8 multicast
-    // IPv4-mapped IPv6 (::ffff:1.2.3.4) — extract and recurse
-    const v4mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
-    if (v4mapped) return isPrivateOrLocalAddress(v4mapped[1]);
-    return false; // public IPv6
-  }
-
-  // IPv4
-  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
-  if (!m) return true; // can't parse → fail closed
-  const a = Number(m[1]);
-  const b = Number(m[2]);
-  if (a === 0) return true;                              // 0.0.0.0/8
-  if (a === 10) return true;                             // 10.0.0.0/8
-  if (a === 127) return true;                            // 127.0.0.0/8 loopback
-  if (a === 169 && b === 254) return true;               // 169.254.0.0/16 link-local
-  if (a === 172 && b >= 16 && b <= 31) return true;      // 172.16.0.0/12
-  if (a === 192 && b === 168) return true;               // 192.168.0.0/16
-  if (a === 100 && b >= 64 && b <= 127) return true;     // 100.64.0.0/10 CGNAT
-  if (a >= 224 && a <= 239) return true;                 // multicast
-  if (a >= 240) return true;                             // reserved + broadcast
-  return false;                                          // public IPv4
-}
+// THE ADDRESS CLASSIFIER LIVES IN ITS OWN MODULE (2026-09-21). It was extracted to
+// `addressClassification.mjs` because this file had already breached `06-bans.md` #50
+// (322 lines at HEAD) and round 8's D2/D4 fix added more. Re-exported here so every
+// existing importer — including `tests/unit/plaudSlice53AudioFetcher.test.mjs`, which
+// imports the name from THIS module — keeps working unchanged.
+export { isPrivateOrLocalAddress } from './addressClassification.mjs';
diff --git a/backend/services/ipv6LiteralSyntax.mjs b/backend/services/ipv6LiteralSyntax.mjs
new file mode 100644
index 000000000..e6603338c
--- /dev/null
+++ b/backend/services/ipv6LiteralSyntax.mjs
@@ -0,0 +1,138 @@
+/**
+ * ipv6LiteralSyntax.mjs
+ * =====================
+ * IS THIS STRING AN IPv6 ADDRESS, AND WHAT DOES IT SAY? — syntax only, no policy.
+ *
+ * WHY THIS FILE EXISTS. Extracted from `addressClassification.mjs` on 2026-09-21, after
+ * hostile-review round 9 finding 1, when validating the address and deciding whether it is
+ * routable turned out to be two separate concerns that had been interleaved:
+ *
+ *   - **Syntax** (here): given a string, is it a legal IPv6 literal, and what bits does it
+ *     denote? This is a pure function of the string, with no opinion about safety.
+ *   - **Policy** (`addressClassification.mjs`): given a well-formed address, is it
+ *     publicly routable? That is a judgement, and it is the one that must fail closed.
+ *
+ * Mixing them is what produced round 9's finding 1 — classification consulted the raw
+ * spelling, so the answer depended on how the address was written rather than what it was.
+ *
+ * THE PROPERTY THIS MODULE EXISTS TO GUARANTEE. Two spellings of the same address must
+ * behave identically. `2002:7f00::1` and `2002:7f00:0::1` are one address; before this
+ * module they classified differently (public vs private), which is a bypass with extra
+ * steps. Every function here works on the EXPANDED 8-group form, so representation cannot
+ * reach the answer.
+ */
+
+/**
+ * The positive test: is this a *syntactically valid* IPv6 literal?
+ *
+ * IMPLEMENTED WITHOUT A DEPENDENCY, and deliberately strict: a full 8-group form, or a
+ * `::`-compressed form, with a trailing dotted quad permitted only where RFC 4291 allows
+ * one (as the final 32 bits). Anything else is NOT an address.
+ *
+ * WHY STRICTNESS IS THE WHOLE POINT. The previous validator checked only the first
+ * colon-separated group and never looked at the rest, so `2606:not-an-ip` was accepted as
+ * an address in `2000::/3` and classified PUBLIC. A string that is not an address cannot
+ * be a publicly routable address; "we could not parse it" must not read as "it is fine".
+ *
+ * @param {string} addr an unbracketed IPv6 literal
+ * @returns {boolean} true only if the string is a legal IPv6 address
+ */
+export function isValidIPv6(addr) {
+  if (typeof addr !== 'string' || addr.length === 0) return false;
+
+  // A trailing dotted quad is legal only as the LAST 32 bits (RFC 4291 §2.2). Split it off,
+  // validate it as IPv4, and treat it as two groups for the group-count arithmetic below.
+  let head = addr;
+  let dottedGroups = 0;
+  const dottedTail = addr.match(/^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
+  if (dottedTail) {
+    const octets = dottedTail[2].split('.');
+    if (octets.length !== 4) return false;
+    if (octets.some((o) => !/^\d{1,3}$/.test(o) || Number(o) > 255)) return false;
+    // NOTE THE TRAILING COLON. `(.*:)` is greedy, so group 1 of `::ffff:127.0.0.1` is
+    // `::ffff:` INCLUDING the separator colon. Leaving it on makes the group count wrong
+    // for every mixed-form address (`1:2:3:4:5:6:1.2.3.4`, a legal address Node accepts,
+    // was rejected as a result). Strip exactly that one colon.
+    head = dottedTail[1].replace(/:$/, '');
+    dottedGroups = 2; // an IPv4 tail occupies two 16-bit groups
+  } else if (addr.includes('.')) {
+    return false; // a dotted part that is not a clean trailing quad
+  }
+
+  // Strip exactly one leading/trailing colon pair from a `::` compression.
+  const hasDoubleColon = head.includes('::');
+  if (head.split('::').length > 2) return false; // more than one `::` is illegal
+
+  let groups;
+  if (hasDoubleColon) {
+    const [left, right] = head.split('::');
+    const parse = (part) => (part === '' ? [] : part.split(':'));
+    const l = parse(left);
+    const r = parse(right);
+    if (r.length && r[r.length - 1] === '') r.pop(); // trailing colon of `::` handled by split
+    // A `::` must stand for AT LEAST one elided group.
+    if (l.length + r.length + dottedGroups >= 8) return false;
+    groups = [...l, ...r];
+  } else {
+    groups = head.split(':');
+    // Without `::` the address must have exactly 8 groups (6 + a dotted tail's 2).
+    if (groups.length + dottedGroups !== 8) return false;
+  }
+
+  if (!groups.every((g) => /^[0-9a-f]{1,4}$/i.test(g))) return false;
+  return groups.length + dottedGroups <= 8;
+}
+
+/**
+ * Expand an IPv6 literal to its full 8-group hex form.
+ *
+ * WHY. Round 9 finding 1 showed that prefix parsing on the RAW string is representation-
+ * dependent: `2002:7f00::1` and `2002:7f00:0::1` are the same address, but a regex anchored
+ * on explicit groups matched only the second. Normalising first makes every downstream
+ * extraction a function of the ADDRESS rather than of how it was spelled.
+ *
+ * Returns null if the input is not a valid literal, so a caller cannot silently parse a
+ * malformed input. Callers that need to distinguish "not an address" from "an address that
+ * embeds no IPv4" check `isValidIPv6` first; `null` remains unambiguous for both.
+ *
+ * @param {string} addr a valid, unbracketed IPv6 literal
+ * @returns {string|null} 8 colon-separated 4-hex-digit groups, or null if invalid
+ */
+export function expandIPv6(addr) {
+  if (!isValidIPv6(addr)) return null;
+
+  let head = addr;
+  let tailGroups = [];
+  const dottedTail = addr.match(/^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
+  if (dottedTail) {
+    // NOTE THE TRAILING COLON. `(.*:)` is greedy, so group 1 of `::ffff:127.0.0.1` is
+    // `::ffff:` INCLUDING the separator colon. Leaving it on splits to a trailing empty
+    // group, which silently added a phantom group and shifted every fill count — the
+    // `::ffff:127.0.0.1` -> `...:ffff:0000:7f00:0001` bug. Strip it here, once.
+    head = dottedTail[1].replace(/:$/, '');
+    const [a, b, c, d] = dottedTail[2].split('.').map(Number);
+    tailGroups = [
+      (((a << 8) | b) >>> 0).toString(16),
+      (((c << 8) | d) >>> 0).toString(16),
+    ];
+  }
+
+  let groups;
+  if (head.includes('::')) {
+    // `::ffff:127.0.0.1` splits to left `::ffff` / right `127.0.0.1`, and the dotted tail
+    // has ALREADY been peeled off into tailGroups — so the right side parses to [].
+    const [left, right] = head.split('::');
+    const parse = (part) => (part === '' ? [] : part.split(':'));
+    const l = parse(left);
+    const r = parse(right);
+    const fill = 8 - tailGroups.length - l.length - r.length;
+    if (fill < 1 || fill > 7) return null;
+    groups = [...l, ...Array(fill).fill('0'), ...r];
+  } else {
+    groups = head.split(':');
+  }
+
+  const all = [...groups, ...tailGroups];
+  if (all.length !== 8) return null;
+  return all.map((g) => g.padStart(4, '0').toLowerCase()).join(':');
+}
diff --git a/backend/services/spotlightImageDecode.mjs b/backend/services/spotlightImageDecode.mjs
new file mode 100644
index 000000000..07bad5301
--- /dev/null
+++ b/backend/services/spotlightImageDecode.mjs
@@ -0,0 +1,99 @@
+/**
+ * spotlightImageDecode.mjs
+ * ========================
+ * PROVE THE BYTES ARE AN IMAGE, THEN RE-ENCODE THEM.
+ *
+ * WHY THIS FILE EXISTS. Extracted from `spotlightImageFetch.mjs` on 2026-09-21, when the
+ * round-9 finding-2 fix (releasing the body on the mid-read error path, which added the one
+ * comment that pushed that file to exactly 300 lines) breached `06-bans.md` #50. The seam was
+ * already there and is the honest one: everything left in `spotlightImageFetch.mjs` is about
+ * TRANSPORT — admission, the pinned socket, the read caps. Nothing here touches the network.
+ *
+ * `decodeSpotlightImage` is RE-EXPORTED from `spotlightImageFetch.mjs`, so every existing
+ * importer and its tests are untouched by the move. That matters: the extraction was forced by
+ * a line limit, and a line limit is not a reason to change anyone's import.
+ */
+
+import sharp from 'sharp';
+import { sniffFileType } from './photoStorageService.mjs';
+// The error type lives with the URL policy; importing it here does NOT create a cycle, because
+// `spotlightImageUrlPolicy.mjs` never imports this file. The dependency runs one way:
+// policy -> decode -> fetch, with fetch re-exporting both.
+import { SpotlightImageError } from './spotlightImageUrlPolicy.mjs';
+
+/** Reject an image whose decoded pixel count exceeds this. */
+export const MAX_IMAGE_PIXELS = 16_000_000;
+
+/** Longest edge of the stored artefact, in pixels. */
+export const MAX_STORED_EDGE = 1600;
+
+/** Raster formats we will store. `sniffFileType` also recognises mp4/webm/avi/pdf. */
+const RASTER_EXT = new Set(['jpg', 'png', 'gif', 'webp', 'heic']);
+
+/**
+ * Prove the bytes really are a single-frame raster image, then re-encode them.
+ *
+ * Three things happen here, and each is a control rather than a tidy-up:
+ *   1. `sniffFileType` reads the magic bytes. The declared Content-Type is
+ *      attacker-controlled and is not consulted. SVG is not in the signature table, so
+ *      it is rejected here — an SVG served from our own R2 domain is stored XSS.
+ *   2. `sharp` decodes it. A file that sniffs as PNG but does not decode is a polyglot,
+ *      and this is where it dies. `limitInputPixels` makes the decode itself bounded.
+ *   3. Re-encode. Strips EXIF (including GPS — this is a fitness app), normalises the
+ *      stored artefact, and guarantees the bytes we serve are bytes we produced.
+ *
+ * @param {Buffer} buffer raw bytes from the network
+ * @param {{maxPixels?: number, maxEdge?: number}} [opts]
+ * @returns {Promise<{buffer: Buffer, contentType: string, ext: string}>}
+ * @throws {SpotlightImageError}
+ */
+export async function decodeSpotlightImage(buffer, opts = {}) {
+  const { maxPixels = MAX_IMAGE_PIXELS, maxEdge = MAX_STORED_EDGE } = opts;
+
+  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
+    throw new SpotlightImageError('IMAGE_EMPTY', 'no bytes to decode');
+  }
+
+  const sniffed = sniffFileType(buffer);
+  if (!sniffed) {
+    throw new SpotlightImageError('IMAGE_TYPE_REJECTED', 'bytes match no accepted image signature');
+  }
+  if (!RASTER_EXT.has(sniffed.ext)) {
+    // sniffFileType also recognises mp4/webm/avi/pdf — valid uploads elsewhere, not here.
+    throw new SpotlightImageError('IMAGE_TYPE_REJECTED', `not a raster image: ${sniffed.ext}`);
+  }
+
+  let metadata;
+  try {
+    metadata = await sharp(buffer, { limitInputPixels: maxPixels }).metadata();
+  } catch (err) {
+    throw new SpotlightImageError('IMAGE_DECODE_FAILED', err.message);
+  }
+
+  if (!metadata?.width || !metadata?.height) {
+    throw new SpotlightImageError('IMAGE_DECODE_FAILED', 'no dimensions');
+  }
+  if (metadata.width * metadata.height > maxPixels) {
+    throw new SpotlightImageError('IMAGE_TOO_LARGE', `${metadata.width}x${metadata.height} exceeds ${maxPixels} px`);
+  }
+  // An animated image is a frame budget, not an image. `pages` is 1 for stills.
+  if (Number(metadata.pages) > 1) {
+    throw new SpotlightImageError('IMAGE_ANIMATION_REJECTED', `${metadata.pages} frames`);
+  }
+
+  // Preserve alpha by choosing PNG; otherwise JPEG, which is far smaller for photographs.
+  const pipeline = sharp(buffer, { limitInputPixels: maxPixels })
+    .rotate() // bake EXIF orientation in before the metadata that carries it is dropped
+    .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true });
+
+  const keepAlpha = Boolean(metadata.hasAlpha);
+  const outBuffer = keepAlpha
+    ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
+    : await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
+
+  return {
+    buffer: outBuffer,
+    contentType: keepAlpha ? 'image/png' : 'image/jpeg',
+    ext: keepAlpha ? 'png' : 'jpg',
+  };
+}
diff --git a/backend/services/spotlightImageFetch.mjs b/backend/services/spotlightImageFetch.mjs
index 71b0bb802..6edc83524 100644
--- a/backend/services/spotlightImageFetch.mjs
+++ b/backend/services/spotlightImageFetch.mjs
@@ -28,34 +28,30 @@
  * throws SpotlightImageError; the caller maps any failure to `imageUrl = null`. A
  * dropped Spotlight is worse than an imageless one (blueprint ban #4).
  */
-import sharp from 'sharp';
 import logger from '../utils/logger.mjs';
-import { sniffFileType } from './photoStorageService.mjs';
 import {
   SpotlightImageError,
   DNS_LOOKUP_TIMEOUT_MS,
   validateSpotlightImageUrl,
+  resolveAndValidate,
+  createPinnedDispatcher,
 } from './spotlightImageUrlPolicy.mjs';
+import { decodeSpotlightImage, MAX_IMAGE_PIXELS, MAX_STORED_EDGE } from './spotlightImageDecode.mjs';
 
-// RE-EXPORTED, so every existing importer keeps working after the extraction. The split was forced
-// by `06-bans.md` #50 ("no source file reaches 300 lines"), not by design: URL admission lives in
-// `spotlightImageUrlPolicy.mjs`, transport and decode live here.
+// RE-EXPORTED, so every existing importer keeps working after the extractions. Both splits were
+// forced by `06-bans.md` #50 ("no source file reaches 300 lines"), not by design: URL admission
+// lives in `spotlightImageUrlPolicy.mjs`, the byte-level decode in `spotlightImageDecode.mjs`,
+// and TRANSPORT — the pinned socket and the read caps — is what remains here.
 export { SpotlightImageError, DNS_LOOKUP_TIMEOUT_MS, validateSpotlightImageUrl };
+export { decodeSpotlightImage, MAX_IMAGE_PIXELS, MAX_STORED_EDGE };
 
 /** 5 MiB compressed input — the ceiling on what we will read off the wire. */
 export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
-/** 16 MP decoded — a decompression bomb is cheap to send and expensive to decode. */
-export const MAX_IMAGE_PIXELS = 16_000_000;
 /** Total budget for connect + headers + body. */
 export const IMAGE_FETCH_TIMEOUT_MS = 5_000;
-/** Longest edge of the stored artefact. */
-export const MAX_STORED_EDGE = 1600;
-
-/** Types `sniffFileType` may return that are acceptable as a Spotlight image. */
-const RASTER_EXT = new Set(['jpg', 'png', 'gif', 'webp', 'heic']);
 
 /**
- * Fetch an image with `redirect: 'error'` and a streamed byte cap.
+ * Fetch an image with `redirect: 'error'`, a pinned connect, and a streamed byte cap.
  * Returns { ok: true, bytes, contentType } or { ok: false, code, message } — never throws.
  */
 export async function fetchSpotlightImage(rawUrl, opts = {}) {
@@ -63,36 +59,98 @@ export async function fetchSpotlightImage(rawUrl, opts = {}) {
     maxBytes = MAX_IMAGE_BYTES,
     timeoutMs = IMAGE_FETCH_TIMEOUT_MS,
     fetchImpl = globalThis.fetch,
+    // Injectable so a test can OBSERVE the dispatcher's lifetime rather than infer it. The
+    // D1 defect (hostile review round 8) was an ordering bug — the pool was closed before
+    // the body was settled — and ordering is only visible to a caller that holds the object.
+    // Defaults to the real factory, so every production caller is unaffected.
+    dispatcherFactory = createPinnedDispatcher,
   } = opts;
 
+  // Admission returns the addresses it approved, not merely a verdict. Passing a bare URL onward
+  // would let the transport resolve the name a second time — the TOCTOU this pin exists to close.
   let url;
+  let addrs;
   try {
-    url = await validateSpotlightImageUrl(rawUrl);
+    ({ url, addrs } = await resolveAndValidate(rawUrl));
   } catch (err) {
     return { ok: false, code: err.code || 'IMAGE_URL_INVALID', message: err.message };
   }
 
-  let response;
+  // The socket may only go where the check looked.
+  let dispatcher;
   try {
-    response = await fetchImpl(url.toString(), {
-      method: 'GET',
-      // THE FIX. Following a redirect re-enters the network with a URL that was never
-      // validated — the protocol/host/DNS checks above only ever saw the first hop.
-      redirect: 'error',
-      signal: AbortSignal.timeout(timeoutMs),
-      headers: { accept: 'image/*' },
-    });
+    dispatcher = dispatcherFactory(addrs);
   } catch (err) {
-    const msg = err?.message || '';
-    if (err?.code === 'UND_ERR_RES_EXCEEDED_MAX_REDIRECTS' || /redirect/i.test(msg)) {
-      return { ok: false, code: 'IMAGE_URL_REDIRECT_REJECTED', message: msg || 'redirect rejected' };
-    }
-    if (err?.name === 'TimeoutError' || err?.name === 'AbortError' || /timeout|aborted/i.test(msg)) {
-      return { ok: false, code: 'IMAGE_FETCH_TIMEOUT', message: 'image fetch timed out' };
+    return { ok: false, code: err.code || 'IMAGE_URL_INVALID', message: err.message };
+  }
+
+  // THE AGENT IS A LIVE SOCKET POOL, AND ITS LIFETIME IS THE WHOLE OPERATION — NOT JUST THE HEADERS.
+  //
+  // WHAT WAS WRONG (hostile review round 8, D1 — graded HIGH). This used to be a `finally` that
+  // awaited `dispatcher.close()` the moment `fetch()` returned, i.e. as soon as the RESPONSE HEADERS
+  // had arrived. But `fetch()` resolves while the BODY may still be streaming, and every path below
+  // — the 4xx/5xx cancel, the declared-size cancel, the streamed read — was therefore reached only
+  // AFTER the pool had been asked to shut down. `close()` drains idle sockets "once in-flight
+  // requests settle", and a body still being read IS an in-flight request, so the order made the
+  // shutdown wait on the very body this function was about to cancel. Wrong by construction:
+  // settlement first, then closure.
+  //
+  // WHAT REPLACES IT. The close now happens in the `finally` of a block that wraps the ENTIRE
+  // fetch-and-body operation, and the body is settled explicitly on every path (`settleBody`)
+  // before that `finally` runs. So the pool closes over a body that has already been consumed,
+  // cancelled, or abandoned by an aborted signal.
+  const closeDispatcher = async () => {
+    try { await dispatcher.close(); } catch { /* close is best-effort */ }
+  };
+
+  let response;
+  try {
+    try {
+      response = await fetchImpl(url.toString(), {
+        method: 'GET',
+        // THE FIRST-HOP FIX. Following a redirect re-enters the network with a URL that was never
+        // validated — the protocol/host/DNS checks above only ever saw the first hop.
+        redirect: 'error',
+        // THE CONNECT FIX. The agent answers `connect.lookup` from the validated addresses, so the
+        // name is not resolved a second time and cannot flip to a private address between the check
+        // and the socket. `redirect: 'error'` above is what keeps the connected host the validated
+        // host — together they mean there is no unvalidated hop (DNS-rebinding TOCTOU, closed).
+        dispatcher,
+        signal: AbortSignal.timeout(timeoutMs),
+        headers: { accept: 'image/*' },
+      });
+    } catch (err) {
+      const msg = err?.message || '';
+      if (err?.code === 'UND_ERR_RES_EXCEEDED_MAX_REDIRECTS' || /redirect/i.test(msg)) {
+        return { ok: false, code: 'IMAGE_URL_REDIRECT_REJECTED', message: msg || 'redirect rejected' };
+      }
+      if (err?.name === 'TimeoutError' || err?.name === 'AbortError' || /timeout|aborted/i.test(msg)) {
+        return { ok: false, code: 'IMAGE_FETCH_TIMEOUT', message: 'image fetch timed out' };
+      }
+      return { ok: false, code: 'IMAGE_FETCH_FAILED', message: msg || 'image fetch failed' };
     }
-    return { ok: false, code: 'IMAGE_FETCH_FAILED', message: msg || 'image fetch failed' };
+
+    return await readImageBody(response, { maxBytes });
+  } finally {
+    // Runs after `readImageBody` has settled the body on every path — consumed, cancelled, or
+    // aborted. This is the ordering the old code had backwards.
+    await closeDispatcher();
   }
+}
 
+/**
+ * Turn an already-headed response into bytes, settling its body before this returns.
+ *
+ * Split out of `fetchSpotlightImage` so the dispatcher's `finally` can wrap this whole unit: the
+ * pool must not be closed while a body is still being read (hostile review round 8, D1).
+ * Every exit path either consumes the stream to completion or cancels it, and `cancel` on an
+ * already-errored stream is itself best-effort.
+ *
+ * @param {Response} response
+ * @param {{ maxBytes: number }} opts
+ * @returns {Promise<{ ok: true, bytes: Buffer, contentType: string } | { ok: false, code: string, message: string }>}
+ */
+async function readImageBody(response, { maxBytes }) {
   if (!response.ok) {
     // RELEASE THE SOCKET. Returning here without draining or cancelling leaves the response body
     // open until GC, so an upstream that answers 4xx/5xx with a large body holds one connection
@@ -117,8 +175,11 @@ export async function fetchSpotlightImage(rawUrl, opts = {}) {
 
   const chunks = [];
   let total = 0;
+  // Declared OUTSIDE the try so the catch can reach it. The correct release for a stream that
+  // threw mid-read is the READER's cancel, not the body's — see the catch.
+  let reader;
   try {
-    const reader = response.body.getReader();
+    reader = response.body.getReader();
     for (;;) {
       const { done, value } = await reader.read();
       if (done) break;
@@ -134,6 +195,18 @@ export async function fetchSpotlightImage(rawUrl, opts = {}) {
       chunks.push(chunk);
     }
   } catch (err) {
+    // RELEASE THE READER, NOT THE BODY (hostile review round 9, finding 2 — corrected).
+    //
+    // The first version of this fix called `response.body.cancel(...)`. It looked right and it
+    // NEVER WORKED: once `getReader()` has been called the body is LOCKED, so `body.cancel()`
+    // throws `Invalid state: ReadableStream is locked` and the empty catch swallowed it. The
+    // socket stayed open, and — worse — the empty catch made the release look handled. A test
+    // that recorded "cancel was attempted" passed; only recording "cancel SETTLED" exposed it.
+    //
+    // `reader.cancel()` is the call that actually releases a locked stream, and `reader` is in
+    // scope here because it is declared outside the try. This also matches the over-cap path
+    // above, which cancels through the reader for the same reason.
+    try { await reader?.cancel('stream read failed'); } catch { /* release is best-effort */ }
     return { ok: false, code: 'IMAGE_FETCH_FAILED', message: `stream read failed: ${err.message}` };
   }
 
@@ -144,71 +217,6 @@ export async function fetchSpotlightImage(rawUrl, opts = {}) {
   };
 }
 
-/**
- * Prove the bytes really are a single-frame raster image, then re-encode them.
- *
- * Three things happen here, and each is a control rather than a tidy-up:
- *   1. `sniffFileType` reads the magic bytes. The declared Content-Type is
- *      attacker-controlled and is not consulted. SVG is not in the signature table, so
- *      it is rejected here — an SVG served from our own R2 domain is stored XSS.
- *   2. `sharp` decodes it. A file that sniffs as PNG but does not decode is a polyglot,
- *      and this is where it dies. `limitInputPixels` makes the decode itself bounded.
- *   3. Re-encode. Strips EXIF (including GPS — this is a fitness app), normalises the
- *      stored artefact, and guarantees the bytes we serve are bytes we produced.
- *
- * @returns {Promise<{buffer: Buffer, contentType: string, ext: string}>}
- * @throws {SpotlightImageError}
- */
-export async function decodeSpotlightImage(buffer, opts = {}) {
-  const { maxPixels = MAX_IMAGE_PIXELS, maxEdge = MAX_STORED_EDGE } = opts;
-
-  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
-    throw new SpotlightImageError('IMAGE_EMPTY', 'no bytes to decode');
-  }
-
-  const sniffed = sniffFileType(buffer);
-  if (!sniffed) {
-    throw new SpotlightImageError('IMAGE_TYPE_REJECTED', 'bytes match no accepted image signature');
-  }
-  if (!RASTER_EXT.has(sniffed.ext)) {
-    // sniffFileType also recognises mp4/webm/avi/pdf — valid uploads elsewhere, not here.
-    throw new SpotlightImageError('IMAGE_TYPE_REJECTED', `not a raster image: ${sniffed.ext}`);
-  }
-
-  let metadata;
-  try {
-    metadata = await sharp(buffer, { limitInputPixels: maxPixels }).metadata();
-  } catch (err) {
-    throw new SpotlightImageError('IMAGE_DECODE_FAILED', err.message);
-  }
-
-  if (!metadata?.width || !metadata?.height) {
-    throw new SpotlightImageError('IMAGE_DECODE_FAILED', 'no dimensions');
-  }
-  if (metadata.width * metadata.height > maxPixels) {
-    throw new SpotlightImageError('IMAGE_TOO_LARGE', `${metadata.width}x${metadata.height} exceeds ${maxPixels} px`);
-  }
-  // An animated image is a frame budget, not an image. `pages` is 1 for stills.
-  if (Number(metadata.pages) > 1) {
-    throw new SpotlightImageError('IMAGE_ANIMATION_REJECTED', `${metadata.pages} frames`);
-  }
-
-  // Preserve alpha by choosing PNG; otherwise JPEG, which is far smaller for photographs.
-  const pipeline = sharp(buffer, { limitInputPixels: maxPixels })
-    .rotate() // bake EXIF orientation in before the metadata that carries it is dropped
-    .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true });
-
-  const keepAlpha = Boolean(metadata.hasAlpha);
-  const outBuffer = keepAlpha
-    ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
-    : await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
-
-  return {
-    buffer: outBuffer,
-    contentType: keepAlpha ? 'image/png' : 'image/jpeg',
-    ext: keepAlpha ? 'png' : 'jpg',
-  };
-}
 
 /**
  * One call for the route: validate → fetch → decode.
diff --git a/backend/services/spotlightImageUrlPolicy.mjs b/backend/services/spotlightImageUrlPolicy.mjs
index 81274085e..479bbda45 100644
--- a/backend/services/spotlightImageUrlPolicy.mjs
+++ b/backend/services/spotlightImageUrlPolicy.mjs
@@ -18,8 +18,17 @@
  *
  * The private-range table is IMPORTED, never re-implemented — two copies of that table is the
  * failure mode, not the fix.
+ *
+ * THE PREFIX PIN (2026-09-21). The first version of this module resolved, validated, and then
+ * THREW THE ADDRESSES AWAY — so the later `fetch()` re-resolved the same name independently and a
+ * name that flipped between the two lookups reached a private address anyway (DNS-rebinding TOCTOU).
+ * `resolveAndValidate` now RETURNS the validated addresses, and `createPinnedDispatcher` turns them
+ * into an `undici.Agent` whose `connect.lookup` answers from that fixed set. The socket can only go
+ * where the check looked. See the pin note further down for the honest residual.
  */
 import { promises as dns } from 'node:dns';
+import net from 'node:net';
+import { Agent } from 'undici';
 import { isPrivateOrLocalAddress } from './applaudAudioFetcher.mjs';
 
 export class SpotlightImageError extends Error {
@@ -45,6 +54,21 @@ export const DNS_LOOKUP_TIMEOUT_MS = 3_000;
  * `dns.lookup` accepts no AbortSignal, so the lookup is bounded by racing it against a timer.
  * The timer is cleared in `finally`, so a fast lookup leaves no pending handle behind — and a
  * timer that outlived its race would keep the process alive for no reason.
+ *
+ * WHAT THE BOUND DOES AND DOES NOT DO (hostile review round 8, C10 item 3; re-measured round 9).
+ * It bounds the CALLER'S WAIT. It does NOT stop the resolver. `dns.promises.lookup(hostname,
+ * options)` takes no signal and returns a bare Promise — verified on this host: the signature is
+ * `function lookup(hostname, options)`, and it mentions no `AbortSignal`. `Promise.race` therefore
+ * releases this function while the underlying libuv threadpool lookup is still outstanding, and a
+ * lookup that never answers can hold a threadpool slot (default size 4) past this call's return.
+ *
+ * HONEST LIMIT ON THAT CLAIM. The source-level fact is decided above. The RUNTIME consequence —
+ * that a hung lookup measurably starves the pool — was NOT reproduced here: every probe name on
+ * this host resolved or failed within ~58ms, so no lookup could be kept pending long enough to
+ * measure. The claim is CONFIRMED as a source fact and UNPROVEN as a measured impact, and is
+ * recorded that way rather than inflated. No cancellation is implemented, because none can be
+ * added additively: `dns.resolve*` is a different operation (no `/etc/hosts`, no OS resolver) and
+ * the callback form would change the shape callers depend on.
  */
 const lookupWithTimeout = async (hostname, ms) => {
   let timer;
@@ -75,7 +99,25 @@ const lookupWithTimeout = async (hostname, ms) => {
  * @returns {Promise<URL>} the parsed URL
  * @throws {SpotlightImageError}
  */
-export async function validateSpotlightImageUrl(rawUrl, { dnsTimeoutMs = DNS_LOOKUP_TIMEOUT_MS } = {}) {
+export async function validateSpotlightImageUrl(rawUrl, opts) {
+  const { url } = await resolveAndValidate(rawUrl, opts);
+  return url;
+}
+
+/**
+ * The full admission result: the parsed URL AND the addresses it was admitted on.
+ *
+ * This exists as a separate export because the two facts travel together — a caller that validates
+ * but does not pin has only a check, not a control. `validateSpotlightImageUrl` is kept as the
+ * URL-only front door so the twelve existing call sites and the re-export in
+ * `spotlightImageFetch.mjs` are untouched; the fetch path calls THIS one.
+ *
+ * @param {string} rawUrl
+ * @param {{ dnsTimeoutMs?: number }} [opts]
+ * @returns {Promise<{ url: URL, addrs: Array<{ address: string, family: number }> }>}
+ * @throws {SpotlightImageError}
+ */
+export async function resolveAndValidate(rawUrl, { dnsTimeoutMs = DNS_LOOKUP_TIMEOUT_MS } = {}) {
   let incoming;
   try {
     incoming = new URL(String(rawUrl));
@@ -94,16 +136,32 @@ export async function validateSpotlightImageUrl(rawUrl, { dnsTimeoutMs = DNS_LOO
     throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', 'credentials in URL not allowed');
   }
 
+  // An IP-literal host (`https://10.0.0.1/`) has no name to resolve, and `dns.lookup` on a literal
+  // returns the literal — so it is validated here directly and pinned as itself. Without this the
+  // literal case would take the lookup path and depend on resolver behaviour for a value that was
+  // never a name.
+  //
+  // STRIP THE BRACKETS FIRST (hostile review round 8, D4). `URL.hostname` KEEPS the brackets on an
+  // IPv6 authority — `new URL('https://[::1]/').hostname === '[::1]'` — and `net.isIP('[::1]')` is
+  // **0**, so every IPv6 literal used to fall past this branch and take the DNS path. That was not
+  // harmless: `dns.lookup` normalises the address, and the classifier below only recognised the
+  // DOTTED IPv4-mapped form, so `https://[::ffff:0:127.0.0.1]/` — a loopback literal — was
+  // ADMITTED and pinned as `::ffff:0:7f00:1`. The classifier's fail-closed inversion closes that
+  // too; this stripping is the second half, so a literal is classified AS a literal rather than
+  // depending on how a resolver happens to normalise it.
+  const hostname = incoming.hostname.startsWith('[') && incoming.hostname.endsWith(']')
+    ? incoming.hostname.slice(1, -1)
+    : incoming.hostname;
+  const literalFamily = net.isIP(hostname);
+  if (literalFamily) {
+    if (isPrivateOrLocalAddress(hostname)) {
+      throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', `host is a private/local address ${hostname}`);
+    }
+    return { url: incoming, addrs: [{ address: hostname, family: literalFamily }] };
+  }
+
   // Resolve first, then reject. A name that resolves to 127.0.0.1 / 169.254.169.254 / 10.x
   // is refused before any socket is opened, which closes direct internal targeting.
-  //
-  // NOTE — this is a check-time validation only, NOT a complete DNS-rebinding defence:
-  // the fetch() below re-resolves the hostname, so a name that flips to a private address
-  // between this lookup and the fetch would still be reached (TOCTOU). That residual gap is
-  // accepted because every caller of this path is gated behind a valid HMAC signature — and the
-  // HMAC authenticates the SENDER, not the remote image server it names. Documented as an open
-  // residual risk in `04-build-order.md#rehostImage` rather than claimed as closed
-  // (hostile review D4 / F08).
   let addrs;
   try {
     addrs = await lookupWithTimeout(incoming.hostname, dnsTimeoutMs);
@@ -122,5 +180,63 @@ export async function validateSpotlightImageUrl(rawUrl, { dnsTimeoutMs = DNS_LOO
     }
   }
 
-  return incoming;
+  return { url: incoming, addrs };
+}
+
+/**
+ * The `connect.lookup` hook that answers from a fixed address set, exported so its contract can
+ * be tested directly rather than by reaching into `undici`'s internals.
+ *
+ * The signature is `net`'s: `lookup(hostname, options, callback)`. Two answer shapes exist
+ * because `net` calls it both ways — `{ all: true }` expects an array of `{address, family}`,
+ * otherwise a bare address plus a separate family argument. Answering only one shape would make
+ * the pin work for one caller and silently fall through for the other.
+ *
+ * `hostname` is deliberately ignored. The whole point is that the name carries no authority at
+ * this layer — the decision was made upstream, and this hook has no second opinion to offer.
+ *
+ * @param {Array<{ address: string, family: number }>} addrs
+ * @returns {(hostname: string, options: object, callback: Function) => void}
+ */
+export function createPinnedLookup(addrs) {
+  const pinned = addrs.map(({ address, family }) => ({ address, family }));
+  return (_hostname, options, callback) => {
+    if (options?.all) return callback(null, pinned);
+    const first = pinned[0];
+    return callback(null, first.address, first.family);
+  };
+}
+
+/**
+ * Turn a validated address set into a dispatcher that can ONLY connect to that set.
+ *
+ * WHY. Validating and then calling a plain `fetch()` leaves a TOCTOU window: `fetch` resolves the
+ * hostname again, independently, so a name that was public at check time can answer with a private
+ * address at connect time. Pinning the answer inside `connect.lookup` closes the window at the
+ * layer that actually opens the socket — the connection is handed the addresses the check approved
+ * and has no second opinion available to it.
+ *
+ * THE HONEST RESIDUAL. This pins the CONNECT for the host we validated. It does not, by itself,
+ * cover a `Location:` redirect to a different host — that is handled one layer up by
+ * `redirect: 'error'` in `spotlightImageFetch.mjs`, which refuses to follow any redirect at all.
+ * The two controls are complementary: this one makes the first hop honest, that one prevents a
+ * second hop from existing. Neither is a defence for a caller that ignores it.
+ *
+ * The agent is a live socket pool, so the CALLER MUST `close()` it. `close()` is on the returned
+ * object (it is a real `Agent`), and closing drains idle sockets and lets the event loop exit.
+ *
+ * @param {Array<{ address: string, family: number }>} addrs validated addresses
+ * @returns {Agent} a dispatcher pinned to `addrs`
+ */
+export function createPinnedDispatcher(addrs) {
+  if (!Array.isArray(addrs) || addrs.length === 0) {
+    // Fail closed. A dispatcher with no addresses would fall through to the system resolver, which
+    // is precisely the behaviour this function exists to prevent.
+    throw new SpotlightImageError('IMAGE_URL_DNS_FAILED', 'cannot pin an empty address set');
+  }
+
+  // `connect.lookup` is the same hook `net`/`tls` expose: it is asked to resolve the hostname
+  // immediately before the socket is opened, and its answer is used verbatim. Answering from the
+  // validated set means no resolver is consulted on this connection at all.
+  return new Agent({ connect: { lookup: createPinnedLookup(addrs) } });
 }
diff --git a/backend/tests/helpers/spotlightImageFixtures.mjs b/backend/tests/helpers/spotlightImageFixtures.mjs
index d2de17a7c..f326b7eaa 100644
--- a/backend/tests/helpers/spotlightImageFixtures.mjs
+++ b/backend/tests/helpers/spotlightImageFixtures.mjs
@@ -4,10 +4,24 @@
  * Extracted so the two suites that use them stay inside the repo's 299-line limit.
  * Nothing here is a test, and this directory sits outside the test-file glob.
  *
- * These are deliberately REAL artefacts, not stubs. A mocked `fetch` returning a plain
- * object would not exercise the streamed byte cap, and a fake image buffer would not
- * exercise the decoder. The DNS mock is the only stub, because resolving a name to
- * 127.0.0.1 is precisely the behaviour under test.
+ * WHICH PARTS ARE REAL, AND WHICH ARE NOT (corrected after hostile review round 9, C8).
+ *
+ * REAL: the HTTP transport (real `http` servers on loopback — the decision point in the
+ * transport tests is the network, not an assertion about a mock's shape), the response
+ * BODIES (real `Readable` streams, so the streamed byte cap and the cancellation paths are
+ * exercised as streams), and the images (`sharp` generates real encodable bytes, so the
+ * decoder decodes rather than being told it succeeded).
+ *
+ * MOCKED, and it matters which: **`dns.lookup`**. `mockDns`, `mockDnsFail` and `mockDnsHang`
+ * replace it outright. An earlier version of this header said "these are deliberately REAL
+ * artefacts, not stubs" without that qualification, which read as a claim the file does not
+ * have. The honest statement is: everything except name resolution is real.
+ *
+ * WHAT THE MOCK DOES AND DOES NOT ESTABLISH. It establishes what the code does GIVEN a
+ * resolution result — the admission decision, the pin's address set, the behaviour when the
+ * resolver fails or hangs. It cannot establish that a real resolver returns what the mock
+ * claims, so no test here is evidence about real DNS. In particular a rebinding attack is
+ * represented by choosing mock values, not by performing one.
  */
 import { vi } from 'vitest';
 import * as dnsModule from 'node:dns';
@@ -44,6 +58,29 @@ export function cancellableStreamResponse(chunks, { status = 200, headers = {} }
   return { ok: status >= 200 && status < 300, status, headers: new Headers(headers), body, cancels };
 }
 
+/**
+ * A response whose stream EMITS some chunks and then ERRORS mid-read, recording cancellation.
+ *
+ * WHY THE ERRORING CASE NEEDS ITS OWN FIXTURE (hostile review round 9, finding 2). A stream
+ * that closes cleanly and a stream that throws are different code paths in `readImageBody`:
+ * the first exits the read loop via `done`, the second via `catch`. The suite had fixtures for
+ * "over the cap" and "not ok" and could show cancellation on both, but nothing that errored
+ * mid-read — which is exactly the path that used to skip the release. `cancels` is the
+ * evidence: an entry here means the body was released, not merely dropped.
+ */
+export function erroringStreamResponse(chunks, { status = 200, headers = {}, error = 'ECONNRESET' } = {}) {
+  const cancels = [];
+  let i = 0;
+  const body = new ReadableStream({
+    pull(controller) {
+      if (i < chunks.length) controller.enqueue(new Uint8Array(chunks[i++]));
+      else controller.error(new Error(error));
+    },
+    cancel(reason) { cancels.push(reason); },
+  });
+  return { ok: status >= 200 && status < 300, status, headers: new Headers(headers), body, cancels };
+}
+
 /** A real Response-shaped object whose body is a real stream, so the cap is exercised. */
 export function streamResponse(chunks, { status = 200, headers = {} } = {}) {
   let i = 0;
@@ -96,3 +133,133 @@ export function animatedGifBuffer() {
     Buffer.from([0x3b]),
   ]);
 }
+
+/**
+ * A response + fetch + dispatcher wired so every stage records into ONE timeline.
+ *
+ * WHY THIS LIVES HERE. The D1 defect (hostile review round 8) was an ORDERING bug — the pool was
+ * asked to close before the body was settled — and an ordering bug can only be caught by a test
+ * that observes the sequence. `cancellableStreamResponse` supplies the cancel hook; this supplies
+ * the close hook and the drain marker, and keeps the test file inside the repo's line ceiling.
+ *
+ * Events recorded:
+ *   'fetch-returned'    the fetch impl resolved (headers in hand, body maybe still streaming)
+ *   'body-settled'      `body.cancel()` was called — the response was released
+ *   'stream-drained'    the reader reached `done` — the body was fully consumed
+ *   'dispatcher-closed' `dispatcher.close()` was called
+ *
+ * @param {(addrs: Array<{address: string, family: number}>) => object} makeDispatcher
+ *        injected so this helper does not import the module under test
+ * @returns {{ timeline: string[], build: (opts?: object) => object }}
+ */
+export function orderedLifecycleHarness(makeDispatcher) {
+  const timeline = [];
+
+  const trackedDispatcher = () => {
+    const dispatcher = makeDispatcher([{ address: PUBLIC_IP[0].address, family: 4 }]);
+    const originalClose = dispatcher.close.bind(dispatcher);
+    dispatcher.close = async (...args) => {
+      timeline.push('dispatcher-closed');
+      return originalClose(...args);
+    };
+    return dispatcher;
+  };
+
+  // The tracked factory is what the module under test calls, so the returned object is the
+  // one whose `close()` we record. `trackedDispatcher` is invoked per `build()` so each test
+  // gets a fresh timeline entry rather than sharing one pool.
+  const trackedFactory = () => trackedDispatcher();
+
+  const build = (opts = {}) => {
+    // `opts.errorAfter` selects the ERRORING stream instead of the clean one, so the
+    // mid-read-failure path (round 9, finding 2) is observable in the same timeline as the
+    // others. Without this the harness could only produce streams that close.
+    const response = opts.errorAfter !== undefined
+      ? erroringStreamResponse(opts.chunks || [Buffer.from('x')], {
+        status: opts.status ?? 200,
+        headers: opts.headers || {},
+        error: opts.errorAfter,
+      })
+      : cancellableStreamResponse(opts.chunks || [Buffer.from('x')], {
+        status: opts.status ?? 200,
+        headers: opts.headers || {},
+      });
+
+    // Record the release — but only once it has actually SETTLED (round 9, finding 3).
+    //
+    // The previous version pushed the marker BEFORE awaiting the underlying cancel, so it
+    // recorded the CALL, not the completion. A cancel that hung or resolved late would still
+    // read as "body-settled" and `settleThenClose` would pass on an unsettled body — the exact
+    // property the ordering assertion exists to check.
+    //
+    // WHY A REJECTION IS STILL "SETTLED". `reader.cancel()` on a stream that has ALREADY errored
+    // rejects with that stream's own error rather than resolving — measured directly, and it is
+    // the spec's behaviour, not a quirk of this fixture. So for the erroring path a rejecting
+    // cancel IS the release having run to completion. The two cases are recorded as distinct
+    // events so no test can confuse "cancelled successfully" with "cancel was refused":
+    //
+    //   body-settled             the cancel completed in the ordinary way
+    //   body-settled-after-error the stream had already failed, and the cancel ran under that
+    //   body-cancel-locked       the cancel was REFUSED (e.g. the body is locked) — a real leak
+    //
+    // 'body-cancel-locked' is the one that matters: it is what the first version of this fix
+    // produced by calling `body.cancel()` on a locked stream, and it means NO release happened.
+    const classifyCancelFailure = (err) => {
+      const msg = String(err?.message || err);
+      return /locked/i.test(msg) ? 'body-cancel-locked' : 'body-settled-after-error';
+    };
+
+    const originalCancel = response.body.cancel.bind(response.body);
+    response.body.cancel = async (reason) => {
+      try {
+        const result = await originalCancel(reason);
+        timeline.push('body-settled');
+        return result;
+      } catch (err) {
+        timeline.push(classifyCancelFailure(err));
+        throw err;
+      }
+    };
+
+    // Record the drain, for the path that consumes rather than cancels — and the READER-level
+    // cancel, which is a DIFFERENT call from `body.cancel()`. The streamed over-cap path cancels
+    // through the reader it already holds, so hooking only `body.cancel` records nothing there.
+    // (Learned the hard way: the first version of this harness missed that path.)
+    const originalGetReader = response.body.getReader.bind(response.body);
+    response.body.getReader = () => {
+      const reader = originalGetReader();
+      const originalRead = reader.read.bind(reader);
+      reader.read = async () => {
+        const step = await originalRead();
+        if (step.done) timeline.push('stream-drained');
+        return step;
+      };
+      // Same correction as `body.cancel` above: record AFTER the await, so the marker means
+      // the reader-level cancel completed rather than merely started (round 9, finding 3).
+      const originalReaderCancel = reader.cancel.bind(reader);
+      reader.cancel = async (reason) => {
+        try {
+          const result = await originalReaderCancel(reason);
+          timeline.push('body-settled');
+          return result;
+        } catch (err) {
+          timeline.push(classifyCancelFailure(err));
+          throw err;
+        }
+      };
+      return reader;
+    };
+
+    return {
+      timeline,
+      fetchImpl: async () => { timeline.push('fetch-returned'); return response; },
+      // `fetchSpotlightImage` builds its own dispatcher from the validated addresses, so the
+      // observation point is the FACTORY, not a pre-built object. Injected via the module's
+      // `dispatcherFactory` opt — the only way to hold the object whose lifetime is under test.
+      dispatcherFactory: trackedFactory,
+      maxBytes: opts.maxBytes ?? 1024,
+    };
+  };
+
+  return { timeline, build };
+}
diff --git a/backend/tests/unit/addressClassificationR9.test.mjs b/backend/tests/unit/addressClassificationR9.test.mjs
new file mode 100644
index 000000000..87bcb5efa
--- /dev/null
+++ b/backend/tests/unit/addressClassificationR9.test.mjs
@@ -0,0 +1,189 @@
+/**
+ * addressClassificationR9.test.mjs
+ * ================================
+ * REGRESSION GATE FOR HOSTILE-REVIEW ROUND 9, FINDING 1.
+ *
+ * WHAT WENT WRONG. The classifier validated only the FIRST colon-separated group of an
+ * IPv6 literal and never parsed the rest. Three measured consequences:
+ *
+ *   2606:not-an-ip   -> head `2606` is in 2000::/3, so PUBLIC. The tail was never read.
+ *   :8.8.8.8         -> a dotted-suffix shortcut matched before any validation ran.
+ *   2002:7f00::1     -> PUBLIC, while `2002:7f00:0::1` — THE SAME ADDRESS written with an
+ *                       explicit zero group — was PRIVATE.
+ *
+ * The third is the one that matters most, and it is why the fix is structural rather than
+ * another prefix-list entry: if two spellings of one address can classify differently, no
+ * enumeration of ranges is safe, because the attacker chooses the spelling.
+ *
+ * THE PROPERTY THESE TESTS PIN, stated once so it can be checked rather than admired:
+ *   classification depends on the ADDRESS, never on its representation.
+ *
+ * These four inputs are Astra's, reproduced verbatim from the round-9 reply, so this file
+ * is a transcript of the finding rather than my paraphrase of it.
+ */
+
+import { describe, it, expect } from 'vitest';
+import { isPrivateOrLocalAddress } from '../../services/addressClassification.mjs';
+
+describe('round 9 finding 1 — the classifier must read the whole address', () => {
+  it('rejects a malformed literal whose FIRST group looks global (2606:not-an-ip)', () => {
+    // Before the fix: `head` was 2606, inside 2000::/3, so this returned false (PUBLIC).
+    // A string that is not an address is not a public address.
+    expect(isPrivateOrLocalAddress('2606:not-an-ip')).toBe(true);
+  });
+
+  it('rejects a leading-dot-quad literal with an empty first group (:8.8.8.8)', () => {
+    // Before the fix: the dotted-suffix shortcut matched before IPv6 validation.
+    expect(isPrivateOrLocalAddress(':8.8.8.8')).toBe(true);
+  });
+
+  it('classifies 6to4 loopback as private in its COMPRESSED spelling', () => {
+    expect(isPrivateOrLocalAddress('2002:7f00::1')).toBe(true);
+  });
+
+  it('classifies 6to4 loopback as private in its EXPANDED spelling', () => {
+    expect(isPrivateOrLocalAddress('2002:7f00:0::1')).toBe(true);
+  });
+
+  it('THE SHARPEST ONE: both spellings of one address agree', () => {
+    // This is the assertion that would have caught the bug. Anything less than equality
+    // between spellings leaves the representation in charge of the answer.
+    expect(isPrivateOrLocalAddress('2002:7f00::1')).toBe(
+      isPrivateOrLocalAddress('2002:7f00:0::1'),
+    );
+  });
+});
+
+describe('round 9 finding 1 — the property generalises beyond the four measured cases', () => {
+  // Astra's fix instruction: "Add the four cases above and equivalent compressed/expanded
+  // representations." A fix that only satisfies the four literal strings is a fix to the
+  // test, not to the classifier — so the spellings are enumerated here.
+  const spellingsOfSameAddress = [
+    '::ffff:127.0.0.1',
+    '::ffff:0:127.0.0.1',
+    '0:0:0:0:0:ffff:7f00:1',
+    '0000:0000:0000:0000:0000:ffff:7f00:0001',
+    '::ffff:7f00:1',
+  ];
+
+  for (const spelling of spellingsOfSameAddress) {
+    it(`agrees that ${spelling} is loopback-adjacent and private`, () => {
+      expect(isPrivateOrLocalAddress(spelling)).toBe(true);
+    });
+  }
+
+  it('every spelling of ::ffff:0:127.0.0.1 gives the SAME answer', () => {
+    const answers = new Set(spellingsOfSameAddress.map((s) => isPrivateOrLocalAddress(s)));
+    expect(answers.size).toBe(1);
+  });
+
+  it('6to4 of a PUBLIC v4 address is still public (the fix does not over-block)', () => {
+    // 2002:0808:0808::/48 embeds 8.8.8.8. Guarding against a fix that simply rejects
+    // everything containing 2002, which would pass the tests above and break real traffic.
+    expect(isPrivateOrLocalAddress('2002:808:808::1')).toBe(false);
+  });
+
+  it('NAT64 of loopback is private, via the well-known prefix', () => {
+    expect(isPrivateOrLocalAddress('64:ff9b::7f00:1')).toBe(true);
+  });
+
+  it('ordinary global unicast is still public (no regression from the allowlist)', () => {
+    expect(isPrivateOrLocalAddress('2001:4860:4860::8888')).toBe(false);
+    expect(isPrivateOrLocalAddress('2606:4700:4700::1111')).toBe(false);
+  });
+});
+
+describe('the allowlist is LOAD-BEARING, not decoration (found by mutation, M6)', () => {
+  // WHY THIS BLOCK EXISTS. A mutation that replaced `return leading >= 0x2000 && leading
+  // <= 0x3fff` with `return true` — i.e. "anything with a global-looking first group is
+  // public" — SURVIVED the rest of this file: 54 tests, all green. Every case above either
+  // tested a malformed string or a genuine global unicast address, so none of them could see
+  // the allowlist being removed.
+  //
+  // The addresses below are WELL-FORMED IPv6 that simply are not global unicast. Under the
+  // mutation they classify public. They must not: an address Node's own parser accepts, and
+  // that is not in 2000::/3, is not something this system will fetch.
+  const notGlobalUnicast = [
+    ['4000::1', 'above 2000::/3 — unassigned'],
+    ['6000::1', 'above 2000::/3'],
+    ['8000::1', 'above 2000::/3'],
+    ['a000::1', 'above 2000::/3'],
+    ['c000::1', 'above 2000::/3'],
+    ['e000::1', 'above 2000::/3'],
+    ['1000::1', 'below 2000::/3'],
+    ['1800::1', 'below 2000::/3'],
+    ['1fff::1', 'just below the 2000::/3 floor'],
+    ['0200::1', 'below 2000::/3'],
+    ['0400::1', 'below 2000::/3'],
+    ['0800::1', 'below 2000::/3'],
+  ];
+
+  for (const [addr, why] of notGlobalUnicast) {
+    it(`treats ${addr} as private — ${why}`, () => {
+      expect(isPrivateOrLocalAddress(addr)).toBe(true);
+    });
+  }
+
+  it('the boundaries themselves: 2000::/3 is public, its neighbours are not', () => {
+    expect(isPrivateOrLocalAddress('2000::1')).toBe(false);   // first address in /3
+    expect(isPrivateOrLocalAddress('3fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(false); // last
+    expect(isPrivateOrLocalAddress('1fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(true);
+    expect(isPrivateOrLocalAddress('4000::1')).toBe(true);    // first address after /3
+  });
+});
+
+describe('the embedded-IPv4 decode must use BIT POSITION, not string position (found by mutation, M4)', () => {
+  // WHY THIS BLOCK EXISTS. A mutation making `extractEmbeddedIPv4` read the RAW string
+  // instead of the expanded one SURVIVED the rest of this file. It is close to equivalent —
+  // I diffed both strategies over a 180-address corpus and found 61 extractor-level
+  // disagreements, which collapsed to 5 classifier-level differences. These are they.
+  //
+  // The mechanism: on a raw string a leading `::` compresses away groups, so `g[1]` and
+  // `g[2]` — the two groups 6to4 reads its IPv4 from — point at the WRONG groups, and the
+  // other three groups never get counted at all. `2002:808:1` opens with `2002` but has no
+  // explicit second and third group, so the raw read produced `8.8.0.0`; expanded it is
+  // 8.8.0.0/… and the several missing groups make it a non-address.
+  //
+  // These are fail-OPEN differences (clean says private, mutant said public), which is the
+  // D2 class, so they are pinned explicitly rather than left to a corpus study.
+  const mustStayPrivate = [
+    '2002:808:1',
+    '2002:808:0:0:1',
+    '2002:808:0:0:0:0:0:0:1',
+    '2002:808::127.0.0.1',
+    '2002:808:0:0:0:0:0:0:1.2.3.4',
+  ];
+
+  for (const addr of mustStayPrivate) {
+    it(`treats ${addr} as private`, () => {
+      expect(isPrivateOrLocalAddress(addr)).toBe(true);
+    });
+  }
+
+  it('6to4 with a FEWER-group spelling is still private (the compression trap)', () => {
+    // The raw-read bug is invisible on `2002:7f00:0::1` (which has both groups explicit) and
+    // only appears when the address is short. Pinned as the minimal reproducer.
+    expect(isPrivateOrLocalAddress('2002:808:1')).toBe(true);
+    expect(isPrivateOrLocalAddress('2002:808:0:0:0:0:0:0:1')).toBe(true);
+  });
+});
+
+describe('round 9 finding 1 — the malformed-input classes must stay closed', () => {
+  const malformed = [
+    '2606:not-an-ip',
+    ':8.8.8.8',
+    '2002:::',           // three colons
+    '2001:db8::1::2',    // two `::` compressions
+    '12345::1',          // group longer than 4 hex digits
+    '1:2:3:4:5:6:7',     // seven groups, no compression
+    'zzzz::1',           // non-hex group
+    '::1.2.3.999',       // out-of-range octet in the dotted tail
+    '::1.2.3',           // three-octet tail
+  ];
+
+  for (const addr of malformed) {
+    it(`treats ${addr} as private (fail closed)`, () => {
+      expect(isPrivateOrLocalAddress(addr)).toBe(true);
+    });
+  }
+});
diff --git a/backend/tests/unit/ipv6LiteralSyntax.test.mjs b/backend/tests/unit/ipv6LiteralSyntax.test.mjs
new file mode 100644
index 000000000..f85944993
--- /dev/null
+++ b/backend/tests/unit/ipv6LiteralSyntax.test.mjs
@@ -0,0 +1,135 @@
+/**
+ * ipv6LiteralSyntax.test.mjs
+ * ==========================
+ * DIRECT tests for the IPv6 syntax primitives — the module's own contract.
+ *
+ * WHY THIS FILE EXISTS (it exists because a mutation SURVIVED). Deleting the whole-address
+ * validation in `isValidIPv6` left `addressClassificationR9.test.mjs` fully GREEN, because
+ * that suite reaches this module only THROUGH `isPubliclyRoutableIPv6`, which applies its
+ * own `isValidIPv6` guard. The syntax check was therefore redundant on that path and the
+ * suite could not see its removal. A test that cannot see the deletion of the code it
+ * claims to cover is not covering it.
+ *
+ * So the primitives are exercised where they are DEFINED, not only where they happen to be
+ * called. After this file, removing the validation goes RED.
+ *
+ * Two properties, stated plainly:
+ *   - `isValidIPv6` answers "is this a legal address", and is strict: malformed input is
+ *     rejected rather than partially parsed.
+ *   - `expandIPv6` is the equaliser: every spelling of one address returns one string, so
+ *     no downstream answer can depend on the spelling.
+ */
+
+import { describe, it, expect } from 'vitest';
+import { isValidIPv6, expandIPv6 } from '../../services/ipv6LiteralSyntax.mjs';
+
+describe('isValidIPv6 — malformed literals are rejected', () => {
+  const malformed = [
+    ['', 'empty string'],
+    ['2606:not-an-ip', 'non-hex tail group'],
+    [':8.8.8.8', 'empty leading group before a dotted quad'],
+    ['2002:::', 'trailing triple colon'],
+    ['2001:db8::1::2', 'two `::` compressions'],
+    ['12345::1', 'group wider than 4 hex digits'],
+    ['1:2:3:4:5:6:7', 'seven groups with no compression'],
+    ['zzzz::1', 'non-hex group'],
+    ['::1.2.3.999', 'octet above 255 in the dotted tail'],
+    ['::1.2.3', 'three-octet dotted tail'],
+    ['2001:db8:0:0:0:0:0:0:0', 'nine groups'],
+    ['::1.2.3.4.5', 'five-octet dotted tail'],
+  ];
+
+  for (const [addr, why] of malformed) {
+    it(`rejects ${JSON.stringify(addr)} — ${why}`, () => {
+      expect(isValidIPv6(addr)).toBe(false);
+    });
+  }
+
+  it('rejects non-string input rather than throwing', () => {
+    expect(isValidIPv6(undefined)).toBe(false);
+    expect(isValidIPv6(null)).toBe(false);
+    expect(isValidIPv6(42)).toBe(false);
+  });
+});
+
+describe('isValidIPv6 — legal literals are accepted', () => {
+  const valid = [
+    '::1',
+    '::',
+    '2001:db8::1',
+    '2002:7f00::1',
+    '2002:7f00:0::1',
+    '::ffff:127.0.0.1',
+    '::ffff:0:127.0.0.1',
+    '64:ff9b::7f00:1',
+    '2001:4860:4860::8888',
+    '0:0:0:0:0:0:0:1',
+    'fe80::1',
+    'fc00::1',
+  ];
+
+  for (const addr of valid) {
+    it(`accepts ${addr}`, () => {
+      expect(isValidIPv6(addr)).toBe(true);
+    });
+  }
+});
+
+describe('expandIPv6 — spelling is erased', () => {
+  it('returns 8 groups of 4 hex digits', () => {
+    const out = expandIPv6('2001:db8::1');
+    expect(out).not.toBeNull();
+    const groups = out.split(':');
+    expect(groups).toHaveLength(8);
+    for (const g of groups) expect(g).toMatch(/^[0-9a-f]{4}$/);
+  });
+
+  it('THE EQUALISER: the round-9 pair expands to ONE string', () => {
+    // 2002:7f00::1 and 2002:7f00:0::1 are the same address. Before round 9's fix these
+    // classified differently; this assertion is the reason they can no longer.
+    expect(expandIPv6('2002:7f00::1')).toBe(expandIPv6('2002:7f00:0::1'));
+  });
+
+  it('agrees across four spellings that ARE the same address', () => {
+    // These four differ only in compression and zero-padding; Node reports the same
+    // address for each, and they must therefore expand to one string.
+    const spellings = [
+      '::ffff:7f00:1',
+      '0:0:0:0:0:ffff:7f00:1',
+      '0000:0000:0000:0000:0000:ffff:7f00:0001',
+      '::FFFF:7F00:1',
+    ];
+    const expanded = new Set(spellings.map((s) => expandIPv6(s)));
+    expect(expanded.size).toBe(1);
+    expect([...expanded][0]).toBe('0000:0000:0000:0000:0000:ffff:7f00:0001');
+  });
+
+  it('does NOT conflate ::ffff:127.0.0.1 with ::ffff:0:127.0.0.1 — they are DIFFERENT addresses', () => {
+    // Measured, not assumed. Node is the authority:
+    //   net.isIP('::ffff:127.0.0.1')   === 6   dns.lookup -> '::ffff:127.0.0.1'
+    //   net.isIP('::ffff:0:127.0.0.1') === 6   dns.lookup -> '::ffff:0:127.0.0.1'
+    // The first is RFC 4291 IPv4-mapped (groups 0-4 zero, group 5 = ffff). The second
+    // carries an extra zero group, so its ffff sits in group 4 — a different address in
+    // the ::ffff:0:0:0/96 block. An earlier draft of this file asserted they expand
+    // identically; that assertion was WRONG, and these two expansions are the correction.
+    // Both are still IPv6 loopback-ish and both must classify private, which is the
+    // property that actually matters — see addressClassificationR9.test.mjs.
+    expect(expandIPv6('::ffff:127.0.0.1')).toBe('0000:0000:0000:0000:0000:ffff:7f00:0001');
+    expect(expandIPv6('::ffff:0:127.0.0.1')).toBe('0000:0000:0000:0000:ffff:0000:7f00:0001');
+    expect(expandIPv6('::ffff:127.0.0.1')).not.toBe(expandIPv6('::ffff:0:127.0.0.1'));
+  });
+
+  it('folds a dotted quad into the LAST two groups', () => {
+    // The dotted quad is an alternative spelling of the final 32 bits, never of an
+    // earlier pair: ::ffff:1.2.3.4 must equal ::ffff:0102:0304, not ::ffff:0000:0102.
+    expect(expandIPv6('::ffff:1.2.3.4')).toBe('0000:0000:0000:0000:0000:ffff:0102:0304');
+    expect(expandIPv6('::ffff:1.2.3.4')).toBe(expandIPv6('::ffff:102:304'));
+    expect(expandIPv6('1:2:3:4:5:6:1.2.3.4')).toBe('0001:0002:0003:0004:0005:0006:0102:0304');
+  });
+
+  it('returns null for anything invalid, so callers cannot parse garbage', () => {
+    for (const bad of ['2606:not-an-ip', ':8.8.8.8', '2002:::', '', 'zzzz::1']) {
+      expect(expandIPv6(bad)).toBeNull();
+    }
+  });
+});
diff --git a/backend/tests/unit/spotlightImageAdmission.test.mjs b/backend/tests/unit/spotlightImageAdmission.test.mjs
new file mode 100644
index 000000000..432d4a2d7
--- /dev/null
+++ b/backend/tests/unit/spotlightImageAdmission.test.mjs
@@ -0,0 +1,147 @@
+/**
+ * spotlightImageAdmission — what `resolveAndValidate` lets through, and what it refuses
+ * ================================================================================
+ * WHAT THIS PROVES. URL admission: HTTPS-only, no embedded credentials, and every resolved
+ * address publicly routable — plus the IP-LITERAL branch, which is the one place where no
+ * resolver is consulted at all.
+ *
+ * WHY IT IS A SEPARATE FILE. The pin suite answers "is the connection pinned"; this answers
+ * "was the URL admitted". Different mechanism, different failure mode, and `06-bans.md` #50
+ * wants each file under 300 lines.
+ *
+ * THE REGRESSION CASES AT THE FOOT (round 8, D2/D4). Hostile review measured that
+ * `isPrivateOrLocalAddress` called `"::ffff:7f00:1"` PUBLIC, and that `resolveAndValidate`
+ * consequently ADMITTED `https://[::ffff:0:127.0.0.1]/` — a loopback literal. The mechanism:
+ * `URL.hostname` keeps brackets on an IPv6 authority, so `net.isIP` returned 0, the literal
+ * branch was skipped, `dns.lookup` normalised the address to a HEX mapped form, and the
+ * classifier's dotted-only mapped regex missed it and fell through to "public IPv6".
+ *
+ * The fix has two halves and BOTH are asserted here: brackets stripped before `net.isIP`, and
+ * the classifier's IPv6 default inverted to fail closed. Either half alone leaves a hole, so a
+ * test that only covered one would not have caught the defect.
+ */
+import { describe, it, expect, afterEach, vi } from 'vitest';
+import { resolveAndValidate } from '../../services/spotlightImageUrlPolicy.mjs';
+import { isPrivateOrLocalAddress } from '../../services/addressClassification.mjs';
+import { mockDns, PUBLIC_IP } from '../helpers/spotlightImageFixtures.mjs';
+
+afterEach(() => {
+  vi.restoreAllMocks();
+});
+
+describe('resolveAndValidate', () => {
+  it('returns both the URL and the validated addresses', async () => {
+    mockDns(PUBLIC_IP);
+    const { url, addrs } = await resolveAndValidate('https://example.com/a.png');
+    expect(url).toBeInstanceOf(URL);
+    expect(url.hostname).toBe('example.com');
+    // The addresses must SURVIVE the call — discarding them is the defect being fixed.
+    expect(addrs).toEqual(PUBLIC_IP);
+  });
+
+  it('validates an IP-literal host without a lookup and pins the literal', async () => {
+    // A literal is not a name; resolving it is meaningless. It must be validated and pinned
+    // as itself, and the DNS mock must never be consulted.
+    const lookup = mockDns(PUBLIC_IP);
+    const { url, addrs } = await resolveAndValidate('https://93.184.216.34/a.png');
+    expect(url.hostname).toBe('93.184.216.34');
+    expect(addrs).toEqual([{ address: '93.184.216.34', family: 4 }]);
+    expect(lookup).not.toHaveBeenCalled();
+  });
+
+  it('rejects a private IP-literal before any lookup', async () => {
+    const lookup = mockDns(PUBLIC_IP);
+    await expect(resolveAndValidate('https://10.0.0.1/a.png'))
+      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+    expect(lookup).not.toHaveBeenCalled();
+  });
+
+  it('rejects the cloud metadata IP-literal before any lookup', async () => {
+    const lookup = mockDns(PUBLIC_IP);
+    await expect(resolveAndValidate('https://169.254.169.254/latest/meta-data/'))
+      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+    expect(lookup).not.toHaveBeenCalled();
+  });
+
+  it('still rejects when ANY resolved address is private', async () => {
+    mockDns([
+      { address: '93.184.216.34', family: 4 },
+      { address: '127.0.0.1', family: 4 },
+    ]);
+    await expect(resolveAndValidate('https://mixed.example/a.png'))
+      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+  });
+});
+
+// ─── round 8, D2: the classifier's fail-closed contract ─────────────────
+//
+// `isPrivateOrLocalAddress` is imported from its OWN module (`addressClassification.mjs`),
+// which is where the round-8 fix moved it. Importing from there rather than through the
+// audio fetcher's re-export keeps this suite honest about which unit is under test.
+describe('the classifier fails CLOSED on shapes it does not recognise (round 8, D2)', () => {
+  const mustBePrivate = [
+    // The four inputs hostile review measured as `false` (i.e. "public").
+    [':', 'a bare colon is not an address'],
+    ['8.8.8.999', 'an out-of-range octet is not a public IPv4'],
+    ['0:0:0:0:0:0:0:1', 'the expanded form of IPv6 loopback'],
+    ['::ffff:7f00:1', 'the HEX form of IPv4-mapped loopback'],
+    // Forms the same defect class reaches.
+    ['::ffff:0:127.0.0.1', 'the D4 bypass — a mapped address that normalises to ::ffff:0:7f00:1'],
+    ['::127.0.0.1', 'IPv4-compatible (deprecated, still routable)'],
+    ['::7f00:1', 'IPv4-compatible, hex'],
+    ['64:ff9b::127.0.0.1', 'NAT64 embedding loopback'],
+    ['2002:7f00:1::', '6to4 embedding loopback'],
+    ['0::1', 'loopback with a leading zero group'],
+    ['::0001', 'loopback with an expanded final group'],
+    ['[::1]', 'a bracketed literal, which is how a URL authority presents it'],
+    ['fe00::1', 'outside the global-unicast range'],
+    ['4000::1', 'outside the global-unicast range'],
+  ];
+
+  for (const [ip, why] of mustBePrivate) {
+    it(`treats ${JSON.stringify(ip)} as private — ${why}`, () => {
+      expect(isPrivateOrLocalAddress(ip)).toBe(true);
+    });
+  }
+
+  const mustBePublic = [
+    ['93.184.216.34', 'a plain public IPv4'],
+    ['2606:2800:220:1:248:1893:25c8:1946', 'example.com, in 2000::/3'],
+    ['2001:4860:4860::8888', 'Google public DNS over IPv6'],
+    ['2a00:1450:4001:80a::200e', 'a Google edge address'],
+    ['3fff::1', 'the top of the global-unicast range'],
+  ];
+
+  for (const [ip, why] of mustBePublic) {
+    it(`treats ${JSON.stringify(ip)} as public — ${why}`, () => {
+      expect(isPrivateOrLocalAddress(ip)).toBe(false);
+    });
+  }
+});
+
+// ─── round 8, D4: the admitted loopback literal ─────────────────────────
+describe('IPv6 literals are classified AS literals, not laundered through a resolver (round 8, D4)', () => {
+  it('refuses the mapped-loopback literal that the DNS path previously admitted', async () => {
+    mockDns(PUBLIC_IP);
+    await expect(resolveAndValidate('https://[::ffff:0:127.0.0.1]/a.png'))
+      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+  });
+
+  it('refuses bracketed IPv6 loopback without consulting the resolver at all', async () => {
+    // The mechanism assertion: if this went through `dns.lookup`, the fix is only half applied —
+    // the address would be refused, but by a resolver's normalisation rather than by our own
+    // literal branch, which is exactly how the D4 bypass worked.
+    const lookup = mockDns(PUBLIC_IP);
+    await expect(resolveAndValidate('https://[0:0:0:0:0:0:0:1]/a.png'))
+      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+    expect(lookup).not.toHaveBeenCalled();
+  });
+
+  it('refuses the unspecified address and its expanded forms', async () => {
+    mockDns(PUBLIC_IP);
+    for (const host of ['[::]', '[0:0:0:0:0:0:0:0]']) {
+      await expect(resolveAndValidate(`https://${host}/a.png`))
+        .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+    }
+  });
+});
diff --git a/backend/tests/unit/spotlightImageDnsPin.test.mjs b/backend/tests/unit/spotlightImageDnsPin.test.mjs
new file mode 100644
index 000000000..71c356b5e
--- /dev/null
+++ b/backend/tests/unit/spotlightImageDnsPin.test.mjs
@@ -0,0 +1,286 @@
+/**
+ * spotlightImageDnsPin — the DNS-rebinding pin at the connect boundary
+ * =====================================================================
+ * WHAT THIS PROVES, AND WHY IT NEEDS ITS OWN FILE.
+ *
+ * `spotlightImageUrlPolicy.mjs` used to resolve a curator's image host, reject private
+ * addresses, and then DISCARD the addresses it had approved — handing only the URL to
+ * `fetch()`, which resolved the name a second time. A name that answered publicly on the
+ * first lookup and privately on the second (classic DNS rebinding) therefore reached an
+ * internal address even though the validator had "checked" it. The gap was honestly
+ * documented, but documented is not closed.
+ *
+ * The fix pins the approved addresses into the connection via `undici.Agent`'s
+ * `connect.lookup`, so the socket can only go where the check looked. The lookup hook is
+ * exported as a named factory so its contract is tested directly, and the dispatcher is
+ * exercised against a REAL loopback server rather than asserted on by shape.
+ *
+ * The decisive test is under "the TOCTOU the pin closes": it stands up a real server and
+ * shows the unpinned fetch reaching it while the pinned one cannot. If the pinned half ever
+ * starts succeeding, the pin has stopped being load-bearing and this file is lying to you.
+ *
+ * Nothing here asserts on `undici` internals EXCEPT one deliberate, narrow reach described at the
+ * point of use (the `Symbol(options)` access in the wiring block, which reads the connect options
+ * to see WHICH addresses were pinned). Hostile review round 8 (C8) caught an earlier version of
+ * this header claiming "no symbol-poking" while the code did exactly that — the claim was false,
+ * so the claim is what changed. Everything the network can answer is observed from the network
+ * side instead.
+ */
+import { describe, it, expect, afterEach, vi } from 'vitest';
+import { createServer } from 'node:http';
+import {
+  SpotlightImageError,
+  resolveAndValidate,
+  createPinnedLookup,
+  createPinnedDispatcher,
+} from '../../services/spotlightImageUrlPolicy.mjs';
+import { fetchSpotlightImage } from '../../services/spotlightImageFetch.mjs';
+import { mockDns, PUBLIC_IP, streamResponse, orderedLifecycleHarness } from '../helpers/spotlightImageFixtures.mjs';
+
+afterEach(() => {
+  vi.restoreAllMocks();
+});
+
+/** Drive the `net`-style lookup hook synchronously and capture its answer. */
+const callLookup = (lookup, hostname, options) => {
+  let captured;
+  lookup(hostname, options, (...args) => { captured = args; });
+  return captured;
+};
+
+/** Stand up a real loopback server and hand back its URL plus a closer. */
+const withLoopbackServer = async () => {
+  const server = createServer((_req, res) => { res.writeHead(200); res.end('private'); });
+  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
+  const { port } = server.address();
+  return {
+    url: `http://127.0.0.1:${port}/`,
+    close: () => new Promise((resolve) => server.close(resolve)),
+  };
+};
+
+// ─── createPinnedLookup: the hook answers from the validated set ─────────
+describe('createPinnedLookup', () => {
+  it('answers the all:true form with every pinned address', () => {
+    const lookup = createPinnedLookup([
+      { address: '93.184.216.34', family: 4 },
+      { address: '93.184.216.35', family: 4 },
+    ]);
+    const [err, answer] = callLookup(lookup, 'rebind.example', { all: true });
+    expect(err).toBeNull();
+    expect(answer).toEqual([
+      { address: '93.184.216.34', family: 4 },
+      { address: '93.184.216.35', family: 4 },
+    ]);
+  });
+
+  it('answers the single-address form with a bare address and family', () => {
+    const lookup = createPinnedLookup([{ address: '93.184.216.34', family: 4 }]);
+    const [err, address, family] = callLookup(lookup, 'rebind.example', { all: false });
+    expect(err).toBeNull();
+    expect(address).toBe('93.184.216.34');
+    expect(family).toBe(4);
+  });
+
+  it('ignores the requested hostname — the answer is the pinned set', () => {
+    const lookup = createPinnedLookup([{ address: '93.184.216.34', family: 4 }]);
+    // Two different names, one pinned answer: a rebinding name cannot talk its way out.
+    const [, a] = callLookup(lookup, 'attacker.example', { all: true });
+    const [, b] = callLookup(lookup, 'rebind.example', { all: true });
+    expect(a).toEqual([{ address: '93.184.216.34', family: 4 }]);
+    expect(b).toEqual(a);
+  });
+
+  it('preserves an IPv6 pinned address with its family', () => {
+    const lookup = createPinnedLookup([{ address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 }]);
+    const [, answer] = callLookup(lookup, 'example.com', { all: true });
+    expect(answer).toEqual([{ address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 }]);
+  });
+});
+
+// ─── createPinnedDispatcher: fail-closed construction ────────────────────
+describe('createPinnedDispatcher', () => {
+  it('fails closed on an empty address set rather than falling back to the resolver', () => {
+    // A dispatcher with no pinned addresses would let `net` use the system resolver — exactly
+    // the behaviour the pin exists to remove — so it must refuse to exist at all.
+    expect(() => createPinnedDispatcher([])).toThrow(SpotlightImageError);
+    expect(() => createPinnedDispatcher([])).toThrow(/cannot pin an empty address set/i);
+  });
+
+  it('refuses a non-array address set', () => {
+    expect(() => createPinnedDispatcher(undefined)).toThrow(/cannot pin an empty address set/i);
+  });
+
+  it('builds a dispatcher that can be closed', async () => {
+    const dispatcher = createPinnedDispatcher([{ address: '93.184.216.34', family: 4 }]);
+    // `undici`'s close() resolves to null; the contract that matters is that it settles and
+    // leaves no live pool behind, not the resolved value.
+    await expect(dispatcher.close()).resolves.toBeNull();
+  });
+});
+
+// ─── the TOCTOU the pin closes ─────────────────────────────────────────
+//
+// These use only DETERMINISTIC, LOCAL sockets. An earlier draft pinned the connection to a
+// TEST-NET address (192.0.2.1) to show the request failing; that address is filtered rather
+// than refused, so the connect simply hung and the test died on its own timeout. A hung test
+// is worse than no test, so the design here is: every case either completes against loopback
+// or completes against a literal-bypass, and none of them depend on how the network answers.
+//
+// WHAT THESE CASES DO *NOT* ESTABLISH (hostile review round 8, D3). The unpinned control at
+// T:126 shows that a bare `fetch()` reaches loopback — a real escape, and a real detector.
+// But none of these cases drives a NAMED host through `net` and observes which address the
+// socket opened to. The lookup contract cases above call our hook DIRECTLY, which is a test
+// of our function, not of `net` using it. That gap is named in the lifecycle/transport
+// suites rather than papered over with a comment claiming it is "measured here, live".
+describe('the TOCTOU the pin closes', () => {
+  it('an unpinned fetch reaches the loopback server (the escape)', async () => {
+    // The CONTROL, not the fix. It shows a `fetch()` handed only a URL walks straight to the
+    // private address — so the escape was real, and this harness can detect it.
+    const server = await withLoopbackServer();
+    try {
+      const response = await globalThis.fetch(server.url);
+      expect(response.status).toBe(200);
+      expect(await response.text()).toBe('private');
+    } finally {
+      await server.close();
+    }
+  });
+
+  it('the hook answers a NAME from the pinned set — but this calls the hook directly, it does not drive a socket', async () => {
+    // WHAT THIS ACTUALLY MEASURES, RENAMED AFTER HOSTILE REVIEW ROUND 8 D3. The old name was
+    // "the pin is consulted for a NAMED host — the lookup hook fires, the literal path does not",
+    // which overstated it: `createPinnedLookup` is invoked BY THIS TEST, so all it shows is that
+    // our factory returns the pinned set for a name. It does NOT show `net` consulting the hook
+    // during a connection, and it does not measure the literal asymmetry at all — the literal
+    // case is covered separately below. Renaming is the honest fix; a claim in a test NAME is
+    // still a claim.
+    const hookCalls = [];
+    const probe = (hostname) => new Promise((resolve) => {
+      const lookup = createPinnedLookup([{ address: '127.0.0.2', family: 4 }]);
+      lookup(hostname, { all: true }, (_e, answer) => { hookCalls.push({ hostname, answer }); resolve(answer); });
+    });
+
+    await probe('rebind.invalid');
+    expect(hookCalls).toHaveLength(1);
+    expect(hookCalls[0].answer).toEqual([{ address: '127.0.0.2', family: 4 }]);
+  });
+
+  it('an IP-LITERAL host bypasses the pin entirely, so the VALIDATOR must refuse it', async () => {
+    // A documented LIMIT, encoded so it cannot be mistaken for a defence.
+    //
+    // `net` short-circuits an IP literal: there is no name to resolve, so `connect.lookup` is
+    // never called and a pin has no say. This proves both halves — the pin is bypassed, AND the
+    // admission check is what actually catches the literal (before any dispatcher exists).
+    //
+    // CORRECTED AFTER HOSTILE REVIEW ROUND 8 (C6). Half two used to call `resolveAndValidate`
+    // with `server.url`, which is an **`http://`** URL — so `P:114` rejected the PROTOCOL and
+    // address admission was never reached. The assert passed for the wrong reason and proved
+    // nothing about literals. It now uses an https URL whose host is the literal, so the only
+    // thing that can refuse it is address admission.
+    const server = await withLoopbackServer();
+    const dispatcher = createPinnedDispatcher([{ address: '127.0.0.2', family: 4 }]);
+    try {
+      // Half one: the pin does not stop the literal from reaching the server.
+      const reached = await globalThis.fetch(server.url, { dispatcher })
+        .then(() => true, () => false);
+      expect(reached).toBe(true);
+
+      // Half two: the validator refuses the same LITERAL HOST on its own merits. https, so the
+      // protocol guard cannot be what refuses it; the code asserted is the ADMISSION code.
+      await expect(resolveAndValidate(`https://127.0.0.1:${new URL(server.url).port}/a.png`))
+        .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+    } finally {
+      await dispatcher.close();
+      await server.close();
+    }
+  });
+
+  it('refuses a bracketed IPv6 literal at the LITERAL branch, not via the resolver', async () => {
+    // Hostile review round 8, D4. `URL.hostname` KEEPS the brackets on an IPv6 authority, and
+    // `net.isIP('[::1]')` is 0 — so every IPv6 literal used to slip past the literal branch and
+    // take the DNS path, where the classifier depended on the resolver's normalisation to catch
+    // it. It did not: `https://[::ffff:0:127.0.0.1]/` was ADMITTED and pinned as `::ffff:0:7f00:1`.
+    // The message assertion pins the FIX — refusal must name the bare address, which is only
+    // possible if the brackets were stripped before classification.
+    const lookup = mockDns(PUBLIC_IP);
+    await expect(resolveAndValidate('https://[::1]/a.png'))
+      .rejects.toMatchObject({
+        code: 'IMAGE_URL_NOT_ALLOWED',
+        message: expect.stringContaining('::1'),
+      });
+    // And the fix must not route a literal through the resolver to get there.
+    expect(lookup).not.toHaveBeenCalled();
+  });
+
+  it('refuses an IPv4-mapped loopback literal that the DNS path laundered', async () => {
+    // The D4 bypass, encoded. This address normalises to the HEX mapped form, which the old
+    // classifier's dotted-only regex missed and then called public.
+    mockDns(PUBLIC_IP);
+    await expect(resolveAndValidate('https://[::ffff:0:127.0.0.1]/a.png'))
+      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+  });
+});
+
+// ─── the pin is actually WIRED into the fetch path ──────────────────────
+//
+// This block exists because of a mutation result, and it is the most important block here.
+//
+// Removing `dispatcher` from the fetch call in `spotlightImageFetch.mjs` left every other test
+// in this file GREEN. The reason is instructive: those tests exercise `createPinnedLookup` and
+// `createPinnedDispatcher` DIRECTLY, so they pass whether or not the production fetch ever calls
+// them. A pin that is constructed but never passed is not a control — it is dead code with a good
+// comment. These assertions observe the CALL, which is the only thing that makes the pin real.
+describe('fetchSpotlightImage wires the pin into the transport', () => {
+  it('passes a dispatcher to fetchImpl', async () => {
+    mockDns(PUBLIC_IP);
+    const seen = [];
+    const fetchImpl = async (url, init) => {
+      seen.push(init);
+      return streamResponse([Buffer.from('x')]);
+    };
+
+    await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });
+
+    expect(seen).toHaveLength(1);
+    expect(seen[0].dispatcher).toBeDefined();
+    expect(typeof seen[0].dispatcher.close).toBe('function'); // it is a real Agent
+  });
+
+  it('pins the addresses the validator approved, not the URL alone', async () => {
+    // The dispatch must be built from the RESOLVED addresses, so a name that would answer
+    // differently on a second lookup has no second lookup available to it.
+    mockDns(PUBLIC_IP);
+    let captured = null;
+    const fetchImpl = async (url, init) => {
+      captured = init.dispatcher;
+      return streamResponse([Buffer.from('x')]);
+    };
+
+    await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });
+
+    // Reach the pinned answer through the dispatcher's own connect options — the value that
+    // `net` will be handed. `Symbol(options)` is undici's, so this reaches in deliberately and
+    // narrowly, for the one thing that cannot be observed from outside: WHICH addresses were pinned.
+    const opts = captured[Object.getOwnPropertySymbols(captured).find((s) => s.toString() === 'Symbol(options)')];
+    const answer = await new Promise((resolve) => {
+      opts.connect.lookup('example.com', { all: true }, (_e, a) => resolve(a));
+    });
+    expect(answer).toEqual(PUBLIC_IP);
+  });
+
+  it('refuses to fetch when the pinned address set is empty (fail closed)', async () => {
+    // If admission ever returned no addresses, the fetch must fail rather than fall through to a
+    // resolver-backed connection. An empty answer is not a reason to resolve for ourselves.
+    mockDns([]);
+    let called = false;
+    const fetchImpl = async () => { called = true; return streamResponse([Buffer.from('x')]); };
+
+    const result = await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });
+
+    expect(result.ok).toBe(false);
+    expect(result.code).toBe('IMAGE_URL_DNS_FAILED');
+    expect(called).toBe(false);
+  });
+});
+
diff --git a/backend/tests/unit/spotlightImageLifecycle.test.mjs b/backend/tests/unit/spotlightImageLifecycle.test.mjs
new file mode 100644
index 000000000..3126c4b90
--- /dev/null
+++ b/backend/tests/unit/spotlightImageLifecycle.test.mjs
@@ -0,0 +1,146 @@
+/**
+ * spotlightImageLifecycle — the dispatcher outlives the BODY, not just the headers
+ * ==============================================================================
+ * WHAT THIS PROVES. `fetchSpotlightImage` must not ask the socket pool to close until the
+ * response body has been settled — consumed, cancelled, or abandoned by an abort.
+ *
+ * WHY IT IS A SEPARATE FILE FROM THE PIN SUITE. The pin suite answers "is the connection
+ * pinned to the approved address". This file answers a different question — "what is the
+ * lifetime of the pool relative to the response" — and the two answers come from different
+ * mechanisms. Splitting also keeps both files inside `06-bans.md` #50.
+ *
+ * THE DEFECT THIS ENCODES (hostile review round 8, D1, graded HIGH). The old code awaited
+ * `dispatcher.close()` in a `finally` around `fetch()`. But `fetch()` resolves when the
+ * HEADERS arrive and the body may still be streaming, so every body-handling path — the
+ * 4xx/5xx cancel, the over-cap declared-length cancel, the streamed read — ran AFTER the
+ * pool had been asked to shut down. `close()` drains idle sockets "once in-flight requests
+ * settle", and a body still being read IS an in-flight request. The order was backwards by
+ * construction: settlement must come first.
+ *
+ * WHY THE ASSERTIONS ARE ORDERING ASSERTIONS. A test asserting "close() was called" passes
+ * on the broken code — that is the R6-01 failure mode (a green suite whose green does not
+ * entail the property). Every assertion below compares the INDEX of two recorded events, so
+ * reverting the fix turns this file red. That was verified by mutation, not assumed.
+ */
+import { describe, it, expect, afterEach, vi } from 'vitest';
+import { createPinnedDispatcher } from '../../services/spotlightImageUrlPolicy.mjs';
+import { fetchSpotlightImage } from '../../services/spotlightImageFetch.mjs';
+import { mockDns, PUBLIC_IP, orderedLifecycleHarness } from '../helpers/spotlightImageFixtures.mjs';
+
+afterEach(() => {
+  vi.restoreAllMocks();
+});
+
+/** Settlement must be recorded, and must precede closure. */
+const settleThenClose = (timeline, settledEvent) => {
+  expect(timeline).toContain(settledEvent);
+  expect(timeline).toContain('dispatcher-closed');
+  expect(timeline.indexOf(settledEvent)).toBeLessThan(timeline.indexOf('dispatcher-closed'));
+};
+
+describe('the dispatcher outlives the response body (round 8, D1)', () => {
+  it('hands the headers over before the pool closes', async () => {
+    mockDns(PUBLIC_IP);
+    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
+    await fetchSpotlightImage('https://example.com/a.png', build());
+
+    // Sanity on the harness itself: if the fetch never resolved, the ordering claims below
+    // would be comparing indices in a timeline that never recorded the thing under test.
+    expect(timeline[0]).toBe('fetch-returned');
+    expect(timeline).toContain('dispatcher-closed');
+  });
+
+  it('settles an over-cap DECLARED length before closing the pool', async () => {
+    mockDns(PUBLIC_IP);
+    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
+    const result = await fetchSpotlightImage('https://example.com/a.png', build({
+      headers: { 'content-length': '4096' },
+    }));
+
+    expect(result).toMatchObject({ ok: false, code: 'IMAGE_TOO_LARGE' });
+    settleThenClose(timeline, 'body-settled');
+  });
+
+  it('settles a 4xx body before closing the pool', async () => {
+    mockDns(PUBLIC_IP);
+    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
+    const result = await fetchSpotlightImage('https://example.com/a.png', build({ status: 500 }));
+
+    expect(result).toMatchObject({ ok: false, code: 'IMAGE_FETCH_FAILED' });
+    settleThenClose(timeline, 'body-settled');
+  });
+
+  it('settles an over-cap STREAMED read before closing the pool', async () => {
+    mockDns(PUBLIC_IP);
+    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
+    const result = await fetchSpotlightImage('https://example.com/a.png', build({
+      maxBytes: 8,
+      chunks: [Buffer.alloc(6), Buffer.alloc(6)],
+    }));
+
+    expect(result).toMatchObject({ ok: false, code: 'IMAGE_TOO_LARGE' });
+    settleThenClose(timeline, 'body-settled');
+  });
+
+  it('drains a within-cap body before closing the pool', async () => {
+    mockDns(PUBLIC_IP);
+    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
+    const result = await fetchSpotlightImage('https://example.com/a.png', build({
+      chunks: [Buffer.from('abc')],
+    }));
+
+    expect(result.ok).toBe(true);
+    // A fully-consumed stream fires no `cancel`, so the drain marker stands in for settlement.
+    settleThenClose(timeline, 'stream-drained');
+  });
+
+  it('settles a body that ERRORS mid-read before closing the pool (round 9, finding 2)', async () => {
+    // THE PATH THIS PINS. Every other exit from `readImageBody` released the body; the
+    // `catch (err)` around the read loop returned WITHOUT cancelling, so a stream that failed
+    // mid-read left a live socket behind. It was the single exception, and it was on the path
+    // where a connection is most likely to be stranded.
+    //
+    // The assertion is on the timeline, not on the code: if the release is removed, no
+    // `body-settled` entry is recorded and `settleThenClose` fails. A test that only checked
+    // `result.ok === false` would pass either way.
+    mockDns(PUBLIC_IP);
+    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
+    const result = await fetchSpotlightImage('https://example.com/a.png', build({
+      chunks: [Buffer.alloc(4)],
+      errorAfter: 'ECONNRESET',
+    }));
+
+    expect(result).toMatchObject({ ok: false, code: 'IMAGE_FETCH_FAILED' });
+    expect(result.message).toMatch(/ECONNRESET/);
+
+    // The stream had ALREADY errored, so `reader.cancel()` rejects with that error rather than
+    // resolving — measured, and it is the spec's behaviour. What must be true is that the cancel
+    // RAN to completion (either outcome) and, critically, that it was not REFUSED as locked.
+    //
+    // `body-cancel-locked` is the assertion that has teeth. The first version of this fix called
+    // `response.body.cancel()` on a stream whose body was LOCKED by the reader; that throws
+    // `Invalid state: ReadableStream is locked`, the empty catch swallowed it, and the socket was
+    // never released — while a marker-before-await harness reported success. This is that bug,
+    // pinned so it cannot come back.
+    expect(timeline).not.toContain('body-cancel-locked');
+    const settled = timeline.filter((e) => e === 'body-settled' || e === 'body-settled-after-error');
+    expect(settled.length).toBeGreaterThan(0);
+    expect(timeline).toContain('dispatcher-closed');
+    expect(timeline.indexOf(settled[0])).toBeLessThan(timeline.indexOf('dispatcher-closed'));
+  });
+
+  it('closes the pool even when the fetch itself throws', async () => {
+    // The failure path must not leak the dispatcher. `fetchImpl` throwing is the case the
+    // original `finally` DID handle correctly — so this case guards against a fix that
+    // moved cleanup inside the body handler and lost the error path.
+    mockDns(PUBLIC_IP);
+    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
+    const built = build();
+    const exploding = { ...built, fetchImpl: async () => { throw new Error('socket exploded'); } };
+
+    const result = await fetchSpotlightImage('https://example.com/a.png', exploding);
+
+    expect(result).toMatchObject({ ok: false, code: 'IMAGE_FETCH_FAILED' });
+    expect(timeline).toContain('dispatcher-closed');
+  });
+});
diff --git a/backend/tests/unit/spotlightImageTransportPin.test.mjs b/backend/tests/unit/spotlightImageTransportPin.test.mjs
new file mode 100644
index 000000000..c65f0f7e7
--- /dev/null
+++ b/backend/tests/unit/spotlightImageTransportPin.test.mjs
@@ -0,0 +1,171 @@
+/**
+ * spotlightImageTransportPin — what the pin does when `net` actually opens a socket
+ * ==============================================================================
+ * WHY THIS FILE EXISTS (hostile review round 8, D3).
+ *
+ * `spotlightImageDnsPin.test.mjs` has a test whose honest name now reads "...but this calls the
+ * hook directly, it does not drive a socket". That rename was the correct fix for an overstated
+ * claim, but it left a real hole: NOTHING in the repo observed `net` consulting `connect.lookup`
+ * during an actual connection. Astra's sharper discriminator (round 7) is the one encoded here —
+ * replace the pinned dispatcher with a default `Agent` and see whether the two cases are
+ * DISTINGUISHABLE. If they are not, the test is asserting on dispatcher PRESENCE rather than on
+ * TRANSPORT, and it would stay green against a pin that does nothing.
+ *
+ * WHAT MAKES THIS A TRANSPORT TEST AND NOT ANOTHER HARNESS TEST.
+ *
+ *   - Two REAL servers listen on two DIFFERENT loopback addresses (127.0.0.1 and 127.0.0.2),
+ *     on the SAME PORT, so the port in the URL is valid for both and the only variable left is
+ *     which ADDRESS the pin chose. (Verified: two 127/8 addresses may hold one port number.)
+ *   - A REAL undici `Agent` is built by the production factory, pinning ONE of them.
+ *   - A REAL `fetch()` is issued against a URL whose HOST is a NAME, not a literal.
+ *   - The assertion is on WHICH SERVER ANSWERED — observed from the server side, over the wire.
+ *
+ * So the observation point is the network, not our own hook. That is the difference the review
+ * asked for: if `net` stops calling our lookup, the request lands on the OTHER server and this
+ * fails, rather than passing because we called our own function.
+ *
+ * WHY A NAME AND NOT A LITERAL. `net` short-circuits an IP literal — there is no name to resolve,
+ * so `connect.lookup` is never consulted and a pin has no say. That limit is already documented
+ * in the sibling file. Here the host is a NAME precisely so the lookup path is the one exercised.
+ *
+ * WHY THE NAME IS NEVER ACTUALLY RESOLVED. The pin's whole value is that the name is NOT resolved
+ * at connect time. The name used below (`pin-probe.invalid`) is a `.invalid` TLD, reserved by
+ * RFC 2606, which can never resolve. If the pin were absent, the connection would fail with DNS
+ * failure rather than reach a server — so a passing test also proves the socket never consulted
+ * the system resolver.
+ *
+ * THE FAILURE THIS FILE ALREADY CAUGHT, RECORDED BECAUSE IT IS THE WHOLE POINT. The first draft
+ * pinned 127.0.0.2 but built the URL from 127.0.0.1's port, and failed with
+ * `ECONNREFUSED 127.0.0.2:<the-other-port>`. That is a defect in the TEST, but the error is also
+ * the proof: the socket had gone to 127.0.0.2, the address nothing in the URL pointed at. Fixing
+ * it by giving both servers one port removes the confound rather than papering over it.
+ */
+import { describe, it, expect, afterEach } from 'vitest';
+import { createServer } from 'node:http';
+import { Agent } from 'undici';
+import { createPinnedDispatcher } from '../../services/spotlightImageUrlPolicy.mjs';
+
+/** A name that can never resolve: `.invalid` is reserved by RFC 2606. */
+const UNRESOLVABLE_NAME = 'pin-probe.invalid';
+
+/** Bind a loopback server that names the address it answered on. */
+const listenOn = (address, port) =>
+  new Promise((resolve, reject) => {
+    const server = createServer((_req, res) => {
+      res.writeHead(200, { 'content-type': 'text/plain' });
+      res.end(`served-by:${address}`);
+    });
+    server.once('error', reject);
+    server.listen(port, address, () => resolve(server));
+  });
+
+/**
+ * Two servers, two addresses, ONE port — so the URL's port is valid for both and the address is
+ * the only thing the pin can change. Returns both plus a closer.
+ */
+const serveTwoAddresses = async () => {
+  const first = await listenOn('127.0.0.1', 0);
+  const { port } = first.address();
+  const second = await listenOn('127.0.0.2', port);
+  return {
+    port,
+    close: async () => {
+      await new Promise((resolve) => second.close(resolve));
+      await new Promise((resolve) => first.close(resolve));
+    },
+  };
+};
+
+describe('the pin observed at the transport, not at the hook', () => {
+  let teardown = null;
+  afterEach(async () => {
+    if (teardown) await teardown();
+    teardown = null;
+  });
+
+  it('the socket opens to the PINNED address even though the URL names neither address', async () => {
+    const pair = await serveTwoAddresses();
+    teardown = pair.close;
+
+    // Pin 127.0.0.2 while both are listening on this port. If the pin is load-bearing the second
+    // server answers; if it is inert the request either fails to resolve or reaches the first.
+    const dispatcher = createPinnedDispatcher([{ address: '127.0.0.2', family: 4 }]);
+    try {
+      const response = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher });
+      // The socket went where the CHECK pointed, not where the NAME pointed — and the name could
+      // not have resolved at all, so this outcome is reachable only through the pin.
+      expect(await response.text()).toBe('served-by:127.0.0.2');
+    } finally {
+      await dispatcher.close();
+    }
+  });
+
+  it('a default Agent is DISTINGUISHABLE — it fails on the same unresolvable name', async () => {
+    // THE DISCRIMINATOR. If this case behaved like the pinned one, the previous test would be
+    // proving nothing about transport. It must FAIL, and specifically by DNS, not by anything else.
+    const pair = await serveTwoAddresses();
+    teardown = pair.close;
+
+    const dispatcher = new Agent();
+    try {
+      const outcome = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher })
+        .then(async (r) => ({ reached: true, body: await r.text() }), (err) => ({ reached: false, err }));
+      expect(outcome.reached).toBe(false);
+      // Named so a future reader can tell "the pin is gone" from "the network is down".
+      const detail = String(outcome.err?.cause?.code || outcome.err?.code || outcome.err?.message);
+      expect(detail).toMatch(/ENOTFOUND|EAI_AGAIN|getaddrinfo/i);
+    } finally {
+      await dispatcher.close();
+    }
+  });
+
+  it('pinning the OTHER address flips which server answers — the pin is the only variable', async () => {
+    // The control that makes the first case non-accidental: hold everything constant except the
+    // pinned address, and the answering server changes. A test that could not tell 127.0.0.1 from
+    // 127.0.0.2 is not observing an address at all.
+    const pair = await serveTwoAddresses();
+    teardown = pair.close;
+
+    const dispatcher = createPinnedDispatcher([{ address: '127.0.0.1', family: 4 }]);
+    try {
+      const response = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher });
+      expect(await response.text()).toBe('served-by:127.0.0.1');
+    } finally {
+      await dispatcher.close();
+    }
+  });
+
+  it('with TWO pinned addresses, the FIRST pinned one is the one connected to', async () => {
+    // ADDED AFTER A MUTATION SURVIVED. Rotating the pinned set (`addrs.slice(1).concat(addrs[0])`
+    // inside `createPinnedDispatcher`) left this whole file GREEN, because every case above pins a
+    // SINGLE address — with one element there is nothing to rotate, so the mutation was invisible
+    // by construction, not by accident. That is a real hole in this file's coverage and this case
+    // closes it: two live addresses on one port, and an assertion about WHICH one wins.
+    //
+    // This is `net`'s single-address form: `connect.lookup` is called WITHOUT `all`, and our
+    // `createPinnedLookup` answers with `pinned[0]`. So what this case pins down is OUR
+    // contract — the validated ORDER is preserved, and the first validated address is the one
+    // a socket takes. It is not a claim about a `net` preference: `net` simply uses the single
+    // value it is handed. That distinction is the point, because the mutation this case exists
+    // to catch is a rotation inside `createPinnedLookup` — which is exactly our code, and which
+    // every single-address case above is blind to (with one element there is nothing to rotate,
+    // so the hole was structural, not accidental).
+    //
+    // A pin that silently reordered its set would connect somewhere the check DID approve but
+    // the caller did not prefer, and would still look correct in every single-address test.
+    const pair = await serveTwoAddresses();
+    teardown = pair.close;
+
+    const dispatcher = createPinnedDispatcher([
+      { address: '127.0.0.2', family: 4 },
+      { address: '127.0.0.1', family: 4 },
+    ]);
+    try {
+      const response = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher });
+      // 127.0.0.2 is FIRST, so it is the one that must answer — not the second entry.
+      expect(await response.text()).toBe('served-by:127.0.0.2');
+    } finally {
+      await dispatcher.close();
+    }
+  });
+});
diff --git a/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/R1-REVIEW-ROUND-9-PACKET-VERSION-LOG.md b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/R1-REVIEW-ROUND-9-PACKET-VERSION-LOG.md
new file mode 100644
index 000000000..df12dc194
--- /dev/null
+++ b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/R1-REVIEW-ROUND-9-PACKET-VERSION-LOG.md
@@ -0,0 +1,132 @@
+# Round-9 packet — version log
+
+Two builds exist because the source changed between them. Recorded so the review's target is
+unambiguous: a review is only interpretable against the exact bytes it read.
+
+| Build | sha256 | Lines | Bytes | Dispatched to Astra? |
+|---|---|---|---|---|
+| v1 | `81ee0b868e79a1e6aad7ac2392121b8147bae2cecaee680a349bac97004bdc59` | 2789 | 144,036 | **YES — this is the packet round 9 reviewed** |
+| v2 | `286da87b6897ef6e11b97c36dcbc504775254e9458174cd66c66444aa1330c2d` | 2804 | 145,270 | no |
+| v3 | `d04326797fcb3d712fbb660fcdeeb5719a5f4aecee03fdce12c26e7d635ef211` | 2888 | 152,012 | no — **post-fix rebuild, NOT a review target** |
+
+**Read the `sha256` column against the file on disk, not against this line.** The packet is
+regenerated whenever its inlined source or its builder changes, so its hash moves; the row that
+must never move is **v1**, which identifies the bytes round 9 actually adjudicated.
+
+## Why v2 exists, and why it does not invalidate the review
+
+v2 differs from v1 in **one artifact only**: `backend/services/spotlightImageUrlPolicy.mjs`,
+which changed from sha256 `6ec126d3c5529032…` (227 lines) to `f6eeb49cbe2547ee…` (242 lines).
+
+The change is a **COMMENT-ONLY** addition under `lookupWithTimeout`, recording round 8's C10 item
+(3): that the DNS timeout bounds the CALLER's wait but cannot cancel the underlying
+`dns.promises.lookup`, because that API takes no `AbortSignal` and returns a bare Promise.
+
+**No executable line changed.** Verified: the suite is green before and after
+(4 files, 52 tests passed), and the diff is confined to the docblock.
+
+## Why that is acceptable for this round
+
+Round 9's claims C1–C9 are about D1, D2, D3, D4 and the extraction of the classifier. **C10 item
+(3) is not among them** — it is one of round 8's six acknowledged limitations, and v2's comment is
+the author documenting it rather than a change under review. So the packet Astra read contained
+every artifact C1–C9 are decided against, at the same bytes as v2:
+
+- `spotlightImageFetch.mjs`, `addressClassification.mjs`, `applaudAudioFetcher.mjs`,
+  all five test files, both commits, and the round-8 review are **byte-identical in v1 and v2**.
+
+## If a future round needs v2 reviewed
+
+Not necessary for C1–C9, but if C10 item (3) is ever promoted to a claim, v2 is the packet to send
+and the reason to send it is this table.
+
+## Post-review drift — and a builder defect that was hiding behind it
+
+After round 9 returned, its findings were fixed, which is _by definition_ a divergence between the
+packet's inlined source and the repository. Re-running `node verify-r9-packet.mjs` on the current
+tree therefore reports mismatches, and some of that is the correct result, not a defect.
+
+**But the first reading of that mismatch count was wrong, and the way it was wrong is worth
+recording.** The verifier reported:
+
+```
+MISMATCH backend/services/addressClassification.mjs
+MISMATCH backend/services/spotlightImageUrlPolicy.mjs
+MISMATCH backend/services/spotlightImageFetch.mjs
+MISMATCH backend/services/applaudAudioFetcher.mjs
+MISMATCH backend/tests/unit/spotlightImageTransportPin.test.mjs
+MISMATCH backend/tests/unit/spotlightImageDnsPin.test.mjs
+MISMATCH backend/tests/unit/spotlightImageLifecycle.test.mjs
+MISMATCH backend/tests/unit/spotlightImageAdmission.test.mjs
+MISMATCH backend/tests/helpers/spotlightImageFixtures.mjs
+MISMATCH Z:/HostileReviews/2026-09-21-163103-social-bridge-round-8-astra-s-dns-pin-review.md
+MISMATCH docs/.../DNS-PIN-MUTATION-RECORD-2026-09-21.md
+
+verified against disk: 11 | mismatched: 11 | absent: 0
+```
+
+**Eleven of eleven.** Not the six the earlier draft of this log claimed, and not a pattern that any
+theory of "the fixes changed six files" can explain: `spotlightImageUrlPolicy.mjs` was not touched
+by any round-9 fix, and `spotlightImageAdmission.test.mjs` was not either.
+
+The cause was found by measuring per block rather than theorising. For every one of the eleven, the
+**embedded body and the file on disk agreed exactly** (`sha256(body) == sha256(disk)`,
+first differing line: none). What disagreed was the packet's **own header**, which is what the
+verifier compares against. In `build-round9-packet.mjs` the header was computed on the raw text:
+
+```js
+sha256 \`${sha256(text)}\` · ${lines(text)} lines`   // UNSTRIPPED
+'```' + lang, text.replace(/\s+$/, ''), '```',      // STRIPPED when embedded
+```
+
+so the header described a byte-string that appears nowhere in the packet. Every artifact whose file
+ends in a newline — i.e. essentially all of them — mismatched on re-read. The line counts were wrong
+in the same way: `spotlightImageDnsPin.test.mjs` claims **286** lines and its file ends in **two**
+newlines, so the embedded body has 285.
+
+Fixed by normalising once and describing what is embedded (`normalise()` + `block()` in the builder).
+
+**Proven load-bearing by mutation.** Reverting only the header back to the unstripped text
+reproduces the failure exactly — `11 mismatched`, exit 1 — and restoring the fix returns
+`mismatched: 0`, exit 0. The verifier's non-zero exit was also confirmed on the failing path
+independently of any shell pipeline.
+
+### What this changes about rebuilding
+
+The packet **was rebuilt** from the fixed tree, and that was correct. The earlier draft of this log
+instructed "do not fix this by rebuilding the packet" on the theory that the mismatches were
+legitimate drift. That instruction was right in spirit — a rebuilt packet must never be passed off
+as what round 9 read — but it was applied to the wrong symptom: the eleven mismatches were a defect
+in the packet's integrity metadata, and leaving them would have left a packet whose hashes could not
+be checked at all.
+
+What preserves the review's interpretability is not the stale packet; it is **this version log**,
+plus the `v1` row above naming the exact sha256 Astra reviewed. A rebuilt packet is labelled as
+post-fix in the `Integrity` section below and must not be represented as the round-9 target.
+
+| File | Finding it changed for | Landed in |
+|---|---|---|
+| `addressClassification.mjs` | 1 (classifier fails open) | `67de00ee0` |
+| `spotlightImageFetch.mjs` | 2 (error path does not release) | `7a23939cf` |
+| `applaudAudioFetcher.mjs` | 5 (rebinding overclaim) | `7a23939cf` |
+| `spotlightImageTransportPin.test.mjs` | 5 (`pinned[0]` overclaim) | `7a23939cf` |
+| `spotlightImageLifecycle.test.mjs` | 2 + 3 (error path, settlement) | `7a23939cf` |
+| `spotlightImageFixtures.mjs` | 3 + 5 (settlement marker, stub claim) | `7a23939cf` |
+
+A round-10 packet is the right instrument for verifying the fixes. This packet is the record of what
+round 9 read, plus an honestly-labelled post-fix rebuild.
+
+## Integrity
+
+`node verify-r9-packet.mjs` re-reads every inlined artifact and compares it against the file it
+claims to be. It accepts a block as verified **EXACT** (disk bytes are the embedded bytes) or
+**REDACTED** (disk bytes with the documented operator-path redaction reproduce the header), so a
+correctly-redacted block is not reported as a permanent false mismatch.
+
+- On **v1** (the packet round 9 reviewed): the verifier caught the v1→v2 drift itself, which is the
+  point of having it — the mismatch was reported before it could be mistaken for a clean packet.
+- On the **rebuilt post-fix packet**: `11 verified against disk, 0 mismatched, 0 absent`, of which
+  **1** verified only under the documented redaction (the round-8 review, which lives outside the
+  repo at `Z:\HostileReviews\` and whose absolute path is redacted by design).
+- Exit code is **1** whenever any block mismatches. Verified on the failing path.
+
diff --git a/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/R1-REVIEW-ROUND-9-PACKET.md b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/R1-REVIEW-ROUND-9-PACKET.md
new file mode 100644
index 000000000..9f4340c09
--- /dev/null
+++ b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/R1-REVIEW-ROUND-9-PACKET.md
@@ -0,0 +1,2888 @@
+---
+---
+title: "Round 9 review packet — the D1-D4 fixes, with every artifact INLINED"
+purpose: >
+  Give a READ-ONLY, SHELL-LESS reviewer everything needed to adjudicate whether the four round-8
+  defects are actually closed, without resolving a single hash, path, or network reference.
+predecessor: Z:/HostileReviews/2026-09-21-163103-social-bridge-round-8-astra-s-dns-pin-review.md
+target_commit: 6cca20594
+repo: SS-PT
+branch: creator-brains-engine-r2-20260915
+built_utc: 2026-09-22T04:26:28.147Z
+built_by: build-round9-packet.mjs
+---
+
+# Round 9 review packet — the D1-D4 fixes, INLINED
+
+## §0 — Read this first: what round 8 found, what changed, and what you are being asked
+
+Round 8 returned **`DEFECTS-FOUND`** — 0 critical / 1 high / 2 medium / 1 low, 4 unproven. Four
+defects, and its own words for the most important one are worth restating because they set the bar
+for this round:
+
+> *"A function whose header promises fail-closed while its IPv6 branch defaults to fail-open is worse
+> than one with no promise, because downstream authors trust the promise."*
+
+**All four are now claimed fixed. This packet exists so you can try to falsify that claim.**
+
+| # | Round-8 defect | Severity | The claimed fix |
+|---|---|---|---|
+| **D1** | response body cancelled *after* the dispatcher was awaited closed | HIGH | `closeDispatcher` moved into a `finally` wrapping the WHOLE fetch-and-body operation; a new `readImageBody` settles the body on every path first |
+| **D2** | `isPrivateOrLocalAddress` had a false fail-closed contract (denylist, `return false // public IPv6`) | MEDIUM | the IPv6 branch INVERTED to an allowlist: `2000::/3` must be *positively recognised* |
+| **D3** | the decisive named-host transport test did not exist | MEDIUM | a new file drives **real sockets** against two real servers and asserts **which address answered** |
+| **D4** | `resolveAndValidate` **admitted** `https://[::ffff:0:127.0.0.1]/` | HIGH | brackets stripped before `net.isIP` so a bracketed literal takes the literal branch |
+
+**Nothing below is cited by reference.** Every source, every test, the classifer, and the mutation
+records are embedded in full, each with its sha256 computed from the same bytes you are reading.
+Hash the fenced blocks yourself if you want to check that promise — they are the artifacts.
+
+**What you can and cannot do.** You are read-only and shell-less: you **cannot execute** anything.
+Do not attempt socket tests or mutation runs; their absence is expected and is accounted for in §5.
+What you *can* do is the part that mattered in round 8 — **read the bytes and adjudicate as text.**
+
+---
+
+## §1 — Remit
+
+Adversarial pass. Your job is to **falsify** the claims below, not to endorse them. For each claim
+return `CONFIRMED`, `FALSIFIED`, or `BLOCKED / unproven`, naming the line of source that supports
+your verdict. A `CONFIRMED` must name what you read.
+
+- **PART A — C1–C9: is each round-8 defect actually closed?** A fix is closed only if the *mechanism*
+  is gone, not if the symptom is quiet.
+- **PART B — the honesty audit.** Round 8 caught comments that overclaimed (C7/C8 falsified: a header
+  saying "no symbol-poking" while the code poked symbols). Re-check every comment that asserts what
+  the code does. **Comments are claims.**
+- **PART C — the new material.** Round 9 adds a transport test and two mutation records. Auditing
+  new tests is the higher-value half: a green suite whose green does not entail the property is the
+  R6-01 defect class, and it is the one this loop keeps finding.
+- **PART D — scope and verdict**, including whether any claim is *unfalsifiable as stated*.
+
+**Grade in both directions.** Do not inflate a residual into a vulnerability; do not deflate one you
+could not reach. If a claim's truth depends on a runtime fact you cannot measure, name the fact and
+mark it `BLOCKED`, not `FALSIFIED`.
+
+---
+
+## §2 — PART A: the claims
+
+| # | Claim | Decidable by reading? |
+|---|---|---|
+| **C1** | The socket connects to the address admission approved, for a DNS NAME, and this is now observed from the NETWORK side rather than by calling our own hook | mostly — the new test's assertions are textual; a live run is the residue |
+| **C2** | An IP LITERAL, **including a BRACKETED IPv6 one**, is stopped by admission and not merely by the resolver | **yes, fully** |
+| **C3** | The D1 ordering is now correct on EVERY path: the body is settled before the pool is closed | **yes, fully** |
+| **C4** | The D1 tests would go RED if the ordering regressed — i.e. they assert ORDER, not presence | reading + the mutation record |
+| **C5** | No existing security guard or test was removed to make these fixes land | **yes** — both patches are below, in full |
+| **C6** | The new transport test asserts on TRANSPORT, and would go RED if the pin were disconnected | reading + the mutation record |
+| **C7** | `isPrivateOrLocalAddress` now genuinely fails closed: unrecognised colon-bearing input is PRIVATE | **yes, fully** |
+| **C8** | The source's own comments do not overclaim (re-audit after round 8 falsified two) | **yes, fully** |
+| **C9** | The classifier's extraction into its own file changed no behaviour for the audio consumer | **yes** — both bodies are below |
+
+### C4 and C6 note, stated up front
+
+Both ask whether a suite would *notice* a change. That is the R6-01 class, and the honest answer has
+a runtime residue: a mutation record can be *fabricated* as easily as it can be written. You cannot
+re-run the mutations. What you *can* do is check that the recorded mutations are the ones that would
+matter, and that the assertions are written to catch them. **One of these mutations SURVIVED its
+first attempt — see §3.5 — and that is reported as a defect against the test, not hidden.** If the
+records had been tidied, you would have no way to tell.
+
+---
+
+## §3 — The artifacts, inlined
+
+### 3.1 The sources under review
+
+#### `backend/services/addressClassification.mjs`
+
+sha256 `5596560edeaaa91d8253bf81b7a123c87a540d1fd15b04329f76acf1b0e9dec8` · 198 lines
+
+D2/D4 fix. The classifier EXTRACTED from applaudAudioFetcher (ban #50) and inverted to an ALLOWLIST. C7/C8/C9 live here.
+
+```mjs
+/**
+ * addressClassification.mjs
+ * =========================
+ * IS THIS ADDRESS PUBLICLY ROUTABLE? — the ONE copy of that answer.
+ *
+ * WHY THIS FILE EXISTS. Extracted from `applaudAudioFetcher.mjs` on 2026-09-21, in the
+ * same way `spotlightImageUrlPolicy.mjs` was extracted from `spotlightImageFetch.mjs`:
+ * `06-bans.md` #50 ("no source file reaches 300 lines") had already been breached there
+ * (322 lines at HEAD), and hostile-review round 8's D2/D4 fix added more. The seam is
+ * **classification vs transport** — this module answers a pure question about a string;
+ * `applaudAudioFetcher.mjs` fetches audio and `spotlightImageUrlPolicy.mjs` admits URLs.
+ *
+ * `isPrivateOrLocalAddress` is RE-EXPORTED from `applaudAudioFetcher.mjs`, so the audio
+ * path's importers and its tests are untouched by the move.
+ *
+ * WHY THERE IS ONLY ONE COPY. Two drifting copies of a private-range table is the failure
+ * mode, not the fix — a range fixed in one copy and not the other is a silent hole. Both
+ * consumers import from here.
+ *
+ * SYNTAX LIVES NEXT DOOR. `ipv6LiteralSyntax.mjs` answers "is this a legal IPv6 literal, and
+ * what bits does it denote"; this file answers "given that, is it safe to reach". Round 9
+ * finding 1 was precisely the consequence of not keeping those apart: classification read the
+ * raw spelling, so two spellings of one address (2002:7f00::1, 2002:7f00:0::1) disagreed.
+ *
+ * THE FAIL-CLOSED INVERSION (round 8, D2/D4). This classifier used to DENYLIST: enumerate
+ * the special ranges and call everything else public. Hostile review measured the cost —
+ * `resolveAndValidate` ADMITTED `https://[::ffff:0:127.0.0.1]/` (a loopback literal)
+ * because a bracketed literal escapes `net.isIP`, leaving this classifier as the only
+ * guard; `dns.lookup` then normalised the address to the HEX form `::ffff:0:7f00:1`, and
+ * the old mapped-IPv4 regex matched only the dotted form. It fell through to
+ * `return false // public IPv6`, and the docblock's promise of fail-closed behaviour was
+ * never true. The IPv6 branch now ALLOWLISTS: to be public an address must be recognisably
+ * global unicast (`2000::/3`), and anything unrecognised is private.
+ */
+
+import { isValidIPv6, expandIPv6 } from './ipv6LiteralSyntax.mjs';
+
+/**
+ * The embedded IPv4 of an IPv6 address that carries one, decoded by BIT POSITION.
+ *
+ * WHY THIS IS SEPARATE AND EXPLICIT. The embedded IPv4 is the address the socket will
+ * actually reach, so it must be classified as IPv4 — not as "IPv6, unrecognised". The
+ * old code handled exactly one notation (`::ffff:1.2.3.4`) and silently admitted every
+ * other, which is hostile review round 8 D4: `::ffff:0:7f00:1` IS `::ffff:0:127.0.0.1`,
+ * i.e. loopback, and it was classified public.
+ *
+ * Forms handled, all by their RFC-defined offsets rather than by string shape:
+ *   ::ffff:0:0/96   IPv4-mapped            last 32 bits (RFC 4291 §2.5.5.2)
+ *   ::/96           IPv4-compatible        last 32 bits (deprecated, still routable)
+ *   64:ff9b::/96    NAT64 well-known       last 32 bits (RFC 6052)
+ *   64:ff9b:1::/48  NAT64 local-use        last 32 bits
+ *   2002::/16       6to4                   bits 16-47 (RFC 3056)
+ *
+ * REWRITTEN AFTER ROUND 9 FINDING 1. The previous version pattern-matched raw spellings, so
+ * a compressed zero group changed the answer. Working on the expanded form removes that class
+ * of bug rather than adding another case to the list.
+ *
+ * @param {string} addr an unbracketed IPv6 literal
+ * @returns {string|null} the embedded dotted-quad, or null if the form embeds none
+ */
+function extractEmbeddedIPv4(addr) {
+  const expanded = expandIPv6(addr);
+  if (expanded === null) return null;
+
+  const g = expanded.split(':').map((x) => parseInt(x, 16));
+  const quad = (hi, lo) => `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
+  const isZeroPrefix = (n) => g.slice(0, n).every((x) => x === 0);
+
+  // 6to4 — 2002::/16, IPv4 in bits 16-47 (groups 1 and 2).
+  if (g[0] === 0x2002) return quad(g[1], g[2]);
+
+  // NAT64 well-known (64:ff9b::/96) and local-use (64:ff9b:1::/48): last 32 bits.
+  if (g[0] === 0x0064 && g[1] === 0xff9b) return quad(g[6], g[7]);
+
+  // IPv4-mapped ::ffff:0:0/96 — groups 0-4 zero, group 5 is ffff. Last 32 bits.
+  if (isZeroPrefix(5) && g[5] === 0xffff) return quad(g[6], g[7]);
+
+  // IPv4-compatible ::/96 — groups 0-5 zero (and not :: or ::1, which are handled upstream).
+  if (isZeroPrefix(6)) return quad(g[6], g[7]);
+
+  return null;
+}
+
+/**
+ * The positive test: is this IPv6 literal a *global unicast* address?
+ *
+ * Deliberately conservative and deliberately ALLOWLISTING. Every previous version of this
+ * classifier was denylisting — enumerate the bad ranges and call the rest public — which
+ * meant a range nobody thought of was silently public. That is how `::ffff:0:7f00:1` got
+ * through. Here the burden is inverted: an address is public only if it is recognisably
+ * in the global unicast space.
+ *
+ * `2000::/3` is the entire currently-assigned global unicast range (2000:: – 3fff:...).
+ * Addresses outside it are special-purpose by definition.
+ *
+ * ROUND 9 FINDING 1: the syntax check is NOT optional and must come first. Validating only
+ * the leading group admitted `2606:not-an-ip`. A string that is not an IPv6 address cannot
+ * be a publicly routable one.
+ *
+ * @param {string} addr an unbracketed IPv6 literal
+ * @returns {boolean} true only if the address is a legal address inside 2000::/3
+ */
+function isPubliclyRoutableIPv6(addr) {
+  if (!isValidIPv6(addr)) return false;  // not an address => not a public address
+  const [head] = addr.split(':');
+  if (!/^[0-9a-f]{1,4}$/i.test(head)) return false;   // leading '::' — not global unicast
+  const leading = parseInt(head, 16);
+  // 2000::/3 — the first three bits are 001, so the first group is 0x2000-0x3fff.
+  return leading >= 0x2000 && leading <= 0x3fff;
+}
+
+/**
+ * Reject any address that's NOT publicly routable.
+ *
+ * Covers IPv4 + IPv6:
+ *   - 127.0.0.0/8       loopback
+ *   - 10.0.0.0/8        RFC1918 private
+ *   - 172.16.0.0/12     RFC1918 private
+ *   - 192.168.0.0/16    RFC1918 private
+ *   - 169.254.0.0/16    link-local
+ *   - 100.64.0.0/10     CGNAT (carrier-grade NAT)
+ *   - 224.0.0.0/4       multicast (224.0.0.0 - 239.255.255.255)
+ *   - 0.0.0.0/8         "this network"
+ *   - 240.0.0.0/4       reserved (240.0.0.0 - 255.255.255.255 incl broadcast)
+ *   - ::                IPv6 unspecified
+ *   - ::1, 0::1, ::1 in any expanded form   IPv6 loopback
+ *   - ::ffff:a.b.c.d and ::ffff:hhhh:hhhh   IPv4-mapped IPv6 (BOTH notations)
+ *   - ::a.b.c.d and ::hhhh:hhhh             IPv4-COMPATIBLE IPv6 (deprecated)
+ *   - 64:ff9b::/96      NAT64 well-known prefix (embeds an IPv4)
+ *   - 64:ff9b:1::/48    NAT64 local-use prefix
+ *   - 2002::/16         IPv4-in-IPv6 6to4 (embeds an IPv4 in bits 16-47)
+ *   - fc00::/7          IPv6 ULA
+ *   - fe80::/10         IPv6 link-local
+ *   - ff00::/8          IPv6 multicast
+ *   - 100::/64          IPv6 discard-only
+ *   - 2001:db8::/32     IPv6 documentation
+ *
+ * Defaults to "private" on unknown / un-parseable input (fail-closed).
+ *
+ * THE IPv6 DEFAULT IS FAIL-CLOSED, AND THAT IS A FIX, NOT AN ORIGINAL PROPERTY.
+ * This branch used to `return false` ("public IPv6") for anything it did not
+ * positively recognise, while the docblock claimed fail-closed behaviour. Hostile
+ * review round 8 (2026-09-21, D2/D4) measured the gap and then found it was
+ * load-bearing: `resolveAndValidate` ADMITTED `https://[::ffff:0:127.0.0.1]/`
+ * because a bracketed literal escapes `net.isIP` (leaving the classifier as the only
+ * guard), `dns.lookup` normalises it to the HEX form `::ffff:0:7f00:1`, and the old
+ * mapped-IPv4 regex matched only the dotted form. Unrecognised no longer means public:
+ * `isPubliclyRoutableIPv6` now has to say yes explicitly.
+ */
+export function isPrivateOrLocalAddress(ip) {
+  if (typeof ip !== 'string' || ip.length === 0) return true;
+
+  // IPv6
+  if (ip.includes(':')) {
+    // Brackets are a URL-authority artefact, not part of the address, and `net.isIP`
+    // rejects them — so a bracketed literal arrives here as a "name". Strip first.
+    const addr = ip.startsWith('[') && ip.endsWith(']') ? ip.slice(1, -1) : ip;
+
+    if (addr === '::' || addr === '::1') return true;   // unspecified / loopback (canonical)
+    if (/^[fF][cCdD]/.test(addr)) return true;          // fc00::/7 ULA
+    // fe80::/10 link-local. Range covers fe80 - febf (NOT just fe80-fe89).
+    // Bug fix per Codex NH-4 — original /^[fF][eE]8/ missed fea0-febf.
+    if (/^[fF][eE][89aAbB]/.test(addr)) return true;    // fe80::/10 link-local
+    if (/^[fF][fF]/.test(addr)) return true;            // ff00::/8 multicast
+    if (/^100::/i.test(addr)) return true;              // 100::/64 discard-only
+    if (/^2001:0?[dD][bB]8:/i.test(addr)) return true;  // 2001:db8::/32 documentation
+
+    // IPv4-embedding IPv6 forms. These must be decoded BEFORE the generic check,
+    // because the embedded IPv4 is the address that will actually be reached.
+    const embedded = extractEmbeddedIPv4(addr);
+    if (embedded) return isPrivateOrLocalAddress(embedded);
+
+    // Everything else: only a positively-recognised global unicast address is public.
+    // Unrecognised is private. This is the fail-closed default the docblock always
+    // promised; see the note above.
+    return !isPubliclyRoutableIPv6(addr);
+  }
+
+  // IPv4
+  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
+  if (!m) return true; // can't parse → fail closed
+  const a = Number(m[1]);
+  const b = Number(m[2]);
+  // Every octet must be in range. The regex above accepts `8.8.8.999`, which is not an
+  // address at all — hostile review round 8 (D2) reached this via the IPv6 branch's
+  // `includes(':')` test, but the real defect is here: an out-of-range octet used to fall
+  // through to the "public IPv4" return. Un-parseable must mean private, as the docblock says.
+  if (m.slice(1).some((octet) => Number(octet) > 255)) return true;
+  if (a === 0) return true;                              // 0.0.0.0/8
+  if (a === 10) return true;                             // 10.0.0.0/8
+  if (a === 127) return true;                            // 127.0.0.0/8 loopback
+  if (a === 169 && b === 254) return true;               // 169.254.0.0/16 link-local
+  if (a === 172 && b >= 16 && b <= 31) return true;      // 172.16.0.0/12
+  if (a === 192 && b === 168) return true;               // 192.168.0.0/16
+  if (a === 100 && b >= 64 && b <= 127) return true;     // 100.64.0.0/10 CGNAT
+  if (a >= 224 && a <= 239) return true;                 // multicast
+  if (a >= 240) return true;                             // reserved + broadcast
+  return false;                                          // public IPv4
+}
+```
+
+#### `backend/services/spotlightImageUrlPolicy.mjs`
+
+sha256 `9eeb2470c863d96b2ddfecf63ce462a40d8dcde5204ac859b2c6634ef134353e` · 241 lines
+
+D4 half one: brackets stripped before `net.isIP`. Also the pinned lookup/dispatcher factories. C1, C2, C3.
+
+```mjs
+/**
+ * spotlightImageUrlPolicy.mjs
+ * ===========================
+ * URL ADMISSION for the SwanGuard → SwanStudios Spotlight image path.
+ *
+ * WHY THIS FILE EXISTS. Split out of `spotlightImageFetch.mjs` on 2026-09-20, when the D8 / R2-03
+ * hardening (a bounded DNS lookup) pushed that file to 320 lines against `06-bans.md` #50 — "no
+ * source file reaches 300 lines". The seam is **admission vs transport**: this module decides
+ * whether a URL may be fetched at all; `spotlightImageFetch.mjs` performs the fetch and the decode.
+ * Both exports are re-exported from `spotlightImageFetch.mjs`, so no existing importer changed.
+ *
+ * WHAT IS DELIBERATELY DIFFERENT FROM THE PLAUD AUDIO PRECEDENT. `applaudAudioFetcher.mjs` can
+ * demand an EXACT hostname match because it only ever fetches one vendor. A Spotlight image URL is
+ * chosen by the curator in SwanGuard and points at an arbitrary publisher, so an exact-host
+ * allowlist is not available. The controls here are therefore the ones that survive an arbitrary
+ * host: HTTPS only, no embedded credentials, and DNS-resolved private-range rejection that fails
+ * closed and checks EVERY resolved address rather than the first.
+ *
+ * The private-range table is IMPORTED, never re-implemented — two copies of that table is the
+ * failure mode, not the fix.
+ *
+ * THE PREFIX PIN (2026-09-21). The first version of this module resolved, validated, and then
+ * THREW THE ADDRESSES AWAY — so the later `fetch()` re-resolved the same name independently and a
+ * name that flipped between the two lookups reached a private address anyway (DNS-rebinding TOCTOU).
+ * `resolveAndValidate` now RETURNS the validated addresses, and `createPinnedDispatcher` turns them
+ * into an `undici.Agent` whose `connect.lookup` answers from that fixed set. The socket can only go
+ * where the check looked. See the pin note further down for the honest residual.
+ */
+import { promises as dns } from 'node:dns';
+import net from 'node:net';
+import { Agent } from 'undici';
+import { isPrivateOrLocalAddress } from './applaudAudioFetcher.mjs';
+
+export class SpotlightImageError extends Error {
+  constructor(code, message) {
+    super(message || code);
+    this.name = 'SpotlightImageError';
+    this.code = code;
+  }
+}
+
+/**
+ * Budget for the pre-flight DNS lookup, SEPARATE from `IMAGE_FETCH_TIMEOUT_MS` in the fetch module.
+ *
+ * The fetch timeout is created as part of the `fetch()` call, and the lookup happens BEFORE that
+ * call — so resolver time sat entirely outside the budget it appeared to bound. A host with a slow
+ * or hanging resolver held the request open indefinitely (hostile review D8 / R2-03). Bounded here
+ * instead, with its own code so "the resolver hung" is distinguishable from "the name does not
+ * resolve".
+ */
+export const DNS_LOOKUP_TIMEOUT_MS = 3_000;
+
+/**
+ * `dns.lookup` accepts no AbortSignal, so the lookup is bounded by racing it against a timer.
+ * The timer is cleared in `finally`, so a fast lookup leaves no pending handle behind — and a
+ * timer that outlived its race would keep the process alive for no reason.
+ *
+ * WHAT THE BOUND DOES AND DOES NOT DO (hostile review round 8, C10 item 3; re-measured round 9).
+ * It bounds the CALLER'S WAIT. It does NOT stop the resolver. `dns.promises.lookup(hostname,
+ * options)` takes no signal and returns a bare Promise — verified on this host: the signature is
+ * `function lookup(hostname, options)`, and it mentions no `AbortSignal`. `Promise.race` therefore
+ * releases this function while the underlying libuv threadpool lookup is still outstanding, and a
+ * lookup that never answers can hold a threadpool slot (default size 4) past this call's return.
+ *
+ * HONEST LIMIT ON THAT CLAIM. The source-level fact is decided above. The RUNTIME consequence —
+ * that a hung lookup measurably starves the pool — was NOT reproduced here: every probe name on
+ * this host resolved or failed within ~58ms, so no lookup could be kept pending long enough to
+ * measure. The claim is CONFIRMED as a source fact and UNPROVEN as a measured impact, and is
+ * recorded that way rather than inflated. No cancellation is implemented, because none can be
+ * added additively: `dns.resolve*` is a different operation (no `/etc/hosts`, no OS resolver) and
+ * the callback form would change the shape callers depend on.
+ */
+const lookupWithTimeout = async (hostname, ms) => {
+  let timer;
+  try {
+    return await Promise.race([
+      dns.lookup(hostname, { all: true }),
+      new Promise((_resolve, reject) => {
+        timer = setTimeout(
+          () => reject(new SpotlightImageError('IMAGE_URL_DNS_TIMEOUT', `DNS lookup exceeded ${ms}ms`)),
+          ms
+        );
+      }),
+    ]);
+  } finally {
+    clearTimeout(timer);
+  }
+};
+
+/**
+ * Validate a curator-supplied image URL.
+ * HTTPS only; no embedded credentials; every resolved address must be publicly routable.
+ *
+ * `dnsTimeoutMs` is injectable so the bound can be tested without waiting the real budget out.
+ * It defaults to the production value, so every existing caller is unaffected.
+ *
+ * @param {string} rawUrl
+ * @param {{ dnsTimeoutMs?: number }} [opts]
+ * @returns {Promise<URL>} the parsed URL
+ * @throws {SpotlightImageError}
+ */
+export async function validateSpotlightImageUrl(rawUrl, opts) {
+  const { url } = await resolveAndValidate(rawUrl, opts);
+  return url;
+}
+
+/**
+ * The full admission result: the parsed URL AND the addresses it was admitted on.
+ *
+ * This exists as a separate export because the two facts travel together — a caller that validates
+ * but does not pin has only a check, not a control. `validateSpotlightImageUrl` is kept as the
+ * URL-only front door so the twelve existing call sites and the re-export in
+ * `spotlightImageFetch.mjs` are untouched; the fetch path calls THIS one.
+ *
+ * @param {string} rawUrl
+ * @param {{ dnsTimeoutMs?: number }} [opts]
+ * @returns {Promise<{ url: URL, addrs: Array<{ address: string, family: number }> }>}
+ * @throws {SpotlightImageError}
+ */
+export async function resolveAndValidate(rawUrl, { dnsTimeoutMs = DNS_LOOKUP_TIMEOUT_MS } = {}) {
+  let incoming;
+  try {
+    incoming = new URL(String(rawUrl));
+  } catch {
+    throw new SpotlightImageError('IMAGE_URL_MALFORMED', 'not a parseable URL');
+  }
+
+  // HTTPS only. `http:` was previously accepted, which allowed plaintext internal probes.
+  if (incoming.protocol !== 'https:') {
+    throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', `protocol must be https, got ${incoming.protocol}`);
+  }
+
+  // `https://allowed@evil.com` — the userinfo section is not part of the host, so a
+  // check that only inspects hostname would read this as evil.com with credentials.
+  if (incoming.username || incoming.password) {
+    throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', 'credentials in URL not allowed');
+  }
+
+  // An IP-literal host (`https://10.0.0.1/`) has no name to resolve, and `dns.lookup` on a literal
+  // returns the literal — so it is validated here directly and pinned as itself. Without this the
+  // literal case would take the lookup path and depend on resolver behaviour for a value that was
+  // never a name.
+  //
+  // STRIP THE BRACKETS FIRST (hostile review round 8, D4). `URL.hostname` KEEPS the brackets on an
+  // IPv6 authority — `new URL('https://[::1]/').hostname === '[::1]'` — and `net.isIP('[::1]')` is
+  // **0**, so every IPv6 literal used to fall past this branch and take the DNS path. That was not
+  // harmless: `dns.lookup` normalises the address, and the classifier below only recognised the
+  // DOTTED IPv4-mapped form, so `https://[::ffff:0:127.0.0.1]/` — a loopback literal — was
+  // ADMITTED and pinned as `::ffff:0:7f00:1`. The classifier's fail-closed inversion closes that
+  // too; this stripping is the second half, so a literal is classified AS a literal rather than
+  // depending on how a resolver happens to normalise it.
+  const hostname = incoming.hostname.startsWith('[') && incoming.hostname.endsWith(']')
+    ? incoming.hostname.slice(1, -1)
+    : incoming.hostname;
+  const literalFamily = net.isIP(hostname);
+  if (literalFamily) {
+    if (isPrivateOrLocalAddress(hostname)) {
+      throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', `host is a private/local address ${hostname}`);
+    }
+    return { url: incoming, addrs: [{ address: hostname, family: literalFamily }] };
+  }
+
+  // Resolve first, then reject. A name that resolves to 127.0.0.1 / 169.254.169.254 / 10.x
+  // is refused before any socket is opened, which closes direct internal targeting.
+  let addrs;
+  try {
+    addrs = await lookupWithTimeout(incoming.hostname, dnsTimeoutMs);
+  } catch (err) {
+    // A timeout keeps its own code: "the resolver hung" and "the name does not resolve" are
+    // different operational facts, and collapsing them would hide a hanging resolver.
+    if (err?.code === 'IMAGE_URL_DNS_TIMEOUT') throw err;
+    throw new SpotlightImageError('IMAGE_URL_DNS_FAILED', `DNS lookup failed: ${err.message}`);
+  }
+  if (!Array.isArray(addrs) || addrs.length === 0) {
+    throw new SpotlightImageError('IMAGE_URL_DNS_FAILED', 'DNS lookup returned no addresses');
+  }
+  for (const { address } of addrs) {
+    if (isPrivateOrLocalAddress(address)) {
+      throw new SpotlightImageError('IMAGE_URL_NOT_ALLOWED', `host resolves to private/local address ${address}`);
+    }
+  }
+
+  return { url: incoming, addrs };
+}
+
+/**
+ * The `connect.lookup` hook that answers from a fixed address set, exported so its contract can
+ * be tested directly rather than by reaching into `undici`'s internals.
+ *
+ * The signature is `net`'s: `lookup(hostname, options, callback)`. Two answer shapes exist
+ * because `net` calls it both ways — `{ all: true }` expects an array of `{address, family}`,
+ * otherwise a bare address plus a separate family argument. Answering only one shape would make
+ * the pin work for one caller and silently fall through for the other.
+ *
+ * `hostname` is deliberately ignored. The whole point is that the name carries no authority at
+ * this layer — the decision was made upstream, and this hook has no second opinion to offer.
+ *
+ * @param {Array<{ address: string, family: number }>} addrs
+ * @returns {(hostname: string, options: object, callback: Function) => void}
+ */
+export function createPinnedLookup(addrs) {
+  const pinned = addrs.map(({ address, family }) => ({ address, family }));
+  return (_hostname, options, callback) => {
+    if (options?.all) return callback(null, pinned);
+    const first = pinned[0];
+    return callback(null, first.address, first.family);
+  };
+}
+
+/**
+ * Turn a validated address set into a dispatcher that can ONLY connect to that set.
+ *
+ * WHY. Validating and then calling a plain `fetch()` leaves a TOCTOU window: `fetch` resolves the
+ * hostname again, independently, so a name that was public at check time can answer with a private
+ * address at connect time. Pinning the answer inside `connect.lookup` closes the window at the
+ * layer that actually opens the socket — the connection is handed the addresses the check approved
+ * and has no second opinion available to it.
+ *
+ * THE HONEST RESIDUAL. This pins the CONNECT for the host we validated. It does not, by itself,
+ * cover a `Location:` redirect to a different host — that is handled one layer up by
+ * `redirect: 'error'` in `spotlightImageFetch.mjs`, which refuses to follow any redirect at all.
+ * The two controls are complementary: this one makes the first hop honest, that one prevents a
+ * second hop from existing. Neither is a defence for a caller that ignores it.
+ *
+ * The agent is a live socket pool, so the CALLER MUST `close()` it. `close()` is on the returned
+ * object (it is a real `Agent`), and closing drains idle sockets and lets the event loop exit.
+ *
+ * @param {Array<{ address: string, family: number }>} addrs validated addresses
+ * @returns {Agent} a dispatcher pinned to `addrs`
+ */
+export function createPinnedDispatcher(addrs) {
+  if (!Array.isArray(addrs) || addrs.length === 0) {
+    // Fail closed. A dispatcher with no addresses would fall through to the system resolver, which
+    // is precisely the behaviour this function exists to prevent.
+    throw new SpotlightImageError('IMAGE_URL_DNS_FAILED', 'cannot pin an empty address set');
+  }
+
+  // `connect.lookup` is the same hook `net`/`tls` expose: it is asked to resolve the hostname
+  // immediately before the socket is opened, and its answer is used verbatim. Answering from the
+  // validated set means no resolver is consulted on this connection at all.
+  return new Agent({ connect: { lookup: createPinnedLookup(addrs) } });
+}
+```
+
+#### `backend/services/spotlightImageFetch.mjs`
+
+sha256 `4937b63cb7a4bd3f243bc9b64ebe958805dd0c4b3bf5da96cc024a2a7c371086` · 236 lines
+
+D1 fix. `closeDispatcher` now wraps the whole fetch-and-body operation; `readImageBody` settles the body first. C4, C5.
+
+```mjs
+/**
+ * spotlightImageFetch.mjs
+ * =======================
+ * SSRF-hardened fetch + decode for the SwanGuard → SwanStudios Spotlight image.
+ *
+ * WHY THIS EXISTS. `rehostImage()` in routes/bridge/bridgeIngestRoutes.mjs used to
+ * validate the URL by checking the protocol and calling fetch with defaults. That
+ * check constrains the URL you PASS, not the URL you CONNECT to: `fetch` follows
+ * redirects by default, so any host returning `302 → http://169.254.169.254/...`
+ * defeated it. The 8 MiB cap was also applied AFTER `arrayBuffer()` had buffered the
+ * whole response, so it bounded what was STORED, not what was CONSUMED.
+ *
+ * THE PRECEDENT. `applaudAudioFetcher.mjs` already solves this threat model for the
+ * PLAUD audio path (Codex CR-4: exact host, HTTPS, no credentials, DNS-resolved
+ * private-IP rejection, `redirect:'error'`, streamed caps). This module reuses its
+ * `isPrivateOrLocalAddress` rather than growing a second, drifting copy — two copies
+ * of a private-range table is the failure mode, not the fix.
+ *
+ * WHAT IS DELIBERATELY DIFFERENT FROM THE AUDIO PRECEDENT. The audio path can demand
+ * an EXACT hostname match because it only ever fetches one vendor. A Spotlight image
+ * URL is chosen by the curator in SwanGuard and points at an arbitrary publisher, so
+ * an exact-host allowlist is not available. The controls below are therefore the ones
+ * that survive an arbitrary host: HTTPS, no credentials, DNS-resolved private-range
+ * rejection, no redirect following, a streamed byte cap, byte-sniffed type, and a
+ * re-encode that strips metadata and normalises the stored artefact.
+ *
+ * FAILURE IS ALWAYS NON-FATAL TO THE CALLER. Every export returns a result object or
+ * throws SpotlightImageError; the caller maps any failure to `imageUrl = null`. A
+ * dropped Spotlight is worse than an imageless one (blueprint ban #4).
+ */
+import logger from '../utils/logger.mjs';
+import {
+  SpotlightImageError,
+  DNS_LOOKUP_TIMEOUT_MS,
+  validateSpotlightImageUrl,
+  resolveAndValidate,
+  createPinnedDispatcher,
+} from './spotlightImageUrlPolicy.mjs';
+import { decodeSpotlightImage, MAX_IMAGE_PIXELS, MAX_STORED_EDGE } from './spotlightImageDecode.mjs';
+
+// RE-EXPORTED, so every existing importer keeps working after the extractions. Both splits were
+// forced by `06-bans.md` #50 ("no source file reaches 300 lines"), not by design: URL admission
+// lives in `spotlightImageUrlPolicy.mjs`, the byte-level decode in `spotlightImageDecode.mjs`,
+// and TRANSPORT — the pinned socket and the read caps — is what remains here.
+export { SpotlightImageError, DNS_LOOKUP_TIMEOUT_MS, validateSpotlightImageUrl };
+export { decodeSpotlightImage, MAX_IMAGE_PIXELS, MAX_STORED_EDGE };
+
+/** 5 MiB compressed input — the ceiling on what we will read off the wire. */
+export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
+/** Total budget for connect + headers + body. */
+export const IMAGE_FETCH_TIMEOUT_MS = 5_000;
+
+/**
+ * Fetch an image with `redirect: 'error'`, a pinned connect, and a streamed byte cap.
+ * Returns { ok: true, bytes, contentType } or { ok: false, code, message } — never throws.
+ */
+export async function fetchSpotlightImage(rawUrl, opts = {}) {
+  const {
+    maxBytes = MAX_IMAGE_BYTES,
+    timeoutMs = IMAGE_FETCH_TIMEOUT_MS,
+    fetchImpl = globalThis.fetch,
+    // Injectable so a test can OBSERVE the dispatcher's lifetime rather than infer it. The
+    // D1 defect (hostile review round 8) was an ordering bug — the pool was closed before
+    // the body was settled — and ordering is only visible to a caller that holds the object.
+    // Defaults to the real factory, so every production caller is unaffected.
+    dispatcherFactory = createPinnedDispatcher,
+  } = opts;
+
+  // Admission returns the addresses it approved, not merely a verdict. Passing a bare URL onward
+  // would let the transport resolve the name a second time — the TOCTOU this pin exists to close.
+  let url;
+  let addrs;
+  try {
+    ({ url, addrs } = await resolveAndValidate(rawUrl));
+  } catch (err) {
+    return { ok: false, code: err.code || 'IMAGE_URL_INVALID', message: err.message };
+  }
+
+  // The socket may only go where the check looked.
+  let dispatcher;
+  try {
+    dispatcher = dispatcherFactory(addrs);
+  } catch (err) {
+    return { ok: false, code: err.code || 'IMAGE_URL_INVALID', message: err.message };
+  }
+
+  // THE AGENT IS A LIVE SOCKET POOL, AND ITS LIFETIME IS THE WHOLE OPERATION — NOT JUST THE HEADERS.
+  //
+  // WHAT WAS WRONG (hostile review round 8, D1 — graded HIGH). This used to be a `finally` that
+  // awaited `dispatcher.close()` the moment `fetch()` returned, i.e. as soon as the RESPONSE HEADERS
+  // had arrived. But `fetch()` resolves while the BODY may still be streaming, and every path below
+  // — the 4xx/5xx cancel, the declared-size cancel, the streamed read — was therefore reached only
+  // AFTER the pool had been asked to shut down. `close()` drains idle sockets "once in-flight
+  // requests settle", and a body still being read IS an in-flight request, so the order made the
+  // shutdown wait on the very body this function was about to cancel. Wrong by construction:
+  // settlement first, then closure.
+  //
+  // WHAT REPLACES IT. The close now happens in the `finally` of a block that wraps the ENTIRE
+  // fetch-and-body operation, and the body is settled explicitly on every path (`settleBody`)
+  // before that `finally` runs. So the pool closes over a body that has already been consumed,
+  // cancelled, or abandoned by an aborted signal.
+  const closeDispatcher = async () => {
+    try { await dispatcher.close(); } catch { /* close is best-effort */ }
+  };
+
+  let response;
+  try {
+    try {
+      response = await fetchImpl(url.toString(), {
+        method: 'GET',
+        // THE FIRST-HOP FIX. Following a redirect re-enters the network with a URL that was never
+        // validated — the protocol/host/DNS checks above only ever saw the first hop.
+        redirect: 'error',
+        // THE CONNECT FIX. The agent answers `connect.lookup` from the validated addresses, so the
+        // name is not resolved a second time and cannot flip to a private address between the check
+        // and the socket. `redirect: 'error'` above is what keeps the connected host the validated
+        // host — together they mean there is no unvalidated hop (DNS-rebinding TOCTOU, closed).
+        dispatcher,
+        signal: AbortSignal.timeout(timeoutMs),
+        headers: { accept: 'image/*' },
+      });
+    } catch (err) {
+      const msg = err?.message || '';
+      if (err?.code === 'UND_ERR_RES_EXCEEDED_MAX_REDIRECTS' || /redirect/i.test(msg)) {
+        return { ok: false, code: 'IMAGE_URL_REDIRECT_REJECTED', message: msg || 'redirect rejected' };
+      }
+      if (err?.name === 'TimeoutError' || err?.name === 'AbortError' || /timeout|aborted/i.test(msg)) {
+        return { ok: false, code: 'IMAGE_FETCH_TIMEOUT', message: 'image fetch timed out' };
+      }
+      return { ok: false, code: 'IMAGE_FETCH_FAILED', message: msg || 'image fetch failed' };
+    }
+
+    return await readImageBody(response, { maxBytes });
+  } finally {
+    // Runs after `readImageBody` has settled the body on every path — consumed, cancelled, or
+    // aborted. This is the ordering the old code had backwards.
+    await closeDispatcher();
+  }
+}
+
+/**
+ * Turn an already-headed response into bytes, settling its body before this returns.
+ *
+ * Split out of `fetchSpotlightImage` so the dispatcher's `finally` can wrap this whole unit: the
+ * pool must not be closed while a body is still being read (hostile review round 8, D1).
+ * Every exit path either consumes the stream to completion or cancels it, and `cancel` on an
+ * already-errored stream is itself best-effort.
+ *
+ * @param {Response} response
+ * @param {{ maxBytes: number }} opts
+ * @returns {Promise<{ ok: true, bytes: Buffer, contentType: string } | { ok: false, code: string, message: string }>}
+ */
+async function readImageBody(response, { maxBytes }) {
+  if (!response.ok) {
+    // RELEASE THE SOCKET. Returning here without draining or cancelling leaves the response body
+    // open until GC, so an upstream that answers 4xx/5xx with a large body holds one connection
+    // per request for an unbounded time (hostile review D8 / R2-03).
+    try { await response.body?.cancel('upstream not ok'); } catch { /* release is best-effort */ }
+    return { ok: false, code: 'IMAGE_FETCH_FAILED', message: `upstream returned ${response.status}` };
+  }
+
+  // Optional early exit. The streamed cap below is the authoritative gate, because a
+  // declared Content-Length is a claim, not a fact.
+  const declared = Number(response.headers.get('content-length'));
+  if (Number.isFinite(declared) && declared > maxBytes) {
+    // Same release as above: an over-cap declaration is a reason to stop reading, and stopping
+    // means cancelling the stream rather than walking away from an open one.
+    try { await response.body?.cancel('declared length over cap'); } catch { /* release is best-effort */ }
+    return { ok: false, code: 'IMAGE_TOO_LARGE', message: `Content-Length ${declared} > cap ${maxBytes}` };
+  }
+
+  if (!response.body) {
+    return { ok: false, code: 'IMAGE_FETCH_FAILED', message: 'response has no body' };
+  }
+
+  const chunks = [];
+  let total = 0;
+  // Declared OUTSIDE the try so the catch can reach it. The correct release for a stream that
+  // threw mid-read is the READER's cancel, not the body's — see the catch.
+  let reader;
+  try {
+    reader = response.body.getReader();
+    for (;;) {
+      const { done, value } = await reader.read();
+      if (done) break;
+      const chunk = Buffer.from(value);
+      total += chunk.length;
+      // Cap enforced WHILE reading. The previous code buffered the entire body with
+      // arrayBuffer() and only then compared its length — so a multi-gigabyte response
+      // was fully materialised before being rejected.
+      if (total > maxBytes) {
+        try { await reader.cancel('size cap exceeded'); } catch { /* release is best-effort */ }
+        return { ok: false, code: 'IMAGE_TOO_LARGE', message: `streamed ${total} bytes > cap ${maxBytes}` };
+      }
+      chunks.push(chunk);
+    }
+  } catch (err) {
+    // RELEASE THE READER, NOT THE BODY (hostile review round 9, finding 2 — corrected).
+    //
+    // The first version of this fix called `response.body.cancel(...)`. It looked right and it
+    // NEVER WORKED: once `getReader()` has been called the body is LOCKED, so `body.cancel()`
+    // throws `Invalid state: ReadableStream is locked` and the empty catch swallowed it. The
+    // socket stayed open, and — worse — the empty catch made the release look handled. A test
+    // that recorded "cancel was attempted" passed; only recording "cancel SETTLED" exposed it.
+    //
+    // `reader.cancel()` is the call that actually releases a locked stream, and `reader` is in
+    // scope here because it is declared outside the try. This also matches the over-cap path
+    // above, which cancels through the reader for the same reason.
+    try { await reader?.cancel('stream read failed'); } catch { /* release is best-effort */ }
+    return { ok: false, code: 'IMAGE_FETCH_FAILED', message: `stream read failed: ${err.message}` };
+  }
+
+  return {
+    ok: true,
+    bytes: Buffer.concat(chunks),
+    contentType: response.headers.get('content-type') || 'application/octet-stream',
+  };
+}
+
+
+/**
+ * One call for the route: validate → fetch → decode.
+ * Any failure is a value, never an exception, so the ingest path cannot be broken by an image.
+ */
+export async function fetchAndDecodeSpotlightImage(rawUrl, opts = {}) {
+  const fetched = await fetchSpotlightImage(rawUrl, opts);
+  if (!fetched.ok) return fetched;
+
+  try {
+    const decoded = await decodeSpotlightImage(fetched.bytes, opts);
+    return { ok: true, ...decoded, sourceContentType: fetched.contentType };
+  } catch (err) {
+    if (err instanceof SpotlightImageError) return { ok: false, code: err.code, message: err.message };
+    logger.warn(`Spotlight image decode failed unexpectedly: ${err.message}`);
+    return { ok: false, code: 'IMAGE_DECODE_FAILED', message: err.message };
+  }
+}
+```
+
+#### `backend/services/applaudAudioFetcher.mjs`
+
+sha256 `db112664465854a42e4010b6e54db084ccaf6d65882e5e90d1ff00dd3df5f5f6` · 295 lines
+
+The SHARED consumer. It now imports and re-exports the extracted classifier; its own suite is the regression gate. C9.
+
+```mjs
+/**
+ * applaudAudioFetcher.mjs
+ * ========================
+ * URL allowlist validation + bounded HTTP fetch for Applaud-served audio.
+ *
+ * Phase 5 Slice 5.3 (2026-05-04). Plan: PHASE-5-PLAUD-AUTO-INGESTION-PLAN-v1.2-2026-05-04.md §3.3 V1.4 + §4.2 step 8 + §5.2.
+ *
+ * Codex CR-4 requirements (no compromises):
+ *   1. Parse via `new URL()` — reject on parse fail
+ *   2. EXACT hostname match against allowed base — no prefix/suffix/wildcard
+ *   3. EXACT port match
+ *   4. HTTPS-only (`https:`)
+ *   5. No credentials in URL (reject `https://allowed@evil.com`)
+ *   6. DNS resolution — reject if ANY resolved address is private/loopback/
+ *      link-local/multicast (defeats DNS rebinding)
+ *   7. `redirect: 'error'` on fetch — no redirect-following
+ *   8. Content-Length cap (declared) + streamed-bytes cap (in case header lies)
+ *   9. 30-second fetch timeout
+ *
+ * Public API:
+ *   validateAudioUrl(rawUrl, allowedBaseUrl) -> URL | throws AudioUrlError
+ *   fetchAudioWithCaps(audioUrl, declaredSizeBytes, opts) -> {ok, bytes, mimetype} | {error, errorCode, errorStatus, message}
+ *   isPrivateOrLocalAddress(ip) -> bool   (exported for tests)
+ *
+ * Error classes:
+ *   AudioUrlError(code) — URL validation failures
+ *   AudioFetchError(code, status) — HTTP fetch failures
+ */
+import { promises as dns } from 'node:dns';
+// Imported for local use at line ~114 (the resolved-address rejection in `validateAudioUrl`)
+// AND re-exported at the foot of this file. A bare `export ... from` would not bind the name
+// in this module's scope, so a caller here would silently reference nothing.
+import { isPrivateOrLocalAddress } from './addressClassification.mjs';
+
+const DEFAULT_MAX_BYTES = 25 * 1024 * 1024; // 25 MB — matches PLAUD_MAX_FILE_BYTES
+const DEFAULT_TIMEOUT_MS = 30_000;          // 30s per §5.2
+
+export class AudioUrlError extends Error {
+  constructor(code, message) {
+    super(message || code);
+    this.name = 'AudioUrlError';
+    this.code = code;
+  }
+}
+
+export class AudioFetchError extends Error {
+  constructor(code, status, message) {
+    super(message || code);
+    this.name = 'AudioFetchError';
+    this.code = code;
+    this.status = status;
+  }
+}
+
+/**
+ * Validate `rawUrl` against `allowedBaseUrl`. Throws AudioUrlError on any
+ * violation; returns the parsed URL on success.
+ *
+ * Codex CR-4: "exact match, HTTPS, no creds, DNS-resolved private-IP rejection".
+ * Q2 (regex vs exact) is CLOSED — exact only. No wildcards, no patterns.
+ */
+export async function validateAudioUrl(rawUrl, allowedBaseUrl) {
+  if (!allowedBaseUrl || typeof allowedBaseUrl !== 'string') {
+    // §13.2 startup validation should prevent this in production, but
+    // fail-closed at runtime as defense in depth.
+    throw new AudioUrlError('AUDIO_URL_ALLOWLIST_UNCONFIGURED');
+  }
+
+  let incoming;
+  try {
+    incoming = new URL(rawUrl);
+  } catch {
+    throw new AudioUrlError('AUDIO_URL_MALFORMED');
+  }
+
+  let allowed;
+  try {
+    allowed = new URL(allowedBaseUrl);
+  } catch {
+    throw new AudioUrlError('AUDIO_URL_ALLOWLIST_UNCONFIGURED');
+  }
+
+  // 1. HTTPS only — defeats `http://allowed.com`, `gopher://`, `file://`, `data:`
+  if (incoming.protocol !== 'https:') {
+    throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', 'protocol must be https');
+  }
+
+  // 2. No credentials in URL — defeats `https://allowed@evil.com` where
+  //    Node's URL parser puts evil.com in hostname but URLs with @ embed
+  //    credentials before the authority.
+  if (incoming.username || incoming.password) {
+    throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', 'credentials in URL not allowed');
+  }
+
+  // 3. EXACT hostname match (Codex CR-4 — no prefix/suffix tricks)
+  if (incoming.hostname !== allowed.hostname) {
+    throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', `hostname ${incoming.hostname} != allowed ${allowed.hostname}`);
+  }
+
+  // 4. EXACT port match. Empty port string == default for protocol;
+  //    URL.port is '' when default, so empty == empty matches.
+  if (incoming.port !== allowed.port) {
+    throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', `port ${incoming.port || '(default)'} != allowed ${allowed.port || '(default)'}`);
+  }
+
+  // 5. DNS resolution check — every address the name resolves to is checked before the
+  //    fetch is allowed to proceed.
+  //
+  //    HONEST SCOPE (hostile review round 9, C8). An earlier version of this comment said
+  //    this "defeats DNS rebinding". It does not, on its own, and the difference matters.
+  //    This checks the result of ONE `dns.lookup`, then `fetchAudioWithCaps` below fetches
+  //    by HOSTNAME — which performs its OWN lookup. Between the two, a name whose TTL has
+  //    expired (or an attacker's resolver answering differently) can return a public address
+  //    here and a private one there. That is the TOCTOU window, and it is still open on this
+  //    path.
+  //
+  //    It is closed on the IMAGE path, which is the one that fetches user-supplied URLs:
+  //    `spotlightImageUrlPolicy.mjs` resolves once and hands a PINNED dispatcher (an
+  //    `undici.Agent` whose `connect.lookup` answers only from the pre-validated addresses)
+  //    to the request, so the socket cannot go anywhere the check did not see.
+  //
+  //    So: this is a real check and it stops the common case, but it is not a rebinding
+  //    defence and should not be described as one until an equivalent pin is wired here.
+  let addrs;
+  try {
+    addrs = await dns.lookup(incoming.hostname, { all: true });
+  } catch (err) {
+    throw new AudioUrlError('AUDIO_URL_DNS_FAILED', `DNS lookup failed: ${err.message}`);
+  }
+  if (!Array.isArray(addrs) || addrs.length === 0) {
+    throw new AudioUrlError('AUDIO_URL_DNS_FAILED', 'DNS lookup returned no addresses');
+  }
+  for (const { address } of addrs) {
+    if (isPrivateOrLocalAddress(address)) {
+      throw new AudioUrlError('AUDIO_URL_NOT_ALLOWED', `host resolves to private/local address ${address}`);
+    }
+  }
+
+  return incoming;
+}
+
+/**
+ * Fetch audio bytes with timeout, content-length cap, streamed-bytes cap,
+ * and redirect: 'error' (no redirect following — defeats SSRF redirect chains).
+ *
+ * Returns {ok: true, bytes, mimetype} on success.
+ * Returns {error: true, errorCode, errorStatus, message} on any failure
+ * — never throws (controller composes it into a JSON error response).
+ */
+export async function fetchAudioWithCaps(audioUrl, declaredSizeBytes, opts = {}) {
+  const {
+    allowedBaseUrl = process.env.PLAUD_APPLAUD_MEDIA_BASE_URL,
+    maxBytes = DEFAULT_MAX_BYTES,
+    timeoutMs = DEFAULT_TIMEOUT_MS,
+    fetchImpl = globalThis.fetch,
+  } = opts;
+
+  // Pre-validate URL
+  let validatedUrl;
+  try {
+    validatedUrl = await validateAudioUrl(audioUrl, allowedBaseUrl);
+  } catch (err) {
+    if (err instanceof AudioUrlError) {
+      const status = err.code === 'AUDIO_URL_ALLOWLIST_UNCONFIGURED'
+        || err.code === 'AUDIO_URL_DNS_FAILED'
+        ? 500
+        : 400;
+      return { error: true, errorCode: err.code, errorStatus: status, message: err.message };
+    }
+    return { error: true, errorCode: 'AUDIO_URL_VALIDATION_INTERNAL', errorStatus: 500, message: err.message };
+  }
+
+  // Pre-check declared Content-Length (saves a fetch round-trip on obvious bigs)
+  const declared = Number(declaredSizeBytes);
+  if (Number.isFinite(declared) && declared > maxBytes) {
+    return {
+      error: true,
+      errorCode: 'AUDIO_TOO_LARGE',
+      errorStatus: 413,
+      message: `declared size ${declared} > cap ${maxBytes}`,
+    };
+  }
+
+  // Issue the fetch with redirect:'error' + timeout
+  let response;
+  try {
+    response = await fetchImpl(validatedUrl.toString(), {
+      method: 'GET',
+      redirect: 'error',                          // CR-4: no redirect chains
+      signal: AbortSignal.timeout(timeoutMs),
+    });
+  } catch (err) {
+    // Node's fetch throws on redirect when redirect:'error' is set
+    if (err && (err.code === 'UND_ERR_RES_EXCEEDED_MAX_REDIRECTS'
+        || err.code === 'UND_ERR_REDIRECT'
+        || /redirect/i.test(err.message || ''))) {
+      return {
+        error: true,
+        errorCode: 'AUDIO_URL_REDIRECT_REJECTED',
+        errorStatus: 400,
+        message: err.message || 'redirect rejected',
+      };
+    }
+    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError'
+        || /timeout|aborted/i.test(err.message || ''))) {
+      return {
+        error: true,
+        errorCode: 'AUDIO_FETCH_TIMEOUT',
+        errorStatus: 500,
+        message: 'audio fetch timed out',
+      };
+    }
+    return {
+      error: true,
+      errorCode: 'AUDIO_FETCH_FAILED',
+      errorStatus: 500,
+      message: err.message || 'audio fetch failed',
+    };
+  }
+
+  if (!response.ok) {
+    return {
+      error: true,
+      errorCode: 'AUDIO_FETCH_FAILED',
+      errorStatus: 500,
+      message: `upstream returned ${response.status}`,
+    };
+  }
+
+  // Content-Length header check — abort before streaming if too big.
+  // This is OPTIONAL because Applaud may not set it; the streamed cap
+  // below is the authoritative gate.
+  const contentLength = Number(response.headers.get('content-length'));
+  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
+    return {
+      error: true,
+      errorCode: 'AUDIO_TOO_LARGE',
+      errorStatus: 413,
+      message: `Content-Length ${contentLength} > cap ${maxBytes}`,
+    };
+  }
+
+  // Streamed read with size cap. Aborts mid-stream if cumulative bytes
+  // exceed cap — defeats lying Content-Length headers.
+  const chunks = [];
+  let totalBytes = 0;
+  try {
+    if (!response.body) {
+      return {
+        error: true,
+        errorCode: 'AUDIO_FETCH_FAILED',
+        errorStatus: 500,
+        message: 'response has no body',
+      };
+    }
+    const reader = response.body.getReader();
+    for (;;) {
+      const { done, value } = await reader.read();
+      if (done) break;
+      const chunk = Buffer.from(value);
+      totalBytes += chunk.length;
+      if (totalBytes > maxBytes) {
+        // Cancel the upstream stream to release the socket
+        try { await reader.cancel('size cap exceeded'); } catch { /* ignore */ }
+        return {
+          error: true,
+          errorCode: 'AUDIO_TOO_LARGE',
+          errorStatus: 413,
+          message: `streamed bytes ${totalBytes} > cap ${maxBytes}`,
+        };
+      }
+      chunks.push(chunk);
+    }
+  } catch (err) {
+    return {
+      error: true,
+      errorCode: 'AUDIO_FETCH_FAILED',
+      errorStatus: 500,
+      message: `stream read failed: ${err.message}`,
+    };
+  }
+
+  return {
+    ok: true,
+    bytes: Buffer.concat(chunks),
+    mimetype: response.headers.get('content-type') || 'application/octet-stream',
+  };
+}
+
+
+// THE ADDRESS CLASSIFIER LIVES IN ITS OWN MODULE (2026-09-21). It was extracted to
+// `addressClassification.mjs` because this file had already breached `06-bans.md` #50
+// (322 lines at HEAD) and round 8's D2/D4 fix added more. Re-exported here so every
+// existing importer — including `tests/unit/plaudSlice53AudioFetcher.test.mjs`, which
+// imports the name from THIS module — keeps working unchanged.
+export { isPrivateOrLocalAddress } from './addressClassification.mjs';
+```
+
+
+### 3.2 The tests
+
+#### `backend/tests/unit/spotlightImageTransportPin.test.mjs`
+
+sha256 `b82be7691cae0e2d18582d62026dc24c06606afff0c589811a39468a4dc9a51e` · 170 lines
+
+NEW in round 9 — the D3 answer. Real sockets, two servers on one port, a name that cannot resolve. C1, C4, C6.
+
+```mjs
+/**
+ * spotlightImageTransportPin — what the pin does when `net` actually opens a socket
+ * ==============================================================================
+ * WHY THIS FILE EXISTS (hostile review round 8, D3).
+ *
+ * `spotlightImageDnsPin.test.mjs` has a test whose honest name now reads "...but this calls the
+ * hook directly, it does not drive a socket". That rename was the correct fix for an overstated
+ * claim, but it left a real hole: NOTHING in the repo observed `net` consulting `connect.lookup`
+ * during an actual connection. Astra's sharper discriminator (round 7) is the one encoded here —
+ * replace the pinned dispatcher with a default `Agent` and see whether the two cases are
+ * DISTINGUISHABLE. If they are not, the test is asserting on dispatcher PRESENCE rather than on
+ * TRANSPORT, and it would stay green against a pin that does nothing.
+ *
+ * WHAT MAKES THIS A TRANSPORT TEST AND NOT ANOTHER HARNESS TEST.
+ *
+ *   - Two REAL servers listen on two DIFFERENT loopback addresses (127.0.0.1 and 127.0.0.2),
+ *     on the SAME PORT, so the port in the URL is valid for both and the only variable left is
+ *     which ADDRESS the pin chose. (Verified: two 127/8 addresses may hold one port number.)
+ *   - A REAL undici `Agent` is built by the production factory, pinning ONE of them.
+ *   - A REAL `fetch()` is issued against a URL whose HOST is a NAME, not a literal.
+ *   - The assertion is on WHICH SERVER ANSWERED — observed from the server side, over the wire.
+ *
+ * So the observation point is the network, not our own hook. That is the difference the review
+ * asked for: if `net` stops calling our lookup, the request lands on the OTHER server and this
+ * fails, rather than passing because we called our own function.
+ *
+ * WHY A NAME AND NOT A LITERAL. `net` short-circuits an IP literal — there is no name to resolve,
+ * so `connect.lookup` is never consulted and a pin has no say. That limit is already documented
+ * in the sibling file. Here the host is a NAME precisely so the lookup path is the one exercised.
+ *
+ * WHY THE NAME IS NEVER ACTUALLY RESOLVED. The pin's whole value is that the name is NOT resolved
+ * at connect time. The name used below (`pin-probe.invalid`) is a `.invalid` TLD, reserved by
+ * RFC 2606, which can never resolve. If the pin were absent, the connection would fail with DNS
+ * failure rather than reach a server — so a passing test also proves the socket never consulted
+ * the system resolver.
+ *
+ * THE FAILURE THIS FILE ALREADY CAUGHT, RECORDED BECAUSE IT IS THE WHOLE POINT. The first draft
+ * pinned 127.0.0.2 but built the URL from 127.0.0.1's port, and failed with
+ * `ECONNREFUSED 127.0.0.2:<the-other-port>`. That is a defect in the TEST, but the error is also
+ * the proof: the socket had gone to 127.0.0.2, the address nothing in the URL pointed at. Fixing
+ * it by giving both servers one port removes the confound rather than papering over it.
+ */
+import { describe, it, expect, afterEach } from 'vitest';
+import { createServer } from 'node:http';
+import { Agent } from 'undici';
+import { createPinnedDispatcher } from '../../services/spotlightImageUrlPolicy.mjs';
+
+/** A name that can never resolve: `.invalid` is reserved by RFC 2606. */
+const UNRESOLVABLE_NAME = 'pin-probe.invalid';
+
+/** Bind a loopback server that names the address it answered on. */
+const listenOn = (address, port) =>
+  new Promise((resolve, reject) => {
+    const server = createServer((_req, res) => {
+      res.writeHead(200, { 'content-type': 'text/plain' });
+      res.end(`served-by:${address}`);
+    });
+    server.once('error', reject);
+    server.listen(port, address, () => resolve(server));
+  });
+
+/**
+ * Two servers, two addresses, ONE port — so the URL's port is valid for both and the address is
+ * the only thing the pin can change. Returns both plus a closer.
+ */
+const serveTwoAddresses = async () => {
+  const first = await listenOn('127.0.0.1', 0);
+  const { port } = first.address();
+  const second = await listenOn('127.0.0.2', port);
+  return {
+    port,
+    close: async () => {
+      await new Promise((resolve) => second.close(resolve));
+      await new Promise((resolve) => first.close(resolve));
+    },
+  };
+};
+
+describe('the pin observed at the transport, not at the hook', () => {
+  let teardown = null;
+  afterEach(async () => {
+    if (teardown) await teardown();
+    teardown = null;
+  });
+
+  it('the socket opens to the PINNED address even though the URL names neither address', async () => {
+    const pair = await serveTwoAddresses();
+    teardown = pair.close;
+
+    // Pin 127.0.0.2 while both are listening on this port. If the pin is load-bearing the second
+    // server answers; if it is inert the request either fails to resolve or reaches the first.
+    const dispatcher = createPinnedDispatcher([{ address: '127.0.0.2', family: 4 }]);
+    try {
+      const response = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher });
+      // The socket went where the CHECK pointed, not where the NAME pointed — and the name could
+      // not have resolved at all, so this outcome is reachable only through the pin.
+      expect(await response.text()).toBe('served-by:127.0.0.2');
+    } finally {
+      await dispatcher.close();
+    }
+  });
+
+  it('a default Agent is DISTINGUISHABLE — it fails on the same unresolvable name', async () => {
+    // THE DISCRIMINATOR. If this case behaved like the pinned one, the previous test would be
+    // proving nothing about transport. It must FAIL, and specifically by DNS, not by anything else.
+    const pair = await serveTwoAddresses();
+    teardown = pair.close;
+
+    const dispatcher = new Agent();
+    try {
+      const outcome = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher })
+        .then(async (r) => ({ reached: true, body: await r.text() }), (err) => ({ reached: false, err }));
+      expect(outcome.reached).toBe(false);
+      // Named so a future reader can tell "the pin is gone" from "the network is down".
+      const detail = String(outcome.err?.cause?.code || outcome.err?.code || outcome.err?.message);
+      expect(detail).toMatch(/ENOTFOUND|EAI_AGAIN|getaddrinfo/i);
+    } finally {
+      await dispatcher.close();
+    }
+  });
+
+  it('pinning the OTHER address flips which server answers — the pin is the only variable', async () => {
+    // The control that makes the first case non-accidental: hold everything constant except the
+    // pinned address, and the answering server changes. A test that could not tell 127.0.0.1 from
+    // 127.0.0.2 is not observing an address at all.
+    const pair = await serveTwoAddresses();
+    teardown = pair.close;
+
+    const dispatcher = createPinnedDispatcher([{ address: '127.0.0.1', family: 4 }]);
+    try {
+      const response = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher });
+      expect(await response.text()).toBe('served-by:127.0.0.1');
+    } finally {
+      await dispatcher.close();
+    }
+  });
+
+  it('with TWO pinned addresses, the FIRST pinned one is the one connected to', async () => {
+    // ADDED AFTER A MUTATION SURVIVED. Rotating the pinned set (`addrs.slice(1).concat(addrs[0])`
+    // inside `createPinnedDispatcher`) left this whole file GREEN, because every case above pins a
+    // SINGLE address — with one element there is nothing to rotate, so the mutation was invisible
+    // by construction, not by accident. That is a real hole in this file's coverage and this case
+    // closes it: two live addresses on one port, and an assertion about WHICH one wins.
+    //
+    // This is `net`'s single-address form: `connect.lookup` is called WITHOUT `all`, and our
+    // `createPinnedLookup` answers with `pinned[0]`. So what this case pins down is OUR
+    // contract — the validated ORDER is preserved, and the first validated address is the one
+    // a socket takes. It is not a claim about a `net` preference: `net` simply uses the single
+    // value it is handed. That distinction is the point, because the mutation this case exists
+    // to catch is a rotation inside `createPinnedLookup` — which is exactly our code, and which
+    // every single-address case above is blind to (with one element there is nothing to rotate,
+    // so the hole was structural, not accidental).
+    //
+    // A pin that silently reordered its set would connect somewhere the check DID approve but
+    // the caller did not prefer, and would still look correct in every single-address test.
+    const pair = await serveTwoAddresses();
+    teardown = pair.close;
+
+    const dispatcher = createPinnedDispatcher([
+      { address: '127.0.0.2', family: 4 },
+      { address: '127.0.0.1', family: 4 },
+    ]);
+    try {
+      const response = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher });
+      // 127.0.0.2 is FIRST, so it is the one that must answer — not the second entry.
+      expect(await response.text()).toBe('served-by:127.0.0.2');
+    } finally {
+      await dispatcher.close();
+    }
+  });
+});
+```
+
+#### `backend/tests/unit/spotlightImageDnsPin.test.mjs`
+
+sha256 `e6dfd8139de4d70ff1c258fbb41430b5c4262105e5a01326192bf8a48ed38fd4` · 284 lines
+
+The existing suite, with D3's honesty corrections applied (renamed case, https literal, disclosed Symbol reach). C2, C6.
+
+```mjs
+/**
+ * spotlightImageDnsPin — the DNS-rebinding pin at the connect boundary
+ * =====================================================================
+ * WHAT THIS PROVES, AND WHY IT NEEDS ITS OWN FILE.
+ *
+ * `spotlightImageUrlPolicy.mjs` used to resolve a curator's image host, reject private
+ * addresses, and then DISCARD the addresses it had approved — handing only the URL to
+ * `fetch()`, which resolved the name a second time. A name that answered publicly on the
+ * first lookup and privately on the second (classic DNS rebinding) therefore reached an
+ * internal address even though the validator had "checked" it. The gap was honestly
+ * documented, but documented is not closed.
+ *
+ * The fix pins the approved addresses into the connection via `undici.Agent`'s
+ * `connect.lookup`, so the socket can only go where the check looked. The lookup hook is
+ * exported as a named factory so its contract is tested directly, and the dispatcher is
+ * exercised against a REAL loopback server rather than asserted on by shape.
+ *
+ * The decisive test is under "the TOCTOU the pin closes": it stands up a real server and
+ * shows the unpinned fetch reaching it while the pinned one cannot. If the pinned half ever
+ * starts succeeding, the pin has stopped being load-bearing and this file is lying to you.
+ *
+ * Nothing here asserts on `undici` internals EXCEPT one deliberate, narrow reach described at the
+ * point of use (the `Symbol(options)` access in the wiring block, which reads the connect options
+ * to see WHICH addresses were pinned). Hostile review round 8 (C8) caught an earlier version of
+ * this header claiming "no symbol-poking" while the code did exactly that — the claim was false,
+ * so the claim is what changed. Everything the network can answer is observed from the network
+ * side instead.
+ */
+import { describe, it, expect, afterEach, vi } from 'vitest';
+import { createServer } from 'node:http';
+import {
+  SpotlightImageError,
+  resolveAndValidate,
+  createPinnedLookup,
+  createPinnedDispatcher,
+} from '../../services/spotlightImageUrlPolicy.mjs';
+import { fetchSpotlightImage } from '../../services/spotlightImageFetch.mjs';
+import { mockDns, PUBLIC_IP, streamResponse, orderedLifecycleHarness } from '../helpers/spotlightImageFixtures.mjs';
+
+afterEach(() => {
+  vi.restoreAllMocks();
+});
+
+/** Drive the `net`-style lookup hook synchronously and capture its answer. */
+const callLookup = (lookup, hostname, options) => {
+  let captured;
+  lookup(hostname, options, (...args) => { captured = args; });
+  return captured;
+};
+
+/** Stand up a real loopback server and hand back its URL plus a closer. */
+const withLoopbackServer = async () => {
+  const server = createServer((_req, res) => { res.writeHead(200); res.end('private'); });
+  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
+  const { port } = server.address();
+  return {
+    url: `http://127.0.0.1:${port}/`,
+    close: () => new Promise((resolve) => server.close(resolve)),
+  };
+};
+
+// ─── createPinnedLookup: the hook answers from the validated set ─────────
+describe('createPinnedLookup', () => {
+  it('answers the all:true form with every pinned address', () => {
+    const lookup = createPinnedLookup([
+      { address: '93.184.216.34', family: 4 },
+      { address: '93.184.216.35', family: 4 },
+    ]);
+    const [err, answer] = callLookup(lookup, 'rebind.example', { all: true });
+    expect(err).toBeNull();
+    expect(answer).toEqual([
+      { address: '93.184.216.34', family: 4 },
+      { address: '93.184.216.35', family: 4 },
+    ]);
+  });
+
+  it('answers the single-address form with a bare address and family', () => {
+    const lookup = createPinnedLookup([{ address: '93.184.216.34', family: 4 }]);
+    const [err, address, family] = callLookup(lookup, 'rebind.example', { all: false });
+    expect(err).toBeNull();
+    expect(address).toBe('93.184.216.34');
+    expect(family).toBe(4);
+  });
+
+  it('ignores the requested hostname — the answer is the pinned set', () => {
+    const lookup = createPinnedLookup([{ address: '93.184.216.34', family: 4 }]);
+    // Two different names, one pinned answer: a rebinding name cannot talk its way out.
+    const [, a] = callLookup(lookup, 'attacker.example', { all: true });
+    const [, b] = callLookup(lookup, 'rebind.example', { all: true });
+    expect(a).toEqual([{ address: '93.184.216.34', family: 4 }]);
+    expect(b).toEqual(a);
+  });
+
+  it('preserves an IPv6 pinned address with its family', () => {
+    const lookup = createPinnedLookup([{ address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 }]);
+    const [, answer] = callLookup(lookup, 'example.com', { all: true });
+    expect(answer).toEqual([{ address: '2606:2800:220:1:248:1893:25c8:1946', family: 6 }]);
+  });
+});
+
+// ─── createPinnedDispatcher: fail-closed construction ────────────────────
+describe('createPinnedDispatcher', () => {
+  it('fails closed on an empty address set rather than falling back to the resolver', () => {
+    // A dispatcher with no pinned addresses would let `net` use the system resolver — exactly
+    // the behaviour the pin exists to remove — so it must refuse to exist at all.
+    expect(() => createPinnedDispatcher([])).toThrow(SpotlightImageError);
+    expect(() => createPinnedDispatcher([])).toThrow(/cannot pin an empty address set/i);
+  });
+
+  it('refuses a non-array address set', () => {
+    expect(() => createPinnedDispatcher(undefined)).toThrow(/cannot pin an empty address set/i);
+  });
+
+  it('builds a dispatcher that can be closed', async () => {
+    const dispatcher = createPinnedDispatcher([{ address: '93.184.216.34', family: 4 }]);
+    // `undici`'s close() resolves to null; the contract that matters is that it settles and
+    // leaves no live pool behind, not the resolved value.
+    await expect(dispatcher.close()).resolves.toBeNull();
+  });
+});
+
+// ─── the TOCTOU the pin closes ─────────────────────────────────────────
+//
+// These use only DETERMINISTIC, LOCAL sockets. An earlier draft pinned the connection to a
+// TEST-NET address (192.0.2.1) to show the request failing; that address is filtered rather
+// than refused, so the connect simply hung and the test died on its own timeout. A hung test
+// is worse than no test, so the design here is: every case either completes against loopback
+// or completes against a literal-bypass, and none of them depend on how the network answers.
+//
+// WHAT THESE CASES DO *NOT* ESTABLISH (hostile review round 8, D3). The unpinned control at
+// T:126 shows that a bare `fetch()` reaches loopback — a real escape, and a real detector.
+// But none of these cases drives a NAMED host through `net` and observes which address the
+// socket opened to. The lookup contract cases above call our hook DIRECTLY, which is a test
+// of our function, not of `net` using it. That gap is named in the lifecycle/transport
+// suites rather than papered over with a comment claiming it is "measured here, live".
+describe('the TOCTOU the pin closes', () => {
+  it('an unpinned fetch reaches the loopback server (the escape)', async () => {
+    // The CONTROL, not the fix. It shows a `fetch()` handed only a URL walks straight to the
+    // private address — so the escape was real, and this harness can detect it.
+    const server = await withLoopbackServer();
+    try {
+      const response = await globalThis.fetch(server.url);
+      expect(response.status).toBe(200);
+      expect(await response.text()).toBe('private');
+    } finally {
+      await server.close();
+    }
+  });
+
+  it('the hook answers a NAME from the pinned set — but this calls the hook directly, it does not drive a socket', async () => {
+    // WHAT THIS ACTUALLY MEASURES, RENAMED AFTER HOSTILE REVIEW ROUND 8 D3. The old name was
+    // "the pin is consulted for a NAMED host — the lookup hook fires, the literal path does not",
+    // which overstated it: `createPinnedLookup` is invoked BY THIS TEST, so all it shows is that
+    // our factory returns the pinned set for a name. It does NOT show `net` consulting the hook
+    // during a connection, and it does not measure the literal asymmetry at all — the literal
+    // case is covered separately below. Renaming is the honest fix; a claim in a test NAME is
+    // still a claim.
+    const hookCalls = [];
+    const probe = (hostname) => new Promise((resolve) => {
+      const lookup = createPinnedLookup([{ address: '127.0.0.2', family: 4 }]);
+      lookup(hostname, { all: true }, (_e, answer) => { hookCalls.push({ hostname, answer }); resolve(answer); });
+    });
+
+    await probe('rebind.invalid');
+    expect(hookCalls).toHaveLength(1);
+    expect(hookCalls[0].answer).toEqual([{ address: '127.0.0.2', family: 4 }]);
+  });
+
+  it('an IP-LITERAL host bypasses the pin entirely, so the VALIDATOR must refuse it', async () => {
+    // A documented LIMIT, encoded so it cannot be mistaken for a defence.
+    //
+    // `net` short-circuits an IP literal: there is no name to resolve, so `connect.lookup` is
+    // never called and a pin has no say. This proves both halves — the pin is bypassed, AND the
+    // admission check is what actually catches the literal (before any dispatcher exists).
+    //
+    // CORRECTED AFTER HOSTILE REVIEW ROUND 8 (C6). Half two used to call `resolveAndValidate`
+    // with `server.url`, which is an **`http://`** URL — so `P:114` rejected the PROTOCOL and
+    // address admission was never reached. The assert passed for the wrong reason and proved
+    // nothing about literals. It now uses an https URL whose host is the literal, so the only
+    // thing that can refuse it is address admission.
+    const server = await withLoopbackServer();
+    const dispatcher = createPinnedDispatcher([{ address: '127.0.0.2', family: 4 }]);
+    try {
+      // Half one: the pin does not stop the literal from reaching the server.
+      const reached = await globalThis.fetch(server.url, { dispatcher })
+        .then(() => true, () => false);
+      expect(reached).toBe(true);
+
+      // Half two: the validator refuses the same LITERAL HOST on its own merits. https, so the
+      // protocol guard cannot be what refuses it; the code asserted is the ADMISSION code.
+      await expect(resolveAndValidate(`https://127.0.0.1:${new URL(server.url).port}/a.png`))
+        .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+    } finally {
+      await dispatcher.close();
+      await server.close();
+    }
+  });
+
+  it('refuses a bracketed IPv6 literal at the LITERAL branch, not via the resolver', async () => {
+    // Hostile review round 8, D4. `URL.hostname` KEEPS the brackets on an IPv6 authority, and
+    // `net.isIP('[::1]')` is 0 — so every IPv6 literal used to slip past the literal branch and
+    // take the DNS path, where the classifier depended on the resolver's normalisation to catch
+    // it. It did not: `https://[::ffff:0:127.0.0.1]/` was ADMITTED and pinned as `::ffff:0:7f00:1`.
+    // The message assertion pins the FIX — refusal must name the bare address, which is only
+    // possible if the brackets were stripped before classification.
+    const lookup = mockDns(PUBLIC_IP);
+    await expect(resolveAndValidate('https://[::1]/a.png'))
+      .rejects.toMatchObject({
+        code: 'IMAGE_URL_NOT_ALLOWED',
+        message: expect.stringContaining('::1'),
+      });
+    // And the fix must not route a literal through the resolver to get there.
+    expect(lookup).not.toHaveBeenCalled();
+  });
+
+  it('refuses an IPv4-mapped loopback literal that the DNS path laundered', async () => {
+    // The D4 bypass, encoded. This address normalises to the HEX mapped form, which the old
+    // classifier's dotted-only regex missed and then called public.
+    mockDns(PUBLIC_IP);
+    await expect(resolveAndValidate('https://[::ffff:0:127.0.0.1]/a.png'))
+      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+  });
+});
+
+// ─── the pin is actually WIRED into the fetch path ──────────────────────
+//
+// This block exists because of a mutation result, and it is the most important block here.
+//
+// Removing `dispatcher` from the fetch call in `spotlightImageFetch.mjs` left every other test
+// in this file GREEN. The reason is instructive: those tests exercise `createPinnedLookup` and
+// `createPinnedDispatcher` DIRECTLY, so they pass whether or not the production fetch ever calls
+// them. A pin that is constructed but never passed is not a control — it is dead code with a good
+// comment. These assertions observe the CALL, which is the only thing that makes the pin real.
+describe('fetchSpotlightImage wires the pin into the transport', () => {
+  it('passes a dispatcher to fetchImpl', async () => {
+    mockDns(PUBLIC_IP);
+    const seen = [];
+    const fetchImpl = async (url, init) => {
+      seen.push(init);
+      return streamResponse([Buffer.from('x')]);
+    };
+
+    await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });
+
+    expect(seen).toHaveLength(1);
+    expect(seen[0].dispatcher).toBeDefined();
+    expect(typeof seen[0].dispatcher.close).toBe('function'); // it is a real Agent
+  });
+
+  it('pins the addresses the validator approved, not the URL alone', async () => {
+    // The dispatch must be built from the RESOLVED addresses, so a name that would answer
+    // differently on a second lookup has no second lookup available to it.
+    mockDns(PUBLIC_IP);
+    let captured = null;
+    const fetchImpl = async (url, init) => {
+      captured = init.dispatcher;
+      return streamResponse([Buffer.from('x')]);
+    };
+
+    await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });
+
+    // Reach the pinned answer through the dispatcher's own connect options — the value that
+    // `net` will be handed. `Symbol(options)` is undici's, so this reaches in deliberately and
+    // narrowly, for the one thing that cannot be observed from outside: WHICH addresses were pinned.
+    const opts = captured[Object.getOwnPropertySymbols(captured).find((s) => s.toString() === 'Symbol(options)')];
+    const answer = await new Promise((resolve) => {
+      opts.connect.lookup('example.com', { all: true }, (_e, a) => resolve(a));
+    });
+    expect(answer).toEqual(PUBLIC_IP);
+  });
+
+  it('refuses to fetch when the pinned address set is empty (fail closed)', async () => {
+    // If admission ever returned no addresses, the fetch must fail rather than fall through to a
+    // resolver-backed connection. An empty answer is not a reason to resolve for ourselves.
+    mockDns([]);
+    let called = false;
+    const fetchImpl = async () => { called = true; return streamResponse([Buffer.from('x')]); };
+
+    const result = await fetchSpotlightImage('https://example.com/a.png', { fetchImpl });
+
+    expect(result.ok).toBe(false);
+    expect(result.code).toBe('IMAGE_URL_DNS_FAILED');
+    expect(called).toBe(false);
+  });
+});
+```
+
+#### `backend/tests/unit/spotlightImageLifecycle.test.mjs`
+
+sha256 `4a538399e99e0e2b31e43ffb79e36eafe5d2b0bbb204eb62e9946ec4ee070b42` · 145 lines
+
+NEW in round 8 — the D1 ORDERING tests. Ordering is the only thing that catches D1. C4.
+
+```mjs
+/**
+ * spotlightImageLifecycle — the dispatcher outlives the BODY, not just the headers
+ * ==============================================================================
+ * WHAT THIS PROVES. `fetchSpotlightImage` must not ask the socket pool to close until the
+ * response body has been settled — consumed, cancelled, or abandoned by an abort.
+ *
+ * WHY IT IS A SEPARATE FILE FROM THE PIN SUITE. The pin suite answers "is the connection
+ * pinned to the approved address". This file answers a different question — "what is the
+ * lifetime of the pool relative to the response" — and the two answers come from different
+ * mechanisms. Splitting also keeps both files inside `06-bans.md` #50.
+ *
+ * THE DEFECT THIS ENCODES (hostile review round 8, D1, graded HIGH). The old code awaited
+ * `dispatcher.close()` in a `finally` around `fetch()`. But `fetch()` resolves when the
+ * HEADERS arrive and the body may still be streaming, so every body-handling path — the
+ * 4xx/5xx cancel, the over-cap declared-length cancel, the streamed read — ran AFTER the
+ * pool had been asked to shut down. `close()` drains idle sockets "once in-flight requests
+ * settle", and a body still being read IS an in-flight request. The order was backwards by
+ * construction: settlement must come first.
+ *
+ * WHY THE ASSERTIONS ARE ORDERING ASSERTIONS. A test asserting "close() was called" passes
+ * on the broken code — that is the R6-01 failure mode (a green suite whose green does not
+ * entail the property). Every assertion below compares the INDEX of two recorded events, so
+ * reverting the fix turns this file red. That was verified by mutation, not assumed.
+ */
+import { describe, it, expect, afterEach, vi } from 'vitest';
+import { createPinnedDispatcher } from '../../services/spotlightImageUrlPolicy.mjs';
+import { fetchSpotlightImage } from '../../services/spotlightImageFetch.mjs';
+import { mockDns, PUBLIC_IP, orderedLifecycleHarness } from '../helpers/spotlightImageFixtures.mjs';
+
+afterEach(() => {
+  vi.restoreAllMocks();
+});
+
+/** Settlement must be recorded, and must precede closure. */
+const settleThenClose = (timeline, settledEvent) => {
+  expect(timeline).toContain(settledEvent);
+  expect(timeline).toContain('dispatcher-closed');
+  expect(timeline.indexOf(settledEvent)).toBeLessThan(timeline.indexOf('dispatcher-closed'));
+};
+
+describe('the dispatcher outlives the response body (round 8, D1)', () => {
+  it('hands the headers over before the pool closes', async () => {
+    mockDns(PUBLIC_IP);
+    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
+    await fetchSpotlightImage('https://example.com/a.png', build());
+
+    // Sanity on the harness itself: if the fetch never resolved, the ordering claims below
+    // would be comparing indices in a timeline that never recorded the thing under test.
+    expect(timeline[0]).toBe('fetch-returned');
+    expect(timeline).toContain('dispatcher-closed');
+  });
+
+  it('settles an over-cap DECLARED length before closing the pool', async () => {
+    mockDns(PUBLIC_IP);
+    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
+    const result = await fetchSpotlightImage('https://example.com/a.png', build({
+      headers: { 'content-length': '4096' },
+    }));
+
+    expect(result).toMatchObject({ ok: false, code: 'IMAGE_TOO_LARGE' });
+    settleThenClose(timeline, 'body-settled');
+  });
+
+  it('settles a 4xx body before closing the pool', async () => {
+    mockDns(PUBLIC_IP);
+    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
+    const result = await fetchSpotlightImage('https://example.com/a.png', build({ status: 500 }));
+
+    expect(result).toMatchObject({ ok: false, code: 'IMAGE_FETCH_FAILED' });
+    settleThenClose(timeline, 'body-settled');
+  });
+
+  it('settles an over-cap STREAMED read before closing the pool', async () => {
+    mockDns(PUBLIC_IP);
+    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
+    const result = await fetchSpotlightImage('https://example.com/a.png', build({
+      maxBytes: 8,
+      chunks: [Buffer.alloc(6), Buffer.alloc(6)],
+    }));
+
+    expect(result).toMatchObject({ ok: false, code: 'IMAGE_TOO_LARGE' });
+    settleThenClose(timeline, 'body-settled');
+  });
+
+  it('drains a within-cap body before closing the pool', async () => {
+    mockDns(PUBLIC_IP);
+    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
+    const result = await fetchSpotlightImage('https://example.com/a.png', build({
+      chunks: [Buffer.from('abc')],
+    }));
+
+    expect(result.ok).toBe(true);
+    // A fully-consumed stream fires no `cancel`, so the drain marker stands in for settlement.
+    settleThenClose(timeline, 'stream-drained');
+  });
+
+  it('settles a body that ERRORS mid-read before closing the pool (round 9, finding 2)', async () => {
+    // THE PATH THIS PINS. Every other exit from `readImageBody` released the body; the
+    // `catch (err)` around the read loop returned WITHOUT cancelling, so a stream that failed
+    // mid-read left a live socket behind. It was the single exception, and it was on the path
+    // where a connection is most likely to be stranded.
+    //
+    // The assertion is on the timeline, not on the code: if the release is removed, no
+    // `body-settled` entry is recorded and `settleThenClose` fails. A test that only checked
+    // `result.ok === false` would pass either way.
+    mockDns(PUBLIC_IP);
+    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
+    const result = await fetchSpotlightImage('https://example.com/a.png', build({
+      chunks: [Buffer.alloc(4)],
+      errorAfter: 'ECONNRESET',
+    }));
+
+    expect(result).toMatchObject({ ok: false, code: 'IMAGE_FETCH_FAILED' });
+    expect(result.message).toMatch(/ECONNRESET/);
+
+    // The stream had ALREADY errored, so `reader.cancel()` rejects with that error rather than
+    // resolving — measured, and it is the spec's behaviour. What must be true is that the cancel
+    // RAN to completion (either outcome) and, critically, that it was not REFUSED as locked.
+    //
+    // `body-cancel-locked` is the assertion that has teeth. The first version of this fix called
+    // `response.body.cancel()` on a stream whose body was LOCKED by the reader; that throws
+    // `Invalid state: ReadableStream is locked`, the empty catch swallowed it, and the socket was
+    // never released — while a marker-before-await harness reported success. This is that bug,
+    // pinned so it cannot come back.
+    expect(timeline).not.toContain('body-cancel-locked');
+    const settled = timeline.filter((e) => e === 'body-settled' || e === 'body-settled-after-error');
+    expect(settled.length).toBeGreaterThan(0);
+    expect(timeline).toContain('dispatcher-closed');
+    expect(timeline.indexOf(settled[0])).toBeLessThan(timeline.indexOf('dispatcher-closed'));
+  });
+
+  it('closes the pool even when the fetch itself throws', async () => {
+    // The failure path must not leak the dispatcher. `fetchImpl` throwing is the case the
+    // original `finally` DID handle correctly — so this case guards against a fix that
+    // moved cleanup inside the body handler and lost the error path.
+    mockDns(PUBLIC_IP);
+    const { timeline, build } = orderedLifecycleHarness(createPinnedDispatcher);
+    const built = build();
+    const exploding = { ...built, fetchImpl: async () => { throw new Error('socket exploded'); } };
+
+    const result = await fetchSpotlightImage('https://example.com/a.png', exploding);
+
+    expect(result).toMatchObject({ ok: false, code: 'IMAGE_FETCH_FAILED' });
+    expect(timeline).toContain('dispatcher-closed');
+  });
+});
+```
+
+#### `backend/tests/unit/spotlightImageAdmission.test.mjs`
+
+sha256 `278c547cc32f5375e67343abfe979735bab98de26b4114d39daa449b584ad215` · 146 lines
+
+NEW in round 8 — the D2/D4 regression cases. C7, C9.
+
+```mjs
+/**
+ * spotlightImageAdmission — what `resolveAndValidate` lets through, and what it refuses
+ * ================================================================================
+ * WHAT THIS PROVES. URL admission: HTTPS-only, no embedded credentials, and every resolved
+ * address publicly routable — plus the IP-LITERAL branch, which is the one place where no
+ * resolver is consulted at all.
+ *
+ * WHY IT IS A SEPARATE FILE. The pin suite answers "is the connection pinned"; this answers
+ * "was the URL admitted". Different mechanism, different failure mode, and `06-bans.md` #50
+ * wants each file under 300 lines.
+ *
+ * THE REGRESSION CASES AT THE FOOT (round 8, D2/D4). Hostile review measured that
+ * `isPrivateOrLocalAddress` called `"::ffff:7f00:1"` PUBLIC, and that `resolveAndValidate`
+ * consequently ADMITTED `https://[::ffff:0:127.0.0.1]/` — a loopback literal. The mechanism:
+ * `URL.hostname` keeps brackets on an IPv6 authority, so `net.isIP` returned 0, the literal
+ * branch was skipped, `dns.lookup` normalised the address to a HEX mapped form, and the
+ * classifier's dotted-only mapped regex missed it and fell through to "public IPv6".
+ *
+ * The fix has two halves and BOTH are asserted here: brackets stripped before `net.isIP`, and
+ * the classifier's IPv6 default inverted to fail closed. Either half alone leaves a hole, so a
+ * test that only covered one would not have caught the defect.
+ */
+import { describe, it, expect, afterEach, vi } from 'vitest';
+import { resolveAndValidate } from '../../services/spotlightImageUrlPolicy.mjs';
+import { isPrivateOrLocalAddress } from '../../services/addressClassification.mjs';
+import { mockDns, PUBLIC_IP } from '../helpers/spotlightImageFixtures.mjs';
+
+afterEach(() => {
+  vi.restoreAllMocks();
+});
+
+describe('resolveAndValidate', () => {
+  it('returns both the URL and the validated addresses', async () => {
+    mockDns(PUBLIC_IP);
+    const { url, addrs } = await resolveAndValidate('https://example.com/a.png');
+    expect(url).toBeInstanceOf(URL);
+    expect(url.hostname).toBe('example.com');
+    // The addresses must SURVIVE the call — discarding them is the defect being fixed.
+    expect(addrs).toEqual(PUBLIC_IP);
+  });
+
+  it('validates an IP-literal host without a lookup and pins the literal', async () => {
+    // A literal is not a name; resolving it is meaningless. It must be validated and pinned
+    // as itself, and the DNS mock must never be consulted.
+    const lookup = mockDns(PUBLIC_IP);
+    const { url, addrs } = await resolveAndValidate('https://93.184.216.34/a.png');
+    expect(url.hostname).toBe('93.184.216.34');
+    expect(addrs).toEqual([{ address: '93.184.216.34', family: 4 }]);
+    expect(lookup).not.toHaveBeenCalled();
+  });
+
+  it('rejects a private IP-literal before any lookup', async () => {
+    const lookup = mockDns(PUBLIC_IP);
+    await expect(resolveAndValidate('https://10.0.0.1/a.png'))
+      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+    expect(lookup).not.toHaveBeenCalled();
+  });
+
+  it('rejects the cloud metadata IP-literal before any lookup', async () => {
+    const lookup = mockDns(PUBLIC_IP);
+    await expect(resolveAndValidate('https://169.254.169.254/latest/meta-data/'))
+      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+    expect(lookup).not.toHaveBeenCalled();
+  });
+
+  it('still rejects when ANY resolved address is private', async () => {
+    mockDns([
+      { address: '93.184.216.34', family: 4 },
+      { address: '127.0.0.1', family: 4 },
+    ]);
+    await expect(resolveAndValidate('https://mixed.example/a.png'))
+      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+  });
+});
+
+// ─── round 8, D2: the classifier's fail-closed contract ─────────────────
+//
+// `isPrivateOrLocalAddress` is imported from its OWN module (`addressClassification.mjs`),
+// which is where the round-8 fix moved it. Importing from there rather than through the
+// audio fetcher's re-export keeps this suite honest about which unit is under test.
+describe('the classifier fails CLOSED on shapes it does not recognise (round 8, D2)', () => {
+  const mustBePrivate = [
+    // The four inputs hostile review measured as `false` (i.e. "public").
+    [':', 'a bare colon is not an address'],
+    ['8.8.8.999', 'an out-of-range octet is not a public IPv4'],
+    ['0:0:0:0:0:0:0:1', 'the expanded form of IPv6 loopback'],
+    ['::ffff:7f00:1', 'the HEX form of IPv4-mapped loopback'],
+    // Forms the same defect class reaches.
+    ['::ffff:0:127.0.0.1', 'the D4 bypass — a mapped address that normalises to ::ffff:0:7f00:1'],
+    ['::127.0.0.1', 'IPv4-compatible (deprecated, still routable)'],
+    ['::7f00:1', 'IPv4-compatible, hex'],
+    ['64:ff9b::127.0.0.1', 'NAT64 embedding loopback'],
+    ['2002:7f00:1::', '6to4 embedding loopback'],
+    ['0::1', 'loopback with a leading zero group'],
+    ['::0001', 'loopback with an expanded final group'],
+    ['[::1]', 'a bracketed literal, which is how a URL authority presents it'],
+    ['fe00::1', 'outside the global-unicast range'],
+    ['4000::1', 'outside the global-unicast range'],
+  ];
+
+  for (const [ip, why] of mustBePrivate) {
+    it(`treats ${JSON.stringify(ip)} as private — ${why}`, () => {
+      expect(isPrivateOrLocalAddress(ip)).toBe(true);
+    });
+  }
+
+  const mustBePublic = [
+    ['93.184.216.34', 'a plain public IPv4'],
+    ['2606:2800:220:1:248:1893:25c8:1946', 'example.com, in 2000::/3'],
+    ['2001:4860:4860::8888', 'Google public DNS over IPv6'],
+    ['2a00:1450:4001:80a::200e', 'a Google edge address'],
+    ['3fff::1', 'the top of the global-unicast range'],
+  ];
+
+  for (const [ip, why] of mustBePublic) {
+    it(`treats ${JSON.stringify(ip)} as public — ${why}`, () => {
+      expect(isPrivateOrLocalAddress(ip)).toBe(false);
+    });
+  }
+});
+
+// ─── round 8, D4: the admitted loopback literal ─────────────────────────
+describe('IPv6 literals are classified AS literals, not laundered through a resolver (round 8, D4)', () => {
+  it('refuses the mapped-loopback literal that the DNS path previously admitted', async () => {
+    mockDns(PUBLIC_IP);
+    await expect(resolveAndValidate('https://[::ffff:0:127.0.0.1]/a.png'))
+      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+  });
+
+  it('refuses bracketed IPv6 loopback without consulting the resolver at all', async () => {
+    // The mechanism assertion: if this went through `dns.lookup`, the fix is only half applied —
+    // the address would be refused, but by a resolver's normalisation rather than by our own
+    // literal branch, which is exactly how the D4 bypass worked.
+    const lookup = mockDns(PUBLIC_IP);
+    await expect(resolveAndValidate('https://[0:0:0:0:0:0:0:1]/a.png'))
+      .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+    expect(lookup).not.toHaveBeenCalled();
+  });
+
+  it('refuses the unspecified address and its expanded forms', async () => {
+    mockDns(PUBLIC_IP);
+    for (const host of ['[::]', '[0:0:0:0:0:0:0:0]']) {
+      await expect(resolveAndValidate(`https://${host}/a.png`))
+        .rejects.toMatchObject({ code: 'IMAGE_URL_NOT_ALLOWED' });
+    }
+  });
+});
+```
+
+#### `backend/tests/helpers/spotlightImageFixtures.mjs`
+
+sha256 `2172ef02c443df6531588f8f9f630dc9128bd5a1ab981c4e29ed9bec4a36f64f` · 264 lines
+
+The recording harness the D1 tests depend on. C4.
+
+```mjs
+/**
+ * spotlightImageFixtures — shared fixtures for the Spotlight image-fetch suites
+ * ============================================================================
+ * Extracted so the two suites that use them stay inside the repo's 299-line limit.
+ * Nothing here is a test, and this directory sits outside the test-file glob.
+ *
+ * WHICH PARTS ARE REAL, AND WHICH ARE NOT (corrected after hostile review round 9, C8).
+ *
+ * REAL: the HTTP transport (real `http` servers on loopback — the decision point in the
+ * transport tests is the network, not an assertion about a mock's shape), the response
+ * BODIES (real `Readable` streams, so the streamed byte cap and the cancellation paths are
+ * exercised as streams), and the images (`sharp` generates real encodable bytes, so the
+ * decoder decodes rather than being told it succeeded).
+ *
+ * MOCKED, and it matters which: **`dns.lookup`**. `mockDns`, `mockDnsFail` and `mockDnsHang`
+ * replace it outright. An earlier version of this header said "these are deliberately REAL
+ * artefacts, not stubs" without that qualification, which read as a claim the file does not
+ * have. The honest statement is: everything except name resolution is real.
+ *
+ * WHAT THE MOCK DOES AND DOES NOT ESTABLISH. It establishes what the code does GIVEN a
+ * resolution result — the admission decision, the pin's address set, the behaviour when the
+ * resolver fails or hangs. It cannot establish that a real resolver returns what the mock
+ * claims, so no test here is evidence about real DNS. In particular a rebinding attack is
+ * represented by choosing mock values, not by performing one.
+ */
+import { vi } from 'vitest';
+import * as dnsModule from 'node:dns';
+import sharp from 'sharp';
+
+/** A publicly routable address — the happy-path resolution. */
+export const PUBLIC_IP = [{ address: '93.184.216.34', family: 4 }];
+
+export const mockDns = (addresses) =>
+  vi.spyOn(dnsModule.promises, 'lookup').mockResolvedValue(addresses);
+
+export const mockDnsFail = (message = 'ENOTFOUND') =>
+  vi.spyOn(dnsModule.promises, 'lookup').mockRejectedValue(new Error(message));
+
+/** A DNS mock that NEVER settles — the hanging-resolver case the lookup budget must bound. */
+export const mockDnsHang = () =>
+  vi.spyOn(dnsModule.promises, 'lookup').mockImplementation(() => new Promise(() => {}));
+
+/**
+ * Like `streamResponse`, but records cancellation so a test can prove the body was RELEASED
+ * rather than merely abandoned. `ReadableStream.cancel()` invokes this underlying `cancel`,
+ * so `cancels` is evidence of the release, not of an intention to release.
+ */
+export function cancellableStreamResponse(chunks, { status = 200, headers = {} } = {}) {
+  const cancels = [];
+  let i = 0;
+  const body = new ReadableStream({
+    pull(controller) {
+      if (i < chunks.length) controller.enqueue(new Uint8Array(chunks[i++]));
+      else controller.close();
+    },
+    cancel(reason) { cancels.push(reason); },
+  });
+  return { ok: status >= 200 && status < 300, status, headers: new Headers(headers), body, cancels };
+}
+
+/**
+ * A response whose stream EMITS some chunks and then ERRORS mid-read, recording cancellation.
+ *
+ * WHY THE ERRORING CASE NEEDS ITS OWN FIXTURE (hostile review round 9, finding 2). A stream
+ * that closes cleanly and a stream that throws are different code paths in `readImageBody`:
+ * the first exits the read loop via `done`, the second via `catch`. The suite had fixtures for
+ * "over the cap" and "not ok" and could show cancellation on both, but nothing that errored
+ * mid-read — which is exactly the path that used to skip the release. `cancels` is the
+ * evidence: an entry here means the body was released, not merely dropped.
+ */
+export function erroringStreamResponse(chunks, { status = 200, headers = {}, error = 'ECONNRESET' } = {}) {
+  const cancels = [];
+  let i = 0;
+  const body = new ReadableStream({
+    pull(controller) {
+      if (i < chunks.length) controller.enqueue(new Uint8Array(chunks[i++]));
+      else controller.error(new Error(error));
+    },
+    cancel(reason) { cancels.push(reason); },
+  });
+  return { ok: status >= 200 && status < 300, status, headers: new Headers(headers), body, cancels };
+}
+
+/** A real Response-shaped object whose body is a real stream, so the cap is exercised. */
+export function streamResponse(chunks, { status = 200, headers = {} } = {}) {
+  let i = 0;
+  const body = new ReadableStream({
+    pull(controller) {
+      if (i < chunks.length) controller.enqueue(new Uint8Array(chunks[i++]));
+      else controller.close();
+    },
+  });
+  return {
+    ok: status >= 200 && status < 300,
+    status,
+    headers: new Headers(headers),
+    body,
+  };
+}
+
+export const pngBuffer = (w = 8, h = 8) =>
+  sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 40, b: 40 } } })
+    .png()
+    .toBuffer();
+
+export const jpegBuffer = (w = 8, h = 8) =>
+  sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 40, b: 40 } } })
+    .jpeg()
+    .toBuffer();
+
+/** A PNG that genuinely carries an alpha channel — `hasAlpha` is what selects the output codec. */
+export const alphaPngBuffer = (w = 8, h = 8) =>
+  sharp({ create: { width: w, height: h, channels: 4, background: { r: 200, g: 40, b: 40, alpha: 0.5 } } })
+    .png()
+    .toBuffer();
+
+/**
+ * A genuine 2-frame GIF89a. Each frame needs its Graphics Control Extension or libvips
+ * rejects the frame data — the GCE is what makes this a valid animation rather than a
+ * corrupt single-frame GIF.
+ */
+export function animatedGifBuffer() {
+  const gce = Buffer.from([0x21, 0xf9, 0x04, 0x00, 0x0a, 0x00, 0x00, 0x00]);
+  const frame = Buffer.from([
+    0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x80,
+    0x00, 0x00, 0x00, 0xff, 0xff, 0xff,
+    0x02, 0x02, 0x44, 0x01, 0x00,
+  ]);
+  return Buffer.concat([
+    Buffer.from('GIF89a', 'latin1'),
+    Buffer.from([0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]),
+    gce, frame, gce, frame,
+    Buffer.from([0x3b]),
+  ]);
+}
+
+/**
+ * A response + fetch + dispatcher wired so every stage records into ONE timeline.
+ *
+ * WHY THIS LIVES HERE. The D1 defect (hostile review round 8) was an ORDERING bug — the pool was
+ * asked to close before the body was settled — and an ordering bug can only be caught by a test
+ * that observes the sequence. `cancellableStreamResponse` supplies the cancel hook; this supplies
+ * the close hook and the drain marker, and keeps the test file inside the repo's line ceiling.
+ *
+ * Events recorded:
+ *   'fetch-returned'    the fetch impl resolved (headers in hand, body maybe still streaming)
+ *   'body-settled'      `body.cancel()` was called — the response was released
+ *   'stream-drained'    the reader reached `done` — the body was fully consumed
+ *   'dispatcher-closed' `dispatcher.close()` was called
+ *
+ * @param {(addrs: Array<{address: string, family: number}>) => object} makeDispatcher
+ *        injected so this helper does not import the module under test
+ * @returns {{ timeline: string[], build: (opts?: object) => object }}
+ */
+export function orderedLifecycleHarness(makeDispatcher) {
+  const timeline = [];
+
+  const trackedDispatcher = () => {
+    const dispatcher = makeDispatcher([{ address: PUBLIC_IP[0].address, family: 4 }]);
+    const originalClose = dispatcher.close.bind(dispatcher);
+    dispatcher.close = async (...args) => {
+      timeline.push('dispatcher-closed');
+      return originalClose(...args);
+    };
+    return dispatcher;
+  };
+
+  // The tracked factory is what the module under test calls, so the returned object is the
+  // one whose `close()` we record. `trackedDispatcher` is invoked per `build()` so each test
+  // gets a fresh timeline entry rather than sharing one pool.
+  const trackedFactory = () => trackedDispatcher();
+
+  const build = (opts = {}) => {
+    // `opts.errorAfter` selects the ERRORING stream instead of the clean one, so the
+    // mid-read-failure path (round 9, finding 2) is observable in the same timeline as the
+    // others. Without this the harness could only produce streams that close.
+    const response = opts.errorAfter !== undefined
+      ? erroringStreamResponse(opts.chunks || [Buffer.from('x')], {
+        status: opts.status ?? 200,
+        headers: opts.headers || {},
+        error: opts.errorAfter,
+      })
+      : cancellableStreamResponse(opts.chunks || [Buffer.from('x')], {
+        status: opts.status ?? 200,
+        headers: opts.headers || {},
+      });
+
+    // Record the release — but only once it has actually SETTLED (round 9, finding 3).
+    //
+    // The previous version pushed the marker BEFORE awaiting the underlying cancel, so it
+    // recorded the CALL, not the completion. A cancel that hung or resolved late would still
+    // read as "body-settled" and `settleThenClose` would pass on an unsettled body — the exact
+    // property the ordering assertion exists to check.
+    //
+    // WHY A REJECTION IS STILL "SETTLED". `reader.cancel()` on a stream that has ALREADY errored
+    // rejects with that stream's own error rather than resolving — measured directly, and it is
+    // the spec's behaviour, not a quirk of this fixture. So for the erroring path a rejecting
+    // cancel IS the release having run to completion. The two cases are recorded as distinct
+    // events so no test can confuse "cancelled successfully" with "cancel was refused":
+    //
+    //   body-settled             the cancel completed in the ordinary way
+    //   body-settled-after-error the stream had already failed, and the cancel ran under that
+    //   body-cancel-locked       the cancel was REFUSED (e.g. the body is locked) — a real leak
+    //
+    // 'body-cancel-locked' is the one that matters: it is what the first version of this fix
+    // produced by calling `body.cancel()` on a locked stream, and it means NO release happened.
+    const classifyCancelFailure = (err) => {
+      const msg = String(err?.message || err);
+      return /locked/i.test(msg) ? 'body-cancel-locked' : 'body-settled-after-error';
+    };
+
+    const originalCancel = response.body.cancel.bind(response.body);
+    response.body.cancel = async (reason) => {
+      try {
+        const result = await originalCancel(reason);
+        timeline.push('body-settled');
+        return result;
+      } catch (err) {
+        timeline.push(classifyCancelFailure(err));
+        throw err;
+      }
+    };
+
+    // Record the drain, for the path that consumes rather than cancels — and the READER-level
+    // cancel, which is a DIFFERENT call from `body.cancel()`. The streamed over-cap path cancels
+    // through the reader it already holds, so hooking only `body.cancel` records nothing there.
+    // (Learned the hard way: the first version of this harness missed that path.)
+    const originalGetReader = response.body.getReader.bind(response.body);
+    response.body.getReader = () => {
+      const reader = originalGetReader();
+      const originalRead = reader.read.bind(reader);
+      reader.read = async () => {
+        const step = await originalRead();
+        if (step.done) timeline.push('stream-drained');
+        return step;
+      };
+      // Same correction as `body.cancel` above: record AFTER the await, so the marker means
+      // the reader-level cancel completed rather than merely started (round 9, finding 3).
+      const originalReaderCancel = reader.cancel.bind(reader);
+      reader.cancel = async (reason) => {
+        try {
+          const result = await originalReaderCancel(reason);
+          timeline.push('body-settled');
+          return result;
+        } catch (err) {
+          timeline.push(classifyCancelFailure(err));
+          throw err;
+        }
+      };
+      return reader;
+    };
+
+    return {
+      timeline,
+      fetchImpl: async () => { timeline.push('fetch-returned'); return response; },
+      // `fetchSpotlightImage` builds its own dispatcher from the validated addresses, so the
+      // observation point is the FACTORY, not a pre-built object. Injected via the module's
+      // `dispatcherFactory` opt — the only way to hold the object whose lifetime is under test.
+      dispatcherFactory: trackedFactory,
+      maxBytes: opts.maxBytes ?? 1024,
+    };
+  };
+
+  return { timeline, build };
+}
+```
+
+
+### 3.3 The commits under review, in full
+
+### The integrity-doc correction (round 8 follow-up)
+
+```diff
+commit 36aad8a8c2be36c53a53bb476fdd1a6648b45829
+parent 81d799b746346c2fe7363c58675eb0efb4e5c2d5
+author SeanSwan
+date Mon Sep 21 20:22:10 2026 -0700
+subject docs(integrity): correct REPO-INTEGRITY-FINDING for the new HEAD; record that repair was not needed
+
+diff --git a/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/REPO-INTEGRITY-FINDING-2026-09-21.md b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/REPO-INTEGRITY-FINDING-2026-09-21.md
+index bebc7f306..24903930c 100644
+--- a/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/REPO-INTEGRITY-FINDING-2026-09-21.md
++++ b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/REPO-INTEGRITY-FINDING-2026-09-21.md
+@@ -1,10 +1,61 @@
+ # REPO-INTEGRITY FINDING — a severed parent, and what it means for committing
+ 
+ **Date:** 2026-09-21
+-**Repo:** `<REPO>`
+-**Branch:** `creator-brains-engine-r2-20260915` (at `99b970bd40748758d5f943ee254a43730767bc7b`)
+-**Discovered during:** the round-8 fix commit
+-**Status:** RECORDED — not repaired. Repairing history is out of scope for this session and is not mine to do.
++**Repo:** `<REPO>` (`@Everything/quick-pt/SS-PT` on the operator workstation)
++**Branch:** `creator-brains-engine-r2-20260915`
++**Discovered during:** the round-8 fix commit, at `99b970bd40748758d5f943ee254a43730767bc7b`
++**Status:** SUPERSEDED IN PART — see §0. The commit block cleared itself; the store damage did not.
++
++---
++
++## 0. UPDATE — the blocker cleared itself; the damage did not (same day, ~19:00 → 20:05)
++
++Everything in §1 was measured at HEAD `99b970bd4`. **That is no longer HEAD.** While this finding was
++being written, another session committed to the same branch. Re-measured at HEAD `6407f6b40`:
++
++| Check | At `99b970bd4` (the finding) | At `6407f6b40` (now) |
++|---|---|---|
++| `git ls-tree HEAD backend docs packages` | `fatal: unable to read tree` ×3 | **resolves**: `2f7f43dc…`, `2dccfb48…`, `a94ff816…` |
++| `git commit` | blocked (`unable to read tree entries HEAD`) | **works** |
++| `git fsck --connectivity-only` — missing | 259 | **88** |
++| `git fsck` — broken links | 44 | **18** |
++| `git fsck` — invalid cache-tree pointers | 21 | **21** (unchanged) |
++
++**The three missing top-level subtrees of §1 are no longer the ones HEAD references.** The hashes in
++that table (`backend = 07da0d29…`, `docs = 251d234a…`, `packages = 0e45a19e…`) describe the *old*
++HEAD and must not be used to reason about the current one. **No `git mktree` repair was performed** —
++the rebuild that was prepared (`C:/tmp/mk2.py`, 1,393 directories) was never run, because it became
++unnecessary. The commit went through on the other session's work instead.
++
++What this does and does not change:
++
++- **It does not repair the store.** 88 objects are still missing and 21 cache-tree pointers are still
++  invalid. The commit block was a *symptom*; one symptom has cleared.
++- **`3bc947da5` is still gone**, and `git log -- <path>` still fails on the old tree, so history before
++  the new commits remains untraversable by path.
++- **The §3 warnings stand**, in particular: do not repack, and never use `git checkout -- <path>` here.
++
++### My round-8 work is committed — verified, not assumed
++
++The same session's commits carried the round-8 fixes in. Verified at HEAD `6407f6b40`:
++
++```
++$ git diff HEAD -- <all 9 round-8 paths>     # → 0 lines
++$ npx vitest run backend/tests/unit/spotlightImageLifecycle.test.mjs \
++                 backend/tests/unit/spotlightImageAdmission.test.mjs \
++                 backend/tests/unit/spotlightImageDnsPin.test.mjs
++ ✓ 3 files, 48 tests passed
++```
++
++`addressClassification.mjs` (201), `applaudAudioFetcher.mjs` (280), `spotlightImageFetch.mjs` (293),
++`spotlightImageUrlPolicy.mjs` (227) — all committed and all under ban #50.
++
++**One honest note on how this was nearly mis-reported.** `git status` showed the four source files as
++*clean* while `sha256sum` of the worktree and `git show HEAD:<path>` appeared to **differ**
++(`dd0d4cda…` vs `ee769f13…` for `spotlightImageFetch.mjs`). The apparent mismatch was a line-ending
++artefact of piping `git show` through the shell; `git diff HEAD` — which applies the same filters git
++uses — reported **zero** differences. **For "is this committed?", trust `git diff HEAD`, not a hash of
++`git show` output.**
+ 
+ ---
+ 
+@@ -56,6 +107,74 @@ error: Could not read 3bc947da508852ae07c87c02bf79abc12bd96269
+ fatal: Failed to traverse parents of commit 99b970bd40748758d5f943ee254a43730767bc7b
+ ```
+ 
++### Worse than one missing commit: three missing SUBTREES of HEAD
++
++> **HISTORICAL — describes HEAD `99b970bd4`, not the current HEAD.** See §0. These three trees were
++> replaced by the other session's commits; the current HEAD references `2f7f43dc…`, `2dccfb48…`,
++> `a94ff816…`. Kept as the record of what was actually observed.
++
++The commit is not merely missing a parent. **HEAD's own tree is incomplete.** Three of its
++top-level subtrees are absent from the object store:
++
++| Top-level tree | Object | State |
++|---|---|---|
++| `backend/` | `07da0d29…` | **MISSING** |
++| `docs/` | `251d234a…` | **MISSING** |
++| `packages/` | `0e45a19e…` | **MISSING** |
++| all 19 others | — | present |
++
++Measured by walking HEAD's top level and typing each subtree:
++
++```
++$ git ls-tree HEAD | while read mode type sha name; do
++    [ "$type" = tree ] && { printf "%-46s " "$name"; git cat-file -t "$sha" 2>/dev/null || echo "$sha MISSING"; }
++  done
++backend        07da0d29fa1f49a9567b3ff74f483c1dd9fe5f20 MISSING
++docs           251d234a5506b6d6df7ebeb5cae973b8adcee6fd MISSING
++packages       0e45a19e66f26716ec3c17ae9e6000330b21e4b8 MISSING
++```
++
++**This blocks committing outright.** `git commit` must read the parent commit's tree to
++construct the new commit, so it fails with:
++
++```
++error: Could not read 2d9ee7190e471a8669c4d8e9cbaff358c620e659
++fatal: unable to read tree entries HEAD
++```
++
++and `git reset --mixed` fails the same way:
++
++```
++fatal: unable to read tree (07da0d29fa1f49a9567b3ff74f483c1dd9fe5f20)
++```
++
++### The repair path (and its limit)
++
++A missing tree is **recoverable when the blobs beneath it still exist**, because a git tree is a
++deterministic function of its sorted entries — writing it back yields the same hash. So the three
++subtrees can be rebuilt from the index with `git mktree`, bottom-up.
++
++What was done, in order:
++
++1. **113 of 125 missing blobs regenerated** from their on-disk files, after verifying that
++   `git hash-object <path>` reproduced the recorded hash *exactly* for each. (A blob rewritten
++   from a file whose content matches is the same object, not a guess.)
++2. The remaining **12** are recorded, not papered over:
++   - **9 absent from disk** — `scripts/creator-brains/console/{lib,test,web}/…`, a peer workstream's
++     uncommitted-then-deleted files. **Not mine; not recoverable from this checkout.**
++   - **3 content-changed** — `packages/creator-brains-console/api.mjs`,
++     `…/LocalEngineAdapter.ts`, `…/03b-contracts-proposed-artifacts.md`. Their disk content differs
++     from the index, because another session edited them. The index entries were refreshed, which
++     is correct for the index but means those three trees will not reproduce their old hashes.
++3. Index repaired enough that **`git write-tree` succeeds** (`5a188e81f5baa73a018a0e1b6c66470252f4bbb8`).
++
++The limit, stated plainly: rebuilding a subtree gives a tree that is **equivalent but is not
++guaranteed to be bit-identical** to the lost one, for any directory containing one of those 12
++unrecoverable entries. A git tree hash covers all descendants, so one stale descendant changes the
++whole subtree hash. The rebuilt `backend/` and `docs/` are likely exact (their entries were all
++recoverable); `packages/` cannot be. **This is why the repair is recorded and not presented as a
++restoration of history.**
++
+ ### Which of my commits survived
+ 
+ | Commit | Subject | State |
+```
+
+### The D3 closure — the new transport test
+
+```diff
+commit 6cca20594fd96ca4bfc2874318deca36afa529af
+parent 36aad8a8c2be36c53a53bb476fdd1a6648b45829
+author SeanSwan
+date Mon Sep 21 20:30:13 2026 -0700
+subject test(spotlight): close D3 with a real net-driven transport test; prove it load-bearing by mutation
+
+diff --git a/backend/tests/unit/spotlightImageTransportPin.test.mjs b/backend/tests/unit/spotlightImageTransportPin.test.mjs
+new file mode 100644
+index 000000000..e41f8b88a
+--- /dev/null
++++ b/backend/tests/unit/spotlightImageTransportPin.test.mjs
+@@ -0,0 +1,164 @@
++/**
++ * spotlightImageTransportPin — what the pin does when `net` actually opens a socket
++ * ==============================================================================
++ * WHY THIS FILE EXISTS (hostile review round 8, D3).
++ *
++ * `spotlightImageDnsPin.test.mjs` has a test whose honest name now reads "...but this calls the
++ * hook directly, it does not drive a socket". That rename was the correct fix for an overstated
++ * claim, but it left a real hole: NOTHING in the repo observed `net` consulting `connect.lookup`
++ * during an actual connection. Astra's sharper discriminator (round 7) is the one encoded here —
++ * replace the pinned dispatcher with a default `Agent` and see whether the two cases are
++ * DISTINGUISHABLE. If they are not, the test is asserting on dispatcher PRESENCE rather than on
++ * TRANSPORT, and it would stay green against a pin that does nothing.
++ *
++ * WHAT MAKES THIS A TRANSPORT TEST AND NOT ANOTHER HARNESS TEST.
++ *
++ *   - Two REAL servers listen on two DIFFERENT loopback addresses (127.0.0.1 and 127.0.0.2),
++ *     on the SAME PORT, so the port in the URL is valid for both and the only variable left is
++ *     which ADDRESS the pin chose. (Verified: two 127/8 addresses may hold one port number.)
++ *   - A REAL undici `Agent` is built by the production factory, pinning ONE of them.
++ *   - A REAL `fetch()` is issued against a URL whose HOST is a NAME, not a literal.
++ *   - The assertion is on WHICH SERVER ANSWERED — observed from the server side, over the wire.
++ *
++ * So the observation point is the network, not our own hook. That is the difference the review
++ * asked for: if `net` stops calling our lookup, the request lands on the OTHER server and this
++ * fails, rather than passing because we called our own function.
++ *
++ * WHY A NAME AND NOT A LITERAL. `net` short-circuits an IP literal — there is no name to resolve,
++ * so `connect.lookup` is never consulted and a pin has no say. That limit is already documented
++ * in the sibling file. Here the host is a NAME precisely so the lookup path is the one exercised.
++ *
++ * WHY THE NAME IS NEVER ACTUALLY RESOLVED. The pin's whole value is that the name is NOT resolved
++ * at connect time. The name used below (`pin-probe.invalid`) is a `.invalid` TLD, reserved by
++ * RFC 2606, which can never resolve. If the pin were absent, the connection would fail with DNS
++ * failure rather than reach a server — so a passing test also proves the socket never consulted
++ * the system resolver.
++ *
++ * THE FAILURE THIS FILE ALREADY CAUGHT, RECORDED BECAUSE IT IS THE WHOLE POINT. The first draft
++ * pinned 127.0.0.2 but built the URL from 127.0.0.1's port, and failed with
++ * `ECONNREFUSED 127.0.0.2:<the-other-port>`. That is a defect in the TEST, but the error is also
++ * the proof: the socket had gone to 127.0.0.2, the address nothing in the URL pointed at. Fixing
++ * it by giving both servers one port removes the confound rather than papering over it.
++ */
++import { describe, it, expect, afterEach } from 'vitest';
++import { createServer } from 'node:http';
++import { Agent } from 'undici';
++import { createPinnedDispatcher } from '../../services/spotlightImageUrlPolicy.mjs';
++
++/** A name that can never resolve: `.invalid` is reserved by RFC 2606. */
++const UNRESOLVABLE_NAME = 'pin-probe.invalid';
++
++/** Bind a loopback server that names the address it answered on. */
++const listenOn = (address, port) =>
++  new Promise((resolve, reject) => {
++    const server = createServer((_req, res) => {
++      res.writeHead(200, { 'content-type': 'text/plain' });
++      res.end(`served-by:${address}`);
++    });
++    server.once('error', reject);
++    server.listen(port, address, () => resolve(server));
++  });
++
++/**
++ * Two servers, two addresses, ONE port — so the URL's port is valid for both and the address is
++ * the only thing the pin can change. Returns both plus a closer.
++ */
++const serveTwoAddresses = async () => {
++  const first = await listenOn('127.0.0.1', 0);
++  const { port } = first.address();
++  const second = await listenOn('127.0.0.2', port);
++  return {
++    port,
++    close: async () => {
++      await new Promise((resolve) => second.close(resolve));
++      await new Promise((resolve) => first.close(resolve));
++    },
++  };
++};
++
++describe('the pin observed at the transport, not at the hook', () => {
++  let teardown = null;
++  afterEach(async () => {
++    if (teardown) await teardown();
++    teardown = null;
++  });
++
++  it('the socket opens to the PINNED address even though the URL names neither address', async () => {
++    const pair = await serveTwoAddresses();
++    teardown = pair.close;
++
++    // Pin 127.0.0.2 while both are listening on this port. If the pin is load-bearing the second
++    // server answers; if it is inert the request either fails to resolve or reaches the first.
++    const dispatcher = createPinnedDispatcher([{ address: '127.0.0.2', family: 4 }]);
++    try {
++      const response = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher });
++      // The socket went where the CHECK pointed, not where the NAME pointed — and the name could
++      // not have resolved at all, so this outcome is reachable only through the pin.
++      expect(await response.text()).toBe('served-by:127.0.0.2');
++    } finally {
++      await dispatcher.close();
++    }
++  });
++
++  it('a default Agent is DISTINGUISHABLE — it fails on the same unresolvable name', async () => {
++    // THE DISCRIMINATOR. If this case behaved like the pinned one, the previous test would be
++    // proving nothing about transport. It must FAIL, and specifically by DNS, not by anything else.
++    const pair = await serveTwoAddresses();
++    teardown = pair.close;
++
++    const dispatcher = new Agent();
++    try {
++      const outcome = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher })
++        .then(async (r) => ({ reached: true, body: await r.text() }), (err) => ({ reached: false, err }));
++      expect(outcome.reached).toBe(false);
++      // Named so a future reader can tell "the pin is gone" from "the network is down".
++      const detail = String(outcome.err?.cause?.code || outcome.err?.code || outcome.err?.message);
++      expect(detail).toMatch(/ENOTFOUND|EAI_AGAIN|getaddrinfo/i);
++    } finally {
++      await dispatcher.close();
++    }
++  });
++
++  it('pinning the OTHER address flips which server answers — the pin is the only variable', async () => {
++    // The control that makes the first case non-accidental: hold everything constant except the
++    // pinned address, and the answering server changes. A test that could not tell 127.0.0.1 from
++    // 127.0.0.2 is not observing an address at all.
++    const pair = await serveTwoAddresses();
++    teardown = pair.close;
++
++    const dispatcher = createPinnedDispatcher([{ address: '127.0.0.1', family: 4 }]);
++    try {
++      const response = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher });
++      expect(await response.text()).toBe('served-by:127.0.0.1');
++    } finally {
++      await dispatcher.close();
++    }
++  });
++
++  it('with TWO pinned addresses, the FIRST pinned one is the one connected to', async () => {
++    // ADDED AFTER A MUTATION SURVIVED. Rotating the pinned set (`addrs.slice(1).concat(addrs[0])`
++    // inside `createPinnedDispatcher`) left this whole file GREEN, because every case above pins a
++    // SINGLE address — with one element there is nothing to rotate, so the mutation was invisible
++    // by construction, not by accident. That is a real hole in this file's coverage and this case
++    // closes it: two live addresses on one port, and an assertion about WHICH one wins.
++    //
++    // This is `net`'s single-address form (`{ all: false }`), which gets `pinned[0]`. The pin's
++    // contract is that the validated ORDER is preserved, so the first validated address is the one
++    // a socket takes. A pin that silently reorders its set would connect somewhere the check did
++    // approve but did not prefer — and would still look correct in every single-address test.
++    const pair = await serveTwoAddresses();
++    teardown = pair.close;
++
++    const dispatcher = createPinnedDispatcher([
++      { address: '127.0.0.2', family: 4 },
++      { address: '127.0.0.1', family: 4 },
++    ]);
++    try {
++      const response = await globalThis.fetch(`http://${UNRESOLVABLE_NAME}:${pair.port}/`, { dispatcher });
++      // 127.0.0.2 is FIRST, so it is the one that must answer — not the second entry.
++      expect(await response.text()).toBe('served-by:127.0.0.2');
++    } finally {
++      await dispatcher.close();
++    }
++  });
++});
+```
+
+
+### 3.4 The round-8 review being remediated
+
+#### `Z:/HostileReviews/2026-09-21-163103-social-bridge-round-8-astra-s-dns-pin-review.md`
+
+sha256 `cd237d0e6883e3518928b576f3632117892f3f2344dbba6522aebbe60b62e1e6` · 133 lines
+
+Inlined so you can check the fixes against the findings they claim to close. Addressed by absolute path because Rule 86 files reviews outside the repo, and inlined precisely so the path need not resolve for you.
+
+```markdown
+---
+review_id: 2026-09-21-163103-social-bridge-round-8-astra-s-dns-pin-review
+status: published
+date_local: 2026-09-21T16:31:03-07:00
+date_utc: 2026-09-21T23:31:03Z
+subject: "Social Bridge round 8: Astra's DNS-pin review returns REVISE -- three source-level defects and four overstated claims"
+reviewer_agent: astra
+reviewer_seat: "codex exec / gpt-6-astra (xhigh reasoning)"
+round: 8
+repo: SS-PT
+repo_path: "<REPO>"
+branch: creator-brains-engine-r2-20260915
+commit: 99b970bd4
+scope: "In: backend/services/spotlightImageUrlPolicy.mjs, backend/services/spotlightImageFetch.mjs, backend/tests/unit/spotlightImageDnsPin.test.mjs, the inlined round-8 packet. Out: runtime measurement (read-only sandbox), the audio consumer's own tests."
+verdict: DEFECTS-FOUND
+defects: { critical: 0, high: 1, medium: 2, low: 1 }
+unproven: 4
+supersedes: null
+superseded_by: null
+tags: [dns-rebinding, ssrf, undici, toctou, spotlight, social-bridge, astra, round-8]
+---
+
+# HOSTILE REVIEW — Social Bridge round 8: Astra's DNS-pin review returns REVISE -- three source-level defects and four overstated claims
+
+**Reviewer:** astra (codex exec / gpt-6-astra (xhigh reasoning)), 2026-09-21T16:31:03-07:00
+**Method:** `codex exec --json --ephemeral --sandbox read-only -c model_reasoning_effort=xhigh --model gpt-6-astra -`, packet piped on stdin (99,804 bytes / 2,028 lines, sha256 `5cbb16d5133eaec6345484ce53f70acf3fa027f4e5524eef495bd445c6b229a3`). Exit 0, 331 s, 11,969 bytes out. **Every artifact was inlined**, so unlike round 7 the reviewer could grade claims against cited `file:line` evidence. Reviewer performed no commands, network, tests, mutations, or hash verification — source reading only. Classifier claims (D2) were then **independently re-measured live** by sable; see §1.
+**Evidence:** `C:/tmp/astra-r8.jsonl` (raw). Sable's re-measurement probes: `C:/tmp/classifier-probe.mjs`, `C:/tmp/reach-probe.mjs`, `C:/tmp/trace-probe.mjs`, `C:/tmp/admission-probe.mjs`, `C:/tmp/gap-probe.mjs`, `C:/tmp/socket-probe.mjs`.
+**Verdict:** DEFECTS-FOUND — 0 critical / 1 high / 2 medium / 1 low, 4 unproven
+
+---
+
+## 0. Verdict in one paragraph
+
+The pin **is** wired into the transport — that much is now CONFIRMED at the source level, which round 7 could not establish. What round 8 found is that three of the claims *around* the pin overstate what the supplied tests actually cover, and that the classifier the whole admission path depends on has a false fail-closed contract. The single most important item is **D4**: `resolveAndValidate` **admits** `https://[::ffff:0:127.0.0.1]/` — an IPv4-mapped loopback literal — because `dns.lookup` normalises it to `::ffff:0:7f00:1`, which the classifier's mapped-IPv4 regex does not match, and the classifier then falls through to `return false` ("public IPv6"). That is not a documentation defect; it is an admitted bypass of the only guard that sees that shape. The one thing a reader must not assume: **I could not make that address route.** On this host it returns `ENETUNREACH` while the genuine `::ffff:127.0.0.1` returns `ECONNREFUSED`, so the bypass is real at the admission layer and *not demonstrated* at the socket layer. It is graded HIGH for that reason and not CRITICAL.
+
+---
+
+## 1. Confirmed — what I re-measured and could not break
+
+| Claim under review | My measurement | Result |
+|---|---|---|
+| Round 8's `C1`: the pin is wired `P:156 → F:75 → F:83 → F:99 → P:214` | Read the chain in `spotlightImageUrlPolicy.mjs` / `spotlightImageFetch.mjs`; `dispatcher` is constructed at F:83 and passed to `fetchImpl` at F:99 | **CONFIRMED** (wiring only) |
+| `C4`: the dispatcher-removal mutation is detected | `spotlightImageDnsPin.test.mjs` T:205 asserts `seen[0].dispatcher` is defined; T:215/224 reaches the pinned answer through `Symbol(options)` | **CONFIRMED for the specified mutation** |
+| `C9`: assertion sensitivity | Same tests fail if `dispatcher` is removed | **CONFIRMED** |
+| `createPinnedDispatcher` fails closed on an empty set | P:205–209 throws `SpotlightImageError`; T:102–108 asserts it | **CONFIRMED** |
+| Classifier: `dns.lookup("[::1]")` normalises before the check | Live: `dns.lookup("[::1]", {all:true})` → `[{address:'::1',family:6}]`; post-lookup loop catches `::1`; admission REFUSES | **CONFIRMED — the DNS path is the thing saving bracketed IPv6 literals**, not the classifier |
+
+Astra's four classifier inputs, re-measured live (`C:/tmp/classifier-probe.mjs`) — all four reproduce exactly:
+
+| Input | `isPrivateOrLocalAddress` | `net.isIP` | Note |
+|---|---|---|---|
+| `":"` | `false` | 0 | Astra's claim confirmed |
+| `"8.8.8.999"` | `false` | 0 | Astra's claim confirmed (treated as a NAME upstream anyway) |
+| `"0:0:0:0:0:0:0:1"` | `false` | 6 | Astra's claim confirmed — this IS loopback |
+| `"::ffff:7f00:1"` | `false` | 6 | Astra's claim confirmed — this IS loopback |
+
+---
+
+## 2. Defects
+
+Severity per `severity-policy-1` in `README.md` §3. Graded in both directions; where a grade rests on a fact I could not check, the fact is named.
+
+### D1 — Response body is cancelled *after* the dispatcher is awaited closed [HIGH]
+
+- **Claim under review:** `fetchSpotlightImage` cleans up transport and body correctly.
+- **Evidence:** `spotlightImageFetch.mjs` F:90 `fetchImpl(...)` returns a response whose body may still be streaming. The `finally` at F:112 awaits `dispatcher.close()` at **F:117** — *before* reaching non-success cancellation at **F:124**, declared-size rejection/cancellation at **F:130–135**, and stream consumption with its byte cap at **F:145–155**.
+- **Exploitability / reach:** Any caller whose upstream answers slowly, or answers a large body with a 4xx/5xx. Worst case is a stall proportional to how long `close()` drains, plus cancellation that arrives arbitrarily late.
+- **Why it matters:** `close()` is documented on a live socket pool as "drains idle sockets **once in-flight requests settle**". A body that is still being read *is* an in-flight request, so the ordering makes the close wait on the very body the code then cancels. The correct order is the opposite: settle the body, then close the pool.
+- **Fix:** Move the `dispatcher.close()` into a `finally` that wraps **the whole fetch-and-body operation**, not just the fetch. Consume or cancel the response first, then await graceful closure; define cleanup behaviour for aborted or failed transfers explicitly.
+- **Honest limit (Astra's own, preserved):** *"The ordering is visible in the source. Its precise manifestation in the reported runtime remains unmeasured; this is **not evidence of a permanent socket leak**."* Graded HIGH on the ordering being wrong by construction, **not** on a measured leak.
+
+### D2 — `isPrivateOrLocalAddress` has a false fail-closed contract [MEDIUM, pre-existing, shared]
+
+- **Claim under review:** the classifier "defaults to private on unknown / un-parseable input (fail-closed)" (`applaudAudioFetcher.mjs` A:288).
+- **Evidence:** A:294 branches on `ip.includes(':')`. Any string containing a colon that is not `::1`, `::`, `fc/fd…`, `fe8–b…`, `ff…`, or `/^::ffff:(\d+\.\d+\.\d+\.\d+)$/` falls through to **A:304 `return false; // public IPv6`**. Four measured inputs: `":"`→`false`, `"8.8.8.999"`→`false`, `"0:0:0:0:0:0:0:1"`→`false`, `"::ffff:7f00:1"`→`false`. All four are loopback-or-garbage, and not one is reported private.
+- **Exploitability / reach:** **Pre-existing and shared** — `applaudAudioFetcher.mjs` (the PLAUD audio path) and `spotlightImageUrlPolicy.mjs` both import it. The audio path is saved by its exact-host allowlist; the Spotlight path has no allowlist, so this classifier is load-bearing for it. Astra's honest limit: the inputs are *resolver-supplied or URL-derived* strings, and whether attacker-controlled DNS reaches them in these representations depends on resolver normalisation. Astra states plainly: *"a production SSRF bypass is not demonstrated here."* I agree, and I did not inflate it.
+- **Why it matters:** A function whose header promises fail-closed while its IPv6 branch defaults to *fail-open* is worse than one with no promise, because downstream authors trust the promise. The audit will stop looking exactly where the bug is.
+- **Fix:** Make the IPv6 branch fail closed for anything it does not positively recognise as publicly routable — invert the default. Cover `::`, `::1` in expanded/zero-compressed forms, hex IPv4-mapped (`::ffff:7f00:1`), and bare/colon-only garbage. Because the helper is **shared**, the fix must be additive-compatible: the audio consumer's existing tests are the regression gate and must not be edited to accommodate it.
+
+### D3 — The decisive named-host transport test does not exist [MEDIUM, false claim of coverage]
+
+- **Claim under review:** `C6` and `C8` — that the literal-admission test "asserts both halves" and that a live named-host test observes the lookup.
+- **Evidence:**
+  - T:147 builds a `createPinnedLookup(...)`, then **T:148 calls that lookup directly**. No HTTP request ever uses the dispatcher built at T:145. The test observes a *function being invoked by the test*, not `net` invoking it during a connection.
+  - The combined literal test: T:175 supplies `server.url`, which is an **`http://`** URL (`withLoopbackServer` T:53), so `P:114` rejects the protocol *before* address admission is ever reached. Half two therefore passes for the wrong reason and proves nothing about literal admission.
+  - The "unpinned fetch reaches loopback" control (T:126–137) proves direct connectivity to `127.0.0.1`. It is a good control, but it is **not** a rebinding demonstration.
+- **Exploitability / reach:** n/a — this is an evidence defect, not a runtime one.
+- **Why it matters:** This is the R6-01 class one level up: a green suite whose green does not entail the property it is named for. The file's own docblock at T:139–143 claims "This asymmetry **is** measured here, live" — but the asymmetry is *simulated by calling the hook*, not produced by `net` on a real connection.
+- **Fix:** Add a real named-host transport test that points at a name, lets `net` drive the connection, and asserts **which address the socket opened to** — not that a function the test itself called returned a value. Astra's sharper discriminator from round 7 applies: replace the wired dispatcher with a default `new Agent()` and assert the two cases are *distinguishable*, so the test fails on *transport* rather than on *dispatcher presence*.
+
+### D4 — `resolveAndValidate` admits `[::ffff:0:127.0.0.1]`, an IPv4-mapped loopback literal [HIGH, found by me on Astra's D2 lead]
+
+- **Claim under review:** `resolveAndValidate` "rejects a private IP-literal before any lookup" (T:267) and fails closed on every private form.
+- **Evidence (live, `C:/tmp/gap-probe.mjs`):**
+  ```
+  https://[::ffff:0:127.0.0.1]/a.png   ADMITTED addrs=[{"address":"::ffff:0:7f00:1","family":6}]  <-- BYPASS
+  ```
+  Mechanism: for a bracketed IPv6 literal, `URL.hostname` keeps the brackets (`"[::ffff:0:127.0.0.1]"`), so `net.isIP` returns **0** and the literal branch at P:129 is *not* taken. Control falls to the DNS path, where `dns.lookup` normalises the address to `::ffff:0:7f00:1` — a **hex**-form IPv4-mapped address. The classifier's mapped branch (A:302) matches only the **dotted-decimal** form `::ffff:a.b.c.d`, so it misses. The other guards do not fire: ULA is `fc00::/7` (this is `::ffff:…`), link-local is `fe80::/10`, multicast is `ff00::/8`, and `::1` requires an exact match. Falls to A:304 → `false` → admitted.
+- **Exploitability / reach:** A curator-supplied Spotlight URL is the input. The literal is admitted and **pinned as itself** (P:156), so the dispatcher will faithfully connect to the address the check approved.
+- **Why it matters:** Two independent defects compose here — a bracketed literal escaping `net.isIP` admission (D3's family) and the classifier's hex-mapped blind spot (D2). Either alone is a bug; together they produce an *admitted* private literal, which is exactly the thing the literal branch at P:124–134 exists to prevent.
+- **Measured limit — do NOT inflate:** `C:/tmp/socket-probe.mjs` shows the admitted address is **not routable on this host**: `::ffff:0:7f00:1` → `ENETUNREACH`, while the genuine mapped loopback `::ffff:127.0.0.1` → `ECONNREFUSED` (i.e. it really did reach a local port). The `::ffff:0:` prefix is a *different* address from `::ffff:` — it is the SIIT/translator form, not the standard mapped form. So this is **HIGH**: a demonstrated admission-layer bypass whose socket-layer impact I could not reproduce on this machine. It would be CRITICAL on a host where that prefix translates.
+- **Fix:** Two, and both are needed. (1) Strip brackets before `net.isIP` at `spotlightImageUrlPolicy.mjs` P:128 so a bracketed literal takes the literal branch and is classified directly. (2) Invert the classifier's IPv6 default (D2/D4 share one fix) so any unrecognised colon-bearing string is private. Add the four measured shapes plus `[::ffff:0:127.0.0.1]` as regression cases.
+
+---
+
+## 3. Not proven / unopened
+
+- **The pin's runtime transport behaviour** — `C1` is `BLOCKED overall` (wiring CONFIRMED only). No test in the repo observes `net` invoking `connect.lookup` during a real connection. Astra graded `C1`'s runtime half and `C2`/`C3` in full as BLOCKED.
+- **`C5` is not adjudicable as stated** — it carried a motive clause ("removes no guard ... *in order to* smooth the patch"). Astra recommends restating it as a factual claim: *"The supplied patch removes no existing security guard or test."* Agreed; the motive form cannot be settled by reading code.
+- **`C7` / `C8` FALSIFIED** — T:22 says "no symbol-poking" while T:224 calls `Object.getOwnPropertySymbols(..., 'Symbol(options)')`. The comment and the code contradict each other. Also F:115–116 treats `await fetchImpl(...)` returning as the *body* having settled, which is precisely D1.
+- **`C10` understatements:** (1) bracketed IPv6 URL hostnames reach `net.isIP` without bracket removal (now escalated to D4); (3) `P:61–69` bounds the *caller's wait* but does **not** cancel the underlying `dns.lookup`, which continues and may still occupy a resolver thread; (6) the "61/61 before every mutation" chronology needs qualification — mutation 1 ran against the earlier 15-test suite, not the current 17-test file.
+- **Astra's scope note, quoted because it bounds this whole review:** *"This review uses only the supplied artifacts. No commands, network requests, tests, mutations, or hash verification were performed."*
+- **Unopened entirely:** the audio consumer's own test coverage for the shared classifier; `decodeSpotlightImage`'s `sharp` pipeline; the twelve `validateSpotlightImageUrl` call sites.
+
+---
+
+## 4. What I deliberately did NOT do, and why
+
+- **Did not mark the repo's dirty tree.** ~1,327 dirty paths are present from other sessions; I committed only my own paths, by name, with no `git add -A` (ban #52/#53).
+- **Did not kill or reap any process or lock** belonging to another session (surgical-partial-commit rule).
+- **Did not edit the four peer-authored untracked packet files** (`R1-REVIEW-ROUND-2-PACKET.md`, `R1-REVIEW-ROUND-2-REPLY.md`, `R1-REVIEW-ROUND-2-REPLY.meta.json`, `R1-REVIEW-ROUND-5-PACKET.md`) — not mine, left alone.
+- **Did not fix D2 by allowlisting the scanner hit** from the earlier commit; the correct fix was to remove the hardcoded home path.
+- **Did not claim a socket-layer exploit for D4.** I measured it and it did not route.
+
+---
+
+## 5. Round log
+
+| Round | Looked at | Found | Fixed | Re-verified |
+|---|---|---|---|---|
+| 7 | packet cited by hash + local path | `INCONCLUSIVE` — 6 unproven; reviewer could not read files or resolve hashes | inlined every artifact into the packet; scanner-backed dispatch gate | round 8 read the sources successfully |
+| 8 | inlined sources, classifier, patch, mutation record | D1 lifecycle ordering, D2 false fail-closed contract, D3 absent named-host test, D4 admitted mapped-loopback literal; C6/C7/C8 falsified | pending — this filing records findings, fixes follow | not yet — see §3 |
+
+**Dry:** not reached. Round 8 is the first round that could adjudicate at all (round 7 returned `INCONCLUSIVE` for mechanical reasons), and it found four defects, so the loop is still live. Round 9 is required after the D1/D2/D3 fixes land.
+```
+
+
+### 3.5 The mutation records — the author's evidence for C4, C6 and C9
+
+The D1/D2/D4 mutation evidence lives in the repo's mutation record; the D3 evidence was produced in
+this session and is reproduced verbatim below. **Read the second one closely: it records a mutation
+that SURVIVED.** A record that only contained successes would be the thing to distrust.
+
+#### `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/DNS-PIN-MUTATION-RECORD-2026-09-21.md`
+
+sha256 `ff384e4415a12824d0c3c12defb4088ac8064d7540d7df6dd17da87a73e3ed55` · 133 lines
+
+```markdown
+# DNS-REBINDING PIN — MUTATION RECORD
+
+**Date:** 2026-09-21
+**Subject:** Closing the DNS-rebinding TOCTOU in the Spotlight image rehost path
+**Files under test:**
+- `backend/services/spotlightImageUrlPolicy.mjs`
+- `backend/services/spotlightImageFetch.mjs`
+- `backend/tests/unit/spotlightImageDnsPin.test.mjs` (new, 18 tests)
+
+---
+
+## Why this record exists
+
+Four mutations were run against the fix. The first one **passed the entire suite** and that
+result is the most important thing in this document — it found a defect in my own tests, not in
+the fix. Recording it here so the next agent does not have to rediscover it.
+
+Baseline before every mutation: **61/61 green** across the four spotlight suites
+(`spotlightImageDnsPin` 18, `spotlightImageFetch` 22, `bridgeSpotlightImage.security` 8,
+`spotlightImageDecode` 13).
+
+---
+
+## Mutation 1 — remove `dispatcher` from the fetch call
+
+**Mutated:** `backend/services/spotlightImageFetch.mjs`, `dispatcher,` → `// MUTANT`
+(one line, inside the `fetchImpl(...)` options object)
+
+**Result: 15/15 GREEN.** No test failed.
+
+**This is a real finding.** The suite at that point exercised `createPinnedLookup` and
+`createPinnedDispatcher` *directly* — so it proved the pin's factories worked, and proved nothing
+about whether production code ever called them. A pin that is constructed but never passed to the
+transport is **dead code with a good comment**, and the suite called it green.
+
+**Fix to the tests, not the code.** Three assertions were added under
+`fetchSpotlightImage wires the pin into the transport`:
+
+1. `passes a dispatcher to fetchImpl` — captures `init.dispatcher` from a stub `fetchImpl` and
+   asserts it is defined and has a `close` (i.e. is a real `Agent`).
+2. `pins the addresses the validator approved` — reaches the dispatcher's `connect.lookup` and
+   asserts the answer equals the mocked `PUBLIC_IP`, proving the pin carries the *resolved*
+   addresses rather than merely existing.
+3. `refuses to fetch when the pinned address set is empty` — fail-closed.
+
+**Re-run after the fix: same mutation now turns 2 tests RED**
+(`passes a dispatcher to fetchImpl`, `pins the addresses the validator approved`). The mutation is
+now caught.
+
+**Restored:** `sha256 87f9ec2fb662f2a0bec76458da7764f4de2599663c9a43edca5981284fc1e23e`
+
+---
+
+## Mutation 2 — drop the first pinned address
+
+**Mutated:** `spotlightImageUrlPolicy.mjs`, `callback(null, pinned)` → `callback(null, pinned.slice(1))`
+
+**Result: 5 RED**
+
+- answers the all:true form with every pinned address
+- ignores the requested hostname — the answer is the pinned set
+- preserves an IPv6 pinned address with its family
+- the pin is consulted for a NAMED host — the lookup hook fires, the literal path does not
+- pins the addresses the validator approved, not the URL alone
+
+**Note:** this mutation only touches the `all: true` branch, which is why the *single-address*
+test stayed green — correct, and the reason Mutation 3 exists.
+
+**Restored:** `sha256 77f928d125cdf526664b9bb3bf831b814579670da47dbf41afdd150c1ec1cd3f`
+
+---
+
+## Mutation 3 — single-address branch answers loopback
+
+**Mutated:** `spotlightImageUrlPolicy.mjs`, `callback(null, first.address, first.family)` →
+`callback(null, '127.0.0.1', first.family)`
+
+**Result: 1 RED** — `answers the single-address form with a bare address and family`
+
+The two answer shapes (`{all:true}` → array, else → bare address + family) are both load-bearing
+because `net` calls the hook both ways. Answering only one correctly would make the pin work for
+one caller and silently fall through for the other. Mutation 2 covered the array shape; this covers
+the bare shape.
+
+**Restored:** `sha256 77f928d125cdf526664b9bb3bf831b814579670da47dbf41afdd150c1ec1cd3f`
+
+---
+
+## Mutation 4 — disable the IP-literal branch
+
+**Mutated:** `spotlightImageUrlPolicy.mjs`, `const literalFamily = net.isIP(incoming.hostname);`
+→ `const literalFamily = 0;`
+
+**Result: 3 RED**
+
+- validates an IP-literal host without a lookup and pins the literal
+- rejects a private IP-literal before any lookup
+- rejects the cloud metadata IP-literal before any lookup
+
+This matters more than it looks. A literal host **never consults `connect.lookup`** — `net`
+short-circuits it because there is no name to resolve — so the pin is structurally unable to
+protect the literal case. Admission is the only control there, and this mutation proves the tests
+would notice if admission stopped doing it.
+
+**Restored:** `sha256 77f928d125cdf526664b9bb3bf831b814579670da47dbf41afdd150c1ec1cd3f`
+
+---
+
+## Measured behaviour, not assumed
+
+Confirmed against real sockets and real `undici` (v7.27.1, node v22.22.2):
+
+| host form | `connect.lookup` consulted? | pin effective? | what stops a private target |
+|---|---|---|---|
+| NAME (`https://rebind.example/a.png`) | **yes** (`lookupCalled = 1`) | **yes** | the pin |
+| IP-literal (`https://10.0.0.1/a.png`) | **no** (`lookupCalled = 0`) | **no** | admission (`resolveAndValidate`) |
+
+Also measured: `globalThis.fetch` **does** honour a foreign `undici.Agent` passed as `dispatcher`
+(the hook fired and the connection went to the pinned address), so the fix does not require swapping
+the fetch implementation and every existing `fetchImpl` injection point — including tests —
+stays intact. And an `Agent` is a **live socket pool**: without `close()` it holds the event loop
+open, which is why `spotlightImageFetch` closes it in a `finally`.
+
+---
+
+## What this record does NOT claim
+
+- The pin does not defend the IP-literal case; admission does. Both are tested; neither is
+  presented as the other.
+- The pin only makes the **first hop** honest. `redirect: 'error'` is what prevents a second hop
+  from existing. The two are complementary and neither is a defence alone.
+- No live end-to-end rebinding attack was executed against a real hostile DNS server. The pin's
+  mechanism is proved at the `connect.lookup` boundary and against real loopback sockets, not by
+  running an actual rebinding attack.
+```
+
+
+#### The D3 mutation record, reproduced verbatim from this session
+
+```markdown
+D3 MUTATION RECORD — spotlightImageTransportPin.test.mjs
+========================================================
+Subject: the new transport test committed as 6cca20594.
+Method: mutate backend/services/spotlightImageUrlPolicy.mjs, run the suite, restore the source
+        and verify byte-identity (sha256 6ec126d3c5529032…, git diff HEAD = 0 lines).
+Every mutation below was REVERTED before the next one; each restoration was hash-checked.
+
+--- Mutation 1 — the pin is removed entirely -----------------------------------------------
+EDIT:  return new Agent({ connect: { lookup: createPinnedLookup(addrs) } });
+   ->  return new Agent();   // pin removed — does any test notice?
+
+RESULT: 2 of 4 RED in spotlightImageTransportPin.test.mjs
+        Caused by: Error: getaddrinfo ENOTFOUND pin-probe.invalid
+        plus 1 additional RED in spotlightImageDnsPin.test.mjs
+        test files 2 failed (2) | tests 3 failed | 15 passed (18)
+
+The first and third cases go RED because the NAME cannot resolve without the pin — which is the
+property under test. The SECOND case ("a default Agent is DISTINGUISHABLE") correctly STAYS GREEN:
+its job is to prove the two dispatchers differ, not to detect this mutation. A test that went RED
+there would be asserting the wrong thing.
+
+--- Mutation 2 — the pin set is order-rotated -------------------------------------------------
+EDIT:  createPinnedLookup(addrs)
+   ->  createPinnedLookup(addrs.slice(1).concat(addrs[0]))
+
+FIRST RUN: ALL THREE TESTS GREEN. THE MUTATION SURVIVED.
+
+That is a defect against the TEST, not against the source, and it is recorded rather than tidied
+away. Root cause: every case in the file pinned a SINGLE address, and with one element there is
+nothing to rotate — so the mutation was unreachable by construction, not by accident. The suite
+looked mutation-proof while being structurally blind to an entire defect class.
+
+FIX: a fourth case was added that pins TWO addresses (['127.0.0.2','127.0.0.1']) against two live
+servers on one port, asserting the FIRST pinned address is the one connected to.
+
+RE-RUN: 1 RED —
+        AssertionError: expected 'served-by:127.0.0.1' to be 'served-by:127.0.0.2'
+        test files 1 failed (1) | tests 1 failed | 3 passed (4)
+
+The hole is closed. Baseline with the four cases and no mutation: 4 passed (4).
+
+--- What this record does NOT claim -----------------------------------------------------------
+- It does not claim the new test is now mutation-proof. It claims one demonstrated hole was closed.
+- It does not claim mutation coverage of the SIBLING suites; only the two mutations above, and only
+  against spotlightImageTransportPin.test.mjs (plus the collateral RED in dnsPin for mutation 1).
+- The mutation surface is `createPinnedDispatcher` only. `createPinnedLookup` was not mutated
+  directly in this session; it is the callee the two mutations above reach through.
+```
+
+---
+
+## §4 — Author-run measurements, labelled as such
+
+Everything in this section was run by the AUTHOR on this machine, and you should treat it as an
+unverified claim unless you can reproduce it — which, being shell-less, you cannot. It is reported
+so you can judge whether it *would* have been sufficient, and to make it obvious which claims rest
+on it.
+
+| Measurement | Result |
+|---|---|
+| `vitest run` transportPin + dnsPin + lifecycle + admission | **4 files, 52 tests passed** |
+| D3 mutation 1 — `createPinnedDispatcher` returns `new Agent()` (pin removed) | **2 of 4 RED** (`getaddrinfo ENOTFOUND pin-probe.invalid`) + 1 more RED in dnsPin |
+| D3 mutation 2 — pin set rotated `addrs.slice(1).concat(addrs[0])` | **FIRST RUN: ALL GREEN — THE MUTATION SURVIVED** (see §3.5); after adding a two-address case: **1 RED** |
+| D1 mutation — original ordering restored | **4 of 6 RED** |
+| Classifier, post-fix, four round-8 inputs | `":"`→true, `"8.8.8.999"`→true, `"0:0:0:0:0:0:0:1"`→true, `"::ffff:7f00:1"`→true |
+| `bracketed` literal `https://[::ffff:0:127.0.0.1]/` | now **REFUSED** (`IMAGE_URL_NOT_ALLOWED`) |
+| ban #50 (no source file ≥ 300 lines) | 201 / 280 / 227 / 293 / 164 / 286 / 111 / 147 / 182 — all under |
+| Source restored byte-identical after each mutation | `6ec126d3c5529032…`, `git diff HEAD` = 0 lines |
+
+---
+
+## §5 — What this packet cannot give you, and does not pretend to
+
+- **You cannot re-run the mutations**, so C4/C6/C9 rest partly on an author-supplied record. The
+  record is honest (it contains a failure) but it is still the author's.
+- **You cannot measure the socket layer.** Round 8 correctly refused to inflate D4 from an
+  admission-layer bypass to a socket-layer exploit. The same restraint applies to the fix: the new
+  test shows the *pin* routes a socket, not that any particular address is unreachable.
+- **The repo's object store is damaged.** 88 objects are missing, 18 links are broken, and 21
+  cache-tree pointers are invalid. Two commits below may fail to render in full for that reason;
+  where they do, it is stated rather than silently omitted.
+- **C1's runtime half retains a residue.** The new transport test observes a real socket, which is
+  stronger than round 8's position — but it observes it on THIS machine, with THIS Node and undici.
diff --git a/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/build-round9-packet.mjs b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/build-round9-packet.mjs
new file mode 100644
index 000000000..d7b2b6153
--- /dev/null
+++ b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/build-round9-packet.mjs
@@ -0,0 +1,208 @@
+#!/usr/bin/env node
+/**
+ * build-round9-packet.mjs — assemble the round-9 review packet with EVERY artifact INLINED.
+ *
+ * WHY A ROUND 9, AND WHY THIS PROGRAM. Round 8 (2026-09-21-163103) returned DEFECTS-FOUND with
+ * four defects — D1 lifecycle ordering (HIGH), D2 a false fail-closed classifier contract (MEDIUM),
+ * D3 no real transport test (MEDIUM), D4 an admitted mapped-loopback literal (HIGH). All four are
+ * now fixed and committed. Round 9's job is to adjudicate THE FIXES, not to re-adjudicate round 8.
+ *
+ * The round-7 lesson still governs the format: a hash is not evidence to a document-only reviewer.
+ * Every source, both patches, and both mutation records are embedded IN FULL, each with its sha256
+ * computed from the same bytes that were embedded. The assembler is a program rather than a
+ * hand-written file so an inline block cannot silently disagree with the file it claims to be.
+ *
+ * WHAT IS DIFFERENT FROM ROUND 8'S PACKET, AND WHY IT MATTERS.
+ * Round 8's decisive gap was D3: every test exercised our own hook, so a pin that was constructed
+ * but never wired would still have shown green. Round 9 inlines the NEW transport test, which
+ * observes a real socket against two real servers — and inlines the MUTATION EVIDENCE for it,
+ * including the mutation that SURVIVED the first attempt. A surviving mutation is reported as a
+ * finding against the test, not hidden, because a suite that cannot see a difference is the exact
+ * defect class (R6-01) this whole loop exists to catch.
+ *
+ * USAGE
+ *   node build-round9-packet.mjs            # writes the packet, prints the stats
+ *   node build-round9-packet.mjs --check    # verifies an existing packet's hashes against disk
+ */
+import fs from 'node:fs';
+import path from 'node:path';
+import crypto from 'node:crypto';
+import { execFileSync } from 'node:child_process';
+import { fileURLToPath } from 'node:url';
+import { renderRound9Packet } from './round9-packet-template.mjs';
+
+const HERE = path.dirname(fileURLToPath(import.meta.url));
+
+// Sits at <repo>/docs/ai-workflow/AI-HANDOFF/<blueprint>/. Located by walking up to the marker
+// rather than by counting levels, so moving this file cannot silently point REPO at a wrong tree.
+const REPO = (() => {
+  let d = HERE;
+  for (let i = 0; i < 8; i++) {
+    if (fs.existsSync(path.join(d, 'backend', 'package.json')) && fs.existsSync(path.join(d, '.git'))) return d;
+    d = path.resolve(d, '..');
+  }
+  throw new Error(`could not locate the repo root by walking up from ${HERE}`);
+})();
+
+const OUT = path.join(HERE, 'R1-REVIEW-ROUND-9-PACKET.md');
+const CHECK = process.argv.includes('--check');
+
+const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
+const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
+const lines = (s) => s.split('\n').length - 1;
+
+/**
+ * REDACT THE OPERATOR'S ABSOLUTE PATHS FROM INLINED EVIDENCE.
+ *
+ * WHY THIS IS NEEDED AT ALL. The packet inlines artifacts VERBATIM — that is the whole design
+ * rule from round 7 (a hash is not evidence to a document-only reviewer; evidence is text the
+ * reviewer can see). But two of the things inlined are historical records that happen to embed an
+ * absolute path: a commit header's `git show` output can echo a repo path, and the round-8 review
+ * carries `repo_path:` in its front-matter. On the first build, `scripts/scan-secrets.sh` reported
+ * `operator-identity` at two lines because of exactly that, and it was RIGHT to.
+ *
+ * The scanner's own stated remedy is to rewrite the path (scan-secrets.sh:64: `<REPO>/…`,
+ * `<HOME>/…`, `<OPERATOR>`), NOT to add a .secretignore entry. Adding an allowlist here would
+ * suppress the check that exists to catch egress, so this redacts instead.
+ *
+ * WHAT IS AND IS NOT TOUCHED. Only the operator-identifying prefix is rewritten to `<REPO>`; the
+ * rest of every artifact, including the path SEGMENTS after the root, is byte-identical. The
+ * redaction is applied to the TEXT THAT GETS EMBEDDED, and the sha256 is computed from those same
+ * redacted bytes — so the hash still describes what the reviewer can see, which is the property
+ * round 7 established. `verify-r9-packet.mjs` accounts for this; see its note.
+ */
+function redactOperatorPaths(text) {
+  return text
+    .replace(/C:\\Users\\[^\\\s"']+\\Desktop\\@Everything\\quick-pt\\SS-PT/g, '<REPO>')
+    .replace(/C:\\Users\\[^\\\s"']+(?=\\|$)/g, '<HOME>')
+    .replace(/C:\/Users\/[^/\s"']+\/Desktop\/@Everything\/quick-pt\/SS-PT/g, '<REPO>')
+    .replace(/(Users|home)[^A-Za-z0-9]+BigotSmasher/g, '<HOME>/<OPERATOR>');
+}
+
+/**
+ * The round-8 review lives OUTSIDE the repo (Rule 86 files reviews at Z:\HostileReviews\), so it is
+ * addressed by ABSOLUTE path and read by a separate helper. Read fails LOUDLY rather than silently
+ * emitting an empty artifact — an absent piece of evidence must be visible to the reviewer.
+ */
+const ROUND8_REVIEW = 'Z:/HostileReviews/2026-09-21-163103-social-bridge-round-8-astra-s-dns-pin-review.md';
+
+/**
+ * NORMALISE ONCE, THEN DESCRIBE WHAT YOU EMBED.
+ *
+ * The body of every block is emitted as `text.replace(/\s+$/, '')` — trailing whitespace is
+ * stripped so the closing fence sits on its own line. The header must therefore describe the
+ * STRIPPED bytes, not the file bytes. Hashing the unstripped text while embedding the stripped
+ * text makes the header a claim about a string that is nowhere in the packet, and every artifact
+ * whose file ends in a newline (i.e. essentially all of them) reports as a mismatch on re-read.
+ *
+ * That was a real defect: 11 of 11 blocks failed verification for one reason, and the line counts
+ * were off by one for any file ending in more than one newline. Strip FIRST; hash and count after.
+ */
+const normalise = (s) => s.replace(/\s+$/, '');
+
+function block(label, text, { lang = 'mjs', note } = {}) {
+  const body = normalise(text);
+  return [
+    `#### \`${label}\``, '',
+    `sha256 \`${sha256(body)}\` · ${lines(body)} lines`,
+    ...(note ? ['', note] : []), '',
+    '```' + lang, body, '```', '',
+  ].join('\n');
+}
+
+function fencedAbs(absPath, opts = {}) {
+  let text;
+  try {
+    text = redactOperatorPaths(fs.readFileSync(absPath, 'utf8'));
+  } catch (err) {
+    text = `(COULD NOT BE READ AT BUILD TIME: ${err.code} — ${absPath})\n\n`
+      + 'This is reported rather than omitted: the reviewer should know the evidence is absent.';
+  }
+  return block(opts.label || absPath, text, opts);
+}
+
+/** A file to inline, with its hash computed from the same bytes that get embedded. */
+function fenced(rel, opts = {}) {
+  return block(rel, redactOperatorPaths(read(rel)), opts);
+}
+
+// ── The artifacts under review ────────────────────────────────────────────────────────────────
+// Inlined IN FULL. A reviewer who must guess at the middle of a function is not reviewing it.
+
+const SOURCES = [
+  ['backend/services/addressClassification.mjs',
+    'D2/D4 fix. The classifier EXTRACTED from applaudAudioFetcher (ban #50) and inverted to an ALLOWLIST. C7/C8/C9 live here.'],
+  ['backend/services/spotlightImageUrlPolicy.mjs',
+    'D4 half one: brackets stripped before `net.isIP`. Also the pinned lookup/dispatcher factories. C1, C2, C3.'],
+  ['backend/services/spotlightImageFetch.mjs',
+    'D1 fix. `closeDispatcher` now wraps the whole fetch-and-body operation; `readImageBody` settles the body first. C4, C5.'],
+  ['backend/services/applaudAudioFetcher.mjs',
+    'The SHARED consumer. It now imports and re-exports the extracted classifier; its own suite is the regression gate. C9.'],
+];
+
+const TESTS = [
+  ['backend/tests/unit/spotlightImageTransportPin.test.mjs',
+    'NEW in round 9 — the D3 answer. Real sockets, two servers on one port, a name that cannot resolve. C1, C4, C6.'],
+  ['backend/tests/unit/spotlightImageDnsPin.test.mjs',
+    'The existing suite, with D3\'s honesty corrections applied (renamed case, https literal, disclosed Symbol reach). C2, C6.'],
+  ['backend/tests/unit/spotlightImageLifecycle.test.mjs',
+    'NEW in round 8 — the D1 ORDERING tests. Ordering is the only thing that catches D1. C4.'],
+  ['backend/tests/unit/spotlightImageAdmission.test.mjs',
+    'NEW in round 8 — the D2/D4 regression cases. C7, C9.'],
+  ['backend/tests/helpers/spotlightImageFixtures.mjs',
+    'The recording harness the D1 tests depend on. C4.'],
+];
+
+/** A git commit in full, generated at build time so it cannot drift from the repo. */
+function commitPatch(rev, note) {
+  let patch;
+  try {
+    // FULL patch, not --stat: C5 asks whether anything was REMOVED, and a stat cannot answer that.
+    patch = execFileSync('git', ['show', rev, '--format=commit %H%nparent %P%nauthor %an%ndate %ad%nsubject %s'], {
+      cwd: REPO, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
+    });
+    // A patch header can echo an absolute path; redact before it reaches the packet.
+    patch = redactOperatorPaths(patch);
+  } catch (err) {
+    // The repo's object store is damaged (88 objects missing). A commit that cannot be shown is
+    // reported as such rather than silently omitted — an absent artifact must be visible.
+    patch = `(this commit could not be read from the object store: ${(err.stderr || err.message).trim()})`;
+  }
+  return [`### ${note}`, '', '```diff', patch.replace(/\s+$/, ''), '```', ''].join('\n');
+}
+
+const BUILT = new Date().toISOString();
+
+// ── The packet ────────────────────────────────────────────────────────────────────────────────
+// The prose lives in `round9-packet-template.mjs` (split out for ban #50). This file reads and
+// hashes the artifacts; the template only arranges them, so a prose edit cannot change a hash.
+
+const packet = renderRound9Packet({
+  sources: SOURCES.map(([f, note]) => fenced(f, { note })).join('\n'),
+  tests: TESTS.map(([f, note]) => fenced(f, { note })).join('\n'),
+  commits: commitPatch('36aad8a8c', 'The integrity-doc correction (round 8 follow-up)')
+    + '\n' + commitPatch('6cca20594', 'The D3 closure — the new transport test'),
+  round8Review: fencedAbs(ROUND8_REVIEW, {
+    lang: 'markdown',
+    note: 'Inlined so you can check the fixes against the findings they claim to close. Addressed by absolute path because Rule 86 files reviews outside the repo, and inlined precisely so the path need not resolve for you.',
+    label: 'Z:/HostileReviews/2026-09-21-163103-social-bridge-round-8-astra-s-dns-pin-review.md',
+  }),
+  mutationRecord: fenced('docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/DNS-PIN-MUTATION-RECORD-2026-09-21.md', { lang: 'markdown' }),
+  builtUtc: BUILT,
+});
+
+if (CHECK) {
+  const existing = fs.readFileSync(OUT, 'utf8');
+  const claims = [...existing.matchAll(/^sha256 `([0-9a-f]{64})` · (\d+) lines$/gm)];
+  let bad = 0;
+  for (const [, hash] of claims) {
+    if (!existing.includes(hash)) { bad++; console.log(`MISSING hash ${hash}`); }
+  }
+  console.log(`${claims.length} inlined hashes, ${bad} not self-consistent`);
+  process.exit(bad ? 1 : 0);
+}
+
+fs.writeFileSync(OUT, packet);
+console.log(`wrote ${path.relative(REPO, OUT)}`);
+console.log(`  ${lines(packet)} lines · ${packet.length} bytes`);
+console.log(`  sha256 ${sha256(packet)}`);
diff --git a/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/round9-packet-template.mjs b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/round9-packet-template.mjs
new file mode 100644
index 000000000..0e6d52503
--- /dev/null
+++ b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/round9-packet-template.mjs
@@ -0,0 +1,219 @@
+/**
+ * round9-packet-template.mjs — the round-9 packet's prose and section layout.
+ *
+ * EXTRACTED FROM build-round9-packet.mjs to respect ban #50 (no source file reaches 300 lines).
+ * The split is by ROLE, not by line count: this module owns the WORDS and the section order; the
+ * builder owns READING FILES and HASHING them. A future round can reuse the prose with a different
+ * artifact set, and a change to the prose cannot accidentally change what gets hashed.
+ *
+ * Every artifact is interpolated as already-rendered markdown. This module performs NO file reads
+ * and computes NO hashes — if it did, an inlined block could disagree with its own stated sha256,
+ * which is the exact defect the builder exists to prevent.
+ */
+
+export function renderRound9Packet({ sources, tests, commits, round8Review, mutationRecord, builtUtc }) {
+  return `---
+---
+title: "Round 9 review packet — the D1-D4 fixes, with every artifact INLINED"
+purpose: >
+  Give a READ-ONLY, SHELL-LESS reviewer everything needed to adjudicate whether the four round-8
+  defects are actually closed, without resolving a single hash, path, or network reference.
+predecessor: Z:/HostileReviews/2026-09-21-163103-social-bridge-round-8-astra-s-dns-pin-review.md
+target_commit: 6cca20594
+repo: SS-PT
+branch: creator-brains-engine-r2-20260915
+built_utc: ${builtUtc}
+built_by: build-round9-packet.mjs
+---
+
+# Round 9 review packet — the D1-D4 fixes, INLINED
+
+## §0 — Read this first: what round 8 found, what changed, and what you are being asked
+
+Round 8 returned **\`DEFECTS-FOUND\`** — 0 critical / 1 high / 2 medium / 1 low, 4 unproven. Four
+defects, and its own words for the most important one are worth restating because they set the bar
+for this round:
+
+> *"A function whose header promises fail-closed while its IPv6 branch defaults to fail-open is worse
+> than one with no promise, because downstream authors trust the promise."*
+
+**All four are now claimed fixed. This packet exists so you can try to falsify that claim.**
+
+| # | Round-8 defect | Severity | The claimed fix |
+|---|---|---|---|
+| **D1** | response body cancelled *after* the dispatcher was awaited closed | HIGH | \`closeDispatcher\` moved into a \`finally\` wrapping the WHOLE fetch-and-body operation; a new \`readImageBody\` settles the body on every path first |
+| **D2** | \`isPrivateOrLocalAddress\` had a false fail-closed contract (denylist, \`return false // public IPv6\`) | MEDIUM | the IPv6 branch INVERTED to an allowlist: \`2000::/3\` must be *positively recognised* |
+| **D3** | the decisive named-host transport test did not exist | MEDIUM | a new file drives **real sockets** against two real servers and asserts **which address answered** |
+| **D4** | \`resolveAndValidate\` **admitted** \`https://[::ffff:0:127.0.0.1]/\` | HIGH | brackets stripped before \`net.isIP\` so a bracketed literal takes the literal branch |
+
+**Nothing below is cited by reference.** Every source, every test, the classifer, and the mutation
+records are embedded in full, each with its sha256 computed from the same bytes you are reading.
+Hash the fenced blocks yourself if you want to check that promise — they are the artifacts.
+
+**What you can and cannot do.** You are read-only and shell-less: you **cannot execute** anything.
+Do not attempt socket tests or mutation runs; their absence is expected and is accounted for in §5.
+What you *can* do is the part that mattered in round 8 — **read the bytes and adjudicate as text.**
+
+---
+
+## §1 — Remit
+
+Adversarial pass. Your job is to **falsify** the claims below, not to endorse them. For each claim
+return \`CONFIRMED\`, \`FALSIFIED\`, or \`BLOCKED / unproven\`, naming the line of source that supports
+your verdict. A \`CONFIRMED\` must name what you read.
+
+- **PART A — C1–C9: is each round-8 defect actually closed?** A fix is closed only if the *mechanism*
+  is gone, not if the symptom is quiet.
+- **PART B — the honesty audit.** Round 8 caught comments that overclaimed (C7/C8 falsified: a header
+  saying "no symbol-poking" while the code poked symbols). Re-check every comment that asserts what
+  the code does. **Comments are claims.**
+- **PART C — the new material.** Round 9 adds a transport test and two mutation records. Auditing
+  new tests is the higher-value half: a green suite whose green does not entail the property is the
+  R6-01 defect class, and it is the one this loop keeps finding.
+- **PART D — scope and verdict**, including whether any claim is *unfalsifiable as stated*.
+
+**Grade in both directions.** Do not inflate a residual into a vulnerability; do not deflate one you
+could not reach. If a claim's truth depends on a runtime fact you cannot measure, name the fact and
+mark it \`BLOCKED\`, not \`FALSIFIED\`.
+
+---
+
+## §2 — PART A: the claims
+
+| # | Claim | Decidable by reading? |
+|---|---|---|
+| **C1** | The socket connects to the address admission approved, for a DNS NAME, and this is now observed from the NETWORK side rather than by calling our own hook | mostly — the new test's assertions are textual; a live run is the residue |
+| **C2** | An IP LITERAL, **including a BRACKETED IPv6 one**, is stopped by admission and not merely by the resolver | **yes, fully** |
+| **C3** | The D1 ordering is now correct on EVERY path: the body is settled before the pool is closed | **yes, fully** |
+| **C4** | The D1 tests would go RED if the ordering regressed — i.e. they assert ORDER, not presence | reading + the mutation record |
+| **C5** | No existing security guard or test was removed to make these fixes land | **yes** — both patches are below, in full |
+| **C6** | The new transport test asserts on TRANSPORT, and would go RED if the pin were disconnected | reading + the mutation record |
+| **C7** | \`isPrivateOrLocalAddress\` now genuinely fails closed: unrecognised colon-bearing input is PRIVATE | **yes, fully** |
+| **C8** | The source's own comments do not overclaim (re-audit after round 8 falsified two) | **yes, fully** |
+| **C9** | The classifier's extraction into its own file changed no behaviour for the audio consumer | **yes** — both bodies are below |
+
+### C4 and C6 note, stated up front
+
+Both ask whether a suite would *notice* a change. That is the R6-01 class, and the honest answer has
+a runtime residue: a mutation record can be *fabricated* as easily as it can be written. You cannot
+re-run the mutations. What you *can* do is check that the recorded mutations are the ones that would
+matter, and that the assertions are written to catch them. **One of these mutations SURVIVED its
+first attempt — see §3.5 — and that is reported as a defect against the test, not hidden.** If the
+records had been tidied, you would have no way to tell.
+
+---
+
+## §3 — The artifacts, inlined
+
+### 3.1 The sources under review
+
+${sources}
+
+### 3.2 The tests
+
+${tests}
+
+### 3.3 The commits under review, in full
+
+${commits}
+
+### 3.4 The round-8 review being remediated
+
+${round8Review}
+
+### 3.5 The mutation records — the author's evidence for C4, C6 and C9
+
+The D1/D2/D4 mutation evidence lives in the repo's mutation record; the D3 evidence was produced in
+this session and is reproduced verbatim below. **Read the second one closely: it records a mutation
+that SURVIVED.** A record that only contained successes would be the thing to distrust.
+
+${mutationRecord}
+
+#### The D3 mutation record, reproduced verbatim from this session
+
+\`\`\`markdown
+D3 MUTATION RECORD — spotlightImageTransportPin.test.mjs
+========================================================
+Subject: the new transport test committed as 6cca20594.
+Method: mutate backend/services/spotlightImageUrlPolicy.mjs, run the suite, restore the source
+        and verify byte-identity (sha256 6ec126d3c5529032…, git diff HEAD = 0 lines).
+Every mutation below was REVERTED before the next one; each restoration was hash-checked.
+
+--- Mutation 1 — the pin is removed entirely -----------------------------------------------
+EDIT:  return new Agent({ connect: { lookup: createPinnedLookup(addrs) } });
+   ->  return new Agent();   // pin removed — does any test notice?
+
+RESULT: 2 of 4 RED in spotlightImageTransportPin.test.mjs
+        Caused by: Error: getaddrinfo ENOTFOUND pin-probe.invalid
+        plus 1 additional RED in spotlightImageDnsPin.test.mjs
+        test files 2 failed (2) | tests 3 failed | 15 passed (18)
+
+The first and third cases go RED because the NAME cannot resolve without the pin — which is the
+property under test. The SECOND case ("a default Agent is DISTINGUISHABLE") correctly STAYS GREEN:
+its job is to prove the two dispatchers differ, not to detect this mutation. A test that went RED
+there would be asserting the wrong thing.
+
+--- Mutation 2 — the pin set is order-rotated -------------------------------------------------
+EDIT:  createPinnedLookup(addrs)
+   ->  createPinnedLookup(addrs.slice(1).concat(addrs[0]))
+
+FIRST RUN: ALL THREE TESTS GREEN. THE MUTATION SURVIVED.
+
+That is a defect against the TEST, not against the source, and it is recorded rather than tidied
+away. Root cause: every case in the file pinned a SINGLE address, and with one element there is
+nothing to rotate — so the mutation was unreachable by construction, not by accident. The suite
+looked mutation-proof while being structurally blind to an entire defect class.
+
+FIX: a fourth case was added that pins TWO addresses (['127.0.0.2','127.0.0.1']) against two live
+servers on one port, asserting the FIRST pinned address is the one connected to.
+
+RE-RUN: 1 RED —
+        AssertionError: expected 'served-by:127.0.0.1' to be 'served-by:127.0.0.2'
+        test files 1 failed (1) | tests 1 failed | 3 passed (4)
+
+The hole is closed. Baseline with the four cases and no mutation: 4 passed (4).
+
+--- What this record does NOT claim -----------------------------------------------------------
+- It does not claim the new test is now mutation-proof. It claims one demonstrated hole was closed.
+- It does not claim mutation coverage of the SIBLING suites; only the two mutations above, and only
+  against spotlightImageTransportPin.test.mjs (plus the collateral RED in dnsPin for mutation 1).
+- The mutation surface is \`createPinnedDispatcher\` only. \`createPinnedLookup\` was not mutated
+  directly in this session; it is the callee the two mutations above reach through.
+\`\`\`
+
+---
+
+## §4 — Author-run measurements, labelled as such
+
+Everything in this section was run by the AUTHOR on this machine, and you should treat it as an
+unverified claim unless you can reproduce it — which, being shell-less, you cannot. It is reported
+so you can judge whether it *would* have been sufficient, and to make it obvious which claims rest
+on it.
+
+| Measurement | Result |
+|---|---|
+| \`vitest run\` transportPin + dnsPin + lifecycle + admission | **4 files, 52 tests passed** |
+| D3 mutation 1 — \`createPinnedDispatcher\` returns \`new Agent()\` (pin removed) | **2 of 4 RED** (\`getaddrinfo ENOTFOUND pin-probe.invalid\`) + 1 more RED in dnsPin |
+| D3 mutation 2 — pin set rotated \`addrs.slice(1).concat(addrs[0])\` | **FIRST RUN: ALL GREEN — THE MUTATION SURVIVED** (see §3.5); after adding a two-address case: **1 RED** |
+| D1 mutation — original ordering restored | **4 of 6 RED** |
+| Classifier, post-fix, four round-8 inputs | \`":"\`→true, \`"8.8.8.999"\`→true, \`"0:0:0:0:0:0:0:1"\`→true, \`"::ffff:7f00:1"\`→true |
+| \`bracketed\` literal \`https://[::ffff:0:127.0.0.1]/\` | now **REFUSED** (\`IMAGE_URL_NOT_ALLOWED\`) |
+| ban #50 (no source file ≥ 300 lines) | 201 / 280 / 227 / 293 / 164 / 286 / 111 / 147 / 182 — all under |
+| Source restored byte-identical after each mutation | \`6ec126d3c5529032…\`, \`git diff HEAD\` = 0 lines |
+
+---
+
+## §5 — What this packet cannot give you, and does not pretend to
+
+- **You cannot re-run the mutations**, so C4/C6/C9 rest partly on an author-supplied record. The
+  record is honest (it contains a failure) but it is still the author's.
+- **You cannot measure the socket layer.** Round 8 correctly refused to inflate D4 from an
+  admission-layer bypass to a socket-layer exploit. The same restraint applies to the fix: the new
+  test shows the *pin* routes a socket, not that any particular address is unreachable.
+- **The repo's object store is damaged.** 88 objects are missing, 18 links are broken, and 21
+  cache-tree pointers are invalid. Two commits below may fail to render in full for that reason;
+  where they do, it is stated rather than silently omitted.
+- **C1's runtime half retains a residue.** The new transport test observes a real socket, which is
+  stronger than round 8's position — but it observes it on THIS machine, with THIS Node and undici.
+`;
+}
diff --git a/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/verify-r9-packet.mjs b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/verify-r9-packet.mjs
new file mode 100644
index 000000000..c9bcf9141
--- /dev/null
+++ b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/verify-r9-packet.mjs
@@ -0,0 +1,78 @@
+import fs from 'node:fs';
+import path from 'node:path';
+import crypto from 'node:crypto';
+import { fileURLToPath } from 'node:url';
+
+/**
+ * verify-r9-packet.mjs — is every inlined artifact still the file it claims to be?
+ *
+ * WHAT IT CHECKS. Each `#### \`path\`` block in the packet carries a sha256 and a line count,
+ * computed at build time from the exact bytes embedded below it. This re-reads the file on disk
+ * and compares. A mismatch means the packet is describing bytes that are no longer on disk —
+ * which is worth knowing BEFORE a reviewer reads it and AFTER a fix lands.
+ *
+ * WHY IT ALSO REDACT-CHECKS (added when the packet became redacted). The builder rewrites the
+ * operator's absolute paths to `<REPO>` / `<HOME>` / `<OPERATOR>` before inlining, because
+ * `scripts/scan-secrets.sh` correctly flags `operator-identity` on an absolute path and its
+ * stated remedy is to rewrite the path rather than allowlist it. The consequence is that for any
+ * artifact containing such a path, the embedded bytes are deliberately NOT byte-identical to
+ * disk. Comparing raw hashes would report a permanent false mismatch.
+ *
+ * So a block may be verified in one of two ways, and the result says which:
+ *
+ *   EXACT     disk bytes ARE the embedded bytes
+ *   REDACTED  disk bytes, with the same redaction applied, are the embedded bytes
+ *
+ * A block that satisfies neither is a MISMATCH. This keeps the check meaningful: redaction is
+ * accepted only when applying the documented redaction actually reproduces the hash.
+ */
+const HERE = path.dirname(fileURLToPath(import.meta.url));
+// Walk up to the repo marker, exactly as the builder does.
+const REPO = (() => {
+  let d = HERE;
+  for (let i = 0; i < 8; i++) {
+    if (fs.existsSync(path.join(d, 'backend', 'package.json')) && fs.existsSync(path.join(d, '.git'))) return d;
+    d = path.resolve(d, '..');
+  }
+  throw new Error('repo root not found from ' + HERE);
+})();
+const PACKET = path.join(HERE, "R1-REVIEW-ROUND-9-PACKET.md");
+const text = fs.readFileSync(PACKET, 'utf8');
+const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
+
+// MUST stay identical to `redactOperatorPaths` in build-round9-packet.mjs. If the builder's
+// redaction changes and this does not, REDACTED blocks start reporting as MISMATCH — a loud
+// failure, which is the correct direction for this pair to drift.
+function redactOperatorPaths(t) {
+  return t
+    .replace(/C:\\Users\\[^\\\s"']+\\Desktop\\@Everything\\quick-pt\\SS-PT/g, '<REPO>')
+    .replace(/C:\\Users\\[^\\\s"']+(?=\\|$)/g, '<HOME>')
+    .replace(/C:\/Users\/[^/\s"']+\/Desktop\/@Everything\/quick-pt\/SS-PT/g, '<REPO>')
+    .replace(/(Users|home)[^A-Za-z0-9]+BigotSmasher/g, '<HOME>/<OPERATOR>');
+}
+
+const re = /^#### `([^`]+)`\n\nsha256 `([0-9a-f]{64})` · (\d+) lines[\s\S]*?\n```[a-z]*\n([\s\S]*?)\n```$/gm;
+let checked = 0, mismatch = 0, absent = 0, redacted = 0;
+for (const m of text.matchAll(re)) {
+  const [, rel, claimed, claimedLines, body] = m;
+  let disk = null;
+  for (const base of [REPO, 'Z:/HostileReviews']) {
+    const p = path.isAbsolute(rel) ? rel : path.join(base, rel);
+    if (fs.existsSync(p)) { disk = fs.readFileSync(p, 'utf8'); break; }
+  }
+  if (disk === null) { absent++; console.log('  ABSENT   ' + rel); continue; }
+  checked++;
+
+  // The builder embeds `text.replace(/\s+$/, '')`; mirror that before hashing.
+  const embed = (s) => s.replace(/\s+$/, '');
+  if (sha(embed(disk)) === claimed) continue;
+  if (sha(embed(redactOperatorPaths(disk))) === claimed) { redacted++; continue; }
+
+  mismatch++;
+  console.log('  MISMATCH ' + rel);
+}
+console.log('');
+console.log('repo root resolved: ' + REPO);
+console.log('verified against disk: ' + checked + ' | mismatched: ' + mismatch + ' | absent: ' + absent);
+if (redacted) console.log('  (' + redacted + ' verified only after applying the documented path redaction)');
+process.exit(mismatch ? 1 : 0);
```


### 3.4 The round-9 review being remediated

#### `Z:/HostileReviews/2026-09-21-212053-social-bridge-spotlight-round-9-astra-classifier.md`

sha256 `0aa62ff0b47aab3e9bac0e82660e9b7e3899a83378cf7afc70c54fd22bf6c785` · 172 lines

Filed under Rule 86. This is the review whose findings round 9 fixed and round 10 is adjudicating.

```markdown
---
review_id: 2026-09-21-212053-social-bridge-spotlight-round-9-astra-classifier
status: published
date_local: 2026-09-21T21:20:53-07:00
date_utc: 2026-09-22T04:20:53Z
subject: "Social Bridge Spotlight image path — round 9: the D1/D2/D4/D3 closures, and whether D2 was actually closed"
reviewer_agent: astra
reviewer_seat: ChatGPT subscription / codex-cli (gpt-6-astra, requested — served model NOT observable on codex-cli)
round: 9
repo: SS-PT
repo_path: "C:\\<HOME>/<OPERATOR>\\Desktop\\@Everything\\quick-pt\\SS-PT"
branch: creator-brains-engine-r2-20260915
commit: 67de00ee0edc7669f220cd651d47e16c76f89c7f
scope: "In: the inlined classifier, transport pin, lifecycle fixtures and mutation records, adjudicated at source level. Out: execution, hashes, target-commit identity and deployment behaviour — the reviewing session was read-only and shell-less, so every finding is [VERIFIED] by reading and none is a runtime reproduction."
verdict: DEFECTS-FOUND
defects: { critical: 0, high: 0, medium: 3, low: 2 }
unproven: 5
supersedes: null
superseded_by: 2026-09-22-094314-social-bridge-round-10-finding-5-reopened-and
tags: [social-bridge, spotlight-image, round-9, ssrf, ipv6, dns-pinning, classifier, astra]
filed_by: operator
filing_note: "The review itself reports that archive filing was BLOCKED by its own read-only, shell-less scope, and states in terms: 'this response is not a filed Rule 86 review.' Under SOUL.md Rule 86 a review nobody can find is not a review, so filing is the operator's job. The reviewer's text is reproduced unaltered below; a Disposition section has been ADDED by the operator at the end, recording what was done about each finding, and is labelled as not part of the review. Review commit noted above is the pre-fix HEAD; fixes landed in 67de00ee0 (finding 1) and 7a23939cf (findings 2, 3, 5)."
---

# Round 9 — Astra hostile review of the D1/D2/D4/D3 closures (SS-PT Spotlight image path)

**Review ID:** `2026-09-21-212053-social-bridge-spotlight-round-9-astra-classifier`
**Date (local):** 2026-09-21T21:20:53-07:00
**Date (UTC):** 2026-09-22T04:20:53Z
**Reviewer:** Astra (`gpt-6-astra`) via subscription transport (codex-cli)
**Round:** 9
**Verdict:** `DEFECTS-FOUND`
**Defects:** { critical: 0, high: 0, medium: 3, low: 2 }
**Unproven:** 5

**Repo:** `<REPO>` (`@Everything/quick-pt/SS-PT`)
**Branch:** `creator-brains-engine-r2-20260915`
**Commit under review:** `67de00ee0` (round-9 fixes applied post-review; see Disposition)

---

## Why this entry exists

Astra's own closing line:

> *"Archive filing remains **BLOCKED** by this read-only, shell-less review scope; this response is not a filed Rule 86 review."*

That is correct and it is the reason this file exists. The review was conducted against an inlined
packet and returned as text; it was never written under `Z:\HostileReviews\`. Under SOUL.md **Rule
86**, *a review nobody can find is not a review* — so filing it is the operator side's job, not the
reviewer's. This file is that filing. The reviewer's words below are reproduced unaltered.

**Packet:** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/R1-REVIEW-ROUND-9-PACKET.md`
**Transport:** subscription (ChatGPT), marginal cost $0 — no OpenRouter leg was used.

---

## Verdict summary

**DEFECTS-FOUND — REVISE.**

> D2 remains open: the classifier still accepts malformed IPv6 and a compressed representation of an
> address its own policy rejects. D1's original ordering is corrected, but its universal cleanup and
> test-sensitivity claims exceed the supplied evidence.

| Claim | Adjudication |
|---|---|
| C1 | CONFIRMED structurally; BLOCKED at runtime |
| C2 | CONFIRMED for the specified private literals |
| C3 | **FALSIFIED as universal** |
| C4 | CONFIRMED for the original relocation regression; incomplete for asynchronous settlement |
| C5 | BLOCKED (missing implementation diff) |
| C6 | CONFIRMED as test design; runtime record BLOCKED |
| C7 | **FALSIFIED** |
| C8 | **FALSIFIED** |
| C9 | **FALSIFIED as unchanged behaviour**; regression compatibility BLOCKED |

---

## Findings

### 1. MEDIUM — The new IPv6 allowlist still fails open

`backend/services/addressClassification.mjs:107–111` validates only the first colon-separated group.
At `:172–178`, either an extracted IPv4 or that first group can authorize the entire input.

| Input | Result entailed by source | Defect |
|---|---|---|
| `2606:not-an-ip` | Public | First group passes; remaining syntax is never validated. |
| `:8.8.8.8` | Public | The unrestricted dotted-tail extraction at `:71–74` bypasses IPv6 validation entirely. |
| `2002:7f00::1` | Public | The 6to4 regex at `:53` misses a compressed zero group, then the `2000::/3` check accepts it. |
| `2002:7f00:0::1` | Private | The same IPv6 address, with that zero group explicit, extracts `127.0.0.0` and is rejected. |

The last pair makes admission representation-dependent for a valid IPv6 literal.
`spotlightImageUrlPolicy.mjs:140–145` admits a literal when this classifier returns false.

**Fix:** Validate the complete address first, then classify parsed address bytes. Decode embedded
IPv4 from the actual prefix and bit positions, including compressed zeros; remove the arbitrary
dotted-suffix shortcut. **C7 is FALSIFIED; D2 is not closed.**

### 2. LOW — `readImageBody` does not settle the body on every error path

`spotlightImageFetch.mjs:185–201` acquires a reader and catches failures by returning an error; the
catch neither cancels nor retains access to the reader. Counterexample: a response whose real
`ReadableStream` enqueues `null` and remains open — `Buffer.from(value)` throws after a successful
read and the function returns without cancelling.

**Fix:** Keep the reader accessible to cleanup, track successful completion, and await cancellation
on exceptional exits before closing the dispatcher. **C3 is FALSIFIED as written.**

### 3. MEDIUM — The lifecycle tests record cancellation invocation, not completed settlement

`spotlightImageFixtures.mjs:143–146` records `body-settled` **before** invoking the original
cancellation (the reader wrapper does the same at `:162–165`). Removing `await` from cancellation in
`spotlightImageFetch.mjs:164`, `:174` or `:195` can preserve the recorded event order while allowing
closure before an asynchronous cancellation completes.

**Fix:** Give the underlying cancellation a deferred promise; assert closure has not started while it
is pending, resolve it, then assert closure follows. **C4 is CONFIRMED for relocation detection, but
incomplete for asynchronous settlement.**

### 4. MEDIUM — Closure evidence incomplete; transport mutation chronology contradicts the final file

The pin-removal record reports **2 of 4 RED**, but the supplied transport file contains **three**
pinned fetch cases (`spotlightImageTransportPin.test.mjs:92–97`, `:129–132`, `:152–159`). The "2 of
4" label does not establish a mutation run against the final four-test artifact.

**Fix:** Separate the three-test and four-test mutation runs, then rerun pin removal against the
final artifact. **C5 is BLOCKED. C9's blanket behavioural-equivalence claim is FALSIFIED; audio
compatibility remains unproven.**

### 5. LOW — Comments claiming properties their code does not establish

- `spotlightImageDnsPin.test.mjs:18–20` promises a decisive real-server pinned-vs-unpinned
  demonstration **in that file**, while its own text at `:130–135` expressly disclaims one.
- `spotlightImageFixtures.mjs:7–10` claims DNS is the only stub, but `:44` returns a plain
  response-shaped object and `:172` supplies a fake fetch implementation.
- `applaudAudioFetcher.mjs:107–111` says its DNS check defeats rebinding, but `:172–176` then
  fetches without passing the approved addresses or a pinned dispatcher.
- `spotlightImageTransportPin.test.mjs:145–146` asserts the test exercises `{ all: false }` but
  never observes the lookup options.

**C8 is FALSIFIED.**

---

## Disposition — what the operator did about each finding

Recorded here rather than in the reviewer's text, because the reviewer had only the pre-fix packet.

| Finding | Status | Evidence |
|---|---|---|
| 1 — classifier fails open | **CLOSED** | Commit `67de00ee0`. `2606:not-an-ip`, `:8.8.8.8`, `2002:7f00::1` all now private; the `2002:7f00::1` / `2002:7f00:0::1` pair agrees. Structural fix: `isValidIPv6` + `expandIPv6` extracted to `ipv6LiteralSyntax.mjs`; embedded IPv4 decoded by bit position from the expanded form. Four measured cases plus compressed/expanded equivalents pinned as regression tests. Six mutations, all detected, zero survivors. |
| 2 — error path does not release | **CLOSED, AND DEEPER THAN REPORTED** | Commit `7a23939cf`. The first fix called `response.body.cancel(...)`, which **never worked**: the body is locked by the reader, so it throws `Invalid state: ReadableStream is locked` and the empty catch swallowed it. Corrected to `reader.cancel()`. Reverting it fails exactly one test with `body-cancel-locked`. |
| 3 — invocation vs settlement | **CLOSED** | Same commit. Both cancel hooks now record after the await. This is what exposed finding 2's ineffective fix, which the finding-2 test alone did not catch. |
| 4 — mutation chronology | **PARTIALLY CLOSED** | The three-test/four-test split is real and is now recorded separately. The scoped implementation diff and the audio regression results are supplied here for the first time: 1077 tests green across 27 suites. |
| 5 — four overclaims | **CLOSED** | Same commit. All four comments corrected; the audio rebinding claim is retracted and the unresolved second-resolution boundary disclosed. |
| C9 restatement | **ADOPTED** | Restated as the reviewer asked: the extraction preserves import compatibility; the enumerated classification changes are intentional. |

**Note on finding 2's severity.** The reviewer graded it LOW on the basis that an equivalent failure
"reachable through an ordinary native network response is not established." That restraint was
correct at the time, and the correction does not depend on resolving it: the release was attempted
with a call that could not succeed on any path where the reader held the lock. The fix stands
regardless of how the stream came to error.

**Ban #50.** The comment required by finding 2 pushed `spotlightImageFetch.mjs` to exactly 300
lines. The decode concern was extracted to `spotlightImageDecode.mjs` (99 lines) with re-exports, so
no importer changed.

---

*Filed by the operator. The reviewer's text above is reproduced unaltered; the Disposition table is
the operator's record and was not part of the review.*
```


### 3.5 The mutation records — the author's evidence for C5

#### The six round-9 mutations, reproduced verbatim from the author's session record

sha256 is not given for this block: it is authored prose, not an artifact read from disk. It is
labelled as such deliberately — a record that looks like evidence but is not is worse than one
that says what it is.

```markdown

ROUND 9 MUTATION RECORD — the classifier and the stream release
==============================================================
Method: apply exactly one edit, run the affected suites, capture the failure, restore the source
        from a SHA-verified pristine snapshot, re-run, and confirm the failure is gone.
Every mutation below was REVERTED before the next one. Three of the six initially SURVIVED.

--- Mutation M1 — delete the syntax gate in isPubliclyRoutableIPv6 ---------------------------------
EDIT:  if (!isValidIPv6(addr)) return false;   ->   (removed entirely)

FIRST RUN: THE MUTATION SURVIVED. All suites green.
Root cause: the syntax check was REDUNDANT on the classifier's own path — the classifier already
rejected those inputs, so removing the gate changed nothing observable. This was a defect against
the TESTS, not the source: nothing tested `isValidIPv6` directly.
FIX: backend/tests/unit/ipv6LiteralSyntax.test.mjs was created (31 tests) to test the primitives.
RE-RUN: 4 RED.

--- Mutation M2 — the dotted-quad fill count ignores the dotted tail ------------------------------
EDIT:  head = dottedTail[1];   ->   head = dottedTail[1].replace(/:$/, '');   (REVERSED)

FIRST RUN: SURVIVED — no suite could see it, because every fixture used a dotted tail whose head
had no separator colon. The greedy `(.*:)` captures that colon, so removal shifts the fill count.
FIX: cases added for `::ffff:127.0.0.1` and `1:2:3:4:5:6:1.2.3.4` (Node accepts both).
RE-RUN: 5 RED.

--- Mutation M3 — classify without validating ----------------------------------------------------
EDIT:  validate-then-classify   ->   classify directly

RESULT: 9 RED. Detected on the first run.

--- Mutation M4 — decode embedded IPv4 by STRING SHAPE instead of bit position --------------------
EDIT:  the expanded-form bit-position decode   ->   a regex over the textual form

FIRST RUN: detected only after a CRLF normalisation bug in the harness was fixed; before that the
mutation was reported as "anchor not found", which is NOT the same as "survived" and was corrected.
RE-RUN: 6 RED.

--- Mutation M5 — reverse the reader release -----------------------------------------------------
EDIT:  await reader?.cancel('stream read failed')   ->   (the call removed)

RESULT: 2 RED. Detected on the first run.

--- Mutation M6 — drop the 2000::/3 allowlist ----------------------------------------------------
EDIT:  the positive global-unicast recognition   ->   (falls through to the private default)

FIRST RUN: THE MUTATION SURVIVED. `4000::1`, `8000::1` and `e000::1` classified PUBLIC with the
whole suite GREEN. This was the most serious of the three survivors: the allowlist is the entire
mechanism C1 claims, and nothing tested an address OUTSIDE 2000::/3 but still valid.
FIX: an allowlist block was added asserting those three classify PRIVATE.
RE-RUN: 13 RED.

--- Baseline -------------------------------------------------------------------------------------
No mutation applied: 6 suites, 126 tests, all passing.

--- What this record does NOT claim ---------------------------------------------------------------
- It does not claim the suite is now mutation-proof. It claims three demonstrated holes were closed.
- It does not claim coverage of the OTHER five suites; the mutations target the classifier and the
  stream release only.
- The mutation surface is the classifier, the syntax primitives, and the reader release. No mutation
  was applied to the pin/dispatcher factories in this round.
- Two earlier harness defects are recorded because they nearly produced FALSE claims: a "SURVIVED"
  verdict inferred from a missing summary line (conflating a crash with survival), and ANSI colour
  codes making every summary unparseable. Both were found by instrumenting the harness.
```


### 3.6 The assertion that makes C3 real

Quoted here so the claim can be checked without hunting through the inlined file. The test that
goes RED when the release is reverted:

```js
expect(timeline).not.toContain('body-cancel-locked');
```

The harness records `body-cancel-locked` **only** when the cancel call is REFUSED. Three distinct
events are possible, and the distinction is the whole point:

| Event | Meaning |
|---|---|
| `body-settled` | cancel completed ordinarily |
| `body-settled-after-error` | the stream had already failed; cancel still ran to completion |
| `body-cancel-locked` | **the cancel was refused — a real leak** |

An earlier version recorded settlement BEFORE the await, which could not tell these apart. That is
why C4 is a separate claim from C3: the fix and the instrument that detects the fix failed for
different reasons.

---

## §4 — Author-run measurements, labelled as such

Everything in this section was run by the AUTHOR on this machine. Treat it as claims, not evidence:
you cannot reproduce any of it.

| Measurement | Result |
|---|---|
| `vitest run` — the six round-9 suites | **6 files, 126 tests, all passing** |
| C3 mutation — revert `reader.cancel` to `body.cancel` | **1 RED** — `AssertionError: expected [...] to not include 'body-cancel-locked'` (1 failed \| 6 passed) |
| Packet self-verification (`verify-r9-packet.mjs`) | **11 verified, 0 mismatched, 0 absent** — of which 1 verifies only under the documented path redaction |
| ban #50 (no source file >= 300 lines) | 138 / 199 / 99 / 237 / 296 / 286 / 189 / 135 / 146 / 171 / 147 / 265 — all under |

**A correction carried into this round.** The round-9 packet's per-block `sha256` headers were
computed on the UNSTRIPPED file text while the fenced body was embedded STRIPPED, so every header
described a byte-string that appears nowhere in the packet and `verify-r9-packet.mjs` reported 11
of 11 as MISMATCH. The content was always correct — the headers were not. Fixed by normalising once
and hashing what is embedded; proven by reverting only the header, which reproduces the failure.
**This is stated here because it is the same defect class as §0**: a claim about the artifact that
the artifact did not support.

---

## §5 — What this packet cannot give you, and does not pretend to

- **You cannot re-run the mutations**, so C5 rests on an author-supplied record. The record is
  honest (it contains three failures) but it is still the author's.
- **You cannot measure the socket or stream layer.** C3's evidence is a recorded timeline, not a
  live read. The assertion is quoted in §3.6 precisely so you can judge it as text.
- **You cannot verify the hashes are of the bytes you are reading** — a packet cannot prove its own
  integrity to a shell-less reader. What you *can* do is note the sha256 above each block and check
  the bodies are self-consistent with their descriptions.
- **The repo's object store is damaged and history has moved under this work.** Two earlier fix
  commits (`67de00ee0`, `7a23939cf`) and their parent (`6cca20594`) are ABSENT from the store.
  The fixes were re-landed as the commit below; the original commits cannot be shown, and their
  absence is stated here rather than papered over. See §3.3.
- **C1's structural claim is decidable by reading; its runtime consequence is not.** The claim is
  that representation cannot reach the answer. That is a property of the code's shape, which you
  can check. It is not a claim that no address is misclassified in production.
