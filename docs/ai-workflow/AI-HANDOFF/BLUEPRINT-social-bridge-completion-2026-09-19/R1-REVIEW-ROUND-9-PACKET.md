---
---
title: "Round 9 review packet — the D1-D4 fixes, with every artifact INLINED"
purpose: >
  Give a READ-ONLY, SHELL-LESS reviewer everything needed to adjudicate whether the four round-8
  defects are actually closed, without resolving a single hash, path, or network reference.
predecessor: Z:/HostileReviews/2026-09-21-163103-social-bridge-round-8-astra-s-dns-pin-review.md
target_commit: 6cca20594
repo: SS-PT
branch: creator-brains-engine-r2-20260915
built_utc: 2026-09-22T04:26:28.147Z
built_by: build-round9-packet.mjs
---

# Round 9 review packet — the D1-D4 fixes, INLINED

## §0 — Read this first: what round 8 found, what changed, and what you are being asked

Round 8 returned **`DEFECTS-FOUND`** — 0 critical / 1 high / 2 medium / 1 low, 4 unproven. Four
defects, and its own words for the most important one are worth restating because they set the bar
for this round:

> *"A function whose header promises fail-closed while its IPv6 branch defaults to fail-open is worse
> than one with no promise, because downstream authors trust the promise."*

**All four are now claimed fixed. This packet exists so you can try to falsify that claim.**

| # | Round-8 defect | Severity | The claimed fix |
|---|---|---|---|
| **D1** | response body cancelled *after* the dispatcher was awaited closed | HIGH | `closeDispatcher` moved into a `finally` wrapping the WHOLE fetch-and-body operation; a new `readImageBody` settles the body on every path first |
| **D2** | `isPrivateOrLocalAddress` had a false fail-closed contract (denylist, `return false // public IPv6`) | MEDIUM | the IPv6 branch INVERTED to an allowlist: `2000::/3` must be *positively recognised* |
| **D3** | the decisive named-host transport test did not exist | MEDIUM | a new file drives **real sockets** against two real servers and asserts **which address answered** |
| **D4** | `resolveAndValidate` **admitted** `https://[::ffff:0:127.0.0.1]/` | HIGH | brackets stripped before `net.isIP` so a bracketed literal takes the literal branch |

**Nothing below is cited by reference.** Every source, every test, the classifer, and the mutation
records are embedded in full, each with its sha256 computed from the same bytes you are reading.
Hash the fenced blocks yourself if you want to check that promise — they are the artifacts.

**What you can and cannot do.** You are read-only and shell-less: you **cannot execute** anything.
Do not attempt socket tests or mutation runs; their absence is expected and is accounted for in §5.
What you *can* do is the part that mattered in round 8 — **read the bytes and adjudicate as text.**

---

## §1 — Remit

Adversarial pass. Your job is to **falsify** the claims below, not to endorse them. For each claim
return `CONFIRMED`, `FALSIFIED`, or `BLOCKED / unproven`, naming the line of source that supports
your verdict. A `CONFIRMED` must name what you read.

- **PART A — C1–C9: is each round-8 defect actually closed?** A fix is closed only if the *mechanism*
  is gone, not if the symptom is quiet.
- **PART B — the honesty audit.** Round 8 caught comments that overclaimed (C7/C8 falsified: a header
  saying "no symbol-poking" while the code poked symbols). Re-check every comment that asserts what
  the code does. **Comments are claims.**
- **PART C — the new material.** Round 9 adds a transport test and two mutation records. Auditing
  new tests is the higher-value half: a green suite whose green does not entail the property is the
  R6-01 defect class, and it is the one this loop keeps finding.
- **PART D — scope and verdict**, including whether any claim is *unfalsifiable as stated*.

**Grade in both directions.** Do not inflate a residual into a vulnerability; do not deflate one you
could not reach. If a claim's truth depends on a runtime fact you cannot measure, name the fact and
mark it `BLOCKED`, not `FALSIFIED`.

---

## §2 — PART A: the claims

| # | Claim | Decidable by reading? |
|---|---|---|
| **C1** | The socket connects to the address admission approved, for a DNS NAME, and this is now observed from the NETWORK side rather than by calling our own hook | mostly — the new test's assertions are textual; a live run is the residue |
| **C2** | An IP LITERAL, **including a BRACKETED IPv6 one**, is stopped by admission and not merely by the resolver | **yes, fully** |
| **C3** | The D1 ordering is now correct on EVERY path: the body is settled before the pool is closed | **yes, fully** |
| **C4** | The D1 tests would go RED if the ordering regressed — i.e. they assert ORDER, not presence | reading + the mutation record |
| **C5** | No existing security guard or test was removed to make these fixes land | **yes** — both patches are below, in full |
| **C6** | The new transport test asserts on TRANSPORT, and would go RED if the pin were disconnected | reading + the mutation record |
| **C7** | `isPrivateOrLocalAddress` now genuinely fails closed: unrecognised colon-bearing input is PRIVATE | **yes, fully** |
| **C8** | The source's own comments do not overclaim (re-audit after round 8 falsified two) | **yes, fully** |
| **C9** | The classifier's extraction into its own file changed no behaviour for the audio consumer | **yes** — both bodies are below |

### C4 and C6 note, stated up front

Both ask whether a suite would *notice* a change. That is the R6-01 class, and the honest answer has
a runtime residue: a mutation record can be *fabricated* as easily as it can be written. You cannot
re-run the mutations. What you *can* do is check that the recorded mutations are the ones that would
matter, and that the assertions are written to catch them. **One of these mutations SURVIVED its
first attempt — see §3.5 — and that is reported as a defect against the test, not hidden.** If the
records had been tidied, you would have no way to tell.

---

## §3 — The artifacts, inlined

### 3.1 The sources under review

#### `backend/services/addressClassification.mjs`

sha256 `5596560edeaaa91d8253bf81b7a123c87a540d1fd15b04329f76acf1b0e9dec8` · 198 lines

D2/D4 fix. The classifier EXTRACTED from applaudAudioFetcher (ban #50) and inverted to an ALLOWLIST. C7/C8/C9 live here.

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

#### `backend/services/spotlightImageUrlPolicy.mjs`

sha256 `9eeb2470c863d96b2ddfecf63ce462a40d8dcde5204ac859b2c6634ef134353e` · 241 lines

D4 half one: brackets stripped before `net.isIP`. Also the pinned lookup/dispatcher factories. C1, C2, C3.

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

#### `backend/services/spotlightImageFetch.mjs`

sha256 `4937b63cb7a4bd3f243bc9b64ebe958805dd0c4b3bf5da96cc024a2a7c371086` · 236 lines

D1 fix. `closeDispatcher` now wraps the whole fetch-and-body operation; `readImageBody` settles the body first. C4, C5.

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

The SHARED consumer. It now imports and re-exports the extracted classifier; its own suite is the regression gate. C9.

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


### 3.2 The tests

#### `backend/tests/unit/spotlightImageTransportPin.test.mjs`

sha256 `b82be7691cae0e2d18582d62026dc24c06606afff0c589811a39468a4dc9a51e` · 170 lines

NEW in round 9 — the D3 answer. Real sockets, two servers on one port, a name that cannot resolve. C1, C4, C6.

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
import { createPinnedDispatcher } from '../../services/spotlightImageUrlPolicy.mjs';

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
    // This is `net`'s single-address form: `connect.lookup` is called WITHOUT `all`, and our
    // `createPinnedLookup` answers with `pinned[0]`. So what this case pins down is OUR
    // contract — the validated ORDER is preserved, and the first validated address is the one
    // a socket takes. It is not a claim about a `net` preference: `net` simply uses the single
    // value it is handed. That distinction is the point, because the mutation this case exists
    // to catch is a rotation inside `createPinnedLookup` — which is exactly our code, and which
    // every single-address case above is blind to (with one element there is nothing to rotate,
    // so the hole was structural, not accidental).
    //
    // A pin that silently reordered its set would connect somewhere the check DID approve but
    // the caller did not prefer, and would still look correct in every single-address test.
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
```

#### `backend/tests/unit/spotlightImageDnsPin.test.mjs`

sha256 `e6dfd8139de4d70ff1c258fbb41430b5c4262105e5a01326192bf8a48ed38fd4` · 284 lines

The existing suite, with D3's honesty corrections applied (renamed case, https literal, disclosed Symbol reach). C2, C6.

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

#### `backend/tests/unit/spotlightImageLifecycle.test.mjs`

sha256 `4a538399e99e0e2b31e43ffb79e36eafe5d2b0bbb204eb62e9946ec4ee070b42` · 145 lines

NEW in round 8 — the D1 ORDERING tests. Ordering is the only thing that catches D1. C4.

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

#### `backend/tests/unit/spotlightImageAdmission.test.mjs`

sha256 `278c547cc32f5375e67343abfe979735bab98de26b4114d39daa449b584ad215` · 146 lines

NEW in round 8 — the D2/D4 regression cases. C7, C9.

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

#### `backend/tests/helpers/spotlightImageFixtures.mjs`

sha256 `2172ef02c443df6531588f8f9f630dc9128bd5a1ab981c4e29ed9bec4a36f64f` · 264 lines

The recording harness the D1 tests depend on. C4.

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


### 3.3 The commits under review, in full

### The integrity-doc correction (round 8 follow-up)

```diff
commit 36aad8a8c2be36c53a53bb476fdd1a6648b45829
parent 81d799b746346c2fe7363c58675eb0efb4e5c2d5
author SeanSwan
date Mon Sep 21 20:22:10 2026 -0700
subject docs(integrity): correct REPO-INTEGRITY-FINDING for the new HEAD; record that repair was not needed

diff --git a/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/REPO-INTEGRITY-FINDING-2026-09-21.md b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/REPO-INTEGRITY-FINDING-2026-09-21.md
index bebc7f306..24903930c 100644
--- a/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/REPO-INTEGRITY-FINDING-2026-09-21.md
+++ b/docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/REPO-INTEGRITY-FINDING-2026-09-21.md
@@ -1,10 +1,61 @@
 # REPO-INTEGRITY FINDING — a severed parent, and what it means for committing
 
 **Date:** 2026-09-21
-**Repo:** `<REPO>`
-**Branch:** `creator-brains-engine-r2-20260915` (at `99b970bd40748758d5f943ee254a43730767bc7b`)
-**Discovered during:** the round-8 fix commit
-**Status:** RECORDED — not repaired. Repairing history is out of scope for this session and is not mine to do.
+**Repo:** `<REPO>` (`@Everything/quick-pt/SS-PT` on the operator workstation)
+**Branch:** `creator-brains-engine-r2-20260915`
+**Discovered during:** the round-8 fix commit, at `99b970bd40748758d5f943ee254a43730767bc7b`
+**Status:** SUPERSEDED IN PART — see §0. The commit block cleared itself; the store damage did not.
+
+---
+
+## 0. UPDATE — the blocker cleared itself; the damage did not (same day, ~19:00 → 20:05)
+
+Everything in §1 was measured at HEAD `99b970bd4`. **That is no longer HEAD.** While this finding was
+being written, another session committed to the same branch. Re-measured at HEAD `6407f6b40`:
+
+| Check | At `99b970bd4` (the finding) | At `6407f6b40` (now) |
+|---|---|---|
+| `git ls-tree HEAD backend docs packages` | `fatal: unable to read tree` ×3 | **resolves**: `2f7f43dc…`, `2dccfb48…`, `a94ff816…` |
+| `git commit` | blocked (`unable to read tree entries HEAD`) | **works** |
+| `git fsck --connectivity-only` — missing | 259 | **88** |
+| `git fsck` — broken links | 44 | **18** |
+| `git fsck` — invalid cache-tree pointers | 21 | **21** (unchanged) |
+
+**The three missing top-level subtrees of §1 are no longer the ones HEAD references.** The hashes in
+that table (`backend = 07da0d29…`, `docs = 251d234a…`, `packages = 0e45a19e…`) describe the *old*
+HEAD and must not be used to reason about the current one. **No `git mktree` repair was performed** —
+the rebuild that was prepared (`C:/tmp/mk2.py`, 1,393 directories) was never run, because it became
+unnecessary. The commit went through on the other session's work instead.
+
+What this does and does not change:
+
+- **It does not repair the store.** 88 objects are still missing and 21 cache-tree pointers are still
+  invalid. The commit block was a *symptom*; one symptom has cleared.
+- **`3bc947da5` is still gone**, and `git log -- <path>` still fails on the old tree, so history before
+  the new commits remains untraversable by path.
+- **The §3 warnings stand**, in particular: do not repack, and never use `git checkout -- <path>` here.
+
+### My round-8 work is committed — verified, not assumed
+
+The same session's commits carried the round-8 fixes in. Verified at HEAD `6407f6b40`:
+
+```
+$ git diff HEAD -- <all 9 round-8 paths>     # → 0 lines
+$ npx vitest run backend/tests/unit/spotlightImageLifecycle.test.mjs \
+                 backend/tests/unit/spotlightImageAdmission.test.mjs \
+                 backend/tests/unit/spotlightImageDnsPin.test.mjs
+ ✓ 3 files, 48 tests passed
+```
+
+`addressClassification.mjs` (201), `applaudAudioFetcher.mjs` (280), `spotlightImageFetch.mjs` (293),
+`spotlightImageUrlPolicy.mjs` (227) — all committed and all under ban #50.
+
+**One honest note on how this was nearly mis-reported.** `git status` showed the four source files as
+*clean* while `sha256sum` of the worktree and `git show HEAD:<path>` appeared to **differ**
+(`dd0d4cda…` vs `ee769f13…` for `spotlightImageFetch.mjs`). The apparent mismatch was a line-ending
+artefact of piping `git show` through the shell; `git diff HEAD` — which applies the same filters git
+uses — reported **zero** differences. **For "is this committed?", trust `git diff HEAD`, not a hash of
+`git show` output.**
 
 ---
 
@@ -56,6 +107,74 @@ error: Could not read 3bc947da508852ae07c87c02bf79abc12bd96269
 fatal: Failed to traverse parents of commit 99b970bd40748758d5f943ee254a43730767bc7b
 ```
 
+### Worse than one missing commit: three missing SUBTREES of HEAD
+
+> **HISTORICAL — describes HEAD `99b970bd4`, not the current HEAD.** See §0. These three trees were
+> replaced by the other session's commits; the current HEAD references `2f7f43dc…`, `2dccfb48…`,
+> `a94ff816…`. Kept as the record of what was actually observed.
+
+The commit is not merely missing a parent. **HEAD's own tree is incomplete.** Three of its
+top-level subtrees are absent from the object store:
+
+| Top-level tree | Object | State |
+|---|---|---|
+| `backend/` | `07da0d29…` | **MISSING** |
+| `docs/` | `251d234a…` | **MISSING** |
+| `packages/` | `0e45a19e…` | **MISSING** |
+| all 19 others | — | present |
+
+Measured by walking HEAD's top level and typing each subtree:
+
+```
+$ git ls-tree HEAD | while read mode type sha name; do
+    [ "$type" = tree ] && { printf "%-46s " "$name"; git cat-file -t "$sha" 2>/dev/null || echo "$sha MISSING"; }
+  done
+backend        07da0d29fa1f49a9567b3ff74f483c1dd9fe5f20 MISSING
+docs           251d234a5506b6d6df7ebeb5cae973b8adcee6fd MISSING
+packages       0e45a19e66f26716ec3c17ae9e6000330b21e4b8 MISSING
+```
+
+**This blocks committing outright.** `git commit` must read the parent commit's tree to
+construct the new commit, so it fails with:
+
+```
+error: Could not read 2d9ee7190e471a8669c4d8e9cbaff358c620e659
+fatal: unable to read tree entries HEAD
+```
+
+and `git reset --mixed` fails the same way:
+
+```
+fatal: unable to read tree (07da0d29fa1f49a9567b3ff74f483c1dd9fe5f20)
+```
+
+### The repair path (and its limit)
+
+A missing tree is **recoverable when the blobs beneath it still exist**, because a git tree is a
+deterministic function of its sorted entries — writing it back yields the same hash. So the three
+subtrees can be rebuilt from the index with `git mktree`, bottom-up.
+
+What was done, in order:
+
+1. **113 of 125 missing blobs regenerated** from their on-disk files, after verifying that
+   `git hash-object <path>` reproduced the recorded hash *exactly* for each. (A blob rewritten
+   from a file whose content matches is the same object, not a guess.)
+2. The remaining **12** are recorded, not papered over:
+   - **9 absent from disk** — `scripts/creator-brains/console/{lib,test,web}/…`, a peer workstream's
+     uncommitted-then-deleted files. **Not mine; not recoverable from this checkout.**
+   - **3 content-changed** — `packages/creator-brains-console/api.mjs`,
+     `…/LocalEngineAdapter.ts`, `…/03b-contracts-proposed-artifacts.md`. Their disk content differs
+     from the index, because another session edited them. The index entries were refreshed, which
+     is correct for the index but means those three trees will not reproduce their old hashes.
+3. Index repaired enough that **`git write-tree` succeeds** (`5a188e81f5baa73a018a0e1b6c66470252f4bbb8`).
+
+The limit, stated plainly: rebuilding a subtree gives a tree that is **equivalent but is not
+guaranteed to be bit-identical** to the lost one, for any directory containing one of those 12
+unrecoverable entries. A git tree hash covers all descendants, so one stale descendant changes the
+whole subtree hash. The rebuilt `backend/` and `docs/` are likely exact (their entries were all
+recoverable); `packages/` cannot be. **This is why the repair is recorded and not presented as a
+restoration of history.**
+
 ### Which of my commits survived
 
 | Commit | Subject | State |
```

### The D3 closure — the new transport test

```diff
commit 6cca20594fd96ca4bfc2874318deca36afa529af
parent 36aad8a8c2be36c53a53bb476fdd1a6648b45829
author SeanSwan
date Mon Sep 21 20:30:13 2026 -0700
subject test(spotlight): close D3 with a real net-driven transport test; prove it load-bearing by mutation

diff --git a/backend/tests/unit/spotlightImageTransportPin.test.mjs b/backend/tests/unit/spotlightImageTransportPin.test.mjs
new file mode 100644
index 000000000..e41f8b88a
--- /dev/null
+++ b/backend/tests/unit/spotlightImageTransportPin.test.mjs
@@ -0,0 +1,164 @@
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
+    // This is `net`'s single-address form (`{ all: false }`), which gets `pinned[0]`. The pin's
+    // contract is that the validated ORDER is preserved, so the first validated address is the one
+    // a socket takes. A pin that silently reorders its set would connect somewhere the check did
+    // approve but did not prefer — and would still look correct in every single-address test.
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
```


### 3.4 The round-8 review being remediated

#### `Z:/HostileReviews/2026-09-21-163103-social-bridge-round-8-astra-s-dns-pin-review.md`

sha256 `cd237d0e6883e3518928b576f3632117892f3f2344dbba6522aebbe60b62e1e6` · 133 lines

Inlined so you can check the fixes against the findings they claim to close. Addressed by absolute path because Rule 86 files reviews outside the repo, and inlined precisely so the path need not resolve for you.

```markdown
---
review_id: 2026-09-21-163103-social-bridge-round-8-astra-s-dns-pin-review
status: published
date_local: 2026-09-21T16:31:03-07:00
date_utc: 2026-09-21T23:31:03Z
subject: "Social Bridge round 8: Astra's DNS-pin review returns REVISE -- three source-level defects and four overstated claims"
reviewer_agent: astra
reviewer_seat: "codex exec / gpt-6-astra (xhigh reasoning)"
round: 8
repo: SS-PT
repo_path: "<REPO>"
branch: creator-brains-engine-r2-20260915
commit: 99b970bd4
scope: "In: backend/services/spotlightImageUrlPolicy.mjs, backend/services/spotlightImageFetch.mjs, backend/tests/unit/spotlightImageDnsPin.test.mjs, the inlined round-8 packet. Out: runtime measurement (read-only sandbox), the audio consumer's own tests."
verdict: DEFECTS-FOUND
defects: { critical: 0, high: 1, medium: 2, low: 1 }
unproven: 4
supersedes: null
superseded_by: null
tags: [dns-rebinding, ssrf, undici, toctou, spotlight, social-bridge, astra, round-8]
---

# HOSTILE REVIEW — Social Bridge round 8: Astra's DNS-pin review returns REVISE -- three source-level defects and four overstated claims

**Reviewer:** astra (codex exec / gpt-6-astra (xhigh reasoning)), 2026-09-21T16:31:03-07:00
**Method:** `codex exec --json --ephemeral --sandbox read-only -c model_reasoning_effort=xhigh --model gpt-6-astra -`, packet piped on stdin (99,804 bytes / 2,028 lines, sha256 `5cbb16d5133eaec6345484ce53f70acf3fa027f4e5524eef495bd445c6b229a3`). Exit 0, 331 s, 11,969 bytes out. **Every artifact was inlined**, so unlike round 7 the reviewer could grade claims against cited `file:line` evidence. Reviewer performed no commands, network, tests, mutations, or hash verification — source reading only. Classifier claims (D2) were then **independently re-measured live** by sable; see §1.
**Evidence:** `C:/tmp/astra-r8.jsonl` (raw). Sable's re-measurement probes: `C:/tmp/classifier-probe.mjs`, `C:/tmp/reach-probe.mjs`, `C:/tmp/trace-probe.mjs`, `C:/tmp/admission-probe.mjs`, `C:/tmp/gap-probe.mjs`, `C:/tmp/socket-probe.mjs`.
**Verdict:** DEFECTS-FOUND — 0 critical / 1 high / 2 medium / 1 low, 4 unproven

---

## 0. Verdict in one paragraph

The pin **is** wired into the transport — that much is now CONFIRMED at the source level, which round 7 could not establish. What round 8 found is that three of the claims *around* the pin overstate what the supplied tests actually cover, and that the classifier the whole admission path depends on has a false fail-closed contract. The single most important item is **D4**: `resolveAndValidate` **admits** `https://[::ffff:0:127.0.0.1]/` — an IPv4-mapped loopback literal — because `dns.lookup` normalises it to `::ffff:0:7f00:1`, which the classifier's mapped-IPv4 regex does not match, and the classifier then falls through to `return false` ("public IPv6"). That is not a documentation defect; it is an admitted bypass of the only guard that sees that shape. The one thing a reader must not assume: **I could not make that address route.** On this host it returns `ENETUNREACH` while the genuine `::ffff:127.0.0.1` returns `ECONNREFUSED`, so the bypass is real at the admission layer and *not demonstrated* at the socket layer. It is graded HIGH for that reason and not CRITICAL.

---

## 1. Confirmed — what I re-measured and could not break

| Claim under review | My measurement | Result |
|---|---|---|
| Round 8's `C1`: the pin is wired `P:156 → F:75 → F:83 → F:99 → P:214` | Read the chain in `spotlightImageUrlPolicy.mjs` / `spotlightImageFetch.mjs`; `dispatcher` is constructed at F:83 and passed to `fetchImpl` at F:99 | **CONFIRMED** (wiring only) |
| `C4`: the dispatcher-removal mutation is detected | `spotlightImageDnsPin.test.mjs` T:205 asserts `seen[0].dispatcher` is defined; T:215/224 reaches the pinned answer through `Symbol(options)` | **CONFIRMED for the specified mutation** |
| `C9`: assertion sensitivity | Same tests fail if `dispatcher` is removed | **CONFIRMED** |
| `createPinnedDispatcher` fails closed on an empty set | P:205–209 throws `SpotlightImageError`; T:102–108 asserts it | **CONFIRMED** |
| Classifier: `dns.lookup("[::1]")` normalises before the check | Live: `dns.lookup("[::1]", {all:true})` → `[{address:'::1',family:6}]`; post-lookup loop catches `::1`; admission REFUSES | **CONFIRMED — the DNS path is the thing saving bracketed IPv6 literals**, not the classifier |

Astra's four classifier inputs, re-measured live (`C:/tmp/classifier-probe.mjs`) — all four reproduce exactly:

| Input | `isPrivateOrLocalAddress` | `net.isIP` | Note |
|---|---|---|---|
| `":"` | `false` | 0 | Astra's claim confirmed |
| `"8.8.8.999"` | `false` | 0 | Astra's claim confirmed (treated as a NAME upstream anyway) |
| `"0:0:0:0:0:0:0:1"` | `false` | 6 | Astra's claim confirmed — this IS loopback |
| `"::ffff:7f00:1"` | `false` | 6 | Astra's claim confirmed — this IS loopback |

---

## 2. Defects

Severity per `severity-policy-1` in `README.md` §3. Graded in both directions; where a grade rests on a fact I could not check, the fact is named.

### D1 — Response body is cancelled *after* the dispatcher is awaited closed [HIGH]

- **Claim under review:** `fetchSpotlightImage` cleans up transport and body correctly.
- **Evidence:** `spotlightImageFetch.mjs` F:90 `fetchImpl(...)` returns a response whose body may still be streaming. The `finally` at F:112 awaits `dispatcher.close()` at **F:117** — *before* reaching non-success cancellation at **F:124**, declared-size rejection/cancellation at **F:130–135**, and stream consumption with its byte cap at **F:145–155**.
- **Exploitability / reach:** Any caller whose upstream answers slowly, or answers a large body with a 4xx/5xx. Worst case is a stall proportional to how long `close()` drains, plus cancellation that arrives arbitrarily late.
- **Why it matters:** `close()` is documented on a live socket pool as "drains idle sockets **once in-flight requests settle**". A body that is still being read *is* an in-flight request, so the ordering makes the close wait on the very body the code then cancels. The correct order is the opposite: settle the body, then close the pool.
- **Fix:** Move the `dispatcher.close()` into a `finally` that wraps **the whole fetch-and-body operation**, not just the fetch. Consume or cancel the response first, then await graceful closure; define cleanup behaviour for aborted or failed transfers explicitly.
- **Honest limit (Astra's own, preserved):** *"The ordering is visible in the source. Its precise manifestation in the reported runtime remains unmeasured; this is **not evidence of a permanent socket leak**."* Graded HIGH on the ordering being wrong by construction, **not** on a measured leak.

### D2 — `isPrivateOrLocalAddress` has a false fail-closed contract [MEDIUM, pre-existing, shared]

- **Claim under review:** the classifier "defaults to private on unknown / un-parseable input (fail-closed)" (`applaudAudioFetcher.mjs` A:288).
- **Evidence:** A:294 branches on `ip.includes(':')`. Any string containing a colon that is not `::1`, `::`, `fc/fd…`, `fe8–b…`, `ff…`, or `/^::ffff:(\d+\.\d+\.\d+\.\d+)$/` falls through to **A:304 `return false; // public IPv6`**. Four measured inputs: `":"`→`false`, `"8.8.8.999"`→`false`, `"0:0:0:0:0:0:0:1"`→`false`, `"::ffff:7f00:1"`→`false`. All four are loopback-or-garbage, and not one is reported private.
- **Exploitability / reach:** **Pre-existing and shared** — `applaudAudioFetcher.mjs` (the PLAUD audio path) and `spotlightImageUrlPolicy.mjs` both import it. The audio path is saved by its exact-host allowlist; the Spotlight path has no allowlist, so this classifier is load-bearing for it. Astra's honest limit: the inputs are *resolver-supplied or URL-derived* strings, and whether attacker-controlled DNS reaches them in these representations depends on resolver normalisation. Astra states plainly: *"a production SSRF bypass is not demonstrated here."* I agree, and I did not inflate it.
- **Why it matters:** A function whose header promises fail-closed while its IPv6 branch defaults to *fail-open* is worse than one with no promise, because downstream authors trust the promise. The audit will stop looking exactly where the bug is.
- **Fix:** Make the IPv6 branch fail closed for anything it does not positively recognise as publicly routable — invert the default. Cover `::`, `::1` in expanded/zero-compressed forms, hex IPv4-mapped (`::ffff:7f00:1`), and bare/colon-only garbage. Because the helper is **shared**, the fix must be additive-compatible: the audio consumer's existing tests are the regression gate and must not be edited to accommodate it.

### D3 — The decisive named-host transport test does not exist [MEDIUM, false claim of coverage]

- **Claim under review:** `C6` and `C8` — that the literal-admission test "asserts both halves" and that a live named-host test observes the lookup.
- **Evidence:**
  - T:147 builds a `createPinnedLookup(...)`, then **T:148 calls that lookup directly**. No HTTP request ever uses the dispatcher built at T:145. The test observes a *function being invoked by the test*, not `net` invoking it during a connection.
  - The combined literal test: T:175 supplies `server.url`, which is an **`http://`** URL (`withLoopbackServer` T:53), so `P:114` rejects the protocol *before* address admission is ever reached. Half two therefore passes for the wrong reason and proves nothing about literal admission.
  - The "unpinned fetch reaches loopback" control (T:126–137) proves direct connectivity to `127.0.0.1`. It is a good control, but it is **not** a rebinding demonstration.
- **Exploitability / reach:** n/a — this is an evidence defect, not a runtime one.
- **Why it matters:** This is the R6-01 class one level up: a green suite whose green does not entail the property it is named for. The file's own docblock at T:139–143 claims "This asymmetry **is** measured here, live" — but the asymmetry is *simulated by calling the hook*, not produced by `net` on a real connection.
- **Fix:** Add a real named-host transport test that points at a name, lets `net` drive the connection, and asserts **which address the socket opened to** — not that a function the test itself called returned a value. Astra's sharper discriminator from round 7 applies: replace the wired dispatcher with a default `new Agent()` and assert the two cases are *distinguishable*, so the test fails on *transport* rather than on *dispatcher presence*.

### D4 — `resolveAndValidate` admits `[::ffff:0:127.0.0.1]`, an IPv4-mapped loopback literal [HIGH, found by me on Astra's D2 lead]

- **Claim under review:** `resolveAndValidate` "rejects a private IP-literal before any lookup" (T:267) and fails closed on every private form.
- **Evidence (live, `C:/tmp/gap-probe.mjs`):**
  ```
  https://[::ffff:0:127.0.0.1]/a.png   ADMITTED addrs=[{"address":"::ffff:0:7f00:1","family":6}]  <-- BYPASS
  ```
  Mechanism: for a bracketed IPv6 literal, `URL.hostname` keeps the brackets (`"[::ffff:0:127.0.0.1]"`), so `net.isIP` returns **0** and the literal branch at P:129 is *not* taken. Control falls to the DNS path, where `dns.lookup` normalises the address to `::ffff:0:7f00:1` — a **hex**-form IPv4-mapped address. The classifier's mapped branch (A:302) matches only the **dotted-decimal** form `::ffff:a.b.c.d`, so it misses. The other guards do not fire: ULA is `fc00::/7` (this is `::ffff:…`), link-local is `fe80::/10`, multicast is `ff00::/8`, and `::1` requires an exact match. Falls to A:304 → `false` → admitted.
- **Exploitability / reach:** A curator-supplied Spotlight URL is the input. The literal is admitted and **pinned as itself** (P:156), so the dispatcher will faithfully connect to the address the check approved.
- **Why it matters:** Two independent defects compose here — a bracketed literal escaping `net.isIP` admission (D3's family) and the classifier's hex-mapped blind spot (D2). Either alone is a bug; together they produce an *admitted* private literal, which is exactly the thing the literal branch at P:124–134 exists to prevent.
- **Measured limit — do NOT inflate:** `C:/tmp/socket-probe.mjs` shows the admitted address is **not routable on this host**: `::ffff:0:7f00:1` → `ENETUNREACH`, while the genuine mapped loopback `::ffff:127.0.0.1` → `ECONNREFUSED` (i.e. it really did reach a local port). The `::ffff:0:` prefix is a *different* address from `::ffff:` — it is the SIIT/translator form, not the standard mapped form. So this is **HIGH**: a demonstrated admission-layer bypass whose socket-layer impact I could not reproduce on this machine. It would be CRITICAL on a host where that prefix translates.
- **Fix:** Two, and both are needed. (1) Strip brackets before `net.isIP` at `spotlightImageUrlPolicy.mjs` P:128 so a bracketed literal takes the literal branch and is classified directly. (2) Invert the classifier's IPv6 default (D2/D4 share one fix) so any unrecognised colon-bearing string is private. Add the four measured shapes plus `[::ffff:0:127.0.0.1]` as regression cases.

---

## 3. Not proven / unopened

- **The pin's runtime transport behaviour** — `C1` is `BLOCKED overall` (wiring CONFIRMED only). No test in the repo observes `net` invoking `connect.lookup` during a real connection. Astra graded `C1`'s runtime half and `C2`/`C3` in full as BLOCKED.
- **`C5` is not adjudicable as stated** — it carried a motive clause ("removes no guard ... *in order to* smooth the patch"). Astra recommends restating it as a factual claim: *"The supplied patch removes no existing security guard or test."* Agreed; the motive form cannot be settled by reading code.
- **`C7` / `C8` FALSIFIED** — T:22 says "no symbol-poking" while T:224 calls `Object.getOwnPropertySymbols(..., 'Symbol(options)')`. The comment and the code contradict each other. Also F:115–116 treats `await fetchImpl(...)` returning as the *body* having settled, which is precisely D1.
- **`C10` understatements:** (1) bracketed IPv6 URL hostnames reach `net.isIP` without bracket removal (now escalated to D4); (3) `P:61–69` bounds the *caller's wait* but does **not** cancel the underlying `dns.lookup`, which continues and may still occupy a resolver thread; (6) the "61/61 before every mutation" chronology needs qualification — mutation 1 ran against the earlier 15-test suite, not the current 17-test file.
- **Astra's scope note, quoted because it bounds this whole review:** *"This review uses only the supplied artifacts. No commands, network requests, tests, mutations, or hash verification were performed."*
- **Unopened entirely:** the audio consumer's own test coverage for the shared classifier; `decodeSpotlightImage`'s `sharp` pipeline; the twelve `validateSpotlightImageUrl` call sites.

---

## 4. What I deliberately did NOT do, and why

- **Did not mark the repo's dirty tree.** ~1,327 dirty paths are present from other sessions; I committed only my own paths, by name, with no `git add -A` (ban #52/#53).
- **Did not kill or reap any process or lock** belonging to another session (surgical-partial-commit rule).
- **Did not edit the four peer-authored untracked packet files** (`R1-REVIEW-ROUND-2-PACKET.md`, `R1-REVIEW-ROUND-2-REPLY.md`, `R1-REVIEW-ROUND-2-REPLY.meta.json`, `R1-REVIEW-ROUND-5-PACKET.md`) — not mine, left alone.
- **Did not fix D2 by allowlisting the scanner hit** from the earlier commit; the correct fix was to remove the hardcoded home path.
- **Did not claim a socket-layer exploit for D4.** I measured it and it did not route.

---

## 5. Round log

| Round | Looked at | Found | Fixed | Re-verified |
|---|---|---|---|---|
| 7 | packet cited by hash + local path | `INCONCLUSIVE` — 6 unproven; reviewer could not read files or resolve hashes | inlined every artifact into the packet; scanner-backed dispatch gate | round 8 read the sources successfully |
| 8 | inlined sources, classifier, patch, mutation record | D1 lifecycle ordering, D2 false fail-closed contract, D3 absent named-host test, D4 admitted mapped-loopback literal; C6/C7/C8 falsified | pending — this filing records findings, fixes follow | not yet — see §3 |

**Dry:** not reached. Round 8 is the first round that could adjudicate at all (round 7 returned `INCONCLUSIVE` for mechanical reasons), and it found four defects, so the loop is still live. Round 9 is required after the D1/D2/D3 fixes land.
```


### 3.5 The mutation records — the author's evidence for C4, C6 and C9

The D1/D2/D4 mutation evidence lives in the repo's mutation record; the D3 evidence was produced in
this session and is reproduced verbatim below. **Read the second one closely: it records a mutation
that SURVIVED.** A record that only contained successes would be the thing to distrust.

#### `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/DNS-PIN-MUTATION-RECORD-2026-09-21.md`

sha256 `ff384e4415a12824d0c3c12defb4088ac8064d7540d7df6dd17da87a73e3ed55` · 133 lines

```markdown
# DNS-REBINDING PIN — MUTATION RECORD

**Date:** 2026-09-21
**Subject:** Closing the DNS-rebinding TOCTOU in the Spotlight image rehost path
**Files under test:**
- `backend/services/spotlightImageUrlPolicy.mjs`
- `backend/services/spotlightImageFetch.mjs`
- `backend/tests/unit/spotlightImageDnsPin.test.mjs` (new, 18 tests)

---

## Why this record exists

Four mutations were run against the fix. The first one **passed the entire suite** and that
result is the most important thing in this document — it found a defect in my own tests, not in
the fix. Recording it here so the next agent does not have to rediscover it.

Baseline before every mutation: **61/61 green** across the four spotlight suites
(`spotlightImageDnsPin` 18, `spotlightImageFetch` 22, `bridgeSpotlightImage.security` 8,
`spotlightImageDecode` 13).

---

## Mutation 1 — remove `dispatcher` from the fetch call

**Mutated:** `backend/services/spotlightImageFetch.mjs`, `dispatcher,` → `// MUTANT`
(one line, inside the `fetchImpl(...)` options object)

**Result: 15/15 GREEN.** No test failed.

**This is a real finding.** The suite at that point exercised `createPinnedLookup` and
`createPinnedDispatcher` *directly* — so it proved the pin's factories worked, and proved nothing
about whether production code ever called them. A pin that is constructed but never passed to the
transport is **dead code with a good comment**, and the suite called it green.

**Fix to the tests, not the code.** Three assertions were added under
`fetchSpotlightImage wires the pin into the transport`:

1. `passes a dispatcher to fetchImpl` — captures `init.dispatcher` from a stub `fetchImpl` and
   asserts it is defined and has a `close` (i.e. is a real `Agent`).
2. `pins the addresses the validator approved` — reaches the dispatcher's `connect.lookup` and
   asserts the answer equals the mocked `PUBLIC_IP`, proving the pin carries the *resolved*
   addresses rather than merely existing.
3. `refuses to fetch when the pinned address set is empty` — fail-closed.

**Re-run after the fix: same mutation now turns 2 tests RED**
(`passes a dispatcher to fetchImpl`, `pins the addresses the validator approved`). The mutation is
now caught.

**Restored:** `sha256 87f9ec2fb662f2a0bec76458da7764f4de2599663c9a43edca5981284fc1e23e`

---

## Mutation 2 — drop the first pinned address

**Mutated:** `spotlightImageUrlPolicy.mjs`, `callback(null, pinned)` → `callback(null, pinned.slice(1))`

**Result: 5 RED**

- answers the all:true form with every pinned address
- ignores the requested hostname — the answer is the pinned set
- preserves an IPv6 pinned address with its family
- the pin is consulted for a NAMED host — the lookup hook fires, the literal path does not
- pins the addresses the validator approved, not the URL alone

**Note:** this mutation only touches the `all: true` branch, which is why the *single-address*
test stayed green — correct, and the reason Mutation 3 exists.

**Restored:** `sha256 77f928d125cdf526664b9bb3bf831b814579670da47dbf41afdd150c1ec1cd3f`

---

## Mutation 3 — single-address branch answers loopback

**Mutated:** `spotlightImageUrlPolicy.mjs`, `callback(null, first.address, first.family)` →
`callback(null, '127.0.0.1', first.family)`

**Result: 1 RED** — `answers the single-address form with a bare address and family`

The two answer shapes (`{all:true}` → array, else → bare address + family) are both load-bearing
because `net` calls the hook both ways. Answering only one correctly would make the pin work for
one caller and silently fall through for the other. Mutation 2 covered the array shape; this covers
the bare shape.

**Restored:** `sha256 77f928d125cdf526664b9bb3bf831b814579670da47dbf41afdd150c1ec1cd3f`

---

## Mutation 4 — disable the IP-literal branch

**Mutated:** `spotlightImageUrlPolicy.mjs`, `const literalFamily = net.isIP(incoming.hostname);`
→ `const literalFamily = 0;`

**Result: 3 RED**

- validates an IP-literal host without a lookup and pins the literal
- rejects a private IP-literal before any lookup
- rejects the cloud metadata IP-literal before any lookup

This matters more than it looks. A literal host **never consults `connect.lookup`** — `net`
short-circuits it because there is no name to resolve — so the pin is structurally unable to
protect the literal case. Admission is the only control there, and this mutation proves the tests
would notice if admission stopped doing it.

**Restored:** `sha256 77f928d125cdf526664b9bb3bf831b814579670da47dbf41afdd150c1ec1cd3f`

---

## Measured behaviour, not assumed

Confirmed against real sockets and real `undici` (v7.27.1, node v22.22.2):

| host form | `connect.lookup` consulted? | pin effective? | what stops a private target |
|---|---|---|---|
| NAME (`https://rebind.example/a.png`) | **yes** (`lookupCalled = 1`) | **yes** | the pin |
| IP-literal (`https://10.0.0.1/a.png`) | **no** (`lookupCalled = 0`) | **no** | admission (`resolveAndValidate`) |

Also measured: `globalThis.fetch` **does** honour a foreign `undici.Agent` passed as `dispatcher`
(the hook fired and the connection went to the pinned address), so the fix does not require swapping
the fetch implementation and every existing `fetchImpl` injection point — including tests —
stays intact. And an `Agent` is a **live socket pool**: without `close()` it holds the event loop
open, which is why `spotlightImageFetch` closes it in a `finally`.

---

## What this record does NOT claim

- The pin does not defend the IP-literal case; admission does. Both are tested; neither is
  presented as the other.
- The pin only makes the **first hop** honest. `redirect: 'error'` is what prevents a second hop
  from existing. The two are complementary and neither is a defence alone.
- No live end-to-end rebinding attack was executed against a real hostile DNS server. The pin's
  mechanism is proved at the `connect.lookup` boundary and against real loopback sockets, not by
  running an actual rebinding attack.
```


#### The D3 mutation record, reproduced verbatim from this session

```markdown
D3 MUTATION RECORD — spotlightImageTransportPin.test.mjs
========================================================
Subject: the new transport test committed as 6cca20594.
Method: mutate backend/services/spotlightImageUrlPolicy.mjs, run the suite, restore the source
        and verify byte-identity (sha256 6ec126d3c5529032…, git diff HEAD = 0 lines).
Every mutation below was REVERTED before the next one; each restoration was hash-checked.

--- Mutation 1 — the pin is removed entirely -----------------------------------------------
EDIT:  return new Agent({ connect: { lookup: createPinnedLookup(addrs) } });
   ->  return new Agent();   // pin removed — does any test notice?

RESULT: 2 of 4 RED in spotlightImageTransportPin.test.mjs
        Caused by: Error: getaddrinfo ENOTFOUND pin-probe.invalid
        plus 1 additional RED in spotlightImageDnsPin.test.mjs
        test files 2 failed (2) | tests 3 failed | 15 passed (18)

The first and third cases go RED because the NAME cannot resolve without the pin — which is the
property under test. The SECOND case ("a default Agent is DISTINGUISHABLE") correctly STAYS GREEN:
its job is to prove the two dispatchers differ, not to detect this mutation. A test that went RED
there would be asserting the wrong thing.

--- Mutation 2 — the pin set is order-rotated -------------------------------------------------
EDIT:  createPinnedLookup(addrs)
   ->  createPinnedLookup(addrs.slice(1).concat(addrs[0]))

FIRST RUN: ALL THREE TESTS GREEN. THE MUTATION SURVIVED.

That is a defect against the TEST, not against the source, and it is recorded rather than tidied
away. Root cause: every case in the file pinned a SINGLE address, and with one element there is
nothing to rotate — so the mutation was unreachable by construction, not by accident. The suite
looked mutation-proof while being structurally blind to an entire defect class.

FIX: a fourth case was added that pins TWO addresses (['127.0.0.2','127.0.0.1']) against two live
servers on one port, asserting the FIRST pinned address is the one connected to.

RE-RUN: 1 RED —
        AssertionError: expected 'served-by:127.0.0.1' to be 'served-by:127.0.0.2'
        test files 1 failed (1) | tests 1 failed | 3 passed (4)

The hole is closed. Baseline with the four cases and no mutation: 4 passed (4).

--- What this record does NOT claim -----------------------------------------------------------
- It does not claim the new test is now mutation-proof. It claims one demonstrated hole was closed.
- It does not claim mutation coverage of the SIBLING suites; only the two mutations above, and only
  against spotlightImageTransportPin.test.mjs (plus the collateral RED in dnsPin for mutation 1).
- The mutation surface is `createPinnedDispatcher` only. `createPinnedLookup` was not mutated
  directly in this session; it is the callee the two mutations above reach through.
```

---

## §4 — Author-run measurements, labelled as such

Everything in this section was run by the AUTHOR on this machine, and you should treat it as an
unverified claim unless you can reproduce it — which, being shell-less, you cannot. It is reported
so you can judge whether it *would* have been sufficient, and to make it obvious which claims rest
on it.

| Measurement | Result |
|---|---|
| `vitest run` transportPin + dnsPin + lifecycle + admission | **4 files, 52 tests passed** |
| D3 mutation 1 — `createPinnedDispatcher` returns `new Agent()` (pin removed) | **2 of 4 RED** (`getaddrinfo ENOTFOUND pin-probe.invalid`) + 1 more RED in dnsPin |
| D3 mutation 2 — pin set rotated `addrs.slice(1).concat(addrs[0])` | **FIRST RUN: ALL GREEN — THE MUTATION SURVIVED** (see §3.5); after adding a two-address case: **1 RED** |
| D1 mutation — original ordering restored | **4 of 6 RED** |
| Classifier, post-fix, four round-8 inputs | `":"`→true, `"8.8.8.999"`→true, `"0:0:0:0:0:0:0:1"`→true, `"::ffff:7f00:1"`→true |
| `bracketed` literal `https://[::ffff:0:127.0.0.1]/` | now **REFUSED** (`IMAGE_URL_NOT_ALLOWED`) |
| ban #50 (no source file ≥ 300 lines) | 201 / 280 / 227 / 293 / 164 / 286 / 111 / 147 / 182 — all under |
| Source restored byte-identical after each mutation | `6ec126d3c5529032…`, `git diff HEAD` = 0 lines |

---

## §5 — What this packet cannot give you, and does not pretend to

- **You cannot re-run the mutations**, so C4/C6/C9 rest partly on an author-supplied record. The
  record is honest (it contains a failure) but it is still the author's.
- **You cannot measure the socket layer.** Round 8 correctly refused to inflate D4 from an
  admission-layer bypass to a socket-layer exploit. The same restraint applies to the fix: the new
  test shows the *pin* routes a socket, not that any particular address is unreachable.
- **The repo's object store is damaged.** 88 objects are missing, 18 links are broken, and 21
  cache-tree pointers are invalid. Two commits below may fail to render in full for that reason;
  where they do, it is stated rather than silently omitted.
- **C1's runtime half retains a residue.** The new transport test observes a real socket, which is
  stronger than round 8's position — but it observes it on THIS machine, with THIS Node and undici.
