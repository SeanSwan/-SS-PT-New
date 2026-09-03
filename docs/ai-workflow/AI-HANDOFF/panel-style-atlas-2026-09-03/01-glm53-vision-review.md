# HOSTILE REVIEW — the Swan Style Atlas vision (before any line is written) — reviewed by GLM (glm-5.3)

**Model:** glm-5.3
**Document:** .ai-workflow/atlas-review-head.md
**Tokens:** 2080 in / 9263 out (reasoning: 6677) | total 11343
**Wall:** 146.2s

---

**VERDICT: PROCEED WITH CHANGES**

The core is sound and, unusually, data-backed: 9,521 styles already harvested offline means this is genuinely an assembly job. But the vision as written spends its energy on the two things that will fail (3D everywhere, an AI ported from the wrong domain) and is silent on the thing that is actually the product at 9,521 cells: **search**. Also, one of Sean's stated requirements is quietly unsatisfiable for 42% of the grid, and the scrape contract that the whole hover interaction depends on is undefined. Details below.

---

**KILL**

1. **Three.js as the corpus-grid renderer.** 9,521 instanced quads is one draw call — trivial. What's not trivial: 9,521 text labels (sprites or SDF atlas pages), hover raycasting at 60fps, streaming ~38k images into GPU texture atlases, and click-routing into pages. That's weeks of work for zero findability gain, and scroll jank on an "awe surface" is the single fastest way to make Sean hate it. 3D is allowed on the **queue stage** (dozens of items, where depth/compare has a job) and a hero moment. Not the grid.
2. **"Adapted Swan Coach" as the AI's parent.** Coach is a fitness-domain agent with a fitness command surface, fitness permissions, and a fitness memory model. Porting it imports exactly the cross-project memory contamination vector the taste brain's laws (`one memory = profile × project`, own-material) exist to prevent — and you already had one leak ("rick and morty"). Build a new scoped assistant inside `app-ai`: catalog tools (search, compare, explain, queue ops, compose) with own-material law compiled in. Reuse nothing from Coach but maybe UI chrome.
3. **Queue built on `kept`/`picks` semantics.** `kept` means *never show again* — an archive verdict. A queue is a scratchpad whose items must be resurfaced and removable. Inherit the UI/undo *patterns*; do not inherit the store. Concrete failure if wired wrong: queuing a style marks it "seen" and it vanishes from browse and from future sessions.
4. **Atlas writing prompts directly into the Make → ComfyUI → Judge pipeline.** Two prompt writers means the Judge sees prompts with no provenance and near-duplicates break never-show-twice (keyed on prompt identity). Atlas produces **drafts and style anchors**, hands off to app-make as a prefilled draft with a provenance tag (`atlas-queue` / `atlas-random` / `manual`). One writer, ever.
5. **"Degrade to remote URL" for missing images.** It reintroduces the third-party CDN dependency the local scrape just eliminated and leaks referrers. Replace with a designed placeholder tile + a "fetch this slug" button that enqueues it into the next scrape run — the gap itself becomes a mechanic.

---

**BLOCKERS**

1. **The scrape contract is undefined and everything hangs on it.** How many images per slug? Hover-four-images implies up to **38,084 files** (~6–11 GB, ~21 hours at a polite 1 req/2s). If the scrape grabs 1 per slug, the hero interaction silently degrades. Decide: per-slug count (recommend 1 for all 9,521 first pass, 4 for the top ~2,000 by `views_count`), manifest schema (slug → files, dimensions, pHash, dominant palette, source_url), resume support, rate limit, abort conditions on 403s.
2. **The sref data hole.** `artistic_details.json` covers 5,505 artists; **4,016 sref cells (42%) have no bio, no lifetime, no country, no optimal prompt.** Requirement 4 ("richer than Midlibrary") is unsatisfiable there from local data. Decide the minimum viable sref cell before wireframe: join against `prompt-corpus.json` (which real prompts used the code), pHash clustering ("visually similar"), or a separate SREF tab with its own cell design.
3. **Single-writer decision for prompts** (see KILL 4) plus the provenance field the Judge will read. Must be decided before any surface exists that tempts a second writer.
4. **AI parentage decision** (see KILL 2) and its memory scope, recorded as a decision, not an adaptation.
5. **Queue store definition:** new transient store, persistence (session vs disk), undo, and the handoff format into Design Brain Step 3.5 as style anchors.
6. **Random-mode generative contract in writing:** structure, slot sources, coherence rules, and where movie-mode grammar comes from (see FINDING 6 — the 4,272-prompt corpus is image prompts and cannot seed film grammar).
7. **Duplication gate:** a one-pager mapping Atlas vs `app-gallery` vs `app-studio-brain` vs `app-design` — what each shows, one-way arrows between them. The pointers section demands this be *shown*, not asserted, before code.
8. **A 30–60 min data audit:** null rates per field (is `countries` populated enough to filter on?), slug join integrity between the two JSONs, tag cardinality. Cheap, and it de-risks the filter spec.

---

**FINDINGS**

1. **CRITICAL — Requirement 4 fails on 42% of the surface.** 4,016 of 9,521 cells are sref-styles with no artist metadata. Half the grid renders as anonymous numbers — the exact "generic" quality Sean said he hates. This is the stated want that will quietly not work unless blocked now (BLOCKER 2).
2. **CRITICAL — Hover-four-images is an unstated 38k-file scrape.** The vision records "scrape the photos" without a count. Everything user-facing (hover latency, offline operation, disk) is downstream of this one number. Also: the private-use posture is the owner's call, but the guardrail must be **mechanical, not aspirational** — content directory outside the repo tree *or* a pre-commit hook (gitignore alone has already proven insufficient against `git add -A` habits), loopback-only binding enforced in code, and the AI hard-blocked from serving corpus images or corpus-derived prompts to any non-loopback origin. The leak precedent exists; this surface makes the corpus trivially browsable, which raises the blast radius, not lowers it.
3. **HIGH — No search, filter, or sort anywhere in the vision.** At 9,521 cells, findability *is* the product; Midlibrary's virtue is its search and categories, not its thumbnails. The good news the vision misses: the full metadata is ~10–20 MB — it all fits in browser memory, so client-side fuzzy name search, country filter, era filter (from `lifetimeBirth` — artists only, see Finding 1), and popularity sort (`views_count`) are instant with no backend. Note `created_at`/`updated_at` are scrape dates, not era — don't let a blueprint mistake them for a timeline axis.
4. **MEDIUM — Three.js on the grid costs weeks and risks the awe it's meant to create.** See KILL 1. If Sean insists on proof, timebox a one-day spike; expect the texture-streaming work to be the wall, not the geometry.
5. **MEDIUM — Queue/pics coupling poison.** See KILL 3. Also, the queue's "show the colors" requirement implies a **palette-extraction pass** that exists nowhere in the plan — it must happen at scrape time (median-cut per image into the manifest), not at render time.
6. **MEDIUM — "Smart random" is unspecified, and its best asset is being underused.** The 4,272 real prompts encode Sean's actual structural taste — induce the grammar from *them* (slot skeleton from real prompts, vocabulary from catalog fields, coherence as slot-compatibility rules, e.g., era-vs-medium and named-artist pairings), deterministic core with snapshot tests, optional LLM polish on top. Movie mode **cannot** be induced from an image-prompt corpus — it needs hand-authored film grammar (shot type, camera move, duration, cuts). Budget that explicitly or movie mode ships as word salad, the exact thing Sean forbade.
7. **MEDIUM — sref `views_count`-style popularity is fine, but era filtering covers only the artist half.** Design the filter bar so it doesn't advertise an Era control that blanks out 42% of results.
8. **LOW — Referrer/dependency leak in the remote-URL fallback** (KILL 5).
9. **LOW — "Theme" appears in requirement 1 but no theme taxonomy exists in the data** beyond `global_tags`. Either themes come from tags (say so, after the audit checks tag quality) or drop the word.

---

**MISSING** *(a builder needs these on day one or will invent them badly)*

- **Image manifest schema** and the generation step (dims, pHash, palette, source_url per file) — this single artifact powers hover, placeholders, "visually similar," and the queue's color display.
- **Scrape runbook:** rate limit, resume, completeness report ("these 1,400 slugs have no images"), abort conditions, and the ignore/pre-commit enforcement.
- **Cell spec per type:** what's on an artist tile vs an sref tile; what the hover panel shows; what the detail page shows for each (artist: bio, lifetime, country, optimal prompt, real example prompts from the corpus; sref: ??? — that's the open half).
- **Search/filter/sort spec** (see Finding 3).
- **Queue data model, persistence, undo, and export format** to Design Brain Step 3.5.
- **Draft-handoff format into app-make + the provenance field.**
- **Random-mode grammar doc + validation set** (hold out 200 real prompts as the "this is my taste" benchmark).
- **Performance budget in numbers:** 60fps scroll, hover-reveal <100ms (only achievable if images are local *and* preloaded on tile-enter, not pointer-enter), initial index load <1s.
- **Placeholder design** for missing images.

---

**SEQUENCE**

1. **Data audit** (hours): null rates, slug joins, tag cardinality. Output feeds every spec above.
2. **Scrape tooling + manifest** (palette + pHash at scrape time). Start 1-per-slug across all 9,521 (~5h polite), then 4-per-slug for top-2,000 by `views_count`. Resume-safe, run overnight.
3. **Atlas v0 — the boring, correct grid:** virtualized DOM grid, real search/filter/sort, hover preview, artist detail pages, placeholder mechanism. No 3D, no AI, no queue. This alone is the Midlibrary interaction Sean pointed at, offline and instant. **This is what ships first and earns its keep.**
4. **Queue** as its own store, palette display, export to app-design anchors, draft handoff to app-make with provenance.
5. **Random mode v1** — image flavor first off the induced grammar; movie flavor after the film grammar is authored.
6. **AI assistant** scoped in `app-ai`, catalog tools only, corpus guardrails in code.
7. **Three.js queue stage / hero** — last, as earned decoration.

---

**ONE THING**

Make v0 a **virtualized DOM grid with real search, and demote Three.js to the queue stage only.** At 9,521 cells, findability is the product and a janky 3D scroll is the one thing guaranteed to make the owner hate the surface he asked to be beautiful — the awe belongs where there are forty items in a working set, not nine and a half thousand in a catalog.
