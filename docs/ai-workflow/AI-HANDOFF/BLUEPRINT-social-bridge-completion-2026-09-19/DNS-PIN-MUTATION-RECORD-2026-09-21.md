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
