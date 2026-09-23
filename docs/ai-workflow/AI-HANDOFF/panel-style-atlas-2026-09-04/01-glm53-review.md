# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 39133 in / 27490 out (reasoning: 15632) | total 66623
**Wall:** 497.8s

---

# ATLAS REVIEW — BUILD-AUTHORITY PACKET

Reviewer scope: the full sanitized diff. Every line of every hunk was read. Nothing was run, edited, committed, or deployed, per mandate. Claims about files **outside** the diff (`app-shell.js` internals, `lib/brain.mjs`, `lib/projects.mjs`, `lib/generate.mjs` `rngFrom`, `serve.mjs` gates, `lib/catalog.mjs`, `lib/taste-namespace.mjs`, `probe.js`, `app-make.js`, Judge) are classified **UNPROVEN** or **BLOCKED**, never assumed. Line numbers for new files refer to their positions in the new-file hunks; where counted, they are exact.

---

## PART 1 — VERDICT AND PRIORITIZED FINDINGS

### Overall verdict: **NO-GO — REVISE**

Ship-blockers exist in two families: (a) the test suite **destroys live user state** while its own headers claim read-only, and (b) the **memory-switch boundary leaks licensed content and cross-memory state** through three distinct unguarded paths. Neither is theoretical; both are reproducible by inspection of the diff alone.

### 1.1 Verdicts on the eight GPT-5.6 claims (independently verified, not accepted)

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| 1 | P0 memory-switch leak | **VERIFIED** (3 mechanisms) | See F2 |
| 2 | Stale-query overwrite | **VERIFIED** | See F3 |
| 3 | Destructive tests | **VERIFIED** (2 files contradict their own headers) | See F1 |
| 4 | Seed collision | **UNPROVEN as stated; REVISE adjacent** | Determinism for identical candidate set is real and tested (`test-atlas.mjs` "the SAME seed over the SAME candidate set repeats exactly"). Divergence after exclusion is documented intended behavior (`lib/atlas.mjs`, `randomStyles` docstring). But: the route accepts seeds up to 10 digits (`routes-atlas.mjs` `/^\d{1,10}$/`) while the generator draws from `2**31` — `rngFrom` behavior above 2³¹−1 is **UNPROVEN** (module not in diff) — and the UI has **no replay affordance** despite the comment "a roll worth keeping can be repeated" (`app-atlas-queue.js` surprise docstring). See F8. |
| 5 | Missing provenance handoff | **VERIFIED** | See F4 |
| 6 | Corrupt-queue fail-open | **VERIFIED behavior; REVISE severity upward** | See F7 — fail-open read is tested intent, but the next write silently overwrites the corrupt file and writes are non-atomic |
| 7 | Accent/non-Latin search defects | **VERIFIED** | See F5 |
| 8 | Incomplete accessibility proof | **VERIFIED** | See F6 |

### 1.2 Findings, prioritized

---

#### **F1 — P0 — The test suite destroys Sean's live default-namespace queue**

- **Evidence:**
  - `prompter/test-atlas-routes.mjs`, header (≈L7–13): *"Read-only. Calls the handler directly…"* — contradicted by its own body at the "The queue over the wire" section: `await call('/api/atlas/queue', 'POST', { action: 'clear' })` (≈L96), followed by `add` (`jan-mankes`), `remove`, and a compose. The `call()` helper builds URLs from the bare path with **no profile/project parameters**, so `namespaceFrom` resolves these to the default namespace, and `lib/atlas-queue.mjs` `queuePath` maps the default namespace to `taste/atlas-queue.json` — Sean's real, gitignored, persistent workbench file.
  - `prompter/test-browser-atlas.mjs`, header (≈L14–15): *"READ-ONLY: navigates and queries. Creates no project and writes no taste file."* — contradicted by ≈L160 onward: `#atlasQClear` click, detail `+ Queue` click, `#atlasQCompose`, two `#atlasQSurprise` clicks, clear, re-add, chip-remove. Every one is a POST against the default namespace queue.
- **Reproduction:** queue five styles in the running app as Sean. Run `npm test`. `taste/atlas-queue.json` is cleared at `test-atlas-routes` ≈L96 and left empty; `test-browser-atlas` repeats the destruction. No snapshot, no restore, no throwaway namespace.
- **Classification:** VERIFIED. Data loss in the developer's own workbench on every test run.
- **Smallest fix (no code written):** repoint every queue-mutating call in both files at a throwaway project namespace created and deleted exactly as `test-atlas-queue.mjs` ≈L46–48 already does; add a before/after byte-identity assertion on `taste/atlas-queue.json` to both files; delete the word "Read-only" from both headers or make it true.

---

#### **F2 — P0 — Memory-switch leak: licensed grid, cached pages, and open detail panel survive a switch to a memory forbidden the archive**

- **Evidence:**
  1. `prompter/app-atlas.js` registers **no** `window.Swan.onMemory` handler anywhere in its 362 lines. `state.pages` (the page cache), `state.total`, `state.open`, and the rendered `#atlasDetail` panel — which contains biography prose and real prompts from the licensed Midlibrary corpus — all persist across a memory switch. The queue module handles its own memory (`app-atlas-queue.js` final lines ≈L125–127: `onMemory(() => { queue = []; paint(); load(); })`); the grid module does not.
  2. Switching Sean → partner/client leaves the entire licensed catalog on screen under a memory that `routes-atlas.mjs` (≈L36–44) would refuse any fresh request for, with 403, "before a single catalog row is touched." The route gate is correct; the client-side lifecycle makes it cosmetic.
  3. `app-atlas-queue.js` `load()` (L26–32, counted exactly) has **no** `world.changed()` guard — unlike `act()` (L37), `surprise()` (L88), and `compose()` (L105), which all capture `window.Swan.world()` and discard on change. Two rapid switches → two in-flight loads → last response to arrive wins, which can be the **older** memory's queue.
- **Reproduction:** as Sean, open Atlas, open a detail panel, scroll deep (pages cached). Switch memory to a partner project. The grid, cached pages, count, and the open biography remain rendered. For the queue: switch memory A→B→A quickly; the B-targeted load from the first switch can land after A's, painting the wrong workbench.
- **Classification:** VERIFIED. The own-material law is enforced on the wire and defeated on the screen.
- **Smallest fix:** in `app-atlas.js`, register the same `onMemory` hook the queue module registers, doing: clear `state.pages`, `state.pending`, reset `state.total`, `state.lastWindow`, `closeDetail()`, and — only if `started` — re-run `requery()`; in `app-atlas-queue.js` `load()`, add the world-token guard already present three functions away (capture before the `await`, discard the response if changed).

---

#### **F3 — P1 — `requery()` has no stale-response guard**

- **Evidence:** `prompter/app-atlas.js`, `requery()` (≈L93–107): awaits `/api/atlas`, then unconditionally writes `state.total`, `state.pages.set(0, …)`, resets `scroller.scrollTop`, calls `paintCount` and `render`. No world capture. Contrast `fetchPage()` (≈L75–91) which *does* guard. Also: the 140 ms debounce (`onQueryChange`) can fire `requery` after a memory switch; `qs()` reads the namespace at call time, so authorization is fine, but a stale response can still overwrite the post-switch render.
- **Reproduction:** type a query, immediately press the memory-switch control; the pre-switch response lands and repaints the count and page zero over the new memory's view.
- **Classification:** VERIFIED (missing guard, same family as F2.3 but in the grid module).
- **Smallest fix:** the identical one-line-pattern guard used in `fetchPage`.

---

#### **F4 — P1 — Provenance handoff does not exist end-to-end**

- **Evidence:** `lib/atlas-queue.mjs` `composeDraft` returns `provenance: 'atlas-queue'` with the comment "The tag the Judge reads" (≈L128–130). But:
  1. The only consumer in the entire diff is the **display string** `provenance: ${esc(d.provenance)}` in `app-atlas-queue.js` ≈L112.
  2. The copy action (≈L115) copies `d.draft` **only** — the tag never leaves the panel.
  3. Nothing in `app-make.js`, the Judge section, or any persistence path appears in the diff; the claim that the Judge reads this tag is **UNPROVEN** and, on the evidence of this diff, false by absence.
- **Reproduction:** compose a draft, copy it, paste into Make, save, judge it. At no point does the string `atlas-queue` exist in any store the Judge could read.
- **Classification:** VERIFIED gap (the comment asserts a consumer that is not shown to exist); the Judge-side contract is **BLOCKED** pending `app-make.js`/Judge source.
- **Smallest fix:** either (a) wire the handoff — Make's paste/save path records a provenance field when the saved text matches an Atlas draft's exact string, and the Judge reads that field — specified fully in Part 2, B-4; or (b) delete the "tag the Judge reads" comment until (a) exists. (a) is a vision requirement; see blueprint.

---

#### **F5 — P1 — `norm()` is ASCII-only: accented and non-Latin names are mangled and unfindable**

- **Evidence:** `lib/atlas.mjs` `norm` (≈L30): lowercases, then replaces every character outside `[a-z0-9]` with a space. Consequences, all mechanical:
  - "José" → searchable token `jos` (the é becomes a separator, then `trim` eats it). A user typing `jose` (ASCII) searches for `jose`, which `jos` does not contain → miss. Typing `josé` → needle `jos` → matches `jos`, `josh`, `joseph` → noise. Both directions broken.
  - Every Cyrillic, CJK, Arabic, Devanagari name in a 163-country catalog collapses to spaces; those rows' `search` strings become essentially just their slugs. Searching the artist's actual name is impossible.
  - The same `norm` feeds the relevance prefix logic (`sortRows`, `startsWith`) and `attributePrompts` matching — an accented credit in a real prompt ("by José…" → `by jos ` with a trailing split token) will **not** match the phrase grammar ` by josé ` because both sides mangle differently ("jos" vs "jos s"-shaped artifacts).
- **Reproduction:** query `q=jose` vs a catalog row `José …`; query any kanji/kana name; note the data audit itself lists Japan (394) and Russia (92) among top countries.
- **Classification:** VERIFIED. The GPT-5.6 claim is correct and is not covered by any existing test (the search tests use `mankes`, `crivelli`, `f332016` — pure ASCII).
- **Smallest fix:** extend `norm` (or add a second fold used to build `search`) to (1) NFD-decompose and strip combining marks before the ASCII squeeze, and (2) append a case-folded, non-stripped copy of the name to each row's `search` string so non-Latin names remain substring-matchable; keep the slug arm unchanged. Exact spec in Part 2, B-5.

---

#### **F6 — P1 — Accessibility: focus destruction on re-render, unannounced results, unproven live regions, zero a11y test coverage**

- **Evidence:**
  1. **Focus loss:** `app-atlas.js` `render()` replaces `grid.innerHTML` wholesale on every window change. A focused cell (all cells are `<button>`s) inside the replaced range is removed from the DOM; focus resets to `<body>`. Repro: click a cell near the window's bottom edge, press Tab (which triggers scroll → render → rebuild), continue tabbing — focus has evaporated.
  2. **Compose results unannounced:** `#atlasQDraft` (`app-atlas-queue.js` ≈L69, ≈L97–115) is a plain div; the "Composing…" swap and the final draft are invisible to assistive tech. The surprise result relies on `window.Swan.say` → `#shellsay` — whether that element is a live region is **UNPROVEN** (`app-shell.js` not in diff).
  3. **Label-in-name mismatch:** visible label "Shape", `aria-label="Aspect ratio"` on `#atlasQAr` (`app-atlas-queue.js` ≈L65–66) — WCAG 2.5.3 failure class.
  4. **Detail panel focus/viewport:** opening a detail below a 70vh (64vh mobile) scroller neither moves focus nor scrolls the panel into view; on a phone the panel can open entirely off-screen. `aria-live="polite"` on the aside may partially compensate for SR users but not for sighted keyboard users.
  5. **Test coverage:** `test-browser-atlas.mjs` contains **no** keyboard-traversal assertion, no screen-reader assertion, no contrast check, no reduced-motion check. The only a11y-adjacent checks are the 44px button height (queue button) and control presence.
- **Classification:** VERIFIED (defects 1–4 by inspection; 5 by absence). "Incomplete accessibility proof" confirmed.
- **Smallest fix per defect:** (1) preserve focus across rebuild by keying the window to a stable anchor and restoring focus to the cell with the same slug after innerHTML swap, or move focus management to a roving-tabindex pattern specified in Part 2, B-6; (2) mark `#atlasQDraft` `role="status"` `aria-live="polite`; (3) make visible text and accessible name agree (use "Aspect ratio" as the visible label or drop the aria-label); (4) on open, scroll the panel into view and move focus to the panel close button (which is already a 44px target). Full spec Part 2.

---

#### **F7 — P1 — Corrupt queue: fail-open read is by design, but the write path destroys evidence and invites the corruption**

- **Evidence:** `lib/atlas-queue.mjs`:
  - `readQueue` (≈L52–63): parse failure → `[]`; entries without string `slug` silently dropped. Codified by `test-atlas-queue.mjs` ("A corrupt queue file degrades to empty rather than throwing").
  - `write` (≈L65–68): direct `writeFileSync`, **no temp-file-then-rename**. A crash mid-write produces exactly the truncated JSON that `readQueue` then silently treats as empty.
  - First mutation after corruption **overwrites** the corrupt file — the user's only copy of whatever partial state existed is destroyed with no quarantine and no message.
- **Reproduction:** kill the process during a queue write; restart; the queue is silently empty and the next add erases the corpse.
- **Classification:** VERIFIED behavior; the GPT-5.6 "fail-open" framing is real but understated — it is fail-open **read** plus fail-destructive **write**.
- **Smallest fix:** (1) atomic write: write to a sibling temp path then `rename` (Node rename is atomic on POSIX/Windows same-volume); (2) on parse failure in `readQueue`, rename the corrupt file to a timestamped `.corrupt` sibling before returning `[]`, and surface one `say()`-style notice. Spec Part 2, B-7.

---

#### **F8 — P2 — URL scheme trust: catalog `url` rendered as an href with no scheme validation**

- **Evidence:** `app-atlas.js` `openDetail`: `<a href="${esc(d.url)}" target="_blank" rel="noreferrer noopener">`. `esc()` (implementation **UNPROVEN**, `app-shell.js` not in diff) defeats HTML injection, not URI schemes. The catalog is a local licensed file, but it is an external dataset: a tampered or future-scraped row carrying `javascript:…` executes on click. This is the single unvalidated external string in the render path — every other sink escapes data; this one needs a *scheme* check, which escaping cannot provide.
- Also note `data-audit.md` §3 confirms `url` is present on 100% of rows but the audit never validates scheme/host shape.
- **Classification:** VERIFIED risk-class (defense-in-depth gap), conditional on a hostile/mutated catalog; **BLOCKED** from exploit-proof without a fixture injection seam (see matrix, and B-9).
- **Smallest fix:** render the anchor only when the URL matches an explicit allow-list (`http:`/`https:` origin-absolute); otherwise render the host as plain text with a stated reason. One predicate in `openDetail`, plus one audit column.

---

#### **F9 — P2 — Scrollbar lies by ~24px; the test's tolerance is engineered to not catch it**

- **Evidence:** `console-atlas.css` `.atlas-grid` has `padding: 12px` (top and bottom). `app-atlas.js` `render()` computes spacer height as `rowsTotal*(CELL_H+GAP)-GAP` and offsets the grid by `translateY(firstRow*(CELL_H+GAP))` — neither accounts for the 12px top padding under the transform nor the 24px total padding inside the spacer. Net error ≈24px. The browser test asserts `Math.abs(spacerH - expectedH) < geom.CELL_H` — a 150px tolerance that cannot see a 24px lie. The CSS file's own header calls these constants load-bearing and claims a mismatch "fails a check"; the check as written does not fail it.
- **Classification:** VERIFIED arithmetic defect; cosmetic severity; test-tolerance defect is the worse half.
- **Smallest fix:** exclude padding from the equation (zero the grid's own padding and express inset via the transform only), **or** include both paddings in spacer height and transform; tighten the test tolerance to `< GAP`.

---

#### **F10 — P2 — Silent swallowing of a bogus `type` filter contradicts the module's own "never silently dropped" law**

- **Evidence:** `lib/atlas.mjs` `filterRows`: the type filter applies only for the two literal values; anything else falls through as no-op with no `ignored` entry — while `country`/`era` unsupported values *do* get reported in `ignored`, and `paintCount` claims "A filter the data cannot support is stated, never silently dropped." Also the surprise route passes `body.type ?? 'all'` through unvalidated.
- **Classification:** VERIFIED inconsistency (minor).
- **Smallest fix:** treat a non-empty `type` that is neither literal as `ignored: ['type']`, mirroring country/era.

---

#### **F11 — P3 — Suite brittleness and isolation residue**

- `test-atlas.mjs` and `test-atlas-routes.mjs` hard-assert `total === 9521` with **no skip path** when `sources/midlibrary` is absent — unlike `test-browser-atlas.mjs`, which skips gracefully. `npm test` now fails (not skips) on any checkout without the licensed data.
- `test-atlas-queue.mjs` has no `try/finally` around the run; a thrown check before the final `rmSync` leaves a `zz-atlas-*` project directory behind.
- `test-browser-atlas.mjs` swallows the `#atlasQClear` click failure with `.catch(() => {})` — an instrument that hides its own failure.
- **Classification:** VERIFIED. Fixes: presence-gated skip; `finally` teardown; replace the swallowed catch with a disabled-state assertion.

---

### 1.3 Claims that did **not** survive verification

| Claim (diff prose) | Verdict |
|---|---|
| "Read-only" headers on `test-atlas-routes.mjs`, `test-browser-atlas.mjs` | **FALSE** — see F1 |
| "The tag the Judge reads" (`atlas-queue.mjs`) | **UNPROVEN/absent** — see F4 |
| "a roll worth keeping can be repeated" (surprise docstring) | **Not implementable from the UI** — seed is displayed, never re-submittable — F8/claim 4 |
| "The Host gate in serve.mjs runs before any of this" / "POST is gated above" | **UNPROVEN** — serve.mjs gates are outside the diff; must be confirmed before release (B-11) |
| "one-writer law preserved" | **VERIFIED within the diff** — no fetch to any write/make endpoint exists in either client module; compose returns text; copy only touches the clipboard; `kept`/shelf byte-identity is asserted by `test-atlas-queue.mjs` |
| "no remote image fallback / no imagery" | **VERIFIED** — `imageFor` is a constant null; no `img` element is ever emitted; no error/fallback path exists |
| "dependency-free runtime" | **VERIFIED** — `dependencies: {}` unchanged; client modules import nothing; Playwright remains dev/test-only with a skip path |
| "no Three.js on the grid" | **VERIFIED** — no such reference anywhere in the diff |

---

## PART 2 — ZERO-DECISION IMPLEMENTATION BLUEPRINT (all remaining vision requirements)

The executor makes no product decisions. Every item names the file, the exact behavioral change (described, never coded), the acceptance criterion, and its verification hook. Order is execution order; nothing here may be omitted, reordered, or interpreted.

**B-1. Memory-switch invalidation for the grid module** — `prompter/app-atlas.js`
Register one `window.Swan.onMemory` handler that performs, in order: `closeDetail()`; `state.open = null`; clear `state.pages` and `pending`; reset `state.total = 0` and `state.lastWindow = ''`; if `started` is true, invoke `requery()`. Acceptance: with the Atlas open and deep-scrolled on memory A, switching to a memory forbidden the archive leaves zero catalog rows, zero biography prose, and a zero/absent count on screen; a network-level capture shows no atlas request for the forbidden memory. Hook: new browser test M-B7.

**B-2. Stale-response guards** — `prompter/app-atlas.js` (`requery`), `prompter/app-atlas-queue.js` (`load`)
Both functions capture the world token before their first `await` and discard the response when `changed()` — byte-for-byte the pattern already in `fetchPage`/`act`. Acceptance: forced double-switch during in-flight loads never paints a queue or count belonging to the previous memory. Hook: M-B8.

**B-3. Test isolation harness** — `prompter/test-atlas-routes.mjs`, `prompter/test-browser-atlas.mjs`
Every queue-mutating operation targets a throwaway project namespace created at file start and removed in a `finally` (pattern: `test-atlas-queue.mjs` setup/teardown). Both files gain a pre/post byte-identity snapshot assertion over `taste/atlas-queue.json`. The browser test drives the throwaway namespace by navigating with explicit profile/project query parameters (the same mechanism the routes already parse). Acceptance: running the full suite with a non-empty Sean queue leaves that file byte-identical. Hook: M-T1.

**B-4. Provenance handoff (the vision requirement the diff asserts but does not build)**
- 4a — `prompter/app-atlas-queue.js`: the copy action copies the draft text exactly as today (no format change; the clipboard stays plain text). *(Decision already made by the one-writer law: no direct write into Make.)*
- 4b — Make side (`app-make.js` + its route, **BLOCKED on source until the executor reads them; the behavior contract is fixed here**): when a prompt is saved whose text exactly equals a draft previously returned by `/api/atlas/compose` in this session, the saved record carries `provenance: 'atlas-queue'`. Session-scoped memo only — no new persistent store, no background matching.
- 4c — Judge side (same BLOCKED-on-source caveat): when judging a saved prompt carrying `provenance: 'atlas-queue'`, the Judge displays the tag; it does **not** alter scoring, exclusion, or steering. Acceptance: end-to-end test M-T9 observes the tag in the Judge view after compose→copy→paste→save→judge, and asserts steering files are byte-identical throughout.
- If and only if 4b/4c source inspection shows no field exists to carry it, the executor adds the field with the exact name above and stops — no design latitude.

**B-5. Search normalization** — `prompter/lib/atlas.mjs`
Extend exactly one function (`norm`) or add exactly one companion fold, used to build each row's `search` string and to fold the query needle: (i) Unicode NFD, strip combining marks, then the existing ASCII squeeze (so `José` → `jose`, searchable both ways); (ii) each row's `search` additionally contains a case-folded but **non-stripped** copy of the name so non-Latin names remain substring-matchable. The attribution grammar in `attributePrompts` is rebuilt on the same fold for its haystack side only. No other matching semantics change. Acceptance: M-T10 rows (José-type fixture matches both `jose` and `josé`; a kanji-name fixture is findable by its name; noise check: `jos` no longer cross-matches `josh` more than substring semantics already allow). Note: real-catalog fixtures are impossible without mutating licensed data — the executor uses the injection seam of B-9.

**B-6. Accessibility completion** — `prompter/app-atlas.js`, `prompter/app-atlas-queue.js`, `prompter/console-atlas.css`
- Roving tabindex over the virtualized grid: exactly one cell in the mounted window carries `tabindex="0"` (the previously focused slug if present, else the first); all others `tabindex="-1"`; ArrowLeft/Right/Up/Down move focus by cell/row within the window and scroll the scroller as needed; Home/End go to window start/end. The scroll container keeps `role="group"` plus `aria-label`; cells keep their accessible names.
- Focus preservation across re-render: after any innerHTML rebuild, if the previously focused slug is in the new window, restore focus to it; otherwise to the roving anchor.
- `#atlasQDraft` becomes `role="status"` with `aria-live="polite"`.
- `#atlasQAr`: visible label text changes to "Aspect ratio" (or the aria-label is removed — the executor picks the first, which is stated here: change the visible label; delete the aria-label).
- Detail open: panel is scrolled into view and focus moves to its close button; close returns focus to the originating cell.
- Acceptance: M-A1–M-A8.

**B-7. Queue write durability** — `prompter/lib/atlas-queue.mjs`
`write` becomes temp-file + same-directory rename. `readQueue` on parse failure renames the offending file to `atlas-queue.corrupt-<ISO-timestamp>.json` in the same directory before returning `[]`, and the route layer includes a one-time notice field in its next response (`notice: 'queue file was unreadable and has been quarantined'`), which `act`/`load` surface via `window.Swan.say`. Acceptance: M-F4, M-F5.

**B-8. Seed replay + validation** — `prompter/lib/routes-atlas.mjs`, `prompter/app-atlas-queue.js`
Route: reject (400) any seed outside `[0, 2147483647]` instead of accepting 10-digit values with undefined `rngFrom` behavior. UI: the success message's seed becomes a control (a button on the message/queue head: "replay seed N") that re-POSTs `/api/atlas/surprise` with that seed and **no** exclusion — reproducing the roll only when the queue is in the pre-roll state, which is the documented contract (atlas.mjs docstring). The button is disabled whenever the queue differs from the post-roll state. Acceptance: M-T11 (same seed + same queue-state ⇒ identical picks, asserted through the UI).

**B-9. Fixture injection seam (test infrastructure only)** — `prompter/lib/atlas.mjs`
`loadAtlas` accepts an optional sources-root parameter (default: today's constant path) threaded to `readOptional`; `resetAtlas()` unchanged. No env vars, no globals. This is the *only* change that makes F8 (URL scheme), B-5 (Unicode), and audit additions testable without touching licensed data. Acceptance: M-F6, M-T10 run against a `test/fixtures/atlas-*` tree.

**B-10. URL scheme guard** — `prompter/app-atlas.js` (`openDetail`)
The Source-page anchor renders only for `http`/`https` absolute URLs; otherwise the row renders the host as plain text with the reason "untrusted link shape." Acceptance: M-F6 with a fixture row whose `url` is `javascript:alert(1)` — no anchor is emitted.

**B-11. Release blockers to verify against out-of-diff source (executor checklist, no latitude):** (a) `serve.mjs` Host gate and POST write gate exist and run before `handleAtlasRoutes`; (b) `namespaceFrom` default resolution matches `window.Swan.profile`/`project` exactly, including empty-string project; (c) `window.Swan.world().changed()` semantics cover memory switch; (d) `Swan.esc` escapes `<>&"'`; (e) `#shellsay` is a live region; (f) `projectDir` layout places project queues under a path the new `.gitignore` patterns actually cover; (g) `rngFrom` domain; (h) `catalogInsert` emits `by <name>` for person-shaped and bare name otherwise. Each is PASS/FAIL; any FAIL halts release and files a finding.

**B-12. Scrollbar exactness** — `prompter/console-atlas.css` + `prompter/app-atlas.js` + `prompter/test-browser-atlas.mjs`
Remove the grid's own vertical padding from the equation (grid padding collapses to horizontal-only; vertical inset expressed solely via the transform and spacer arithmetic), and tighten the browser-test spacer tolerance from `< CELL_H` to `< GAP`. Acceptance: M-B9.

**B-13. Audit additions** — `prompter/audit-catalog.mjs`, regenerate `docs/atlas/data-audit.md`
Add: slug uniqueness count across `all_styles.json` (0 duplicates expected; a duplicate is a P1 finding, since `bySlug` Map silently last-wins); URL scheme histogram (only http/https); `withCollections` count published. No other audit changes.

**B-14. Suite brittleness** — B-3 plus: presence-gated SKIP (exit 0 with printed SKIP) in `test-atlas.mjs`/`test-atlas-routes.mjs` when `loadAtlas().present` is false; `finally` teardown in `test-atlas-queue.mjs`; replace the swallowed `#atlasQClear` catch with an explicit disabled-assertion.

---

## PART 3 — PRODUCTION WIREFRAME

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ header: status (#shellsay, live region — B-11e)                              │
├──────┬───────────────────────────────────────────────────────────────────────┤
│ rail │ #tab-atlas (role=tabpanel)                                            │
│ …    │ ┌ atelier-heading (static markup; JS renders BESIDE, never over) ───┐ │
│ [4]  │ │ "Every style, browsable."                                          │ │
│      │ └────────────────────────────────────────────────────────────────────┘ │
│      │ #atlasBody                                                               │
│      │ ┌ filter bar ────────────────────────────────────────────────────────┐ │
│      │ │ [search q ⌕120] [Kind ▾] [Country ▾]* [Born from–to]* [Sort ▾]    │ │
│      │ │                                                [Clear]           │ │
│      │ │ * rendered ONLY if facets.availability.*.supported === true        │ │
│      │ │   NO tag control — ever (data-unsupported; see Part 6)             │ │
│      │ ├ #atlasCount: "<b>N</b> of 9,521 · 4,016 carry no artist metadata" ┤ │
│      │ ├ .atlas-note: why tags/sref-code are absent (stated, not silent)    │ │
│      │ ├ #atlasScroll (tabindex=0, roving tabindex per B-6) ───────────────┤ │
│      │ │ │ .atlas-spacer (true height = f(total, cols, CELL_H, GAP))        │ │
│      │ │ │ ┌ .atlas-grid (translated window, ONLY visible rows mounted) ──┐ │ │
│      │ │ │ │ [cell][cell][cell]   cell = <button> 150px, name-led while    │ │ │
│      │ │ │ │ [cell][cell][cell]   imageless; ▨ placeholder; sref = dashed  │ │ │
│      │ │ │ │ [cell][cell][cell]   border; loading = dotted, aria-hidden    │ │ │
│      │ │ │ └───────────────────────────────────────────────────────────────┘ │ │
│      │ ├ #atlasDetail (aside; hidden until a cell opens; Esc/✕ closes) ────┤ │
│      │ │ │ name · lifetime · countries · collections                        │ │
│      │ │ │ biography (plainText, escaped) · optimal prompt                  │ │
│      │ │ │ "Real prompts that credit this style" (attribution-marker only)  │ │
│      │ │ │ "Not in local data: …" (explicit missing list)                   │ │
│      │ │ │ [ + Queue ]  [ Source page ⇗ (http/https only, B-10) ]           │ │
│      │ ├ #atlasQueue (workbench) ──────────────────────────────────────────┤ │
│      │ │ │ Queue n/40   [Surprise me][Clear]                                 │ │
│      │ │ │ (chip ✕)(chip ✕)(chip ✕)…  or  "Empty. Open a style and +Queue." │ │
│      │ │ │ [Subject ⌕200][Aspect ratio ▾][Compose draft]                     │ │
│      │ │ │ #atlasQDraft (role=status): draft <code> · provenance: atlas-    │ │
│      │ │ │   queue · unresolved names (warn) · [Copy draft] · draft-note    │ │
│      │ └────────────────────────────────────────────────────────────────────┘ │
└──────┴───────────────────────────────────────────────────────────────────────┘
States (exclusive): LOADING CATALOG → first enter only | CATALOG ABSENT (#atlasBody
states the reason) | FORBIDDEN (403 → readable refusal; grid untouched) | EMPTY
RESULT ("Nothing matches…") | QUEUE FULL (cap refusal message) | CORRUPT QUARANTINED
(B-7 notice). Memory switch (B-1): detail closed, pages cleared, count reset.
Responsive: ≤640px — search and era rows go full-width, scroller 64vh, detail
scrolls into view on open (B-6). Reduced motion: hover transforms disabled (already present).
```

---

## PART 4 — FLOWCHART (memory switch → grid → detail → queue → Make → Judge)

```mermaid
flowchart TD
  MS[Memory switch pressed] --> OM[onMemory handlers fire]
  OM --> QCLR[queue module: queue = [] · paint · load]
  OM --> ACLR[B-1 grid module: closeDetail · clear pages/total · requery]
  QCLR --> QLD{load resolves}
  QLD -- "world.changed()" --> DROP1[discard response]
  QLD -- same world --> QPAINT[paint this memory's queue]
  ACLR --> GATE{corpusAccess<br/>profile, project}
  GATE -- forbidden --> F403[403 readable refusal<br/>zero catalog rows on screen]
  GATE -- Sean --> FAC[GET /api/atlas/facets]
  FAC --> BUILD[build controls from measured availability<br/>tags & sref-code NEVER rendered]
  BUILD --> REQ[requery: GET /api/atlas page 0<br/>B-2 world guard on response]
  REQ --> VIRT[virtualized render: spacer = truth<br/>only visible rows mounted<br/>pages fetched on demand]
  VIRT -->|scroll| VIRT
  VIRT -->|click cell| DETAIL[GET /api/atlas/style<br/>guard: world + state.open]
  DETAIL --> QADD[+ Queue → POST /api/atlas/queue add<br/>catalog-validated slug · dedupe · cap 40]
  DETAIL -->|copy nothing yet| SURP[Surprise me → POST /api/atlas/surprise<br/>seed ∈ 0..2³¹−1 · excludes queued]
  SURP -->|same seed + same queue state| SURP
  QADD --> COMP[Compose draft → POST /api/atlas/compose]
  COMP --> DRAFT[draft text + provenance: atlas-queue<br/>NOT a prompt · writes nothing]
  DRAFT --> COPY[Copy draft → clipboard only]
  COPY --> MAKE[Paste into Make<br/>ONE WRITER: app-make saves the prompt<br/>B-4b records provenance on exact-match]
  MAKE --> JUDGE[Judge scores it<br/>B-4c shows the tag · no scoring change]
  QADD -.->|kept.md / shelf.md| UNTOUCHED[byte-identical — queueing is not keeping]
  DRAFT -.->|never| COMFY[ComfyUI — no Atlas path may queue renders]
  style F403 fill:#fdd
  style COMFY fill:#fdd
  style UNTOUCHED fill:#dfd
```

---

## PART 5 — EXHAUSTIVE TEST MATRIX

Legend: **Ctl** = control type (P positive, N negative, F fault-injection, A accessibility, V viewport, I invariant). **Status**: EXISTS (in diff, adequate) / WEAK (exists, insufficient) / NEW (blueprint B-n).

### 5.1 Index (`test-atlas.mjs`)

| ID | Ctl | Stimulus | Expected | Status |
|---|---|---|---|---|
| I-1 | P | loadAtlas with real sources | present, 9521, 5505/4016 split | EXISTS |
| I-2 | P | attribution `carlo-crivelli` | count>0; every prompt matches `by/style-of/possessive` grammar | EXISTS |
| I-3 | N | genre names `anime-style`, `close-up-portrait`, `haute-couture-fashion` | promptCount exactly 0 | EXISTS |
| I-4 | N | `sort=popular` monotonicity; views-leader ≠ popular-leader | holds | EXISTS |
| I-5 | I | limit=99999 | ≤500 rows, total unchanged | EXISTS |
| I-6 | N | offset past end | 0 rows, true total | EXISTS |
| I-7 | P | seed 12345 twice, identical candidate set | identical picks | EXISTS |
| I-8 | N | different seed | different picks | EXISTS |
| I-9 | P | exclude=queued set | excluded reported; none returned | EXISTS |
| I-10 | P | 120-seed metadata sample | >75% hasDetail; zero-collection row still reachable | EXISTS |
| I-11 | N | exhausted candidates | ok=false | EXISTS |
| I-12 | **N** | seed = 2147483648 and 9999999999 | **today: undefined; NEW: 400/route rejection** | NEW (B-8) |
| I-13 | **N** | bogus `type=garbage` | **today: silently 'all'; NEW: ignored:['type']** | NEW (B-10/F10) |
| I-14 | **N** | sources absent | **NEW: SKIP exit 0 with printed reason** | NEW (B-14) |
| I-15 | **P** | duplicate slugs in fixture | **NEW: uniqueness assertion (audit)** | NEW (B-13) |

### 5.2 Search & Unicode (fixture-backed via B-9)

| ID | Ctl | Stimulus | Expected | Status |
|---|---|---|---|---|
| S-1 | P | `jose` vs fixture row `José …` | row found | NEW (B-5/F5) |
| S-2 | P | `josé` (precomposed and NFD forms) | same row found; no broader `jos*` noise beyond substring semantics | NEW |
| S-3 | P | kanji/Cyrillic name fixture | found by its actual name | NEW |
| S-4 | N | accented credit `by José` in fixture prompt | attribution matches after fold | NEW |
| S-5 | I | every fixture row's search string contains folded name | holds | NEW |

### 5.3 Routes & wire (`test-atlas-routes.mjs`)

| ID | Ctl | Stimulus | Expected | Status |
|---|---|---|---|---|
| R-1 | P | Sean default grid/facets/style | 200 | EXISTS |
| R-2 | N | client & partner × {grid, facets, style, queue GET, queue POST, compose} | 403 + forbidden:true + human reason | EXISTS |
| R-3 | N | invalid profile | 400 before corpus touched | EXISTS |
| R-4 | N | unknown subpath / wrong method / DELETE | not handled (falls through) | EXISTS |
| R-5 | I | limit=99999, negative paging, junk numerics | capped / clamped / defaults | EXISTS |
| R-6 | N | unknown action, unknown slug | 400 | EXISTS |
| R-7 | P | compose shape, empty-queue 400 | as asserted | EXISTS |
| R-8 | **I** | **Sean's `taste/atlas-queue.json` before/after full suite** | **byte-identical; all mutations on throwaway ns** | NEW (B-3/F1) |
| R-9 | N | queue actions on nonexistent project | 400/unknown project | EXISTS (lib-level) |
| R-10 | **N** | seed out of 32-bit range via route | **400** | NEW (B-8) |

### 5.4 Queue library (`test-atlas-queue.mjs`)

| ID | Ctl | Stimulus | Expected | Status |
|---|---|---|---|---|
| Q-1 | P | add real slug; fields suffice for chip render | ok, name/type/addedAt | EXISTS |
| Q-2 | N | duplicate add; unknown slug; unknown project/profile | duplicate / refused / refused | EXISTS |
| Q-3 | I | add+remove | byte-identical restore | EXISTS |
| Q-4 | I | kept.md/shelf.md across full cycle | byte-identical; no project kept.md created | EXISTS |
| Q-5 | P | cap reached with REAL slugs (positive control on the fixture itself) | refuses at 40; removal re-opens | EXISTS |
| Q-6 | F | unparseable JSON; entries lacking slug | empty / filtered | EXISTS |
| Q-7 | **F** | **corrupt file + subsequent add** | **NEW: corrupt file quarantined as `.corrupt-<ts>` sibling, notice surfaced, not overwritten** | NEW (B-7/F7) |
| Q-8 | **F** | **process kill during write (simulated by temp-file assertion)** | **NEW: no truncatable target; rename-only publish** | NEW |
| Q-9 | I | teardown in `finally` even on failure | no `zz-atlas-*` residue | NEW (B-14/F11) |

### 5.5 Browser UI (`test-browser-atlas.mjs`)

| ID | Ctl | Stimulus | Expected | Status |
|---|---|---|---|---|
| B-1 | P | /atlas loads, cells mount, section displayed (computed style) | holds | EXISTS |
| B-2 | I | mounted cells « corpus, before and after deep scroll | <200 mounted | EXISTS |
| B-3 | I | CSS cell height == JS constant (via `window.SwanAtlas`) | equal | EXISTS |
| B-4 | I | spacer height vs derived expectation | **WEAK: tolerance ±150 masks the 24px padding lie → tighten to ±GAP** | WEAK→NEW (B-12/F9) |
| B-5 | N | no tag control; note states why; country+era present | holds | EXISTS |
| B-6 | P/N | search → narrow; type; Clear restores 9,521 + empties input | holds | EXISTS |
| B-7 | **N** | **Sean grid deep-scrolled + detail open → switch to partner memory** | **NEW: detail closed, grid cleared, count reset, no licensed content on screen, no atlas request fired for forbidden memory** | NEW (B-1/F2) |
| B-8 | **F** | **rapid double memory-switch during queue load and during requery** | **NEW: final paint matches final memory only** | NEW (B-2/F3) |
| B-9 | I | sref detail names missing incl. code; unknown slug 404 | holds | EXISTS |
| B-10 | P | queue add via detail; style still in grid (not "kept") | holds | EXISTS |
| B-11 | P | compose → draft text, provenance label, draft-note | holds | EXISTS |
| B-12 | P | surprise twice → second roll adds new material | holds (timing-based waits — replace with response waitFor where possible) | WEAK |
| B-13 | **I** | **all queue UI operations target throwaway namespace; Sean queue byte-identical** | **NEW** | NEW (B-3) |
| B-14 | **P** | **replay-seed control reproduces roll on identical queue state; disabled otherwise** | **NEW** | NEW (B-8) |
| B-15 | **N** | **fixture `url="javascript:…"` detail → no anchor emitted, plain-text reason** | **NEW (requires B-9 seam)** | NEW (B-10/F8) |

### 5.6 Fault injection

| ID | Stimulus | Expected | Status |
|---|---|---|---|
| F-1 | server down mid-session on page fetch | loading placeholders; refetch on next render; no unhandled rejection (pageerror clean) | WEAK (behavior exists by code; no test) → NEW |
| F-2 | facets 403 (forbidden memory) | readable refusal; no partial controls render | NEW |
| F-3 | queue POST 400 messages | surfaced via say(), queue unchanged | WEAK → NEW |
| F-4 | corrupt queue file via API flow | quarantined + notice (Q-7) | NEW |
| F-5 | kill-during-write | atomic publish (Q-8) | NEW |
| F-6 | hostile fixture catalog (scheme, duplicate slugs, non-Latin names) | B-10/S-3/I-15 outcomes | NEW (B-9) |

### 5.7 Accessibility gates

| ID | Ctl | Stimulus | Expected | Status |
|---|---|---|---|---|
| A-1 | A | Tab into grid; arrow-key traverse cells | roving tabindex; focus visible; no focus loss across re-render | NEW (B-6/F6.1) |
| A-2 | A | focus a cell, trigger re-render (scroll/fetch resolve) | focus retained on same slug | NEW |
| A-3 | A | open detail | panel scrolled into view; focus on close button; Esc returns focus to origin cell | NEW |
| A-4 | A | compose completes | `#atlasQDraft` role=status announced (axe/announcer assertion) | NEW |
| A-5 | A | visible label vs accessible name on Aspect-ratio select | identical strings | NEW |
| A-6 | A | axe-core pass on /atlas (contrast, names, roles) | zero critical | NEW (contrast currently UNPROVEN — gold-on-surface unmeasured) |
| A-7 | A | `#shellsay` live-region behavior for surprise message | announced | NEW (BLOCKED on B-11e) |
| A-8 | A | reduced-motion: hover transform absent | computed transform none | NEW |

### 5.8 Viewport gates

| ID | Stimulus | Expected | Status |
|---|---|---|---|
| V-1 | 360×640 | cols ≥1; search and era rows full-width; no horizontal overflow on the bar | NEW |
| V-2 | 360 / 768 / 1280 / 1920 | mounted-cell count stays viewport-proportional; spacer recomputes; no accumulation | NEW |
| V-3 | resize while Atlas hidden, then enter | correct column count after enter (lastWindow reset path) | NEW |
| V-4 | mobile detail open | panel visible without manual scrolling (B-6) | NEW |

---

## PART 6 — REQUIREMENTS THAT MUST REMAIN DISABLED OR BLOCKED

1. **Tag filter — permanently disabled until data changes.** `global_tags` is empty on all 9,521 rows (`docs/atlas/data-audit.md` §3, §5; `availability.tags.supported === false`). Re-enabling requires a re-run of `audit-catalog.mjs` showing non-empty coverage; the UI must keep deriving this from `availability`, never hardcoding either way.
2. **`--sref` code display on cells — disabled.** The `sref` field is null on all 4,016 sref rows; numeric slugs and corpus codes are disjoint universes (audit §6: 0 overlap). Same re-enable condition as (1).
3. **Image scrape, image manifest, and any remote image fallback — BLOCKED, owner-gated.** `imageFor` stays a null seam; no `onerror` fallback, no remote host, no placeholder-service URL, ever. This review does not authorize the scrape slice.
4. **Atlas as prompt writer / ComfyUI queuer — prohibited.** One-writer law: `app-make` is the sole writer; never-show-twice is keyed on prompt identity. Compose returns drafts only.
5. **Corpus access for client/partner memories — prohibited at route level (already enforced) and now also at screen level (B-1).** No client-side index, no bulk export, no page-size escape: server cap of 500 stands; no "download all" affordance may be added.
6. **Reusing `kept`/shelf as the queue store — prohibited.** Queue is a workbench, not a verdict; `kept` means never-show-again and steers at score 1000.
7. **Three.js, canvas animation, or any runtime dependency on the grid — prohibited.** `dependencies` stays `{}`; Playwright stays dev/test-only behind its skip.
8. **Second RNG / second insert-grammar implementation — prohibited.** `rngFrom` and `catalogInsert` remain the single sources.
9. **This review performs no edits, commits, or deploys.** All output above is specification only.

---

### Closing register — UNPROVEN / BLOCKED items requiring B-11 verification before any release

`corpusAccess` semantics (brain.mjs) · `namespaceFrom` default resolution · `world/changed` semantics · `Swan.esc` coverage · `#shellsay` live region · `projectDir` layout vs `.gitignore` pattern coverage · `rngFrom` domain · `catalogInsert` grammar · serve.mjs Host and POST write gates · Make/Judge provenance field (B-4). Each PASS converts its dependent finding from UNPROVEN to VERIFIED; each FAIL is a new finding at minimum P1.
