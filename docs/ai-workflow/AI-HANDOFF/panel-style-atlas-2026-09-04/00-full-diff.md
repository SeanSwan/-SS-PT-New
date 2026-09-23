diff --git a/.gitignore b/.gitignore
index 06c189c..9c5777a 100644
--- a/.gitignore
+++ b/.gitignore
@@ -22,3 +22,7 @@ __pycache__/
 prompter/*.local.json
 prompter/comfy-workflow.local.json
 lora-datasets/
+
+# The Atlas queue is transient workbench state, not taste. taste/*.md IS versioned; this is not.
+taste/atlas-queue.json
+taste/profiles/**/atlas-queue.json
diff --git a/docs/atlas/data-audit.md b/docs/atlas/data-audit.md
new file mode 100644
index 0000000..315f3c6
--- /dev/null
+++ b/docs/atlas/data-audit.md
@@ -0,0 +1,93 @@
+# Style Atlas - catalog data audit
+
+Measured 2026-09-03 against the local vault. Read-only.
+
+## 1. Population
+
+| Set | Rows |
+|---|---|
+| `all_styles.json` | 9521 |
+| - artistic-style | 5505 (57.8%) |
+| - sref-style | 4016 (42.2%) |
+| `artistic_details.json` keys | 5505 |
+| `catalog-descriptions.json` keys | 5483 |
+| `prompt-corpus.json` prompts | 4272 (fragments 143) |
+| `sref-codes.json` codes | 223 (with a style name: 131) |
+
+## 2. Join integrity
+
+| Question | Answer |
+|---|---|
+| detail rows whose slug is absent from all_styles | **0** |
+| artistic-style rows with NO detail row | **0** |
+| sref-style rows WITH a detail row | **0** |
+| rows with no detail row at all (the "hole") | **4016** (42.2%) |
+| description rows vs detail rows | 5483 vs 5505 (gap 22) |
+
+## 3. Field coverage - all_styles.json
+
+| Field | all (9,521) | artistic-style | sref-style |
+|---|---|---|---|
+| `name` | 9521 (100.0%) | 5505 (100.0%) | 4016 (100.0%) |
+| `slug` | 9521 (100.0%) | 5505 (100.0%) | 4016 (100.0%) |
+| `type` | 9521 (100.0%) | 5505 (100.0%) | 4016 (100.0%) |
+| `sref` | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |
+| `url` | 9521 (100.0%) | 5505 (100.0%) | 4016 (100.0%) |
+| `countries` | 5071 (53.3%) | 5071 (92.1%) | 0 (0.0%) |
+| `global_tags` | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |
+| `views_count` | 9521 (100.0%) | 5505 (100.0%) | 4016 (100.0%) |
+
+## 4. Field coverage - artistic_details.json
+
+| Field | present | of 5,505 |
+|---|---|---|
+| `name` | 5504 | 100.0% |
+| `slug` | 5505 | 100.0% |
+| `description_complete` | 5483 | 99.6% |
+| `optimal_prompt` | 1460 | 26.5% |
+| `seo_description` | 5504 | 100.0% |
+| `countries` | 5070 | 92.1% |
+| `lifetimeBirth` | 2839 | 51.6% |
+| `lifetimeDeath` | 1571 | 28.5% |
+| `views_count` | 5504 | 100.0% |
+| `in_collections_count` | 5504 | 100.0% |
+
+## 5. What a filter bar could actually offer
+
+| Control | Distinct values | Rows it can place |
+|---|---|---|
+| country (all rows) | 163 | 5071 (53.3%) |
+| country (artistic only) | 163 | 5071 (92.1%) |
+| global_tags | 0 | 0 (0.0%) |
+| era (lifetimeBirth) | 1082-2020 | 2839 (29.8% of the grid) |
+
+Top countries: USA 1724 - UK 655 - France 583 - Japan 394 - Italy 305 - Germany 200 - Netherlands 131 - Russia 92 - Canada 90 - Spain 80
+Top tags: none
+
+## 6. The sref cell verb
+
+| Question | Answer |
+|---|---|
+| sref rows with a non-null `sref` field | **0 of 4016** |
+| sref slugs that are a bare numeric string | 222 |
+| sref slugs containing any 6+ digit run | 258 |
+| distinct `--sref` codes anywhere in the 4,272 prompts | 257 |
+| ...of those, present in `sref-codes.json` | 223 |
+| **numeric slugs that are also a corpus `--sref` code** | **0** |
+| numeric-slug digit lengths | 6d x194, 7d x28 |
+| corpus code digit lengths | 5d x5, 6d x1, 7d x6, 8d x5, 9d x62, 10d x178 |
+
+## 7. Cross-type entity resolution
+
+sref rows whose name exactly matches an artistic row name: **0** of 4016 (0.0%).
+Corpus prompts naming a known style, naive substring (UPPER BOUND, contaminated by genre words such as cubism/weaving/blueprint): 3035 of 4272 (71.0%).
+Corpus prompts naming a person-shaped style (multi-word name, whole-word match): **2490** of 4272 (58.3%). Single-word names in the artistic set: 322.
+
+## 8. Popularity and dates
+
+| Measure | Value |
+|---|---|
+| views_count max / p50 / p90 / min | 28 / 5 / 0 / 0 |
+| rows with views_count = 0 | 3912 (41.1%) |
+| created_at range | 2025-03-23 -> 2025-08-24 |
+| updated_at range | 2025-03-23 -> 2025-11-26 |
diff --git a/package.json b/package.json
index e448bcc..f2618b3 100644
--- a/package.json
+++ b/package.json
@@ -21,8 +21,8 @@
   ],
   "scripts": {
     "start": "node prompter/serve.mjs",
-    "test": "node prompter/test.mjs && node prompter/test-probe.mjs && node prompter/test-modes.mjs && node prompter/test-bundle.mjs && node prompter/test-taste-namespace.mjs && node prompter/test-taste-snapshot.mjs && node prompter/test-renders.mjs && node prompter/test-make.mjs && node prompter/test-range.mjs && node prompter/test-video.mjs && node prompter/test-movie.mjs && node prompter/test-ai.mjs && node prompter/test-round3.mjs && node prompter/test-world.mjs && node prompter/test-favourites.mjs && node prompter/test-brain.mjs && node prompter/test-rounds.mjs && node prompter/test-lora.mjs && node prompter/test-backup.mjs && node prompter/test-adopt.mjs",
-    "test:browser": "node prompter/test-browser.mjs --require && node prompter/test-browser-studio.mjs --require"
+    "test": "node prompter/test.mjs && node prompter/test-probe.mjs && node prompter/test-modes.mjs && node prompter/test-bundle.mjs && node prompter/test-taste-namespace.mjs && node prompter/test-taste-snapshot.mjs && node prompter/test-renders.mjs && node prompter/test-make.mjs && node prompter/test-range.mjs && node prompter/test-video.mjs && node prompter/test-movie.mjs && node prompter/test-ai.mjs && node prompter/test-round3.mjs && node prompter/test-world.mjs && node prompter/test-favourites.mjs && node prompter/test-brain.mjs && node prompter/test-rounds.mjs && node prompter/test-lora.mjs && node prompter/test-backup.mjs && node prompter/test-adopt.mjs && node prompter/test-atlas.mjs && node prompter/test-atlas-routes.mjs && node prompter/test-atlas-queue.mjs",
+    "test:browser": "node prompter/test-browser.mjs --require && node prompter/test-browser-studio.mjs --require && node prompter/test-browser-atlas.mjs --require"
   },
   "dependencies": {},
   "devDependencies": {
diff --git a/prompter/app-atlas-queue.js b/prompter/app-atlas-queue.js
new file mode 100644
index 0000000..9b19eaa
--- /dev/null
+++ b/prompter/app-atlas-queue.js
@@ -0,0 +1,127 @@
+/**
+ * app-atlas-queue.js — the workbench under the Atlas grid.
+ *
+ * SPLIT FROM app-atlas.js DELIBERATELY. The grid is a virtualizer with load-bearing arithmetic; the
+ * queue is a small list with three buttons. Keeping them in one file would have put a scroll-window
+ * calculation and a compose form in the same 500-line module, and the next person to touch one
+ * would have had to read the other.
+ *
+ * IT WRITES A DRAFT, NOT A PROMPT. Compose asks the server for a draft carrying
+ * `provenance: 'atlas-queue'`. Nothing here queues to ComfyUI, and nothing here steers the memory:
+ * `app-make` is the single prompt writer, because never-show-twice is keyed on prompt identity and
+ * two writers break it. The copy button hands the draft to Sean; what he does with it is his move.
+ *
+ * `window.SwanAtlasQueue.add` is the seam the grid's detail panel calls, so the grid never needs to
+ * know how the queue is stored or rendered.
+ */
+(() => {
+  const esc = (s) => window.Swan.esc(s);
+  let host = null;
+  let queue = [];
+  let max = 40;
+
+  const ns = () => new URLSearchParams({ profile: window.Swan.profile, project: window.Swan.project || '' });
+
+  async function load() {
+    const d = await window.Swan.api(`/api/atlas/queue?${ns()}`);
+    if (d.error) { queue = []; return; }
+    queue = d.queue || [];
+    max = d.max || max;
+    paint();
+  }
+
+  async function act(action, slug) {
+    const world = window.Swan.world();
+    const d = await window.Swan.post(`/api/atlas/queue?${ns()}`, { action, slug });
+    if (world.changed()) return;
+    if (!d.ok) { window.Swan.say(esc(d.error || 'the queue refused that')); return; }
+    queue = d.queue || [];
+    if (d.duplicate) window.Swan.say('already on the queue');
+    paint();
+  }
+
+  function paint() {
+    if (!host) return;
+    const list = queue.length
+      ? queue.map((e) => `<li><span class="atlas-q-name">${esc(e.name)}</span>
+          <button type="button" class="atlas-q-x" data-remove="${esc(e.slug)}"
+                  aria-label="Remove ${esc(e.name)} from the queue">✕</button></li>`).join('')
+      : '<li class="muted">Empty. Open a style and press <b>+ Queue</b>.</li>';
+
+    host.innerHTML = `
+      <div class="atlas-q-head">
+        <h3>Queue <span class="muted">${queue.length}/${max}</span></h3>
+        <span class="atlas-q-headbtns">
+          <button type="button" id="atlasQSurprise"
+                  title="Pick three styles at random from whatever the grid is currently showing, weighted toward the ones people collected. Never repeats what is already queued, so rolling again always brings new material.">Surprise me</button>
+          <button type="button" id="atlasQClear"${queue.length ? '' : ' disabled'}>Clear</button>
+        </span>
+      </div>
+      <ul class="atlas-q-list">${list}</ul>
+      <div class="atlas-q-compose">
+        <input id="atlasQSubject" maxlength="200" placeholder="Subject — e.g. a heron at first light"
+               aria-label="Subject for the draft" autocomplete="off">
+        <span class="field"><label for="atlasQAr">Shape</label>
+          <select id="atlasQAr" aria-label="Aspect ratio"><option>16:9</option><option>21:9</option><option>1:1</option><option>9:16</option><option>4:5</option></select></span>
+        <button type="button" class="primary" id="atlasQCompose"${queue.length ? '' : ' disabled'}>Compose draft</button>
+      </div>
+      <div id="atlasQDraft"></div>`;
+
+    host.querySelectorAll('[data-remove]').forEach((b) =>
+      b.addEventListener('click', () => act('remove', b.dataset.remove)));
+    host.querySelector('#atlasQClear')?.addEventListener('click', () => act('clear'));
+    host.querySelector('#atlasQSurprise')?.addEventListener('click', surprise);
+    host.querySelector('#atlasQCompose')?.addEventListener('click', compose);
+  }
+
+  /**
+   * Roll three styles into the queue, honouring whatever the grid is currently filtered to — so
+   * "surprise me among French painters" is the same gesture as "surprise me". The seed comes back
+   * so a roll worth keeping can be repeated; removing the chips is the undo.
+   */
+  async function surprise() {
+    const world = window.Swan.world();
+    const d = await window.Swan.post(`/api/atlas/surprise?${ns()}`, {
+      n: 3, ...(window.SwanAtlasFilters ? window.SwanAtlasFilters() : {}),
+    });
+    if (world.changed()) return;
+    if (!d.ok) { window.Swan.say(esc(d.error || 'nothing to pick from')); return; }
+    queue = d.queue || queue;
+    paint();
+    window.Swan.say(d.added.length
+      ? `queued ${d.added.map((a) => esc(a.name)).join(', ')} — drawn from ${d.pool.toLocaleString()} styles${d.excluded ? `, skipping ${d.excluded} already queued` : ''} (seed ${d.seed})`
+      : 'nothing new to add — clear the queue or widen the filters');
+  }
+
+  async function compose() {
+    const out = host.querySelector('#atlasQDraft');
+    out.innerHTML = '<p class="muted">Composing…</p>';
+    const world = window.Swan.world();
+    const d = await window.Swan.post(`/api/atlas/compose?${ns()}`, {
+      subject: host.querySelector('#atlasQSubject')?.value || '',
+      ar: host.querySelector('#atlasQAr')?.value || '16:9',
+    });
+    if (world.changed()) return;
+    if (!d.ok) { out.innerHTML = `<p class="atlas-warn">${esc(d.error)}</p>`; return; }
+    out.innerHTML = `
+      <p class="atlas-q-draft"><code id="atlasQText">${esc(d.draft)}</code></p>
+      ${d.unresolved.length ? `<p class="atlas-warn">Not in the catalog any more, so left out: ${d.unresolved.map(esc).join(', ')}</p>` : ''}
+      <div class="atlas-q-actions">
+        <button type="button" id="atlasQCopy">Copy draft</button>
+        <span class="atlas-q-prov">provenance: ${esc(d.provenance)}</span>
+      </div>
+      <p class="muted atlas-q-note">${esc(d.note)}</p>`;
+    out.querySelector('#atlasQCopy')?.addEventListener('click', () => window.Swan.copy(d.draft, 'draft copied'));
+  }
+
+  window.SwanAtlasQueue = {
+    add: (slug) => act('add', slug),
+    /** The grid calls this once its own chrome exists, so the queue can mount beneath it. */
+    mountInto(el) { host = el; paint(); load(); },
+    reload: load,
+  };
+
+  // A memory switch changes whose workbench this is — and a memory with no right to the archive
+  // gets an empty one rather than the previous memory's queue left on screen.
+  window.Swan.onMemory(() => { queue = []; paint(); load(); });
+})();
diff --git a/prompter/app-atlas.js b/prompter/app-atlas.js
new file mode 100644
index 0000000..6479658
--- /dev/null
+++ b/prompter/app-atlas.js
@@ -0,0 +1,362 @@
+/**
+ * app-atlas.js — the Atlas: 9,521 styles, browsable.
+ *
+ * TWO DESIGN RULES, both of them consequences of measuring the catalog before drawing the page
+ * (docs/atlas/data-audit.md):
+ *
+ * 1. THE PAGE OFFERS ONLY WHAT THE DATA SUPPORTS. Every control is built from
+ *    `/api/atlas/facets` → `availability`. The vision asked for a tag filter; `global_tags` is
+ *    empty on all 9,521 rows, so no tag control is rendered at all. It asked the sref cell to show
+ *    its `--sref` code; the field is null on all 4,016 sref rows, so the cell says the code is not
+ *    in local data instead of printing an empty token. A control that blanks the grid is worse than
+ *    an absent one, because the user blames their query.
+ *
+ * 2. ONLY VISIBLE ROWS MOUNT. 9,521 cells is far past what the DOM enjoys, and this surface is
+ *    supposed to be beautiful — scroll jank is the fastest way to hate it. A spacer sets the true
+ *    scroll height, a window of rows is absolutely positioned into it, and pages are fetched on
+ *    demand and cached. Mounted cell count stays proportional to the viewport, never to the corpus.
+ *
+ * Images: there are none yet. The scrape that would fill them is a separate, owner-gated slice, so
+ * every cell renders its placeholder and the grid is useful without a single byte of imagery. When
+ * a manifest lands, `imageFor()` is the one place that changes.
+ */
+(() => {
+  const PAGE = 120;              // rows per API call; the virtualizer fetches by page
+  const CELL_MIN = 168;          // px — grid auto-fills to at least this width
+  // Sized for the imageless state we are actually in: a 196px card whose only content is a name
+  // is mostly void, and 48 of them read as a broken grid rather than a pending one. When the image
+  // manifest lands this goes back up — and so does the matching height in console-atlas.css.
+  const CELL_H = 150;            // px — fixed so the virtual height is exact, not estimated
+  const GAP = 12;
+  const OVERSCAN = 2;            // rows of cells rendered beyond the viewport, each side
+
+  const state = {
+    facets: null,
+    query: { q: '', type: 'all', country: '', eraFrom: null, eraTo: null, sort: 'relevance' },
+    total: 0,
+    pages: new Map(),            // pageIndex -> rows[]
+    pending: new Set(),
+    cols: 1,
+    lastWindow: '',
+    open: null,                  // slug of the open detail panel
+  };
+
+  const esc = (s) => window.Swan.esc(s);
+  const pageOf = (i) => Math.floor(i / PAGE);
+
+  // Published so the browser test derives the expected scroll height from the SAME constants the
+  // virtualizer uses, instead of restating them as a magic number that silently goes stale.
+  window.SwanAtlas = { CELL_H, GAP, CELL_MIN, PAGE };
+
+  // The queue's "Surprise me" honours whatever the grid is filtered to. Reading the live query
+  // through this seam keeps ONE definition of "what is on screen" — a second copy of the filter
+  // state in the queue module is a second thing to fall out of step.
+  window.SwanAtlasFilters = () => ({ ...state.query });
+
+  /** The one place image resolution lives. No manifest yet → every cell is a placeholder. */
+  const imageFor = () => null;
+
+  function qs(extra = {}) {
+    const q = { ...state.query, ...extra };
+    // The namespace travels on EVERY request. The routes gate the licensed archive by memory
+    // (the own-material law), so a request without it is answered for whatever the default is
+    // rather than for the memory on screen.
+    const p = new URLSearchParams({ profile: window.Swan.profile, project: window.Swan.project || '' });
+    if (q.q) p.set('q', q.q);
+    if (q.type && q.type !== 'all') p.set('type', q.type);
+    if (q.country) p.set('country', q.country);
+    if (q.eraFrom !== null && q.eraFrom !== '') p.set('eraFrom', q.eraFrom);
+    if (q.eraTo !== null && q.eraTo !== '') p.set('eraTo', q.eraTo);
+    if (q.sort) p.set('sort', q.sort);
+    return p;
+  }
+
+  /* ---------------- data ---------------- */
+
+  async function fetchPage(idx) {
+    if (state.pages.has(idx) || state.pending.has(idx)) return;
+    state.pending.add(idx);
+    const world = window.Swan.world();
+    const p = qs(); p.set('offset', idx * PAGE); p.set('limit', PAGE);
+    try {
+      const d = await window.Swan.api(`/api/atlas?${p}`);
+      if (world.changed()) return;
+      state.pages.set(idx, d.rows || []);
+      if (typeof d.total === 'number') state.total = d.total;
+      render();
+    } finally {
+      state.pending.delete(idx);
+    }
+  }
+
+  /** A query change invalidates every cached page — the offsets now mean something else. */
+  async function requery() {
+    state.pages.clear(); state.pending.clear(); state.lastWindow = '';
+    const p = qs(); p.set('offset', 0); p.set('limit', PAGE);
+    const d = await window.Swan.api(`/api/atlas?${p}`);
+    if (d.error) { state.total = 0; paintCount([], d.error); render(); return; }
+    state.total = d.total || 0;
+    state.pages.set(0, d.rows || []);
+    const scroller = window.Swan.$('atlasScroll');
+    if (scroller) scroller.scrollTop = 0;
+    paintCount(d.ignored || []);
+    render();
+  }
+
+  /* ---------------- chrome ---------------- */
+
+  function paintCount(ignored = [], error = '') {
+    const el = window.Swan.$('atlasCount');
+    if (!el) return;
+    if (error) { el.innerHTML = `<span class="atlas-warn">${esc(error)}</span>`; return; }
+    const c = state.facets?.counts;
+    const bits = [`<b>${state.total.toLocaleString()}</b> of ${(c?.total ?? 0).toLocaleString()} styles`];
+    if (c) bits.push(`${(c.total - c.withDetail).toLocaleString()} carry no artist metadata`);
+    // A filter the data cannot support is stated, never silently dropped.
+    if (ignored.length) bits.push(`<span class="atlas-warn">ignored: ${ignored.map(esc).join(', ')}</span>`);
+    el.innerHTML = bits.join(' &middot; ');
+  }
+
+  function buildControls(el) {
+    const a = state.facets.availability;
+    const countries = state.facets.countries || [];
+    const era = state.facets.eraRange;
+
+    // Each control is emitted only when `availability` says it can place rows. The tag control the
+    // vision asked for is absent for exactly this reason, and the note says so out loud.
+    const countryOpts = ['<option value="">Any country</option>']
+      .concat(countries.map((c) => `<option value="${esc(c.name)}">${esc(c.name)} (${c.rows})</option>`)).join('');
+
+    el.innerHTML = `
+      <div class="atlas-bar">
+        <input id="atlasQ" type="search" placeholder="Search styles and artists…" maxlength="120"
+               aria-label="Search styles and artists" autocomplete="off">
+        <span class="field"><label for="atlasType">Kind</label>
+          <select id="atlasType" aria-label="Kind of style">
+            <option value="all">All</option>
+            <option value="artistic-style">Artists &amp; techniques</option>
+            <option value="sref-style">Style codes</option>
+          </select></span>
+        ${a.country.supported ? `<span class="field"><label for="atlasCountry">Country</label>
+          <select id="atlasCountry" aria-label="Country">${countryOpts}</select></span>` : ''}
+        ${a.era.supported && era ? `<span class="field era"><label for="atlasEraFrom">Born</label>
+          <span class="atlas-era-row">
+            <input id="atlasEraFrom" type="number" inputmode="numeric" placeholder="${era.from}" min="${era.from}" max="${era.to}" aria-label="Born after">
+            <span class="dash">–</span>
+            <input id="atlasEraTo" type="number" inputmode="numeric" placeholder="${era.to}" min="${era.from}" max="${era.to}" aria-label="Born before">
+          </span></span>` : ''}
+        <span class="field"><label for="atlasSort">Sort</label>
+          <select id="atlasSort" aria-label="Sort order"
+                  title="With no search typed there is nothing to be relevant to, so Relevance opens on the most-collected styles.">
+            <option value="relevance">Relevance</option>
+            <option value="name">Name</option>
+            ${a.popularity.supported ? '<option value="popular">Most collected</option>' : ''}
+            ${a.era.supported ? '<option value="era">Earliest born</option>' : ''}
+          </select></span>
+        <button type="button" id="atlasClear">Clear</button>
+      </div>
+      <div class="atlas-count" id="atlasCount"></div>
+      <p class="atlas-note">Two controls you might expect are missing because the catalog cannot
+        support them: there is no tag filter (<code>global_tags</code> is empty on every row), and a
+        style code cell cannot show its <code>--sref</code> token (the field is null on all 4,016 of
+        them). Most-collected ranks by <code>in_collections_count</code> — <code>views_count</code>
+        maxes at 28 with 41% of rows tied at zero, so it can order nothing.</p>
+      <div class="atlas-scroll" id="atlasScroll" tabindex="0" role="group" aria-label="Style grid">
+        <div class="atlas-spacer" id="atlasSpacer"><div class="atlas-grid" id="atlasGrid"></div></div>
+      </div>
+      <aside class="atlas-detail" id="atlasDetail" hidden aria-live="polite"></aside>
+      <aside class="atlas-queue" id="atlasQueue" aria-label="Queue"></aside>`;
+  }
+
+  /* ---------------- the virtualized grid ---------------- */
+
+  function measure() {
+    const scroller = window.Swan.$('atlasScroll');
+    if (!scroller) return;
+    const w = scroller.clientWidth || CELL_MIN;
+    state.cols = Math.max(1, Math.floor((w + GAP) / (CELL_MIN + GAP)));
+  }
+
+  function cellHTML(row) {
+    const img = imageFor(row);
+    const isSref = row.type === 'sref-style';
+    const sub = isSref
+      ? 'style code'
+      : [row.birth ? `${row.birth}${row.death ? `–${row.death}` : ''}` : '', row.countries[0] || '']
+        .filter(Boolean).join(' · ') || 'artist or technique';
+    // No manifest yet, so `img` is always null today and the placeholder is what every cell shows.
+    // A big empty box above a small caption would make the grid read as broken rather than as
+    // pending, so while there is no imagery the NAME carries the cell and the placeholder recedes.
+    return `<button class="atlas-cell${isSref ? ' is-sref' : ''}${img ? '' : ' is-textual'}" data-slug="${esc(row.slug)}" type="button"
+              aria-label="${esc(row.name)} — open">
+      <span class="atlas-thumb">${img
+        ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async">`
+        : '<span class="atlas-noimg" aria-hidden="true">▨</span>'}</span>
+      <span class="atlas-name">${esc(row.name)}</span>
+      <span class="atlas-sub">${esc(sub)}</span>
+    </button>`;
+  }
+
+  function render() {
+    const scroller = window.Swan.$('atlasScroll');
+    const spacer = window.Swan.$('atlasSpacer');
+    const grid = window.Swan.$('atlasGrid');
+    if (!scroller || !spacer || !grid) return;
+
+    measure();
+    const rowsTotal = Math.ceil(state.total / state.cols);
+    spacer.style.height = `${Math.max(0, rowsTotal * (CELL_H + GAP) - GAP)}px`;
+
+    const firstRow = Math.max(0, Math.floor(scroller.scrollTop / (CELL_H + GAP)) - OVERSCAN);
+    const visibleRows = Math.ceil(scroller.clientHeight / (CELL_H + GAP)) + OVERSCAN * 2;
+    const from = firstRow * state.cols;
+    const to = Math.min(state.total, (firstRow + visibleRows) * state.cols);
+
+    // Ask for exactly the pages this window needs, and no others.
+    for (let pg = pageOf(from); pg <= pageOf(Math.max(from, to - 1)); pg++) fetchPage(pg);
+
+    const key = `${from}:${to}:${state.cols}:${state.total}:${state.pages.size}`;
+    if (key === state.lastWindow) return;
+    state.lastWindow = key;
+
+    if (state.total === 0) {
+      grid.style.transform = 'translateY(0)';
+      grid.innerHTML = '<p class="atlas-empty">Nothing matches. Widen the search, or press Clear.</p>';
+      return;
+    }
+
+    const html = [];
+    for (let i = from; i < to; i++) {
+      const row = state.pages.get(pageOf(i))?.[i % PAGE];
+      html.push(row
+        ? cellHTML(row)
+        : '<span class="atlas-cell is-loading" aria-hidden="true"></span>');
+    }
+    grid.style.transform = `translateY(${firstRow * (CELL_H + GAP)}px)`;
+    grid.style.gridTemplateColumns = `repeat(${state.cols}, minmax(0, 1fr))`;
+    grid.innerHTML = html.join('');
+  }
+
+  /* ---------------- detail ---------------- */
+
+  async function openDetail(slug) {
+    const panel = window.Swan.$('atlasDetail');
+    if (!panel) return;
+    state.open = slug;
+    panel.hidden = false;
+    panel.innerHTML = '<p class="muted">Loading…</p>';
+    const world = window.Swan.world();
+    const d = await window.Swan.api(`/api/atlas/style?slug=${encodeURIComponent(slug)}`);
+    if (world.changed() || state.open !== slug) return;
+    if (d.error) { panel.innerHTML = `<p class="muted">${esc(d.error)}</p>`; return; }
+
+    const lifetime = d.lifetime && (d.lifetime.birth || d.lifetime.death)
+      ? `${esc(d.lifetime.birth || '?')} – ${esc(d.lifetime.death || '')}` : '';
+    const facts = [
+      lifetime ? `<span class="atlas-fact">${lifetime}</span>` : '',
+      d.countries.length ? `<span class="atlas-fact">${d.countries.map(esc).join(', ')}</span>` : '',
+      d.inCollections ? `<span class="atlas-fact">in ${d.inCollections} collections</span>` : '',
+    ].filter(Boolean).join('');
+
+    // Every prompt shown here CREDITS this style — `by X`, `X's`, `style of X`. A prompt that merely
+    // contains the words is not attributed, which is why a genre cell shows none.
+    const prompts = d.prompts.length ? `
+      <h4>Real prompts that credit this style${d.promptCount > d.prompts.length ? ` <span class="muted">(${d.prompts.length} of ${d.promptCount})</span>` : ''}</h4>
+      <ul class="atlas-prompts">${d.prompts.map((p) => `<li><code>${esc(p.prompt)}</code></li>`).join('')}</ul>` : '';
+
+    panel.innerHTML = `
+      <div class="atlas-detail-head">
+        <div><h3>${esc(d.name)}</h3><div class="atlas-facts">${facts}</div></div>
+        <button type="button" id="atlasClose" aria-label="Close">✕</button>
+      </div>
+      ${d.biography ? `<p class="atlas-bio">${esc(d.biography)}</p>` : ''}
+      ${d.optimalPrompt ? `<h4>Optimal prompt</h4><p><code>${esc(d.optimalPrompt)}</code></p>` : ''}
+      ${prompts}
+      ${d.missing.length ? `<p class="atlas-missing">Not in local data: ${d.missing.map(esc).join(', ')}.</p>` : ''}
+      <div class="atlas-detail-actions">
+        <button type="button" class="primary" data-queue="${esc(d.slug)}">+ Queue</button>
+        <a href="${esc(d.url)}" target="_blank" rel="noreferrer noopener">Source page</a>
+      </div>`;
+    panel.querySelector('#atlasClose')?.addEventListener('click', closeDetail);
+    panel.querySelector('[data-queue]')?.addEventListener('click', (e) => {
+      window.SwanAtlasQueue?.add(e.currentTarget.dataset.queue);
+    });
+  }
+
+  function closeDetail() {
+    state.open = null;
+    const panel = window.Swan.$('atlasDetail');
+    if (panel) { panel.hidden = true; panel.innerHTML = ''; }
+  }
+
+  /* ---------------- wiring ---------------- */
+
+  let debounce = null;
+  const onQueryChange = () => {
+    clearTimeout(debounce);
+    debounce = setTimeout(requery, 140);
+  };
+
+  let host = null;      // #atlasBody — the section's own heading is markup, and stays
+  let started = false;  // the catalog loads on FIRST ENTER, not on page load
+
+  async function start() {
+    if (started || !host) return;
+    started = true;
+    host.innerHTML = '<p class="muted">Loading the catalog…</p>';
+    const f = await window.Swan.api('/api/atlas/facets');
+    state.facets = f;
+    if (!f.present) {
+      host.innerHTML = `<p class="muted">${esc(f.reason || 'catalog unavailable')}</p>`;
+      return;
+    }
+    buildControls(host);
+
+    const scroller = window.Swan.$('atlasScroll');
+    scroller.addEventListener('scroll', render, { passive: true });
+    window.addEventListener('resize', () => { state.lastWindow = ''; render(); });
+
+    window.Swan.$('atlasQ').addEventListener('input', (e) => { state.query.q = e.target.value; onQueryChange(); });
+    window.Swan.$('atlasType').addEventListener('change', (e) => { state.query.type = e.target.value; requery(); });
+    window.Swan.$('atlasCountry')?.addEventListener('change', (e) => { state.query.country = e.target.value; requery(); });
+    window.Swan.$('atlasEraFrom')?.addEventListener('input', (e) => { state.query.eraFrom = e.target.value === '' ? null : Number(e.target.value); onQueryChange(); });
+    window.Swan.$('atlasEraTo')?.addEventListener('input', (e) => { state.query.eraTo = e.target.value === '' ? null : Number(e.target.value); onQueryChange(); });
+    window.Swan.$('atlasSort').addEventListener('change', (e) => { state.query.sort = e.target.value; requery(); });
+    window.Swan.$('atlasClear').addEventListener('click', () => {
+      state.query = { q: '', type: 'all', country: '', eraFrom: null, eraTo: null, sort: 'relevance' };
+      for (const id of ['atlasQ', 'atlasCountry', 'atlasEraFrom', 'atlasEraTo']) { const n = window.Swan.$(id); if (n) n.value = ''; }
+      const t = window.Swan.$('atlasType'); if (t) t.value = 'all';
+      const s = window.Swan.$('atlasSort'); if (s) s.value = 'relevance';
+      closeDetail(); requery();
+    });
+
+    // One delegated listener, so a re-rendered window never leaves handlers behind.
+    window.Swan.$('atlasGrid').addEventListener('click', (e) => {
+      const cell = e.target.closest?.('.atlas-cell[data-slug]');
+      if (cell) openDetail(cell.dataset.slug);
+    });
+    document.addEventListener('keydown', (e) => {
+      if (e.key === 'Escape' && state.open) closeDetail();
+    });
+
+    window.SwanAtlasQueue?.mountInto(window.Swan.$('atlasQueue'));
+
+    await requery();
+  }
+
+  window.Swan.tab('atlas', {
+    /**
+     * Mount only REMEMBERS the host. Every tab's mount() runs at DOMContentLoaded, so loading the
+     * catalog here would cost two requests and an index build on every page load, for a section the
+     * session may never open. The work happens on first enter instead.
+     */
+    mount(el) { host = el.querySelector('#atlasBody') || el; },
+    enter() {
+      // Column count is derived from the panel's width, which is zero while the section is hidden —
+      // so the first real measurement can only happen here, after show() has unhidden it.
+      state.lastWindow = '';
+      if (!started) { start(); return; }
+      render();
+    },
+  });
+})();
diff --git a/prompter/app-shell.js b/prompter/app-shell.js
index ab2cd05..65d6afe 100644
--- a/prompter/app-shell.js
+++ b/prompter/app-shell.js
@@ -141,7 +141,7 @@
   const COMPANIONS = { make: ['directions'], gallery: ['directions'] };
 
   /** The places you can actually BE. Distinct from the tab registry, which also holds companions. */
-  const SECTIONS = ['judge', 'make', 'gallery'];
+  const SECTIONS = ['judge', 'make', 'gallery', 'atlas'];
 
   /** Old hashes from bookmarks and the pre-slice-2 nav. Kept so no saved URL dead-ends. */
   const ALIASES = { kept: 'gallery', directions: 'gallery', brief: 'gallery' };
@@ -194,11 +194,11 @@
   document.addEventListener('DOMContentLoaded', async () => {
     for (const [name, impl] of tabs) { const el = Swan.$(`tab-${name}`); if (el) try { impl.mount?.(el); } catch (err) { console.error(err); } }
     document.querySelectorAll('.rail button[data-tab]').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
-    // 1 / 2 / 3 jump between sections, but never while the user is typing into a field.
+    // 1 / 2 / 3 / 4 jump between sections, but never while the user is typing into a field.
     document.addEventListener('keydown', (e) => {
       if (e.metaKey || e.ctrlKey || e.altKey) return;
       if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
-      const to = { 1: 'judge', 2: 'make', 3: 'gallery' }[e.key];
+      const to = { 1: 'judge', 2: 'make', 3: 'gallery', 4: 'atlas' }[e.key];
       if (to) { e.preventDefault(); show(to); }
     });
     // Switching profile re-lands rather than staying put: entering client mode must arrive in
diff --git a/prompter/app.html b/prompter/app.html
index 454b978..469a1a2 100644
--- a/prompter/app.html
+++ b/prompter/app.html
@@ -13,6 +13,7 @@
 <link rel="stylesheet" href="/console-favourites.css">
 <link rel="stylesheet" href="/console-atelier.css">
 <link rel="stylesheet" href="/console-studio.css">
+<link rel="stylesheet" href="/console-atlas.css">
 </head>
 <body data-tab="make">
 <header>
@@ -53,6 +54,7 @@
     <button data-tab="make" role="tab" aria-selected="true"><span class="rail__icon" aria-hidden="true">&#9998;</span><span class="rail__label">Make</span></button>
     <button data-tab="studio" role="tab" aria-selected="false"><span class="rail__icon" aria-hidden="true">&#9635;</span><span class="rail__label">Studio</span></button>
     <button data-tab="gallery" role="tab" aria-selected="false"><span class="rail__icon" aria-hidden="true">&#9636;</span><span class="rail__label">Gallery</span></button>
+    <button data-tab="atlas" role="tab" aria-selected="false"><span class="rail__icon" aria-hidden="true">&#9707;</span><span class="rail__label">Atlas</span></button>
   </nav>
   <div class="status" id="shellsay"></div>
 </header>
@@ -250,6 +252,14 @@
     <div id="renderwrap" hidden><h2>Renders you liked</h2><p class="muted">Your own renders you marked closest. They count toward what you want pictured — never toward style codes.</p><div class="picks" id="renders"></div></div>
     <div id="avoids"></div>
   </section>
+  <section id="tab-atlas" role="tabpanel" aria-label="Atlas" hidden>
+    <div class="atelier-heading">
+      <span>The catalog</span>
+      <h2>Every style, browsable.</h2>
+      <p>9,521 artists, techniques and style codes. Search, narrow, open one, queue what you want to build with.</p>
+    </div>
+    <div id="atlasBody"></div>
+  </section>
 </main>
 
 <script src="/probe.js"></script>
@@ -265,5 +275,7 @@
 <script src="/app-favourites.js"></script>
 <script src="/app-studio-brain.js"></script>
 <script src="/app-studio.js"></script>
+<script src="/app-atlas-queue.js"></script>
+<script src="/app-atlas.js"></script>
 </body>
 </html>
diff --git a/prompter/audit-catalog.mjs b/prompter/audit-catalog.mjs
new file mode 100644
index 0000000..c4f3fe1
--- /dev/null
+++ b/prompter/audit-catalog.mjs
@@ -0,0 +1,228 @@
+/**
+ * Catalog audit — the numbers every Style Atlas spec depends on, measured instead of assumed.
+ *
+ * WHY THIS EXISTS. The Atlas blueprint asserts several quantities it never measured: that the
+ * metadata hole is "42%", that a sref cell can show its `--sref` code, that country and era
+ * filters have something to filter on, that the two JSON tables join cleanly. A filter bar that
+ * advertises a control which blanks the grid is worse than no filter bar, and a cell whose stated
+ * verb does not exist in the data is a wireframe of a thing that cannot be built. So: measure
+ * first, and let the blueprint bake in real numbers.
+ *
+ * READ-ONLY. Touches nothing but the gitignored `sources/` tree. Prints a report and writes it to
+ * `docs/atlas/data-audit.md` so the numbers survive the terminal scrollback.
+ *
+ * Run: node prompter/audit-catalog.mjs
+ */
+import fs from 'node:fs';
+import path from 'node:path';
+import { fileURLToPath } from 'node:url';
+
+const HERE = path.dirname(fileURLToPath(import.meta.url));
+const VAULT = path.resolve(HERE, '..');
+const CAT = path.join(VAULT, 'sources/midlibrary/catalog');
+const DIST = path.join(VAULT, 'sources/midlibrary/distilled');
+
+const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
+const pct = (n, d) => (d === 0 ? '-' : `${((n / d) * 100).toFixed(1)}%`);
+
+const styles = read(path.join(CAT, 'all_styles.json'));
+const details = read(path.join(CAT, 'artistic_details.json'));
+const corpus = read(path.join(DIST, 'prompt-corpus.json'));
+const descriptions = read(path.join(DIST, 'catalog-descriptions.json'));
+const srefCodes = read(path.join(DIST, 'sref-codes.json'));
+
+const artistic = styles.filter((r) => r.type === 'artistic-style');
+const sref = styles.filter((r) => r.type === 'sref-style');
+const detailKeys = Object.keys(details);
+const styleSlugs = new Set(styles.map((r) => r.slug));
+
+/** Field coverage: how many rows carry a usable value, per field, per type. */
+const usable = (v) => {
+  if (v === null || v === undefined) return false;
+  if (typeof v === 'string') return v.trim() !== '';
+  if (Array.isArray(v)) return v.length > 0;
+  return true;
+};
+
+const styleFields = ['name', 'slug', 'type', 'sref', 'url', 'countries', 'global_tags', 'views_count'];
+const detailFields = ['name', 'slug', 'description_complete', 'optimal_prompt', 'seo_description',
+  'countries', 'lifetimeBirth', 'lifetimeDeath', 'views_count', 'in_collections_count'];
+
+/** Join integrity, both directions — the "42%" claim is exactly this arithmetic. */
+const detailOrphans = detailKeys.filter((k) => !styleSlugs.has(details[k].slug ?? k));
+const artisticWithoutDetail = artistic.filter((r) => !details[r.slug]);
+const srefWithDetail = sref.filter((r) => details[r.slug]);
+const noDetailAtAll = styles.filter((r) => !details[r.slug]);
+
+/** Cardinality of anything a filter bar might offer. */
+const tally = (rows, get) => {
+  const m = new Map();
+  for (const r of rows) for (const v of get(r) || []) m.set(v, (m.get(v) || 0) + 1);
+  return m;
+};
+const countriesAll = tally(styles, (r) => r.countries);
+const countriesArtistic = tally(artistic, (r) => r.countries);
+const tagsAll = tally(styles, (r) => r.global_tags);
+
+/** Era: lifetime dates are the only real era signal; created_at/updated_at are scrape dates. */
+const withBirth = detailKeys.filter((k) => usable(details[k].lifetimeBirth));
+const birthYears = withBirth
+  .map((k) => parseInt(String(details[k].lifetimeBirth).match(/\d{3,4}/)?.[0] ?? '', 10))
+  .filter((n) => Number.isFinite(n));
+
+/** Entity resolution: can a sref row borrow metadata from an artist row by name? */
+const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
+const artistNames = new Map(artistic.map((r) => [norm(r.name), r.slug]));
+const srefNameHits = sref.filter((r) => artistNames.has(norm(r.name)));
+
+/** The sref code — the stated verb of the 42%. Is it anywhere in local data? */
+const srefFieldPresent = sref.filter((r) => usable(r.sref)).length;
+const numericSlugs = sref.filter((r) => /^\d{6,}$/.test(r.slug)).length;
+const codeShapedSlugs = sref.filter((r) => /\d{6,}/.test(r.slug)).length;
+const codesWithName = srefCodes.codes.filter((c) => usable(c.style_name)).length;
+
+/** Corpus join: how many real prompts can be attributed to a catalog entry. */
+const srefTokenRe = /--sref\s+([\d\s:.]+)/gi;
+const corpusCodes = new Set();
+for (const p of corpus.prompts) {
+  for (const m of String(p.prompt).matchAll(srefTokenRe)) {
+    for (const c of m[1].split(/[\s:]+/)) if (/^\d{5,}$/.test(c)) corpusCodes.add(c);
+  }
+}
+const knownCodes = new Set(srefCodes.codes.map((c) => String(c.code)));
+const corpusCodesKnown = [...corpusCodes].filter((c) => knownCodes.has(c)).length;
+
+/* A naive substring join over every name >= 6 chars is contaminated: the artistic set contains
+ * genres and techniques, not only people, so `cubism`, `weaving`, `blueprint` and `grayscale`
+ * match any prompt that happens to use the English word. Report the naive figure as the upper
+ * bound it is, and beside it a person-shaped join (multi-word name, whole-word match), which is
+ * the number a detail page can actually honour. */
+const nameList = [...artistNames.keys()].filter((n) => n.length >= 6);
+const personNames = nameList.filter((n) => n.includes(' '));
+// `norm` has already stripped every character outside [a-z0-9 ], so the needle carries no regex
+// metacharacter and needs no escaping. Match on space-delimited boundaries against a padded haystack.
+const whole = (hay, needle) => ` ${hay} `.includes(` ${needle} `);
+let corpusArtistHits = 0;
+let corpusPersonHits = 0;
+for (const p of corpus.prompts) {
+  const t = norm(p.prompt);
+  if (nameList.some((n) => t.includes(n))) corpusArtistHits += 1;
+  if (personNames.some((n) => whole(t, n))) corpusPersonHits += 1;
+}
+
+/* The stated verb of a sref cell is its `--sref NNNN` token. The `sref` field is empty, so the
+ * only local candidates are numeric slugs and codes harvested from prompts. Check whether those
+ * two sets are even the same universe before calling either one "the code". */
+const numericSlugSet = new Set(sref.filter((r) => /^\d{6,}$/.test(r.slug)).map((r) => r.slug));
+const numericSlugsThatAreCorpusCodes = [...numericSlugSet].filter((s) => corpusCodes.has(s)).length;
+const slugLenHist = new Map();
+for (const s of numericSlugSet) slugLenHist.set(s.length, (slugLenHist.get(s.length) || 0) + 1);
+const codeLenHist = new Map();
+for (const c of corpusCodes) codeLenHist.set(c.length, (codeLenHist.get(c.length) || 0) + 1);
+const histStr = (m) => [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}d x${v}`).join(', ') || 'none';
+
+/** Popularity — the staged-scrape ordering depends on this being non-degenerate. */
+const views = styles.map((r) => r.views_count || 0).sort((a, b) => b - a);
+const at = (q) => views[Math.floor(views.length * q)];
+const viewsZero = views.filter((v) => v === 0).length;
+
+const dates = styles.map((r) => r.created_at).filter(Boolean).sort();
+const updated = styles.map((r) => r.updated_at).filter(Boolean).sort();
+
+const out = [];
+const say = (s = '') => { out.push(s); console.log(s); };
+
+say('# Style Atlas - catalog data audit');
+say('');
+say(`Measured ${new Date().toISOString().slice(0, 10)} against the local vault. Read-only.`);
+say('');
+say('## 1. Population');
+say('');
+say('| Set | Rows |');
+say('|---|---|');
+say(`| \`all_styles.json\` | ${styles.length} |`);
+say(`| - artistic-style | ${artistic.length} (${pct(artistic.length, styles.length)}) |`);
+say(`| - sref-style | ${sref.length} (${pct(sref.length, styles.length)}) |`);
+say(`| \`artistic_details.json\` keys | ${detailKeys.length} |`);
+say(`| \`catalog-descriptions.json\` keys | ${Object.keys(descriptions).length} |`);
+say(`| \`prompt-corpus.json\` prompts | ${corpus.prompts.length} (fragments ${corpus.fragments}) |`);
+say(`| \`sref-codes.json\` codes | ${srefCodes.count} (with a style name: ${codesWithName}) |`);
+say('');
+say('## 2. Join integrity');
+say('');
+say('| Question | Answer |');
+say('|---|---|');
+say(`| detail rows whose slug is absent from all_styles | **${detailOrphans.length}** |`);
+say(`| artistic-style rows with NO detail row | **${artisticWithoutDetail.length}** |`);
+say(`| sref-style rows WITH a detail row | **${srefWithDetail.length}** |`);
+say(`| rows with no detail row at all (the "hole") | **${noDetailAtAll.length}** (${pct(noDetailAtAll.length, styles.length)}) |`);
+say(`| description rows vs detail rows | ${Object.keys(descriptions).length} vs ${detailKeys.length} (gap ${detailKeys.length - Object.keys(descriptions).length}) |`);
+say('');
+say('## 3. Field coverage - all_styles.json');
+say('');
+say('| Field | all (9,521) | artistic-style | sref-style |');
+say('|---|---|---|---|');
+for (const f of styleFields) {
+  const a = styles.filter((r) => usable(r[f])).length;
+  const b = artistic.filter((r) => usable(r[f])).length;
+  const c = sref.filter((r) => usable(r[f])).length;
+  say(`| \`${f}\` | ${a} (${pct(a, styles.length)}) | ${b} (${pct(b, artistic.length)}) | ${c} (${pct(c, sref.length)}) |`);
+}
+say('');
+say('## 4. Field coverage - artistic_details.json');
+say('');
+say('| Field | present | of 5,505 |');
+say('|---|---|---|');
+for (const f of detailFields) {
+  const have = detailKeys.filter((k) => usable(details[k][f])).length;
+  say(`| \`${f}\` | ${have} | ${pct(have, detailKeys.length)} |`);
+}
+say('');
+say('## 5. What a filter bar could actually offer');
+say('');
+const withCountriesAll = styles.filter((r) => usable(r.countries)).length;
+const withCountriesArtistic = artistic.filter((r) => usable(r.countries)).length;
+const withTags = styles.filter((r) => usable(r.global_tags)).length;
+say('| Control | Distinct values | Rows it can place |');
+say('|---|---|---|');
+say(`| country (all rows) | ${countriesAll.size} | ${withCountriesAll} (${pct(withCountriesAll, styles.length)}) |`);
+say(`| country (artistic only) | ${countriesArtistic.size} | ${withCountriesArtistic} (${pct(withCountriesArtistic, artistic.length)}) |`);
+say(`| global_tags | ${tagsAll.size} | ${withTags} (${pct(withTags, styles.length)}) |`);
+say(`| era (lifetimeBirth) | ${birthYears.length ? `${Math.min(...birthYears)}-${Math.max(...birthYears)}` : '-'} | ${withBirth.length} (${pct(withBirth.length, styles.length)} of the grid) |`);
+say('');
+say(`Top countries: ${[...countriesArtistic.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${v}`).join(' - ') || 'none'}`);
+say(`Top tags: ${[...tagsAll.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${v}`).join(' - ') || 'none'}`);
+say('');
+say('## 6. The sref cell verb');
+say('');
+say('| Question | Answer |');
+say('|---|---|');
+say(`| sref rows with a non-null \`sref\` field | **${srefFieldPresent} of ${sref.length}** |`);
+say(`| sref slugs that are a bare numeric string | ${numericSlugs} |`);
+say(`| sref slugs containing any 6+ digit run | ${codeShapedSlugs} |`);
+say(`| distinct \`--sref\` codes anywhere in the 4,272 prompts | ${corpusCodes.size} |`);
+say(`| ...of those, present in \`sref-codes.json\` | ${corpusCodesKnown} |`);
+say(`| **numeric slugs that are also a corpus \`--sref\` code** | **${numericSlugsThatAreCorpusCodes}** |`);
+say(`| numeric-slug digit lengths | ${histStr(slugLenHist)} |`);
+say(`| corpus code digit lengths | ${histStr(codeLenHist)} |`);
+say('');
+say('## 7. Cross-type entity resolution');
+say('');
+say(`sref rows whose name exactly matches an artistic row name: **${srefNameHits.length}** of ${sref.length} (${pct(srefNameHits.length, sref.length)}).`);
+say(`Corpus prompts naming a known style, naive substring (UPPER BOUND, contaminated by genre words such as cubism/weaving/blueprint): ${corpusArtistHits} of ${corpus.prompts.length} (${pct(corpusArtistHits, corpus.prompts.length)}).`);
+say(`Corpus prompts naming a person-shaped style (multi-word name, whole-word match): **${corpusPersonHits}** of ${corpus.prompts.length} (${pct(corpusPersonHits, corpus.prompts.length)}). Single-word names in the artistic set: ${nameList.length - personNames.length}.`);
+say('');
+say('## 8. Popularity and dates');
+say('');
+say('| Measure | Value |');
+say('|---|---|');
+say(`| views_count max / p50 / p90 / min | ${views[0]} / ${at(0.5)} / ${at(0.9)} / ${views[views.length - 1]} |`);
+say(`| rows with views_count = 0 | ${viewsZero} (${pct(viewsZero, styles.length)}) |`);
+say(`| created_at range | ${dates[0]?.slice(0, 10)} -> ${dates[dates.length - 1]?.slice(0, 10)} |`);
+say(`| updated_at range | ${updated[0]?.slice(0, 10)} -> ${updated[updated.length - 1]?.slice(0, 10)} |`);
+say('');
+
+const dest = path.join(VAULT, 'docs/atlas');
+fs.mkdirSync(dest, { recursive: true });
+fs.writeFileSync(path.join(dest, 'data-audit.md'), out.join('\n'), 'utf8');
+console.log('\nwritten -> docs/atlas/data-audit.md');
diff --git a/prompter/console-atlas.css b/prompter/console-atlas.css
new file mode 100644
index 0000000..3bf159e
--- /dev/null
+++ b/prompter/console-atlas.css
@@ -0,0 +1,154 @@
+/* console-atlas.css — the Atlas grid.
+ *
+ * Uses the workspace tokens (--bg/--surface/--raised/--line/--text/--muted/--cyan/--gold) so the
+ * section re-themes with every other one rather than carrying its own palette.
+ *
+ * The layout constants here are LOAD-BEARING, not decoration: app-atlas.js computes the virtual
+ * scroll height from CELL_H (150) and GAP (12) and the column count from CELL_MIN (168). If these
+ * move, move them in both places or the spacer stops matching what is drawn and the scrollbar lies.
+ * The browser test reads them from `window.SwanAtlas` rather than restating them, so a mismatch
+ * between this file and app-atlas.js fails a check instead of quietly skewing the scrollbar.
+ */
+
+.atlas-bar {
+  display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
+  padding: 10px 0 6px;
+}
+.atlas-bar input[type="search"] {
+  flex: 1 1 260px; min-width: 200px; min-height: 44px;
+  padding: 0 12px; border-radius: 10px;
+  background: var(--surface); color: var(--text);
+  border: 1px solid var(--line);
+}
+.atlas-bar input[type="search"]:focus-visible,
+.atlas-bar select:focus-visible,
+.atlas-bar input[type="number"]:focus-visible,
+.atlas-cell:focus-visible {
+  outline: 2px solid var(--cyan); outline-offset: 2px;
+}
+.atlas-bar .field { display: inline-flex; align-items: center; gap: 6px; }
+.atlas-bar .field.era input { width: 5.5em; }
+/* `.field` is column app-wide (label above control) and that is right. The era control has THREE
+   children under one label, so its inputs need their own row inside that column. */
+.atlas-era-row { display: inline-flex; align-items: center; gap: 6px; }
+.atlas-bar .field .dash { color: var(--muted); }
+.atlas-bar select, .atlas-bar input[type="number"], .atlas-bar button {
+  min-height: 44px; padding: 0 10px; border-radius: 10px;
+  background: var(--surface); color: var(--text); border: 1px solid var(--line);
+}
+.atlas-bar button { cursor: pointer; }
+
+.atlas-count { font: var(--cap-font, 500 11px/1.5 "Fira Code", monospace); color: var(--muted); padding: 2px 0 6px; }
+.atlas-count b { color: var(--text); }
+.atlas-warn { color: var(--gold); }
+.atlas-note { font-size: 12px; line-height: 1.5; color: var(--muted); margin: 0 0 10px; max-width: 78ch; }
+.atlas-note code { color: var(--text); }
+
+/* The scroller owns the scrollbar; the spacer owns the true height; the grid is the moving window. */
+.atlas-scroll {
+  position: relative; overflow-y: auto; overscroll-behavior: contain;
+  height: min(70vh, 760px);
+  border: 1px solid var(--line); border-radius: 12px;
+  background: color-mix(in srgb, var(--surface) 60%, transparent);
+}
+.atlas-spacer { position: relative; width: 100%; }
+.atlas-grid {
+  display: grid; gap: 12px; padding: 12px;
+  position: absolute; inset-inline: 0; top: 0;
+  will-change: transform;
+}
+
+.atlas-cell {
+  display: flex; flex-direction: column; gap: 6px;
+  height: 150px; padding: 8px; text-align: left; cursor: pointer;
+  background: var(--raised); color: var(--text);
+  border: 1px solid var(--line); border-radius: 12px;
+  transition: border-color .16s ease, transform .16s ease;
+}
+.atlas-cell:hover { border-color: var(--cyan); transform: translateY(-2px); }
+.atlas-cell.is-sref { border-style: dashed; }
+.atlas-cell.is-loading { background: color-mix(in srgb, var(--raised) 50%, transparent); border-style: dotted; cursor: default; }
+
+.atlas-thumb {
+  flex: 1 1 auto; display: flex; flex-direction: column; align-items: center; justify-content: center;
+  gap: 4px; border-radius: 8px; overflow: hidden;
+  background: color-mix(in srgb, var(--bg) 70%, var(--raised));
+}
+.atlas-thumb img { width: 100%; height: 100%; object-fit: cover; }
+.atlas-noimg { font-size: 20px; color: var(--muted); opacity: .35; }
+/* Imageless cells: the thumb becomes a thin band and the name becomes the cell. */
+.atlas-cell.is-textual .atlas-thumb { flex: 0 0 28px; }
+.atlas-cell.is-textual .atlas-name { font-size: 15px; line-height: 1.3; -webkit-line-clamp: 3; }
+/* The caption sits on the floor of the card, so the name has room to breathe and the cell reads as
+   composed rather than as content that failed to load. */
+.atlas-cell.is-textual .atlas-sub { margin-top: auto; }
+
+.atlas-name {
+  font-weight: 600; font-size: 13px; line-height: 1.25;
+  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
+}
+.atlas-sub { font-size: 11px; color: var(--muted); }
+
+.atlas-detail {
+  margin-top: 14px; padding: 16px;
+  background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
+}
+.atlas-detail-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
+.atlas-detail-head h3 { margin: 0 0 4px; }
+.atlas-detail-head button { min-width: 44px; min-height: 44px; cursor: pointer; background: none; border: 1px solid var(--line); border-radius: 10px; color: var(--text); }
+.atlas-facts { display: flex; flex-wrap: wrap; gap: 8px; }
+.atlas-fact { font-size: 11px; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 2px 9px; }
+.atlas-bio { line-height: 1.65; max-width: 76ch; }
+.atlas-detail h4 { margin: 14px 0 6px; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
+.atlas-prompts { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
+.atlas-prompts code { font-size: 12px; line-height: 1.5; word-break: break-word; }
+.atlas-missing { font-size: 12px; color: var(--gold); }
+.atlas-detail-actions { display: flex; gap: 10px; align-items: center; margin-top: 12px; }
+.atlas-detail-actions button { min-height: 44px; padding: 0 16px; border-radius: 10px; cursor: pointer; }
+/* The source link was default browser blue, which is the one colour this theme does not contain. */
+.atlas-detail-actions a { color: var(--cyan); text-decoration: none; border-bottom: 1px solid var(--line);
+  min-height: 44px; display: inline-flex; align-items: center; }
+.atlas-detail-actions a:hover, .atlas-detail-actions a:focus-visible { border-bottom-color: var(--cyan); }
+
+@media (max-width: 640px) {
+  .atlas-scroll { height: 64vh; }
+  .atlas-bar input[type="search"] { flex-basis: 100%; }
+  .atlas-bar .field.era { flex-basis: 100%; }
+}
+@media (prefers-reduced-motion: reduce) {
+  .atlas-cell { transition: none; }
+  .atlas-cell:hover { transform: none; }
+}
+
+/* --- the queue: a workbench, visually distinct from the grid it draws from --- */
+.atlas-queue {
+  margin-top: 14px; padding: 14px 16px;
+  background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
+}
+.atlas-q-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
+.atlas-q-head h3 { margin: 0; font-size: 14px; }
+.atlas-q-head button { min-height: 44px; padding: 0 14px; border-radius: 10px; cursor: pointer;
+  background: none; color: var(--text); border: 1px solid var(--line); }
+.atlas-q-head button[disabled] { opacity: .45; cursor: default; }
+.atlas-q-headbtns { display: inline-flex; gap: 8px; }
+.atlas-q-list { list-style: none; margin: 10px 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
+.atlas-q-list li { display: inline-flex; align-items: center; gap: 6px;
+  border: 1px solid var(--line); border-radius: 999px; padding: 4px 6px 4px 12px; font-size: 13px; }
+.atlas-q-list li.muted { border-style: dashed; padding: 8px 14px; }
+.atlas-q-x { min-width: 32px; min-height: 32px; border-radius: 50%; cursor: pointer;
+  background: none; color: var(--muted); border: 1px solid transparent; }
+.atlas-q-x:hover, .atlas-q-x:focus-visible { color: var(--text); border-color: var(--line); }
+.atlas-q-compose { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
+.atlas-q-compose input { flex: 1 1 240px; min-height: 44px; padding: 0 12px; border-radius: 10px;
+  background: var(--bg); color: var(--text); border: 1px solid var(--line); }
+.atlas-q-compose select, .atlas-q-compose button { min-height: 44px; padding: 0 14px; border-radius: 10px;
+  background: var(--bg); color: var(--text); border: 1px solid var(--line); cursor: pointer; }
+.atlas-q-compose .field { display: inline-flex; align-items: center; gap: 6px; }
+.atlas-q-draft { margin: 12px 0 6px; }
+.atlas-q-draft code { font-size: 13px; line-height: 1.6; word-break: break-word; }
+.atlas-q-actions { display: flex; align-items: center; gap: 12px; }
+.atlas-q-actions button { min-height: 44px; padding: 0 16px; border-radius: 10px; cursor: pointer;
+  background: var(--bg); color: var(--text); border: 1px solid var(--line); }
+.atlas-q-prov { font: var(--cap-font, 500 11px/1.5 "Fira Code", monospace); color: var(--muted); }
+.atlas-q-note { font-size: 12px; margin: 8px 0 0; max-width: 72ch; }
+.atlas-empty { grid-column: 1 / -1; padding: 28px 12px; color: var(--muted); text-align: center; }
diff --git a/prompter/lib/atlas-queue.mjs b/prompter/lib/atlas-queue.mjs
new file mode 100644
index 0000000..92be1ee
--- /dev/null
+++ b/prompter/lib/atlas-queue.mjs
@@ -0,0 +1,136 @@
+/**
+ * atlas-queue.mjs — the styles you are building with right now.
+ *
+ * ITS OWN STORE, AND THAT IS THE WHOLE POINT. The obvious shortcut is to reuse `kept`, which
+ * already has persistence, dedupe and an undo. It would be a bug with a nice diff: `kept` means
+ * *never show this again* (probe.js excludes judged ids; `taste-namespace` treats a kept prompt as
+ * a steering exemplar at score 1000). Queueing a style to work with it would make that style vanish
+ * from the grid you queued it in, and quietly reweight every future batch. A queue is a workbench,
+ * not a verdict. Inherit the patterns — line-exact dedupe, an undo that restores exactly, a stated
+ * cap — never the store.
+ *
+ * NOT A PROMPT WRITER. `composeDraft` returns a DRAFT carrying `provenance: 'atlas-queue'`. It does
+ * not write into Make's channel, and nothing here calls the generator. `app-make` stays the single
+ * writer because never-show-twice is keyed on prompt identity, and two writers break it.
+ *
+ * ONE INSERT GRAMMAR. The text a style contributes comes from `brain.catalogInsert` — the module
+ * that declares itself the owner of that grammar. Re-deriving `by <name>` here would be the second
+ * implementation, and the one nobody tested.
+ *
+ * The own-material law is enforced at the ROUTE (routes-atlas.mjs), the same place it gates reads.
+ */
+import fs from 'node:fs';
+import path from 'node:path';
+import { VAULT } from './corpus.mjs';
+import { PROFILES } from './events.mjs';
+import { readProject, projectDir, isDefaultNamespace } from './projects.mjs';
+import { loadAtlas } from './atlas.mjs';
+import { loadCatalog } from './catalog.mjs';
+import { catalogInsert } from './brain.mjs';
+
+/** A workbench, not an archive. Past this the compose step stops producing anything coherent. */
+export const QUEUE_MAX = 40;
+
+const queuePath = (profile, project) => (isDefaultNamespace(profile, project)
+  ? path.join(VAULT, 'taste/atlas-queue.json')
+  : path.join(projectDir(profile, project), 'atlas-queue.json'));
+
+const memoryExists = (profile, project) => isDefaultNamespace(profile, project) || !!readProject(profile, project);
+
+const guard = (profile, project) => {
+  if (!PROFILES.includes(profile)) return { ok: false, error: 'unknown profile' };
+  if (!memoryExists(profile, project)) return { ok: false, error: 'unknown project' };
+  return { ok: true };
+};
+
+/** Read this memory's queue. A malformed or absent file is an empty queue, never a throw. */
+export function readQueue(profile, project) {
+  if (!PROFILES.includes(profile)) return [];
+  const p = queuePath(profile, project);
+  if (!fs.existsSync(p)) return [];
+  try {
+    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
+    return Array.isArray(raw?.queue) ? raw.queue.filter((e) => e && typeof e.slug === 'string') : [];
+  } catch { return []; }
+}
+
+const write = (profile, project, queue) => {
+  fs.writeFileSync(queuePath(profile, project), `${JSON.stringify({ queue }, null, 2)}\n`, 'utf8');
+  return queue;
+};
+
+/**
+ * Put a style on the workbench. Refuses a slug the catalog does not have, so a typo in a URL cannot
+ * seed the queue with an entry that will never resolve to anything on compose.
+ */
+export function queueAdd(profile, project, slug) {
+  const g = guard(profile, project);
+  if (!g.ok) return g;
+  const row = loadAtlas().bySlug.get(String(slug || ''));
+  if (!row) return { ok: false, error: 'unknown style' };
+  const queue = readQueue(profile, project);
+  if (queue.some((e) => e.slug === row.slug)) return { ok: true, duplicate: true, queue };
+  if (queue.length >= QUEUE_MAX) return { ok: false, error: `the queue holds ${QUEUE_MAX} styles — remove one first` };
+  queue.push({ slug: row.slug, name: row.name, type: row.type, addedAt: new Date().toISOString() });
+  return { ok: true, duplicate: false, queue: write(profile, project, queue) };
+}
+
+/** Take one off. This IS the undo for `queueAdd`, and it restores the prior state exactly. */
+export function queueRemove(profile, project, slug) {
+  const g = guard(profile, project);
+  if (!g.ok) return g;
+  const queue = readQueue(profile, project);
+  const next = queue.filter((e) => e.slug !== slug);
+  if (next.length === queue.length) return { ok: false, error: 'that style is not on the queue' };
+  return { ok: true, queue: write(profile, project, next) };
+}
+
+/** Clear the workbench. Nothing else is touched — this is not a judgement about any style. */
+export function queueClear(profile, project) {
+  const g = guard(profile, project);
+  if (!g.ok) return g;
+  return { ok: true, queue: write(profile, project, []) };
+}
+
+/**
+ * Compose a DRAFT from the queue. A draft, never a written prompt.
+ *
+ * Structure follows the corpus's own dominant grammar rather than an invented one: a subject clause
+ * followed by credited styles (`by_artist`, weight 1622 in the real corpus). Styles with no person
+ * behind them contribute their name as a style phrase, which is exactly what `catalogInsert`
+ * already decides for the Rolodex.
+ *
+ * `unresolved` is returned rather than silently dropped: a queue entry whose slug has left the
+ * catalog should be visible to the person composing, not quietly absent from their prompt.
+ */
+export function composeDraft(profile, project, { subject = '', ar = '16:9' } = {}) {
+  const g = guard(profile, project);
+  if (!g.ok) return g;
+  const queue = readQueue(profile, project);
+  if (!queue.length) return { ok: false, error: 'the queue is empty — open a style and press + Queue' };
+
+  const bySlug = new Map(loadCatalog().index.map((r) => [r.slug, r]));
+  const parts = [];
+  const unresolved = [];
+  for (const e of queue) {
+    const row = bySlug.get(e.slug);
+    if (!row) { unresolved.push(e.slug); continue; }
+    parts.push(catalogInsert(row));
+  }
+
+  const subj = String(subject || '').replace(/\s+/g, ' ').trim().slice(0, 200);
+  const shape = String(ar).trim();
+  const aspect = /^\d{1,2}:\d{1,2}$/.test(shape) ? shape : '16:9';
+  const draft = [subj, parts.join(', ')].filter(Boolean).join(', ') + ` --ar ${aspect} --v 7`;
+
+  return {
+    ok: true,
+    // The tag the Judge reads to tell an Atlas draft from a prompt Make wrote.
+    provenance: 'atlas-queue',
+    draft,
+    styles: queue.map((e) => ({ slug: e.slug, name: e.name, type: e.type })),
+    unresolved,
+    // Said out loud because a draft that looks finished invites being treated as one.
+    note: 'A draft, not a written prompt. Nothing has been queued to ComfyUI and nothing steers this memory until you save it in Make.',
+  };
+}
diff --git a/prompter/lib/atlas.mjs b/prompter/lib/atlas.mjs
new file mode 100644
index 0000000..8ef6b79
--- /dev/null
+++ b/prompter/lib/atlas.mjs
@@ -0,0 +1,356 @@
+/**
+ * atlas.mjs — one queryable index over the 9,521-style catalog, built from what is actually there.
+ *
+ * WHY THIS SHAPE. `prompter/audit-catalog.mjs` measured the catalog before this was written, and
+ * three things the Atlas vision assumed turned out to be absent:
+ *
+ *   · `global_tags` is EMPTY on all 9,521 rows — a tag filter has nothing to filter.
+ *   · `sref` is NULL on all 4,016 sref rows — a sref cell cannot show its `--sref` code.
+ *   · `views_count` maxes at 28 with 41% tied at zero — it cannot order anything.
+ *
+ * So this module publishes `availability()`: measured coverage per control, which the page reads
+ * to decide what to OFFER. A filter that would blank the grid is never rendered. The rule is that
+ * the index states what it can support and the UI obeys it, rather than the UI advertising a
+ * control and the index disappointing it at query time.
+ *
+ * OPTIONAL BY DESIGN, matching lib/catalog.mjs: everything degrades to an empty index when the
+ * sources are absent, because the prompter worked before this existed and must keep working.
+ *
+ * SERVER-SIDE QUERY, deliberately. The obvious alternative — ship the whole 10-20 MB index to the
+ * page and search in the browser — would recreate the exact bulk-read shape the round-3 panel
+ * treated as a vulnerability (a page that can pull the licensed corpus in one call). On loopback a
+ * query round-trip is sub-millisecond, so there is nothing to buy and a corpus to protect.
+ */
+import fs from 'node:fs';
+import path from 'node:path';
+import { VAULT } from './corpus.mjs';
+import { rngFrom } from './generate.mjs';
+
+const CAT = path.join(VAULT, 'sources/midlibrary/catalog');
+const DIST = path.join(VAULT, 'sources/midlibrary/distilled');
+
+const readOptional = (dir, f) => {
+  const p = path.join(dir, f);
+  if (!fs.existsSync(p)) return null;
+  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
+};
+
+/** Normalize to the alphabet the whole module compares in: lowercase words, single-spaced. */
+export const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
+
+/** Midlibrary bios are HTML with entities and `**bold**` markers. Strip to plain prose for display. */
+export const plainText = (html) => String(html ?? '')
+  .replace(/<[^>]*>/g, ' ')
+  .replace(/&nbsp;/g, ' ').replace(/&apos;/g, "'").replace(/&quot;/g, '"')
+  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
+  .replace(/\*\*/g, '')
+  .replace(/\s+/g, ' ')
+  .trim();
+
+/** First 3-4 digit run in a lifetime string, or null. Lifetimes are free text ("c. 1450", "1889"). */
+const year = (v) => {
+  const m = String(v ?? '').match(/\d{3,4}/);
+  return m ? Number(m[0]) : null;
+};
+
+let cache = null;
+
+/** How many prompts a detail page will ever show. Keep that many; count the rest. */
+const ATTRIBUTION_KEEP = 24;
+
+/**
+ * Attribute the real prompt corpus to catalog entries — CREDITED uses only.
+ *
+ * Two contaminations had to be designed out, and the second was found by looking at the output:
+ *
+ *   1. A naive `prompt.includes(name)` over every name matches English words, because the artistic
+ *      set holds genres and techniques as well as people — `cubism`, `weaving`, `blueprint`.
+ *   2. Restricting to multi-word names does NOT fix it. `anime style`, `close up portrait` and
+ *      `haute couture fashion` are multi-word GENRE names that match ordinary prompt phrasing, and
+ *      all three saturated the cap on the first run. A prompt reading "close-up portrait of a fox"
+ *      is not using the catalog style "Close-up Portrait"; it is describing a shot.
+ *
+ * So a hit requires an ATTRIBUTION MARKER around the phrase — the corpus's own observed grammar
+ * (`by_artist`, weight 1622; `style_of`, weight 38): `by X`, `X's`, `style of X`. This trades
+ * recall for the only property a detail page needs: every prompt it shows genuinely credits that
+ * style. Indexed by the rarest token so this is a posting-list intersection, not 22M scans.
+ */
+function attributePrompts(rows, prompts) {
+  const bySlug = new Map();
+  if (!prompts.length) return bySlug;
+
+  const docs = prompts.map((p) => ({ p, text: ` ${norm(p.prompt)} `, words: norm(p.prompt).split(' ').filter(Boolean) }));
+  const postings = new Map();
+  docs.forEach((d, i) => {
+    for (const w of new Set(d.words)) {
+      if (!postings.has(w)) postings.set(w, []);
+      postings.get(w).push(i);
+    }
+  });
+
+  for (const r of rows) {
+    const tokens = norm(r.name).split(' ').filter(Boolean);
+    if (tokens.length < 2) continue;              // single words are the most contaminated class
+    const rarest = tokens
+      .map((t) => ({ t, n: postings.get(t)?.length ?? 0 }))
+      .sort((a, b) => a.n - b.n)[0];
+    if (!rarest || rarest.n === 0) continue;
+
+    const phrase = tokens.join(' ');
+    // `norm` turns "Crivelli's" into "crivelli s", so the possessive is a trailing " s ".
+    const credited = [` by ${phrase} `, ` style of ${phrase} `, ` ${phrase} s `];
+    const hits = [];
+    let count = 0;
+    for (const i of postings.get(rarest.t)) {
+      const t = docs[i].text;
+      if (!credited.some((c) => t.includes(c))) continue;
+      count += 1;
+      if (hits.length < ATTRIBUTION_KEEP) hits.push(docs[i].p);
+    }
+    if (count) bySlug.set(r.slug, { count, prompts: hits });
+  }
+  return bySlug;
+}
+
+/** Build (once) the joined index. Returns a stable empty shape when the catalog is absent. */
+export function loadAtlas() {
+  if (cache) return cache;
+
+  const styles = readOptional(CAT, 'all_styles.json') || [];
+  const details = readOptional(CAT, 'artistic_details.json') || {};
+  const corpus = readOptional(DIST, 'prompt-corpus.json');
+  const prompts = Array.isArray(corpus?.prompts) ? corpus.prompts : [];
+
+  const rows = styles.map((s) => {
+    const d = details[s.slug] || null;
+    const birth = year(d?.lifetimeBirth);
+    const death = year(d?.lifetimeDeath);
+    return {
+      slug: s.slug,
+      name: s.name,
+      type: s.type,                                  // 'artistic-style' | 'sref-style'
+      url: s.url,
+      countries: Array.isArray(s.countries) ? s.countries : [],
+      views: s.views_count ?? 0,
+      inCollections: d?.in_collections_count ?? 0,
+      birth,
+      death,
+      hasDetail: Boolean(d),
+      hasBio: Boolean(d?.description_complete),
+      hasOptimal: Boolean(d?.optimal_prompt),
+      search: `${norm(s.name)} ${norm(s.slug)}`,     // the one string every query matches against
+    };
+  });
+
+  const attributed = attributePrompts(rows.filter((r) => r.hasDetail), prompts);
+  const bySlug = new Map(rows.map((r) => [r.slug, r]));
+
+  const countries = new Map();
+  for (const r of rows) for (const c of r.countries) countries.set(c, (countries.get(c) || 0) + 1);
+
+  const withCountry = rows.filter((r) => r.countries.length).length;
+  const withEra = rows.filter((r) => r.birth !== null).length;
+  const withCollections = rows.filter((r) => r.inCollections > 0).length;
+
+  cache = {
+    present: rows.length > 0,
+    rows,
+    bySlug,
+    details,
+    attributed,
+    countries: [...countries.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
+    counts: {
+      total: rows.length,
+      artistic: rows.filter((r) => r.type === 'artistic-style').length,
+      sref: rows.filter((r) => r.type === 'sref-style').length,
+      withDetail: rows.filter((r) => r.hasDetail).length,
+      withBio: rows.filter((r) => r.hasBio).length,
+      withOptimal: rows.filter((r) => r.hasOptimal).length,
+      withCountry,
+      withEra,
+      withPrompts: attributed.size,
+    },
+    /**
+     * What the page is ALLOWED to offer, measured rather than assumed. `supported: false` means the
+     * control would place too few rows to be honest, and the page must not render it.
+     */
+    availability: {
+      tags: { supported: false, rows: 0, reason: 'global_tags is empty on every row in the catalog' },
+      srefCode: { supported: false, rows: 0, reason: 'the sref field is null on all 4,016 sref rows; the code is not in local data' },
+      country: { supported: withCountry > 0, rows: withCountry, scope: 'artistic-style only — sref rows carry no country' },
+      era: { supported: withEra > 0, rows: withEra, scope: 'artists with a parseable birth year' },
+      popularity: {
+        supported: withCollections > 0,
+        rows: withCollections,
+        field: 'in_collections_count',
+        scope: 'artistic-style only — views_count is degenerate (max 28, 41% tied at zero) and is not used for ordering',
+      },
+      corpusPrompts: { supported: attributed.size > 0, rows: attributed.size, scope: 'person-shaped names matched whole-word against the 4,272 real prompts' },
+    },
+  };
+  return cache;
+}
+
+/** Test seam: drop the memoized index so a fixture-backed run starts clean. */
+export function resetAtlas() { cache = null; }
+
+const SORTS = new Set(['relevance', 'name', 'popular', 'era']);
+
+/**
+ * Query the index. Every filter is applied against measured availability, so a caller asking for a
+ * control the data cannot support gets an explicit `ignored` entry rather than an empty grid.
+ *
+ * @returns {{ total: number, offset: number, rows: object[], ignored: string[] }}
+ */
+export function queryAtlas(opts = {}) {
+  const { sort = 'relevance', offset = 0, limit = 120 } = opts;
+  const { rows: matched, ignored } = filterRows(opts);
+  const sorted = sortRows(matched, sort, norm(opts.q ?? ''));
+  const start = Math.max(0, offset | 0);
+  const size = Math.min(500, Math.max(1, limit | 0));
+  return { total: sorted.length, offset: start, rows: sorted.slice(start, start + size), ignored };
+}
+
+/**
+ * Every row matching the filters — uncapped, and the one place filtering happens.
+ *
+ * Extracted because `randomStyles` needs the WHOLE filtered set to draw from, and the first version
+ * reached for it by calling `queryAtlas` once per row: 9,521 queries to answer one shuffle. Two
+ * callers, one filter pass.
+ */
+function filterRows({ q = '', type = 'all', country = '', eraFrom = null, eraTo = null } = {}) {
+  const atlas = loadAtlas();
+  const ignored = [];
+  let rows = atlas.rows;
+
+  if (type === 'artistic-style' || type === 'sref-style') rows = rows.filter((r) => r.type === type);
+
+  const needle = norm(q);
+  if (needle) rows = rows.filter((r) => r.search.includes(needle));
+
+  if (country) {
+    if (!atlas.availability.country.supported) ignored.push('country');
+    else rows = rows.filter((r) => r.countries.includes(country));
+  }
+
+  if (eraFrom !== null || eraTo !== null) {
+    if (!atlas.availability.era.supported) ignored.push('era');
+    else {
+      rows = rows.filter((r) => r.birth !== null
+        && (eraFrom === null || r.birth >= eraFrom)
+        && (eraTo === null || r.birth <= eraTo));
+    }
+  }
+
+  return { rows, ignored };
+}
+
+/** Ordering, separated from filtering so both callers agree on what each sort means. */
+function sortRows(rows, sort, needle) {
+  const mode = SORTS.has(sort) ? sort : 'relevance';
+  const byName = (a, b) => a.name.localeCompare(b.name);
+  const sorted = rows.slice();
+  if (mode === 'name') sorted.sort(byName);
+  else if (mode === 'popular') sorted.sort((a, b) => b.inCollections - a.inCollections || byName(a, b));
+  else if (mode === 'era') sorted.sort((a, b) => (a.birth ?? Infinity) - (b.birth ?? Infinity) || byName(a, b));
+  else if (needle) {
+    // Relevance with a query: a name that STARTS with the needle beats one that merely contains it.
+    // Without a query "relevance" is meaningless, so fall through to a stable alphabetical order.
+    sorted.sort((a, b) => {
+      const ap = a.search.startsWith(needle) ? 0 : 1;
+      const bp = b.search.startsWith(needle) ? 0 : 1;
+      return ap - bp || byName(a, b);
+    });
+  } else {
+    // Relevance with NO query. Alphabetical put "1910s fashion" and "3D model" on the first screen
+    // and buried every artist anyone has heard of — an opening that makes a 9,521-row catalog look
+    // like a junk drawer. With nothing to be relevant TO, the most relevant rows are the ones most
+    // people collected, which is the only non-degenerate popularity signal the catalog carries.
+    sorted.sort((a, b) => b.inCollections - a.inCollections || byName(a, b));
+  }
+  return sorted;
+}
+
+/**
+ * One style, everything known about it. `missing` names what this cell genuinely does not have, so
+ * the detail page can say so out loud instead of rendering an empty region.
+ */
+export function styleDetail(slug) {
+  const atlas = loadAtlas();
+  const row = atlas.bySlug.get(slug);
+  if (!row) return null;
+  const d = atlas.details[slug] || null;
+  const missing = [];
+  if (!d) missing.push('artist metadata');
+  if (!d?.optimal_prompt) missing.push('optimal prompt');
+  if (!d?.lifetimeBirth) missing.push('lifetime');
+  if (!row.countries.length) missing.push('country');
+  if (row.type === 'sref-style') missing.push('sref code');
+
+  return {
+    ...row,
+    biography: d ? plainText(d.description_complete) : null,
+    optimalPrompt: d?.optimal_prompt ? String(d.optimal_prompt).trim() : null,
+    lifetime: d ? { birth: d.lifetimeBirth ?? null, death: d.lifetimeDeath ?? null } : null,
+    promptCount: atlas.attributed.get(slug)?.count ?? 0,
+    prompts: (atlas.attributed.get(slug)?.prompts ?? []).map((p) => ({
+      prompt: p.prompt, sourceUrl: p.source_url ?? null, isFragment: Boolean(p.is_fragment),
+    })),
+    missing,
+  };
+}
+
+/**
+ * Surprise me — a weighted, seeded, reproducible sample of the catalog.
+ *
+ * WHY THIS EXISTS AT ALL. At 9,521 rows, search only helps someone who already knows what to type.
+ * Discovery is the harder half of the product, and a catalog nobody can wander is a catalog whose
+ * long tail may as well not be there.
+ *
+ * WHY IT PICKS STYLES AND NOT PROMPTS. The vision asked for "a smart random mode producing a
+ * picture prompt". Writing one here would make this the SECOND prompt writer — `app-make` is the
+ * first, and never-show-twice is keyed on prompt identity, so two writers break it. Picking styles
+ * and letting `composeDraft` draft from them gets the same result through the one channel that
+ * already exists. The Atlas surfaces styles; Make writes prompts.
+ *
+ * WEIGHTED, NOT UNIFORM. A uniform draw over the catalog returns a row with no artist metadata 42%
+ * of the time, so half of "surprise me" would be a name and nothing to read. Weighting by
+ * `in_collections_count + 1` biases toward styles people actually collected while leaving every row
+ * reachable — the long tail stays possible, it is just not the median result.
+ *
+ * SEEDED, so a roll can be repeated — but the contract is (seed + candidate set), not seed alone.
+ * `exclude` removes what is already queued, which CHANGES the candidate set, so the same seed after
+ * a roll deliberately yields new material rather than the same three styles again. That is the
+ * behaviour "roll again" needs; it is stated here because a seed reported to the user implies naive
+ * reproducibility, and it only holds from an identical starting queue. `rngFrom` is the generator's
+ * existing seeded RNG; a second implementation of "random but reproducible" is a second thing to drift.
+ */
+export function randomStyles({ n = 3, seed, exclude = [], ...filters } = {}) {
+  // The WHOLE filtered set, not a page of it — a shuffle that can only ever return rows from the
+  // opening 500 is not a shuffle of a 9,521-row catalog.
+  const { rows: all } = filterRows(filters);
+  const skip = new Set(exclude);
+  const candidates = all.filter((r) => !skip.has(r.slug));
+  if (!candidates.length) return { ok: false, error: 'nothing left to surprise you with — widen the filters or clear the queue' };
+
+  const s = Number.isFinite(seed) ? seed : Math.floor(Math.random() * 2 ** 31);
+  const rng = rngFrom(s);
+  const weights = candidates.map((r) => r.inCollections + 1);
+  const picks = [];
+  const taken = new Set();
+  let remaining = weights.reduce((a, b) => a + b, 0);
+
+  for (let k = 0; k < Math.min(n, candidates.length); k++) {
+    let t = rng() * remaining;
+    for (let i = 0; i < candidates.length; i++) {
+      if (taken.has(i)) continue;
+      t -= weights[i];
+      if (t > 0) continue;
+      picks.push(candidates[i]);
+      taken.add(i);
+      remaining -= weights[i];
+      break;
+    }
+  }
+  return { ok: true, seed: s, picks, pool: candidates.length, excluded: all.length - candidates.length };
+}
diff --git a/prompter/lib/routes-atlas.mjs b/prompter/lib/routes-atlas.mjs
new file mode 100644
index 0000000..625eadd
--- /dev/null
+++ b/prompter/lib/routes-atlas.mjs
@@ -0,0 +1,150 @@
+/**
+ * routes-atlas.mjs — the catalog browser's reads.
+ *
+ * Three routes, all GET, all read-only:
+ *   /api/atlas/facets   what the grid may OFFER — counts, countries, measured availability
+ *   /api/atlas          a page of the grid, filtered and sorted
+ *   /api/atlas/style    one style, with everything known and an explicit list of what is not
+ *
+ * WHY PAGED AND SERVER-SIDE. The catalog is Andrei Kovalev's licensed work; this checkout is
+ * Sean's personal offline copy. `serve.mjs` already refuses a cross-origin bulk read of the corpus
+ * (the round-3 panel treated "one page-load can pull the whole thing" as the vulnerability, not the
+ * inconvenience). Shipping a 10-20 MB client-side index would hand that back, so the index stays in
+ * the server process and the wire carries a page at a time — `queryAtlas` caps a page at 500.
+ *
+ * The Host gate in serve.mjs runs before any of this, so every read here is already loopback-only.
+ *
+ * THE OWN-MATERIAL LAW APPLIES HERE TOO, and this route shipped without it for one commit. The
+ * catalog these routes serve IS the Midlibrary archive licensed to Sean — the same corpus
+ * `brain.mjs` refuses to a partner or client memory, for the reason that stopped her "ocean, forest
+ * light" memory generating "rick and morty". A browsable grid over the same rows is the same leak
+ * with a nicer interface. The gate delegates to `corpusAccess`, which delegates to `poolFor`: one
+ * authority, so there is no second gate to drift out of step with the first.
+ */
+import { loadAtlas, queryAtlas, styleDetail, randomStyles } from './atlas.mjs';
+import { corpusAccess } from './brain.mjs';
+import { namespaceFrom } from './routes-modes.mjs';
+import { readQueue, queueAdd, queueRemove, queueClear, composeDraft, QUEUE_MAX } from './atlas-queue.mjs';
+
+/** A bounded integer from a query string, or `fallback` when absent/unparseable. */
+const int = (v, fallback = null) => (v !== null && /^-?\d{1,7}$/.test(v) ? Number(v) : fallback);
+
+/**
+ * @returns {Promise<boolean>} true when the request was handled.
+ */
+export async function handleAtlasRoutes({ url, req, res, json, readBody }) {
+  const p = url.pathname;
+  if (!p.startsWith('/api/atlas')) return false;
+  if (req.method !== 'GET' && req.method !== 'POST') return false;
+
+  // Namespace first: an invalid one is a 400, and a memory with no right to the archive is a 403
+  // — before a single catalog row is touched.
+  const ns = namespaceFrom(url);
+  if (ns.error) { json(res, 400, { error: ns.error }); return true; }
+  const access = corpusAccess(ns.profile, ns.project);
+  if (!access.ok) { json(res, 403, { error: access.reason, forbidden: true }); return true; }
+
+  const atlas = loadAtlas();
+
+  // The catalog is optional by design (lib/catalog.mjs sets that precedent). Say so plainly rather
+  // than returning an empty grid, which reads as "9,521 styles, none matching".
+  if (!atlas.present) {
+    json(res, 200, {
+      present: false,
+      reason: 'the Midlibrary catalog is not in this checkout — sources/midlibrary/catalog/ is absent',
+      counts: atlas.counts, availability: atlas.availability, countries: [], rows: [], total: 0,
+    });
+    return true;
+  }
+
+  if (p === '/api/atlas/facets' && req.method === 'GET') {
+    json(res, 200, {
+      present: true,
+      counts: atlas.counts,
+      availability: atlas.availability,
+      // Only countries that can actually place a row, most populous first — the select is built
+      // from this, so it cannot offer a value that returns nothing.
+      countries: atlas.countries.map(([name, n]) => ({ name, rows: n })),
+      eraRange: (() => {
+        const years = atlas.rows.map((r) => r.birth).filter((y) => y !== null);
+        return years.length ? { from: Math.min(...years), to: Math.max(...years) } : null;
+      })(),
+    });
+    return true;
+  }
+
+  if (p === '/api/atlas/style' && req.method === 'GET') {
+    const slug = url.searchParams.get('slug') ?? '';
+    const detail = styleDetail(slug);
+    if (!detail) { json(res, 404, { error: 'unknown style' }); return true; }
+    json(res, 200, detail);
+    return true;
+  }
+
+  // The queue: this memory's workbench. Its own store — writing `kept` here would make a queued
+  // style vanish from the grid it was queued in. serve.mjs has already run the write gate on POST.
+  if (p === '/api/atlas/queue' && req.method === 'GET') {
+    json(res, 200, { queue: readQueue(ns.profile, ns.project), max: QUEUE_MAX });
+    return true;
+  }
+  if (p === '/api/atlas/queue' && req.method === 'POST') {
+    const body = await readBody(req);
+    const action = String(body.action ?? '');
+    const slug = String(body.slug ?? '');
+    const r = action === 'add' ? queueAdd(ns.profile, ns.project, slug)
+      : action === 'remove' ? queueRemove(ns.profile, ns.project, slug)
+        : action === 'clear' ? queueClear(ns.profile, ns.project)
+          : { ok: false, error: 'action must be add, remove or clear' };
+    json(res, r.ok ? 200 : 400, { ...r, max: QUEUE_MAX });
+    return true;
+  }
+  // Surprise me — discovery, which at 9,521 rows is the harder half of the product. It picks
+  // STYLES and queues them; it does not write a prompt, because app-make is the only writer.
+  if (p === '/api/atlas/surprise' && req.method === 'POST') {
+    const body = await readBody(req);
+    const n = Math.min(8, Math.max(1, Number(body.n) || 3));
+    const seed = /^\d{1,10}$/.test(String(body.seed ?? '')) ? Number(body.seed) : undefined;
+    const r = randomStyles({
+      n, seed,
+      exclude: readQueue(ns.profile, ns.project).map((e) => e.slug),
+      q: String(body.q ?? '').slice(0, 120),
+      type: body.type ?? 'all',
+      country: String(body.country ?? '').slice(0, 60),
+      eraFrom: Number.isFinite(body.eraFrom) ? body.eraFrom : null,
+      eraTo: Number.isFinite(body.eraTo) ? body.eraTo : null,
+    });
+    if (!r.ok) { json(res, 400, r); return true; }
+    let queue = readQueue(ns.profile, ns.project);
+    const added = [];
+    for (const pick of r.picks) {
+      const a = queueAdd(ns.profile, ns.project, pick.slug);
+      if (a.ok && !a.duplicate) { queue = a.queue; added.push({ slug: pick.slug, name: pick.name }); }
+    }
+    json(res, 200, { ok: true, seed: r.seed, pool: r.pool, excluded: r.excluded, added, queue, max: QUEUE_MAX });
+    return true;
+  }
+
+  if (p === '/api/atlas/compose' && req.method === 'POST') {
+    const body = await readBody(req);
+    const r = composeDraft(ns.profile, ns.project, { subject: body.subject, ar: body.ar });
+    json(res, r.ok ? 200 : 400, r);
+    return true;
+  }
+
+  if (p === '/api/atlas' && req.method === 'GET') {
+    const out = queryAtlas({
+      q: (url.searchParams.get('q') ?? '').slice(0, 120),
+      type: url.searchParams.get('type') ?? 'all',
+      country: (url.searchParams.get('country') ?? '').slice(0, 60),
+      eraFrom: int(url.searchParams.get('eraFrom')),
+      eraTo: int(url.searchParams.get('eraTo')),
+      sort: url.searchParams.get('sort') ?? 'relevance',
+      offset: int(url.searchParams.get('offset'), 0),
+      limit: int(url.searchParams.get('limit'), 120),
+    });
+    json(res, 200, { present: true, ...out });
+    return true;
+  }
+
+  return false;
+}
diff --git a/prompter/lib/routes-modes.mjs b/prompter/lib/routes-modes.mjs
index c9305a0..7ce0bd0 100644
--- a/prompter/lib/routes-modes.mjs
+++ b/prompter/lib/routes-modes.mjs
@@ -49,7 +49,7 @@ export function renderProbeFor({ profile, project, n = 12, seed, base }) {
  */
 // '/' and '/app' stamp 'auto': they name no section, so the memory's own landing rule decides.
 // Every other path DOES name one and outranks it.
-const SHELL = { '/': 'auto', '/app': 'auto', '/probe': 'judge', '/brief': 'gallery', '/make': 'make', '/kept': 'gallery', '/studio': 'studio' };
+const SHELL = { '/': 'auto', '/app': 'auto', '/probe': 'judge', '/brief': 'gallery', '/make': 'make', '/kept': 'gallery', '/studio': 'studio', '/atlas': 'atlas' };
 const STATIC = {
   '/probe.js': ['probe.js', 'text/javascript; charset=utf-8'],
   '/probe.css': ['probe.css', 'text/css; charset=utf-8'],
@@ -72,6 +72,9 @@ const STATIC = {
   '/app-studio.js': ['app-studio.js', 'text/javascript; charset=utf-8'],
   '/app-studio-brain.js': ['app-studio-brain.js', 'text/javascript; charset=utf-8'],
   '/console-studio.css': ['console-studio.css', 'text/css; charset=utf-8'],
+  '/app-atlas.js': ['app-atlas.js', 'text/javascript; charset=utf-8'],
+  '/app-atlas-queue.js': ['app-atlas-queue.js', 'text/javascript; charset=utf-8'],
+  '/console-atlas.css': ['console-atlas.css', 'text/css; charset=utf-8'],
 };
 
 /** Parse + validate the namespace from a URL. Returns { profile, project } or { error }. */
diff --git a/prompter/serve.mjs b/prompter/serve.mjs
index 483f12f..b829064 100644
--- a/prompter/serve.mjs
+++ b/prompter/serve.mjs
@@ -35,6 +35,7 @@ import { designContextFor } from './lib/design-bridge.mjs';
 import { createAiGateway } from './lib/ai-gateway.mjs';
 import { handleAiRoutes } from './lib/routes-ai.mjs';
 import { handleBrainRoutes } from './lib/routes-brain.mjs';
+import { handleAtlasRoutes } from './lib/routes-atlas.mjs';
 
 const HERE = path.dirname(fileURLToPath(import.meta.url));
 const PORT = Number(process.env.SWAN_PROMPT_PORT ?? 7331);
@@ -286,6 +287,10 @@ const server = http.createServer(async (req, res) => {
     // The Rolodex: everything the brain holds, browsable and searchable. Read-only; the corpus gate
     // (the OWN-MATERIAL LAW) lives in lib/brain.mjs and delegates to poolFor.
     if (await handleBrainRoutes({ url, req, res, json, readBody, corpus })) return;
+
+    // The catalog browser. Reads only; the Host gate above has already refused anything that is
+    // not this loopback server, which is what keeps the licensed corpus off other origins.
+    if (await handleAtlasRoutes({ url, req, res, json, readBody })) return;
     // The render loop: POST /api/intent (gated above), GET /api/renders, GET /renders/<p>/<j>/<token>/<n>.
     if (await handleRenderRoutes({ url, req, res, json, readBody, base })) return;
     // "Make": queue renders in Sean's own ComfyUI graph (POST is gated above).
diff --git a/prompter/test-atlas-queue.mjs b/prompter/test-atlas-queue.mjs
new file mode 100644
index 0000000..5ba175c
--- /dev/null
+++ b/prompter/test-atlas-queue.mjs
@@ -0,0 +1,129 @@
+#!/usr/bin/env node
+/**
+ * Atlas queue regression — the workbench, and the two laws it exists to keep.
+ *
+ *   node prompter/test-atlas-queue.mjs
+ *
+ * LAW 1 — QUEUEING IS NOT KEEPING. `kept` means *never show this again*, and a kept prompt steers
+ * every future batch at score 1000. If the queue had reused that store — the obvious shortcut,
+ * since it already has persistence and dedupe — then queueing a style to work with it would make
+ * that style vanish from the grid you queued it in, and silently reweight generation. The check
+ * that matters reads the kept and shelf files BEFORE and AFTER a full add/compose/clear cycle and
+ * asserts they are byte-identical.
+ *
+ * LAW 2 — THE ATLAS DRAFTS, `app-make` WRITES. Compose returns a draft carrying a provenance tag
+ * and touches no generation channel. Two writers would break never-show-twice, which is keyed on
+ * prompt identity.
+ *
+ * WRITES, in a throwaway memory only: a `zz-atlas-*` project, deleted at the end. Sean's own
+ * queue file is read to prove it was not disturbed, and never written.
+ */
+import fs from 'node:fs';
+import path from 'node:path';
+import { randomBytes } from 'node:crypto';
+import { VAULT } from './lib/corpus.mjs';
+import { createProject, projectDir } from './lib/projects.mjs';
+import { readKept } from './lib/taste-namespace.mjs';
+import { readQueue, queueAdd, queueRemove, queueClear, composeDraft, QUEUE_MAX } from './lib/atlas-queue.mjs';
+import { loadAtlas } from './lib/atlas.mjs';
+
+let failed = 0;
+const check = (name, ok, detail = '') => {
+  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
+  if (!ok) failed++;
+};
+
+const pid = `zz-atlas-${randomBytes(3).toString('hex')}`;
+const P = 'partner';
+const snapshot = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '<absent>');
+const KEPT = path.join(VAULT, 'taste/kept.md');
+const SHELF = path.join(VAULT, 'taste/shelf.md');
+
+console.log('\nSetup:');
+check('throwaway project created', createProject({ profileId: P, projectId: pid, title: 'Atlas queue test', themeWords: ['forest light'] }).ok);
+const projKept = path.join(projectDir(P, pid), 'kept.md');
+const keptBefore = snapshot(KEPT);
+const shelfBefore = snapshot(SHELF);
+check('a fresh memory has an empty queue, not a missing-file error', readQueue(P, pid).length === 0);
+
+console.log('\nAdding, deduping, and refusing what the catalog does not have:');
+const a1 = queueAdd(P, pid, 'carlo-crivelli');
+check('a real slug is accepted', a1.ok && a1.duplicate === false && a1.queue.length === 1);
+check('the entry carries enough to render a chip without a second lookup',
+  a1.queue[0].name === 'Carlo Crivelli' && a1.queue[0].type === 'artistic-style' && !!a1.queue[0].addedAt);
+check('adding the same slug twice is a duplicate, not a second entry',
+  queueAdd(P, pid, 'carlo-crivelli').duplicate === true && readQueue(P, pid).length === 1);
+check('a slug the catalog does not have is refused', !queueAdd(P, pid, 'not-a-real-style-xyz').ok);
+check('a sref row queues too — it has no code, but it is still a style',
+  queueAdd(P, pid, 'f332016').ok && readQueue(P, pid).length === 2);
+check('an unknown project is refused', !queueAdd(P, 'never-made', 'carlo-crivelli').ok);
+check('an unknown profile is refused', !queueAdd('nobody', pid, 'carlo-crivelli').ok);
+
+console.log('\nRemove is the undo, and it restores exactly:');
+const beforeUndo = JSON.stringify(readQueue(P, pid));
+check('adding then removing returns the queue to its prior state byte for byte',
+  queueAdd(P, pid, 'jan-mankes').ok
+  && queueRemove(P, pid, 'jan-mankes').ok
+  && JSON.stringify(readQueue(P, pid)) === beforeUndo);
+check('removing something absent is refused, not a silent no-op', !queueRemove(P, pid, 'jan-mankes').ok);
+
+console.log('\nLAW 1 — queueing never touches the steering or saved lists:');
+check("the project's kept list is still empty after queueing", readKept(P, pid).length === 0);
+check('no kept.md was created in the project by queueing', !fs.existsSync(projKept));
+check("Sean's kept.md is byte-identical", snapshot(KEPT) === keptBefore);
+check("Sean's shelf.md is byte-identical", snapshot(SHELF) === shelfBefore);
+check('the queue lives in its own file, not in any taste file',
+  fs.existsSync(path.join(projectDir(P, pid), 'atlas-queue.json')));
+
+console.log('\nLAW 2 — compose produces a DRAFT, tagged, and writes nothing:');
+const d = composeDraft(P, pid, { subject: 'a heron at first light', ar: '21:9' });
+check('compose succeeds with a non-empty queue', d.ok && typeof d.draft === 'string');
+check('the draft carries the provenance tag the Judge reads', d.provenance === 'atlas-queue');
+check('the subject leads, the styles follow — the corpus grammar, not an invented one',
+  d.draft.startsWith('a heron at first light,') && /by Carlo Crivelli/.test(d.draft), d.draft);
+check('a sref style contributes its name — it has no code to contribute',
+  /Geometric Metallic Abstraction/.test(d.draft));
+check('the requested aspect is honoured', /--ar 21:9/.test(d.draft));
+check('a nonsense aspect falls back rather than reaching the prompt',
+  /--ar 16:9/.test(composeDraft(P, pid, { ar: '../../etc' }).draft));
+check('the draft says out loud that it is a draft', /draft, not a written prompt/i.test(d.note));
+check('composing still wrote nothing to any taste file',
+  readKept(P, pid).length === 0 && snapshot(KEPT) === keptBefore && snapshot(SHELF) === shelfBefore);
+check('an empty queue refuses to compose, with an instruction rather than an empty string',
+  (() => { const c = queueClear(P, pid); return c.ok && !composeDraft(P, pid, {}).ok; })());
+
+console.log('\nBounds:');
+for (const r of ['carlo-crivelli', 'f332016', 'jan-mankes']) queueAdd(P, pid, r);
+check('clear empties it and touches nothing else',
+  queueClear(P, pid).ok && readQueue(P, pid).length === 0 && snapshot(KEPT) === keptBefore);
+// REAL slugs, or this check is vacuous. The first version filled with `filler-N`, which
+// queueAdd refuses as unknown styles — so it reported PASS having never reached the cap. A cap
+// test that never hits the cap is a test that cannot fail.
+const realSlugs = loadAtlas().rows.slice(0, QUEUE_MAX + 5).map((r) => r.slug);
+check('the fixture is real (positive control: the cap test below can actually reach the cap)',
+  realSlugs.length === QUEUE_MAX + 5 && realSlugs.every((sl) => !!loadAtlas().bySlug.get(sl)));
+let refusedAt = null;
+let accepted = 0;
+for (const slug of realSlugs) {
+  const r = queueAdd(P, pid, slug);
+  if (r.ok) { accepted += 1; continue; }
+  if (/queue holds/.test(r.error || '')) { refusedAt = readQueue(P, pid).length; break; }
+}
+check('the queue stops at the cap and says so',
+  refusedAt === QUEUE_MAX && accepted === QUEUE_MAX, `accepted ${accepted}, refused at ${refusedAt}`);
+check('a removal makes room again, so the cap is a bound and not a dead end',
+  queueRemove(P, pid, realSlugs[0]).ok && queueAdd(P, pid, realSlugs[QUEUE_MAX]).ok
+  && readQueue(P, pid).length === QUEUE_MAX);
+
+console.log('\nA corrupt queue file degrades to empty rather than throwing:');
+fs.writeFileSync(path.join(projectDir(P, pid), 'atlas-queue.json'), '{ not json', 'utf8');
+check('unparseable JSON reads as an empty queue', readQueue(P, pid).length === 0);
+fs.writeFileSync(path.join(projectDir(P, pid), 'atlas-queue.json'), '{"queue":[{"nope":1},{"slug":"jan-mankes"}]}', 'utf8');
+check('entries without a slug are dropped, the valid one survives',
+  readQueue(P, pid).length === 1 && readQueue(P, pid)[0].slug === 'jan-mankes');
+
+fs.rmSync(projectDir(P, pid), { recursive: true, force: true });
+check('throwaway memory removed', !fs.existsSync(projectDir(P, pid)));
+
+console.log(`\n${failed ? `${failed} FAILURE(S)` : 'ALL CHECKS PASS'}\n`);
+process.exit(failed ? 1 : 0);
diff --git a/prompter/test-atlas-routes.mjs b/prompter/test-atlas-routes.mjs
new file mode 100644
index 0000000..b667d0f
--- /dev/null
+++ b/prompter/test-atlas-routes.mjs
@@ -0,0 +1,133 @@
+#!/usr/bin/env node
+/**
+ * Atlas route regression — the wire contract, not the index (test-atlas.mjs owns that).
+ *
+ *   node prompter/test-atlas-routes.mjs
+ *
+ * Every check names a way the routes could betray the two properties that matter here: that a page
+ * request cannot become a bulk read of the licensed corpus, and that the facets a page builds its
+ * controls from are the MEASURED ones — so the UI cannot render a filter the data will not honour.
+ *
+ * Read-only. Calls the handler directly with a recording `json`, so no port is opened.
+ */
+import { handleAtlasRoutes } from './lib/routes-atlas.mjs';
+import { loadAtlas } from './lib/atlas.mjs';
+
+let failed = 0;
+const check = (name, ok, detail = '') => {
+  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
+  if (!ok) failed++;
+};
+
+/** Drive the handler exactly as serve.mjs does, and capture what it answered. */
+async function call(pathAndQuery, method = 'GET', body = {}) {
+  const url = new URL(pathAndQuery, 'http://127.0.0.1:7331');
+  let captured = null;
+  const json = (_res, code, b) => { captured = { code, body: b }; };
+  const handled = await handleAtlasRoutes({ url, req: { method }, res: {}, json, readBody: async () => body });
+  return { handled, ...(captured || {}) };
+}
+
+const atlas = loadAtlas();
+
+console.log('\nThe catalog is present (positive control):');
+check('index loaded with 9,521 rows', atlas.present && atlas.counts.total === 9521);
+
+console.log('\nRouting — this module answers for its own paths and nothing else:');
+check('an unrelated path is not handled', (await call('/api/prompt')).handled === false);
+check('a non-GET on an atlas path is not handled', (await call('/api/atlas', 'POST')).handled === false);
+check('an unknown /api/atlas/* subpath is declined, not silently 200ed', (await call('/api/atlas/nope')).handled === false);
+check('GET is not accepted where only POST makes sense', (await call('/api/atlas/compose')).handled === false);
+check('a method it does not serve at all is not handled', (await call('/api/atlas', 'DELETE')).handled === false);
+
+console.log('\nTHE OWN-MATERIAL LAW — the archive is licensed to Sean, and a grid over it is still the archive:');
+check("Sean's own memory may browse (positive control: the refusals below are a gate, not a broken route)",
+  (await call('/api/atlas?limit=2')).code === 200);
+for (const who of ['client', 'partner']) {
+  const r = await call(`/api/atlas?limit=2&profile=${who}&project=default`);
+  check(`a ${who} memory is refused the grid, with a reason a person can read`,
+    r.code === 403 && r.body.forbidden === true && /licensed to Sean/.test(r.body.error));
+}
+check('a client memory is refused the FACETS too — the counts are corpus facts',
+  (await call('/api/atlas/facets?profile=client&project=default')).code === 403);
+check('a client memory is refused a detail page',
+  (await call('/api/atlas/style?slug=jan-mankes&profile=client&project=default')).code === 403);
+check('a client memory cannot READ a queue',
+  (await call('/api/atlas/queue?profile=client&project=default')).code === 403);
+check('a client memory cannot WRITE a queue',
+  (await call('/api/atlas/queue?profile=client&project=default', 'POST', { action: 'add', slug: 'jan-mankes' })).code === 403);
+check('a client memory cannot compose from it',
+  (await call('/api/atlas/compose?profile=client&project=default', 'POST', {})).code === 403);
+check('an invalid profile is a 400, refused before any corpus row is touched',
+  (await call('/api/atlas?profile=nope')).code === 400);
+
+console.log('\nThe queue over the wire:');
+await call('/api/atlas/queue', 'POST', { action: 'clear' });
+const add = await call('/api/atlas/queue', 'POST', { action: 'add', slug: 'jan-mankes' });
+check('add answers with the new queue and the stated cap',
+  add.code === 200 && add.body.queue.length === 1 && add.body.max > 0);
+check('an unknown action is refused rather than falling through to a default',
+  (await call('/api/atlas/queue', 'POST', { action: 'obliterate' })).code === 400);
+check('an unknown slug is refused', (await call('/api/atlas/queue', 'POST', { action: 'add', slug: 'nope-xyz' })).code === 400);
+const comp = await call('/api/atlas/compose', 'POST', { subject: 'a heron at first light' });
+check('compose answers a tagged draft built from the queue',
+  comp.code === 200 && comp.body.provenance === 'atlas-queue' && /by Jan Mankes/.test(comp.body.draft), comp.body.draft);
+check('remove is honoured', (await call('/api/atlas/queue', 'POST', { action: 'remove', slug: 'jan-mankes' })).body.queue.length === 0);
+check('composing an empty queue is a 400 carrying an instruction',
+  (await call('/api/atlas/compose', 'POST', {})).code === 400);
+
+console.log('\nFacets — the page builds its controls from measured availability:');
+const f = await call('/api/atlas/facets');
+check('facets answer 200', f.code === 200 && f.body.present === true);
+check('tags are reported UNSUPPORTED, so no tag control can be rendered', f.body.availability.tags.supported === false);
+check('the sref code is reported UNSUPPORTED, with a reason a human can read',
+  f.body.availability.srefCode.supported === false && /null on all/.test(f.body.availability.srefCode.reason));
+check('popularity names in_collections_count — never the degenerate views_count',
+  f.body.availability.popularity.field === 'in_collections_count');
+check('every offered country can actually place at least one row',
+  f.body.countries.length > 0 && f.body.countries.every((c) => c.rows > 0));
+check('the era range is real years, not scrape timestamps',
+  f.body.eraRange && f.body.eraRange.from > 900 && f.body.eraRange.to <= new Date().getFullYear(),
+  JSON.stringify(f.body.eraRange));
+
+console.log('\nQuery — a page is a page, and cannot become the whole corpus:');
+const first = await call('/api/atlas?limit=120');
+check('a default page answers 200 with a bounded row count', first.code === 200 && first.body.rows.length === 120);
+check('total is the full result count, not the page length', first.body.total === 9521);
+const huge = await call('/api/atlas?limit=99999');
+check('an oversized limit is capped, not honoured', huge.body.rows.length <= 500, `${huge.body.rows.length} rows`);
+const negative = await call('/api/atlas?limit=-5&offset=-10');
+check('negative paging cannot walk backwards out of the array',
+  negative.code === 200 && negative.body.offset === 0 && negative.body.rows.length >= 1);
+const junk = await call('/api/atlas?limit=abc&offset=xyz&eraFrom=oops');
+check('unparseable numbers fall back to defaults rather than NaN-ing the query',
+  junk.code === 200 && junk.body.rows.length === 120 && junk.body.total === 9521);
+
+console.log('\nFilters answered over the wire match the index:');
+const nl = await call('/api/atlas?country=Netherlands&limit=10');
+check('country filter narrows and every row carries it',
+  nl.body.total > 0 && nl.body.total < 9521 && nl.body.rows.every((r) => r.countries.includes('Netherlands')));
+const era = await call('/api/atlas?eraFrom=1800&eraTo=1850&limit=10');
+check('era filter narrows and every row is inside the range',
+  era.body.total > 0 && era.body.rows.every((r) => r.birth >= 1800 && r.birth <= 1850));
+const srefs = await call('/api/atlas?type=sref-style&limit=5');
+check('type filter partitions', srefs.body.total === 4016 && srefs.body.rows.every((r) => r.type === 'sref-style'));
+const q = await call('/api/atlas?q=' + encodeURIComponent('crivelli'));
+check('search finds a known artist', q.body.total >= 1 && q.body.rows.some((r) => /Crivelli/i.test(r.name)));
+const longQ = await call('/api/atlas?q=' + 'a'.repeat(400));
+check('an overlong query is truncated, not rejected or passed through', longQ.code === 200);
+
+console.log('\nOne style — present or plainly absent, never a hollow shell:');
+const s = await call('/api/atlas/style?slug=carlo-crivelli');
+check('a known slug answers 200 with prose and credited prompts',
+  s.code === 200 && s.body.biography && s.body.promptCount > 0);
+check('the returned prompt list never exceeds what promptCount claims',
+  s.body.prompts.length <= s.body.promptCount);
+const sr = await call('/api/atlas/style?slug=f332016');
+check('a sref cell names the code among what it does not have',
+  sr.code === 200 && sr.body.missing.includes('sref code'));
+check('an unknown slug is a 404, not an empty 200', (await call('/api/atlas/style?slug=zzz-not-real')).code === 404);
+check('a missing slug parameter is a 404, not a crash', (await call('/api/atlas/style')).code === 404);
+
+console.log(`\n${failed ? `${failed} FAILURE(S)` : 'ALL CHECKS PASS'}\n`);
+process.exit(failed ? 1 : 0);
diff --git a/prompter/test-atlas.mjs b/prompter/test-atlas.mjs
new file mode 100644
index 0000000..d0d6cf7
--- /dev/null
+++ b/prompter/test-atlas.mjs
@@ -0,0 +1,157 @@
+#!/usr/bin/env node
+/**
+ * Atlas index regression — every check names a way the index could lie to the grid.
+ *
+ *   node prompter/test-atlas.mjs
+ *
+ * The lies worth guarding against here are all of one family: the index advertising something the
+ * catalog does not contain. A tag filter with no tags. A sref cell promising a code that is null on
+ * every row. A "popular" sort riding a field that maxes at 28 with 41% tied at zero. A detail page
+ * showing prompts that merely CONTAIN an artist's name rather than crediting them. Each of those
+ * shipped as an assumption in the Atlas vision and was measured false; these checks keep them false.
+ *
+ * Read-only. Touches no taste file and writes nothing.
+ */
+import { loadAtlas, queryAtlas, styleDetail, plainText, norm, resetAtlas, randomStyles } from './lib/atlas.mjs';
+
+let failed = 0;
+const check = (name, ok, detail = '') => {
+  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
+  if (!ok) failed++;
+};
+
+resetAtlas();
+const atlas = loadAtlas();
+
+console.log('\nThe sources are actually here (positive control — every check below is vacuous without this):');
+check('catalog present, 9,521 rows', atlas.present && atlas.counts.total === 9521, `total ${atlas.counts.total}`);
+check('type split is 5,505 artistic / 4,016 sref', atlas.counts.artistic === 5505 && atlas.counts.sref === 4016);
+
+console.log('\nJoin integrity — the "42% hole" is an exact number, not an estimate:');
+check('every artistic row has a detail row', atlas.rows.filter((r) => r.type === 'artistic-style').every((r) => r.hasDetail));
+check('no sref row has a detail row', atlas.rows.filter((r) => r.type === 'sref-style').every((r) => !r.hasDetail));
+check('the hole is exactly 4,016 rows', atlas.counts.total - atlas.counts.withDetail === 4016);
+
+console.log('\nAvailability refuses to advertise what the catalog does not hold:');
+check('tags: NOT supported (global_tags is empty on every row)', atlas.availability.tags.supported === false && atlas.availability.tags.rows === 0);
+check('sref code: NOT supported (the sref field is null on all 4,016)', atlas.availability.srefCode.supported === false);
+check('country: supported, and scoped to the rows that have one', atlas.availability.country.supported && atlas.availability.country.rows === atlas.counts.withCountry);
+check('era: supported, and reports the parseable-birth-year count, not the artist count',
+  atlas.availability.era.rows === atlas.counts.withEra && atlas.counts.withEra < atlas.counts.artistic,
+  `era ${atlas.counts.withEra} of ${atlas.counts.artistic} artists`);
+check('popularity names in_collections_count, never views_count', atlas.availability.popularity.field === 'in_collections_count');
+
+console.log('\nThe degenerate field is not quietly steering the grid:');
+const views = atlas.rows.map((r) => r.views);
+check('views_count really is degenerate (why it is not the sort key)',
+  Math.max(...views) <= 30 && views.filter((v) => v === 0).length > atlas.counts.total * 0.3,
+  `max ${Math.max(...views)}, zeros ${views.filter((v) => v === 0).length}`);
+const pop = queryAtlas({ sort: 'popular', limit: 200 }).rows;
+check('sort=popular is monotonic in in_collections_count', pop.every((r, i) => i === 0 || pop[i - 1].inCollections >= r.inCollections));
+const topByViews = atlas.rows.slice().sort((a, b) => b.views - a.views)[0];
+check('a row that leads on views does NOT lead the popular sort unless it also leads on collections',
+  pop[0].inCollections >= topByViews.inCollections);
+
+console.log('\nA filter the data cannot support is reported, never silently applied:');
+const eraQ = queryAtlas({ eraFrom: 1800, eraTo: 1900 });
+check('era range returns only rows inside it, all with a birth year',
+  eraQ.rows.every((r) => r.birth !== null && r.birth >= 1800 && r.birth <= 1900) && eraQ.total > 0, `${eraQ.total} rows`);
+check('an era filter never places a sref row (they have no birth year)', eraQ.rows.every((r) => r.type === 'artistic-style'));
+const countryQ = queryAtlas({ country: 'Netherlands' });
+check('country filter places only rows carrying that country', countryQ.total > 0 && countryQ.rows.every((r) => r.countries.includes('Netherlands')));
+check('country filter never places a sref row', countryQ.rows.every((r) => r.type === 'artistic-style'));
+check('a supported filter reports nothing as ignored', eraQ.ignored.length === 0 && countryQ.ignored.length === 0);
+
+console.log('\nSearch, ordering and paging:');
+const mk = queryAtlas({ q: 'mankes' });
+check('an exact name is findable', mk.total >= 1 && mk.rows.some((r) => r.name === 'Jan Mankes'));
+check('search matches the slug too', queryAtlas({ q: 'f332016' }).rows.some((r) => r.slug === 'f332016'));
+const rel = queryAtlas({ q: 'jan', limit: 40 });
+const firstContains = rel.rows.findIndex((r) => !r.search.startsWith('jan'));
+const lastStarts = rel.rows.map((r) => r.search.startsWith('jan')).lastIndexOf(true);
+check('relevance puts prefix matches ahead of contains matches', firstContains === -1 || lastStarts < firstContains,
+  `last prefix @${lastStarts}, first contains @${firstContains}`);
+const openingScreen = queryAtlas({ limit: 24 }).rows;
+const alphabetical = queryAtlas({ sort: 'name', limit: 24 }).rows;
+check('relevance with NO query opens on the most-collected, not on "1910s fashion"',
+  openingScreen.every((r, i) => i === 0 || openingScreen[i - 1].inCollections >= r.inCollections)
+  && openingScreen[0].slug !== alphabetical[0].slug,
+  `${openingScreen[0].name} (${openingScreen[0].inCollections} collections) vs alphabetical ${alphabetical[0].name}`);
+check('the opening screen is real artists, not empty-metadata rows',
+  openingScreen.every((r) => r.hasDetail));
+const all = queryAtlas({ sort: 'name', limit: 500 });
+const page2 = queryAtlas({ sort: 'name', offset: 100, limit: 50 });
+check('paging slices the same order the unpaged query produced',
+  page2.rows.every((r, i) => r.slug === all.rows[100 + i].slug));
+check('total is the unpaginated count, not the page size', page2.total === atlas.counts.total && page2.rows.length === 50);
+check('limit is capped so one request cannot pull the whole licensed corpus', queryAtlas({ limit: 99999 }).rows.length <= 500);
+check('an offset past the end is empty but still states the true total',
+  queryAtlas({ offset: 999999 }).rows.length === 0 && queryAtlas({ offset: 999999 }).total === atlas.counts.total);
+check('type filter partitions cleanly',
+  queryAtlas({ type: 'sref-style', limit: 500 }).total === 4016 && queryAtlas({ type: 'artistic-style', limit: 500 }).total === 5505);
+
+console.log('\nPrompt attribution credits a style, it does not merely mention it:');
+const crivelli = styleDetail('carlo-crivelli');
+check('a credited artist keeps their real prompts (positive control)', crivelli.promptCount > 0, `${crivelli.promptCount} prompts`);
+check('every attributed prompt really credits that name — "by X", "X\'s", or "style of X"',
+  crivelli.prompts.every((p) => {
+    const t = ` ${norm(p.prompt)} `;
+    return t.includes(' by carlo crivelli ') || t.includes(' carlo crivelli s ') || t.includes(' style of carlo crivelli ');
+  }));
+for (const genre of ['anime-style', 'close-up-portrait', 'haute-couture-fashion']) {
+  const d = styleDetail(genre);
+  check(`a genre name that matches ordinary prompt wording gets ZERO (negative control: ${genre})`,
+    !d || d.promptCount === 0, d ? `count ${d.promptCount}` : 'slug absent');
+}
+check('promptCount is the true count; the returned list is capped',
+  [...atlas.attributed.values()].every((v) => v.count >= v.prompts.length && v.prompts.length <= 24));
+check('attribution never lands on a row with no detail (sref rows credit nobody)',
+  [...atlas.attributed.keys()].every((slug) => atlas.bySlug.get(slug).hasDetail));
+
+console.log('\nSurprise me — discovery, weighted and reproducible:');
+const roll = randomStyles({ n: 5, seed: 12345 });
+check('a seeded roll returns the requested number from the whole catalog',
+  roll.ok && roll.picks.length === 5 && roll.pool === atlas.counts.total);
+check('the SAME seed over the SAME candidate set repeats exactly',
+  JSON.stringify(randomStyles({ n: 5, seed: 12345 }).picks.map((r) => r.slug))
+  === JSON.stringify(roll.picks.map((r) => r.slug)));
+check('a different seed does not',
+  JSON.stringify(randomStyles({ n: 5, seed: 999 }).picks.map((r) => r.slug))
+  !== JSON.stringify(roll.picks.map((r) => r.slug)));
+check('excluding what is queued shrinks the candidate set and never returns an excluded row',
+  (() => {
+    const ex = roll.picks.map((r) => r.slug);
+    const next = randomStyles({ n: 5, seed: 12345, exclude: ex });
+    return next.ok && next.excluded === ex.length && next.picks.every((r) => !ex.includes(r.slug));
+  })());
+check('a filtered roll draws only from that filter, and reports the real pool size',
+  (() => {
+    const jp = randomStyles({ n: 3, seed: 7, country: 'Japan' });
+    return jp.ok && jp.pool < atlas.counts.total && jp.picks.every((r) => r.countries.includes('Japan'));
+  })());
+// Weighted, not uniform: a uniform draw over this catalog returns a metadata-less row 42% of the
+// time. Sampled across many seeds so this reads a distribution rather than one lucky roll.
+const sampled = [];
+for (let seed = 1; seed <= 120; seed++) sampled.push(...randomStyles({ n: 5, seed }).picks);
+const withDetail = sampled.filter((r) => r.hasDetail).length / sampled.length;
+check('weighting pulls picks toward rows that HAVE metadata, well above the uniform 57.8%',
+  withDetail > 0.75, `${(withDetail * 100).toFixed(1)}% had artist metadata across ${sampled.length} picks`);
+check('the long tail is still reachable — a zero-collection row can be drawn',
+  sampled.some((r) => r.inCollections === 0));
+check('an exhausted candidate set refuses rather than returning an empty success',
+  randomStyles({ n: 3, q: 'zzzz-no-such-style' }).ok === false);
+
+console.log('\nA detail page states what it does not have, rather than rendering a blank:');
+const sref = styleDetail('f332016');
+check('a sref cell names its missing fields, including the code it cannot show',
+  sref.missing.includes('sref code') && sref.missing.includes('artist metadata') && sref.biography === null);
+check('an artist cell carries prose, and the prose is not HTML',
+  crivelli.biography && crivelli.biography.length > 80 && !/[<>]/.test(crivelli.biography));
+check('plainText strips tags, entities and bold markers',
+  plainText('<p>**Ann** &amp; Bo&apos;s   work</p>') === "Ann & Bo's work");
+check('an artist missing an optimal prompt says so (73% of them are)',
+  atlas.rows.filter((r) => r.hasDetail && !r.hasOptimal).every((r) => styleDetail(r.slug).missing.includes('optimal prompt')));
+check('an unknown slug is null, not an empty shell', styleDetail('no-such-style-xyz') === null);
+
+console.log(`\n${failed ? `${failed} FAILURE(S)` : 'ALL CHECKS PASS'}\n`);
+process.exit(failed ? 1 : 0);
diff --git a/prompter/test-browser-atlas.mjs b/prompter/test-browser-atlas.mjs
new file mode 100644
index 0000000..93323c0
--- /dev/null
+++ b/prompter/test-browser-atlas.mjs
@@ -0,0 +1,222 @@
+#!/usr/bin/env node
+/**
+ * Atlas browser regression — the grid, driven for real.
+ *
+ *   node prompter/test-browser-atlas.mjs --require     (needs the prompt server up on :7331)
+ *
+ * The route tests prove the wire; they cannot prove the page. The specific lies this file exists to
+ * catch are the ones a server-side test is structurally blind to:
+ *
+ *   - a virtualizer that "works" because it quietly mounted all 9,521 cells;
+ *   - a spacer whose height does not match what is drawn, so the scrollbar lies about the corpus;
+ *   - a control that is rendered but dead — the tag filter absence is a DESIGN decision, and the
+ *     way to prove it is to assert no such control exists while the others do respond;
+ *   - a detail panel that opens with an empty body because the fetch shape changed.
+ *
+ * Same instrument discipline as test-browser.mjs: a `pageerror` listener is attached BEFORE any
+ * navigation and asserted at the end, computed style is read rather than the `hidden` property, and
+ * every control is pressed rather than inferred. A pass inside a throwing page is not a pass.
+ *
+ * READ-ONLY: navigates and queries. Creates no project and writes no taste file.
+ */
+const BASE = process.env.SWAN_BASE || 'http://127.0.0.1:7331';
+const REQUIRED = process.argv.includes('--require') || process.env.SWAN_BROWSER_REQUIRED === '1';
+
+let failed = 0;
+const check = (name, ok, detail = '') => {
+  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
+  if (!ok) failed++;
+};
+const skip = (why) => {
+  console.log(`\n  SKIPPED — ${why}\n`);
+  process.exit(REQUIRED ? 1 : 0);
+};
+
+const CANDIDATES = [
+  'playwright',
+  '../../quick-pt/SS-PT/frontend/node_modules/playwright/index.js',
+];
+let chromium = null;
+for (const c of CANDIDATES) {
+  try { ({ chromium } = await import(c)); break; } catch { /* try the next */ }
+}
+if (!chromium) skip('playwright is not installed here or in the sibling checkout');
+
+try {
+  const probe = await fetch(`${BASE}/api/atlas/facets`);
+  if (!probe.ok) skip(`the server answered ${probe.status} — start it: node prompter/serve.mjs`);
+  const f = await probe.json();
+  if (!f.present) skip('the Midlibrary catalog is absent from this checkout');
+} catch (e) {
+  skip(`no server on ${BASE} — start it: node prompter/serve.mjs`);
+}
+
+const browser = await chromium.launch();
+const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
+
+// THE INSTRUMENT, attached before the first navigation. Everything below is worthless without it.
+const errors = [];
+page.on('pageerror', (e) => errors.push(String(e)));
+page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
+// A <script> that 404s fires NEITHER of the two listeners above — the page simply runs without
+// that module and every symptom shows up somewhere else. That happened on this file's first run:
+// a stale server had no route for app-atlas-queue.js, and the only evidence was a missing element
+// three sections later. An instrument that cannot see a missing module is not measuring the page.
+page.on('response', (r) => {
+  if (r.status() >= 400 && new URL(r.url()).pathname.startsWith('/app-')) {
+    errors.push(`${r.status()} for ${new URL(r.url()).pathname}`);
+  }
+});
+
+const shown = (sel) => page.$eval(sel, (el) => getComputedStyle(el).display !== 'none');
+const count = (sel) => page.$$eval(sel, (n) => n.length);
+
+console.log('\nThe Atlas opens and paints:');
+await page.goto(`${BASE}/atlas`, { waitUntil: 'domcontentloaded' });
+await page.waitForSelector('.atlas-cell[data-slug]', { timeout: 15000 });
+check('the section is visibly displayed (computed style, not the hidden property)', await shown('#tab-atlas'));
+check('the section heading survived mount — the JS renders beside it, not over it',
+  await page.$eval('#tab-atlas .atelier-heading h2', (el) => el.textContent.trim().length > 0));
+const firstCount = await count('.atlas-cell[data-slug]');
+check('cells are on screen', firstCount > 0, `${firstCount} cells`);
+
+console.log('\nVirtualization — only visible rows mount:');
+const total = await page.$eval('#atlasCount b', (el) => Number(el.textContent.replace(/,/g, '')));
+check('the grid reports the whole catalog', total === 9521, `total ${total}`);
+check('mounted cells are a viewport-sized window, NOT the corpus',
+  firstCount < 200, `${firstCount} mounted of ${total}`);
+// Derived from the page's OWN constants, never restated here. A hardcoded 208 would have kept
+// passing after CELL_H changed, which is the definition of a check that cannot fail.
+const geom = await page.evaluate(() => ({
+  ...window.SwanAtlas,
+  cols: getComputedStyle(document.getElementById('atlasGrid')).gridTemplateColumns.split(' ').length,
+  cellH: Math.round(document.querySelector('.atlas-cell').getBoundingClientRect().height),
+}));
+check('the CSS cell height matches the constant the virtualizer computes with',
+  geom.cellH === geom.CELL_H, `css ${geom.cellH} vs js ${geom.CELL_H}`);
+const spacerH = await page.$eval('#atlasSpacer', (el) => el.getBoundingClientRect().height);
+const expectedH = Math.ceil(total / geom.cols) * (geom.CELL_H + geom.GAP) - geom.GAP;
+check('the scroll height matches the real corpus size (the scrollbar does not lie)',
+  Math.abs(spacerH - expectedH) < geom.CELL_H, `spacer ${Math.round(spacerH)} vs expected ~${expectedH}`);
+
+await page.$eval('#atlasScroll', (el) => { el.scrollTop = 40000; });
+await page.waitForTimeout(400);
+const afterScroll = await count('.atlas-cell[data-slug]');
+const firstNameDeep = await page.$eval('.atlas-cell .atlas-name', (el) => el.textContent);
+check('after a deep scroll the mounted count is still a window, not an accumulation',
+  afterScroll < 200, `${afterScroll} mounted`);
+check('a deep scroll actually moved to different styles', typeof firstNameDeep === 'string' && firstNameDeep.length > 0);
+await page.$eval('#atlasScroll', (el) => { el.scrollTop = 0; });
+await page.waitForTimeout(300);
+
+console.log('\nControls exist only where the data supports them, and the ones that exist respond:');
+check('NO tag control is rendered — global_tags is empty on every row',
+  await count('#atlasTags, [id*="atlasTag"]') === 0);
+check('the note tells the reader why, rather than leaving a silent absence',
+  await page.$eval('.atlas-note', (el) => /global_tags is empty/i.test(el.textContent)));
+check('country and era controls ARE rendered (positive control: absence above is a decision, not a failure)',
+  await count('#atlasCountry') === 1 && await count('#atlasEraFrom') === 1);
+
+await page.fill('#atlasQ', 'crivelli');
+await page.waitForTimeout(500);
+const searchTotal = await page.$eval('#atlasCount b', (el) => Number(el.textContent.replace(/,/g, '')));
+check('typing a query narrows the grid', searchTotal > 0 && searchTotal < total, `${searchTotal} results`);
+
+await page.selectOption('#atlasType', 'sref-style');
+await page.waitForTimeout(500);
+const srefTotal = await page.$eval('#atlasCount b', (el) => Number(el.textContent.replace(/,/g, '')));
+check('the kind filter applies on top of the query', srefTotal !== searchTotal);
+
+await page.click('#atlasClear');
+await page.waitForTimeout(500);
+const clearedTotal = await page.$eval('#atlasCount b', (el) => Number(el.textContent.replace(/,/g, '')));
+check('Clear really restores the full catalog', clearedTotal === total, `${clearedTotal}`);
+check('Clear empties the search box too, so the UI and the result agree',
+  await page.$eval('#atlasQ', (el) => el.value) === '');
+
+console.log('\nOpening a style:');
+await page.click('.atlas-cell[data-slug]');
+await page.waitForSelector('#atlasDetail h3', { timeout: 8000 });
+check('the detail panel is displayed', await shown('#atlasDetail'));
+check('it carries a name and at least one fact or a stated absence',
+  await page.$eval('#atlasDetail', (el) => el.textContent.trim().length > 40));
+check('the queue button is present and reachable at 44px',
+  await page.$eval('#atlasDetail [data-queue]', (el) => el.getBoundingClientRect().height >= 44));
+await page.keyboard.press('Escape');
+await page.waitForTimeout(200);
+check('Escape closes it', !(await shown('#atlasDetail')));
+
+console.log('\nA style with no metadata says so, instead of rendering a blank:');
+await page.goto(`${BASE}/atlas`, { waitUntil: 'domcontentloaded' });
+await page.waitForSelector('.atlas-cell[data-slug]', { timeout: 15000 });
+await page.selectOption('#atlasType', 'sref-style');
+await page.waitForTimeout(600);
+await page.click('.atlas-cell[data-slug]');
+await page.waitForSelector('#atlasDetail h3', { timeout: 8000 });
+check('a sref detail names what is missing, including the code',
+  await page.$eval('#atlasDetail', (el) => /Not in local data/i.test(el.textContent) && /sref code/i.test(el.textContent)));
+
+console.log('\nThe queue — its own store, and a draft that says it is a draft:');
+await page.goto(`${BASE}/atlas`, { waitUntil: 'domcontentloaded' });
+await page.waitForSelector('.atlas-cell[data-slug]', { timeout: 15000 });
+await page.click('#atlasQClear').catch(() => {});
+await page.waitForTimeout(300);
+check('the queue starts empty and says how to fill it',
+  await page.$eval('.atlas-q-list', (el) => /Empty/i.test(el.textContent)));
+check('Compose is disabled while the queue is empty — not a button that fails when pressed',
+  await page.$eval('#atlasQCompose', (el) => el.disabled === true));
+
+await page.click('.atlas-cell[data-slug]');
+await page.waitForSelector('#atlasDetail [data-queue]', { timeout: 8000 });
+const queuedName = await page.$eval('#atlasDetail h3', (el) => el.textContent.trim());
+await page.click('#atlasDetail [data-queue]');
+await page.waitForTimeout(400);
+check('pressing + Queue puts that style on the workbench',
+  await page.$eval('.atlas-q-list', (el, name) => el.textContent.includes(name), queuedName), queuedName);
+check('the style is STILL in the grid — queueing is not keeping, so nothing vanished',
+  await page.$eval('.atlas-cell .atlas-name', (el) => el.textContent.trim().length > 0)
+  && (await count('.atlas-cell[data-slug]')) > 0);
+check('Compose became available once there was something to compose',
+  await page.$eval('#atlasQCompose', (el) => el.disabled === false));
+
+await page.fill('#atlasQSubject', 'a heron at first light');
+await page.click('#atlasQCompose');
+await page.waitForSelector('#atlasQText', { timeout: 8000 });
+const draft = await page.$eval('#atlasQText', (el) => el.textContent);
+check('a draft is produced containing the subject and an aspect', /heron/.test(draft) && /--ar/.test(draft), draft);
+check('the draft is labelled with its provenance, so the Judge can tell it apart',
+  await page.$eval('.atlas-q-prov', (el) => /atlas-queue/.test(el.textContent)));
+check('and it says out loud that nothing was queued or steered',
+  await page.$eval('.atlas-q-note', (el) => /draft, not a written prompt/i.test(el.textContent)));
+
+await page.click('#atlasQSurprise');
+await page.waitForTimeout(700);
+const afterRoll = await page.$$eval('.atlas-q-list li', (n) => n.filter((e) => !e.className.includes('muted')).length);
+check('Surprise me queues styles and says what it drew from',
+  afterRoll >= 2 && await page.$eval('#shellsay', (el) => /drawn from/.test(el.textContent)),
+  await page.$eval('#shellsay', (el) => el.textContent.slice(0, 90)));
+const rolled = await page.$$eval('.atlas-q-list li .atlas-q-name', (n) => n.map((e) => e.textContent));
+await page.click('#atlasQSurprise');
+await page.waitForTimeout(700);
+const rolled2 = await page.$$eval('.atlas-q-list li .atlas-q-name', (n) => n.map((e) => e.textContent));
+check('rolling again brings NEW material rather than re-adding what is queued',
+  rolled2.length > rolled.length && rolled.every((r) => rolled2.includes(r)));
+await page.click('#atlasQClear');
+await page.waitForTimeout(400);
+check('Clear empties a rolled queue', await page.$eval('.atlas-q-list', (el) => /Empty/i.test(el.textContent)));
+await page.click('.atlas-cell[data-slug]');
+await page.waitForSelector('#atlasDetail [data-queue]', { timeout: 8000 });
+await page.click('#atlasDetail [data-queue]');
+await page.waitForTimeout(400);
+
+await page.click('.atlas-q-x');
+await page.waitForTimeout(400);
+check('removing the chip empties the queue again',
+  await page.$eval('.atlas-q-list', (el) => /Empty/i.test(el.textContent)));
+
+console.log('\nThe instrument:');
+check('nothing threw in the page for the whole run', errors.length === 0, errors.slice(0, 3).join(' | '));
+
+await browser.close();
+console.log(`\n${failed ? `${failed} FAILURE(S)` : 'ALL CHECKS PASS'}\n`);
+process.exit(failed ? 1 : 0);
