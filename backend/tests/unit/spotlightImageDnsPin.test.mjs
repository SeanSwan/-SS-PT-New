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

