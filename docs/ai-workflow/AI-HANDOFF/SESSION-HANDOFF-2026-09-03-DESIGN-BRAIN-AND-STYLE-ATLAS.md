# Session handoff — design-brain build + the Style Atlas blueprint

- **Date:** 2026-09-03 · **Author:** Claude Opus 5 (built), Claude Fable 5.1 (blueprinted), Claude Fable 5.0 (reviewed) · **Reviewers:** GLM 5.3 + GLM 5.3 Flash (7 passes), GPT-5.6 Sol (1 pass)
- **Status:** part 1 SHIPPED on a branch and hostile-review-dry; part 2 REVIEWED and ready to blueprint
- **Read time:** 12 minutes. Read §1 and §2 to continue part 1; read §5 onward to build part 2.
- **Branch:** `feat/design-brain-style-intelligence` — 36 commits ahead of `origin/main`, 0 behind, **pushed, NOT merged**
- **Worktree:** `c:/tmp/ss-pt-design-wt` · **NEVER build in** `Desktop/quick-pt/SS-PT` (that checkout sits on an unrelated stale branch)
- **Board:** SWA-229

---

## 1. What this session did, in one paragraph

Fable 5.0 wired the Midjourney style vocabulary into the Swan Design Brain and hostile-reviewed five surfaces; Fable 5.1 re-reviewed that chain, found twelve gaps, and wrote a build blueprint; Opus 5 executed all nine slices of that blueprint and then ran the work through six hostile-review rounds until a round came back dry. Separately, Sean specified a new surface — the **Style Atlas** — and it was hostile-reviewed by two seats before any code was written. Nothing is merged. Two product decisions wait on Sean.

---

## 2. Part 1 — what shipped (all on the branch, all proven)

| Slice | What changed | Why it mattered |
|---|---|---|
| S1 | Merged `origin/main` (0 conflicts), full Tier-A | Branch was 9 behind; the CI gate on main runs backend tests this branch had never run |
| S2 | `logCartError` now records message, bounded stack, and the Postgres cause | A production 500 named its error CLASS and nothing else — the cause was unreadable, so nobody could fix it |
| S3 | Shared `ErrorCard`; client recap + personal records + trainer roster all get honest failure + retry | A failed fetch rendered as an empty week. A paying member could not tell a dead request from a rest week |
| S4 | Admin overview reordered: Work Queues + Operations above the AI terminal | "Who trained / who's stale / who needs intervention" rendered 8th of 11 |
| S5 | Role-aware quick links, hero video `onError` fallback, seeded marketing counters, `TierContext` defaulting to least motion | Logged-out visitors were offered two dashboards; crawlers read "0+ Years Experience"; a forgotten prop meant MORE motion |
| S6 | Removed the illustrated winged-swan asset; caustic substrate on every tier | LAW 4 (optics, not creatures) violated on the highest-traffic surface. I opened the asset to confirm before removing |
| S7 | **Built `CrystallizeRecord`** — the LAW 5 record artifact | It never existed. The thing everyone called "the Crystallize" is a settings theme-switch transition |
| S8 | Windowed pagination + `hasMore` + honest window label | A hard 200-row fetch with no "load more" and no signal; long histories silently truncated |
| S9 | World/lens consumer bridge for the user tree; two orphan shell exports deleted; router trimmed 320→299 | LAW 8 reached one tree only; a shared shell all four roles route through exported mock-bearing components with no route |

**Withdrawn as false, not built:** U1 ("advertised charts don't render"). `bodyFatTrend` is wired to a lazy `BodyFatTrendLine`, `weightProgression` is a default-visible canonical chart, `strength1RM` is offered in no UI. Building it would have duplicated a shipped chart.

### The three defects the hostile loop found that the build missed

1. **The Progress tab was reading its own endpoint wrong.** `extractWorkoutSessions` read `payload.workouts`; the controller returns `{ sessions }`. The tab received `[]` and rendered "no workouts logged" regardless of training history — and the fixture said `workouts` too, so the suite stayed green. A fixture written from belief cannot falsify the belief.
2. **A failed "Load older" click deleted the whole Progress tab.** The error state hits an early return. My commit message had claimed the opposite and my contract test checked the wrong mechanism.
3. **Cart diagnostics could log a member's email.** Postgres quotes the offending value *into its message*, so the PII was in the error text, not in any field the logger names — every review of the logger passed.

### Proof at HEAD

`backend 5468/5468 across all 614 files` · `frontend UserDashboard 450/450` · `adapters 22/22` · `envelope + extension 11/11` · `tsc --noEmit` clean at 12GB (8GB OOMs) · `vite build` clean.

### Two decisions waiting on Sean

- **LAW 5 double-celebration.** A PR now fires the record chip *and* the burst. GLM reads that as two celebrations; Fable's D1 says the burst is the bloom *on* the record. One line either way. Not reversed by a builder.
- **The testimonials swan.** I opened it: a real photograph, unlike the illustrated creature removed from the Arsenal, and covered by the standing keep-the-photographic-swans decision. Its Milky Way sky is a purple/cyan wash, which grazes LAW 3.

---

## 3. How to continue part 1

```bash
cd c:/tmp/ss-pt-design-wt                      # NOT the Desktop checkout
git log --oneline 4c2fd507e..HEAD              # the 36 commits
cd frontend && NODE_OPTIONS=--max-old-space-size=12288 npx tsc --noEmit
cd ../backend && npx vitest run tests/unit/    # 5468 tests, ~2 min
```

Next actions, in order: **merge decision** (the branch carries two rulebook edits) → the two owner decisions above → reproduce the authenticated `/api/cart` 500 on a fresh login and fix the cause the new logging names.

Gotchas that cost time this session: `tsc` needs 12GB; `--reporter basic` is not installed; a blocked commit leaves files STAGED; Git Bash `/tmp` ≠ Node `/tmp` on Windows; the egress gate blocks packets containing email-shaped fixtures (use `example.com`); the spend gate cannot parse brace-groups or heredocs wrapping a `node` call — build packet files with `cat >` then invoke the consult script on its own line.

---

## 4. What the review loop taught (transferable)

- **A truncated diff manufactures blockers.** Round 2's three blockers were all "not in the diff" — because I capped the diff at 620 lines. Send the whole diff or expect to spend a round defending code the reviewer cannot see.
- **One fix can silently cancel another.** Round 3's blocker: my opaque-token rule ate the very constraint names my identifier rule had just preserved. Both shipped in the same commit. The test passed only because its fixture was a 15-character name — too easy to falsify the rule.
- **Source-scanning contracts pass while the code is broken.** The "extension failure preserves the window" contract asserted the catch didn't clear categories. It did not. The early return made that irrelevant. Only a render test caught it.
- **Run the FULL suite, not the files you touched.** Two pre-existing tests asserted the exact page size passed to the service; my probe changed it. The narrow run had been hiding them.
- **A contract that greps prose convicts the compliant file.** Three times a ban-list regex matched a doc comment that *named* the forbidden thing. Strip comments, or name the sanctioned files.

---

## 5. Part 2 — the Style Atlas (specified, reviewed, not built)

**What Sean asked for** (vision doc: `docs/ai-workflow/brainstorms/swan-style-atlas-2026-09-03.md`): a visual browser for every artist/photographer/style — picture tiles, hover reveals four images, click opens the named artist, a queue you build prompts from, richer data than the reference site, a smart random mode producing both a picture prompt and a movie prompt, an AI inside the app, and Three.js beauty. Reference: midlibrary.io/art-styles.

**Where it lives:** the **Swan Taste Brain** app (`Desktop/swan-taste-brain`), not SS-PT.

### The data already exists locally — this is assembly, not scraping

| Asset | Contents |
|---|---|
| `sources/midlibrary/catalog/all_styles.json` | **9,521 styles** — name, slug, type, sref, url, countries, global_tags, views_count |
| `sources/midlibrary/catalog/artistic_details.json` | **5,505 artists** — biography prose, optimal_prompt, countries, lifetime dates, popularity |
| `sources/midlibrary/distilled/prompt-corpus.json` | **4,272 real prompts** the author ran, with source URLs |
| Split | artistic-style 5,505 · sref-style 4,016 |

**Sean's decision:** images come from a local private scrape via Qwen on Hermes, for his own use. Posture is the corpus's existing one — Sean-only, loopback, never redistributed, never reachable by a partner/client memory.

### What two hostile seats decided (full text in `panel-style-atlas-2026-09-03/`)

**GLM 5.3: PROCEED WITH CHANGES. Flash: 6 of 7 claims SOUND, ready to blueprint on one condition.**

Five things to **NOT build**, each because it would break something that already works:

1. **Three.js on the 9,521-cell grid.** Geometry is trivial; 9,521 text labels, hover raycasting and texture streaming are weeks — and scroll jank is the fastest way to hate a surface meant to be beautiful. 3D belongs on the **queue stage** (dozens of items) and a hero moment.
2. **Swan Coach as the AI's parent.** Wrong domain, and it imports the cross-project memory contamination the app's own laws exist to prevent — there was already one leak. Build a scoped assistant in `app-ai` with catalog tools only.
3. **The queue on the `kept` store.** `kept` means *never show again*. Queuing a style would make it vanish from browse. Inherit the patterns, not the store.
4. **The Atlas writing prompts into the Make pipeline.** Two writers break never-show-twice, which is keyed on prompt identity. The Atlas produces **drafts with a provenance tag**; `app-make` stays the single writer.
5. **"Degrade to remote URL" for missing images.** It reintroduces the CDN dependency the local scrape removes. Use a placeholder tile with a "fetch this slug" button — the gap becomes a mechanic.

Three findings that change the product:

- **CRITICAL — 42% of the grid has no artist metadata.** 4,016 sref-styles have no bio, lifetime, country or optimal prompt. "Richer than the reference site" is unsatisfiable there from local data. (Flash tempers this: sref cells still carry name, code, tags, countries, popularity, plus derivable palette/pHash/corpus joins — so it fails for *detail pages*, not the whole cell.)
- **CRITICAL — hover-four-images is an unstated 38,084-file scrape** (~6–11 GB, ~21 h polite). And **nobody has verified the source pages even carry four images per slug** — sample ~20 artist and ~20 sref pages first.
- **HIGH — the vision contains no search, filter or sort.** At 9,521 cells findability *is* the product. The good news: the metadata is 10–20 MB, so client-side fuzzy search, country filter, era filter and popularity sort are instant with no backend. (Note `created_at`/`updated_at` are scrape dates, not era — do not build a timeline on them.)

Three things **both** reviews missed (Flash): source supply was assumed and never verified; no cross-type entity resolution (do sref names overlap artist slugs? cheapest partial fill for the 42% hole); and **the sref cell's verb is undefined** — for a style code the action is the `--sref NNNN` token itself: copy, see real corpus examples, queue it.

### Build sequence (both seats, with Flash's amendment)

0. **Data audit** (hours) — null rates per field, slug-join integrity between the two JSONs, tag cardinality, and a 40-page sample to learn the real images-per-slug. Every spec below depends on these numbers.
1. **Scrape tooling + manifest** — palette and pHash computed at scrape time. Flash's amendment: stage it so the **top slice by `views_count` gets 4 images before v0**, or the hover interaction Sean explicitly asked for degrades to one image on launch.
2. **Atlas v0 — the boring, correct grid:** virtualized DOM, real search/filter/sort, hover preview, artist detail pages, placeholder mechanism. No 3D, no AI. *This is what ships first and earns its keep.*
3. **Queue** — own store, palette display, export to Design Brain Step 3.5 anchors, draft handoff to `app-make` with provenance. Flash: pull this into or immediately after v0; it is Sean's ask #3 and the thing that makes this his product rather than an offline clone.
4. **Random mode** — image flavour first, from a grammar *induced from the 4,272 real prompts* (they encode Sean's actual structural taste). Movie mode needs hand-authored film grammar; an image-prompt corpus cannot seed it, and shipping it without that is the word salad Sean forbade.
5. **AI assistant** in `app-ai`, catalog tools only, corpus guardrails compiled in.
6. **Three.js queue stage / hero** — last, as earned decoration.

### Wireframe — Atlas v0

```
┌──────────────────────────────────────────────────────────────────────┐
│  ATLAS   [ search styles, artists, tags…            ]  ⌘K            │
│  type: (all) artists srefs   country ▾   era ▾   sort: popular ▾     │
│  showing 9,521 · 1,412 have no image yet                             │
├──────────────────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│ │ image  │ │ image  │ │ ▨ no   │ │ image  │ │ image  │ │ image  │   │
│ │        │ │        │ │  image │ │        │ │        │ │        │   │
│ │Jan     │ │Pollock │ │ fetch↓ │ │f332016 │ │Crivelli│ │Mankes  │   │
│ │Mankes  │ │1912-56 │ │        │ │--sref  │ │        │ │        │   │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘   │
│      ↑ hover: 4 frames cross-fade + [+ queue]                        │
└──────────────────────────────────────────────────────────────────────┘
                    virtualized — only visible rows mount
```

**Artist cell (hover):** four frames · name · lifetime · country · `[+ queue]`
**Sref cell (hover):** four frames · `--sref 366290020` · `[copy]` · `[+ queue]` — the code IS the verb
**Detail page, artist:** biography, lifetime, country, optimal prompt, real corpus prompts that used this style, palette strip, `[+ queue]`
**Detail page, sref:** the code, palette strip, corpus prompts that used it, visually-similar by pHash, `[+ queue]`

```
QUEUE (own store — NOT `kept`)
┌──────────────────────────────────────────────┐
│ ▣ Jan Mankes    ▣ f332016    ▣ Pollock       │
│ palette: ███ ███ ███ ███                     │
│ [compose picture prompt]  [compose film]     │
│ [send draft → Make]   [export → Step 3.5]    │
└──────────────────────────────────────────────┘
```

### Architecture

```mermaid
flowchart TD
  A[all_styles.json 9,521] --> IDX[build index<br/>join + palette + pHash]
  B[artistic_details.json 5,505] --> IDX
  C[prompt-corpus.json 4,272] --> IDX
  S[scrape: images + manifest<br/>slug-keyed, resume-safe] --> IDX
  IDX --> MEM[(in-memory index ~10-20MB)]
  MEM --> GRID[virtualized DOM grid<br/>search · filter · sort]
  GRID -->|hover| PREV[4-frame preview]
  GRID -->|click| DET[detail: artist | sref]
  GRID & DET -->|+ queue| Q[(queue store<br/>NOT kept)]
  Q --> COMPOSE[compose draft<br/>grammar induced from real prompts]
  COMPOSE -->|draft + provenance| MAKE[app-make<br/>THE ONLY PROMPT WRITER]
  Q -->|style anchors| S35[Design Brain Step 3.5]
  MAKE --> COMFY[ComfyUI] --> JUDGE[Judge]
  AI[app-ai assistant<br/>catalog tools only] -.reads.-> MEM
  AI -.suggests into.-> Q
```

```mermaid
sequenceDiagram
  participant U as Sean
  participant G as Grid
  participant Q as Queue
  participant M as app-make
  U->>G: search "dutch symbolist"
  G-->>U: 34 cells (client-side, instant)
  U->>G: hover a cell
  G-->>U: 4 frames (local files, <100ms)
  U->>Q: + queue x3
  Q-->>U: palette strip from manifest
  U->>Q: compose picture prompt
  Q->>M: draft + provenance=atlas-queue
  Note over M: app-make stays the single writer;<br/>never-show-twice still holds
```

### Test plan

| Area | Test | Proves |
|---|---|---|
| Index | join integrity: every `artistic_details` slug exists in `all_styles` | the 42% hole is exactly 4,016, not silently larger |
| Index | null-rate snapshot per field | the filter bar never advertises a control that blanks the grid |
| Scrape | manifest schema + resume from partial | an interrupted 21-hour run continues |
| Scrape | missing-image slug renders the placeholder, never a broken tile | a partial scrape still ships |
| Grid | 9,521 cells: only visible rows mount | virtualization actually virtualizes |
| Grid | search latency budget on the full index | findability is the product |
| Cell | sref cell exposes the `--sref` token and copy action | the 42% has a verb |
| Queue | queueing does NOT write `kept` | a queued style never vanishes from browse |
| Queue | undo restores exactly | parity with the app's existing undo law |
| Compose | draft carries `provenance` | the Judge can tell atlas drafts from manual ones |
| Compose | Atlas never calls the Make writer directly | one writer, never-show-twice intact |
| Random | 200 held-out real prompts as a taste benchmark | "smart, not word salad" is measured, not asserted |
| Random | slot-compatibility rules reject an incoherent pairing | the coherence contract exists |
| AI | assistant cannot serve corpus images or corpus-derived prompts to a non-loopback origin | own-material law enforced in code |
| Guardrail | image directory unreachable by `git add -A` | mechanical, not aspirational |

### The gate before wireframing (Flash's one condition)

Run this first, it costs hours not days: **(a)** the five kills recorded as Sean-signed decisions; **(b)** a 40-page sample producing real images-per-slug counts by type; **(c)** the null-rate and slug-join audit. The blueprint will bake in exactly these numbers, and they are currently assumptions.

---

## 6. Pointers

- Blueprint v2 (part 1's build spec): `DESIGN-BRAIN-FIVE-SURFACE-BLUEPRINT-V2-2026-09-02.md`
- Five-surface review rev 3: `HOSTILE-DESIGN-REVIEW-FIVE-SURFACES-2026-09-01.md`
- Design-brain panel: `panel-design-brain-style-intelligence-2026-09-01/`
- Atlas vision + reviews: `brainstorms/swan-style-atlas-2026-09-03.md`, `panel-style-atlas-2026-09-03/`
- Step 3.5 procedure: `docs/ai-workflow/design-brain/style-intelligence.md`
- Taste-brain laws: memory `project_swan_taste_brain_and_prompter`
