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
