---
decision: "Make the Swan Taste Brain explain itself and arm itself: auto-capture the ComfyUI graph with no CLI step, put judging where it can be started in one click, label every control, and teach the page to explain what it is."
status: open
board: SWA-186
date: 2026-08-26
privacy: IDs and roles only. No names, no keys, no PII.
---

# Swan Taste Brain — make it explain itself and arm itself

## What happened (the trigger)

Sean clicked **Make** and got:

> `not queued: no captured workflow yet — run your workflow once in ComfyUI, then: node prompter/capture-workflow.mjs`

His words:

> "We need to make this so it's automatic. I should be able to just click the Make. It should kinda do
> this in the background and make sure it's done versus trying to have me do it."

And, on the same screen:

> "I need the option to be able to [start] the tasting — they let me see all the pictures, and then I
> got to choose. But that should be right there in the options at the top. I should easily be able to
> see that. And from there I need to be able to just click it to start it up, and that should actually
> work as you continuously boost the shot's taste while I'm loading. And then on top of that, the
> different text bars need to be labeled for what they do. The page [needs] to explain itself a little
> bit more."

## Measured ground truth (probed on this machine, now)

| Probe | Result |
|---|---|
| `GET /prompt` (queue) | `{"exec_info":{"queue_remaining":0}}` — **ComfyUI is up** |
| `GET /history` | `{}` — **empty**; nothing has been run this session |
| `GET /userdata?dir=workflows` | **two saved workflows**: `00 SWAN — H3 local (start here).json`, `01 SWAN — H3 local + first frame.json` |
| `GET /object_info` | **200** — the node-definition catalogue is available |

The existing design note says capture "cannot be done for you ahead of time" because ComfyUI keeps
history in memory. That is true of **history** — and it is exactly why the error appears on a fresh
ComfyUI. But it was never the whole picture: **the saved workflows are on disk and reachable**, and
`/object_info` is what a UI→API conversion needs. So "you must run it once first" is a property of the
capture *strategy*, not of ComfyUI.

## The four changes

### 1. Make arms itself — no CLI step, ever

Today `/api/make` refuses with a shell command. Proposed, in order, all server-side:

1. **Template present** → queue, as now.
2. **No template, history has a run** → capture it silently, then queue. Zero clicks.
3. **No template, history empty** → **hold the prompt as a pending intent, start a background watcher,
   and say so in the page**: *"ComfyUI hasn't run anything yet this session. Open `00 SWAN — H3 local
   (start here)` and hit Run once — I'll capture it and queue this prompt automatically."* The moment
   the watcher sees a run, it captures **and queues the held prompt**. Sean never returns to a
   terminal, and the message names the workflow he actually has rather than a command.
4. **Optional, gated:** offer to build the template from a saved workflow by converting UI→API using
   `/object_info`. **Never silently** — see the risk below.

### 2. Judging is one click from the top

Judging already exists as a tab. Sean's ask is that starting a tasting round is visible in the top
options and takes one click. Proposed: a persistent **"Taste pictures"** control in the memory bar
that starts a grid immediately, and — because a Make batch takes real time on a 5090 — the Make tab
offers judging **while a render is queued**, so the wait is spent sharpening the memory that will
steer the next batch. That is the "continuously boosting the taste while I'm loading" he described.

### 3. Every control is labelled

The Make row is currently five bare controls: `Video ▾`, `Taste-steered ▾`, `5`, `16:9 ▾`, a checkbox.
Each gets a visible label and a one-line title: medium, how the prompt is steered, how many, aspect
ratio, and cinematic-only.

### 4. The page explains itself

A short, permanent explainer at the top of each tab — what this tab is for and what the next action
is — plus honest empty states. The tool currently assumes the reader already knows the loop.

## The risk that needs the panel

**UI→API conversion is the dangerous part.** A wrong conversion means Make queues a graph that is not
Sean's, while telling him it is. This repo already has a law about exactly that failure — two earlier
proofs pointed at the real `comfy-workflow.local.json` and the app then told him a test fixture was his
captured graph. The conversion has to handle reroutes, muted/bypassed nodes, primitive nodes,
widget-to-input conversions and link ordering, and a subtle error is silent.

Questions for the panel:

1. Should step 4 (UI→API conversion) exist at all, or is auto-capture-on-first-run (steps 2–3) the
   right ceiling? What would make a converted graph **provably** Sean's before it is ever queued?
2. Is holding a pending intent and auto-queueing it later safe? What happens if the memory changes,
   the server restarts, or two prompts are held? (Note: a stale-response race between memories was a
   real defect fixed earlier today.)
3. A server-side background watcher polls ComfyUI. What is the failure mode when ComfyUI restarts,
   the drive unmounts, or the watcher outlives the page?
4. Does starting a judging grid from the Make tab risk recording a judgement against the wrong memory?
   The memory bar is shared, and that exact class of bug was fixed earlier today.
5. Anything in 2–4 that would break the corpus containment laws hardened across rounds 3–7 — in
   particular, judging surfaced from a new place, and any new text the page prints.

## Constraints that do not move

- The corpus is Sean's: never a partner memory, a client memory, a bundle, or a printed brief.
- One memory = `profile × project`; a witness writes only its own memory.
- Loopback only, Host-gated, unauthenticated by design. The graph is never POSTed off-machine.
- Tests never write the real `comfy-workflow.local.json` (`SWAN_COMFY_WORKFLOW` isolates every proof).
- 499 checks across 10 suites must stay green, and anything new needs a check that fails without it.

---

# THE CODE THIS PLAN TOUCHES

## prompter/lib/routes-make.mjs
```
     1	/**
     2	 * routes-make.mjs — "Make": queue renders in ComfyUI from one memory's prompts, in one click.
     3	 *
     4	 *   POST /api/make  { profileId, projectId, prompts: [{prompt, seed?, sref?}, …], count? }  (a WRITE: gated)
     5	 *                   one prompt + count:4 → four seed variations, four tokens, four judgeable renders
     6	 *   GET  /api/make/status?profile=&project=                                          what is queued / captured / reachable
     7	 *
     8	 * For each prompt: mint the intent (content-hash token, existing law) → substitute prompt + seed + prefix
     9	 * into SEAN'S OWN captured graph (lib/workflow.mjs proves nothing else moved) → POST it to ComfyUI's
    10	 * /prompt. ComfyUI saves as swan/<token>_00001_.…, so the render is already bound to that memory and the
    11	 * existing scan finds it. If the graph is not captured, or ComfyUI is not running, we say so — no guessing.
    12	 */
    13	import { namespaceFrom } from './routes-modes.mjs';
    14	import { mintIntent, listRenders, readIntents } from './renders.mjs';
    15	import { comfyApi, readTemplate, describe, applyTo, MAX_BATCH } from './workflow.mjs';
    16	
    17	const TIMEOUT = 20000;
    18	
    19	async function comfyPost(api, graph, clientId) {
    20	  const r = await fetch(`${api}/prompt`, {
    21	    method: 'POST', headers: { 'content-type': 'application/json' },
    22	    body: JSON.stringify({ prompt: graph, client_id: clientId }), signal: AbortSignal.timeout(TIMEOUT),
    23	    // comfyApi() validates that the INITIAL url is loopback, but fetch defaults to
    24	    // redirect:'follow' — so whatever answers on that port (a misconfigured port, a dev server, a
    25	    // compromised ComfyUI plugin) could reply `302 Location: https://attacker.example/prompt` and
    26	    // fetch would re-issue the POST, carrying Sean's entire captured graph off the machine. The
    27	    // invariant is that a graph is never posted anywhere but this host; 'error' is what enforces it.
    28	    // (round-3 panel, Ox Alpha P2)
    29	    redirect: 'error',
    30	  });
    31	  const body = await r.json().catch(() => ({}));
    32	  if (!r.ok) return { ok: false, error: body?.error?.message || `ComfyUI HTTP ${r.status}`, nodeErrors: body?.node_errors ?? null };
    33	  return { ok: true, promptId: body.prompt_id ?? null, number: body.number ?? null };
    34	}
    35	
    36	/** Everything the page needs to decide what to show, in one read. */
    37	export async function makeStatus({ profile, project }) {
    38	  const api = comfyApi();
    39	  const t = readTemplate();
    40	  const d = describe(t);
    41	  const out = {
    42	    profileId: profile, projectId: project, api,
    43	    workflow: t ? { captured: true, ready: d.ok, capturedAt: d.capturedAt, nodes: d.nodes, classes: d.classes, steers: d.steers, reason: d.reason }
    44	      : { captured: false, ready: false, reason: 'no workflow captured yet — run your workflow once in ComfyUI, then: node prompter/capture-workflow.mjs' },
    45	    comfy: { reachable: false, queue: null, reason: api ? null : 'ComfyUI endpoint must be loopback' },
    46	  };
    47	  // A graph can carry more than one independent seed literal (a base KSampler plus a refiner's
    48	  // `noise_seed` is the common shape). applyTo sets EVERY detected seed field to the same value, so
    49	  // two seeds Sean tunes apart move in lockstep — and the drift proof cannot see it, because both
    50	  // paths are inside the allowed field map by construction. Behaviour is deliberately left alone:
    51	  // no graph is captured yet, and silently substituting only the first seed would change which
    52	  // renders come out, guessed rather than measured. So the status TELLS the truth instead, and the
    53	  // page can show it before Sean trusts a batch. (round-3 panel, Ox Alpha P2 — GLM raised the same
    54	  // class for multiple positive prompt fields, which this count also surfaces.)
    55	  if (t && d.ok) {
    56	    const seedNodes = new Set((d.fields?.seed ?? []).map((f) => f.id)).size;
    57	    const textNodes = new Set((d.fields?.text ?? []).map((f) => f.id)).size;
    58	    out.workflow.seedFields = seedNodes;
    59	    out.workflow.textFields = textNodes;
    60	    const notes = [];
    61	    if (seedNodes > 1) notes.push(`this graph has ${seedNodes} independent seed fields — Make sets all of them to the same seed`);
    62	    if (textNodes > 1) notes.push(`this graph has ${textNodes} positive prompt fields — Make writes the same prompt into all of them`);
    63	    if (notes.length) out.workflow.notes = notes;
    64	  }
    65	  if (api) {
    66	    try {
    67	      const r = await fetch(`${api}/prompt`, { signal: AbortSignal.timeout(4000) });   // GET /prompt = queue info
    68	      if (r.ok) { const q = await r.json(); out.comfy = { reachable: true, queue: q.exec_info?.queue_remaining ?? null, reason: null }; }
    69	      else out.comfy.reason = `ComfyUI HTTP ${r.status}`;
    70	    } catch (err) { out.comfy.reason = `ComfyUI not reachable at ${api} — start it (Swan Local Video 5090.cmd)`; }
    71	  }
    72	  const lr = listRenders(profile, project);
    73	  const intents = readIntents(profile, project);
    74	  const have = new Set(lr.renders.map((r) => r.token));
    75	  out.renders = { files: lr.renders.length, intents: intents.length, waiting: intents.filter((i) => !have.has(i.token)).length, available: lr.available !== false, reason: lr.reason ?? null };
    76	  return out;
    77	}
    78	
    79	export async function handleMakeRoutes({ url, req, res, json, readBody }) {
    80	  const p = url.pathname;
    81	  if (p === '/api/make/status' && req.method === 'GET') {
    82	    const ns = namespaceFrom(url);
    83	    if (ns.error) { json(res, 400, { error: ns.error }); return true; }
    84	    json(res, 200, await makeStatus(ns));
    85	    return true;
    86	  }
    87	  if (p === '/api/make' && req.method === 'POST') {
    88	    const body = await readBody(req);
    89	    const api = comfyApi();
    90	    const template = readTemplate();
    91	    const d = describe(template);
    92	    if (!api) { json(res, 400, { error: 'ComfyUI endpoint must be loopback' }); return true; }
    93	    if (!d.ok) { json(res, 409, { error: d.reason || 'no workflow captured yet', hint: 'run your workflow once in ComfyUI, then: node prompter/capture-workflow.mjs' }); return true; }
    94	    // "Make 4" = one prompt, `count` seeds. Expanding here (not in the page) keeps one batch law in one place:
    95	    // every variation is its own intent, its own token, its own file — so each can be judged and undone alone.
    96	    let list = Array.isArray(body?.prompts) ? body.prompts : [];
    97	    const count = Number.isInteger(body?.count) ? Math.min(Math.max(body.count, 1), MAX_BATCH) : 1;
    98	    if (list.length === 1 && count > 1) {
    99	      const base = list[0];
   100	      // Seeds are derived from the caller's seed when given (reproducible: seed, seed+1, …), random otherwise.
   101	      list = Array.from({ length: count }, (_, i) => ({ ...base, seed: Number.isInteger(base?.seed) ? (base.seed + i) >>> 0 : undefined }));
   102	    }
   103	    list = list.slice(0, MAX_BATCH);
   104	    if (!list.length) { json(res, 400, { error: `prompts must be a non-empty array (max ${MAX_BATCH})` }); return true; }
   105	    const results = [];
   106	    for (const item of list) {
   107	      const seed = Number.isInteger(item?.seed) ? item.seed : Math.floor(Math.random() * 2 ** 31);
   108	      const mint = mintIntent({ profileId: body.profileId, projectId: body.projectId, prompt: item?.prompt, seed, sref: item?.sref });
   109	      if (!mint.ok) { results.push({ ok: false, prompt: String(item?.prompt ?? '').slice(0, 80), errors: mint.errors }); continue; }
   110	      const built = applyTo(template, { prompt: mint.intent.prompt, seed, prefix: mint.prefix });
   111	      if (!built.ok) { results.push({ ok: false, token: mint.token, errors: built.errors }); continue; }
   112	      const posted = await comfyPost(api, built.graph, `swan-${mint.token}`).catch((err) => ({ ok: false, error: String(err.message) }));
   113	      results.push(posted.ok
   114	        ? { ok: true, token: mint.token, prefix: mint.prefix, seed, promptId: posted.promptId, duplicate: mint.duplicate, changed: built.changed }
   115	        : { ok: false, token: mint.token, errors: [posted.error], nodeErrors: posted.nodeErrors ?? null });
   116	    }
   117	    const queued = results.filter((r) => r.ok).length;
   118	    json(res, queued ? 200 : 502, { ok: queued > 0, queued, failed: results.length - queued, results });
   119	    return true;
   120	  }
   121	  return false;
   122	}
```

## prompter/lib/workflow.mjs
```
     1	/**
     2	 * workflow.mjs — Sean's own ComfyUI graph, reused verbatim except for three fields.
     3	 *
     4	 * WHY (Sean 2026-08-25, P2 v2 "Make"): the loop is only click-click-click if the brain can queue a render.
     5	 * But the brain must NEVER invent a graph — models, LoRAs, resolutions, samplers and paths are Sean's, tuned
     6	 * on the 5090, and a generated graph would render something he did not ask for. So:
     7	 *
     8	 *   · the TEMPLATE is captured from ComfyUI's own `/history` — the exact API-format graph it last RAN
     9	 *     (prompter/capture-workflow.mjs). Nothing is authored here.
    10	 *   · exactly THREE things are substituted: the prompt text, the seed, and the save prefix (swan/<token>).
    11	 *     `applyTo` proves it: it diffs its own output against the template and refuses if anything else moved.
    12	 *   · the ComfyUI endpoint is loopback-only, from config — never from a request (no SSRF surface).
    13	 *
    14	 * A template that cannot be captured is stated, never guessed: `describe()` says exactly which field is
    15	 * missing so the page can tell Sean what to do.
    16	 */
    17	import fs from 'node:fs';
    18	import path from 'node:path';
    19	import { VAULT } from './corpus.mjs';
    20	
    21	/**
    22	 * Where the captured graph lives. `SWAN_COMFY_WORKFLOW` overrides it so tests and browser proofs never
    23	 * touch Sean's real template: two proofs writing a stand-in to the production path handed each other a
    24	 * FAKE graph — each "restored" what it found, both checks passed, and the page then told Sean his workflow
    25	 * was captured when it was a test fixture. A proof must not be able to lie to the app it is proving.
    26	 */
    27	export const TEMPLATE_PATH = process.env.SWAN_COMFY_WORKFLOW || path.join(VAULT, 'prompter', 'comfy-workflow.local.json');
    28	export const REAL_TEMPLATE_PATH = path.join(VAULT, 'prompter', 'comfy-workflow.local.json');
    29	const CONFIG_PATH = path.join(VAULT, 'prompter', 'comfy.local.json');
    30	export const MAX_BATCH = 8;
    31	/** Fields we know how to steer, in priority order. Anything else in the graph is Sean's and untouched. */
    32	const TEXT_KEYS = ['prompt', 'text', 'positive_prompt'];
    33	const SEED_KEYS = ['seed', 'noise_seed'];
    34	const PREFIX_KEYS = ['filename_prefix'];
    35	const NEGATIVE = /negative/i;
    36	
    37	export function comfyApi() {
    38	  const fromEnv = process.env.SWAN_COMFY_API;
    39	  let url = fromEnv;
    40	  if (!url && fs.existsSync(CONFIG_PATH)) { try { url = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')).api; } catch { /* ignore */ } }
    41	  url = url || 'http://127.0.0.1:8188';
    42	  // Loopback only: this server never posts a graph anywhere but the machine it runs on.
    43	  try { const u = new URL(url); if (!['127.0.0.1', 'localhost', '[::1]'].includes(u.hostname)) return null; return u.origin; } catch { return null; }
    44	}
    45	
    46	/** Resolved at CALL time, not import time, so a suite can redirect itself before its first write. */
    47	export const currentTemplatePath = () => process.env.SWAN_COMFY_WORKFLOW || REAL_TEMPLATE_PATH;
    48	const templatePath = currentTemplatePath;
    49	export const hasTemplate = () => fs.existsSync(templatePath());
    50	export function readTemplate() {
    51	  if (!hasTemplate()) return null;
    52	  try { return JSON.parse(fs.readFileSync(templatePath(), 'utf8')); } catch { return null; }
    53	}
    54	export function writeTemplate(t) {
    55	  const p = templatePath();
    56	  fs.mkdirSync(path.dirname(p), { recursive: true });
    57	  fs.writeFileSync(p, JSON.stringify(t, null, 1) + '\n', 'utf8');
    58	  return p;
    59	}
    60	
    61	/**
    62	 * Find the steerable fields in an API-format graph ({ "<id>": { class_type, inputs } }).
    63	 *
    64	 * Deterministic and conservative:
    65	 *   · a wired input (an array value) is never a literal we may set;
    66	 *   · the POSITIVE prompt is identified by WIRING first — whatever a sampler's `positive` input points at
    67	 *     is the prompt node. Wiring is ground truth; key names are a fallback. (Found by this file's own test:
    68	 *     a graph can hold an orphan `CLIPTextEncode` full of "blurry, watermark, low quality" whose key is
    69	 *     plain `text` and whose class name says nothing — steering it would overwrite Sean's negative prompt.)
    70	 *   · anything a `negative` input points at, or whose key/class says negative, is excluded outright;
    71	 *   · when nothing is wired as positive, prefer a literal `prompt` key, else the single longest text — and
    72	 *     never more than that one, because a second guess is a second thing quietly rewritten.
    73	 * `textCandidates` lists every literal text field so the CLI can show what was NOT steered.
    74	 */
    75	export function detectFields(graph) {
    76	  const nodes = Object.entries(graph || {});
    77	  const referenced = (re) => {
    78	    const ids = new Set();
    79	    for (const [, node] of nodes) for (const [k, v] of Object.entries(node?.inputs || {})) if (re.test(k) && Array.isArray(v) && v[0] != null) ids.add(String(v[0]));
    80	    return ids;
    81	  };
    82	  const positiveIds = referenced(/positive/i);
    83	  const negativeIds = referenced(/negative/i);
    84	  const seed = [], prefix = [], candidates = [];
    85	  for (const [id, node] of nodes) {
    86	    const inputs = node?.inputs || {};
    87	    for (const [k, v] of Object.entries(inputs)) {
    88	      if (Array.isArray(v)) continue;
    89	      if (TEXT_KEYS.includes(k) && typeof v === 'string') {
    90	        const isNegative = negativeIds.has(id) || NEGATIVE.test(k) || NEGATIVE.test(node.class_type || '');
    91	        candidates.push({ id, key: k, classType: node.class_type, sample: v.slice(0, 120), length: v.length, positive: positiveIds.has(id), negative: isNegative });
    92	      } else if (SEED_KEYS.includes(k) && typeof v === 'number') seed.push({ id, key: k, classType: node.class_type });
    93	      else if (PREFIX_KEYS.includes(k) && typeof v === 'string') prefix.push({ id, key: k, classType: node.class_type, sample: v });
    94	    }
    95	  }
    96	  const usable = candidates.filter((c) => !c.negative);
    97	  const wired = usable.filter((c) => c.positive);
    98	  const named = usable.filter((c) => c.key === 'prompt');
    99	  const text = wired.length ? wired : named.length ? named : usable.sort((a, b) => b.length - a.length).slice(0, 1);
   100	  return { text: text.map(({ id, key, classType, sample }) => ({ id, key, classType, sample })), seed, prefix, textCandidates: candidates };
   101	}
   102	
   103	/** What a template can and cannot do, in words the page can show. */
   104	export function describe(template = readTemplate()) {
   105	  if (!template?.graph) return { ok: false, reason: 'no captured workflow yet', fields: null };
   106	  const f = template.fields || detectFields(template.graph);
   107	  const missing = [];
   108	  if (!f.text.length) missing.push('a prompt field (no node has a literal `prompt`/`text` input)');
   109	  if (!f.prefix.length) missing.push('a save prefix (no SaveImage/SaveVideo `filename_prefix`)');
   110	  return {
   111	    ok: missing.length === 0, reason: missing.length ? `captured workflow is missing ${missing.join(' and ')}` : null,
   112	    capturedAt: template.capturedAt ?? null, nodes: Object.keys(template.graph).length,
   113	    classes: [...new Set(Object.values(template.graph).map((n) => n.class_type))].slice(0, 12),
   114	    fields: { text: f.text, seed: f.seed, prefix: f.prefix },
   115	    steers: { prompt: f.text.length, seed: f.seed.length, prefix: f.prefix.length },
   116	  };
   117	}
   118	
   119	/**
   120	 * The template with prompt/seed/prefix substituted. Returns { ok, graph, changed } or { ok:false, errors }.
   121	 * `changed` lists every path that differs from the template — the caller (and the test) asserts it is only ours.
   122	 */
   123	export function applyTo(template, { prompt, seed, prefix }) {
   124	  const d = describe(template);
   125	  if (!d.ok) return { ok: false, errors: [d.reason] };
   126	  // The field MAP is validated against the graph before it is used. The drift guard below can only see
   127	  // fields outside the map; a poisoned or stale map (a "seed" pointing at `unet_name`) has to be refused
   128	  // here or it would be allowed by construction. Found by this file's own test, not in review.
   129	  const bad = [];
   130	  const kind = (list, keys, type) => { for (const f of list) { const v = template.graph[f.id]?.inputs?.[f.key]; if (!keys.includes(f.key) || typeof v !== type) bad.push(`${f.id}.${f.key}`); } };
   131	  kind(d.fields.text, TEXT_KEYS, 'string');
   132	  kind(d.fields.seed, SEED_KEYS, 'number');
   133	  kind(d.fields.prefix, PREFIX_KEYS, 'string');
   134	  if (bad.length) return { ok: false, errors: [`refused: the captured field map points at ${bad.join(', ')}, which is not a prompt, seed or save prefix — re-capture with prompter/capture-workflow.mjs`] };
   135	  const graph = JSON.parse(JSON.stringify(template.graph));
   136	  const changed = [];
   137	  const set = (id, key, value) => { if (graph[id]?.inputs && graph[id].inputs[key] !== value) { graph[id].inputs[key] = value; changed.push(`${id}.${key}`); } };
   138	  for (const t of d.fields.text) set(t.id, t.key, String(prompt));
   139	  for (const s of d.fields.seed) set(s.id, s.key, Number(seed) >>> 0);
   140	  for (const p of d.fields.prefix) set(p.id, p.key, String(prefix));
   141	  // Proof, not trust: nothing outside the three field sets may differ from the template.
   142	  const allowed = new Set([...d.fields.text, ...d.fields.seed, ...d.fields.prefix].map((f) => `${f.id}.${f.key}`));
   143	  const drift = [];
   144	  for (const [id, node] of Object.entries(graph)) {
   145	    const before = template.graph[id];
   146	    if (!before) { drift.push(`${id} (added)`); continue; }
   147	    if (node.class_type !== before.class_type) drift.push(`${id}.class_type`);
   148	    for (const k of new Set([...Object.keys(node.inputs || {}), ...Object.keys(before.inputs || {})])) {
   149	      if (allowed.has(`${id}.${k}`)) continue;
   150	      if (JSON.stringify(node.inputs?.[k]) !== JSON.stringify(before.inputs?.[k])) drift.push(`${id}.${k}`);
   151	    }
   152	  }
   153	  for (const id of Object.keys(template.graph)) if (!graph[id]) drift.push(`${id} (removed)`);
   154	  if (drift.length) return { ok: false, errors: [`refused: substitution would change ${drift.join(', ')} — only prompt, seed and save prefix may move`] };
   155	  return { ok: true, graph, changed };
   156	}
   157	
   158	/** Pull the API-format graph ComfyUI most recently RAN out of a /history payload. */
   159	export function graphFromHistory(history) {
   160	  const entries = Object.entries(history || {}).map(([id, e]) => ({ id, e })).filter(({ e }) => Array.isArray(e?.prompt) && e.prompt[2] && typeof e.prompt[2] === 'object');
   161	  if (!entries.length) return null;
   162	  // history keys are unordered; prompt[0] is ComfyUI's monotonically increasing job number.
   163	  entries.sort((a, b) => (Number(a.e.prompt[0]) || 0) - (Number(b.e.prompt[0]) || 0));
   164	  const last = entries[entries.length - 1];
   165	  return { graph: last.e.prompt[2], promptId: last.id, number: last.e.prompt[0] ?? null };
   166	}
```

## prompter/capture-workflow.mjs
```
     1	#!/usr/bin/env node
     2	/**
     3	 * capture-workflow.mjs — teach the brain YOUR ComfyUI graph, by watching what ComfyUI just ran.
     4	 *
     5	 *   1. In ComfyUI, run your workflow once, the way you always do.
     6	 *   2. node prompter/capture-workflow.mjs
     7	 *
     8	 * That is the whole setup. The graph is taken from ComfyUI's own `/history` in API format — the exact
     9	 * thing it executed — so there is no export dance, no hand-authored JSON, and no chance of the brain
    10	 * inventing a graph. It is written to prompter/comfy-workflow.local.json (gitignored, per-machine).
    11	 *
    12	 *   --watch                       WAIT for it: poll until ComfyUI is up AND has run something, then capture
    13	 *   --from <api.json>             capture from a file you exported with ComfyUI's "Save (API format)"
    14	 *   --api http://127.0.0.1:8188   override the endpoint (loopback only)
    15	 *   --show                        print what the current template can steer, capture nothing
    16	 *   --dry-run                     capture, print, write nothing
    17	 *
    18	 * `--watch` exists because ComfyUI keeps its history in MEMORY (verified 2026-08-25: `self.history = {}`
    19	 * in execution.py; the on-disk database holds assets, not prompts, and the mp4s carry no embedded graph).
    20	 * So capture cannot be done for you ahead of time — but it can wait for you: leave this running, work in
    21	 * ComfyUI as normal, and it arms itself the moment your first render goes through.
    22	 */
    23	import fs from 'node:fs';
    24	import { comfyApi, detectFields, describe, writeTemplate, readTemplate, graphFromHistory, currentTemplatePath } from './lib/workflow.mjs';
    25	
    26	const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : dflt; };
    27	const api = arg('api', comfyApi());
    28	const TEMPLATE_PATH = currentTemplatePath();
    29	
    30	/** One poll: ComfyUI reachable, and does its history hold a run we can read? */
    31	async function pollHistory(endpoint) {
    32	  try {
    33	    const r = await fetch(`${endpoint}/history`, { signal: AbortSignal.timeout(8000) });
    34	    if (!r.ok) return { up: false, reason: `HTTP ${r.status}` };
    35	    return { up: true, found: graphFromHistory(await r.json()) };
    36	  } catch (err) { return { up: false, reason: String(err.message).split('\n')[0] }; }
    37	}
    38	
    39	/** Validate + write a captured graph. Shared by every capture path. */
    40	function land(graph, source, promptId) {
    41	  const fields = detectFields(graph);
    42	  const template = { capturedAt: new Date().toISOString(), source, promptId: promptId ?? null, fields, graph };
    43	  const d = describe(template);
    44	  console.log(`\ncaptured ${Object.keys(graph).length} nodes${promptId ? ` from run ${promptId}` : ''}`);
    45	  console.log(`  classes: ${d.classes.join(', ')}`);
    46	  console.log(`  steers:  prompt ×${d.steers.prompt} · seed ×${d.steers.seed} · save prefix ×${d.steers.prefix}`);
    47	  for (const t of fields.text) console.log(`    prompt  ${t.classType}.${t.key}  "${t.sample}${t.sample.length >= 120 ? '…' : ''}"`);
    48	  for (const c of fields.textCandidates.filter((c) => c.negative)) console.log(`    (left alone — reads as a negative)  ${c.classType}.${c.key}  "${c.sample.slice(0, 60)}"`);
    49	  for (const p of fields.prefix) console.log(`    prefix  ${p.classType}.${p.key}  (was "${p.sample}")`);
    50	  if (!d.ok) { console.error(`\n⚠ ${d.reason}\n  Nothing written. Your graph needs a literal prompt field and a Save node with a filename_prefix.\n`); process.exit(1); }
    51	  if (process.argv.includes('--dry-run')) { console.log('\n--dry-run — nothing written.\n'); process.exit(0); }
    52	  console.log(`\nwrote ${writeTemplate(template)}\n  Make is armed: the page can now queue any prompt into THIS graph, substituting only the prompt, the seed\n  and the save prefix.\n`);
    53	  process.exit(0);
    54	}
    55	
    56	// --from <file>: an API-format graph exported from ComfyUI's menu (Workflow → Export (API)).
    57	if (arg('from')) {
    58	  const f = arg('from');
    59	  if (!fs.existsSync(f)) { console.error(`no such file: ${f}`); process.exit(1); }
    60	  let j;
    61	  try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { console.error(`${f} is not JSON`); process.exit(1); }
    62	  const graph = j.prompt && typeof j.prompt === 'object' ? j.prompt : j;
    63	  const looksApi = Object.values(graph).every((n) => n && typeof n === 'object' && n.class_type);
    64	  if (!looksApi) {
    65	    console.error(`\n${f} is a UI workflow, not an API one.\n  In ComfyUI use Workflow → Export (API) — or just run your workflow and use --watch, which needs no export.\n`);
    66	    process.exit(1);
    67	  }
    68	  land(graph, `file:${f}`);
    69	}
    70	
    71	if (process.argv.includes('--watch')) {
    72	  if (!api) { console.error('ComfyUI endpoint must be loopback'); process.exit(1); }
    73	  const minutes = Number(arg('minutes', 60));
    74	  console.log(`\nwatching ${api} for a run — start ComfyUI and use it as normal; this arms itself when your first render goes through.\n(Ctrl-C to stop; giving up after ${minutes} min.)\n`);
    75	  const until = Date.now() + minutes * 60_000;
    76	  let lastState = '';
    77	  while (Date.now() < until) {
    78	    const s = await pollHistory(api);
    79	    const state = s.up ? (s.found ? 'run found' : 'up, history empty — run your workflow once') : `waiting for ComfyUI (${s.reason})`;
    80	    if (state !== lastState) { console.log(`  ${new Date().toISOString().slice(11, 19)}  ${state}`); lastState = state; }
    81	    if (s.up && s.found) land(s.found.graph, `${api}/history`, s.found.promptId);
    82	    await new Promise((r) => setTimeout(r, 5000));
    83	  }
    84	  console.error(`\ngave up after ${minutes} min — nothing captured.\n`);
    85	  process.exit(1);
    86	}
    87	
    88	if (process.argv.includes('--show')) {
    89	  const d = describe();
    90	  if (!d.ok && !readTemplate()) { console.log(`\nNo workflow captured yet.\n  1. run your workflow once in ComfyUI\n  2. node prompter/capture-workflow.mjs\n`); process.exit(1); }
    91	  console.log(`\n${TEMPLATE_PATH}\n  captured: ${d.capturedAt || '?'} · ${d.nodes} nodes · ${d.classes.join(', ')}`);
    92	  console.log(`  steers: prompt ×${d.steers.prompt} · seed ×${d.steers.seed} · save prefix ×${d.steers.prefix}${d.ok ? '' : `\n  ⚠ ${d.reason}`}`);
    93	  for (const t of d.fields.text) console.log(`    prompt  ${t.classType}.${t.key}  "${t.sample}${t.sample.length >= 120 ? '…' : ''}"`);
    94	  for (const s of d.fields.seed) console.log(`    seed    ${s.classType}.${s.key}`);
    95	  for (const p of d.fields.prefix) console.log(`    prefix  ${p.classType}.${p.key}  (was "${p.sample}")`);
    96	  console.log('');
    97	  process.exit(d.ok ? 0 : 1);
    98	}
    99	
   100	if (!api) { console.error('ComfyUI endpoint must be loopback (set `api` in prompter/comfy.local.json or SWAN_COMFY_API)'); process.exit(1); }
   101	let history;
   102	try {
   103	  const r = await fetch(`${api}/history`, { signal: AbortSignal.timeout(15000) });
   104	  if (!r.ok) throw new Error(`HTTP ${r.status}`);
   105	  history = await r.json();
   106	} catch (err) {
   107	  console.error(`\nCould not reach ComfyUI at ${api} (${err.message}).\nStart it (Swan Local Video 5090.cmd), run your workflow once, then re-run this.\n`);
   108	  process.exit(1);
   109	}
   110	const found = graphFromHistory(history);
   111	if (!found) {
   112	  console.error(`\nComfyUI is running but its history is empty — run your workflow ONCE, then re-run this.\n  Or leave \`node prompter/capture-workflow.mjs --watch\` running and it will arm itself when you do.\n`);
   113	  process.exit(1);
   114	}
   115	land(found.graph, `${api}/history`, found.promptId);
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
    89	      // Which memory this batch was generated FOR. onMemory() clears #out synchronously, but the
    90	      // fetch already in flight resolves afterwards and used to append its cards regardless — so a
    91	      // batch generated for the owner could land under the partner memory, and Keep / Make / Prefix
    92	      // read the CURRENT memory, writing his prompts into hers. Every corpus guard is an --sref
    93	      // scan, and the corpus's commonest prompt shapes carry no sref at all (a descriptive or
    94	      // "X by <artist>" prompt has none), so nothing downstream would have caught it: corpus artist
    95	      // names and prompt text would enter her kept list as a weight-12 exemplar and her printed
    96	      // brief. Absence is not innocence, on the client this time.
    97	      // (round-5 panel, GLM 5.3 P1)
    98	      const mem = [Swan.profile, Swan.project].join('/');
    99	      const d = await Swan.api('/api/prompt?' + q);
   100	      if (mem !== [Swan.profile, Swan.project].join('/')) return Swan.say('memory changed while generating — discarded that batch. Press Generate again.');
   101	      const out = el('out'); out.innerHTML = '';
   102	      if (d.error) return Swan.say(`refused: ${Swan.esc(d.error)}`);
   103	      d.prompts.forEach((p) => out.appendChild(card(p)));
   104	      const t = d.taste || {};
   105	      let s = `seed <b>${d.seed ?? '—'}</b> · ${d.prompts.length} ${d.medium === 'video' ? '<b>shot</b> prompts' : 'prompts'} · taste <b>${t.source || '—'}</b>: ${t.evidenceSrefs ?? 0} evidence codes · ${t.keywords ?? 0} words · ${t.kept ?? 0} kept · confidence <b>${d.confidence}</b>`;
   106	      if (d.vetoed) s += ` · your avoid-list rejected ${d.vetoed} candidates`;
   107	      if (d.hint) s += ` · <span class="warn">${Swan.esc(d.hint)}</span>`;
   108	      Swan.say(s);
   109	    } catch (e) { Swan.say('failed: ' + e.message); } finally { el('go').disabled = false; }
   110	  }
   111	
   112	  S().tab('make', {
   113	    mount() { el('go').addEventListener('click', run); },
   114	    enter() { status(); },
   115	  });
   116	  S().onMemory(() => { const o = el('out'); if (o) o.innerHTML = '<div class="empty">Press Generate.</div>'; status(); });
   117	})();
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
    31	    // Same stale-response race as the Make tab: onMemory() resets `last` and `judge` but cancels
    32	    // nothing, so a grid fetched for one memory could bind to the judge after the operator switched,
    33	    // and the recording would be attributed to the memory now selected. The server's provenance
    34	    // allowlist stops that becoming a CORPUS leak, but it is still one memory's judgement recorded
    35	    // in another's, which is the thing the whole namespace design exists to prevent.
    36	    // (round-5 panel, GLM 5.3 P1)
    37	    const mem = [Swan.profile, Swan.project].join('/');
    38	    const r = await fetch(`/api/probe?${Swan.qs(pool ? '&pool=renders' : '')}` + (useSeed != null ? `&seed=${useSeed}` : ''));
    39	    const j = await r.json();
    40	    if (mem !== [Swan.profile, Swan.project].join('/')) return note('memory changed while loading — discarded that grid. Press Next grid.');
    41	    if (!r.ok) return note(`refused: ${j.error}`);
    42	    if (!j.candidates.length) { el('grid').innerHTML = ''; el('done').disabled = true; return note(pool ? `no renders to judge — ${j.hint || j.reason || 'make some first'}` : `no pictures left — ${j.hint}`); }
    43	    seed = j.seed;
    44	    judge = SwanProbe.createJudge({ grid: el('grid'), count: el('count'), done: el('done'), notify: note, brandLawLabel: SwanProbe.COPY[Swan.profile].brandLaw });
    45	    judge.load(j.candidates); el('undo').hidden = true;
    46	    if (pool) {
    47	      const clips = j.candidates.filter((c) => c.kind === 'video').length;
    48	      el('status').innerHTML = `seed <b>${seed}</b> · <b>${j.candidates.length}</b> of your renders${clips ? ` (${clips} clip${clips === 1 ? '' : 's'})` : ''} · pool <b>renders</b> · ${j.excludedCount} already judged, never repeated${j.exhausted ? ` · ${j.hint}` : ''}${await progress()} · a render counts toward what you want pictured, never toward style codes.`;
    49	    } else {
    50	      const webb = j.candidates.filter((c) => c.provenance === 'esa-webb-ccby').length;
    51	      const photo = j.candidates.filter((c) => c.provenance === 'unsplash' || c.provenance === 'pexels').length;
    52	      el('status').innerHTML = `seed <b>${seed}</b> · ${j.candidates.length} pictures from ${new Set(j.candidates.map((c) => c.doc)).size} sources${photo ? ` · <b>${photo}</b> photos` : ''}${webb ? ` · <b>${webb}</b> Webb` : ''} · pool <b>${j.pool}</b> · ${j.excludedCount} already seen, never repeated${j.exhausted ? ` · <b>pool nearly exhausted</b> — ${j.hint}` : ''}${await progress()} · images load from the source CDNs in your browser; nothing is downloaded or stored.`;
    53	    }
    54	    el('done').textContent = `Done — record for ${SwanProbe.COPY[Swan.profile].who}`; el('done').onclick = record;
    55	  }
    56	
    57	  async function record() {
    58	    const Swan = S();
    59	    const ev = judge.event({ source: Swan.profile, profileId: Swan.profile, projectId: Swan.project, channel: 'page', sessionId, notePublic: `probe seed ${seed}` });
    60	    el('done').disabled = true;
    61	    const j = await Swan.post('/api/event', ev);
    62	    if (!j.ok) { el('result').innerHTML = `refused: ${(j.errors || [j.error]).join('; ')}`; el('done').disabled = false; return; }
    63	    // The FULL candidate projection, not bare ids. undo() posts these as the reversal's candidates,
    64	    // and since round 4 every candidate in a non-owner memory must declare a shareable provenance —
    65	    // so a reversal built from `{ id }` alone was refused, and Undo silently stopped working for the
    66	    // partner and client memories. The suites missed it because their undo fixture spreads a whole
    67	    // grid event, which carries provenance; the PAGE does not. Carrying the projection satisfies the
    68	    // law without exempting reversals from it — an exemption would rebuild door 5 one layer up.
    69	    // (round-5 panel, Ox Alpha P1 — a regression introduced by my own round-4 fix.)
    70	    last = { eventId: j.eventId, candidates: ev.candidates };
    71	    el('result').innerHTML = `recorded <b>${j.eventId}</b>${j.duplicate ? ' (already recorded)' : ''} → ${Swan.profile}/${Swan.project}${await progress()}`;
    72	    el('done').textContent = 'Next grid →'; el('done').disabled = false; el('done').onclick = () => load(null);
    73	    el('undo').hidden = false;
    74	  }
    75	
    76	  async function undo() {
    77	    const Swan = S();
    78	    if (!last) return;
    79	    const ev = { schemaVersion: 1, eventType: 'reversal', source: Swan.profile, profileId: Swan.profile, projectId: Swan.project, channel: 'page', sessionId,
    80	      presentedAt: new Date().toISOString(), medium: 'still', brandContext: 'general', generatorDistribution: 'reference-mix',
    81	      candidates: last.candidates, reversalOf: last.eventId, notePublic: 'undo from the judging tab' };
    82	    const j = await Swan.post('/api/event', ev);
    83	    el('result').innerHTML = j.ok ? `grid <b>undone</b> — those pictures can be judged again${await progress()}` : `undo refused: ${(j.errors || [j.error]).join('; ')}`;
    84	    if (j.ok) { last = null; el('undo').hidden = true; }
    85	  }
    86	
    87	  S().tab('judge', {
    88	    mount() {
    89	      el('new').addEventListener('click', () => load(null));
    90	      el('again').addEventListener('click', () => load(seed));
    91	      el('undo').addEventListener('click', undo);
    92	      el('pool').addEventListener('change', () => { pool = el('pool').value === 'renders' ? 'renders' : ''; load(null); });
    93	    },
    94	    enter() { S().$('sub').innerHTML = SwanProbe.COPY[S().profile].sub; if (!judge) load(null); },
    95	  });
    96	  S().onMemory(() => { judge = null; last = null; if (S().current === 'judge') load(null); });
    97	})();
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

## prompter/lib/routes-modes.mjs
```
     1	/**
     2	 * routes-modes.mjs — the namespace-aware routes: which memory is being judged, and its readout.
     3	 *
     4	 * One memory = profile × project (lib/projects.mjs). Every read here takes `?profile=&project=`
     5	 * (defaults sean/default, so the original probe keeps working untouched), validates both against
     6	 * the enums and refuses anything else with 400 — a URL cannot invent a namespace. The one write
     7	 * (POST /api/projects) runs AFTER serve.mjs's origin gate, like every other write.
     8	 *
     9	 * Reads served here never carry image bytes: /api/probe returns ids + URLs the browser loads.
    10	 */
    11	import { readFileSync } from 'node:fs';
    12	import path from 'node:path';
    13	import { loadTaste } from './taste.mjs';
    14	import { loadImages } from './images.mjs';
    15	import { selectProbe } from './probe.mjs';
    16	import { readEventsFor, judgedIds, PROFILES, DEFAULT_PROFILE, DEFAULT_PROJECT, isProjectId } from './events.mjs';
    17	import { createProject, listProjects, readProject, poolFor } from './projects.mjs';
    18	import { compileProfile } from './profile.mjs';
    19	import { listRenders } from './renders.mjs';
    20	import { rngFrom } from './generate.mjs';
    21	import { readKept } from './taste-namespace.mjs';
    22	
    23	/** A grid of THIS memory's own renders — never mixed with real pictures; never-show-twice applies; exhaustion stated. */
    24	export function renderProbeFor({ profile, project, n = 12, seed, base }) {
    25	  const lr = listRenders(profile, project, { base });
    26	  if (!lr.ok) return { error: lr.error };
    27	  const exclude = new Set(judgedIds(readEventsFor(profile, project)));
    28	  const usable = lr.renders.filter((r) => !exclude.has(r.id));
    29	  const s = Number.isFinite(seed) ? seed : Math.floor(Math.random() * 2 ** 31);
    30	  const rng = rngFrom(s);
    31	  const order = usable.slice();
    32	  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    33	  const candidates = order.slice(0, n).map((c, i) => ({ ...c, gridPosition: i }));
    34	  const exhausted = candidates.length < n;
    35	  return {
    36	    profileId: profile, projectId: project, pool: 'renders', available: lr.available !== false, reason: lr.reason ?? null,
    37	    excludedCount: lr.renders.length - usable.length, exhausted,
    38	    hint: !lr.available ? lr.reason : exhausted ? `${usable.length} unjudged render${usable.length === 1 ? '' : 's'} left — make more in ComfyUI (Swan Prompt node → prefix → SaveImage)` : null,
    39	    seed: s, strata: candidates.map((c) => ({ position: c.gridPosition, doc: c.doc, collection: 'render', hasSref: Boolean(c.sref) })),
    40	    candidates,
    41	  };
    42	}
    43	
    44	/**
    45	 * The shell (app.html) is served at `/` and at every legacy path, with the tab chosen by `data-tab`
    46	 * rewritten per path — so one page, one implementation, and old bookmarks still land in the right place.
    47	 */
    48	const SHELL = { '/': 'make', '/app': 'make', '/probe': 'judge', '/brief': 'directions', '/make': 'make', '/kept': 'kept' };
    49	const STATIC = {
    50	  '/probe.js': ['probe.js', 'text/javascript; charset=utf-8'],
    51	  '/probe.css': ['probe.css', 'text/css; charset=utf-8'],
    52	  '/app.css': ['app.css', 'text/css; charset=utf-8'],
    53	  '/app-shell.js': ['app-shell.js', 'text/javascript; charset=utf-8'],
    54	  '/app-make.js': ['app-make.js', 'text/javascript; charset=utf-8'],
    55	  '/app-judge.js': ['app-judge.js', 'text/javascript; charset=utf-8'],
    56	  '/app-directions.js': ['app-directions.js', 'text/javascript; charset=utf-8'],
    57	  '/app-kept.js': ['app-kept.js', 'text/javascript; charset=utf-8'],
    58	};
    59	
    60	/** Parse + validate the namespace from a URL. Returns { profile, project } or { error }. */
    61	export function namespaceFrom(url) {
    62	  const profile = url.searchParams.get('profile') ?? DEFAULT_PROFILE;
    63	  const project = url.searchParams.get('project') ?? DEFAULT_PROJECT;
    64	  if (!PROFILES.includes(profile)) return { error: `profile must be one of ${PROFILES.join('|')}` };
    65	  if (!isProjectId(project)) return { error: 'project must be a slug (a-z, 0-9, hyphens, ≤40)' };
    66	  return { profile, project };
    67	}
    68	
    69	/** The probe grid for a namespace — pool law + never-show-twice applied. Exported for the test. */
    70	export function probeFor({ profile, project, n = 12, seed, mix, images }) {
    71	  const pj = readProject(profile, project);
    72	  if (!pj) return { error: 'unknown project' };
    73	  const pool = poolFor(profile, project, images ?? loadImages());
    74	  const excludeIds = judgedIds(readEventsFor(profile, project));
    75	  // Sean's own refusals are his; a partner or client judges every code fresh.
    76	  // Profile, matching every other corpus gate: rejected.md is Sean's refusal list and applies to any
    77	  // memory of his. (round-7: reverted with the round-6 namespace narrowing.)
    78	  const excludeSrefs = profile === DEFAULT_PROFILE ? loadTaste().rejectedSrefs : [];
    79	  const out = selectProbe({ images: pool.images, n, seed, excludeSrefs, excludeIds, mix: mix ?? pool.mix });
    80	  // Pool exhaustion is a stated state, not a silent short grid (panel 2026-08-25).
    81	  const exhausted = out.candidates.length < n;
    82	  return {
    83	    profileId: profile, projectId: project, pool: pool.pool, excludedCount: excludeIds.length, exhausted,
    84	    hint: exhausted ? `this memory has judged nearly every picture in its ${pool.pool} pool (${out.candidates.length} left for this grid) — grow it: node prompter/fetch-photos.mjs --project ${profile}/${project}` : null,
    85	    seed: out.seed, strata: out.strata,
    86	    candidates: out.candidates.map((c) => ({
    87	      id: c.id, url: c.url, sref: c.sref, doc: c.doc, collection: c.collection, title: c.title,
    88	      provenance: c.provenance, credit: c.credit ?? null, pageUrl: c.pageUrl ?? null, gridPosition: c.gridPosition,
    89	    })),
    90	  };
    91	}
    92	
    93	/**
    94	 * @returns {Promise<boolean>} true when the request was handled.
    95	 * `here` = the prompter directory; `json` / `readBody` are serve.mjs's helpers.
    96	 */
    97	export async function handleModeRoutes({ url, req, res, json, readBody, here, base }) {
    98	  const p = url.pathname;
    99	  if (req.method === 'GET' && SHELL[p]) {
   100	    const html = readFileSync(path.join(here, 'app.html'), 'utf8').replace('data-tab="make"', `data-tab="${SHELL[p]}"`);
   101	    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
   102	    res.end(html);
   103	    return true;
   104	  }
   105	  if (req.method === 'GET' && STATIC[p]) {
   106	    const [file, type] = STATIC[p];
   107	    res.writeHead(200, { 'content-type': type });
   108	    res.end(readFileSync(path.join(here, file), 'utf8'));
   109	    return true;
   110	  }
   111	  if (p === '/api/projects' && req.method === 'GET') {
   112	    const profiles = {};
   113	    for (const pr of PROFILES) profiles[pr] = listProjects(pr);
   114	    json(res, 200, { profiles });
   115	    return true;
   116	  }
   117	  if (p === '/api/projects' && req.method === 'POST') {
   118	    const r = createProject(await readBody(req));
   119	    json(res, r.ok ? 200 : 400, r);
   120	    return true;
   121	  }
   122	  if (p === '/api/probe' && req.method === 'GET') {
   123	    const ns = namespaceFrom(url);
   124	    if (ns.error) { json(res, 400, { error: ns.error }); return true; }
   125	    const n = Math.min(24, Math.max(2, Number(url.searchParams.get('n') ?? 12) || 12));
   126	    const seedRaw = url.searchParams.get('seed');
   127	    const seed = seedRaw && /^\d+$/.test(seedRaw) ? Number(seedRaw) : undefined;
   128	    if (url.searchParams.get('pool') === 'renders') {   // an explicit choice — real pictures stay the default
   129	      const out = renderProbeFor({ ...ns, n, seed, base });
   130	      json(res, out.error ? 404 : 200, out);
   131	      return true;
   132	    }
   133	    // Manual quota overrides (Sean's experiments). A shareable pool has no Midlibrary to fall back to.
   134	    const q = (k) => { const v = url.searchParams.get(k); return v !== null && /^\d+$/.test(v) ? Math.min(Number(v), n) : undefined; };
   135	    const webb = q('webb'), photo = q('photo');
   136	    const mix = webb === undefined && photo === undefined ? undefined
   137	      : { ...poolFor(ns.profile, ns.project, []).mix, ...(webb !== undefined ? { webb } : {}), ...(photo !== undefined ? { photo } : {}) };
   138	    const out = probeFor({ ...ns, n, seed, mix });
   139	    json(res, out.error ? 404 : 200, out);
   140	    return true;
   141	  }
   142	  // The pictures a memory has already judged — so a bundle import can be checked whole before one line is written.
   143	  if (p === '/api/judged' && req.method === 'GET') {
   144	    const ns = namespaceFrom(url);
   145	    if (ns.error) { json(res, 400, { error: ns.error }); return true; }
   146	    if (!readProject(ns.profile, ns.project)) { json(res, 404, { error: 'unknown project' }); return true; }
   147	    const events = readEventsFor(ns.profile, ns.project);
   148	    json(res, 200, { profileId: ns.profile, projectId: ns.project, ids: judgedIds(events), eventIds: events.map((e) => e.eventId).filter(Boolean) });
   149	    return true;
   150	  }
   151	  // The kept list — the compounding channel, finally visible. Sean's own list is markdown he edits himself.
   152	  if (p === '/api/kept' && req.method === 'GET') {
   153	    const ns = namespaceFrom(url);
   154	    if (ns.error) { json(res, 400, { error: ns.error }); return true; }
   155	    const pj = readProject(ns.profile, ns.project);
   156	    if (!pj) { json(res, 404, { error: 'unknown project' }); return true; }
   157	    const isDefault = ns.profile === DEFAULT_PROFILE && ns.project === DEFAULT_PROJECT;
   158	    json(res, 200, { profileId: ns.profile, projectId: ns.project, title: pj.title, readOnly: isDefault, kept: isDefault ? loadTaste().kept : readKept(ns.profile, ns.project) });
   159	    return true;
   160	  }
   161	  if (p === '/api/profile' && req.method === 'GET') {
   162	    const ns = namespaceFrom(url);
   163	    if (ns.error) { json(res, 400, { error: ns.error }); return true; }
   164	    const out = compileProfile({ ...ns, write: false });
   165	    json(res, out.error ? 404 : 200, out);
   166	    return true;
   167	  }
   168	  return false;
   169	}
```

## prompter/lib/renders.mjs
```
     1	/**
     2	 * renders.mjs — the render loop's memory: what the brain handed ComfyUI, and what came back.
     3	 *
     4	 * WHY (Sean 2026-08-25): "click, click, click — like Midjourney… Midjourney + ChatGPT for images and
     5	 * video." The loop is make → look → judge → the memory sharpens → make again, fully local, per memory.
     6	 * On this desktop ComfyUI (127.0.0.1:8188, the 5090) renders mostly VIDEO (MiniMax H3 → mp4), so a
     7	 * render is an image OR a clip.
     8	 *
     9	 * LAWS (panel rounds 1–2, 2026-08-25):
    10	 *   · ComfyUI PULLS from the brain (the existing node pattern); the brain never drives ComfyUI in v1.
    11	 *   · The brain never stores render bytes — it remembers a token, a prompt, a seed, a code; the file
    12	 *     stays where ComfyUI put it, and the client never supplies a path: the server composes every path
    13	 *     from validated segments and prefix-checks it.
    14	 *   · Minting an intent is a WRITE → POST, behind the origin gate. Tokens are a content hash of
    15	 *     (memory, prompt, seed, sref), so re-rendering the same prompt cannot launder one opinion into
    16	 *     repeated evidence, and the same prompt always has the same file name.
    17	 *   · A render is `generated` provenance ('local-comfy'): never a bundle candidate, never a keyword
    18	 *     source, never a style tally (the generator does not grade its own homework) — see profile.mjs.
    19	 *   · The output directory comes from config (env SWAN_COMFY_OUTPUT → prompter/comfy.local.json →
    20	 *     Z:\SwanStudios-Video\output). When it is absent the loop says so; it never crashes.
    21	 */
    22	import fs from 'node:fs';
    23	import path from 'node:path';
    24	import { createHash } from 'node:crypto';
    25	import { VAULT } from './corpus.mjs';
    26	import { PROFILES, DEFAULT_PROFILE, DEFAULT_PROJECT, isProjectId, CORPUS_MARKER } from './events.mjs';
    27	import { readProject, projectDir } from './projects.mjs';
    28	
    29	export const RENDER_SUBDIR = 'swan';          // ComfyUI SaveImage filename_prefix = `swan/<token>` → output/swan/<token>_00001_.ext
    30	export const MAX_INTENTS = 2000;
    31	export const MAX_PROMPT = 2000;
    32	export const SIZE_CAP = { image: 25 * 1024 * 1024, video: 200 * 1024 * 1024 };
    33	const TOKEN = /^[a-f0-9]{12}$/;
    34	const FILE = /^([a-f0-9]{12})_(\d{1,5})_\.(png|jpg|jpeg|webp|mp4|webm)$/i;
    35	const KIND = { png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', mp4: 'video', webm: 'video' };
    36	const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm' };
    37	
    38	export function outputDir() {
    39	  if (process.env.SWAN_COMFY_OUTPUT) return process.env.SWAN_COMFY_OUTPUT;
    40	  const cfg = path.join(VAULT, 'prompter', 'comfy.local.json');
    41	  if (fs.existsSync(cfg)) { try { const j = JSON.parse(fs.readFileSync(cfg, 'utf8')); if (j.output) return j.output; } catch { /* fall through */ } }
    42	  return 'Z:\\SwanStudios-Video\\output';
    43	}
    44	export const renderDir = () => path.join(outputDir(), RENDER_SUBDIR);
    45	export function available() {
    46	  const dir = outputDir();
    47	  return fs.existsSync(dir) ? { ok: true, dir } : { ok: false, dir, reason: `ComfyUI output directory not found (${dir}) — is the drive mounted? Set SWAN_COMFY_OUTPUT or prompter/comfy.local.json` };
    48	}
    49	
    50	const nsOk = (p, j) => PROFILES.includes(p) && isProjectId(j) && Boolean(readProject(p, j));
    51	export function intentsPath(profile, project) {
    52	  const root = profile === DEFAULT_PROFILE && project === DEFAULT_PROJECT ? path.join(VAULT, 'taste') : projectDir(profile, project);
    53	  return path.join(root, 'renders', 'intents.jsonl');
    54	}
    55	export function readIntents(profile, project) {
    56	  const p = intentsPath(profile, project);
    57	  if (!fs.existsSync(p)) return [];
    58	  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    59	}
    60	export const tokenFor = (profile, project, prompt, seed, sref) =>
    61	  createHash('sha256').update(`${profile}/${project}|${prompt}|${seed ?? ''}|${sref ?? ''}`).digest('hex').slice(0, 12);
    62	
    63	/** Mint an intent — idempotent on content. Returns { ok, duplicate, token, prefix, intent } or { ok:false, errors }. */
    64	export function mintIntent({ profileId, projectId, prompt, seed, sref } = {}) {
    65	  const errors = [];
    66	  if (!nsOk(profileId, projectId)) errors.push('unknown memory (profileId/projectId must name an existing project)');
    67	  const text = String(prompt ?? '').replace(/\s+/g, ' ').trim();
    68	  if (text.split(' ').length < 3) errors.push('prompt must be at least 3 words');
    69	  if (text.length > MAX_PROMPT) errors.push(`prompt must be ≤ ${MAX_PROMPT} chars`);
    70	  // The ceiling matches what applyTo() can actually EXECUTE: it writes `Number(seed) >>> 0` into
    71	  // the graph, so any seed >= 2^32 was silently truncated — the intent record, and the token hashed
    72	  // from it, then described a render nobody made, and reproducing from the record gave a different
    73	  // image. A validator that accepts what the executor cannot honour is a record that lies.
    74	  // (round-3 panel, GLM 5.3 finding 8)
    75	  if (seed !== undefined && seed !== null && !(Number.isInteger(seed) && seed >= 0 && seed <= 0xFFFFFFFF)) errors.push('seed must be an integer in 0..4294967295');
    76	  if (sref !== undefined && sref !== null && !/^\d{5,12}$/.test(String(sref))) errors.push('sref must be 5-12 digits');
    77	  // The render-intent channel is a WRITER too, and it had no namespace law at all: a partner intent
    78	  // could carry a corpus code either as the `sref` field or inside the prompt text, and listRenders
    79	  // then handed both back to her page, while the judged render's candidate is 'local-comfy' — which
    80	  // validateEvent deliberately exempts, on the reasoning that a render's code is her own intent's.
    81	  // That reasoning only holds if intents cannot carry corpus codes. This is what makes it hold.
    82	  // Her own Make batches mint sref: null, so nothing legitimate is refused.
    83	  // (round-4 panel: Ox Alpha P2, GLM 5.3 P1 and HY3 blocker 1 — three seats, same door.)
    84	  // The profile, not the namespace — his own side projects are his (see events.mjs isCorpusOwner).
    85	  if (profileId !== DEFAULT_PROFILE) {
    86	    if (sref !== undefined && sref !== null) errors.push('a style code may never enter a non-owner memory');
    87	    if (/(^|\s)--sref\b/i.test(text)) errors.push('a render prompt for a non-owner memory may not carry a --sref style code');
    88	    // Same class as keepFor: the intent's prompt surfaces through listRenders into render candidates
    89	    // and from there into events and the brief. (round-7 panel, GLM 5.3 P2)
    90	    if (CORPUS_MARKER.test(text)) errors.push('a render prompt for a non-owner memory may not name the corpus');
    91	  }
    92	  if (errors.length) return { ok: false, errors };
    93	  const token = tokenFor(profileId, projectId, text, seed, sref);
    94	  const existing = readIntents(profileId, projectId);
    95	  const dup = existing.find((i) => i.token === token);
    96	  if (dup) return { ok: true, duplicate: true, token, prefix: `${RENDER_SUBDIR}/${token}`, intent: dup };
    97	  if (existing.length >= MAX_INTENTS) return { ok: false, errors: [`this memory holds ${MAX_INTENTS} render intents — prune: node prompter/fetch-renders.mjs --profile ${profileId} --project ${projectId} --prune`] };
    98	  const intent = { token, prompt: text, seed: seed ?? null, sref: sref ? String(sref) : null, createdAt: new Date().toISOString() };
    99	  const p = intentsPath(profileId, projectId);
   100	  fs.mkdirSync(path.dirname(p), { recursive: true });
   101	  fs.appendFileSync(p, JSON.stringify(intent) + '\n', 'utf8');
   102	  return { ok: true, duplicate: false, token, prefix: `${RENDER_SUBDIR}/${token}`, intent };
   103	}
   104	
   105	/** Scan the render dir and join to THIS memory's intents. Unknown tokens — other memories, stray files — are ignored. */
   106	export function listRenders(profile, project, { base = 'http://127.0.0.1:7331' } = {}) {
   107	  if (!nsOk(profile, project)) return { ok: false, error: 'unknown memory', renders: [] };
   108	  const av = available();
   109	  const dir = renderDir();
   110	  if (!av.ok || !fs.existsSync(dir)) return { ok: true, available: false, reason: av.ok ? `no renders yet — ComfyUI has not written to ${dir}` : av.reason, renders: [] };
   111	  const intents = new Map(readIntents(profile, project).map((i) => [i.token, i]));
   112	  const renders = [];
   113	  for (const name of fs.readdirSync(dir)) {
   114	    const m = FILE.exec(name);
   115	    if (!m) continue;
   116	    const intent = intents.get(m[1]);
   117	    if (!intent) continue;
   118	    let st;
   119	    try { st = fs.lstatSync(path.join(dir, name)); } catch { continue; }
   120	    if (!st.isFile()) continue;   // lstat: a symlink is not a file — nothing outside the render dir is ever listed or served
   121	    const ext = m[3].toLowerCase(), n = Number(m[2]);
   122	    renders.push({
   123	      id: `render:${m[1]}:${n}`, token: m[1], n, kind: KIND[ext], mime: MIME[ext],
   124	      url: `${base}/renders/${profile}/${project}/${m[1]}/${n}`,
   125	      prompt: intent.prompt, seed: intent.seed, sref: intent.sref, createdAt: intent.createdAt, sizeBytes: st.size,
   126	      provenance: 'local-comfy', collection: 'render', generated: true, doc: `render/${m[1]}`,
   127	      title: intent.prompt.split(/\s--/)[0].slice(0, 140), credit: null, pageUrl: null,
   128	    });
   129	  }
   130	  renders.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.n - b.n);
   131	  return { ok: true, available: true, renders, dir };
   132	}
   133	
   134	/** Resolve one render to a file, safely: every segment validated, the path composed here, prefix-checked. */
   135	export function renderFile(profile, project, token, n) {
   136	  if (!nsOk(profile, project) || !TOKEN.test(String(token)) || !/^\d{1,5}$/.test(String(n))) return null;
   137	  if (!readIntents(profile, project).some((i) => i.token === token)) return null;
   138	  const dir = path.resolve(renderDir());
   139	  if (!fs.existsSync(dir)) return null;
   140	  const want = `${token}_${String(Number(n)).padStart(5, '0')}_.`;   // ComfyUI zero-pads its counter to 5
   141	  const name = fs.readdirSync(dir).find((f) => f.toLowerCase().startsWith(want) && FILE.test(f));
   142	  if (!name) return null;
   143	  const full = path.resolve(dir, name);
   144	  if (!full.startsWith(dir + path.sep)) return null;
   145	  const ext = name.split('.').pop().toLowerCase();
   146	  let st;
   147	  try { st = fs.lstatSync(full); } catch { return null; }
   148	  if (!st.isFile()) return null;   // symlinks refused (lstat), same as the listing
   149	  return { path: full, kind: KIND[ext], mime: MIME[ext], sizeBytes: st.size };
   150	}
   151	
   152	/** Magic bytes → mime, or null. The serve route refuses a file that does not sniff as what its name says. */
   153	export function sniff(buf) {
   154	  if (buf.length >= 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return 'image/png';
   155	  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
   156	  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
   157	  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') return 'video/mp4';
   158	  if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';
   159	  return null;
   160	}
   161	
   162	/** Drop intents older than `days` that never produced a file. Rewrites the file; returns counts. */
   163	export function pruneIntents(profile, project, { days = 30 } = {}) {
   164	  if (!nsOk(profile, project)) return { ok: false, error: 'unknown memory' };
   165	  const intents = readIntents(profile, project);
   166	  // An UNREACHABLE drive is not an empty one. listRenders returns `renders: []` with
   167	  // `available: false` when the output directory cannot be read — and that directory is designed for
   168	  // a mapped network drive (Z:), so "temporarily not mounted" is a normal state, not an exception.
   169	  // Pruning against that empty list made every intent older than `days` look as though it never
   170	  // produced a file, and rewrote its token, prompt and seed out of existence while the renders
   171	  // themselves sat safely on the unmounted drive. Refuse rather than destroy.
   172	  // (round-4 panel, Ox Alpha P2)
   173	  const lr = listRenders(profile, project);
   174	  if (lr.available === false) return { ok: false, error: `render directory unreachable (${lr.reason || 'not mounted'}) — refusing to prune, because every intent would look unrendered` };
   175	  const have = new Set(lr.renders.map((r) => r.token));
   176	  const cutoff = Date.now() - days * 86400_000;
   177	  const keep = intents.filter((i) => have.has(i.token) || Date.parse(i.createdAt) >= cutoff);
   178	  if (keep.length !== intents.length) fs.writeFileSync(intentsPath(profile, project), keep.map((i) => JSON.stringify(i)).join('\n') + (keep.length ? '\n' : ''), 'utf8');
   179	  return { ok: true, before: intents.length, after: keep.length, pruned: intents.length - keep.length };
   180	}
```

---

## How to answer

You are reviewing a PLAN, not finished code. Lead with the answer to question 1 — should the UI→API
conversion exist at all, and if so what makes a converted graph provably Sean's before it is queued?

Then take the other four questions in order. For each: the concrete failure you can construct, and the
smallest design that prevents it. Say plainly if a step should be cut rather than built — a step not
built is cheaper than one hardened.

Then propose the build order you would actually take, smallest shippable first.

End with **APPROVE / REVISE / REJECT** on the plan as written.
