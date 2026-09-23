# GLM Consult

**Requested:** `glm-5.3-flash`
**Served:** `glm-5.3-flash`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 16824 in / 23779 out (reasoning: 21103) | total 40603
**Wall:** 650.5s

---

# Style Atlas — hostile review

Scope: only the code shown. Line refs are to the packet. "Verified" = I can construct a deterministic repro from the shown code alone.

## Verified strengths (so the findings are read in context)

- Every async paint in the shown UI is guarded by `world.changed()` + sequence + (where relevant) re-serialized query key — the late-repaint invariant holds for grid, detail, facets, queue, surprise, compose (`app-atlas.js:92,113,292,376`; `app-atlas-queue.js:32,48,128,152`).
- Queue read-modify-write (`readQueue` → mutate → `write`) is fully synchronous inside one event-loop turn, so concurrent HTTP adds cannot interleave or lose updates without locks. `queueAdd` checks duplicate **before** cap, so a full queue never lies about duplicates.
- Write path is temp-file + same-directory rename; quarantine-failure throws before mutation; `queueClear` deliberately reads first so corrupt bytes are quarantined before the empty replacement. Matches the claimed evidence.
- `corpusAccess` runs before `loadAtlas()` (`routes-atlas.mjs:44-47`), so a 403 leaks no catalog existence. Atlas client code builds namespaces with `URLSearchParams` everywhere it appears (`app-atlas.js:62-64`; `app-atlas-queue.js:25`).
- URL scheme gate + `esc()` + `rel="noreferrer noopener"` on the one external link; prompt text is escaped in text context only.

## Verified defects

**D1 — P1 — `app-shell.js:71` — `Swan.qs()` does not URL-encode profile/project; a project title containing `&`/`=` re-parses as a different memory.**
Repro: create projects `R` and `R&D` under `sean`. Open `R&D`. Any call site building a request with `Swan.qs()` emits `profile=sean&project=R&D`; the server parses `project=R, profile=sean` and independently authorizes **the wrong memory** — the server cannot tell, because from its side the request is well-formed. If any taste-write route consumes `Swan.qs()`, this is a cross-memory write, which is exactly what the invariants forbid. The `world()` guard does not catch it: the epoch never changes; the client is simply talking to the wrong namespace. (The Atlas surfaces are immune — they use `URLSearchParams` — which proves the codebase knows the right pattern.)
Smallest fix:
```js
qs(extra = '') {
  return new URLSearchParams({ profile: this.profile, project: this.project || '' }).toString() + extra;
}
```
Then audit all `Swan.qs` call sites. Acceptance test: with `R` and `R&D` existing, every request issued while `R&D` is open must mutate/read only `R&D` (assert queue/taste files for `R` are byte-identical before/after).

**D2 — P2 — `routes-atlas.mjs:52-61` + `app-atlas.js:377-381,425` — when the catalog folder is absent, per-memory queue state becomes unreachable and uncleanable.**
Repro: rename `sources/midlibrary/` away; open Atlas. `start()` returns at `!f.present` **before** `mountInto` (line 425), so the queue panel never mounts; even direct `GET /api/atlas/queue` returns 503 from the absent gate. An owner with 40 queued styles can neither view nor clear them until the folder is restored. Queue state is per-memory and does not depend on the catalog; only `queueAdd` legitimately needs it (and fails correctly with "unknown style").
Smallest fix: move the queue GET/POST (and compose) route blocks above the `!atlas.present` gate; mount the queue panel before the facets check. Acceptance test: catalog absent → queue panel renders, GET/clear/remove return 200, add returns 400 "unknown style".

**D3 — P2 — `app-atlas-queue.js:145-152` — a compose invalidated by a queue change is silently dropped, leaving "Composing…" stuck or a silently lost result.**
Repro: click Compose, then click a queue ✕ before the response. `act()` bumps `queueSeq`; the guard `queueVersion !== queueSeq` drops the response. If the remove succeeded, `paint()` replaced the draft box (result silently lost); if the remove failed server-side (no repaint), the box shows "Composing…" forever.
Smallest fix: in the drop branch, clear the stale placeholder if still attached:
```js
if (world.changed() || queueVersion !== queueSeq || seq !== composeSeq) {
  if (host?.contains(out) && out.firstChild) out.innerHTML = '';
  return;
}
```
Acceptance test: scripted remove during in-flight compose → draft box is idle within one tick; no persistent "Composing…".

**D4 — P2 — `atlas-queue.mjs:42-46` (and `composeDraft` guard at `:159-161`) — fail-closed for partner/client exists only at the HTTP layer.**
`guard()` admits any `PROFILES` entry with an existing project. `composeDraft('client', …)` called from Node (or any future MCP/CLI surface) composes from the licensed catalog with no `corpusAccess` check. Within this packet the route gate (`routes-atlas.mjs:44-45`) holds, but the invariant "partner and client memories must fail closed" is currently enforced one layer away from the library that owns the data. Escalate to P1 if any non-HTTP entry point exists.
Smallest fix: inside `guard`, also run `corpusAccess(profile, project)` and return `{ ok:false, error: access.reason, forbidden:true }`. Acceptance test: direct Node calls to `queueAdd`/`composeDraft` for partner/client return forbidden; regression added.

**D5 — P2 — `atlas.mjs:120` vs `:216` — attribution matching shown as plain substring, contradicting the "matched whole-word" availability copy.**
`credited.some((c) => t.includes(c))` counts `"van goghesque swirls"` for credit `"van gogh"` unless token padding happens in the construction above line 120 (not shown). If unpadded, `promptCount` is inflated and the scope string at `:216` is a vacuous claim.
Smallest fix (if unpadded): match on space-padded haystack and needles (`' '+t+' '` / `' '+c+' '`), or a `\b` regex with escaping; otherwise fix the copy. Acceptance test: synthetic fixture where a credit appears only as a prefix of a longer word does not count; whole-word occurrence does.

## Claims I could not verify from the packet (verdict-changing if false — not churn, just not in evidence)

1. **`esc` escapes quotes.** Two attribute sinks depend on it: `data-queue="${esc(d.slug)}"` / `href="${esc(d.url)}"` (`app-atlas.js:319,321`) and `aria-label="Remove ${esc(e.name)}…"` (`app-atlas-queue.js:71-72`). If `esc` only handles `&<>`, catalog-sourced names are attribute-injectable. Test: a fixture style named `x" onmouseover="alert(1)` renders inert.
2. **`namespaceFrom`/`queuePath` reject `/`, `\`, `..`** in project; otherwise the lib-level `readQueue` (which skips `memoryExists`, `atlas-queue.mjs:82`) is path-traversable by direct callers.
3. **Host/Origin gates genuinely precede dispatch** (server file not shown). Test: POST with no/garbled Origin → 403 before any route code.
4. **`readBody` failures return 400 JSON**, not a throw into the handler (a throw inside these async handlers is an unhandled rejection by default on modern Node).
5. **Grid cells are focusable and Enter/Space-activatable** (render/markup not shown); the arrow-key roving code at `app-atlas.js:412-424` presumes it.

## Optional enhancements (NIT)

- `routes-atlas.mjs:37-38`: unknown `/api/atlas/*` subpaths and non-GET/POST verbs fall through as `false` → generic 404, no 405. Return explicit JSON 404/405.
- `atlas-queue.mjs:40,107-111`: `notices` grows unboundedly if a quarantined memory is never queried again. Cap the map.
- `atlas-queue.mjs:94-104`: no `fsync` before rename; post-crash a zero-length file surfaces as "unreadable and quarantined" (safe, but the message misleads). `fh.syncSync()` on the tmp if durability matters.
- `atlas.mjs:41-44`: `[^\s]+` admits control chars (e.g. `\u0001`). Harmless after `esc`, but `new URL()` + protocol check is stricter and one line.
- `atlas.mjs:159,288-291`: prefix-boost ranking is dead for native-script needles (the native haystack segment is never at position 0), so non-ASCII queries silently lose relevance ordering.
- `app-atlas.js:433`: unthrottled `render()` on resize; rAF-throttle.
- `routes-atlas.mjs:157` vs `filterRows:254`: invalid `sort` silently maps to relevance while invalid `type` is reported via `ignored` — inconsistent.
- `app-shell.js:198-202`: number-key shortcut skips `studio` and doesn't exclude `contenteditable`.

## Plain-language product summary

Style Atlas does what it says on the tin for the surfaces shown: the browser over the licensed catalog is owner-only and fails closed with a 403 before touching data; the per-memory queue is atomic, deduplicated, capped, and refuses to destroy corrupt files; the compose box produces a copyable draft and never writes taste; and every background response is checked against "is this still the same memory, the same query, the same generation" before it paints. Two things need fixing before full trust: one shared URL builder can silently aim a request at the wrong memory if a project name contains an ampersand, and when the catalog folder is missing you lose access to your own queue for reasons of routing convenience rather than necessity. One UX dead-end (stuck "Composing…") and one library-layer authorization gap round it out.

## Prioritized upgrade backlog

1. **Encode namespaces in `Swan.qs` (D1, P1).** *AT:* project `R&D` + project `R`; all requests while `R&D` is open touch only `R&D`; `R`'s files byte-identical.
2. **Fail closed inside the queue library (D4, P2).** *AT:* direct Node calls for partner/client → forbidden; regression test committed.
3. **Queue reachable without catalog (D2, P2).** *AT:* catalog absent → panel mounts; GET/clear/remove 200; add 400.
4. **Compose stale-drop cleanup (D3, P2).** *AT:* remove-during-compose leaves idle state, never stuck "Composing…".
5. **Attribution whole-word honesty (D5, P2).** *AT:* prefix-of-longer-word fixture does not count.
6. **Attribute-context escape test + Host/Origin negative tests (assumptions 1, 3).** *AT:* hostile fixture name inert in DOM; Origin-less POST → 403 at dispatch.
7. NIT batch (405, notices cap, fsync, URL parsing, native ranking, resize throttle).

## VERDICT

**REVISE** — blocked solely on D1 (one-line fix; if an audit shows no taste-writing call site uses `Swan.qs`, downgrade to APPROVE with D1 as an immediate fast-follow). D2–D4 are strong recommendations that should land in the same pass; everything else is approve-quality and I found no invariant violation on the shown HTTP surface. No request for the licensed corpus; all repros above run on the synthetic fixture.
