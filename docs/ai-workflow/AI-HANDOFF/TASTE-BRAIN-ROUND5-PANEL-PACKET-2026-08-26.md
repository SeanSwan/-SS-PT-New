---
decision: "Round-5 hostile review — the surfaces the first four rounds could not see: the browser page, the CLI, the bundle round trip, the image index and the origin gate."
status: open
board: SWA-186
date: 2026-08-26
privacy: IDs and roles only. The second user is "the partner". No names, no keys, no PII.
---

# Swan Taste Brain — round 5: the blind spots

Four hostile rounds have now found **twenty** real defects in this tool, including **five separate
doors** through which a third-party copyrighted corpus could reach a second user's memory. Every one
is fixed and covered by a regression check that fails against the pre-fix code.

Rounds 3 and 4 reviewed the server. **Every seat in both rounds ended its answer by naming the same
files it could not verify.** This packet is those files. If there is a sixth door, it is here.

## The law

The tool holds a **third-party copyrighted corpus** (Midlibrary, which the owner subscribes to). It
may be used for the OWNER's memory (`sean/default`) and **must never reach a partner or client
memory, a shared bundle, or a printed brief** — not the images, not the artists, not the style codes
(`--sref`), not the prompt text. One memory = `profile × project`.

## The five doors already closed — note the pattern, then look for the sixth

| # | Layer | What arrived, and how |
|---|---|---|
| 1 | generation | `chooseSref()` ran unconditionally — 6 of 6 prompts in a partner memory carried a corpus code |
| 2 | the read API | `access-control-allow-origin: '*'` made every read cross-origin readable to any page in the owner's browser |
| 3 | the event writer | candidates could declare `provenance: 'midlibrary-reference'` |
| 4 | the compiler's output | `tally()` bumped `t.srefs` regardless of witness, so her profile and printed brief carried codes |
| 5 | **the index join** | a candidate that declared **nothing** passed validation, and the compiler back-filled `doc`, `prompt` and `provenance` **from the Midlibrary image index** — corpus subject text became her subjects |

The pattern that keeps repeating: **each fix guards a FIELD, and the material arrives through a
different field — or through no field at all.** Door 5's lesson was "absence is not innocence".
Assume the same shape is still true somewhere in the files below.

## What is now enforced (so you can attack the enforcement, not re-report the finding)

- A candidate in a non-owner memory must declare `provenance ∈ {unsplash, pexels, esa-webb-ccby,
  nasa-public-domain, local-comfy}`. Absent provenance is refused.
- No candidate in a non-owner memory may carry `sref`, except its own render (`local-comfy`).
- `tally()` bumps style codes, the `ml:` subject fallback and index-derived provenance **only** for
  the owner.
- `keepFor` and `mintIntent` both refuse `--sref` anywhere in the text, and `mintIntent` refuses an
  `sref` field, for any non-owner memory.
- `generateOne` emits no style code at all for an own-material pool.
- The server sends **no** CORS headers, and answers a preflight with a bare 204.

## Attack these, in this order

1. **The browser page** (`app.html`, `app-shell.js`, `app-make.js`, `app-judge.js`,
   `app-directions.js`, `app-kept.js`, `probe.js`, `bundle.html`). Nobody has read a line of it.
   Does it ever render corpus text or a style code in a non-owner memory? Does it construct events
   whose candidates omit provenance? Is the active memory ever ambiguous, so a click lands in the
   wrong one? XSS via unescaped candidate `title` / `credit` / `prompt` into innerHTML?
2. **The bundle round trip** (`export-bundle.mjs`, `import-bundle.mjs`, `bundle.html`). What leaves
   the machine in the exported HTML — does it embed corpus URLs, titles, srefs, prompt text? A
   bundle is the one artefact that physically travels.
3. **The CLI** (`swan-prompt.mjs`). It is the single writer for rate/keep and is invoked by the
   server via `execFileSync` with an argv array. Its own argv parser drops any word starting with
   `--`. What else does it mishandle? Can a crafted `code`/`rating`/`note` corrupt `taste/*.md`?
4. **The image index** (`images.mjs`, `corpus.mjs`). Door 5 came from this join. What else reads it,
   and does any of it reach a non-owner surface?
5. **The origin gate** (`origin.mjs`) now that CORS headers are gone — is anything still reachable?
6. **A guard that cannot fire.** Two have now shipped in this codebase: a literal backspace where
   `\b` was meant, and `\s--sref` that could not match a leading flag. Both were in the same guard.
   **Find the third.** Check every regex and every conditional gate for one that cannot match what
   it claims to.

## Ground truth

- **466 checks across 10 suites, all passing.** Suites resolve fixtures relative to the **repo root**.
- `prompter/test-round3.mjs` carries the regressions for rounds 3 and 4.
- A repo-wide sweep for stray control characters is clean across 51 tracked files.
- Loopback-only, unauthenticated by design; local git repo, no remote.

---

# THE SOURCE — the previously unreviewed surfaces

## prompter/app.html
```
     1	<!doctype html>
     2	<html lang="en">
     3	<head>
     4	<meta charset="utf-8">
     5	<meta name="viewport" content="width=device-width, initial-scale=1">
     6	<meta name="referrer" content="no-referrer">
     7	<title>Swan Taste</title>
     8	<link rel="stylesheet" href="/probe.css">
     9	<link rel="stylesheet" href="/app.css">
    10	</head>
    11	<body data-tab="make">
    12	<header>
    13	  <h1><span>Swan</span> Taste</h1>
    14	  <div class="mode">
    15	    <label for="profile">Who</label>
    16	    <select id="profile" aria-label="Whose memory"><option value="sean">Sean</option><option value="partner">Partner</option><option value="client">Client</option></select>
    17	    <label for="project">Memory</label>
    18	    <select id="project" aria-label="Which project memory"></select>
    19	    <button id="newproj" type="button">New project</button>
    20	    <span class="pill" id="asis"></span>
    21	  </div>
    22	  <form class="form" id="form" autocomplete="off">
    23	    <input id="title" aria-label="Project title" placeholder="Project title (e.g. school site)" maxlength="80" required>
    24	    <input id="words" aria-label="Theme words, comma-separated" placeholder="Theme words, comma-separated (e.g. warm classroom, forest light)" maxlength="300">
    25	    <button class="primary" type="submit">Create — memory starts empty</button>
    26	    <button type="button" id="cancel">Cancel</button>
    27	    <span class="hint">A project is a fresh memory: nothing is copied from anyone else's picks. Theme words only — never a person's or a school's name.</span>
    28	  </form>
    29	  <nav class="tabs" role="tablist">
    30	    <button data-tab="make" role="tab" aria-selected="true">Make</button>
    31	    <button data-tab="judge" role="tab" aria-selected="false">Judge</button>
    32	    <button data-tab="directions" role="tab" aria-selected="false">Directions</button>
    33	    <button data-tab="kept" role="tab" aria-selected="false">Kept</button>
    34	  </nav>
    35	  <div class="status" id="shellsay"></div>
    36	</header>
    37	
    38	<main>
    39	  <section id="tab-make" role="tabpanel" aria-label="Make">
    40	    <div class="controls">
    41	      <button class="primary" id="go">Generate</button>
    42	      <select id="medium" aria-label="Stills or video"><option value="still">Stills</option><option value="video">Video</option></select>
    43	      <select id="mode" aria-label="Mode"><option value="taste">Taste-steered</option><option value="surprise">Surprise me</option></select>
    44	      <input type="number" id="n" value="5" min="1" max="50" aria-label="How many">
    45	      <select id="ar" aria-label="Aspect ratio"><option>16:9</option><option>21:9</option><option>1:1</option><option>9:16</option><option>4:5</option></select>
    46	      <label class="check"><input type="checkbox" id="cine"> cinematic only</label>
    47	    </div>
    48	    <div class="status" id="makebar"></div>
    49	    <div id="out"><div class="empty">Press Generate.</div></div>
    50	  </section>
    51	
    52	  <section id="tab-judge" role="tabpanel" aria-label="Judge" hidden>
    53	    <div class="controls">
    54	      <label for="pool">Judge</label>
    55	      <select id="pool" aria-label="Judge real pictures or my renders"><option value="">Pictures</option><option value="renders">My renders</option></select>
    56	      <button id="new" type="button" title="New grid (new seed)">New grid</button>
    57	      <button id="again" type="button" title="Same grid (same seed)">Same grid</button>
    58	    </div>
    59	    <div class="sub" id="sub"></div>
    60	    <div class="status" id="status">loading…</div>
    61	    <div class="well"><div class="grid" id="grid"></div></div>
    62	    <div class="judgebar">
    63	      <span id="count" class="status" style="margin:0"></span>
    64	      <button id="done" class="primary" type="button" disabled>Done — record this grid</button>
    65	      <button id="undo" type="button" hidden>Undo last grid</button>
    66	      <span id="result" class="status" style="margin:0"></span>
    67	    </div>
    68	  </section>
    69	
    70	  <section id="tab-directions" role="tabpanel" aria-label="Directions" hidden>
    71	    <div class="controls noprint">
    72	      <button id="copyall" type="button">Copy as text</button>
    73	      <button id="print" type="button">Print / PDF</button>
    74	    </div>
    75	    <div class="sub" id="dsub"></div>
    76	    <h2>Three directions</h2>
    77	    <div class="dirs" id="dirs"></div>
    78	    <h2>What you chose</h2>
    79	    <div class="picks" id="picks"></div>
    80	    <div id="renderwrap" hidden><h2>Renders you liked</h2><p class="muted">Your own renders you marked closest. They count toward what you want pictured — never toward style codes.</p><div class="picks" id="renders"></div></div>
    81	    <div id="avoids"></div>
    82	  </section>
    83	
    84	  <section id="tab-kept" role="tabpanel" aria-label="Kept" hidden>
    85	    <div class="sub" id="keptsub"></div>
    86	    <div id="keptlist"></div>
    87	  </section>
    88	</main>
    89	
    90	<script src="/probe.js"></script>
    91	<script src="/app-shell.js"></script>
    92	<script src="/app-make.js"></script>
    93	<script src="/app-judge.js"></script>
    94	<script src="/app-directions.js"></script>
    95	<script src="/app-kept.js"></script>
    96	</body>
    97	</html>
```

## prompter/app-shell.js
```
     1	/**
     2	 * app-shell.js — the one shell: which memory you are in, and which tab you are on.
     3	 *
     4	 * WHY (Sean 2026-08-25): "the whole loop at one URL." Make · Judge · Directions · Kept were three pages
     5	 * with three copies of the memory bar; switching cost a page load and the memory choice drifted between
     6	 * them. This file owns that state once and hands it to the tabs.
     7	 *
     8	 * EXTRACTION, NOT A REWRITE: every tab's logic moved into its own app-*.js, and the old standalone URLs
     9	 * (/probe, /brief, /make) load those SAME modules — so there is exactly one implementation of judging,
    10	 * of the brief, of Make. `probe.js` (the judging core the sendable bundle inlines) is untouched.
    11	 */
    12	(() => {
    13	  const tabs = new Map();
    14	  const listeners = [];
    15	  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch {} return v; };
    16	  const params = new URLSearchParams(location.search);
    17	  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    18	
    19	  const Swan = {
    20	    profile: params.get('profile') || store('swan-taste-profile') || 'sean',
    21	    project: params.get('project') || store('swan-taste-project') || 'default',
    22	    WHO: { sean: 'Sean', partner: 'Partner', client: 'Client' },
    23	    esc,
    24	    $: (id) => document.getElementById(id),
    25	    api: (p) => fetch(p).then((r) => r.json()),
    26	    post: (p, body) => fetch(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json()),
    27	    /** A tab registers { mount(el), enter(), refresh() }. `enter` runs every time it is shown. */
    28	    tab(name, impl) { tabs.set(name, impl); },
    29	    /** Anything that must react when the memory changes (every tab does). */
    30	    onMemory(fn) { listeners.push(fn); },
    31	    qs(extra = '') { return `profile=${this.profile}&project=${this.project}${extra}`; },
    32	    memoryChanged() {
    33	      store('swan-taste-profile', this.profile); store('swan-taste-project', this.project);
    34	      for (const fn of listeners) { try { fn(this.profile, this.project); } catch (err) { console.error(err); } }
    35	    },
    36	  };
    37	  window.Swan = Swan;
    38	
    39	  /** Fill the Who/Memory selects for the current profile; create-form opens when a profile has no project. */
    40	  async function loadProjects() {
    41	    const j = await Swan.api('/api/projects');
    42	    const list = (j.profiles || {})[Swan.profile] || [];
    43	    const sel = Swan.$('project');
    44	    if (sel) {
    45	      sel.innerHTML = '';
    46	      for (const p of list) { const o = document.createElement('option'); o.value = p.projectId; o.textContent = p.title; sel.append(o); }
    47	      if (!list.some((p) => p.projectId === Swan.project)) Swan.project = list[0]?.projectId || null;
    48	      if (Swan.project) sel.value = Swan.project;
    49	    }
    50	    const form = Swan.$('form');
    51	    if (form) form.classList.toggle('open', !Swan.project);
    52	    const pf = Swan.$('profile'); if (pf) pf.value = Swan.profile;
    53	    const asis = Swan.$('asis'); if (asis) asis.innerHTML = `<b>${Swan.WHO[Swan.profile]}</b> · ${esc(Swan.project || 'no project yet')}`;
    54	    Swan.memoryChanged();
    55	  }
    56	  Swan.loadProjects = loadProjects;
    57	
    58	  /* ---------------- tabs ---------------- */
    59	  const tabName = () => (location.hash.replace('#', '') || document.body.dataset.tab || 'make');
    60	  function show(name) {
    61	    if (!tabs.has(name)) name = tabs.keys().next().value;
    62	    for (const [n] of tabs) {
    63	      // Scoped to the tab bar ON PURPOSE: `<body data-tab="make">` (the server's per-path default) matches
    64	      // a document-wide `[data-tab]` query FIRST, which put the active style on <body> and — far worse —
    65	      // gave the body a click handler that snapped every click back to Make.
    66	      const sec = Swan.$(`tab-${n}`), btn = document.querySelector(`.tabs button[data-tab="${n}"]`);
    67	      if (sec) sec.hidden = n !== name;
    68	      if (btn) { btn.classList.toggle('on', n === name); btn.setAttribute('aria-selected', String(n === name)); }
    69	    }
    70	    const url = new URL(location.href); url.searchParams.set('profile', Swan.profile); url.searchParams.set('project', Swan.project || ''); url.hash = name;
    71	    history.replaceState(null, '', url);
    72	    Swan.current = name;
    73	    try { tabs.get(name)?.enter?.(); } catch (err) { console.error(err); }
    74	  }
    75	  Swan.show = show;
    76	
    77	  document.addEventListener('DOMContentLoaded', async () => {
    78	    for (const [name, impl] of tabs) { const el = Swan.$(`tab-${name}`); if (el) try { impl.mount?.(el); } catch (err) { console.error(err); } }
    79	    document.querySelectorAll('.tabs button[data-tab]').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
    80	    Swan.$('profile')?.addEventListener('change', async () => { Swan.profile = Swan.$('profile').value; Swan.project = null; await loadProjects(); show(Swan.current || tabName()); });
    81	    Swan.$('project')?.addEventListener('change', () => { Swan.project = Swan.$('project').value; Swan.memoryChanged(); show(Swan.current || tabName()); });
    82	    Swan.$('newproj')?.addEventListener('click', () => { Swan.$('form').classList.add('open'); Swan.$('title')?.focus(); });
    83	    Swan.$('cancel')?.addEventListener('click', () => Swan.$('form').classList.remove('open'));
    84	    Swan.$('form')?.addEventListener('submit', async (e) => {
    85	      e.preventDefault();
    86	      const title = Swan.$('title').value.trim();
    87	      const projectId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || `project-${SwanProbe.newSessionId().slice(0, 6)}`;
    88	      const r = await Swan.post('/api/projects', { profileId: Swan.profile, projectId, title, themeWords: Swan.$('words').value, pool: 'shareable' });
    89	      if (!r.ok) { Swan.say(`not created: ${(r.errors || [r.error]).join('; ')}`); return; }
    90	      Swan.project = r.project.projectId; Swan.$('title').value = ''; Swan.$('words').value = ''; Swan.$('form').classList.remove('open');
    91	      await loadProjects(); show(Swan.current || tabName());
    92	    });
    93	    window.addEventListener('hashchange', () => show(tabName()));
    94	    await loadProjects();
    95	    show(tabName());
    96	  });
    97	
    98	  /** A status line every tab can write to — the shell owns the element so tabs do not fight over it. */
    99	  Swan.say = (html) => { const s = Swan.$('shellsay'); if (s) s.innerHTML = html; };
   100	})();
```

## prompter/app-make.js
```
     1	/**
     2	 * app-make.js — the Make tab: generate prompts from this memory, queue renders in Sean's own ComfyUI graph.
     3	 *
     4	 * Extracted verbatim in behaviour from the standalone prompt page, so `/make` and the shell's Make tab run
     5	 * ONE implementation. Star ratings stay Sean's markdown channel; a partner/client memory learns from the
     6	 * pictures it judges, so those buttons are not offered there.
     7	 */
     8	(() => {
     9	  const S = () => window.Swan;
    10	  const el = (id) => S().$(id);
    11	
    12	  function card(p) {
    13	    const Swan = S();
    14	    const node = document.createElement('div');
    15	    node.className = 'card';
    16	    const style = p.kind === 'video' ? p.camera : p.styleName ? p.styleName : (p.sref ? 'unnamed code' : '—');
    17	    const tag = p.kind === 'video' ? '<span class="tag new">video — a shot, not a still</span>'
    18	      : p.rating ? `<span class="tag rated">endorsed ${p.rating}/5</span>` : p.isNew ? '<span class="tag new">NEW — judge it</span>' : '';
    19	    const rate = Swan.profile === 'sean' && Swan.project === 'default' && p.sref ? '<button data-act="rate5">★ 5</button><button data-act="rate1">1</button>' : '';
    20	    node.innerHTML =
    21	      `<div class="p"></div>
    22	       <div class="meta">
    23	         <span class="tag">${p.grammar}</span><span class="tag">${Swan.esc(style)}</span>${tag}
    24	         <span class="row-actions">
    25	           <button data-act="make" class="primary" title="Queue one render in ComfyUI using your own workflow">Make</button>
    26	           <button data-act="make4" class="primary" title="Queue four seed variations — a grid to judge">Make 4</button>
    27	           <button data-act="keep">Keep</button>
    28	           <button data-act="copy">Copy</button>
    29	           <button data-act="comfy" title="Register the prompt and copy a SaveImage prefix to wire by hand">Prefix</button>${rate}
    30	         </span>
    31	       </div>`;
    32	    node.querySelector('.p').textContent = p.prompt;      // prompt text is data, never markup
    33	    node.addEventListener('click', (e) => act(e.target?.dataset?.act, p));
    34	    return node;
    35	  }
    36	
    37	  async function act(a, p) {
    38	    const Swan = S();
    39	    if (!a) return;
    40	    if (a === 'copy') { await navigator.clipboard.writeText(p.prompt); return Swan.say('copied'); }
    41	    if (a === 'keep') {
    42	      const r = await Swan.post('/api/keep', { prompt: p.prompt, profileId: Swan.profile, projectId: Swan.project });
    43	      Swan.say(r.ok ? r.message : r.error);
    44	      return Swan.refreshKept?.();
    45	    }
    46	    if (a === 'make' || a === 'make4') {
    47	      const count = a === 'make4' ? 4 : 1;
    48	      Swan.say(count > 1 ? `queueing ${count} variations in ComfyUI…` : 'queueing in ComfyUI…');
    49	      const r = await Swan.post('/api/make', { profileId: Swan.profile, projectId: Swan.project, prompts: [{ prompt: p.prompt, sref: p.sref ?? undefined }], count });
    50	      const first = r.results?.[0];
    51	      if (!r.ok) return Swan.say(`not queued: ${(first?.errors || [r.error || r.hint || 'unknown']).join('; ')}${r.hint ? ` — ${r.hint}` : ''}`);
    52	      const seeds = r.results.filter((x) => x.ok).map((x) => x.seed).join(', ');
    53	      Swan.say(r.queued > 1
    54	        ? `queued <b>${r.queued}</b> variations in ComfyUI${r.failed ? ` (${r.failed} refused)` : ''} · seeds ${seeds} · <a class="link" data-tab="judge" href="#judge">judge them →</a>`
    55	        : `queued in ComfyUI as <b>${first.prefix}</b>${first.duplicate ? ' (already registered)' : ''} · seed ${first.seed} · <a class="link" data-tab="judge" href="#judge">judge it →</a>`);
    56	      return status();
    57	    }
    58	    if (a === 'comfy') {
    59	      const r = await Swan.post('/api/intent', { profileId: Swan.profile, projectId: Swan.project, prompt: p.prompt, seed: p.seed ?? undefined, sref: p.sref ?? undefined });
    60	      if (!r.ok) return Swan.say(`not registered: ${(r.errors || [r.error]).join('; ')}`);
    61	      try { await navigator.clipboard.writeText(r.prefix); } catch {}
    62	      return Swan.say(`ComfyUI prefix <b>${r.prefix}</b>${r.duplicate ? ' (already registered)' : ''} — copied; wire it into SaveImage.filename_prefix`);
    63	    }
    64	    const r = await S().post('/api/rate', { code: p.sref, rating: a === 'rate5' ? 5 : 1, note: 'rated from the page' });
    65	    S().say(r.ok ? r.message : r.error);
    66	  }
    67	
    68	  /** The truth about the render loop: your graph, ComfyUI, and what is still rendering. */
    69	  async function status() {
    70	    const Swan = S();
    71	    if (!Swan.project) { el('makebar').textContent = ''; return; }
    72	    try {
    73	      const s = await Swan.api(`/api/make/status?${Swan.qs()}`);
    74	      const wf = s.workflow.ready ? `your workflow <b>ready</b> (${s.workflow.nodes} nodes)` : `<span class="warn">${Swan.esc(s.workflow.reason)}</span>`;
    75	      const comfy = s.comfy.reachable ? `ComfyUI <b>up</b>${s.comfy.queue != null ? ` · ${s.comfy.queue} in queue` : ''}` : `<span class="warn">${Swan.esc(s.comfy.reason)}</span>`;
    76	      const r = s.renders;
    77	      el('makebar').innerHTML = `${wf} · ${comfy} · ${r.files} render${r.files === 1 ? '' : 's'}${r.waiting ? ` · ${r.waiting} still rendering` : ''}${r.files ? ` · <a class="link" data-tab="judge" href="#judge">judge them →</a>` : ''}`;
    78	    } catch { el('makebar').textContent = ''; }
    79	  }
    80	
    81	  async function run() {
    82	    const Swan = S();
    83	    if (!Swan.project) return Swan.say('create a project first — New project, above');
    84	    el('go').disabled = true;
    85	    Swan.say('generating…');
    86	    try {
    87	      const medium = el('medium').value;
    88	      const q = new URLSearchParams({ n: el('n').value, mode: el('mode').value, ar: el('ar').value, profile: Swan.profile, project: Swan.project, ...(medium === 'video' ? { medium: 'video' } : {}), ...(el('cine').checked ? { cinematic: '1' } : {}) });
    89	      const d = await Swan.api('/api/prompt?' + q);
    90	      const out = el('out'); out.innerHTML = '';
    91	      if (d.error) return Swan.say(`refused: ${Swan.esc(d.error)}`);
    92	      d.prompts.forEach((p) => out.appendChild(card(p)));
    93	      const t = d.taste || {};
    94	      let s = `seed <b>${d.seed ?? '—'}</b> · ${d.prompts.length} ${d.medium === 'video' ? '<b>shot</b> prompts' : 'prompts'} · taste <b>${t.source || '—'}</b>: ${t.evidenceSrefs ?? 0} evidence codes · ${t.keywords ?? 0} words · ${t.kept ?? 0} kept · confidence <b>${d.confidence}</b>`;
    95	      if (d.vetoed) s += ` · your avoid-list rejected ${d.vetoed} candidates`;
    96	      if (d.hint) s += ` · <span class="warn">${Swan.esc(d.hint)}</span>`;
    97	      Swan.say(s);
    98	    } catch (e) { Swan.say('failed: ' + e.message); } finally { el('go').disabled = false; }
    99	  }
   100	
   101	  S().tab('make', {
   102	    mount() { el('go').addEventListener('click', run); },
   103	    enter() { status(); },
   104	  });
   105	  S().onMemory(() => { const o = el('out'); if (o) o.innerHTML = '<div class="empty">Press Generate.</div>'; status(); });
   106	})();
```

## prompter/app-judge.js
```
     1	/**
     2	 * app-judge.js — the Judge tab: the courtroom. Real pictures by default, your renders on request.
     3	 *
     4	 * The judging core itself is `probe.js` (createJudge) — untouched, because the sendable bundle inlines it
     5	 * and the two must never drift. This file is only the page around it: which pool, which memory, record, undo.
     6	 */
     7	(() => {
     8	  const S = () => window.Swan;
     9	  const el = (id) => S().$(id);
    10	  let seed = null, judge = null, last = null, pool = new URLSearchParams(location.search).get('pool') === 'renders' ? 'renders' : '';
    11	  const sessionId = (() => {
    12	    try { const k = 'swan-taste-session'; let s = localStorage.getItem(k);
    13	      if (!/^[a-f0-9]{16}$/.test(s || '')) { s = SwanProbe.newSessionId(); localStorage.setItem(k, s); } return s; } catch { return 'ephemeral00000001'; }
    14	  })();
    15	  const note = (m) => { el('status').textContent = m; };
    16	
    17	  async function progress() {
    18	    const Swan = S();
    19	    const r = await fetch(`/api/profile?${Swan.qs()}`);
    20	    if (!r.ok) return '';
    21	    const g = (await r.json()).progress;
    22	    return g.done ? ` · <b>${g.grids}</b> grids recorded (floor ${g.gridsTarget} met) · <b>${g.judgements}</b> judgements · <b>enough for a direction</b>`
    23	      : ` · <b>${g.grids}</b> of ${g.gridsTarget} grids recorded · <b>${g.judgements}</b> judgements`;
    24	  }
    25	
    26	  async function load(useSeed) {
    27	    const Swan = S();
    28	    if (!Swan.project) { el('grid').innerHTML = ''; return note('create a project first — the memory starts empty'); }
    29	    el('pool').value = pool;
    30	    note('loading…'); el('result').textContent = '';
    31	    const r = await fetch(`/api/probe?${Swan.qs(pool ? '&pool=renders' : '')}` + (useSeed != null ? `&seed=${useSeed}` : ''));
    32	    const j = await r.json();
    33	    if (!r.ok) return note(`refused: ${j.error}`);
    34	    if (!j.candidates.length) { el('grid').innerHTML = ''; el('done').disabled = true; return note(pool ? `no renders to judge — ${j.hint || j.reason || 'make some first'}` : `no pictures left — ${j.hint}`); }
    35	    seed = j.seed;
    36	    judge = SwanProbe.createJudge({ grid: el('grid'), count: el('count'), done: el('done'), notify: note, brandLawLabel: SwanProbe.COPY[Swan.profile].brandLaw });
    37	    judge.load(j.candidates); el('undo').hidden = true;
    38	    if (pool) {
    39	      const clips = j.candidates.filter((c) => c.kind === 'video').length;
    40	      el('status').innerHTML = `seed <b>${seed}</b> · <b>${j.candidates.length}</b> of your renders${clips ? ` (${clips} clip${clips === 1 ? '' : 's'})` : ''} · pool <b>renders</b> · ${j.excludedCount} already judged, never repeated${j.exhausted ? ` · ${j.hint}` : ''}${await progress()} · a render counts toward what you want pictured, never toward style codes.`;
    41	    } else {
    42	      const webb = j.candidates.filter((c) => c.provenance === 'esa-webb-ccby').length;
    43	      const photo = j.candidates.filter((c) => c.provenance === 'unsplash' || c.provenance === 'pexels').length;
    44	      el('status').innerHTML = `seed <b>${seed}</b> · ${j.candidates.length} pictures from ${new Set(j.candidates.map((c) => c.doc)).size} sources${photo ? ` · <b>${photo}</b> photos` : ''}${webb ? ` · <b>${webb}</b> Webb` : ''} · pool <b>${j.pool}</b> · ${j.excludedCount} already seen, never repeated${j.exhausted ? ` · <b>pool nearly exhausted</b> — ${j.hint}` : ''}${await progress()} · images load from the source CDNs in your browser; nothing is downloaded or stored.`;
    45	    }
    46	    el('done').textContent = `Done — record for ${SwanProbe.COPY[Swan.profile].who}`; el('done').onclick = record;
    47	  }
    48	
    49	  async function record() {
    50	    const Swan = S();
    51	    const ev = judge.event({ source: Swan.profile, profileId: Swan.profile, projectId: Swan.project, channel: 'page', sessionId, notePublic: `probe seed ${seed}` });
    52	    el('done').disabled = true;
    53	    const j = await Swan.post('/api/event', ev);
    54	    if (!j.ok) { el('result').innerHTML = `refused: ${(j.errors || [j.error]).join('; ')}`; el('done').disabled = false; return; }
    55	    last = { eventId: j.eventId, candidates: ev.candidates.map((c) => ({ id: c.id })) };
    56	    el('result').innerHTML = `recorded <b>${j.eventId}</b>${j.duplicate ? ' (already recorded)' : ''} → ${Swan.profile}/${Swan.project}${await progress()}`;
    57	    el('done').textContent = 'Next grid →'; el('done').disabled = false; el('done').onclick = () => load(null);
    58	    el('undo').hidden = false;
    59	  }
    60	
    61	  async function undo() {
    62	    const Swan = S();
    63	    if (!last) return;
    64	    const ev = { schemaVersion: 1, eventType: 'reversal', source: Swan.profile, profileId: Swan.profile, projectId: Swan.project, channel: 'page', sessionId,
    65	      presentedAt: new Date().toISOString(), medium: 'still', brandContext: 'general', generatorDistribution: 'reference-mix',
    66	      candidates: last.candidates, reversalOf: last.eventId, notePublic: 'undo from the judging tab' };
    67	    const j = await Swan.post('/api/event', ev);
    68	    el('result').innerHTML = j.ok ? `grid <b>undone</b> — those pictures can be judged again${await progress()}` : `undo refused: ${(j.errors || [j.error]).join('; ')}`;
    69	    if (j.ok) { last = null; el('undo').hidden = true; }
    70	  }
    71	
    72	  S().tab('judge', {
    73	    mount() {
    74	      el('new').addEventListener('click', () => load(null));
    75	      el('again').addEventListener('click', () => load(seed));
    76	      el('undo').addEventListener('click', undo);
    77	      el('pool').addEventListener('change', () => { pool = el('pool').value === 'renders' ? 'renders' : ''; load(null); });
    78	    },
    79	    enter() { S().$('sub').innerHTML = SwanProbe.COPY[S().profile].sub; if (!judge) load(null); },
    80	  });
    81	  S().onMemory(() => { judge = null; last = null; if (S().current === 'judge') load(null); });
    82	})();
```

## prompter/app-directions.js
```
     1	/**
     2	 * app-directions.js — the Directions tab: what this memory's picks add up to.
     3	 *
     4	 * Partner readout / client closing deck / Sean's own compiled taste. Renders are shown APART from real
     5	 * pictures, because a render counts toward what you want pictured and never toward style codes.
     6	 */
     7	(() => {
     8	  const S = () => window.Swan;
     9	  const el = (id) => S().$(id);
    10	  const mk = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
    11	  const WHO = { sean: 'Sean', partner: 'Your direction', client: 'Your visual direction' };
    12	  const INTRO = {
    13	    sean: 'Compiled only from the grids you judged. Evidence = backed by your picks; prior = from themes.md, not yet backed.',
    14	    partner: 'Compiled only from the pictures you chose for this project — nothing was guessed, nothing was copied from anyone else.',
    15	    client: 'This is your visual direction, compiled only from what you chose — nothing was guessed.',
    16	  };
    17	  let text = '';
    18	
    19	  function media(k) {
    20	    if (k.kind === 'video') { const v = document.createElement('video'); v.src = k.url; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.controls = true; return v; }
    21	    const i = document.createElement('img'); i.src = k.url; i.alt = ''; i.loading = 'lazy'; i.referrerPolicy = 'no-referrer'; return i;
    22	  }
    23	
    24	  async function refresh() {
    25	    const Swan = S();
    26	    if (!Swan.project) { el('dirs').innerHTML = '<div class="empty">Create a project first.</div>'; return; }
    27	    el('dirs').innerHTML = ''; el('picks').innerHTML = ''; el('renders').innerHTML = ''; el('avoids').innerHTML = '';
    28	    const r = await fetch(`/api/profile?${Swan.qs()}`);
    29	    const p = await r.json();
    30	    if (!r.ok) { el('dsub').textContent = `no such memory: ${Swan.profile}/${Swan.project}`; return; }
    31	    el('dsub').innerHTML = `<b>${WHO[Swan.profile]}</b> · ${Swan.esc(p.title)} · ${p.progress.grids} grid${p.progress.grids === 1 ? '' : 's'} · ${p.progress.judgements} judgements${p.progress.done ? '' : ` · ${p.progress.gridsTarget} grids recommended before this means much`} · ${INTRO[Swan.profile]}`;
    32	    const lines = [`${WHO[Swan.profile]} — ${p.title}`, `${p.progress.grids} grids · ${p.progress.judgements} judgements · witness ${p.witness} · pool ${p.pool}`, ''];
    33	    if (!p.directions.length) el('dirs').append(mk('div', 'empty', 'No direction yet — judge a few grids and come back.'));
    34	    p.directions.forEach((d, i) => {
    35	      const card = mk('div', 'dir');
    36	      card.append(mk('span', `tier ${d.tier}`, d.tier.toUpperCase()), mk('h3', '', d.title));
    37	      if (d.because?.length) card.append(mk('div', 'muted', `because: ${d.because.join(', ')}`));
    38	      if (d.themeWords?.length) { const c = mk('div', 'chips'); d.themeWords.forEach((w) => c.append(mk('span', 'chip', w))); card.append(c); }
    39	      if (d.srefs?.length) card.append(mk('div', 'mono', d.srefs.map((s) => `--sref ${s}`).join('  ')));
    40	      for (const pr of d.prompts || []) card.append(mk('div', 'mono', pr));
    41	      card.append(mk('div', 'muted', d.note || `backed by ${d.evidenceEventIds.length} grid${d.evidenceEventIds.length === 1 ? '' : 's'}`));
    42	      el('dirs').append(card);
    43	      lines.push(`${i + 1}. [${d.tier.toUpperCase()}] ${d.title}${d.because?.length ? ` — because: ${d.because.join(', ')}` : ''}${d.themeWords?.length ? ` — words: ${d.themeWords.join(', ')}` : ''}${d.srefs?.length ? ` — srefs: ${d.srefs.join(', ')}` : ''}`);
    44	      for (const pr of d.prompts || []) lines.push(`   prompt: ${pr}`);
    45	    });
    46	    const real = p.picks.filter((k) => !k.generated), gen = p.picks.filter((k) => k.generated);
    47	    if (!real.length) el('picks').append(mk('div', 'empty', 'Nothing chosen yet.'));
    48	    el('renderwrap').hidden = gen.length === 0;
    49	    for (const k of gen) {
    50	      const card = mk('div', 'pick');
    51	      card.append(media(k), mk('div', 'cap', `${k.reasonCode} · ${k.outcomeClass} · ${k.prompt || 'render'}`));
    52	      el('renders').append(card);
    53	    }
    54	    if (gen.length) lines.push('', 'Renders you liked:', ...gen.map((k) => `- ${k.prompt || k.id}  (${k.reasonCode}/${k.outcomeClass})`));
    55	    lines.push('', 'Chosen pictures:');
    56	    for (const k of real) {
    57	      const card = mk('div', 'pick');
    58	      const cap = mk('div', 'cap', `${k.reasonCode} · ${k.outcomeClass}`);
    59	      if (k.credit && k.pageUrl) { const a = document.createElement('a'); a.href = k.pageUrl; a.target = '_blank'; a.rel = 'noopener'; a.textContent = k.credit; cap.append(' · ', a); }
    60	      else if (k.credit) cap.append(` · ${k.credit}`);
    61	      card.append(media(k), cap);
    62	      el('picks').append(card);
    63	      lines.push(`- ${k.url}  (${k.reasonCode}/${k.outcomeClass}${k.credit ? `, ${k.credit}` : ''})`);
    64	    }
    65	    if (p.proposedAvoids?.length) { el('avoids').append(mk('h2', '', 'Proposed avoids'), mk('div', 'mono', p.proposedAvoids.map((s) => `--sref ${s}`).join('  '))); lines.push('', `Proposed avoids: ${p.proposedAvoids.join(', ')}`); }
    66	    text = lines.join('\n');
    67	  }
    68	
    69	  S().tab('directions', {
    70	    mount() {
    71	      el('copyall').addEventListener('click', async () => { try { await navigator.clipboard.writeText(text); S().say('copied the brief'); } catch { S().say('copy failed'); } });
    72	      el('print').addEventListener('click', () => window.print());
    73	    },
    74	    enter: refresh,
    75	  });
    76	  S().onMemory(() => { if (S().current === 'directions') refresh(); });
    77	})();
```

## prompter/app-kept.js
```
     1	/**
     2	 * app-kept.js — the Kept tab: the prompts this memory decided to keep.
     3	 *
     4	 * Keeping is the compounding channel — a kept prompt re-enters generation as an exemplar (weight 12), so
     5	 * the brain gets more like its witness with every keep. Until now there was no way to SEE that list; you
     6	 * kept a prompt and it vanished into a file. Here it is, with the one-click moves that matter: make it
     7	 * again (or four ways), copy it, or drop it if it stopped being yours.
     8	 */
     9	(() => {
    10	  const S = () => window.Swan;
    11	  const el = (id) => S().$(id);
    12	
    13	  function row(prompt) {
    14	    const Swan = S();
    15	    const node = document.createElement('div');
    16	    node.className = 'card';
    17	    node.innerHTML = `<div class="p"></div>
    18	      <div class="meta"><span class="row-actions">
    19	        <button data-a="make" class="primary">Make</button>
    20	        <button data-a="make4" class="primary">Make 4</button>
    21	        <button data-a="copy">Copy</button>
    22	        <button data-a="drop" title="Remove it from this memory's kept list — generation stops using it as an exemplar">Drop</button>
    23	      </span></div>`;
    24	    node.querySelector('.p').textContent = prompt;
    25	    node.addEventListener('click', async (e) => {
    26	      const a = e.target?.dataset?.a;
    27	      if (!a) return;
    28	      if (a === 'copy') { await navigator.clipboard.writeText(prompt); return Swan.say('copied'); }
    29	      if (a === 'drop') {
    30	        const r = await Swan.post('/api/unkeep', { profileId: Swan.profile, projectId: Swan.project, prompt });
    31	        Swan.say(r.ok ? `dropped — ${r.kept} kept prompt${r.kept === 1 ? '' : 's'} left steering this memory` : `not dropped: ${r.error}`);
    32	        return refresh();
    33	      }
    34	      const count = a === 'make4' ? 4 : 1;
    35	      Swan.say(count > 1 ? 'queueing 4 variations…' : 'queueing…');
    36	      const r = await Swan.post('/api/make', { profileId: Swan.profile, projectId: Swan.project, prompts: [{ prompt }], count });
    37	      if (!r.ok) return Swan.say(`not queued: ${(r.results?.[0]?.errors || [r.error || r.hint || 'unknown']).join('; ')}`);
    38	      Swan.say(`queued <b>${r.queued}</b> in ComfyUI · seeds ${r.results.filter((x) => x.ok).map((x) => x.seed).join(', ')} · <a class="link" data-tab="judge" href="#judge">judge them →</a>`);
    39	    });
    40	    return node;
    41	  }
    42	
    43	  async function refresh() {
    44	    const Swan = S();
    45	    const list = el('keptlist');
    46	    if (!Swan.project) { list.innerHTML = '<div class="empty">Create a project first.</div>'; el('keptsub').textContent = ''; return; }
    47	    list.innerHTML = '';
    48	    const r = await fetch(`/api/kept?${Swan.qs()}`);
    49	    const j = await r.json();
    50	    if (!r.ok) { el('keptsub').textContent = j.error || 'could not read this memory'; return; }
    51	    el('keptsub').innerHTML = j.kept.length
    52	      ? `<b>${j.kept.length}</b> kept prompt${j.kept.length === 1 ? '' : 's'} steering <b>${Swan.WHO[Swan.profile]} · ${Swan.esc(j.title || Swan.project)}</b> — each one re-enters generation as an exemplar, so this list is what makes the brain more like you.${j.readOnly ? ' Sean\'s own list is edited in taste/kept.md.' : ''}`
    53	      : `Nothing kept yet for <b>${Swan.WHO[Swan.profile]} · ${Swan.esc(j.title || Swan.project)}</b>. Press <b>Keep</b> on a prompt you would render again — kept prompts steer every future batch.`;
    54	    j.kept.forEach((p) => { const n = row(p); if (j.readOnly) n.querySelector('[data-a=drop]')?.remove(); list.append(n); });
    55	  }
    56	
    57	  S().tab('kept', { enter: refresh });
    58	  S().refreshKept = () => { if (S().current === 'kept') refresh(); };
    59	  S().onMemory(() => { if (S().current === 'kept') refresh(); });
    60	})();
```

## prompter/probe.js
```
     1	/**
     2	 * probe.js — the judging core, shared by the loopback page (/probe) and the exported bundle.
     3	 *
     4	 * ONE implementation of "judge a grid": closest / miss (≤3 each, nothing forced), one reason and
     5	 * one outcome class locked BEFORE the label is revealed (never lead the witness), "I know this
     6	 * one", and the TasteEvent v1 the page or the bundle then records. The bundle inlines this file
     7	 * at export time (prompter/export-bundle.mjs) so the two can never drift apart.
     8	 *
     9	 * Plain script, no build step: attaches window.SwanProbe.
    10	 */
    11	(() => {
    12	  const REASONS = ['light', 'composition', 'realism', 'material', 'palette', 'subject', 'density', 'other'];
    13	  /** A clip is judged on the film axes the schema already carries (motion / pacing / edit-rhythm / sound) plus the shared ones. */
    14	  const REASONS_FILM = ['motion', 'pacing', 'edit-rhythm', 'sound', 'light', 'composition', 'palette', 'subject', 'other'];
    15	  const OUTCOMES = [['style', 'the look'], ['content', 'the subject'], ['execution', 'a bad render'], ['brand-law', 'not allowed for Swan'], ['mixed', 'mixed']];
    16	  const MAX_PER_VERDICT = 3;
    17	  /**
    18	   * Mode copy, shared by the page and the bundle. The client copy is the REAL client-facing copy:
    19	   * Sean's sales practice (his partner playing the prospect) has to feel exactly like the real thing.
    20	   */
    21	  const COPY = {
    22	    sean: { who: 'Sean', brandLaw: 'not allowed for Swan', sub: 'Twelve pictures, twelve different articles. Mark up to 3 <b>closest</b> and up to 3 <b>miss</b> — or fewer, nothing is forced. Pick ONE reason, lock it, <em>then</em> the label shows. Leave the rest alone.' },
    23	    partner: { who: 'Partner', brandLaw: 'not right for my brand', sub: 'Twelve pictures. Mark up to 3 that feel <b>closest</b> to what you want for this project and up to 3 that <b>miss</b> — fewer is fine. Pick one reason, lock it, <em>then</em> the credit shows. This memory is only for this project; your first evidence-backed direction usually appears after two or three grids.' },
    24	    client: { who: 'Client', brandLaw: 'not right for my brand', sub: 'Twelve pictures. Mark up to 3 that feel <b>closest</b> to the look you want and up to 3 that <b>miss</b>. Pick one reason for each, lock it, and the credit appears. There are no wrong answers — this is how we find your direction, and it usually shows after two or three grids.' },
    25	  };
    26	
    27	  const mk =(text, cls, on) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.className = cls; b.addEventListener('click', on); return b; };
    28	  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
    29	  const newSessionId = () => { const b = new Uint8Array(8); crypto.getRandomValues(b); return [...b].map((x) => x.toString(16).padStart(2, '0')).join(''); };
    30	  const labelFor = (c) => c.generated ? `your render · ${c.prompt || ''}${c.seed != null ? ` · seed ${c.seed}` : ''}${c.sref ? ` · --sref ${c.sref}` : ''}`
    31	    : c.provenance === 'esa-webb-ccby' ? `${c.title} · ESA/Webb, NASA, CSA, STScI (CC BY 4.0)`
    32	    : c.credit ? `${c.credit} · found by "${String(c.doc || '').replace(/^photo\//, '')}"`
    33	    : `${c.sref ? '--sref ' + c.sref + ' · ' : ''}${c.title || c.doc || ''}`;
    34	  /** The media element for a candidate: a muted looping clip for video, an image otherwise. Never bytes — a URL the browser loads. */
    35	  const mediaFor = (c, i) => {
    36	    if (c.kind === 'video') {
    37	      const v = document.createElement('video'); v.src = c.url; v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true; v.preload = 'metadata'; v.setAttribute('aria-label', `clip ${i + 1}`);
    38	      return v;
    39	    }
    40	    const img = document.createElement('img'); img.src = c.url; img.alt = `picture ${i + 1}`; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
    41	    return img;
    42	  };
    43	
    44	  /**
    45	   * @param {object} o
    46	   * @param {HTMLElement} o.grid            container for the cards
    47	   * @param {HTMLElement} o.count           "closest 1/3 · miss 0/3 · neutral 11" line
    48	   * @param {HTMLButtonElement} o.done      enabled only when every marked picture has a locked reason
    49	   * @param {(msg:string)=>void} [o.notify]  transient messages ("already 3 marked closest")
    50	   * @param {string} [o.brandLawLabel]      outcome label for the brand-law class (mode copy)
    51	   */
    52	  function createJudge({ grid, count, done, notify = () => {}, brandLawLabel }) {
    53	    const outcomes = OUTCOMES.map(([k, t]) => [k, k === 'brand-law' && brandLawLabel ? brandLawLabel : t]);
    54	    let candidates = [], presentedAt = null;
    55	    const state = new Map(); // id -> { verdict, reasonCode, outcomeClass, locked, recognized }
    56	    const countOf = (v) => [...state.values()].filter((s) => s.verdict === v).length;
    57	    const ready = () => candidates.length > 0 && [...state.values()].every((s) => s.verdict === 'neutral' || s.locked) && (countOf('closest') + countOf('miss')) > 0;
    58	
    59	    function load(list) {
    60	      candidates = list; presentedAt = new Date().toISOString(); state.clear();
    61	      for (const c of candidates) state.set(c.id, { verdict: 'neutral', reasonCode: null, outcomeClass: 'style', locked: false, recognized: false });
    62	      render();
    63	    }
    64	    function setVerdict(id, v) {
    65	      const s = state.get(id);
    66	      if (s.locked) return;
    67	      if (s.verdict === v) { s.verdict = 'neutral'; s.reasonCode = null; }
    68	      else { if (countOf(v) >= MAX_PER_VERDICT) { notify(`already ${MAX_PER_VERDICT} marked ${v} — unmark one first`); return; } s.verdict = v; }
    69	      render();
    70	    }
    71	    function render() {
    72	      grid.innerHTML = '';
    73	      candidates.forEach((c, i) => {
    74	        const s = state.get(c.id);
    75	        const card = el('div', 'card');
    76	        const img = mediaFor(c, i);
    77	        const body = el('div', 'body');
    78	        const row = el('div', 'row');
    79	        row.append(mk('Closest', s.verdict === 'closest' ? 'on-closest' : '', () => setVerdict(c.id, 'closest')),
    80	          mk('Miss', s.verdict === 'miss' ? 'on-miss' : '', () => setVerdict(c.id, 'miss')));
    81	        body.append(el('div', 'pos', `#${i + 1}`), row);
    82	        if (s.verdict !== 'neutral') {
    83	          const rr = el('div', 'row');
    84	          for (const rc of (c.kind === 'video' ? REASONS_FILM : REASONS)) rr.append(mk(rc, 'chip' + (s.reasonCode === rc ? ' on' : ''), () => { if (!s.locked) { s.reasonCode = rc; render(); } }));
    85	          const oo = el('div', 'row');
    86	          for (const [k, t] of outcomes) oo.append(mk(t, 'chip' + (s.outcomeClass === k ? ' on' : ''), () => { if (!s.locked) { s.outcomeClass = k; render(); } }));
    87	          const lock = mk(s.locked ? 'Locked' : 'Lock reason → reveal label', s.locked ? '' : 'primary', () => { if (s.reasonCode) { s.locked = true; render(); } });
    88	          lock.disabled = s.locked || !s.reasonCode;
    89	          const label = el('div', 'label' + (s.locked ? '' : ' hidden'), s.locked ? labelFor(c) : 'label hidden until you lock a reason');
    90	          body.append(rr, oo, lock, label);
    91	          if (s.locked) body.append(mk(s.recognized ? '✓ I know this one' : 'I know this one', 'chip' + (s.recognized ? ' on' : ''), () => { s.recognized = !s.recognized; render(); }));
    92	        }
    93	        card.append(img, body); grid.append(card);
    94	      });
    95	      done.disabled = !ready();
    96	      count.innerHTML = `closest <b>${countOf('closest')}</b>/${MAX_PER_VERDICT} · miss <b>${countOf('miss')}</b>/${MAX_PER_VERDICT} · neutral <b>${countOf('neutral')}</b>`;
    97	    }
    98	    /** The TasteEvent v1 for this grid. `meta` names the witness + memory; nothing here is bytes. */
    99	    function event(meta) {
   100	      const allGenerated = candidates.length > 0 && candidates.every((c) => c.provenance === 'local-comfy');
   101	      const allVideo = candidates.length > 0 && candidates.every((c) => c.kind === 'video');
   102	      return {
   103	        schemaVersion: 1, eventType: 'grid-selection', ...meta, presentedAt, respondedAt: new Date().toISOString(),
   104	        medium: meta.medium || (allVideo ? 'film' : 'still'), brandContext: meta.brandContext || 'general',
   105	        generatorDistribution: allGenerated ? 'local-comfy' : candidates.some((c) => c.provenance && c.provenance !== 'midlibrary-reference') ? 'reference-mix' : 'midlibrary-reference',
   106	        surroundMode: 'neutral-gray',
   107	        candidates: candidates.map((c) => ({ id: c.id, url: c.url, sref: c.sref ?? null, doc: c.doc, provenance: c.provenance, credit: c.credit ?? null, pageUrl: c.pageUrl ?? null, gridPosition: c.gridPosition,
   108	          ...(c.generated ? { generated: true, kind: c.kind, prompt: c.prompt, seed: c.seed ?? null } : {}) })),
   109	        items: candidates.map((c) => {
   110	          const s = state.get(c.id);
   111	          return s.verdict === 'neutral' ? { id: c.id, verdict: 'neutral' }
   112	            : { id: c.id, verdict: s.verdict, reasonCode: s.reasonCode, outcomeClass: s.outcomeClass, reasonLockedBeforeReveal: true, recognized: s.recognized, ...(s.recognized && c.sref ? { knownId: c.sref } : {}) };
   113	        }),
   114	      };
   115	    }
   116	    return { load, event, ready, countOf, get candidates() { return candidates; } };
   117	  }
   118	
   119	  window.SwanProbe = { REASONS, REASONS_FILM, OUTCOMES, MAX_PER_VERDICT, COPY, createJudge, newSessionId, labelFor };
   120	})();
```

## prompter/swan-prompt.mjs
```
     1	#!/usr/bin/env node
     2	/**
     3	 * swan-prompt — generates Midjourney prompts in Sean's taste.
     4	 *
     5	 *   node swan-prompt.mjs                       5 prompts, taste-steered
     6	 *   node swan-prompt.mjs --surprise -n 10      the "surprise me" randomiser over his themes
     7	 *   node swan-prompt.mjs --cinematic           constrain to cinematic style codes
     8	 *   node swan-prompt.mjs --seed 12345          reproduce an earlier batch exactly
     9	 *   node swan-prompt.mjs --rate 3769261565 5 "exactly my eye"
    10	 *   node swan-prompt.mjs --reject 877133173 "too flat"
    11	 *   node swan-prompt.mjs --stats
    12	 */
    13	import fs from 'node:fs';
    14	import path from 'node:path';
    15	import { loadCorpus, VAULT } from './lib/corpus.mjs';
    16	import { loadTaste } from './lib/taste.mjs';
    17	import { generate } from './lib/generate.mjs';
    18	
    19	const argv = process.argv.slice(2);
    20	const has = (...f) => f.some((x) => argv.includes(x));
    21	const val = (f, d) => { const i = argv.indexOf(f); return i > -1 && argv[i + 1] ? argv[i + 1] : d; };
    22	
    23	if (has('-h', '--help')) {
    24	  console.log(fs.readFileSync(new URL('./README.md', import.meta.url), 'utf8'));
    25	  process.exit(0);
    26	}
    27	
    28	/* ---------------- feedback: write taste back ---------------- */
    29	const LOVED = path.join(VAULT, 'taste/loved-srefs.md');
    30	
    31	function appendRating(code, rating, note) {
    32	  if (!/^\d{5,12}$/.test(code)) { console.error(`Not a valid SREF code: ${code}`); process.exit(1); }
    33	  const r = parseInt(rating, 10);
    34	  if (!(r >= 1 && r <= 5)) { console.error(`Rating must be 1-5, got: ${rating}`); process.exit(1); }
    35	
    36	  const corpus = loadCorpus();
    37	  const known = corpus.sref.find((c) => c.code === code);
    38	  // Distinguish "no verified name" from "not in the archive". 92 of 223 codes are real but unnamed
    39	  // (their name could not be confirmed), and reporting those as missing is simply false — it also
    40	  // reads as a typo warning, which would make Sean doubt a correct code.
    41	  if (!known) {
    42	    console.log(`Note: ${code} is not in the archive — rating it anyway, but check for a typo.`);
    43	  }
    44	  const name = known ? (known.style_name || 'unnamed code') : '(not in archive)';
    45	
    46	  let md = fs.readFileSync(LOVED, 'utf8');
    47	  if (new RegExp(`\\|\\s*\`?${code}\`?\\s*\\|`).test(md)) {
    48	    console.log(`${code} is already rated. Edit taste/loved-srefs.md directly to change it.`);
    49	    return;
    50	  }
    51	  const row = `| \`${code}\` | ${name} | ${r} | ${note || ''} |`;
    52	  // insert after the ratings table header rule, before the placeholder empty row if present
    53	  md = md.replace(/(\| ---\|---\|--:\|---\|\n|\|---\|---\|--:\|---\|\n)/, `$1${row}\n`);
    54	  if (!md.includes(row)) {
    55	    md = md.replace(/(## How to rate[\s\S]*?\n)(\n## )/, `$1${row}\n$2`);
    56	  }
    57	  if (!md.includes(row)) md += `\n${row}\n`;
    58	  md = md.replace(/^\|\s*\|\s*\|\s*\|\s*\|$/m, '').replace(/\n{3,}/g, '\n\n');
    59	  fs.writeFileSync(LOVED, md);
    60	  console.log(`Rated --sref ${code} (${name}) = ${r}/5`);
    61	  const t = loadTaste();
    62	  console.log(`Taste confidence now: ${t.confidence} (${t.ratedCount} rated)`);
    63	}
    64	
    65	function appendRejection(code, why) {
    66	  if (!/^\d{5,12}$/.test(code)) { console.error(`Not a valid SREF code: ${code}`); process.exit(1); }
    67	  let md = fs.readFileSync(LOVED, 'utf8');
    68	  const row = `| \`${code}\` | ${why || 'not my eye'} |`;
    69	  md = md.replace(/(## Rejected[\s\S]*?\|---\|---\|\n)/, `$1${row}\n`);
    70	  md = md.replace(/^\|\s*\|\s*\|$/m, '').replace(/\n{3,}/g, '\n\n');
    71	  fs.writeFileSync(LOVED, md);
    72	  console.log(`Rejected --sref ${code} — the generator will now avoid it.`);
    73	}
    74	
    75	/** Keep a prompt — the strongest signal available, because it is entirely Sean's. */
    76	function appendKept(text) {
    77	  if (!text || text.split(/\s+/).length < 3) {
    78	    console.error('Give the prompt to keep, e.g.  --keep "glacier calving into black water --ar 16:9 --v 7"');
    79	    process.exit(1);
    80	  }
    81	  const f = path.join(VAULT, 'taste/kept.md');
    82	  let md = fs.readFileSync(f, 'utf8');
    83	  if (md.includes(text.trim())) { console.log('Already kept.'); return; }
    84	  md = md.replace(/^- \(nothing kept yet[^\n]*\)$/m, '').replace(/(## Kept\n)/, `$1\n- ${text.trim()}\n`);
    85	  fs.writeFileSync(f, md.replace(/\n{3,}/g, '\n\n'));
    86	  const t = loadTaste();
    87	  console.log(`Kept. ${t.kept.length} exemplar${t.kept.length === 1 ? '' : 's'} now steering generation.`);
    88	}
    89	
    90	if (has('--keep')) {
    91	  const i = argv.indexOf('--keep');
    92	  appendKept(argv.slice(i + 1).filter((a) => !a.startsWith('--')).join(' '));
    93	  process.exit(0);
    94	}
    95	if (has('--rate')) {
    96	  const i = argv.indexOf('--rate');
    97	  appendRating(argv[i + 1], argv[i + 2], argv.slice(i + 3).filter((a) => !a.startsWith('--')).join(' '));
    98	  process.exit(0);
    99	}
   100	if (has('--reject')) {
   101	  const i = argv.indexOf('--reject');
   102	  appendRejection(argv[i + 1], argv.slice(i + 2).filter((a) => !a.startsWith('--')).join(' '));
   103	  process.exit(0);
   104	}
   105	
   106	/* ---------------- load ---------------- */
   107	let corpus, taste;
   108	try { corpus = loadCorpus(); taste = loadTaste(); }
   109	catch (e) { console.error(`\n${e.message}\n`); process.exit(1); }
   110	
   111	if (has('--stats')) {
   112	  // How much of the corpus Sean's themes actually reach — the real ceiling on variety.
   113	  const { subjectOf } = await import('./lib/corpus.mjs');
   114	  const { tasteScore } = await import('./lib/taste.mjs');
   115	  const onTaste = [...new Set(corpus.prompts.map((p) => subjectOf(p.prompt)))]
   116	    .filter((s) => tasteScore(s, taste) > 0).length;
   117	
   118	  console.log(`
   119	Swan Taste Brain — corpus status
   120	
   121	  KNOWLEDGE (sources/, replaceable)
   122	    SREF codes          ${corpus.srefCount}
   123	    usable prompts      ${corpus.prompts.length} of ${corpus.promptCount}
   124	    catalog entries     ${corpus.catalogCount}   (Midlibrary library: styles, artists, techniques)
   125	    article headings    ${corpus.vocab.length}   (H2 titles from guides — NOT a styles count)
   126	    named artists       ${corpus.artists.length}
   127	    parameters          ${corpus.params.length}
   128	
   129	  TASTE (taste/, irreplaceable)
   130	    rated SREF codes    ${taste.ratedCount}
   131	    kept prompts        ${taste.kept.length}   (the compounding channel — weight 12 in every batch)
   132	    rejected codes      ${taste.rejectedSrefs.length}
   133	    theme keywords      ${taste.keywords.length}
   134	    avoid keywords      ${taste.avoidWords.length}
   135	    confidence          ${taste.confidence}
   136	
   137	  REACH (how much of the corpus your themes actually touch)
   138	    on-taste subjects   ${onTaste} distinct
   139	    exploration rate    ${Math.round(Math.max(0.25, 1 - taste.ratedCount / 20) * 100)}%
   140	`);
   141	  if (onTaste < 250) {
   142	    console.log(`  Only ${onTaste} distinct subjects match your themes, so subjects will start repeating.
   143	  Variety comes from recombination (subject × ${corpus.artists.length} artists × ${corpus.srefCount} codes),
   144	  but to widen the subject pool itself, add themes to taste/themes.md.\n`);
   145	  }
   146	  if (taste.confidence === 'themes-only') {
   147	    console.log(`  Output is steered by THEMES ONLY — no SREF ratings supplied yet.
   148	  Rate ~15 codes to move this to "strong":  node swan-prompt.mjs --rate <code> <1-5> "why"\n`);
   149	  }
   150	  process.exit(0);
   151	}
   152	
   153	/* ---------------- generate ---------------- */
   154	const opts = {
   155	  count: parseInt(val('-n', val('--count', '5')), 10),
   156	  mode: has('--surprise', '--random') ? 'surprise' : 'taste',
   157	  ar: val('--ar', '16:9'),
   158	  seed: has('--seed') ? parseInt(val('--seed'), 10) : undefined,
   159	};
   160	if (!(opts.count > 0 && opts.count <= 100)) { console.error('--count must be 1-100'); process.exit(1); }
   161	
   162	if (has('--cinematic')) {
   163	  corpus.sref = corpus.sref.filter((c) => /cinematic|film|movie|noir/i.test(`${c.source_title} ${c.style_name} ${c.example_prompt}`));
   164	  if (!corpus.sref.length) { console.error('No cinematic SREF codes matched.'); process.exit(1); }
   165	}
   166	
   167	// Config problems must be loud. A keyword in both taste files, an unparseable rating, or a code
   168	// that is both rated and rejected all fail silently otherwise — and silent failure in a taste file
   169	// is indistinguishable from "the generator just isn't very good".
   170	if (taste.warnings.length) {
   171	  console.log(`\n⚠ ${taste.warnings.length} taste-file problem${taste.warnings.length === 1 ? '' : 's'}:`);
   172	  taste.warnings.forEach((w) => console.log(`   ${w}`));
   173	}
   174	
   175	let seed, prompts, poolSize, keptInPool, drops, exhausted;
   176	try { ({ seed, prompts, poolSize, keptInPool, drops, exhausted } = generate(corpus, taste, opts)); }
   177	catch (e) { console.error(`\n${e.message}\n`); process.exit(1); }
   178	
   179	const label = opts.mode === 'surprise' ? 'SURPRISE (random over your themes)' : 'TASTE-STEERED';
   180	console.log(`\n${label}  ·  seed ${seed}  ·  taste confidence: ${taste.confidence}${has('--cinematic') ? '  ·  cinematic only' : ''}`);
   181	if (taste.confidence === 'themes-only') {
   182	  console.log('themes only — no SREF ratings yet, so style choice is theme-matched, not learned from you');
   183	}
   184	console.log('─'.repeat(78));
   185	
   186	prompts.forEach((p, i) => {
   187	  console.log(`\n${String(i + 1).padStart(2)}. ${p.prompt}`);
   188	  const bits = [`grammar: ${p.grammar}`];
   189	  if (p.sref) {
   190	    // Only claim a style name when one was actually verified; otherwise say so rather than
   191	    // printing the bare code under a "style:" label, which reads as a name and is not one.
   192	    const style = p.sref.style_name ? `style: ${p.sref.style_name}` : 'style: unnamed code';
   193	    const prov = p.sref.rating ? ` (you rated ${p.sref.rating}/5)` : ' ← NEW, rate it';
   194	    bits.push(style + prov);
   195	  }
   196	  console.log(`    ${bits.join('  ·  ')}`);
   197	});
   198	
   199	const fresh = prompts.filter((p) => p.sref?.isNew).length;
   200	const fromKept = prompts.filter((p) => p.lineage?.source_doc === 'taste/kept.md').length;
   201	console.log(`\n${'─'.repeat(78)}`);
   202	if (fromKept) console.log(`${fromKept} of ${prompts.length} built on prompts you kept.`);
   203	if (drops?.vetoed) {
   204	  const top = [...drops.byKeyword.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
   205	  console.log(`Your avoid-list rejected ${drops.vetoed} candidates (top: ${top.map(([k, n]) => `"${k}" ${n}`).join(', ')}).`);
   206	  console.log(`If that feels too aggressive, trim taste/rejected.md — nothing else reports this.`);
   207	}
   208	if (exhausted) {
   209	  console.log(`Asked for ${opts.count}, produced ${prompts.length} — your themes reach ${poolSize} distinct subjects`);
   210	  console.log(`and a batch will not repeat an idea. Add themes to taste/themes.md to widen the pool.`);
   211	}
   212	if (fresh) {
   213	  console.log(`${fresh} of ${prompts.length} use a style you have not judged yet — those are the ones worth rating.`);
   214	}
   215	console.log(`Reproduce this batch:  node swan-prompt.mjs --seed ${seed} -n ${opts.count}${opts.mode === 'surprise' ? ' --surprise' : ''}`);
   216	console.log(`Teach it:              node swan-prompt.mjs --rate <code> <1-5> "why it works"\n`);
   217	
   218	if (has('--json')) {
   219	  const outDir = path.join(VAULT, 'prompter/out');
   220	  fs.mkdirSync(outDir, { recursive: true });
   221	  const f = path.join(outDir, `batch-${seed}.json`);
   222	  fs.writeFileSync(f, JSON.stringify({ seed, mode: opts.mode, confidence: taste.confidence, prompts }, null, 2));
   223	  console.log(`JSON written: ${path.relative(VAULT, f)}\n`);
   224	}
```

## prompter/export-bundle.mjs
```
     1	#!/usr/bin/env node
     2	/**
     3	 * export-bundle.mjs — "send it to my wife": ONE HTML file she opens anywhere, judges, sends back.
     4	 *
     5	 *   node prompter/export-bundle.mjs --profile partner --project school-site            → 8 grids
     6	 *   node prompter/export-bundle.mjs --profile client --project practice-1 --grids 8 --title "Practice round" --words "warm classroom, forest light"
     7	 *   flags: --grids N (8)  --n 12  --seed N (reproducible)  --out <file>  --title/--words create the project if it is missing
     8	 *
     9	 * WHY (Sean 2026-08-25): the probe server is loopback-only and unauthenticated by design; widening
    10	 * the bind is not the fix (prompter/README.md). So delivery off-machine is a static bundle: no
    11	 * server, no auth, nothing exposed. The judged results come back as a small JSON file that
    12	 * prompter/import-bundle.mjs hands to the ONE writer (POST /api/event).
    13	 *
    14	 * LAW: a bundle is SHAREABLE-POOL ONLY, whatever the project's pool says — Unsplash / Pexels /
    15	 * ESA Webb, hotlinked and credited. Midlibrary never leaves the machine (handoff §3 law 6). The
    16	 * payload is checked for Midlibrary ids/hosts before the file is written, and refused if any.
    17	 * Pictures are never repeated: across the bundle's grids, and against what the namespace has
    18	 * already been shown on the page.
    19	 */
    20	import fs from 'node:fs';
    21	import path from 'node:path';
    22	import { fileURLToPath } from 'node:url';
    23	import { randomBytes } from 'node:crypto';
    24	import { VAULT } from './lib/corpus.mjs';
    25	import { loadImages } from './lib/images.mjs';
    26	import { selectProbe } from './lib/probe.mjs';
    27	import { readEventsFor, judgedIds, PROFILES, isProjectId } from './lib/events.mjs';
    28	import { readProject, createProject, SHAREABLE_MIX, SHAREABLE_COLLECTIONS } from './lib/projects.mjs';
    29	
    30	const HERE = path.dirname(fileURLToPath(import.meta.url));
    31	export const OUT_DIR = path.join(VAULT, 'prompter', 'out', 'bundles');
    32	const MIDLIBRARY_RE = /ml:img:|website-files\.com|midlibrary-reference|midlibrary\.io/i;
    33	
    34	/** N grids for a namespace from the SHAREABLE pool only, never repeating a picture. */
    35	export function planGrids({ profile, project, grids = 8, n = 12, seed, images = loadImages() }) {
    36	  const shareable = images.filter((r) => SHAREABLE_COLLECTIONS.has(r.collection));
    37	  const exclude = new Set(judgedIds(readEventsFor(profile, project)));
    38	  const base = Number.isFinite(seed) ? seed : Math.floor(Math.random() * 2 ** 31);
    39	  const out = [];
    40	  for (let i = 0; i < grids; i++) {
    41	    const g = selectProbe({ images: shareable, n, seed: base + i, excludeIds: [...exclude], mix: SHAREABLE_MIX });
    42	    for (const c of g.candidates) exclude.add(c.id);
    43	    out.push({ seed: g.seed, candidates: g.candidates.map((c) => ({
    44	      id: c.id, url: c.url, sref: null, doc: c.doc, collection: c.collection, title: c.title,
    45	      provenance: c.provenance, credit: c.credit ?? null, pageUrl: c.pageUrl ?? null, gridPosition: c.gridPosition,
    46	    })) });
    47	  }
    48	  return { baseSeed: base, grids: out };
    49	}
    50	
    51	/** Build the bundle for an existing project. Returns { html, payload }. Throws rather than leak. */
    52	export function buildBundle({ profile, project, grids = 8, n = 12, seed, images } = {}) {
    53	  if (!PROFILES.includes(profile) || !isProjectId(project)) throw new Error('bad namespace: --profile sean|partner|client, --project <slug>');
    54	  const pj = readProject(profile, project);
    55	  if (!pj) throw new Error(`unknown project ${profile}/${project} — create it on the probe page (New project) or pass --title here`);
    56	  const plan = planGrids({ profile, project, grids, n, seed, images });
    57	  const payload = {
    58	    bundleId: randomBytes(6).toString('hex'), profileId: profile, projectId: project, title: pj.title,
    59	    themeWords: pj.themeWords || [], pool: 'shareable', createdAt: new Date().toISOString(), baseSeed: plan.baseSeed, grids: plan.grids,
    60	  };
    61	  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
    62	  if (MIDLIBRARY_RE.test(json)) throw new Error('refused: the bundle payload would carry Midlibrary — that never leaves the machine');
    63	  const tpl = fs.readFileSync(path.join(HERE, 'bundle.html'), 'utf8');
    64	  const css = fs.readFileSync(path.join(HERE, 'probe.css'), 'utf8');
    65	  const js = fs.readFileSync(path.join(HERE, 'probe.js'), 'utf8');
    66	  const html = tpl.replace('/*__PROBE_CSS__*/', () => css).replace('/*__PROBE_JS__*/', () => js).replace('__BUNDLE_JSON__', () => json);
    67	  return { html, payload };
    68	}
    69	
    70	const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i > -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : dflt; };
    71	
    72	if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
    73	  const profile = arg('profile'), project = arg('project');
    74	  const grids = Number(arg('grids', 8)), n = Number(arg('n', 12));
    75	  const seedRaw = arg('seed'); const seed = seedRaw !== undefined && /^\d+$/.test(seedRaw) ? Number(seedRaw) : undefined;
    76	  if (!profile || !project) { console.error('usage: node prompter/export-bundle.mjs --profile partner|client --project <slug> [--grids 8] [--title "…" --words "a, b"]'); process.exit(2); }
    77	  if (!readProject(profile, project) && arg('title')) {
    78	    const r = createProject({ profileId: profile, projectId: project, title: arg('title'), themeWords: arg('words', '') });
    79	    if (!r.ok) { console.error(`project not created: ${r.errors.join('; ')}`); process.exit(1); }
    80	    console.log(`created ${profile}/${project} — "${r.project.title}" · words: ${r.project.themeWords.join(', ') || '(none)'} · memory starts empty`);
    81	  }
    82	  let built;
    83	  try { built = buildBundle({ profile, project, grids, n, seed }); } catch (err) { console.error(String(err.message)); process.exit(1); }
    84	  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);
    85	  const out = arg('out', path.join(OUT_DIR, `${profile}-${project}-${stamp}.html`));
    86	  fs.mkdirSync(path.dirname(out), { recursive: true });
    87	  fs.writeFileSync(out, built.html, 'utf8');
    88	  const pics = built.payload.grids.reduce((a, g) => a + g.candidates.length, 0);
    89	  console.log(`\nwrote ${out}\n  ${built.payload.grids.length} grids · ${pics} pictures · shareable pool only · bundle ${built.payload.bundleId}\n`);
    90	  console.log('  send that ONE file. They open it in any browser (needs internet for the pictures), judge, press');
    91	  console.log('  "Download results", and send back swan-taste-results-*.json. Then, with the server running:');
    92	  console.log(`  node prompter/import-bundle.mjs <that file>      → ${profile}/${project} · brief at /brief?profile=${profile}&project=${project}\n`);
    93	}
```

## prompter/import-bundle.mjs
```
     1	#!/usr/bin/env node
     2	/**
     3	 * import-bundle.mjs — the judged results of a bundle come home, through the ONE writer.
     4	 *
     5	 *   node prompter/import-bundle.mjs <swan-taste-results-*.json> [--server http://127.0.0.1:7331]
     6	 *
     7	 * This script never opens taste/events itself (single-writer law): it validates every event
     8	 * locally first — the witness must match the bundle's profile, the channel must be 'bundle', and
     9	 * TasteEvent v1 must hold — then POSTs each one to /api/event on the running loopback server,
    10	 * which is the only process that appends. Duplicates are reported, not re-written.
    11	 */
    12	import fs from 'node:fs';
    13	import path from 'node:path';
    14	import { validateEvent, eventIdFor, PROFILES, isProjectId } from './lib/events.mjs';
    15	
    16	/** Pure: shape + witness checks on a results file. Returns { ok, errors, events }. */
    17	export function checkResults(results) {
    18	  const errors = [];
    19	  if (!results || typeof results !== 'object') return { ok: false, errors: ['results must be an object'], events: [] };
    20	  if (!PROFILES.includes(results.profileId)) errors.push(`profileId must be one of ${PROFILES.join('|')}`);
    21	  if (!isProjectId(results.projectId)) errors.push('projectId must be a slug');
    22	  if (!Array.isArray(results.events) || !results.events.length) errors.push('events must be a non-empty array');
    23	  (results.events || []).forEach((e, i) => {
    24	    const at = `event ${i + 1}`;
    25	    if (e?.channel !== 'bundle') errors.push(`${at}: channel must be 'bundle'`);
    26	    if (e?.profileId !== results.profileId || e?.projectId !== results.projectId) errors.push(`${at}: namespace does not match the results file`);
    27	    if (e?.source !== results.profileId) errors.push(`${at}: source '${e?.source}' is not the bundle's witness '${results.profileId}'`);
    28	    const v = validateEvent(e);
    29	    if (!v.ok) errors.push(`${at}: ${v.errors.join('; ')}`);
    30	  });
    31	  return { ok: errors.length === 0, errors, events: results.events || [] };
    32	}
    33	
    34	/**
    35	 * Hand every event to the writer — all or nothing by default (panel round 2: a half-applied bundle is worse
    36	 * than a refused one). `judged` = ids the memory has already judged; any overlap refuses the WHOLE file
    37	 * before a line is written, unless `partial` is set. `post(event)` → { ok, eventId?, duplicate?, errors? }.
    38	 */
    39	export async function importResults(results, { post, judged = [], known = [], partial = false }) {
    40	  const c = checkResults(results);
    41	  if (!c.ok) return { ok: false, errors: c.errors, accepted: 0, duplicates: 0, refused: 0 };
    42	  const seen = new Set(judged), knownIds = new Set(known);
    43	  // An event the memory already holds (same eventId) is a duplicate, not a conflict — re-importing the same file is safe.
    44	  const overlaps = c.events.map((e, i) => ({ i, n: knownIds.has(eventIdFor(e)) ? 0 : (e.candidates || []).filter((k) => seen.has(k.id)).length })).filter((o) => o.n);
    45	  if (overlaps.length && !partial) {
    46	    return { ok: false, accepted: 0, duplicates: 0, refused: c.events.length,
    47	      errors: [`refused whole file: ${overlaps.map((o) => `grid ${o.i + 1} (${o.n} picture${o.n === 1 ? '' : 's'})`).join(', ')} already judged in this memory since the bundle was made — undo those on the page, or re-run with --partial to import the rest`] };
    48	  }
    49	  let accepted = 0, duplicates = 0, refused = 0;
    50	  const refusals = [];
    51	  for (const e of c.events) {
    52	    const r = await post(e);
    53	    if (r?.ok && r.duplicate) duplicates++;
    54	    else if (r?.ok) accepted++;
    55	    else { refused++; refusals.push((r?.errors || [r?.error || 'unknown']).join('; ')); }
    56	  }
    57	  return { ok: refused === 0, accepted, duplicates, refused, errors: refusals };
    58	}
    59	
    60	if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
    61	  const file = process.argv[2];
    62	  const si = process.argv.indexOf('--server');
    63	  const server = si > -1 ? process.argv[si + 1] : 'http://127.0.0.1:7331';
    64	  if (!file || !fs.existsSync(file)) { console.error('usage: node prompter/import-bundle.mjs <swan-taste-results-*.json>'); process.exit(2); }
    65	  let results;
    66	  try { results = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { console.error('not a JSON file'); process.exit(1); }
    67	  const pre = checkResults(results);
    68	  if (!pre.ok) { console.error(`refused before sending anything:\n  ${pre.errors.join('\n  ')}`); process.exit(1); }
    69	  const post = async (e) => {
    70	    const r = await fetch(`${server}/api/event`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(e) });
    71	    return r.json();
    72	  };
    73	  let out;
    74	  try {
    75	    const j = await (await fetch(`${server}/api/judged?profile=${results.profileId}&project=${results.projectId}`)).json();
    76	    if (!Array.isArray(j.ids)) { console.error(`cannot read the memory: ${j.error || 'no ids'}`); process.exit(1); }
    77	    out = await importResults(results, { post, judged: j.ids, known: j.eventIds || [], partial: process.argv.includes('--partial') });
    78	  } catch (err) {
    79	    console.error(`could not reach ${server} — start the taste brain first (Swan Prompt Studio.cmd or node prompter/serve.mjs): ${err.message}`);
    80	    process.exit(1);
    81	  }
    82	  console.log(`\n${results.profileId}/${results.projectId} ← bundle ${results.bundleId}: ${out.accepted} grid(s) recorded · ${out.duplicates} already there · ${out.refused} refused`);
    83	  if (out.errors.length) console.log('  ' + out.errors.join('\n  '));
    84	  console.log(`  brief: ${server}/brief?profile=${results.profileId}&project=${results.projectId}\n`);
    85	  process.exit(out.ok ? 0 : 1);
    86	}
```

## prompter/lib/images.mjs
```
     1	/**
     2	 * images.mjs — the picture index the probe draws from.
     3	 *
     4	 * WHY THIS EXISTS: the Midlibrary archive kept the author's CDN image URLs inside the markdown
     5	 * and deliberately never mirrored the files (his hosting stays canonical; ~5,800 requests were
     6	 * never fired). The catalog JSONs carry zero image URLs. So the only pictures the brain can put
     7	 * in front of Sean are the 4,700+ `![alt](url)` lines in guides/tops/focus — and in the tops
     8	 * articles every image is followed, four lines later, by the exact prompt that produced it,
     9	 * including its `--sref` code. That adjacency is what turns a picture into a catalog ID.
    10	 *
    11	 * LICENCE POSTURE: this module reads URLs, never bytes. The browser loads each image directly
    12	 * from Midlibrary's CDN, the same way it does when Sean reads the site as a subscriber. Nothing
    13	 * is downloaded by this process, nothing is stored except the URL and a hash of it. Do not add a
    14	 * fetch here. Do not add a cache here.
    15	 *
    16	 * Section-banner placeholders (the same x169.png repeated under every heading) are dropped by
    17	 * frequency: a URL that appears 3+ times across the corpus is chrome, not an example.
    18	 */
    19	import fs from 'node:fs';
    20	import path from 'node:path';
    21	import { createHash } from 'node:crypto';
    22	import { VAULT } from './corpus.mjs';
    23	
    24	const COLLECTIONS = ['tops', 'guides', 'focus'];
    25	const IMG_LINE = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/;
    26	const SREF_IN_TEXT = /\\?-\\?-sref\s+(\d{5,12})/;
    27	const SREF_IN_FILENAME = /---sref-(\d{5,12})/;
    28	const PARAM_IN_TEXT = /\\?-\\?-(v|niji|ar|stylize|chaos|style|sw|cref|oref|p)\b/;
    29	const LOOKAHEAD = 8;
    30	const PLACEHOLDER_MIN_COUNT = 3;
    31	
    32	let cache = null;
    33	
    34	const idFor = (url) => 'ml:img:' + createHash('sha1').update(url).digest('hex').slice(0, 12);
    35	const cleanPrompt = (line) => line.replace(/\\-/g, '-').replace(/\s+/g, ' ').trim();
    36	
    37	/** Parse one markdown file into image records (before placeholder filtering). */
    38	export function parseImagesFromMarkdown(md, doc, collection) {
    39	  const lines = md.split(/\r?\n/);
    40	  const title = (lines.find((l) => /^#\s+/.test(l)) || '').replace(/^#\s+/, '').trim();
    41	  const out = [];
    42	  for (let i = 0; i < lines.length; i++) {
    43	    const m = IMG_LINE.exec(lines[i]);
    44	    if (!m) continue;
    45	    const [, alt, url] = m;
    46	    let sref = (SREF_IN_FILENAME.exec(url) || [])[1] || null;
    47	    let prompt = null;
    48	    // Real layout in the archive:  image / blank / `](#)` / blank / prompt.  So we scan forward for
    49	    // the first PARAMETER-BEARING line (`--sref`, `--v`, `--niji` …), skipping link scaffolding,
    50	    // and stop early at the next image or heading — that belongs to the next example.
    51	    for (let j = i + 1; j <= i + LOOKAHEAD && j < lines.length; j++) {
    52	      const l = lines[j].trim();
    53	      if (!l || l === '[' || l === '](#)') continue;
    54	      if (IMG_LINE.test(l) || /^#/.test(l)) break;
    55	      const s = SREF_IN_TEXT.exec(l);
    56	      if (s) { sref = sref || s[1]; prompt = cleanPrompt(l); break; }
    57	      if (PARAM_IN_TEXT.test(l)) { prompt = cleanPrompt(l); break; }
    58	    }
    59	    out.push({ id: idFor(url), url, alt: alt.trim(), sref, prompt, doc, collection, title, provenance: 'midlibrary-reference' });
    60	  }
    61	  return out;
    62	}
    63	
    64	/**
    65	 * Load every image record across the archive. Cached. Returns [] when the archive is absent so
    66	 * the rest of the prompter keeps working for anyone without the sources.
    67	 */
    68	export function loadImages() {
    69	  if (cache) return cache;
    70	  const root = path.join(VAULT, 'sources/midlibrary');
    71	  const all = [];
    72	  for (const collection of COLLECTIONS) {
    73	    const dir = path.join(root, collection);
    74	    if (!fs.existsSync(dir)) continue;
    75	    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.md'))) {
    76	      const md = fs.readFileSync(path.join(dir, f), 'utf8');
    77	      all.push(...parseImagesFromMarkdown(md, `${collection}/${f}`, collection));
    78	    }
    79	  }
    80	  const counts = new Map();
    81	  for (const r of all) counts.set(r.url, (counts.get(r.url) || 0) + 1);
    82	  const seen = new Set();
    83	  cache = all.filter((r) => {
    84	    if ((counts.get(r.url) || 0) >= PLACEHOLDER_MIN_COUNT) return false;
    85	    if (seen.has(r.url)) return false;
    86	    seen.add(r.url);
    87	    return true;
    88	  });
    89	  cache.push(...loadWebbImages(), ...loadPhotoImages());
    90	  return cache;
    91	}
    92	
    93	/**
    94	 * Photographs from the free photo APIs (prompter/fetch-photos.mjs — Unsplash, Pexels). Hotlinked
    95	 * from the providers' CDNs as their terms require; each record carries its credit. doc = the
    96	 * search word that found it, so stratification spreads a grid across Sean's theme words.
    97	 */
    98	export function loadPhotoImages() {
    99	  const p = path.join(VAULT, 'sources/photos/photos-index.json');
   100	  if (!fs.existsSync(p)) return [];
   101	  let idx;
   102	  try { idx = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
   103	  return (idx.photos || []).map((w) => ({
   104	    id: w.id, url: w.url, alt: w.title, sref: null, prompt: null,
   105	    doc: `photo/${w.query}`, collection: 'photo', title: w.title,
   106	    provenance: w.provider, credit: w.credit, pageUrl: w.pageUrl, photographerUrl: w.photographerUrl,
   107	    downloadLocation: w.downloadLocation,
   108	  }));
   109	}
   110	
   111	/**
   112	 * James Webb pictures from the ESA/Webb archive index (prompter/fetch-webb.mjs). CC BY 4.0 —
   113	 * a different licence class from Midlibrary, carried on every record as `provenance` so the
   114	 * event log and any exporter can tell them apart. Absent index → [] (probe stays Midlibrary-only).
   115	 */
   116	export function loadWebbImages() {
   117	  const p = path.join(VAULT, 'sources/webb/esawebb-index.json');
   118	  if (!fs.existsSync(p)) return [];
   119	  let idx;
   120	  try { idx = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return []; }
   121	  return (idx.images || []).map((w) => ({
   122	    id: `esawebb:${w.id}`, url: w.screen, alt: w.title, sref: null, prompt: null,
   123	    doc: `webb/${w.category}`, collection: 'webb', title: w.title,
   124	    provenance: 'esa-webb-ccby', credit: 'ESA/Webb, NASA, CSA, STScI',
   125	  }));
   126	}
   127	
   128	export const imagesForSref = (code) => loadImages().filter((r) => r.sref === String(code));
   129	
   130	/** Test seam: drop the cache so a test can re-parse. */
   131	export const _resetImageCache = () => { cache = null; };
```

## prompter/lib/origin.mjs
```
     1	/**
     2	 * Browser-origin defence for the local write API (/api/keep, /api/rate).
     3	 *
     4	 * Binding to 127.0.0.1 stops the network, not the browser. Any web page the machine visits can
     5	 * POST to http://127.0.0.1:7331 as a "simple" cross-origin request; the browser withholds the
     6	 * RESPONSE from the page, but the server has already written taste/. With the previous
     7	 * `access-control-allow-origin: *` the preflighted case was open too. (Found by the 2026-08-22
     8	 * hostile panel — GPT-5.6 Sol, finding 4.)
     9	 *
    10	 * Rule: a write is trusted when
    11	 *   - the Host header names this server (defeats DNS rebinding: attacker.example → 127.0.0.1), AND
    12	 *   - there is NO Origin header (curl, the CLI, ComfyUI's Python nodes — non-browser callers),
    13	 *     OR the Origin is this server's own page.
    14	 * Everything else is refused. Reads stay open; they write nothing.
    15	 */
    16	export function trustedOrigins(port) {
    17	  return new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
    18	}
    19	
    20	export function trustedHosts(port) {
    21	  return new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    22	}
    23	
    24	/**
    25	 * @param {{ origin?: string, host?: string }} headers  raw request headers (lower-case keys)
    26	 * @param {number} port
    27	 * @returns {{ ok: true } | { ok: false, reason: string }}
    28	 */
    29	export function checkWriteRequest(headers, port) {
    30	  const host = String(headers.host ?? '').trim().toLowerCase();
    31	  if (!trustedHosts(port).has(host)) return { ok: false, reason: 'host header does not name this server' };
    32	  const origin = headers.origin;
    33	  if (origin === undefined || origin === null || origin === '') return { ok: true };
    34	  if (trustedOrigins(port).has(String(origin).trim().toLowerCase())) return { ok: true };
    35	  return { ok: false, reason: 'cross-origin writes are refused' };
    36	}
```

## prompter/lib/corpus.mjs
```
     1	/**
     2	 * Corpus loader — reads the distilled Midlibrary tables.
     3	 * Everything here is KNOWLEDGE (replaceable). Nothing here encodes Sean's taste.
     4	 */
     5	import fs from 'node:fs';
     6	import path from 'node:path';
     7	import { fileURLToPath } from 'node:url';
     8	
     9	const HERE = path.dirname(fileURLToPath(import.meta.url));
    10	export const VAULT = path.resolve(HERE, '../..');
    11	const DIST = path.join(VAULT, 'sources/midlibrary/distilled');
    12	
    13	const readJSON = (f) => {
    14	  const p = path.join(DIST, f);
    15	  if (!fs.existsSync(p)) {
    16	    throw new Error(
    17	      `Corpus file missing: ${p}\n` +
    18	      `The prompter needs the distilled Midlibrary archive. Re-run the scrape, or check the vault path.`
    19	    );
    20	  }
    21	  return JSON.parse(fs.readFileSync(p, 'utf8'));
    22	};
    23	
    24	/** Grammar shapes observed in the real corpus, with their real frequencies.
    25	 *  The generator imitates these rather than inventing prompt structure. */
    26	export const GRAMMAR = [
    27	  { shape: 'descriptive', weight: 1638 },
    28	  { shape: 'by_artist', weight: 1622 },
    29	  { shape: 'fragment', weight: 974 },
    30	  { shape: 'style_of', weight: 38 },
    31	];
    32	
    33	/** Parameter combinations observed in the real corpus, with real frequencies. */
    34	export const PARAM_COMBOS = [
    35	  { params: ['v'], weight: 2191 },
    36	  { params: ['sref'], weight: 680 },
    37	  { params: ['stylize', 'v'], weight: 187 },
    38	  { params: ['niji'], weight: 152 },
    39	  { params: ['style'], weight: 99 },
    40	  { params: ['iw', 'v'], weight: 88 },
    41	  { params: ['style', 'v'], weight: 85 },
    42	  { params: ['chaos', 'v'], weight: 65 },
    43	  { params: ['niji', 'sref'], weight: 54 },
    44	  { params: ['stylize'], weight: 52 },
    45	];
    46	
    47	/**
    48	 * Documentation prose that survived the harvest by *mentioning* a parameter rather than using one
    49	 * — e.g. "To assign different weights to SREF codes, use the following format: --sref <code>::<w>".
    50	 * These are instructions about prompting, not prompts, and as templates they generate nonsense.
    51	 *
    52	 * The angle-bracket test is the strongest single signal: a real prompt never contains a
    53	 * `<placeholder>`. The others catch imperative documentation phrasing.
    54	 */
    55	const isDocProse = (s) =>
    56	  /<[^>]{1,20}>/.test(s)
    57	  || /^(to|use|add|type|try|set|put|write|replace|change|select|click|copy|paste|enter|append)\b/i.test(s)
    58	  || /(following format|as follows|syntax|e\.g\.|i\.e\.|for instance|make sure|be sure|remember to)/i.test(s)
    59	  || /\(subject\)|\(your |\[subject\]/i.test(s)
    60	  // Expository article prose that names no parameter and reads as explanation rather than
    61	  // instruction — "This genre, found in literature, visual arts, and film, encourages viewers to…".
    62	  // Real prompts are terse; explanatory verbs plus length is the reliable tell.
    63	  || /\b(encourages|explores|refers to|is known for|is characterized|describes how|allows you|can be used|is a genre|this genre|this style is|which means)\b/i.test(s)
    64	  || s.split(/\s+/).length > 34;
    65	
    66	/** Optional catalog file: absent on a guides-only install, and everything degrades to []. */
    67	const readOptionalJSON = (f) => {
    68	  const p = path.join(DIST, f);
    69	  if (!fs.existsSync(p)) return null;
    70	  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
    71	};
    72	
    73	export function loadCorpus() {
    74	  const sref = readJSON('sref-codes.json');
    75	  const prompts = readJSON('prompt-corpus.json');
    76	  const vocab = readJSON('style-vocabulary.json');
    77	  const params = readJSON('parameters.json');
    78	
    79	  const usable = prompts.prompts
    80	    // "Sample prompt: <actual prompt>" — keep the prompt, drop the label.
    81	    .map((p) => ({ ...p, prompt: p.prompt.replace(/^Sample prompt:\s*/i, '').replace(/\*\*/g, '').trim() }))
    82	    .filter((p) => !p.is_fragment && !isDocProse(p.prompt) && (p.prompt.match(/,/g) || []).length < 6);
    83	
    84	  // ── catalog merge (2026-08-21) ────────────────────────────────────────────────
    85	  // The 398 artists below were harvested from image CAPTIONS - whoever happened to be named in a
    86	  // curated article. The catalog carries 4,504 actual people. Merging means `by <artist>` draws on
    87	  // the real thing; the caption-derived names stay because a name that appeared in a working
    88	  // prompt is evidence that it WORKS in a prompt, which the catalog alone does not tell us.
    89	  const catalogIndex = readOptionalJSON('catalog-index.json') || [];
    90	  const PERSON = new Set(['painter', 'illustrator', 'photographer', 'sculptor', 'designer',
    91	                          'architect', 'filmmaker', 'street-artist', 'printmaker']);
    92	  // Vouching set is PERSON categories only. The catalog also names techniques and genres
    93	  // ("Asymmetrical composition", "Victorian architecture"), and those are legitimate catalog
    94	  // entries that are nonsense after the word "by". Vouching on membership alone let them through.
    95	  const catalogNames = new Set(
    96	    catalogIndex
    97	      .filter((r) => PERSON.has(r.category))
    98	      .map((r) => String(r.name || '').toLowerCase())
    99	  );
   100	  const catalogPeople = catalogIndex
   101	    .filter((r) => r.kind === 'artistic' && PERSON.has(r.category))
   102	    .map((r) => r.name)
   103	    .filter((n) => n && n.split(/\s+/).length <= 4 && /^[A-Z]/.test(n));
   104	
   105	  // Real prompts published as the OPTIMAL prompt for a style - stronger provenance than a caption.
   106	  const catalogTemplates = (readOptionalJSON('catalog-templates.json') || [])
   107	    .map((t) => ({
   108	      prompt: t.prompt,
   109	      source_doc: 'catalog/' + t.slug,
   110	      source_url: 'https://midlibrary.io/styles/' + t.slug,
   111	      is_fragment: false,
   112	      has_params: /--[a-z]/i.test(t.prompt),
   113	    }))
   114	    .filter((t) => !isDocProse(t.prompt) && t.prompt.split(/\s+/).length >= 3);
   115	
   116	  return {
   117	    catalog: catalogIndex,
   118	    catalogCount: catalogIndex.length,
   119	    sref: sref.codes,
   120	    srefCount: sref.count,
   121	    prompts: [...usable, ...catalogTemplates],
   122	    promptCount: prompts.count + catalogTemplates.length,
   123	    vocab: vocab.map((v) => v.name),
   124	    params: params.map((p) => p.param),
   125	    /**
   126	     * "subject by artist" — the dominant real pattern.
   127	     *
   128	     * Caption-derived names are VALIDATED before use. Harvesting `X by Y` out of captions also
   129	     * catches things that were never people: `by Where`, `by Asymmetrical composition`. Those
   130	     * shipped for weeks and only surfaced when the catalog merge changed which names got sampled -
   131	     * they were always in the pool, just rarely drawn. A junk artist reads as broken AND can trip
   132	     * the avoid-list, so a prompt gets silently dropped for a reason that has nothing to do with
   133	     * taste.
   134	     *
   135	     * A caption name is kept only if the catalog knows it, or it looks like a proper name
   136	     * (two or more capitalised words). The catalog is the authority now that we have one.
   137	     */
   138	    artists: [...new Set([
   139	      ...catalogPeople,
   140	      ...usable
   141	        .map((p) => /^(.+?)\s+by\s+([A-Z][^-]{2,40}?)(?:\s+--|$)/.exec(p.prompt.replace(/\\/g, '')))
   142	        .filter(Boolean)
   143	        .map((m) => m[2].trim())
   144	        .filter((a) => a.split(/\s+/).length <= 4 && /^[A-Z]/.test(a))
   145	        .filter((a) => {
   146	          if (catalogNames.has(a.toLowerCase())) return true;      // the catalog vouches for it
   147	          const w = a.split(/\s+/).filter(Boolean);
   148	          return w.length >= 2 && w.every((x) => /^[A-Z]/.test(x)); // else: looks like a person
   149	        }),
   150	    ])],
   151	  };
   152	}
   153	
   154	/** Parameters whose value is a WORD, not a number — their value must be stripped too, or it
   155	 *  leaks into the subject ("--style raw" previously left a stray "raw" in the prompt text). */
   156	const WORD_VALUED = 'style|no|profile|mode|version';
   157	
   158	/** Strip parameters (and their values) from a prompt, leaving only the subject text. */
   159	export const subjectOf = (prompt) =>
   160	  prompt
   161	    .replace(/\\/g, '')
   162	    .replace(new RegExp(`--(?:${WORD_VALUED})\\s+[a-z]+`, 'gi'), '')
   163	    .replace(/--[a-z]+(\s+[\d.:]+)?/gi, '')
   164	    .replace(/\s+/g, ' ')
   165	    .trim();
   166	
   167	/** Weighted pick from [{weight, ...}] using a supplied RNG. */
   168	export function weightedPick(items, rng) {
   169	  const total = items.reduce((a, b) => a + b.weight, 0);
   170	  let r = rng() * total;
   171	  for (const it of items) { r -= it.weight; if (r <= 0) return it; }
   172	  return items[items.length - 1];
   173	}
```

---

## How to answer

Lead with: **is there a sixth corpus door, and is there a third guard that cannot fire?**
Then a ranked list (P0/P1/P2) with file, function, concrete failing input, and the smallest fix.
Label anything you cannot reproduce SPECULATIVE — twenty defects have already been taken out of this
codebase, so what remains is subtle and a plausible-but-wrong finding now costs more than it saves.

Then **"What I checked and found sound"**, naming the specific attack you tried.

End with **APPROVE / REVISE / REJECT**.
