# GLM Consult

**Requested:** `glm-5.3-flash`
**Served:** `glm-5.3-flash`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 39122 in / 31685 out (reasoning: 23300) | total 70807
**Wall:** 1107.8s

---

# Cross-Check Review — Swan Taste Brain Style Atlas (sanitized diff)

**Reviewer role:** independent cross-check. No finding below is inherited; every claim was re-derived from the diff. Line references for new files use the new-file line numbering from the diff; existing files are cited by hunk. I edited nothing, ran nothing against a live generator, and called no provider.

---

## (1) VERDICT

**REVISE — build authority withheld until P0-1, P0-2, P0-3 and P1-1 are fixed.**

The architecture is sound and the discipline is real: measured availability (`prompter/lib/atlas.mjs`), a server-side paged index that does not hand back the bulk-read hole, a queue store that correctly refuses to be `kept`, a draft-only compose, no Three.js, no image fetch, no PII egress. But the diff ships three P0 defects: **two test files destroy Sean's real queue state while their own headers claim "read-only,"** a **stale-response race that silently corrupts the grid** after any query change, and a **memory-switch race that can leave memory A's queue on screen under memory B — where "Clear" deletes B's unseen queue.** All three are reproducible by code reading alone.

### Classification of the named suspicions

| # | Suspicion | Classification | One-line basis |
|---|---|---|---|
| 1 | Memory-switch namespace leak in queue | **VERIFIED (partial)** — screen-clear works; stale-`load()` race leaks old namespace's rows back onto screen | `app-atlas-queue.js:23–29` has no `world` guard; `:124` clears then re-fetches |
| 2 | Stale async search overwrite | **VERIFIED** — two distinct interleavings, both silent | `app-atlas.js:72–86` (`fetchPage`), `:89–100` (`requery`) |
| 3 | Destructive shared-queue tests | **VERIFIED (×2 files)** | `test-atlas-routes.mjs` "The queue over the wire" section; `test-browser-atlas.mjs` queue drive; both headers claim read-only |
| 4 | Random-seed collision & replay ambiguity | **REJECTED (collision)** / **VERIFIED (replay ambiguity)** — seed is returned but no UI can replay it, and the comment claims it can | `lib/atlas.mjs` `randomStyles` contract comment; `app-atlas-queue.js:76–93` sends no seed |
| 5 | Missing Atlas→Make/Judge provenance | **VERIFIED (dead-end tag)** / **REVISE (comment)** — `provenance` is displayed, never transported or consumed | `lib/atlas-queue.mjs` composeDraft vs. app copy-button; no Make/Judge code in diff |
| 6 | Corrupt-queue fail-open / data loss | **VERIFIED** — fail-open read is fine; the next write **destroys the corrupt file's bytes** | `lib/atlas-queue.mjs:47–59` |
| 7 | Unicode / non-Latin search | **VERIFIED (diacritics break search)** / **UNPROVEN (CJK coverage unmeasured)** | `norm()` in `lib/atlas.mjs` strips every non-`[a-z0-9]` byte |
| 8 | URL/path trust | **VERIFIED (one gap)** — `d.url` rendered as `href` with no scheme check | `app-atlas.js` `openDetail` source link |
| 9 | Accessibility / viewport gaps | **VERIFIED (several)** | see F-14…F-17 |
| 10 | Existing caller-contract risks | **VERIFIED (node tests hard-require licensed sources; browser `--require` needs server+playwright)** | `package.json` test chain; `test-atlas.mjs:24–28` |

### P0 findings

**F-1 · Two tests write Sean's default namespace queue and their headers lie about it.**
- Evidence: `test-atlas-routes.mjs` header: *"Read-only. Calls the handler directly with a recording `json`, so no port is opened."* Then, in the section *"The queue over the wire,"* it calls `POST /api/atlas/queue {action:'clear'}` with no namespace → `namespaceFrom` resolves the **default** namespace → `queuePath` maps to `taste/atlas-queue.json` (`lib/atlas-queue.mjs:33–37`). It then adds `jan-mankes`, composes, removes. Net effect: **whatever Sean had queued is cleared and replaced with an empty file.** Same in `test-browser-atlas.mjs`: its header says *"READ-ONLY: navigates and queries. Creates no project and writes no taste file,"* then the suite clicks `#atlasQClear` (wiping the real queue), adds styles, rolls Surprise twice, composes, clears again. The first `#atlasQClear` click also makes the check *"the queue starts empty"* **pass only because real user state was just destroyed** — a test that cannot fail is worse than no test.
- Classification: **VERIFIED.** Smallest deterministic fix: in both files, snapshot `taste/atlas-queue.json` bytes before (absent ⇒ `<absent>`), restore the exact bytes (or delete) in a `finally` — the identical pattern already proven in `test-atlas-queue.mjs:33–36,70–73` — and correct both headers. (A throwaway-project namespace would be cleaner but requires the default profile to accept `createProject`, which is UNPROVEN from this diff — see Verify-list.)

**F-2 · Stale search overwrite: two interleavings corrupt the grid silently.**
- Repro A (requery vs. requery): type `criv` → 140 ms debounce fires `requery()` (`app-atlas.js:89–100`); type more before it resolves → second `requery()`. If the first response lands last, `state.total` and `state.pages[0]` describe `criv` while the box says `crivelli…`. No guard exists: `requery` captures neither a sequence nor the query.
- Repro B (fetchPage vs. requery): scroll so `fetchPage(3)` is in flight for query Q1; change the query; `requery()` clears `state.pages` (`:90`) but cannot cancel the in-flight fetch; it resolves and executes `state.pages.set(3, Q1rows)` (`:80`) into **Q2's** cache. The `world.changed()` guard in `fetchPage` (`:79`) does not help — `world()` is the namespace/world identity, and a query change does not tick it (that is exactly why `requery` exists as a separate path). Result: wrong styles rendered under the new filter, wrong `total`, no error anywhere.
- Classification: **VERIFIED.** Smallest deterministic fix: module-level `let querySeq = 0`; increment at the top of `requery()`; `fetchPage` captures both `querySeq` and the `qs().toString()` snapshot before `await` and discards the response if either changed; `requery` does the same. Also wrap the `await` in try/catch (see F-4).

**F-3 · Memory-switch race leaves the previous memory's queue on screen; "Clear" then destroys the current memory's unseen queue.**
- Repro: memory A's queue `[X]` is on screen. A `load()` for A is in flight (mount, onMemory, or any paint-triggering action). User switches to memory B → `onMemory` (`app-atlas-queue.js:124`) sets `queue=[]`, paints empty, calls `load()` for B. The **A-response resolves after** and executes `queue = d.queue` (`:26`) + `paint()` — A's chips are back, under B's namespace. User hits Clear believing they're clearing what they see → `act('clear')` posts with B's `ns()` (`:31–39`) → `queueClear` **empties B's queue**, which the user never saw. `load()` is the only async function in the module without the `world` guard its siblings have (`:32`, `:82`, `:98`).
- Classification: **VERIFIED** (the race) / **UNPROVEN** (that `window.Swan.onMemory` exists at all — it is not defined anywhere in this diff; see Verify-list V-1).
- Smallest deterministic fix: in `load()`, capture `const world = window.Swan.world()` before the `await` and `return` if `world.changed()` after — mirroring `act()` at `:32–34`. This closes the interleaving iff `world()` ticks on memory switch; V-1 verifies that premise.

### P1 findings

**F-4 · Unhandled promise rejections brick the Atlas on any transport fault.**
- `fetchPage` (`:77–85`) and `requery` (`:92`) have no `catch`; `start()` awaits `api('/api/atlas/facets')` uncaught and sets `started = true` **before** the await (`:~290`), so a rejected facets call leaves the tab permanently on "Loading the catalog…" with an unhandled rejection — and `started` can never reset. Same shape in `act`/`load`/`surprise`/`compose` in `app-atlas-queue.js`. The browser test's `pageerror` instrument would catch this in a fault run — but no fault run exists.
- Fix: try/catch each await → `window.Swan.say(...)` fallback; in `start()`, move `started = true` after a successful facets fetch (or reset it in the catch).

**F-5 · Corrupt-queue fail-open becomes data loss on the next write.**
- `readQueue` degrades `{ not json` → `[]` (good), but `write()` (`lib/atlas-queue.mjs:56–59`) then **overwrites the file**, destroying whatever bytes were there; the slug-filter at `:51–54` likewise silently drops malformed entries on next write. `test-atlas-queue.mjs:110–121` checks only the read side.
- Fix: in `write()`, if the existing file's bytes do not parse, `fs.copyFileSync` them to `<path>.corrupt` before overwriting. One branch, no decisions. Add the negative control to the test (corrupt → add → assert `.corrupt` exists with original bytes).

**F-6 · Diacritic and non-Latin search misses.**
- `norm()` (`lib/atlas.mjs:~21`) lowercases then strips everything outside `[a-z0-9]`. `Böcklin` → `b cklin`; a user typing the ASCII transliteration `bocklin` gets **zero** results for a row whose name contains `Böcklin`, while typing the raw diacritic matches. Any Cyrillic/CJK name normalizes to a string with the name entirely removed from `search`. The audit (`docs/atlas/data-audit.md`, `prompter/audit-catalog.mjs`) never measured how much of the catalog this affects — a blind spot in an audit whose whole purpose was measuring before promising.
- Fix: fold before filtering — `.normalize('NFD').replace(/\p{M}/gu,'')` ahead of the existing replace (dependency-free). Extend `audit-catalog.mjs` with a row: count of rows whose `norm(name)` is empty or shorter than `name`, so the limitation is a number, not a guess.

**F-7 · Provenance is a dead-end tag; the Judge-contract comment overstates.**
- `composeDraft` tags the draft `atlas-queue` (`lib/atlas-queue.mjs:~120`) and the comment says *"The tag the Judge reads."* But the only consumer path in the entire diff is `window.Swan.copy(d.draft)` (`app-atlas-queue.js:~112`) and a `<span>` displaying the tag. There is **no transport into Make** and no Judge code reading provenance; once pasted, the tag is gone. The one-writer law is correctly preserved — but the claim that the Judge can distinguish an Atlas draft is unimplemented. No Make/Judge module appears in this diff, so the real handoff is **BLOCKED** pending their contracts (Verify-list V-6); the smallest truthful fix now is to revise the comment and the note copy to say the tag is metadata on the draft object, consumed by nothing yet.

**F-8 · Node atlas tests hard-fail on a checkout without the licensed sources.**
- `test-atlas.mjs:24–28` asserts `counts.total === 9521` immediately; `test-atlas-routes.mjs:~31` does the same. The app itself is explicitly optional-by-design (`lib/atlas.mjs` header; routes return `present:false`), but its own tests have no absent-catalog skip, unlike `test-browser-atlas.mjs`, which does. On any clean clone, `npm test` now fails. Fix: early-exit skip when `!atlas.present`, mirroring the browser test's pattern.

### P2 findings

**F-9 · `href` scheme trust.** `openDetail` renders `<a href="${esc(d.url)}" target="_blank">` from catalog data; `esc` escapes HTML but not schemes, so a `javascript:` URL in `all_styles.json` survives. Fix server-side in `styleDetail`: emit `url` only if `/^https?:\/\//i`; client renders the link only when truthy.

**F-10 · Grid has no `onMemory` handler.** The queue resets on memory switch; the grid keeps rendering cached licensed rows under whatever namespace is now active (interactions then 403 for client/partner). Fix: register `window.Swan.onMemory` in `app-atlas.js` calling `requery()` — a 403 then clears the grid into an honest error state via the existing `d.error` path (`:93`).

**F-11 · Seed replay claim vs. shipped behavior.** `app-atlas-queue.js:79` says *"the seed comes back so a roll worth keeping can be repeated"*, and the `say()` string prints `(seed N)` — but nothing ever sends `seed` back, the server accepts it (`routes-atlas.mjs:107`), and by contract (correctly documented in `atlas.mjs`) a repeat requires the identical pre-roll queue, which the roll itself just changed. Fix the copy/comments; exposing a real replay affordance is a product decision → BLOCKED list.

**F-12 · Hardcoded "9,521" in section heading** (`app.html` new section markup) contradicts the catalog-optional design: with sources absent the page advertises 9,521 styles then says the catalog is unavailable. Fix: neutral heading; set the number from `facets.counts.total` on load.

**F-13 · `audit-catalog.mjs` header says "READ-ONLY … touches nothing but the gitignored sources/ tree" while it writes `docs/atlas/data-audit.md`** — a committed, tracked file — with a nondeterministic `new Date()` stamp, so every rerun dirties the tree. Fix header wording; stamp from source-file mtimes if determinism is wanted.

**F-14 · A11y gaps (all small, all concrete):** `#atlasCount` is not a live region — SR users never hear result-count changes; opening detail does not move focus and closing does not restore focus to the invoking cell; `.atlas-q-x` is 32×32 against the app's own everywhere-else 44 px convention; the Surprise explanation exists only in a `title` attribute; `#atlasQSubject` has no Enter-to-compose. Fix each; add a keyboard/AT pass to the browser test.

**F-15 · `--ar` accepts any `^\d{1,2}:\d{1,2}$`** (`lib/atlas-queue.mjs` composeDraft) — `--ar 99:99` passes validation. Whitelist the five ratios the UI offers.

**F-16 · Weighted-pick floating-point edge:** in `randomStyles`, if `t` remains `> 0` after the last candidate (fp residue), iteration `k` silently produces no pick and `picks.length < min(n, candidates.length)`. One-line fallback (take last untaken) plus a property test over seeds 1–500.

**F-17 · Behavior inconsistency when catalog is absent:** the `!atlas.present` short-circuit (`routes-atlas.mjs:~52`) answers **every** `/api/atlas*` subpath with 200 `{present:false}` — including `/api/atlas/style`, which with catalog present would be 404, and queue POSTs, which become silent no-ops. Document or narrow the short-circuit to the three reads.

### Verify-list (contracts asserted but not evidenced in this diff)

| V | Contract | Where relied on |
|---|---|---|
| V-1 | `window.Swan.onMemory` exists and `world()` ticks on memory switch | `app-atlas-queue.js:124`; F-3 fix premise |
| V-2 | `Swan.api/post` return `{error}` on 403/400 rather than throwing | F-4, F-10 error paths |
| V-3 | `serve.mjs` global POST write-gate actually covers `/api/atlas/queue` (comment at `routes-atlas.mjs:~85` claims it) | write-path law |
| V-4 | `corpusAccess` refuses client/partner with the message the route test regexes (`/licensed to Sean/`) | `routes-atlas.mjs:45–46`; own-material law |
| V-5 | `projects.mjs`: `isDefaultNamespace`, `projectDir` path shape matches the new `.gitignore` patterns | `.gitignore` hunk |
| V-6 | Make/Judge module contracts (composer seam, provenance storage) | F-7 handoff — BLOCKED |
| V-7 | `brain.catalogInsert(row)` phrasing for artist vs. genre vs. sref-type rows | `lib/atlas-queue.mjs` compose; tests encode expectations |
| V-8 | `rngFrom(seed)` returns a zero-arg-callable RNG | `lib/atlas.mjs` randomStyles |
| V-9 | `app.html` carries a viewport meta (not shown in hunk) | responsive claims |
| V-10 | Playwright resolvable from `devDependencies` or the sibling path | `test-browser-atlas.mjs` CANDIDATES |

### Preserved laws — status

| Law | Status |
|---|---|
| One-writer (`app-make` only) | **VERIFIED preserved** — queue composes drafts only; `test-atlas-queue.mjs` LAW 2 checks byte-identical `kept`/`shelf` |
| No remote image fallback | **VERIFIED preserved** — `imageFor() => null`; no `<img>` network source exists |
| No Three.js on the grid | **VERIFIED preserved** — DOM virtualizer only, no canvas/WebGL |
| Sean-only namespace | **VERIFIED at the route layer** (gate wired at `routes-atlas.mjs:43–46`, negative controls in route test) / **UNPROVEN** for `corpusAccess` internals (V-4); stale-grid-under-switch gap noted (F-10) |
| No PII egress | **VERIFIED** — no outbound calls; the only external touch is the user-initiated `noreferrer` source link |

---

## (2) ZERO-DECISION BUILD BLUEPRINT (remaining vision)

Executors make no choices below; each phase lists exact anchors, the change, and its exit criterion. Anything requiring an owner decision is quarantined in §6.

**Phase A — Race/staleness hardening (P0-2, P0-3).** `app-atlas.js`: add `querySeq`; guard `requery` and `fetchPage` as specified in F-2. `app-atlas-queue.js`: add the `world` guard to `load()` (F-3). Exit: new negative controls M-22/M-23/M-24 pass; existing 9521-row invariants unchanged.

**Phase B — Test isolation (P0-1).** Snapshot/restore `taste/atlas-queue.json` in `test-atlas-routes.mjs` and around the whole `test-browser-atlas.mjs` run; correct both file headers; the browser suite's "queue starts empty" assertion must be against a *restored-known-empty* state, not first-click-clear. Exit: run both suites twice with a pre-seeded queue file; bytes identical after.

**Phase C — Fault & corrupt-file hardening (P1).** try/catch every `api/post` await (F-4); `started` set on success only; corrupt-file quarantine in `write()` (F-5). Exit: kill-server fault run produces `say()` messages and zero `pageerror`; corrupt→write preserves bytes in `.corrupt`.

**Phase D — Search normalization + audit truth (P1).** NFD fold in `norm()` (`lib/atlas.mjs`) and the same fold in `audit-catalog.mjs`'s `norm`; add the non-ASCII coverage row; regenerate the audit doc once and commit. Exit: `Böcklin`/`bocklin` both hit; audit row present.

**Phase E — Truth-in-copy pass (P1/P2).** Revise the Judge-provenance comment (`lib/atlas-queue.mjs`) and the seed-replay comment (`app-atlas-queue.js:76–80`) to state current behavior; neutral heading + count from facets (F-12); fix `audit-catalog.mjs` header (F-13).

**Phase F — A11y & input pass (P2).** `aria-live="polite"` on `#atlasCount`; focus into detail heading on open, restore to invoking cell on close; `.atlas-q-x` to 44×44; Enter-to-compose on `#atlasQSubject`; arrow-key roving focus across mounted cells (Home/End to window edges); surface the Surprise explanation as visible text under the bar, keeping `title` as a supplement.

**Phase G — URL scheme hardening (P2).** `styleDetail` emits `url` only for `^https?://`; `openDetail` renders the anchor only when `d.url` truthy. Exit: negative control M-31.

**Phase H — Atlas→Make/Judge handoff (BLOCKED on V-6; conditional spec).** Once the Make composer seam is confirmed: add a "Load in Make" button beside Copy that (a) fills Make's composer through its existing setter, (b) carries `provenance:'atlas-queue'` in the intent payload so the server stores it beside prompt identity, (c) Judge gains a provenance filter in its read path. Until V-6 is verified, this phase does not start; the tag remains display-only (F-7 comment fix already shipped in Phase E).

**Phase I — Image manifest slice (owner-gated, later).** `imageFor()` is the single change point (`app-atlas.js:54`); manifest is a local committed file mapping slug→vault-relative path; **no remote fallback ever**; when it lands, raise `CELL_H` (150) and the matching `.atlas-cell` height and `is-textual` rules **in the same commit**, and re-run the browser geometry checks (M-08/M-09) which read `window.SwanAtlas`, so drift fails loudly.

---

## (3) PRODUCTION WIREFRAME

```
┌─ header ─────────────────────────────────────────────────────────────────────┐
│ [profile ▾] [project ▾]                              status: #shellsay (live)│
├─ rail ──┬─ main ─────────────────────────────────────────────────────────────┤
│ 1 Judge │  ⬡ The catalog                                               [4]   │
│ 2 Make  │  Every style, browsable.            ← count injected from facets   │
│ 3 Galry │  <p #atlasCount aria-live=polite> 9,521 of 9,521 · 4,016 carry no   │
│ ▸4 Atlas│     artist metadata · [ignored: …] </p>                            │
│         │  ┌ bar ────────────────────────────────────────────────────────┐   │
│         │  │ [search……] [Kind▾] [Country▾] [Born _–_ ] [Sort▾] [Clear]   │   │
│         │  └──────────────────────────────────────────────────────────────┘   │
│         │  note: no tag filter (global_tags empty) · no sref token (null)     │
│         │  ┌ #atlasScroll (tabindex=0, role=group) ──────────────────────┐   │
│         │  │ ┌cell──┐ ┌cell──┐ ┌cell──┐ ┌cell▒▒┐  ▒ = .is-loading       │   │
│         │  │ │name  │ │name  │ │name  │ └──────┘  only window mounts     │   │
│         │  │ │sub   │ │sub   │ │sub▒  │           (≤ ~200 cells)         │   │
│         │  │ └──────┘ └──────┘ └──────┘  spacer owns true scroll height     │   │
│         │  └──────────────────────────────────────────────────────────────┘   │
│         │  ┌ #atlasDetail (hidden until open; focus IN, restored OUT) ───┐   │
│         │  │ Name [facts: 1854–1918 · Netherlands · in N collections] ✕  │   │
│         │  │ biography… / "Optimal prompt" / credited prompts (k of n)   │   │
│         │  │ Not in local data: …                        (gold, honest)  │   │
│         │  │ [ + Queue ]  [Source page ↗ (https-only)]                   │   │
│         │  └──────────────────────────────────────────────────────────────┘   │
│         │  ┌ #atlasQueue ────────────────────────────────────────────────┐   │
│         │  │ Queue 12/40          [Surprise me] [Clear]                  │   │
│         │  │ (name ✕)(name ✕)… 44px ✕ targets                            │   │
│         │  │ [Subject…… Enter=compose] [Shape▾] [Compose draft]          │   │
│         │  │ <code #atlasQText> draft, --ar … </code>  [Copy draft]      │   │
│         │  │ provenance: atlas-queue · "A draft, not a written prompt…"  │   │
│         │  └──────────────────────────────────────────────────────────────┘   │
└─────────┴────────────────────────────────────────────────────────────────────┘
States: absent catalog → facets.reason panel, no bar/grid; 403 memory → error line,
empty grid, empty queue; corrupt queue → empty list + .corrupt sidecar on next write.
```

---

## (4) MERMAID — memory switch through grid/detail/queue/Make/Judge

```mermaid
flowchart TD
  MS[Memory switch: profile/project change] --> OM{{Swan.onMemory fires}}
  OM --> Q1[app-atlas-queue: queue=[] paint empty]
  OM --> G1[app-atlas onMemory: requery - Phase F fix]
  Q1 --> L[load: capture world BEFORE await]
  L -->|world.changed after await| X1[discard stale response]
  L -->|ok| GETQ[GET /api/atlas/queue?ns]
  G1 --> GA[GET /api/atlas?ns&query + querySeq]
  subgraph S[serve.mjs: Host gate loopback-only]
    GA --> NS{namespaceFrom}
    GETQ --> NS
    NS -->|invalid| E400[400]
    NS --> CA{corpusAccess own-material?}
    CA -->|client/partner| E403[403 forbidden]
    CA -->|Sean own| IDX[loadAtlas index]
  end
  IDX --> GRID[Virtualizer renders window; pages cached per querySeq]
  GRID -->|click cell| DET[GET /api/atlas/style?slug]
  DET --> PANEL[Detail: facts, credited prompts, missing list]
  PANEL --> ADD[POST queue add - dedupe, cap 40]
  GRID --> SRP[POST /api/atlas/surprise: seed, weights, exclude=queue]
  SRP --> ADD
  ADD --> QF[(taste/atlas-queue.json or profiles/.../atlas-queue.json)]
  Q1 --> COMP[POST /api/atlas/compose]
  COMP --> DRAFT[draft + provenance=atlas-queue + note]
  DRAFT --> CPY[Copy draft to clipboard]
  CPY -. V-6 unverified .-> MAKE[Make composer - app-make the ONLY writer]
  MAKE --> INTENT[POST /api/intent - write-gated]
  INTENT --> KEPT[(taste/kept.md - never-show-twice)]
  KEPT --> JUDGE[Judge scores batches]
  DRAFT -. provenance tag, Phase H .-> JUDGE
  E403 --> EMPTYQ[queue panel: empty; grid: honest error]
```

---

## (5) EXhaustive TEST MATRIX

Status: ✅ exists-pass · ❌ exists-fail · ⛔ missing · 🔧 exists-but-defective.

| ID | Area | Kind | Action | Expected | Status |
|---|---|---|---|---|---|
| M-01 | index | pos | loadAtlas on real sources | 9,521 = 5,505+4,016; hole exactly 4,016 | ✅ |
| M-02 | availability | neg | tags/srefCode availability | supported=false with reason | ✅ |
| M-03 | attribution | pos/neg | crivelli>0; anime-style/close-up-portrait/haute-couture = 0 | every shown prompt credits | ✅ |
| M-04 | filters | pos | era/country narrow; never place sref rows | all rows in-range | ✅ |
| M-05 | paging | neg | limit 99999 / negative / junk | ≤500; offset 0; defaults | ✅ |
| M-06 | law-gate | neg | client & partner × all 6 endpoints | 403 forbidden each | ✅ |
| M-07 | law-gate | neg | invalid profile | 400 before row touch | ✅ |
| M-08 | virtualizer | pos | 1280×900, mounted cells | <200; spacer ±CELL_H of derived height | ✅ |
| M-09 | virtualizer | pos | CSS cell height vs `SwanAtlas.CELL_H` | equal | ✅ |
| M-10 | controls | neg | no tag control; note present; country+era exist | counts as asserted | ✅ |
| M-11 | queue | pos | add→dedupe→compose→remove→clear (lib, throwaway memory) | LAW1 bytes identical | ✅ |
| M-12 | queue | pos | cap test with REAL slugs, positive control of fixture | refused at 40 | ✅ |
| M-13 | queue | neg | corrupt JSON / slugless entries | empty / filtered read | ✅ (write side ⛔ M-28) |
| M-14 | browser | pos | open, search, clear, detail, queue drive | all listed checks | 🔧 mutates real queue (F-1) |
| M-15 | **isolation** | fault | run M-14/M-route queue tests with pre-seeded real queue file | bytes identical after | ⛔ |
| M-16 | **race** | fault | type `criv`→in-flight→extend query; assert final state matches box | total+page0 match final query | ⛔ (F-2) |
| M-17 | **race** | fault | fetchPage in-flight → change query → resolve | stale page discarded | ⛔ (F-2) |
| M-18 | **race** | fault | load() in-flight → memory switch → resolve | old namespace's queue never painted | ⛔ (F-3) |
| M-19 | **race** | fault | switch A→B with A's chips visible → Clear | clears B only after honest paint; M-18 prevents scenario | ⛔ |
| M-20 | fault | neg | stop server → scroll/type/queue actions | say() messages; zero pageerror; retry works | ⛔ (F-4) |
| M-21 | fault | neg | facets fails once → re-enter tab | recovers, not stuck "Loading…" | ⛔ (F-4) |
| M-22 | fault | neg | corrupt queue file → add | `.corrupt` sidecar holds original bytes | ⛔ (F-5) |
| M-23 | search | pos | `Böcklin` and `bocklin` both hit same row | equal totals | ⛔ (F-6) |
| M-24 | search | audit | rows with empty/short norm(name) | counted in audit doc | ⛔ (F-6) |
| M-25 | seed | prop | seeds 1–500: picks.length = min(n, pool); same seed+state repeats; different seed differs | holds | ✅/🔧 (F-16) |
| M-26 | seed | neg | same seed after roll | differs (documented); copy no longer claims replay | ⛔ copy fix (F-11) |
| M-27 | url | neg | catalog row with `javascript:` url | link suppressed | ⛔ (F-9) |
| M-28 | queue | neg | write-over-corrupt preserves bytes; drop-slugless on write warned via sidecar | as M-22 | ⛔ |
| M-29 | a11y | pos | Tab: search→controls→cells; Enter opens; focus in detail; Esc restores focus to cell | holds | ⛔ (F-14) |
| M-30 | a11y | pos | `#atlasCount`, `#shellsay` announce on change | live regions fire | ⛔ (F-14) |
| M-31 | a11y | pos | targets ≥44px incl. `.atlas-q-x`; focus-visible outlines | pass | 🔧 |
| M-32 | a11y | pos | prefers-reduced-motion: no hover transform | ✅ | ✅ |
| M-33 | viewport | pos | 320/375/768/1280/1920 cols = floor((w+12)/180) → 1/2/4/7/10; era row wraps; compose wraps | as computed | ⛔ (only 1280 tested) |
| M-34 | viewport | pos | 200% zoom: resize re-measures; no overlap | holds | ⛔ |
| M-35 | perf | gate | cold loadAtlas < 250 ms; /api/atlas p95 < 15 ms loopback; facets < 20 ms | gates in CI-able bench | ⛔ |
| M-36 | perf | gate | 30 rapid programmatic scrolls: mounted<200 throughout, no pageerror, spacer stable | holds | ⛔ |
| M-37 | perf | gate | pages Map ≤ 80 entries after full-corpus scroll | bounded | ⛔ |
| M-38 | neg | neg | era 1900→1800 (inverted) | 0 rows, honest count, no crash | ⛔ add |
| M-39 | neg | neg | unknown action / unknown slug / absent params on queue+style | 400/400/404 | ✅ |
| M-40 | absent-catalog | neg | run node suites without sources | clean skip, exit 0 | ⛔ (F-8) |

---

## (6) BLOCKED / DISABLED REQUIREMENTS

**Blocked (owner gate required):**
- Atlas→Make transport and Judge provenance consumption (Phase H) — blocked on V-6; until then the tag is display-only and the comment says so.
- Seed-replay UI affordance — blocked: replay semantics (queue snapshot? filter pinning?) are a product decision; copy fix only.
- Image manifest slice — owner-gated scrape; grid stays imageless; **no remote image fallback ever**, manifest local-only.
- Default-profile throwaway projects for tests — blocked on V-5; snapshot/restore used instead.

**Disabled by measured data (must stay disabled; regressions fail M-02):**
- Tag filter — `global_tags` empty on 9,521/9,521.
- sref `--sref` token display — field null on 4,016/4,016; numeric slugs ∩ corpus codes = 0.
- `views_count` as any ordering signal — max 28, 41% zeros.
- Atlas queue/prompt writes to ComfyUI — banned; second prompt writer — banned (one-writer law).
- Client/partner Atlas access — own-material law, 403 at the single delegated gate.
- Three.js / WebGL on the grid — banned; DOM virtualizer only.
- PII egress — none exists; keep it that way in Phases H and I.

**Fix-then-unblock order:** P0-1 → P0-2 → P0-3 → P1-1(F-4) → P1 remainder → Phases F/G → verify V-1…V-10 → Phase H decision returns to owner with the verified contracts attached.
