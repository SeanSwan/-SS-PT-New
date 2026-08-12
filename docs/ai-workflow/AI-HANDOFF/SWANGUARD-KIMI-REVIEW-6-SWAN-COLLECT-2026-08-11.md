# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/SWANGUARD-KIMI-PACKET-6-SWAN-COLLECT-2026-08-11.md
**Seed:** (none)
**Tokens:** 9436 in / 9903 out | **Cost:** ~$0.1769 | **Wall:** 325.6s | **finish_reason:** stop

---

# Kimi K3 — Hostile Review: swan-collect (Packet 6)

## 0. Scope note on the design-system criteria

Crystalline Swan, styled-components, Victory, 44px targets, WCAG 4.5:1, responsive breakpoints, reduced-motion: **N/A — this packet contains zero UI.** I won't fabricate design findings against code that has no render path. What I *can* verify: all four files are under the 300-line ceiling (item.mjs ≈195, entity-scope.mjs ≈140, bluesky.mjs ≈175, youtube.mjs ≈185). Pass.

Everything below follows your ground rules: hypothesis, attack, precondition, location, confirm/kill evidence, confidence.

---

## 1. Findings, ranked by severity

### 🔴 H1 — Adapter loops can hang forever; the cap does NOT cover the path you think it does

**File:** `adapters/bluesky.mjs` `collectPosts` while-loop; `adapters/youtube.mjs` `collectUploads` while-loop.

**Hypothesis:** You cap *items*, but termination also depends on `items.length` growing. If a page returns non-empty results where **every entry is skipped** (all reposts, all records missing `uri`, all playlistItems lacking `contentDetails.videoId`), `items.length` never advances. If the cursor/token then cycles (returns the same non-null value), the loop condition `items.length < ceiling` is never false and `cursor` is never null. **Infinite loop, unbounded time, one network call per iteration, forever.**

**Precondition:** A platform bug, an AppView edge case, or a hostile/compelled platform returning a cycling cursor with an all-skipped page. You correctly treat platforms as semi-hostile — this is the same threat model as your multi-MB text concern.

**Confirm:** Stub `fetchImpl` returning `{feed: [{post: null}], cursor: "loop"}` repeatedly — `collectPosts` never returns. Kill: show me a page-iteration counter or a seen-cursors set. **There is none.**

**Confidence: HIGH** that the code hangs under that stub; MEDIUM that a real platform triggers it. Severity escalates scrutiny per your rule 2 — a hung collector on the operator's machine silently stops all intel flow, and the *next* finding is about what happens when it partially recovers.

**Correction:**
```js
const MAX_PAGES = 20; // 20 × 100 > MAX_TOTAL ceiling; hard stop regardless
const seenCursors = new Set();
let pages = 0;
while (items.length < ceiling && pages < MAX_PAGES) {
  pages++;
  // ...fetch...
  cursor = data?.cursor;
  if (!cursor) { exhausted = true; break; }
  if (seenCursors.has(cursor)) break; // cycling cursor: stop, windowComplete stays false
  seenCursors.add(cursor);
}
```
The `break` on a repeated cursor deliberately leaves `exhausted = false` → `windowComplete = false` → fail-closed, which is the correct default.

---

### 🔴 H2 — `reconcile()`'s most consequential invariant is enforced by a caller that isn't in this packet

**File:** `core/item.mjs`, `reconcile()`.

**Hypothesis:** `reconcile(previous, fetched, {windowComplete: true})` retracts every key in `previous` absent from `fetched`. Nothing in the function verifies that `previous` and `fetched` cover the **same scope** (same `sourceKey` + `entityRef`). If the caller passes the full item store as `previous` and one source's batch as `fetched`, a truthful `windowComplete=true` from Bluesky **mass-retracts every YouTube/RSS item for every entity.** That is the denial-of-truth attack executed with *correct* flags and *honest* data — the failure is scope confusion, not a lying flag.

**Precondition:** Caller misuse. There is no orchestrator/runner in this packet — collect+reconcile plumbing is entirely unseen. You asked "is my default-false the right safety": default-false is necessary but not sufficient, because the *true* path is also unsafe without a scope guard.

**Confirm:** Read `reconcile` — it iterates `prior` unconditionally when `windowComplete` is set. Kill: produce the caller showing `previous` is pre-filtered to the identical (sourceKey, entityRef, window) as `fetched`. That code was not provided.

**Confidence: HIGH** that the function as written will mass-retract on scope mismatch; MEDIUM on whether the unseen caller misuses it. Given this is the highest-consequence logic in the packet (your words), the invariant belongs *inside* the function, not in a caller contract.

**Correction:**
```js
export function reconcile(previous, fetched, { at, windowComplete = false } = {}) {
  const stamp = toIsoOrNull(at);
  if (!stamp) throw new CollectError('reconcile requires a valid `at` timestamp');

  // Scope seal: retraction may only ever apply within one (sourceKey, entityRef)
  // cell. A heterogeneous `previous` is a caller bug and must fail loudly.
  if (windowComplete) {
    const scopes = new Set((previous || []).map((i) => `${i.sourceKey}${i.entityRef ?? ''}`));
    if (scopes.size > 1) {
      throw new CollectError(
        'reconcile: windowComplete requires `previous` scoped to a single source+entity; got ' + scopes.size + ' scopes'
      );
    }
  }
  // ...rest unchanged
}
```

---

### 🟠 M1 — `stripMarkup` runs on *unbounded* input and the `<script>` pattern is polynomial

**File:** `core/item.mjs`, `stripMarkup` + call sites in `normalizeItem`.

**Hypothesis:** Caps are applied **after** stripping (`clip(stripMarkup(input.text), CAPS.text)`), so the regexes see the full attacker string. `/<script[\s\S]*?<\/script\s*>/gi` is lazy-but-unanchored: for *each* `<script` occurrence with no closing tag, the engine scans to end-of-string. Input of N repeated `<script` prefixes → O(N²). A 2MB post body of `<script<script<script…` pegs a core for seconds-to-minutes — per item, per sync.

**Precondition:** Attacker-published text. Bluesky posts are length-limited, but YouTube descriptions are 5,000 chars *by YouTube's rules* — you are trusting the platform's cap, and `text` cap only binds post-strip. A compromised or buggy API response is unbounded.

**Confirm:** `stripMarkup('<script'.repeat(50000))` and time it. Kill: show input bounding before the regex. None exists.

**Confidence: HIGH** on the polynomial behavior; MEDIUM on exploitability (bluesky real-world bodies are small — but `text` accepts YouTube descriptions and any future source).

**Correction:**
```js
export function stripMarkup(value) {
  if (typeof value !== 'string') return null;
  // Bound BEFORE regex: regex work must never scale with attacker generosity.
  // 64KB is far past any legitimate post; clips quadratic blowup to a fixed cost.
  const s = value.length > 65_536 ? value.slice(0, 65_536) : value;
  return s
    .replace(/<script[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
}
```
(Pre-slicing is safe: a tag truncated at 64KB renders as inert literal text, and `clip()` re-bounds after.)

---

### 🟠 M2 — `toIsoOrNull` has a fabrication path that violates your own doctrine

**File:** `core/item.mjs`, `toIsoOrNull`.

**Hypothesis:** You reject bare *numbers*, but not bare *year strings*. `new Date('2099')` → `2099-01-01T00:00:00.000Z`. `new Date('0')` → year 2000 in V8. `new Date('2020')` → `2020-01-01`. An attacker (or a sloppy source) supplying `publishedAt: '2099'` produces an item that sorts to the top of every newsroom queue **forever**, with a month and day the source never stated. That is a guessed date wearing a parse's clothing — exactly what the doctrine forbids.

**Confirm:** `toIsoOrNull('2099')` returns an ISO string today. Kill: show a shape check. None exists.

**Confidence: HIGH** on the behavior. Severity MEDIUM because it requires source-controlled garbage, but it directly undercuts the packet's stated crown-jewel doctrine.

**Correction:**
```js
export function toIsoOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return null;
  // Require at least YYYY-MM-DD shape. Bare years, bare digits, and locale
  // strings ('May 5 2020') parse in V8 but carry precision the source never
  // stated — expanding them fabricates month/day/hour.
  if (typeof value === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(value.trim())) return null;
  const d = new Date(value);
  // ...rest unchanged
}
```
This also kills implementation-defined loose parsing across Node/Deno/Bun — a real portability win for your §7 claim.

---

### 🟠 M3 — `metrics` is an unvalidated, unbounded attacker object

**File:** `core/item.mjs`, `normalizeItem` return.

**Hypothesis:** `metrics: input.metrics && typeof input.metrics === 'object' ? input.metrics : null` passes through **anything object-typed**: megabyte strings as values, arrays, 10,000 keys, and a JSON-parsed own `__proto__` property. Every other field is clipped; this one field is a hole in "caps on everything." A consumer doing `Object.assign(dbRow, item.metrics)` also inherits a proto-pollution vector.

**Confidence: HIGH** on the hole existing; LOW-MEDIUM on impact (depends on consumer, which is out of packet).

**Correction:**
```js
function cleanMetrics(m) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return null;
  const out = Object.create(null);
  let n = 0;
  for (const [k, v] of Object.entries(m)) {
    if (n++ >= 32) break;                       // key-count cap
    if (!/^[a-z][a-zA-Z0-9_]{0,31}$/.test(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (v === null) out[k] = null;          // numbers-or-null only: counts, not content
  }
  return Object.keys(out).length ? out : null;
}
```

---

### 🟡 L1 — `checkEntity` passes an unvalidated `citation` through for non-citation categories

`citation: rule.requiresCitation ? entity.citation.trim() : (entity.citation ?? null)` — for `organization`/`brand_account`, citation can be a 10MB string, an object, or a number. Bound it: `citation: rule.requiresCitation ? entity.citation.trim() : clip(entity.citation, 2_048)` (with a typeof guard). **Confidence: HIGH** it exists; **LOW** impact. Also `citationIsUsable` accepts userinfo (`https://user:pass@host`) which `safeHttpUrl` rejects — align the two. And to your direct question: yes, `citationIsUsable` is 80% theatre — it validates *format*, not *claim*. That's acceptable for a gate, but the reason string ("requires a citation") oversells to operators what was actually checked. Say "a citation URL (format-checked; a human must verify it supports the claim)."

### 🟡 L2 — `sanitizeHandles` writes `__proto__`/`constructor` onto a plain object

`'__proto__'` matches your source-key regex. `out['__proto__'] = v` with a string value is a silent no-op (prototype unchanged), so **no pollution** — but the key vanishes on read (`out['__proto__']` returns `Object.prototype`), creating a phantom-handle bug. `out.constructor = v` shadows the constructor. Fix: `const out = Object.create(null)` or skip `['__proto__','constructor','prototype']`. **Confidence: HIGH** on the quirk, **LOW** severity — your hasOwnProperty guard on `ENTITY_CATEGORIES` is otherwise sufficient (correct: the lookup is guarded *before* the bracket access; `__proto__` as category fails hasOwnProperty. Verified correct.)

### 🟡 L3 — `collectPosts` silently drops pinned posts

Bluesky author feeds surface pins via `entry.reason` (`#reasonPin`). Your `if (!includeReposts && entry?.reason) continue;` drops them. A newsroom's pinned statement is often its most-newsworthy item. Distinguish: `if (entry?.reason && !`${entry.reason.$type ?? ''}`.endsWith('reasonPin') && !includeReposts) continue;` — or check `$type` explicitly. **Confidence: MEDIUM** (AppView behavior on reasonPin varies by filter param — verify live; you have the harness).

### 🟡 L4 — Merge in `reconcile` can erase good data with degraded data

`{ ...before, ...item }` — if a transient source glitch makes the new `publishedAt`/`canonicalUrl`/`metrics` null, the null **overwrites** previously-good values. Prefer non-null: `publishedAt: item.publishedAt ?? before.publishedAt`, same for `canonicalUrl`, `metrics`, `title`. **Confidence: HIGH** it exists; severity LOW-MEDIUM (self-heals next good sync, but a newsroom reading between syncs sees degraded records).

### 🟡 L5 — Smaller, verified-quickly items

- **§3 answer:** `[A-Za-z0-9._:@-]` is safe *today* only because both adapters route handles through `URLSearchParams` (query), never paths. `..` passes your charset; the day an adapter interpolates a handle into a path segment without `encodeURIComponent`, you have traversal. Add the contract to `sanitizeHandles`' doc comment: "consumers MUST place values in query params or encode before path use." Also validate YouTube `videoId` (`/^[\w-]{11}$/`) before interpolating into `canonicalUrl` — it comes straight from the API response, bypassing `sanitizeHandles` entirely.
- **Entity name:** trim only — no control-char strip. `\n`/ANSI in `name` reaches logs and (via `ScopeDenied.reason`) user-facing strings. Strip `[\x00-\x1f\x7f]`.
- **Portability (§7):** holds, with one exception — `AbortSignal.timeout` needs Safari ≥16 / Node ≥17.3. State the floor in the header comment. Zero imports in core, injected fetch, relative `.mjs` specifiers: verified clean for Deno/Bun/browser.
- **Scale (§8):** (a) No concurrency, no jitter, no retry — at 200×6, one source's 429 kills that entity's run with no resume; partial-failure policy is entirely the unseen caller's. (b) **YouTube caching is unenforceable as designed:** `resolveChannel`'s doc says "CACHE THE RESULT" but accepts no cache and returns no cache handle. 200 entities hitting the 100-unit search fallback = 20,000 units = two days' entire quota in one sync. Add an optional `cache` param (`{get,set}`) to `resolveChannel` and have it short-circuit.

---

## 2. Single highest-impact improvement

**Make retraction safe by construction, not by caller discipline.** H1 + H2 are one failure: the system can produce or act on an untrustworthy completeness signal. Concretely, ship these together:

1. Page-cap + seen-cursor set in both collectors (H1 patch above), so `windowComplete=false` on any anomaly.
2. Scope-seal assertion inside `reconcile` (H2 patch above), so even a *true* `windowComplete` can only retract within its own source+entity cell.

Everything else on this list loses data or hangs a process. This one mass-retracts a newsroom's evidence base — your own stated defamation route.

---

## 3. Verified correct (calibration credit — do not re-litigate)

- **Cursor loops that *do* grow items are bounded** (ceiling 500, `slice` enforced on every return path — §6 partially dies).
- **429 mid-page throws and yields no partial result** — `windowComplete` is never returned from a rate-limited run. Correct fail-closed.
- **`hasOwnProperty` guard on `ENTITY_CATEGORIES`** — sufficient; `__proto__`/`constructor` as category both deny. Proto-pollution via category: **dead.**
- **Key-in-query leakage** — YouTube errors are built from status + Google message only; the URL with `key` is never stringified into an error. Verified.
- **`permalinkFor`** — strict at-uri regex + `encodeURIComponent` on the handle. Clean.
- **`xrpc` detail slice (200 chars), `redirect: 'error'`, empty-string param skipping** — all correct.
- **Retraction resurrection** (`retractedAt: null` on reappearance) and **no re-stamp of already-retracted items** — correct.
- **Empty CRITICAL list on §7** — the portability claim survives scrutiny; only the `AbortSignal.timeout` floor needs documenting.

**Tally: 2 HIGH, 3 MEDIUM, 5 LOW, 8 hypotheses killed.** The architecture (fail-closed scope, degrade-don't-fail on source data, retraction-over-deletion) is sound. The two reds share one root cause — trust placed in loop termination and caller behavior rather than in the code path itself — and one patch theme fixes both.
