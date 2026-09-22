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
    // ROUND 11 CORRECTION. This list used to contain `3fff::1` with the reason "the top of the
    // global-unicast range". That reasoning mistook the /3 boundary for routability:
    // `3fff::/20` is DOCUMENTATION space per RFC 9637 §3, so `3fff::1` is not reachable and
    // belongs on the private side. `3fff::1` is now asserted PRIVATE in the block below, and
    // the genuine top of the range is represented by the case after this one.
    ['3fff:1000::1', 'inside 2000::/3 but above the 3fff::/20 documentation block'],
  ];

  for (const [ip, why] of mustBePublic) {
    it(`treats ${JSON.stringify(ip)} as public — ${why}`, () => {
      expect(isPrivateOrLocalAddress(ip)).toBe(false);
    });
  }
});

// ─── round 11: 2000::/3 is NECESSARY but NOT SUFFICIENT ─────────────────
describe('special-purpose ranges INSIDE 2000::/3 are not public (round 11)', () => {
  // WHY THIS BLOCK EXISTS. The allowlist answered "inside 2000::/3 => public", and that was the
  // round-10 finding: the IANA Special-Purpose Address Registry carves non-global ranges out of
  // the global unicast space, and will keep doing so. `3fff::/20` (RFC 9637, documentation) and
  // `2001:2::/48` (RFC 5180, benchmarking) are both inside the /3 and neither is reachable.
  //
  // The 3fff case is also why the /20 must be applied as a /20 and not as "group 0 is 3fff":
  // the wide version swallowed the top /12 of ALL global unicast and made the range's last
  // address private. Both edges are pinned below.
  const mustBePrivate = [
    ['3fff::1', 'documentation space, 3fff::/20 (RFC 9637)'],
    ['3fff:0fff:ffff:ffff:ffff:ffff:ffff:ffff', 'the LAST address of 3fff::/20'],
    ['2001:2::1', 'benchmarking, 2001:2::/48 (RFC 5180)'],
    ['2001:10::1', 'ORCHID, deprecated (RFC 4843)'],
    ['2001:20::1', 'ORCHIDv2 (RFC 7343)'],
    ['2001:db8::1', 'documentation, 2001:db8::/32 (RFC 3849)'],
  ];

  for (const [ip, why] of mustBePrivate) {
    it(`treats ${JSON.stringify(ip)} as private — ${why}`, () => {
      expect(isPrivateOrLocalAddress(ip)).toBe(true);
    });
  }

  it('the /20 boundary is a mask, not a leading-group test', () => {
    // The bug this pins: using `0x3ff0 <= g[0] <= 0x3fff` makes the LAST address of 2000::/3
    // private. Ordinary routable space must stay public on both sides of the /20.
    expect(isPrivateOrLocalAddress('3fff:1000::1')).toBe(false);   // just above 3fff::/20
    expect(isPrivateOrLocalAddress('3fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(false); // last in /3
    expect(isPrivateOrLocalAddress('2000::1')).toBe(false);        // first in /3
  });
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
