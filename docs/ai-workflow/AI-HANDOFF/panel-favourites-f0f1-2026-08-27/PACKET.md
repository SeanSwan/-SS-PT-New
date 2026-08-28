# Hostile review packet — Swan Taste Brain, Favourites F0 + F1

You are a hostile reviewer. Your job is to **find what is broken, unproven, or dangerous**, not to
praise. Assume the author is confident and wrong. Every finding must cite a file and a line or a
concrete reproduction. **A finding you cannot reproduce is a hypothesis — label it as one.**

Do not restate the design back to me. Do not summarise. Go straight to defects.

---

## The system in one paragraph

A **local, single-user creative tool** (plain HTML/CSS/vanilla JS + a small Node server on
127.0.0.1, **no build step, no framework, no runtime npm dependency**). The owner judges grids of
photographs to teach it his taste; it then writes image-generation prompts in that taste and queues
them to his own GPU.

**A "memory" is `profile × project`.** Profiles: `sean` (the owner), `partner` (a second person's
own business), `client` (a sales role-play mode).

> **THE GOVERNING LAW: a memory generates ONLY from its own evidence.** The owner subscribes to a
> third-party reference archive (the "corpus"); **only his own memories may draw on it.** This was
> once found broken at six separate layers. Treat it as constitutional.

---

## What was built, and the claims I am making

### F0 — the world epoch

**Claim:** a callback that resolves after the memory has changed can no longer write or render into
the wrong memory.

`Swan.profile` / `Swan.project` became **accessors**; a counter bumps **in the setter**. Async
boundaries capture `Swan.world()` and check `.changed()` on resolution.

**The specific thing I claim the setter placement buys:** the profile-switch handler is
`Swan.profile = X; Swan.project = null; await loadProjects();` and `memoryChanged()` (which notifies
listeners) runs at the **end** of that await. So a counter bumped in `memoryChanged()` would leave a
full network round-trip in which the identity has already changed while every guard still reported
"same world".

**Seven reads are guarded** across five files: Make (batch + workflow bar), Judge (grid + progress
count), Directions (the printed brief), Kept (the list), Status (the queue pill).

**Explicitly NOT guarded:** writes that name the memory in their own request body (they are
addressed at click time). I claim their safety is inherited from the list that rendered the card.

### F1 — favourites: one list, two states

**Claim:** `♥ Save` remembers a prompt and **contributes exactly zero** to generation; `Steer`
(formerly `Keep`) contributes **exactly** what `Keep` always did.

Why this matters: a kept prompt re-enters generation at **score 1000** — the generator's own comment
says *"dominates corpus scores; kept work is the strongest signal there is."* A ♥ wired to that
channel would let a gesture meaning "remember this" silently reweight every future batch.

**Storage decision:** the shelf is a **separate file** (`shelf.md`, `## Shelf`), not a state field
with a generation filter. Generation reads `kept.md`'s `## Kept` and nothing else, so a shelved item
is inert **by absence**. I claim this is stronger than a filter because a filter is a rule every
future code path must remember.

**Sean's memory is asymmetric:** his `shelf.md` is server-writable; his `kept.md` is hand-edited
markdown, so steering goes through a CLI subprocess and demotion is refused with a message.

---

## Where I most expect to be wrong — attack these first

1. **Is the shelf actually unreachable by generation?** Trace every path that reads a memory's
   material. I checked `parseKept`, `ownSubjects`, `tasteFor`, `compileProfile`. **Did I miss one?**
   Anything that globs a memory's directory, or reads "all markdown", would silently include the
   shelf.
2. **`parseKept` finds its section with `/^kept\b/i`.** I claim `## Shelf` cannot match. Is there any
   input — a heading with a BOM, `\r`, a nested list, a code fence containing `## Kept`, a prompt
   whose *text* contains a newline plus `## Kept` — that makes a shelf bullet parse as kept? Note
   `shelveFor` collapses whitespace, but check the file-level reader, not just the writer.
3. **The promote/demote ordering.** `promoteFor` does unshelve → keep, and re-shelves on failure.
   Can a crash or a partial write leave a prompt in **both** lists (double-counted in the pool) or
   **neither** (silently lost)? What about two concurrent requests for the same prompt?
4. **Does the epoch actually close the window I claim?** Attack the setter placement. Is there a
   path that changes the effective memory WITHOUT assigning `Swan.profile`/`Swan.project` — e.g. the
   URL `?profile=` on load, `history.replaceState`, a back/forward navigation, or `loadProjects()`
   mutating the `<select>` without an assignment?
5. **Click-time writes.** I deliberately left these unguarded. Prove me wrong: construct a sequence
   where a favourite/keep/make write lands in the wrong memory, given the epoch now bumps
   synchronously but `onMemory` listeners still fire late.
6. **Sean's CLI path.** The route validates, then shells out to a CLI that also validates. Two
   validators. Do they agree? Can a prompt pass mine and do something different in the CLI's
   `appendKept` (which does a **substring** duplicate check against the whole file, unlike the
   line-exact check everywhere else)?
7. **The corpus law.** `validateSavedPrompt` blocks `--sref` codes and corpus names. Is that
   sufficient for the shelf, given the shelf can be **promoted** into the steering list later? Is
   there corpus material that neither check catches?

---

## Also tell me

- **What did I over-build?** Anything here that is ceremony rather than safety.
- **What is the single highest-severity defect**, and what is your reproduction for it?
- If you believe a claim above is simply **false**, say so plainly and show why.

---

## The code

### THE WORLD EPOCH (F0)  (`prompter/app-shell.js`, lines 19-62)

```js
  /**
   * THE WORLD EPOCH — the temporal guard.
   *
   * Every bug found across the console's five slices was SPATIAL: two representations of one fact
   * disagreeing at rest. None was TEMPORAL — a callback resolving after the memory moved. That
   * class is the dangerous one here, because the governing law is that a memory generates only from
   * its own evidence, and a late callback writes into whichever memory is current when it LANDS,
   * not the one it was launched from.
   *
   * The counter is bumped BY THE ASSIGNMENT ITSELF rather than by memoryChanged(), and that
   * distinction is the whole point. The profile-switch handler reads:
   *
   *     Swan.profile = <new>;  Swan.project = null;  await loadProjects();   // ← notifies at the END
   *
   * so a counter bumped inside memoryChanged() would leave a full network round-trip during which
   * the identity has ALREADY changed while every guard still reported "same world" — precisely the
   * window a guard exists to refuse. Accessors close it: there is no way to change the memory
   * without moving the epoch in the same tick, including from code written later by someone who
   * has never heard of any of this.
   *
   * Assigning the value it already holds does NOT move it. False staleness is a bug too — it would
   * discard good in-flight work every time the owner re-selects the memory he is already in.
   *
   * At any async boundary:
   *     const world = Swan.world();
   *     const d = await Swan.api(...);
   *     if (world.changed()) return;          // the memory moved; this result belongs to nobody
   */
  let epoch = 0;
  let _profile = params.get('profile') || store('swan-taste-profile') || 'sean';
  let _project = params.get('project') || store('swan-taste-project') || 'default';

  const Swan = {
    get profile() { return _profile; },
    set profile(v) { if (v !== _profile) { _profile = v; epoch++; } },
    get project() { return _project; },
    set project(v) { if (v !== _project) { _project = v; epoch++; } },
    get epoch() { return epoch; },
    /** Capture the world at the launch of async work; ask `.changed()` on resolution. */
    world() {
      const at = epoch, label = `${_profile}/${_project}`;
      return { at, label, changed: () => epoch !== at };
    },
    WHO: { sean: 'Sean', partner: 'Partner', client: 'Client' },
```

### THE SHELF STORE (F1)  (`prompter/lib/favourites.mjs`)

```js
/**
 * favourites.mjs — ONE list per memory, TWO states: saved, or saved AND steering.
 *
 * WHY THIS EXISTS (blueprint 2026-08-27, and it is worth restating where the code lives):
 * `Keep` is not a bookmark. A kept prompt re-enters generation at score 1000 — the generator's own
 * words, *"dominates corpus scores; kept work is the strongest signal there is."* Favourites adds a
 * gesture that READS like a bookmark, and wiring a ♥ to that channel would let an action whose plain
 * meaning is "remember this" silently reweight every future batch, forever, with no notification.
 *
 * So the default is SHELF, and the asymmetry is the argument: shelving something that should have
 * steered costs one promote. Steering something that should have been shelved contaminates every
 * batch until somebody happens to notice, and nothing tells them.
 *
 * THE SHELF IS INERT BY ABSENCE, NOT BY FILTER. A shelved prompt lives in `shelf.md` under
 * `## Shelf`; generation reads `kept.md`'s `## Kept` and nothing else. There is no exclusion rule to
 * forget, to invert, or to skip on a path written next year — and a filter is exactly what would
 * fail silently, permanently, and in the direction of harm. `test-favourites.mjs` proves it the only
 * way worth trusting: by generating with a fixed seed before and after, and separately proving the
 * comparison is not vacuous by showing that promotion DOES change the output.
 *
 * ONE CONTRACT, NOT TWO. Every rule a saved prompt must satisfy lives in
 * `taste-namespace.validateSavedPrompt` and governs both halves. This codebase has twice shipped a
 * bug of the shape "two keep channels with two validation contracts", and one of those guards has
 * twice shipped unable to fire — re-typing them here would have re-opened every one.
 *
 * SEAN'S MEMORY. His `kept.md` is CLI-only because it is hand-edited markdown AND because it steers.
 * A shelf has neither property, so `taste/shelf.md` is writable for every memory. PROMOTING in
 * sean/default still refuses here: that writes kept.md, which is the CLI's channel, and the route
 * hands it to the CLI exactly as /api/keep already does.
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseBullets } from './taste.mjs';
import { PROFILES } from './events.mjs';
import { readProject, projectDir, isDefaultNamespace } from './projects.mjs';
import { VAULT } from './corpus.mjs';
import { readKept, keepFor, unkeepFor, validateSavedPrompt } from './taste-namespace.mjs';

const shelfPath = (profile, project) => (isDefaultNamespace(profile, project)
  ? path.join(VAULT, 'taste/shelf.md')
  : path.join(projectDir(profile, project), 'shelf.md'));

/**
 * `## Shelf`, never anything starting with "kept".
 *
 * parseKept() finds its section with /^kept\b/i, so a shelf headed "Kept — shelved" would be read
 * as steering material and the whole guarantee would invert. test-favourites.mjs asserts the shelf
 * file cannot be read by parseKept.
 */
const parseShelf = (md) => parseBullets(md, /^shelf\b/i);

/** sean/default is implicit — it has a memory without having a project record. */
const memoryExists = (profile, project) => isDefaultNamespace(profile, project) || !!readProject(profile, project);

/** READ a memory's shelved prompts. Saved, and steering nothing. */
export function readShelf(profile, project) {
  if (!PROFILES.includes(profile)) return [];
  const p = shelfPath(profile, project);
  return fs.existsSync(p) ? parseShelf(fs.readFileSync(p, 'utf8')) : [];
}

/** ♥ Save — put a prompt on this memory's shelf. The default gesture, and the inert one. */
export function shelveFor(profile, project, prompt) {
  if (!PROFILES.includes(profile)) return { ok: false, error: 'unknown profile' };
  if (!memoryExists(profile, project)) return { ok: false, error: 'unknown project' };
  // Validated on the way IN, not at promotion time. A shelved prompt is a candidate for the steering
  // list, so letting corpus material come to rest here would only move the moment of the breach.
  const v = validateSavedPrompt(prompt);
  if (!v.ok) return v;
  const p = shelfPath(profile, project);
  let md = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : `# Shelf — ${profile}/${project}\n\nSaved. Steers nothing until promoted.\n\n## Shelf\n`;
  if (parseShelf(md).includes(v.text)) return { ok: true, duplicate: true, shelved: parseShelf(md).length };   // line-exact, as keepFor
  if (!/^## Shelf/m.test(md)) md += '\n## Shelf\n';
  // Function replacement, never a string one — `text` is human input, and `$&` / `$1` / `` $` `` /
  // `$'` expand inside a replacement STRING. That mangled kept.md the same way. (round-3, GLM 5.3 #6)
  md = md.replace(/(## Shelf\n)/, (m) => `${m}- ${v.text}\n`);
  fs.writeFileSync(p, md, 'utf8');
  return { ok: true, duplicate: false, shelved: parseShelf(md).length };
}

/** Unsave — off the list entirely. A judgement a human can make is one they must be able to unmake. */
export function unshelveFor(profile, project, prompt) {
  if (!PROFILES.includes(profile)) return { ok: false, error: 'unknown profile' };
  if (!memoryExists(profile, project)) return { ok: false, error: 'unknown project' };
  const p = shelfPath(profile, project);
  if (!fs.existsSync(p)) return { ok: false, error: 'nothing saved yet' };
  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
  const md = fs.readFileSync(p, 'utf8');
  if (!parseShelf(md).includes(text)) return { ok: false, error: "that prompt is not on this memory's shelf" };
  const out = md.split(/\r?\n/).filter((l) => l.replace(/^\s*[-*]\s+/, '').replace(/^`|`$/g, '').trim() !== text).join('\n');
  fs.writeFileSync(p, out, 'utf8');
  return { ok: true, shelved: parseShelf(out).length };
}

/**
 * Promote — shelf → steering. The moment a favourite starts changing what gets generated.
 *
 * Shelf-first ordering is deliberate: unshelve, then keep, and put it back if the keep fails. The
 * reverse order could leave the prompt in BOTH lists, which double-counts it in the generation pool.
 * This way a failure can only ever leave it where it started.
 */
export function promoteFor(profile, project, prompt) {
  if (isDefaultNamespace(profile, project)) return { ok: false, error: 'sean/default steers through the CLI (taste/kept.md)' };
  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (!readShelf(profile, project).includes(text)) return { ok: false, error: "that prompt is not on this memory's shelf" };
  const off = unshelveFor(profile, project, text);
  if (!off.ok) return off;
  const kept = keepFor(profile, project, text);
  if (!kept.ok) { shelveFor(profile, project, text); return kept; }
  return { ok: true, state: 'steer', kept: kept.kept, shelved: off.shelved };
}

/** Demote — steering → shelf. The item stays saved; it simply stops steering. */
export function demoteFor(profile, project, prompt) {
  if (isDefaultNamespace(profile, project)) return { ok: false, error: "Sean's kept list is edited in taste/kept.md" };
  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (!readKept(profile, project).includes(text)) return { ok: false, error: 'that prompt is not steering this memory' };
  const off = unkeepFor(profile, project, text);
  if (!off.ok) return off;
  const on = shelveFor(profile, project, text);
  if (!on.ok) { keepFor(profile, project, text); return on; }
  return { ok: true, state: 'shelf', kept: off.kept, shelved: on.shelved };
}

```

### THE ROUTE (F1)  (`prompter/lib/routes-favourites.mjs`)

```js
/**
 * routes-favourites.mjs — POST /api/favourite: one list, two states, one endpoint.
 *
 * `state` IS the API. 'shelf' saves it and steers nothing, 'steer' makes it a generation exemplar,
 * 'none' removes it. Moving between states is the same call with a different value, so promote and
 * demote need no verbs of their own — and two verbs that could drift apart from save is exactly how
 * the earlier keep channels ended up with two validation contracts.
 *
 * The steer path calls the SAME keepFor()/CLI that /api/keep calls. Two entry points onto one
 * implementation is fine; two implementations is the bug this codebase has already shipped twice.
 *
 * Sean's memory is asymmetric on purpose: his shelf is a new file the server may write, but his
 * kept.md is markdown he edits himself, so steering goes through the CLI and demotion is refused
 * with an instruction rather than a control that silently does nothing.
 */
import { DEFAULT_PROFILE, DEFAULT_PROJECT, PROFILES, isProjectId } from './events.mjs';
import { loadTaste } from './taste.mjs';
import { readKept, keepFor, unkeepFor, validateSavedPrompt } from './taste-namespace.mjs';
import { readShelf, shelveFor, unshelveFor, promoteFor, demoteFor } from './favourites.mjs';

/**
 * @param cli  the server's CLI delegate — Sean's kept.md has exactly one writer and this is not it.
 */
export async function handleFavouriteRoutes({ url, req, res, json, readBody, cli }) {
  if (url.pathname !== '/api/favourite' || req.method !== 'POST') return false;

  const body = await readBody(req);
  const profile = body.profileId ?? DEFAULT_PROFILE;
  const project = body.projectId ?? DEFAULT_PROJECT;
  if (!PROFILES.includes(profile) || !isProjectId(project)) {
    json(res, 400, { error: 'profileId/projectId must name a memory (slugs only)' });
    return true;
  }
  const state = String(body.state ?? 'shelf');
  if (!['shelf', 'steer', 'none'].includes(state)) {
    json(res, 400, { error: "state must be 'shelf', 'steer' or 'none'" });
    return true;
  }

  const text = String(body.prompt ?? '').replace(/\s+/g, ' ').trim();
  const isSean = profile === DEFAULT_PROFILE && project === DEFAULT_PROJECT;
  const onShelf = readShelf(profile, project).includes(text);
  const steering = (isSean ? loadTaste().kept : readKept(profile, project)).includes(text);
  const send = (r, extra = {}) => { json(res, r.ok ? 200 : 400, r.ok ? { ...r, ...extra } : r); return true; };

  if (state === 'shelf') {
    if (steering) {
      // Saying what he must do beats a button that appears to work and does not.
      if (isSean) { json(res, 400, { error: "Sean's steering list is edited in taste/kept.md — move the line to shelf.md" }); return true; }
      return send(demoteFor(profile, project, text), { message: 'Demoted. Still saved, no longer steering.' });
    }
    const r = shelveFor(profile, project, text);
    return send(r, { state: 'shelf', message: r.duplicate ? 'Already saved.' : `Saved. ${r.shelved} on the shelf — steering nothing.` });
  }

  if (state === 'steer') {
    if (steering) { json(res, 200, { ok: true, state: 'steer', duplicate: true, message: 'Already steering.' }); return true; }
    if (isSean) {
      // Validated BEFORE the CLI, so his channel refuses exactly what hers refuses rather than
      // inheriting only whatever the CLI happens to check on its own.
      const v = validateSavedPrompt(text);
      if (!v.ok) { json(res, 400, v); return true; }
      if (onShelf) unshelveFor(profile, project, text);
      json(res, 200, { ok: true, state: 'steer', message: cli(['--keep', v.text]) });
      return true;
    }
    const r = onShelf ? promoteFor(profile, project, text) : keepFor(profile, project, text);
    return send(r, { state: 'steer', message: `Steering. ${r.kept} exemplar${r.kept === 1 ? '' : 's'} now shaping ${profile}/${project}.` });
  }

  if (steering) {
    if (isSean) { json(res, 400, { error: "Sean's steering list is edited in taste/kept.md" }); return true; }
    return send(unkeepFor(profile, project, text), { state: 'none', message: 'Removed. It no longer steers.' });
  }
  return send(unshelveFor(profile, project, text), { state: 'none', message: 'Removed.' });
}

```

### validateSavedPrompt — the ONE contract both lists share  (`prompter/lib/taste-namespace.mjs`, lines 158-183)

```js
/**
 * Every rule a saved prompt must satisfy, in ONE place — returns `{ ok, text }` or `{ ok:false, error }`.
 *
 * Extracted when Favourites added a shelf. The rules below were written for kept.md across four
 * separate panel rounds, and each one is a bug that actually shipped. Re-typing them for a second
 * list would have re-opened every one of them: this codebase has already shipped "two keep channels
 * must not have two validation contracts" twice, and one of these guards has twice shipped *unable
 * to fire*. A shelved prompt is a candidate for promotion into the steering list, so it must clear
 * the same bar on the way IN; checking only at promotion time would let corpus material come to rest
 * in a partner's files and merely move the moment of the breach.
 */
export function validateSavedPrompt(prompt) {
  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (text.split(' ').length < 3) return { ok: false, error: 'prompt must be at least 3 words' };
  if (text.length > 2000) return { ok: false, error: 'prompt must be ≤ 2000 chars' };   // same discipline as validateEvent's MAX_STR (panel round 2)
  // Anchored with (^|\s), not \s. Requiring whitespace BEFORE the flag meant a prompt that STARTED
  // with it walked straight through — '--sref 123456 calm ocean dawn' was accepted and stored.
  // (round-4 panel, Ox Alpha P1 — reproduced.)
  if (/(^|\s)--sref\b/i.test(text)) return { ok: false, error: 'a saved prompt may not carry a --sref style code' };
  // A style code is not the only way corpus material rides in: "ocean at dawn, as shot for
  // midlibrary.io, by Annie Leibovitz" carried neither a code nor a provenance.
  // (round-7 panel, GLM 5.3 P2)
  if (CORPUS_MARKER.test(text)) return { ok: false, error: 'a saved prompt may not name the corpus' };
  return { ok: true, text };
}

```

### parseKept + parseBullets — how generation finds its section  (`prompter/lib/taste.mjs`, lines 50-80)

```js
/**
 * Kept prompts from kept.md — ONLY the bullets under `## Kept`. The file also holds `## Killed`
 * (prompts that disappointed) and `## How to add` (an example bullet); reading every bullet in the
 * file once meant a killed prompt would re-enter generation as an exemplar. Exported for testing.
 */
export function parseKept(keptMd) {
  return parseBullets(keptMd, /^kept\b/i);
}

/**
 * The bullet-reading rules, in one place, so a second list cannot grow a second dialect.
 *
 * Favourites added a shelf, and the obvious way to read it was a second copy of the loop below.
 * This codebase has twice shipped a bug of exactly that shape — two keep channels that had drifted
 * into two validation contracts — so the loop is shared and the heading is the only difference.
 *
 * The heading match matters more than it looks: a shelf section headed anything starting with
 * "kept" would be read as steering material by parseKept above. `test-favourites.mjs` asserts the
 * shelf file cannot be read that way. Exported for testing.
 */
export function parseBullets(md, headingRe) {
  const sec = String(md || '').split(/^##\s+/m).find((s) => headingRe.test(s));
  if (!sec) return [];
  return sec.split('\n').slice(1)
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s+/, '').replace(/^`|`$/g, '').trim())
    .filter((l) => l && !/^\(/.test(l));
}

export function loadTaste() {
  const themesMd = read('themes.md');
```

### The Make card + its actions (F1 UI)  (`prompter/app-make.js`, lines 12-75)

```js
  function card(p) {
    const Swan = S();
    const node = document.createElement('div');
    node.className = 'card';
    const style = p.kind === 'video' ? p.camera : p.styleName ? p.styleName : (p.sref ? 'unnamed code' : '—');
    const tag = p.kind === 'video' ? '<span class="tag new">video — a shot, not a still</span>'
      : p.rating ? `<span class="tag rated">endorsed ${p.rating}/5</span>` : p.isNew ? '<span class="tag new">NEW — judge it</span>' : '';
    const rate = Swan.profile === 'sean' && Swan.project === 'default' && p.sref ? '<button data-act="rate5">★ 5</button><button data-act="rate1">1</button>' : '';
    node.innerHTML =
      `<div class="p"></div>
       <div class="meta">
         <span class="tag">${p.grammar}</span><span class="tag">${Swan.esc(style)}</span>${tag}
         <span class="row-actions">
           <button data-act="make" class="primary" title="Queue one render in ComfyUI using your own workflow">Make</button>
           <button data-act="make4" class="primary" title="Queue four seed variations — a grid to judge">Make 4</button>
           <button data-act="save" title="Save this prompt to your favourites. It is remembered and changes nothing about what gets generated.">♥ Save</button>
           <button data-act="steer" title="Save it AND teach the brain with it — a steering prompt re-enters generation as an exemplar and shapes every future batch.">Steer</button>
           <button data-act="copy">Copy</button>
           <button data-act="comfy" title="Register the prompt and copy a SaveImage prefix to wire by hand">Prefix</button>${rate}
         </span>
       </div>`;
    node.querySelector('.p').textContent = p.prompt;      // prompt text is data, never markup
    node.addEventListener('click', (e) => act(e.target?.dataset?.act, p));
    return node;
  }

  async function act(a, p) {
    const Swan = S();
    if (!a) return;
    if (a === 'copy') return Swan.copy(p.prompt);
    // ♥ Save and Steer are the SAME endpoint with a different state, because they are one list with
    // two states. `Keep` was relabelled `Steer` here: it always did the powerful thing — a kept
    // prompt re-enters generation at score 1000 — and next to a heart that only remembers, a button
    // labelled "Keep" would have been the quieter word for the stronger action. The pair now
    // explains itself: Save files it, Steer teaches with it.
    if (a === 'save' || a === 'steer') {
      const r = await Swan.post('/api/favourite', { prompt: p.prompt, state: a === 'steer' ? 'steer' : 'shelf', profileId: Swan.profile, projectId: Swan.project });
      Swan.say(r.ok ? r.message : r.error);
      return Swan.refreshKept?.();
    }
    if (a === 'make' || a === 'make4') {
      const count = a === 'make4' ? 4 : 1;
      Swan.say(count > 1 ? `queueing ${count} variations in ComfyUI…` : 'queueing in ComfyUI…');
      const r = await Swan.post('/api/make', { profileId: Swan.profile, projectId: Swan.project, prompts: [{ prompt: p.prompt, sref: p.sref ?? undefined }], count });
      const first = r.results?.[0];
      if (!r.ok) return Swan.say(`not queued: ${(first?.errors || [r.error || r.hint || 'unknown']).join('; ')}${r.hint ? ` — ${r.hint}` : ''}`);
      const seeds = r.results.filter((x) => x.ok).map((x) => x.seed).join(', ');
      Swan.say(r.queued > 1
        ? `queued <b>${r.queued}</b> variations in ComfyUI${r.failed ? ` (${r.failed} refused)` : ''} · seeds ${seeds} · <a class="link" data-tab="judge" href="#judge">judge them →</a>`
        : `queued in ComfyUI as <b>${first.prefix}</b>${first.duplicate ? ' (already registered)' : ''} · seed ${first.seed} · <a class="link" data-tab="judge" href="#judge">judge it →</a>`);
      return status();
    }
    if (a === 'comfy') {
      const r = await Swan.post('/api/intent', { profileId: Swan.profile, projectId: Swan.project, prompt: p.prompt, seed: p.seed ?? undefined, sref: p.sref ?? undefined });
      if (!r.ok) return Swan.say(`not registered: ${(r.errors || [r.error]).join('; ')}`);
      // The prefix is the thing the user must paste into SaveImage, so whether it reached the
      // clipboard is load-bearing. This used to swallow the failure and report "copied" anyway.
      const copied = await Swan.copy(r.prefix, '');
      return Swan.say(`ComfyUI prefix <b>${r.prefix}</b>${r.duplicate ? ' (already registered)' : ''} — ${copied ? 'copied' : '<b>NOT copied</b>, copy it from here'}; wire it into SaveImage.filename_prefix`);
    }
    const r = await S().post('/api/rate', { code: p.sref, rating: a === 'rate5' ? 5 : 1, note: 'rated from the page' });
    S().say(r.ok ? r.message : r.error);
  }

```

### Judge — two of the seven guarded reads  (`prompter/app-judge.js`, lines 17-50)

```js
  async function progress() {
    const Swan = S();
    // Guarded for the same reason load() is, and missed on the first pass because a guard elsewhere
    // in this file satisfied a file-level check. This number decides whether a direction is worth
    // trusting yet ("N of M grids recorded"); landing late puts the previous memory's count beside
    // the new memory's grid, which is a worse lie than showing nothing. (F0, 2026-08-27)
    const world = Swan.world();
    const r = await fetch(`/api/profile?${Swan.qs()}`);
    if (world.changed()) return '';
    if (!r.ok) return '';
    const g = (await r.json()).progress;
    return g.done ? ` · <b>${g.grids}</b> grids recorded (floor ${g.gridsTarget} met) · <b>${g.judgements}</b> judgements · <b>enough for a direction</b>`
      : ` · <b>${g.grids}</b> of ${g.gridsTarget} grids recorded · <b>${g.judgements}</b> judgements`;
  }

  async function load(useSeed) {
    const Swan = S();
    if (!Swan.project) { el('grid').innerHTML = ''; return note('create a project first — the memory starts empty'); }
    el('pool').value = pool;
    note('loading…'); el('result').textContent = '';
    // Same stale-response race as the Make tab: onMemory() resets `last` and `judge` but cancels
    // nothing, so a grid fetched for one memory could bind to the judge after the operator switched,
    // and the recording would be attributed to the memory now selected. The server's provenance
    // allowlist stops that becoming a CORPUS leak, but it is still one memory's judgement recorded
    // in another's, which is the thing the whole namespace design exists to prevent.
    // (round-5 panel, GLM 5.3 P1)
    //
    // Uses the shell's shared epoch guard rather than the string compare this started as. Two
    // copies of one guard drift; the compare was also strictly weaker, since a memory that changed
    // and changed BACK mid-fetch reads as "same world" by name and is not.
    const world = Swan.world();
    const r = await fetch(`/api/probe?${Swan.qs(pool ? '&pool=renders' : '')}` + (useSeed != null ? `&seed=${useSeed}` : ''));
    const j = await r.json();
    if (world.changed()) return note('memory changed while loading — discarded that grid. Press Next grid.');
```
