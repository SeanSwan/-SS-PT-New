# Swan Taste Brain — round 5: the blind spots — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-ROUND5-PANEL-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 28488 in / 14292 out | **Cost:** ~$0.0113 | **Wall:** 195.4s | **finish_reason:** stop

---

## VERDICT
REVISE — The third non-firing guard is confirmed (images.mjs:27), and the bundle payload gate (export-bundle.mjs:32) is too narrow to prove the sixth corpus door is closed, so shipment should wait for a fail-closed shareable-only assertion.

## BLOCKERS
1. P1 — Guard cannot fire: `prompter/lib/images.mjs:27` `const SREF_IN_FILENAME = /---sref-(\d{5,12})/;` uses three dashes but Midlibrary CDN URLs use `--sref-<code>` (two dashes). Input: image URL `https://…--sref-12345` → `exec` returns null → `sref` stays null for that record. This is the exact "third guard" pattern (typo'd regex cannot match what it claims). Fix: change to `/--sref-(\d{5,12})/`.

2. P1 — Sixth door (SPECULATIVE but high likelihood): `prompter/export-bundle.mjs:32` `MIDLIBRARY_RE` only matches `ml:img:|website-files.com|midlibrary-reference|midlibrary.io`. If `SHAREABLE_COLLECTIONS` (lib/projects.mjs, not provided) is mis-scoped, or a Midlibrary record's `provenance` is not exactly the string `midlibrary-reference` (e.g., trimmed/cased), the payload passes because `title`/`doc` (e.g., `tops/foo.md`, article heading) contain no forbidden token. Failing input: a `planGrids` candidate with `provenance:'Midlibrary-Reference'` and `title:'Midlibrary Style Article'` → `JSON.stringify` passes regex → bundle written with corpus subject text. Fix: fail closed by asserting every candidate provenance ∈ {unsplash,pexels,esa-webb-ccby,nasa-public-domain,local-comfy} and `sref===null` before writing.

3. P2 — XSS sink: `prompter/app-make.js:23` `<span class="tag">${p.grammar}</span>` injects `p.grammar` unescaped into innerHTML. If `/api/prompt` returns attacker-influenced grammar (or a bug echoes corpus text), script execution in the owner's browser. Fix: `Swan.esc(p.grammar)`.

4. P2 — House-rule violation (flagged per binding rules): styled-components only (no MUI) is not followed — `prompter/app.html:8-9` links `/probe.css` and `/app.css`; all `app-*.js` build DOM via `className` strings, no styled-components, no visible `var(--token,#fallback)` Crystalline Swan palette, no Dual-Button Glow, 44px touch targets not verifiable. Victory charts not used (none needed). Flag as required.

5. P2 — CLI markdown corruption: `prompter/swan-prompt.mjs:51,68,84` note/why/text written into markdown tables/files without sanitizing `|` or newlines. A `--rate 12345 5 "pipe|injected"` or multi-line note can break `taste/loved-srefs.md` parse. Not a corpus leak but data integrity.

## ATTACKS
- Correctness:
  - Happy-path-only: `app-shell.js:15` `store` swallows localStorage exceptions and returns `v`, so on private mode the memory choice silently resets to default each load (stale state).
  - Null/undefined: `probe.js:105` `generatorDistribution` falls back to `'midlibrary-reference'` when `c.provenance` is falsy, mislabeling shareable grids if a candidate lacks provenance.
  - Race: `app-judge.js:36` `judge.load(j.candidates)` can be called while a previous `record()` POST is in flight if user clicks "Same grid" quickly; `last` may be overwritten, causing undo of wrong event.
  - Off-by-one: none material.
  - Unhandled error: `app-directions.js:29` `const p = await r.json();` assumes ok shape; on `!r.ok` it still reads `p.title` (line 31) causing `undefined` render — minor.

- Security:
  - Authz/scope: client renders `d.srefs` and `proposedAvoids` (app-directions.js:39,65) and `styleName` (app-make.js:16) if server ever sends them for non-owner; no client-side refusal (relies on server).
  - Injection: XSS via `p.grammar` (above), `j.hint` into innerHTML (app-judge.js:44), `first.prefix` (app-make.js:55).
  - Multi-tenant leak: bundle gate narrow (blocker 2). Origin gate `origin.mjs:33` allows empty Origin, which is fine for CLI but if a browser ever sends `Origin: ""` (rare) it writes; low risk.
  - IDOR: project slugs guessable, but loopback-only by design.
  - Rate-limit/DoS: none.

- Data-truth / schema drift:
  - `probe.js:107` emits `gridPosition` and `provenance` keys; if server schema expects `grid_position` (snake_case) drift, events may store undefined.
  - `app-directions.js` expects `p.directions[].srefs`, `p.proposedAvoids`, `p.picks[].generated` – frontend response-shape drift would silently hide corpus flags.
  - `images.mjs` uses `collection` strings `'tops','guides','focus'`; `export-bundle.mjs` uses `SHAREABLE_COLLECTIONS` set from `lib/projects.mjs` (unseen) – if names drift, filter passes Midlibrary.
  - `corpus.mjs` reads `style_name`, `example_prompt` (snake) but `images.mjs` records use `title` – consistent.

## HIGHEST RISK
The bundle payload gate (`export-bundle.mjs:32` + `buildBundle` line 62). It is the only barrier preventing Midlibrary article text/title from riding a physically shared HTML file off-machine, and it only matches four literal strings. Cheapest de-risk before ship: in `planGrids`/`buildBundle`, after building `payload`, assert `payload.grids.every(g => g.candidates.every(c => c.sref === null && ['unsplash','pexels','esa-webb-ccby','nasa-public-domain','local-comfy'].includes(c.provenance) && !/^(tops|guides|focus)\//.test(c.doc)))` and throw otherwise. This fails closed regardless of regex typos or provenance casing.

## CONFIDENCE
Could NOT verify from document alone:
- Server-side `/api/prompt`, `/api/probe`, `generateOne`, `tally`, `keepFor`, `mintIntent` enforcement (rounds 3-4 claimed fixed, but not in this packet). Cannot confirm non-owner memories never receive `sref`/`styleName`.
- Content of `lib/projects.mjs` (`SHAREABLE_COLLECTIONS`, `SHAREABLE_MIX`) and `bundle.html` template – needed to prove the bundle excludes Midlibrary.
- Whether `probe.css`/`app.css` use Crystalline Swan palette `var(--token,#fallback)` and 44px targets (house rule).

What I checked and found sound:
- Origin gate (`origin.mjs`) correctly refuses cross-origin writes with proper Origin; empty Origin allowed only for non-browser, matching design.
- `import-bundle.mjs` `checkResults` enforces `channel:'bundle'`, witness match, and `validateEvent` before POST – no obvious bypass.
- `app-judge.js` reversal event strips candidate data to `{id}` only – no corpus fields replayed.
- `probe.js` `labelFor` and `mediaFor` use textContent/attribute assignment, not innerHTML – no XSS from candidate title/credit there.
- The CLI argv `--` dropping prevents flag injection into rating/note.

Settling evidence: provide `lib/projects.mjs`, server route handlers, and `bundle.html`; then I could confirm APPROVE.
