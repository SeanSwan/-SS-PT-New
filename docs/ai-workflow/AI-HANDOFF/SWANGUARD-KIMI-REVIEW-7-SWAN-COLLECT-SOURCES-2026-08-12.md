# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-KIMI-PACKET-7-SWAN-COLLECT-SOURCES-2026-08-12.md
**Seed:** (none)
**Tokens:** 19576 in / 10480 out | **Cost:** ~$0.2159 | **Wall:** 264.3s | **finish_reason:** stop

---

# Kimi K3 — Hostile Review, Packet 7

**Scope note on the design mandate:** this packet is a CLI/collector with zero rendered UI. Crystalline Swan tokens, styled-components, Victory, 44px targets, WCAG contrast, breakpoints, and reduced-motion have no surface to violate here — I won't invent findings. File-size discipline: all nine files are ~110–230 lines, under the 300 cap. Pass. The receipt glyphs (`⚠ ~ ⊘`) and `padEnd` columns are terminal output, not design-system output. N/A, and correctly so.

Everything below follows your ground rules: hypothesis, attack, evidence, confidence.

---

## HIGH

### H1 — The runner DELETES stored history on every incomplete window. The store never accumulates.
**File:** `run.mjs` (`collectEntity`, the `merged` line) + `core/reconcile.mjs` (return shape).

**Attack / failure:** No attacker needed; this fires on ordinary operation.

`reconcile()` returns exactly three lists: `added`, `updated`, `retracted`. A prior item that was **not seen** in this fetch and **not retracted** (because `windowComplete=false`) appears in *none* of them. The runner then does:

```js
const merged = [...diff.added, ...diff.updated, ...diff.retracted];
await store.write(adapter.key, ent.name, merged, ...); // full-cell replace
```

RSS returns `windowComplete: false` **by design, always** ("a feed is a TRUNCATED window… an item aging out is NOT a retraction"). So every RSS sync writes only what the feed currently carries and silently drops everything that aged out. Mastodon/Bluesky/vendor do the same whenever they hit `MAX_PAGES`, the cursor brake, or `ceiling`. The on-disk store is therefore a mirror of the last fetch window, not an accumulating evidence base — the exact opposite of the retraction doctrine ("marked `retractedAt` rather than deleted"). A newsroom holding an item that aged out of a feed loses it on the next run, with no receipt line saying so.

**Evidence to confirm:** one store cell, two runs. Run 1: feed with items A, B. Run 2: feed with B, C. Inspect the cell after run 2 — A is gone, and no `retractedAt` was ever set. **Confidence: high** (read straight off the code; the reconcile return shape and the write-replace are both unambiguous).

**This also answers your Q1 and Q2 directly:**
- Your "fail-open read is safe because empty `previous` can only cause ADDs" reasoning is **true for reconcile and false for the system**. A corrupt cell reads `[]` → everything is `added` → the write **replaces** the formerly-good file with the current window. Fail-open read + full-replace write converts a truncated write into total cell loss.
- "Can a partial run produce a state where the next run wrongly retracts?" Worse: the partial run itself wrongly *deletes*, no next run required.

**Fix (builder-exact):** carry forward unseen, unretracted priors. In `reconcile.mjs`, add a fourth list:

```js
const kept = [];
for (const [key, item] of prior) {
  if (seen.has(key) || item.retractedAt) continue;
  if (windowComplete) retracted.push({ ...item, retractedAt: stamp });
  else kept.push(item); // outside the window — preserve, do not drop
}
return { added, updated, retracted, kept, windowComplete };
```

(Move the existing retraction loop's `prior` iteration into this single loop.) In `run.mjs`: `const merged = [...diff.added, ...diff.updated, ...diff.kept, ...diff.retracted];` and add `kept: diff.kept.length` to the receipt entry so preservation is auditable.

---

## MEDIUM

### M1 — Byte caps are checked AFTER the body is fully buffered. `MAX_DOC_BYTES` protects CPU, not memory.
**File:** `adapters/rss.mjs` (`collectFeed`: `const raw = await res.text();` then the length check), `adapters/vendor.mjs` (`await res.json()`, no cap at all).

**Attack:** point the RSS handle at a hostile endpoint (a feed URL is operator-supplied but can come from a config/manifest, and a legitimate feed host can be compromised) that streams a 2GB body. `res.text()` buffers all of it before your 4MB check runs. Vendor is worse: `res.json()` has no cap whatsoever — this is your Q6 "exhaust memory" hole, open.

**Evidence to confirm:** stub `fetchImpl` returning a multi-hundred-MB body; watch RSS memory before the `CollectError` fires. **Confidence: high.**

**Fix:** read with a reader and abort at the cap:

```js
const reader = res.body.getReader();
const chunks = []; let size = 0;
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  size += value.byteLength;
  if (size > MAX_DOC_BYTES) { await reader.cancel(); throw new CollectError(`rss: document exceeds ${MAX_DOC_BYTES} bytes`); }
  chunks.push(value);
}
const raw = new TextDecoder().decode(Buffer.concat(chunks)); // or manual concat for browser purity
```

Apply the same pattern to vendor before `JSON.parse`.

### M2 — Vendor inner loop has no ceiling enforcement; one hostile page = unbounded work.
**File:** `adapters/vendor.mjs` (the `for (const raw of batch)` loop).

**Attack:** `limit` is a *request* parameter; nothing enforces it on the response. A hostile/vendor-side bug returning 1,000,000 items in one page runs 1M `normalizeItem` calls and pushes 1M elements before `items.slice(0, ceiling)` trims at the end. Mastodon is safe here only because its batch is server-bounded by its own `limit`. **Confidence: high.**

**Fix:** `for (const raw of batch) { if (items.length >= ceiling) break; ... }`

### M3 — Mastodon host guard is bypassable via non-canonical IPv4: `127.1`, `0x7f.0.0.1`, `0177.0.0.1`.
**File:** `adapters/mastodon.mjs` (`isSafeHost`).

**Attack:** the IPv4 rejection requires exactly four decimal octets. The WHATWG URL parser (Node/undici, Deno, browsers) accepts 1–4 parts and hex/octal parts: `new URL('https://0x7f.0.0.1/x').hostname` → `127.0.0.1`; `https://127.1` → `127.0.0.1`. Labels `0x7f`, `0`, `1` all match `[a-z0-9-]{1,63}`, and `127.1` has a dot so it passes `HOST`. `BLOCKED_HOSTS` never sees it. Same trick reaches `169.254.169.254` (cloud metadata) as `0xa9.0xfe.0xa9.0xfe`. This is a real bypass of an explicit security guard, not a theoretical one.

**Severity rationale:** operator-side collector, so MEDIUM not HIGH — but your portability contract explicitly says this file "could end up somewhere it matters," and the guard's whole purpose is the request target.

**Evidence to confirm:** `node -e "console.log(new URL('https://0x7f.0.0.1/').hostname)"` → `127.0.0.1`. **Confidence: high** (WHATWG IPv4 spec behavior).

**Fix:** after the regex, reject any host that the URL parser normalizes to an IP literal:

```js
const u = new URL(`https://${h}`);
if (/^\[/.test(u.hostname) || /^[\d.]/.test(u.hostname) || u.hostname !== h && /^\d/.test(u.hostname)) return false;
```

Cleanest portable form: reject if every label matches `/^(0x[0-9a-f]+|0[0-7]*|\d+)$/i` — that kills decimal, hex, and octal short-forms in one test. DNS-rebinding (valid host resolving internal) remains unaddressed, as you noted; LOW operator-side, but document it in the module header rather than only in review.

### M4 — `store.write` is not atomic; crash mid-write → truncated JSON → fail-open read → H1 completes the kill.
**File:** `core/store.mjs` (`write`).

**Attack:** SIGINT / power loss / disk-full during `writeFile` leaves a truncated cell. Next run: `read` catches → `[]` → H1's replace semantics finish the data loss. The three mechanisms compose; each looked safe alone. **Confidence: high** as a mechanism, MEDIUM on probability.

**Fix:** write-then-rename. Add `rename` to the injected fs contract (document the addition — it changes the portability interface):

```js
const tmp = join(cellName(sourceKey, entityRef) + `.tmp-${process?.pid ?? Math.random().toString(36).slice(2)}`);
await f.writeFile(tmp, json);
await f.rename(tmp, join(cellName(sourceKey, entityRef)));
```

---

## LOW

- **L1 — `normalizeFeedDate` reopens a sliver of M2.** The RFC-822 gate requires only `\d{1,2}\s+[A-Za-z]{3}\s+\d{4}`. `"11 Aug 2026"` (no time) passes, V8 parses it, and you emit `T00:00:00.000Z` — an invented time, the same fabrication sin as `'2099'`. Tighten the gate to require `\s+\d{1,2}:\d{2}` before calling `new Date`. Confidence: high that the behavior occurs; LOW because date-only RFC-822 is rare in the wild.
- **L2 — RSS `externalId` falls back to `title`.** Two distinct articles sharing a title (or one title-only entry per feed) collapse to one `itemKey`; the second is treated as an `update` of the first. Distinct-evidence conflation. Prefer skipping the entry over title-as-identity, or hash `title+publishedAt+link` when all three exist. Confidence: medium.
- **L3 — `splitEntries` worst case is bounded but ugly.** Unclosed `<item>` at 2M scan chars × 200k inner bound is a large constant; V8's literal-string skip on `</item` makes the realistic case fine, but an `indexOf('<item')`/`indexOf('</item')` splitter is linear by construction and shorter than the regex. Also: an attribute value containing `>` (legal XML) silently shifts block boundaries — misattribution edge, not exploitable beyond noise. Confidence: medium.
- **L4 — FNV-1a 32-bit is adequate for accidents, not for adversaries.** Accidental collision needs same sanitized 100-char prefix *and* same 32-bit hash — negligible at 1,200 cells. But a deliberately crafted pair (identical sanitized prefix, brute-forced suffix, ~2^16 work) shares a cell → scope-seal crash or silent merge. Requires adversarial entity names in an operator tool, so LOW — but a 64-bit FNV-1a (BigInt, still dependency-free) costs four lines and retires the question.
- **L5 — `createDefaultRegistry` lives in `core/` but imports `../adapters/`.** Your portability claim is "core/ + adapters/ are universal"; copying `core/` alone breaks on that dynamic import. Move it to a `core/default-registry.mjs` you explicitly exclude from the portable set, or to the package root. Confidence: high (trivial).
- **L6 — Refusal receipt shape is inconsistent.** `collectEntity` denial returns no `droppedHandles` key; success does. A consumer iterating keys diverges. One line. Trivial.
- **L7 — `decodeEntities` can emit lone surrogates** (`&#xD800;` passes the 32–0x10FFFF gate; `String.fromCodePoint` permits surrogates). JSON round-trips them; some downstream consumers choke. Reject `0xD800–0xDFFF` → `' '`. Trivial.

---

## Verified correct (worth saying)

- **decode-then-strip ordering and `&amp;`-last**: correct, and the reasoning in the comment is accurate. `&amp;lt;` ends as inert literal text; `&lt;script&gt;` becomes `<script>` pre-strip and dies. No double-decode path exists.
- **cellName vs. Windows hazards**: safe, and here's why. The filename is always `{sourceKey}__{safe}__{hash}.json` — it begins with a lowercase letter, contains `__`, and ends in `.json`, so it can never *be* a reserved device name (`CON` etc. are only reserved as bare basenames), never ends in dot/space, and `..` is killed both by the sanitizer and by the fact that no segment is dot-only. Traversal is impossible: the output charset has no separator.
- **Vendor key handling**: header-only, `redirect: 'error'`, and every error string carries `provider.name` + status only — no URL, no key. The leak paths you asked about are closed. The disable is enforceable on the `listEnabled` path; note that `registry.get('vendor_x').collect(...)` bypasses `enabled:false` — acceptable (it's operator code at that point), but say so in the registry header.
- **Registry fail-closed**: holds. Missing credential → `unavailable` with reason; `enabled:false` wins even over a present credential; nothing is silently skipped on the status path.
- **Portability (Q9)**: clean apart from L5. `AbortSignal.timeout`, `URL`, `fetch`-injection, lazy `node:fs/promises`, `node:url` confined to `run.mjs` — the division is real.

---

## Single highest-impact improvement

**Fix H1: make `reconcile` return `kept` and make the runner write it.** One function signature change, one loop restructure, one line in the runner, one receipt field. It converts the store from a mirror-of-last-fetch into the accumulating, retraction-only evidence base the entire doctrine section claims it is — and it simultaneously defuses the fail-open-read concern (M4's blast radius shrinks to "one window re-added," not "cell erased") and answers your Q2 in the strong direction. Everything else is hardening; this one is the product being what it says it is.
