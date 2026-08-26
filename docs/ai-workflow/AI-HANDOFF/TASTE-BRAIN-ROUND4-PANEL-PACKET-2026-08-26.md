---
decision: "Round-4 hostile review — does the taste brain run dry, or is there a FIFTH corpus door?"
status: open
board: SWA-186
date: 2026-08-26
privacy: IDs and roles only. The second user is "the partner". No names, no keys, no PII.
---

# Swan Taste Brain — round 4: does it run dry?

Round 3 (GLM 5.3, Ox Alpha, HY3, Qwen 3.8, Kimi K3) found **thirteen** real defects in this code,
every one now fixed and covered by a regression check that fails against the pre-fix version.
**Four separate corpus doors** were found in four different layers. Your job is to decide whether
this has finally run dry — and if it has not, to find number five.

## The law that keeps being broken

This tool holds a **third-party copyrighted corpus** (Midlibrary, which the owner subscribes to).
It may be used for the OWNER's memory (`sean/default`) and **must never reach a partner or client
memory, a shared bundle, or a printed brief** — not the images, not the artists, not the style
codes (`--sref`), not the prompt text. One memory = `profile × project`.

Four doors have now been closed, in four different layers. Note the pattern: each fix guarded one
layer and the next reviewer found the same material arriving through another.

| # | Layer | The door | Closed by |
|---|---|---|---|
| 1 | **generation** | `generateOne` gated grammar and subjects on `pool.ownOnly` but called `chooseSref()` unconditionally — 6 of 6 prompts carried a corpus code | `pool.ownOnly ? null : chooseSref(...)` |
| 2 | **the read API** | `access-control-allow-origin: '*'` made every read cross-origin readable to any page in the owner's browser | both ACAO headers deleted |
| 3 | **the event writer** | `validateEvent` accepted `provenance: 'midlibrary-reference'` candidates into a non-Sean memory | refused in `validateEvent` |
| 4 | **the compiler's output** | `tally()` bumped `t.srefs` regardless of witness, so her compiled profile, `proposedAvoids` and printed brief carried corpus codes — reachable both by pre-fix rows already on disk and by a candidate that lies about provenance while still carrying `sref` | style channel gated on `witness` |

**Assume there is a fifth.** Where? Candidate layers nobody has swept end to end: the bundle
export/import round trip, `taste-profile.json` as an input rather than an output, `intents.jsonl`,
the video path, the CLI (`swan-prompt.mjs`), `fetch-photos` / `fetch-renders`, or the served page's
own JavaScript.

## Everything else fixed this round (do not re-report)

`$&` in a kept prompt spliced the heading into the bullet · Sean's keep path had no length cap while
every project memory did · the event writer could `mkdir` a namespace the registry never created ·
a seed ≥ 2³² was recorded then silently truncated so the intent described a render nobody made ·
the same twin on `/api/prompt` · a thin pool dealt the same picture twice into one grid (38 of 60,
reproduced) · an unhandled ReadStream error killed the server mid-session · a malformed request
target threw outside the guard and killed the process · `comfyPost` followed redirects so a 302
could carry the captured ComfyUI graph off-machine · `pair` events were validated and stored, burned
their pictures out of the memory via never-show-twice, and were never compiled by `tally` · a kept
prompt could carry `--sref` into a non-Sean memory's `kept.md`.

**Deliberately NOT changed** (say so if you disagree, with reasoning): `applyTo` sets every detected
seed and prompt field in a captured graph, so two independently-tuned seeds move in lockstep — the
status now reports the field counts instead, because no graph is captured on this machine yet and
guessing which seed is "the" seed would silently change which renders come out. And a non-Sean
memory's directions are still labelled `tier: 'evidence'` off a single grid (Kimi argued for
requiring two); `witness` is threaded through `directions()` so it is a one-line change, but it
alters what the sales-practice brief shows after one round, which is the owner's call.

## Also worth attacking

- **Did any of the thirteen fixes break a legitimate flow?** Two of the first cuts did — banning
  every style code broke judging your own renders, and banning every `--parameter` broke keeping an
  ordinary generated prompt. Both were caught by the suites and narrowed. Look for a third.
- **A guard that cannot fire.** One fix shipped with a literal backspace (`0x08`) where `\b` was
  meant, so its regex never matched; it was caught only because the check for it was written as a
  negative test. Are there other guards that are present but inert?
- The taste maths: a judged render must count toward **subjects only** and **zero** toward style.
  Reversal must fully undo a tally.

## Ground truth

- **453 checks across 10 suites, all passing.** Suites resolve fixtures relative to the **repo root**.
- `prompter/test-round3.mjs` is the regression file; 24 of its checks fail against pre-fix code.
- Loopback-only, unauthenticated by design; local git repo, no remote.

---

# THE SOURCE (current)

## prompter/serve.mjs
```javascript
     1	#!/usr/bin/env node
     2	/**
     3	 * swan-prompt server — one implementation, four consumers.
     4	 *
     5	 *   node prompter/serve.mjs            → http://127.0.0.1:7331
     6	 *
     7	 * Consumers:
     8	 *   · browser      GET /                       a real page, no build step
     9	 *   · ComfyUI      GET /api/prompt             see comfyui/swan_prompt_node.py
    10	 *   · Hermes       GET /api/prompt             plain JSON, no auth dance
    11	 *   · anything     curl 127.0.0.1:7331/api/prompt
    12	 *
    13	 * BINDS TO 127.0.0.1 ONLY, deliberately. This process can WRITE to taste/ (rate, keep), so it
    14	 * is a local tool with no authentication. Binding 0.0.0.0 would expose an unauthenticated write
    15	 * endpoint to the network; if it ever needs to be remote, it needs auth first, not a wider bind.
    16	 */
    17	import http from 'node:http';
    18	import { readFileSync } from 'node:fs';
    19	import { execFileSync } from 'node:child_process';
    20	import path from 'node:path';
    21	import { fileURLToPath } from 'node:url';
    22	import { loadCorpus, VAULT } from './lib/corpus.mjs';
    23	import { loadTaste } from './lib/taste.mjs';
    24	import { generate } from './lib/generate.mjs';
    25	import { generateVideo } from './lib/video.mjs';
    26	import { checkWriteRequest } from './lib/origin.mjs';
    27	import { appendEvent, DEFAULT_PROFILE, DEFAULT_PROJECT, PROFILES, isProjectId } from './lib/events.mjs';
    28	import { handleModeRoutes, namespaceFrom } from './lib/routes-modes.mjs';
    29	import { handleRenderRoutes } from './lib/routes-renders.mjs';
    30	import { handleMakeRoutes } from './lib/routes-make.mjs';
    31	import { tasteFor, keepFor, unkeepFor } from './lib/taste-namespace.mjs';
    32	
    33	const HERE = path.dirname(fileURLToPath(import.meta.url));
    34	const PORT = Number(process.env.SWAN_PROMPT_PORT ?? 7331);
    35	const HOST = '127.0.0.1';
    36	
    37	/** Corpus is static; taste changes as Sean rates and keeps, so reload it per request. */
    38	const corpus = loadCorpus();
    39	
    40	const json = (res, code, body) => {
    41	  const payload = JSON.stringify(body);
    42	  res.writeHead(code, {
    43	    'content-type': 'application/json; charset=utf-8',
    44	    'content-length': Buffer.byteLength(payload),
    45	    // NO access-control-allow-origin. It used to be '*', justified as "ComfyUI is a different
    46	    // origin on the same host" — that justification was simply wrong: the ComfyUI consumer is
    47	    // comfyui/swan_prompt_node.py, which calls urllib.request. CORS is a BROWSER rule; Python
    48	    // ignores it entirely, so the header served no consumer. What it did serve was every page
    49	    // Sean's browser happens to open: a `file://` attachment or any plain-http page could
    50	    // `fetch('http://127.0.0.1:7331/api/prompt?n=50')` — a simple GET, no preflight — and read
    51	    // the licensed corpus (sref codes, style names, artist attributions) or the partner's private
    52	    // kept prompts, in bulk, in one pageload. REPRODUCED round-3 (GLM 5.3 blocker 1).
    53	    // The origin gate (lib/origin.mjs) hardened WRITES after an earlier panel and left this header
    54	    // standing, so reads stayed open. The page is same-origin and needs no CORS at all.
    55	  });
    56	  res.end(payload);
    57	};
    58	
    59	const readBody = (req) => new Promise((resolve, reject) => {
    60	  let raw = '';
    61	  req.on('data', (c) => {
    62	    raw += c;
    63	    if (raw.length > 64_000) { reject(new Error('body too large')); req.destroy(); }
    64	  });
    65	  req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('invalid json')); } });
    66	  req.on('error', reject);
    67	});
    68	
    69	/** Delegate writes to the CLI so there is exactly one implementation of "rate" and "keep". */
    70	function cli(args) {
    71	  return execFileSync(process.execPath, [path.join(HERE, 'swan-prompt.mjs'), ...args], {
    72	    encoding: 'utf8', timeout: 20_000,
    73	  }).trim();
    74	}
    75	
    76	const server = http.createServer(async (req, res) => {
    77	  // Parsed INSIDE the guard. A request-target the WHATWG parser rejects throws synchronously, and
    78	  // Node does not catch a throw from a request handler — it becomes an uncaught exception and the
    79	  // process exits, so one malformed line would end the session for all four tabs. A 400 is the
    80	  // correct answer to a request line we cannot parse. (round-3 panel, GLM 5.3 finding 11)
    81	  let url;
    82	  try {
    83	    url = new URL(req.url, `http://${HOST}:${PORT}`);
    84	  } catch {
    85	    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    86	    return res.end('bad request target');
    87	  }
    88	
    89	  // A preflight is only ever asked for by a CROSS-ORIGIN browser caller. The page is same-origin
    90	  // and ComfyUI's node is Python, so nothing legitimate preflights this server — answer 204 with
    91	  // no CORS headers at all, which fails the preflight and is exactly the intended outcome.
    92	  if (req.method === 'OPTIONS') {
    93	    res.writeHead(204, { 'content-length': 0 });
    94	    return res.end();
    95	  }
    96	
    97	  try {
    98	    // The PAGE is one shell with four tabs (Make · Judge · Directions · Kept), served by
    99	    // lib/routes-modes.mjs at `/` and at every legacy path (/probe → Judge, /brief → Directions), so old
   100	    // bookmarks land on the right tab and there is exactly ONE implementation of each surface.
   101	    // Pictures are CDN URLs the BROWSER loads; this process never fetches image bytes.
   102	
   103	    // /api/probe, /api/profile, /api/projects, /probe.js, the shell and its modules live in routes-modes:
   104	    // the same probe, addressed to one memory (profile × project). Sean's default is unchanged.
   105	
   106	    if (url.pathname === '/api/stats' && req.method === 'GET') {
   107	      const taste = loadTaste();
   108	      return json(res, 200, {
   109	        srefCodes: corpus.srefCount,
   110	        prompts: corpus.prompts.length,
   111	        artists: corpus.artists.length,
   112	        rated: taste.ratedCount,
   113	        endorsed: taste.positiveCount,
   114	        kept: taste.kept.length,
   115	        rejected: taste.rejectedSrefs.length,
   116	        confidence: taste.confidence,
   117	        warnings: taste.warnings,
   118	      });
   119	    }
   120	
   121	    if (url.pathname === '/api/prompt' && req.method === 'GET') {
   122	      // One memory's taste (lib/taste-namespace.mjs): Sean's markdown + his evidence codes, or a
   123	      // partner/client project's words, picks and kept prompts. ?profile=&project= — defaults to Sean.
   124	      const ns = namespaceFrom(url);
   125	      if (ns.error) return json(res, 400, { error: ns.error });
   126	      const taste = tasteFor({ ...ns, corpus });
   127	      if (!taste) return json(res, 404, { error: 'unknown project' });
   128	      const n = Math.min(50, Math.max(1, Number(url.searchParams.get('n') ?? 5) || 5));
   129	      const mode = url.searchParams.get('mode') === 'surprise' ? 'surprise' : 'taste';
   130	      const ar = /^\d{1,2}:\d{1,2}$/.test(url.searchParams.get('ar') ?? '') ? url.searchParams.get('ar') : '16:9';
   131	      const seedRaw = url.searchParams.get('seed');
   132	      // Bounded like the intent seed (renders.mjs): rngFrom() folds to 32 bits, so ?seed=4294967297
   133	      // and ?seed=1 drew the SAME batch while the response reported different seeds — two "different"
   134	      // recorded seeds naming one draw is the same lie the intent ceiling exists to stop.
   135	      // (round-3 panel, Kimi K3 P2)
   136	      const seed = seedRaw && /^\d+$/.test(seedRaw) && Number(seedRaw) <= 0xFFFFFFFF ? Number(seedRaw) : undefined;
   137	
   138	      let pool = corpus;
   139	      if (url.searchParams.get('cinematic') === '1') {
   140	        const sref = corpus.sref.filter((c) =>
   141	          /cinematic|film|movie|noir/i.test(`${c.source_title} ${c.style_name} ${c.example_prompt}`));
   142	        if (sref.length) pool = { ...corpus, sref };
   143	      }
   144	
   145	      const tasteMeta = { source: taste.tasteSource, evidenceSrefs: taste.evidenceSrefs, keywords: taste.keywords.length, kept: taste.kept.length, confidence: taste.confidence };
   146	      // medium=video → motion prompts from the SAME taste (lib/video.mjs). No Midjourney params: a video
   147	      // graph takes natural language, and aspect/length live in the ComfyUI graph, not in the sentence.
   148	      if (url.searchParams.get('medium') === 'video') {
   149	        let v;
   150	        try { v = generateVideo(pool, taste, { count: n, mode, seed }); } catch (err) {
   151	          return json(res, 200, { seed: null, mode, medium: 'video', profileId: ns.profile, projectId: ns.project, taste: tasteMeta, confidence: taste.confidence, exhausted: true, poolSize: 0, vetoed: 0, prompts: [], hint: String(err.message).split('\n')[0] });
   152	        }
   153	        return json(res, 200, {
   154	          seed: v.seed, mode, medium: 'video', profileId: ns.profile, projectId: ns.project, taste: tasteMeta,
   155	          confidence: taste.confidence, exhausted: v.exhausted, poolSize: v.poolSize, vetoed: v.drops?.vetoed ?? 0,
   156	          prompts: v.prompts.map((p) => ({ prompt: p.prompt, subject: p.subject, grammar: p.grammar, kind: 'video', camera: p.camera, motion: p.motion, sref: null, styleName: null, rating: null, isNew: false })),
   157	        });
   158	      }
   159	      let out;
   160	      try { out = generate(pool, taste, { count: n, mode, ar, seed }); } catch (err) {
   161	        // A fresh memory whose words reach nothing in the corpus is an honest empty, not a 500.
   162	        return json(res, 200, { seed: null, mode, profileId: ns.profile, projectId: ns.project, taste: tasteMeta, confidence: taste.confidence, exhausted: true, poolSize: 0, vetoed: 0, prompts: [], hint: String(err.message).split('\n')[0] });
   163	      }
   164	      return json(res, 200, {
   165	        seed: out.seed,
   166	        mode,
   167	        profileId: ns.profile, projectId: ns.project, taste: tasteMeta,
   168	        confidence: taste.confidence,
   169	        exhausted: out.exhausted,
   170	        poolSize: out.poolSize,
   171	        vetoed: out.drops?.vetoed ?? 0,
   172	        prompts: out.prompts.map((p) => ({
   173	          prompt: p.prompt,
   174	          subject: p.subject,
   175	          grammar: p.grammar,
   176	          sref: p.sref?.code ?? null,
   177	          styleName: p.sref?.style_name ?? null,
   178	          rating: p.sref?.rating ?? null,
   179	          isNew: Boolean(p.sref?.isNew),
   180	        })),
   181	      });
   182	    }
   183	
   184	    // Writes: refuse drive-by browser requests before reading a byte of body (lib/origin.mjs).
   185	    if (req.method === 'POST') {
   186	      const gate = checkWriteRequest(req.headers, PORT);
   187	      if (!gate.ok) return json(res, 403, { error: gate.reason });
   188	    }
   189	
   190	    // Namespace-aware routes (reads + the project write, which sits behind the gate above).
   191	    const base = `http://${HOST}:${PORT}`;
   192	    if (await handleModeRoutes({ url, req, res, json, readBody, here: HERE, base })) return;
   193	    // The render loop: POST /api/intent (gated above), GET /api/renders, GET /renders/<p>/<j>/<token>/<n>.
   194	    if (await handleRenderRoutes({ url, req, res, json, readBody, base })) return;
   195	    // "Make": queue renders in Sean's own ComfyUI graph (POST is gated above).
   196	    if (await handleMakeRoutes({ url, req, res, json, readBody })) return;
   197	
   198	    if (url.pathname === '/api/keep' && req.method === 'POST') {
   199	      const body = await readBody(req);
   200	      if (typeof body.prompt !== 'string' || body.prompt.split(/\s+/).length < 3) {
   201	        return json(res, 400, { error: 'prompt must be a string of at least 3 words' });
   202	      }
   203	      // The same 2000-char discipline keepFor() applies to every project memory. Sean's own branch
   204	      // below goes straight to the CLI and checked WORD COUNT only, so a 60 KB single "prompt"
   205	      // (under the 64 KB body cap) landed as one bullet in taste/kept.md and steered his generator
   206	      // from then on. Two keep channels must not have two validation contracts.
   207	      // (round-3 panel, GLM 5.3 finding 4)
   208	      if (body.prompt.length > 2000) return json(res, 400, { error: 'prompt must be ≤ 2000 chars' });
   209	      const profile = body.profileId ?? DEFAULT_PROFILE, project = body.projectId ?? DEFAULT_PROJECT;
   210	      // Route-level slug validation (defence in depth; readProject/eventsDirFor already refuse bad ids).
   211	      if (!PROFILES.includes(profile) || !isProjectId(project)) return json(res, 400, { error: 'profileId/projectId must name a memory (slugs only)' });
   212	      if (!(profile === DEFAULT_PROFILE && project === DEFAULT_PROJECT)) {
   213	        // A partner/client memory keeps into its own kept.md — never into Sean's.
   214	        const r = keepFor(profile, project, body.prompt);
   215	        return json(res, r.ok ? 200 : 400, r.ok ? { ok: true, duplicate: r.duplicate, message: r.duplicate ? 'Already kept.' : `Kept. ${r.kept} exemplar${r.kept === 1 ? '' : 's'} now steering ${profile}/${project}.` } : { error: r.error });
   216	      }
   217	      return json(res, 200, { ok: true, message: cli(['--keep', body.prompt]) });
   218	    }
   219	
   220	    if (url.pathname === '/api/unkeep' && req.method === 'POST') {
   221	      const body = await readBody(req);
   222	      const profile = body.profileId ?? DEFAULT_PROFILE, project = body.projectId ?? DEFAULT_PROJECT;
   223	      if (!PROFILES.includes(profile) || !isProjectId(project)) return json(res, 400, { error: 'profileId/projectId must name a memory (slugs only)' });
   224	      const r = unkeepFor(profile, project, body.prompt);
   225	      return json(res, r.ok ? 200 : 400, r);
   226	    }
   227	
   228	    if (url.pathname === '/api/rate' && req.method === 'POST') {
   229	      const body = await readBody(req);
   230	      if (body.profileId && !(body.profileId === DEFAULT_PROFILE && (body.projectId ?? DEFAULT_PROJECT) === DEFAULT_PROJECT)) {
   231	        return json(res, 400, { error: "star ratings are Sean's markdown channel — a project's taste comes from the pictures it judges" });
   232	      }
   233	      const code = String(body.code ?? '');
   234	      const rating = Number(body.rating);
   235	      if (!/^\d{5,12}$/.test(code)) return json(res, 400, { error: 'code must be 5-12 digits' });
   236	      if (!(rating >= 1 && rating <= 5)) return json(res, 400, { error: 'rating must be 1-5' });
   237	      const note = typeof body.note === 'string' ? body.note.slice(0, 200) : '';
   238	      return json(res, 200, { ok: true, message: cli(['--rate', code, String(rating), note]) });
   239	    }
   240	
   241	    // THE single writer of taste/events/*.jsonl. grill-me and every agent POST here; nobody
   242	    // opens the file. Validation + provenance refusal + idempotency live in lib/events.mjs.
   243	    if (url.pathname === '/api/event' && req.method === 'POST') {
   244	      const body = await readBody(req);
   245	      const r = appendEvent(body);
   246	      return json(res, r.ok ? 200 : 400, r);
   247	    }
   248	
   249	    return json(res, 404, { error: 'not found', routes: ['/', '/probe', '/brief', '/api/prompt', '/api/probe', '/api/profile', '/api/projects', '/api/judged', '/api/stats', '/api/keep', '/api/rate', '/api/event', '/api/intent', '/api/renders', '/api/make', '/api/make/status', '/renders/<profile>/<project>/<token>/<n>'] });
   250	  } catch (err) {
   251	    return json(res, 500, { error: String(err.message).slice(0, 200) });
   252	  }
   253	});
   254	
   255	server.listen(PORT, HOST, () => {
   256	  const t = loadTaste();
   257	  console.log(`\nswan-prompt  →  http://${HOST}:${PORT}`);
   258	  console.log(`  corpus : ${corpus.srefCount} sref codes · ${corpus.prompts.length} prompts · ${corpus.artists.length} artists`);
   259	  console.log(`  taste  : ${t.kept.length} kept · ${t.ratedCount} rated (${t.positiveCount} endorsed) · confidence ${t.confidence}`);
   260	  if (t.warnings.length) t.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
   261	  console.log(`\n  page     http://${HOST}:${PORT}/`);
   262	  console.log(`  probe    http://${HOST}:${PORT}/probe      ← Taste Discovery: 12 pictures, pick closest/miss (mode bar: Sean · Partner · Client)`);
   263	  console.log(`  brief    http://${HOST}:${PORT}/brief      ← the readout for one memory (?profile=&project=)`);
   264	  console.log(`  api      curl '${`http://${HOST}:${PORT}/api/prompt?n=3&mode=surprise`}'`);
   265	  console.log(`  vault    ${VAULT}\n`);
   266	});
```

## prompter/lib/events.mjs
```javascript
     1	/**
     2	 * events.mjs — TasteEvent v1: the append-only record of what Sean actually chose.
     3	 *
     4	 * This file is the one asset the taste brain cannot rewrite later (Ox Alpha, panel 2026-08-25:
     5	 * "every downstream model inherits that poison permanently"). Hence:
     6	 *   · schemaVersion on every line, so v2 rows are distinguishable from v1 without guessing;
     7	 *   · eventType discriminator, so a 12-up grid is one event, never ~66 fabricated pair wins;
     8	 *   · source is an ENUM and production refuses anything but a human witness writing its OWN
     9	 *     profile — an agent cannot launder its own prose into "his taste" (P0-6 quarantine, enforced
    10	 *     at write time, not by a TS type), and Sean's picks can never land in the partner's memory;
    11	 *   · eventId is a content hash → a double-click or refresh cannot double-log a win;
    12	 *   · candidates are IDs + URLs, never bytes. A data: URL is refused. Nothing here can carry an
    13	 *     image out of the machine (Midlibrary licence containment);
    14	 *   · notePrivate never leaves disk — it is stored, never exported (export-to-hermes must skip it).
    15	 *
    16	 * SINGLE WRITER: only serve.mjs calls appendEvent. grill-me and every other agent POST to the
    17	 * server; nobody opens the JSONL directly. Two appenders on one file corrupt it silently.
    18	 */
    19	import fs from 'node:fs';
    20	import path from 'node:path';
    21	import { createHash } from 'node:crypto';
    22	import { VAULT } from './corpus.mjs';
    23	
    24	export const SCHEMA_VERSION = 1;
    25	export const EVENTS_DIR = path.join(VAULT, 'taste', 'events');
    26	export const EVENT_TYPES = ['pair', 'grid-selection', 'kept-triage', 'shipped-outcome', 'reversal'];
    27	// 'imported' / 'inferred' were removed 2026-08-25 (panel round 2): a bundle import writes as its human witness with
    28	// channel 'bundle'; a dead enum value in a witness law is drift bait.
    29	export const SOURCES = ['sean', 'partner', 'client', 'agent-placeholder'];
    30	/**
    31	 * Human witnesses = the profiles a memory can belong to (Sean 2026-08-25: partner mode for the
    32	 * household, client mode for sales practice and real clients). A namespace is owned by exactly
    33	 * one witness and `source` must be that witness. Sean's original memory is the implicit
    34	 * `sean/default` namespace at taste/events/ — it is not moved and nothing else is mixed into it.
    35	 */
    36	export const PROFILES = ['sean', 'partner', 'client'];
    37	export const DEFAULT_PROFILE = 'sean';
    38	export const DEFAULT_PROJECT = 'default';
    39	/** How a judgement arrived: the loopback page, or a static bundle judged on her own machine. */
    40	export const CHANNELS = ['page', 'bundle'];
    41	export const MEDIA = ['web', 'still', 'film'];
    42	export const BRAND_CONTEXTS = ['swan-product', 'swan-marketing', 'general'];
    43	export const RESPONSES = ['A', 'B', 'both', 'neither', 'depends', 'skip'];
    44	export const VERDICTS = ['closest', 'miss', 'neutral'];
    45	export const OUTCOMES = ['content', 'style', 'execution', 'brand-law', 'mixed'];
    46	export const REASONS = ['light', 'composition', 'realism', 'material', 'palette', 'subject',
    47	  'typography', 'motion', 'pacing', 'density', 'edit-rhythm', 'sound', 'other'];
    48	export const GENERATORS = ['midjourney', 'local-comfy', 'midlibrary-reference', 'reference-mix'];
    49	export const PROVENANCES = ['midlibrary-reference', 'esa-webb-ccby', 'nasa-public-domain', 'unsplash', 'pexels', 'midjourney', 'local-comfy'];
    50	
    51	const SESSION_ID = /^[a-f0-9]{8,32}$/;
    52	/** A project slug names a design, never a person or a school (the partner lane's ONE RULE boundary). */
    53	const PROJECT_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
    54	export const isProjectId = (s) => PROJECT_ID.test(String(s ?? ''));
    55	export const profileOf = (e) => e?.profileId ?? DEFAULT_PROFILE;
    56	export const projectOf = (e) => e?.projectId ?? DEFAULT_PROJECT;
    57	const MAX_STR = 2000;
    58	const BYTES_RE = /data:image|base64,/i;
    59	
    60	const allowNonSean = () => process.env.SWAN_TASTE_ALLOW_NONSEAN === '1';
    61	
    62	/** @returns {{ ok: boolean, errors: string[] }} */
    63	export function validateEvent(e) {
    64	  const errors = [];
    65	  const need = (cond, msg) => { if (!cond) errors.push(msg); };
    66	  need(e && typeof e === 'object', 'event must be an object');
    67	  if (errors.length) return { ok: false, errors };
    68	  need(e.schemaVersion === SCHEMA_VERSION, `schemaVersion must be ${SCHEMA_VERSION}`);
    69	  need(EVENT_TYPES.includes(e.eventType), `eventType must be one of ${EVENT_TYPES.join('|')}`);
    70	  need(SOURCES.includes(e.source), `source must be one of ${SOURCES.join('|')}`);
    71	  if (e.profileId !== undefined) need(PROFILES.includes(e.profileId), `profileId must be one of ${PROFILES.join('|')}`);
    72	  if (e.projectId !== undefined) need(isProjectId(e.projectId), 'projectId must be a slug (a-z, 0-9, hyphens, ≤40) — never a name');
    73	  if (e.channel !== undefined) need(CHANNELS.includes(e.channel), `channel must be one of ${CHANNELS.join('|')}`);
    74	  if (PROFILES.includes(e.source)) {
    75	    need(e.source === profileOf(e), `source '${e.source}' cannot write into profile '${profileOf(e)}' — a witness writes only its own memory`);
    76	  } else if (SOURCES.includes(e.source)) {
    77	    // Non-human sources exist for fixtures only, under the test flag, and only in sean/default —
    78	    // never in a household memory (panel 2026-08-25: the flag predated multi-profile).
    79	    if (!allowNonSean()) errors.push(`source '${e.source}' refused: only a human witness (${PROFILES.join('|')}) may write in production`);
    80	    else if (!(profileOf(e) === DEFAULT_PROFILE && projectOf(e) === DEFAULT_PROJECT)) errors.push(`source '${e.source}' may never write into ${profileOf(e)}/${projectOf(e)}`);
    81	  }
    82	  need(SESSION_ID.test(String(e.sessionId ?? '')), 'sessionId must be opaque hex (8-32 chars)');
    83	  need(typeof e.presentedAt === 'string' && !Number.isNaN(Date.parse(e.presentedAt)), 'presentedAt must be an ISO date');
    84	  need(MEDIA.includes(e.medium), `medium must be one of ${MEDIA.join('|')}`);
    85	  need(BRAND_CONTEXTS.includes(e.brandContext), `brandContext must be one of ${BRAND_CONTEXTS.join('|')}`);
    86	  need(GENERATORS.includes(e.generatorDistribution), `generatorDistribution must be one of ${GENERATORS.join('|')}`);
    87	  need(Array.isArray(e.candidates) && e.candidates.length > 0, 'candidates must be a non-empty array');
    88	  const ids = new Set();
    89	  for (const c of e.candidates || []) {
    90	    need(c && typeof c.id === 'string' && c.id.length > 0, 'candidate.id required');
    91	    if (c?.url !== undefined) need(/^https?:\/\//.test(c.url) && !BYTES_RE.test(c.url), 'candidate.url must be http(s), never bytes');
    92	    if (c?.provenance !== undefined) need(PROVENANCES.includes(c.provenance), `candidate.provenance must be one of ${PROVENANCES.join('|')}`);
    93	    // The witness law binds WHO writes; nothing bound WHAT CATALOGUE the candidates may name. A
    94	    // crafted event, an agent, or a buggy bundle importer could therefore write a
    95	    // `midlibrary-reference` candidate — sref code and all — into a partner or client memory.
    96	    // profile.mjs filters t.picks by shareable provenance for a non-Sean memory, but t.srefs is NOT
    97	    // filtered, so the corpus code still ranked and evidenceLoved promoted it into her directions.
    98	    // Same blind spot as the artist/sref fixes: the pictures were guarded, the style codes were not.
    99	    // Events are the one asset that is never rewritten, so this has to be refused at the writer.
   100	    // (round-3 panel, Ox Alpha P1 — independent of GLM's two P0s)
   101	    if (c?.provenance === 'midlibrary-reference' && profileOf(e) !== DEFAULT_PROFILE) {
   102	      errors.push(`candidate ${c.id}: midlibrary-reference may never enter ${profileOf(e)}/${projectOf(e)} — the corpus is the owner's alone`);
   103	    }
   104	    // ...and the code itself, whatever the candidate CLAIMS its provenance is. Checking provenance
   105	    // alone was bypassable in one field: `{ provenance: 'unsplash', sref: '123456789' }` passed and
   106	    // still bumped the style tally. A sref IS the catalogue identifier, so a shareable picture has no
   107	    // business carrying one. (round-3 panel, Kimi K3 P0 — the hole in the fix directly above.)
   108	    // ...EXCEPT on her own render. A `local-comfy` candidate is a picture SHE made, and its sref is
   109	    // her own intent's, so refusing it broke judging your own renders — the core of the render loop.
   110	    // Safe to allow: tally() hits `if (generated) continue` BEFORE the style bump, so a render's code
   111	    // never reaches the style tallies anyway. (Caught by test-renders when the first cut was blanket.)
   112	    if (c?.sref !== undefined && c?.sref !== null && profileOf(e) !== DEFAULT_PROFILE && c?.provenance !== 'local-comfy') {
   113	      errors.push(`candidate ${c.id}: a style code may never enter ${profileOf(e)}/${projectOf(e)}`);
   114	    }
   115	    if (c?.id) ids.add(c.id);
   116	  }
   117	  const raw = JSON.stringify(e);
   118	  need(!BYTES_RE.test(raw), 'image bytes are refused in events');
   119	  need(raw.length < 64_000, 'event too large');
   120	  for (const k of ['notePublic', 'notePrivate', 'dependsContext']) {
   121	    if (e[k] !== undefined) need(typeof e[k] === 'string' && e[k].length <= MAX_STR, `${k} must be a string ≤ ${MAX_STR} chars`);
   122	  }
   123	  if (e.eventType === 'pair') {
   124	    need(RESPONSES.includes(e.response), `response must be one of ${RESPONSES.join('|')}`);
   125	    need(OUTCOMES.includes(e.outcomeClass), 'outcomeClass required on pair events');
   126	    if (e.reasonCode !== undefined) need(REASONS.includes(e.reasonCode), 'reasonCode not in enum');
   127	    if (e.response === 'depends') need(typeof e.dependsContext === 'string' && e.dependsContext.length > 0, 'dependsContext required when response is depends');
   128	  }
   129	  if (e.eventType === 'grid-selection') {
   130	    need(Array.isArray(e.items) && e.items.length === (e.candidates || []).length, 'grid items must cover every candidate');
   131	    for (const it of e.items || []) {
   132	      need(ids.has(it?.id), 'grid item id must be a candidate id');
   133	      need(VERDICTS.includes(it?.verdict), 'grid item verdict must be closest|miss|neutral');
   134	      if (it?.verdict !== 'neutral') {
   135	        need(REASONS.includes(it?.reasonCode), 'reasonCode required on closest/miss items');
   136	        need(OUTCOMES.includes(it?.outcomeClass), 'outcomeClass required on closest/miss items');
   137	        need(it?.reasonLockedBeforeReveal === true, 'reason must be locked before the label is revealed');
   138	      }
   139	    }
   140	  }
   141	  if (e.eventType === 'reversal') {
   142	    need(/^[a-f0-9]{24}$/.test(String(e.reversalOf ?? '')), 'reversalOf must be the 24-hex eventId being undone');
   143	  }
   144	  return { ok: errors.length === 0, errors };
   145	}
   146	
   147	/** Events minus those a later `reversal` undid — the compiler and the never-show-twice set read only these. */
   148	export function activeEvents(events) {
   149	  const reversed = new Set(events.filter((e) => e.eventType === 'reversal' && e.reversalOf).map((e) => e.reversalOf));
   150	  return events.filter((e) => e.eventType !== 'reversal' && !reversed.has(e.eventId));
   151	}
   152	
   153	/** Idempotent id: same session, same candidates, same presentation → same id. */
   154	export function eventIdFor(e) {
   155	  const ids = (e.candidates || []).map((c) => c.id).sort().join(',');
   156	  return createHash('sha256').update(`${e.sessionId}|${e.eventType}|${ids}|${e.presentedAt}`).digest('hex').slice(0, 24);
   157	}
   158	
   159	export function readEvents(dir = EVENTS_DIR) {
   160	  if (!fs.existsSync(dir)) return [];
   161	  const out = [];
   162	  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.jsonl')).sort()) {
   163	    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
   164	      if (!line.trim()) continue;
   165	      try { out.push(JSON.parse(line)); } catch { out.push({ _corrupt: true, file: f }); }
   166	    }
   167	  }
   168	  return out;
   169	}
   170	
   171	/** Where a namespace keeps its events. Sean's default memory stays exactly where it always was. */
   172	export function eventsDirFor(profile = DEFAULT_PROFILE, project = DEFAULT_PROJECT) {
   173	  if (profile === DEFAULT_PROFILE && project === DEFAULT_PROJECT) return EVENTS_DIR;
   174	  if (!PROFILES.includes(profile) || !isProjectId(project)) throw new Error(`invalid namespace ${profile}/${project}`);
   175	  return path.join(VAULT, 'taste', 'profiles', profile, project, 'events');
   176	}
   177	export const readEventsFor = (profile, project) => readEvents(eventsDirFor(profile, project));
   178	
   179	/** Every picture a namespace has already judged — one memory never sees the same picture twice. An undone grid frees its pictures. */
   180	export function judgedIds(events) {
   181	  const ids = new Set();
   182	  for (const e of activeEvents(events)) for (const c of e.candidates || []) if (c?.id) ids.add(c.id);
   183	  return [...ids];
   184	}
   185	
   186	/**
   187	 * Validate, stamp, dedupe, append. Returns { ok, eventId, duplicate } or { ok:false, errors }.
   188	 * One file per session so parallel sessions never share a file. The directory is derived from the
   189	 * event's own namespace (profileId/projectId) — a caller cannot aim an event at another memory.
   190	 */
   191	export function appendEvent(e, dir) {
   192	  const v = validateEvent(e);
   193	  if (!v.ok) return { ok: false, errors: v.errors };
   194	  if (dir === undefined) {
   195	    // The event writer must not be able to INVENT a memory. `mkdirSync(recursive)` below happily
   196	    // created taste/profiles/<profile>/<any-slug>/events/ for a namespace the project registry had
   197	    // never heard of: every read then refused it and /api/projects never listed it, so the
   198	    // judgements sat on disk invisible — and went live the moment someone created a real project
   199	    // with that slug. Reads cannot invent a namespace; the writer could. (round-3, GLM 5.3 #5)
   200	    // Checked with fs rather than readProject() to avoid a projects.mjs <-> events.mjs import cycle.
   201	    // An explicitly-passed `dir` stays the documented test seam and is unaffected.
   202	    const isDefault = profileOf(e) === DEFAULT_PROFILE && projectOf(e) === DEFAULT_PROJECT;
   203	    if (!isDefault) {
   204	      const pj = path.join(path.dirname(eventsDirFor(profileOf(e), projectOf(e))), 'project.json');
   205	      if (!fs.existsSync(pj)) return { ok: false, errors: [`unknown memory ${profileOf(e)}/${projectOf(e)} — create the project first`] };
   206	    }
   207	  }
   208	  dir = dir ?? eventsDirFor(profileOf(e), projectOf(e));
   209	  const eventId = eventIdFor(e);
   210	  fs.mkdirSync(dir, { recursive: true });
   211	  const file = path.join(dir, `${e.sessionId}.jsonl`);
   212	  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(`"eventId":"${eventId}"`)) {
   213	    return { ok: true, eventId, duplicate: true };
   214	  }
   215	  // The never-show-twice law lives at the WRITER, not only at presentation (panel 2026-08-25): a grid
   216	  // whose pictures this memory already judged — from the page, a bundle planned before those grids, or
   217	  // a replay with a fresh timestamp — is refused, never counted twice. Undo the earlier grid first.
   218	  const existing = readEvents(dir);
   219	  if (e.eventType === 'grid-selection' || e.eventType === 'pair') {   // every judgement kind, not only grids (panel round 2)
   220	    const seen = new Set(judgedIds(existing));
   221	    const again = (e.candidates || []).filter((c) => seen.has(c.id)).length;
   222	    if (again) return { ok: false, errors: [`refused: ${again} of these pictures were already judged in this memory (never-show-twice) — undo that judgement first`] };
   223	  }
   224	  if (e.eventType === 'reversal') {
   225	    if (!existing.some((x) => x.eventId === e.reversalOf && x.eventType !== 'reversal')) return { ok: false, errors: ['reversalOf does not name a judgement in this memory'] };
   226	    if (existing.some((x) => x.eventType === 'reversal' && x.reversalOf === e.reversalOf)) return { ok: true, eventId, duplicate: true, note: 'already undone' };
   227	  }
   228	  // A `pair` that gets this far would be WRITTEN — and writing it is pure loss. judgedIds() counts
   229	  // the candidates of every active event, so the pictures are burned out of this memory forever by
   230	  // never-show-twice, while tally() skips anything that is not a grid-selection, so the opinion is
   231	  // never counted. The visible symptom is a pool that exhausts early for no reason. No surface emits
   232	  // pairs today (grepped: no page, no lib, no CLI), so refusing costs nothing and stops the silent
   233	  // loss; validateEvent still accepts the shape, and the schema and its tests stay intact, so
   234	  // compiling pairs remains a feature someone can land later.
   235	  // Placed AFTER never-show-twice on purpose: an already-judged pair keeps its more specific error.
   236	  // (round-3 panel — GLM 5.3 finding 9 and Ox Alpha P2, independently)
   237	  if (e.eventType === 'pair') {
   238	    return { ok: false, errors: ['pair judgements are not compiled yet — recording one would burn these pictures out of this memory without counting the opinion'] };
   239	  }
   240	  const line = JSON.stringify({ ...e, eventId, recordedAt: new Date().toISOString() });
   241	  fs.appendFileSync(file, line + '\n', 'utf8');
   242	  return { ok: true, eventId, duplicate: false };
   243	}
```

## prompter/lib/generate.mjs
```javascript
     1	/**
     2	 * Prompt synthesis.
     3	 *
     4	 * Method: Sean's themes act as a semantic filter over 4,000+ prompts a working professional
     5	 * actually ran. We borrow REAL grammar and REAL parameter habits from that corpus, then steer
     6	 * subject and style selection with taste. That is why output reads like a practitioner wrote it
     7	 * rather than like a model guessing what a prompt sounds like.
     8	 */
     9	import { GRAMMAR, PARAM_COMBOS, subjectOf, weightedPick } from './corpus.mjs';
    10	import { tasteScore, tasteScoreDetail } from './taste.mjs';
    11	
    12	/** Deterministic seeded RNG (mulberry32) so a prompt Sean liked can be reproduced exactly. */
    13	export function rngFrom(seed) {
    14	  let a = seed >>> 0;
    15	  return () => {
    16	    a = (a + 0x6d2b79f5) >>> 0;
    17	    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    18	    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    19	    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    20	  };
    21	}
    22	const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
    23	
    24	/**
    25	 * Rank candidate subjects by fit to taste, and record why anything was dropped.
    26	 *
    27	 * Sean's kept prompts are seeded in FIRST and at high weight. That is the compounding channel:
    28	 * without it, "filling the brain" only reweights which style code decorates a subject that was
    29	 * chosen from somebody else's corpus, and the pool of ideas never becomes his.
    30	 */
    31	export function candidatePool(corpus, taste, mode) {
    32	  const seen = new Set();
    33	  const drops = { tooShort: 0, vetoed: 0, offTaste: 0, byKeyword: new Map() };
    34	
    35	  // A NON-SEAN memory generates from its OWN material only (taste-namespace.ownSubjects): kept prompts,
    36	  // the titles of pictures it chose, its theme words. Falling through to the Midlibrary corpus handed a
    37	  // partner or client subjects out of Sean's licensed personal archive — measured 2026-08-25: an
    38	  // "ocean, forest light" memory produced "rick and morty" and a cyberpunk hacker. Wrong on licence and
    39	  // wrong on product: her memory must be about what she asked for.
    40	  if (Array.isArray(taste.ownSubjects)) {
    41	    const own = taste.ownSubjects.filter((s) => !tasteScoreDetail(s.subject, taste).vetoedBy.length);
    42	    const pool = own.slice().sort((a, b) => b.score - a.score);
    43	    pool.drops = drops;
    44	    pool.keptCount = own.filter((s) => s.isKept).length;
    45	    pool.ownOnly = true;
    46	    return pool;
    47	  }
    48	
    49	  const keptEntries = (taste.kept || []).map((k) => ({
    50	    prompt: k,
    51	    subject: subjectOf(k),
    52	    source_doc: 'taste/kept.md',
    53	    source_url: null,
    54	    isKept: true,
    55	    score: 1000,                 // dominates corpus scores; kept work is the strongest signal there is
    56	  })).filter((k) => k.subject.split(/\s+/).length >= 3);
    57	
    58	  const scored = corpus.prompts
    59	    .map((p) => {
    60	      const subject = subjectOf(p.prompt);
    61	      const d = tasteScoreDetail(subject, taste);
    62	      return { ...p, subject, score: d.score, vetoedBy: d.vetoedBy, isKept: false };
    63	    })
    64	    .filter((p) => {
    65	      if (p.subject.split(/\s+/).length < 3) { drops.tooShort++; return false; }
    66	      if (p.vetoedBy.length) {
    67	        drops.vetoed++;
    68	        for (const k of p.vetoedBy) drops.byKeyword.set(k, (drops.byKeyword.get(k) || 0) + 1);
    69	        return false;
    70	      }
    71	      // Caption fragments that only read as prompts in their original context:
    72	      // a leading connective ("as Martin Schoeller's photograph of…") or a bare camera technique
    73	      // ("Ultra wide lens") is a modifier, not a subject to build an image around.
    74	      if (/^(as|and|or|but|with|of|for|also|then|plus)\b/i.test(p.subject)) return false;
    75	      if (/^(ultra[- ]wide|close[- ]up|wide|macro|telephoto|low angle|high angle|aerial|bokeh|shallow)\b/i.test(p.subject)
    76	          && p.subject.split(/\s+/).length <= 5) return false;
    77	      // The archive repeats the same prompt across version comparisons (V4 vs V5 vs V6), so an
    78	      // undeduped pool silently weights those subjects several times over.
    79	      const k = p.subject.toLowerCase();
    80	      if (seen.has(k)) return false;
    81	      seen.add(k);
    82	      return true;
    83	    });
    84	
    85	  // Anything that positively matches a theme. This is the envelope for BOTH modes:
    86	  // Sean asked for "random images based off of my themes", so surprise must stay theme-anchored.
    87	  // Admitting score-0 prompts (as an earlier version did) made surprise mode a corpus-wide
    88	  // shuffle that produced kids-cartoon and packaging prompts — random, but not his.
    89	  const onTaste = scored.filter((p) => p.score > 0);
    90	  drops.offTaste = scored.length - onTaste.length;
    91	
    92	  // Kept work always survives the taste cut — it is his by definition.
    93	  const pool = [...keptEntries, ...onTaste].sort((a, b) => b.score - a.score);
    94	  pool.drops = drops;
    95	  pool.keptCount = keptEntries.length;
    96	
    97	  if (mode === 'surprise') return pool;                 // full theme envelope, sampled flat
    98	  const top = pool.slice(0, Math.max(40, pool.length >> 1));   // taste mode hugs the top half
    99	  top.drops = drops;
   100	  top.keptCount = keptEntries.filter((k) => top.includes(k)).length;
   101	  return top;
   102	}
   103	
   104	/**
   105	 * Explore/exploit balance.
   106	 *
   107	 * Sean's goal is a brain that keeps getting more like him as he feeds it. That requires
   108	 * continually surfacing UNRATED codes he might love — if the generator only ever used codes he
   109	 * has already rated, rating two codes would lock him out of the other 221 and the brain would
   110	 * stop growing the moment it started. So exploration decays as taste accumulates but never
   111	 * reaches zero: even a well-taught brain keeps offering discoveries.
   112	 *
   113	 *   0 rated → 1.00 explore      10 rated → 0.50      20+ rated → 0.25 floor
   114	 */
   115	const exploreRate = (positiveCount) => Math.max(0.25, 1 - positiveCount / 20);
   116	
   117	/** Endorsement weight. `rating ** 2` gave a 1-star code weight 1, so a style Sean actively
   118	 *  disliked kept being emitted unless he ALSO hand-copied it into the rejected list — two channels
   119	 *  where one should do. Only 3+ endorses; 1-2 stars carry zero weight. */
   120	const endorsement = (rating) => Math.max(0, rating - 2) ** 2;
   121	
   122	/** Choose an SREF code: exploit Sean's endorsements, or explore theme-matched unjudged codes. */
   123	function chooseSref(corpus, taste, rng, mode) {
   124	  const rejected = new Set(taste.rejectedSrefs);
   125	  const judged = new Set(taste.loved.map((l) => l.code));
   126	
   127	  const exploitPool = taste.loved
   128	    .filter((l) => !rejected.has(l.code) && endorsement(l.rating) > 0)
   129	    .map((l) => ({ ...l, weight: endorsement(l.rating) }));
   130	
   131	  const exploiting = exploitPool.length > 0 && rng() > exploreRate(taste.positiveCount);
   132	  if (exploiting) {
   133	    const c = weightedPick(exploitPool, rng);
   134	    return { code: c.code, style_name: c.style_name, source: 'taste', rating: c.rating, isNew: false };
   135	  }
   136	
   137	  // Explore: theme-matched codes Sean has not judged yet. These are the rating candidates.
   138	  const pool = corpus.sref
   139	    .filter((c) => !rejected.has(c.code) && !judged.has(c.code))
   140	    .map((c) => ({ ...c, score: tasteScore(`${c.style_name || ''} ${c.example_prompt || ''}`, taste) }));
   141	  if (!pool.length) {   // every code judged or rejected — fall back to what he endorsed
   142	    if (!exploitPool.length) {
   143	      const any = corpus.sref.filter((c) => !rejected.has(c.code));
   144	      const c = pick(any.length ? any : corpus.sref, rng);
   145	      return { code: c.code, style_name: c.style_name, source: 'fallback', rating: null, isNew: false };
   146	    }
   147	    const c = weightedPick(exploitPool, rng);
   148	    return { code: c.code, style_name: c.style_name, source: 'taste', rating: c.rating, isNew: false };
   149	  }
   150	  const good = pool.filter((c) => c.score > 0);
   151	  const chosen = pick(good.length ? good : pool, rng);
   152	  return { code: chosen.code, style_name: chosen.style_name, source: 'theme-match', rating: null, isNew: true };
   153	}
   154	
   155	function buildParams(rng, mode, sref) {
   156	  const combo = mode === 'surprise'
   157	    ? { params: rng() < 0.5 ? ['chaos', 'v'] : ['sref'] }
   158	    : weightedPick(PARAM_COMBOS, rng);
   159	
   160	  const out = [];
   161	  const wants = new Set(combo.params);
   162	  if (sref) wants.add('sref');
   163	  // --niji and --v are mutually exclusive model selectors.
   164	  if (wants.has('niji')) wants.delete('v');
   165	
   166	  for (const p of wants) {
   167	    switch (p) {
   168	      case 'v': out.push('--v 7'); break;
   169	      case 'niji': out.push('--niji 6'); break;
   170	      case 'sref': if (sref) out.push(`--sref ${sref.code}`); break;
   171	      case 'stylize': out.push(`--stylize ${pick([50, 100, 250, 500, 750], rng)}`); break;
   172	      case 'chaos': out.push(`--chaos ${mode === 'surprise' ? pick([25, 40, 60, 80], rng) : pick([0, 10, 20], rng)}`); break;
   173	      case 'style': out.push('--style raw'); break;
   174	      case 'iw': break; // image weight needs an image reference; skip in text-only generation
   175	      default: break;
   176	    }
   177	  }
   178	  if (!out.some((o) => o.startsWith('--v') || o.startsWith('--niji'))) out.push('--v 7');
   179	  return out;
   180	}
   181	
   182	/** Assemble one prompt. `pool` is built once per batch by generate() — building it here would
   183	 *  rescore the whole corpus for every prompt, which made large batches hang. */
   184	export function generateOne(corpus, taste, opts, rng, pool) {
   185	  const { ar = '16:9', mode = 'taste' } = opts;
   186	  // Weighted, not uniform. Scoring a kept prompt highly only sorted it to the front of the pool —
   187	  // selection still drew uniformly, so Sean's own work appeared about as often as any corpus line.
   188	  // Weighting is what makes the brain compound: as kept work accumulates it crowds out the corpus.
   189	  // MEASURED 2026-08-22 (10 seeds × 40 prompts, taste mode, lineage counted), not estimated —
   190	  // the earlier "~25% / ~70%" figures here were guesses and were repeated into a handoff as fact:
   191	  //   3 kept  →  7.5% of prompts built on his own
   192	  //  20 kept  →  50%
   193	  const seedPrompt = weightedPick(
   194	    pool.map((p) => ({ ...p, weight: p.isKept ? 12 : 1 + Math.min(p.score, 8) / 4 })),
   195	    rng,
   196	  );
   197	  // An own-material pool never borrows an ARTIST from the corpus: a real person's name lifted out of
   198	  // Sean's licensed archive has nothing to do with her taste, and it is corpus text reaching a non-owner.
   199	  const grammar = pool.ownOnly ? 'descriptive' : weightedPick(GRAMMAR, rng).shape;
   200	  // ...and it never borrows a STYLE CODE either. chooseSref() scores the whole `corpus.sref`
   201	  // catalogue; for an own-material memory `taste.loved` is empty, so it ALWAYS fell to the explore
   202	  // path, returned a Midlibrary code + style_name, and buildParams wrote it into the text as
   203	  // `--sref <code>`. MEASURED on a partner memory whose words were "ocean, forest light":
   204	  // 6 of 6 generated prompts carried a corpus code (round-3 panel, GLM 5.3 blocker 2, reproduced).
   205	  // The artist fix stopped at prose and left the parameter open — the same defect class, second door.
   206	  // A sref IS corpus material: it is the catalogue's index into Sean's licensed archive.
   207	  const sref = pool.ownOnly ? null : chooseSref(corpus, taste, rng, mode);
   208	
   209	  let subject = seedPrompt.subject;
   210	  // Trim a trailing "by <artist>" so we control attribution explicitly per grammar shape.
   211	  const byMatch = /^(.+?)\s+by\s+([A-Z][\w'’.\- ]{2,40})$/.exec(subject);
   212	  const bareSubject = byMatch ? byMatch[1].trim() : subject;
   213	  const seedArtist = byMatch ? byMatch[2].trim() : null;
   214	
   215	  // Some corpus entries are "<Subject> by <Artist>" where the subject alone is too thin to stand
   216	  // as a prompt ("Nick Cave by Nan Goldin" → "Nick Cave"). When dropping attribution would leave
   217	  // a stub, keep the attribution instead of emitting a two-word prompt.
   218	  const subjectTooThin = bareSubject.split(/\s+/).filter(Boolean).length < 3;
   219	  const effGrammar = subjectTooThin && seedArtist ? 'by_artist' : grammar;
   220	
   221	  let text;
   222	  switch (effGrammar) {
   223	    case 'by_artist': {
   224	      const artist = seedArtist || pick(corpus.artists, rng);
   225	      text = `${bareSubject} by ${artist}`;
   226	      break;
   227	    }
   228	    case 'style_of': {
   229	      const artist = seedArtist || pick(corpus.artists, rng);
   230	      text = `${bareSubject} in the style of ${artist}`;
   231	      break;
   232	    }
   233	    case 'fragment': {
   234	      // Cutting at a fixed word count lands mid-phrase and leaves a dangling function word:
   235	      // "glacier calving into black water at" — which reads as a truncation bug to anyone
   236	      // looking at it, and is one to Midjourney too, since the trailing preposition promises
   237	      // an object that never arrives. Trim back to the last word that can end a phrase.
   238	      const DANGLING = /^(a|an|the|of|in|on|at|to|by|for|with|from|into|over|under|and|or|as|its|his|her|their)$/i;
   239	      const words = bareSubject.split(/\s+/).slice(0, 6);
   240	      while (words.length > 3 && DANGLING.test(words[words.length - 1])) words.pop();
   241	      text = words.join(' ');
   242	      break;
   243	    }
   244	    default:
   245	      text = bareSubject;
   246	  }
   247	  if (text.split(/\s+/).filter(Boolean).length < 3) return null;   // reject stubs outright
   248	
   249	  const params = buildParams(rng, mode, sref);
   250	  const full = `${text} --ar ${ar} ${params.join(' ')}`.replace(/\s+/g, ' ').trim();
   251	
   252	  return {
   253	    prompt: full,
   254	    subject: text,
   255	    /** Dedup key: the subject WITHOUT attribution, so "X" and "X by Someone" count as one idea.
   256	     *  Keying on the finished text let the same seed subject appear twice in a batch. */
   257	    dedupKey: bareSubject.toLowerCase(),
   258	    grammar,
   259	    sref,
   260	    mode,
   261	    lineage: { source_doc: seedPrompt.source_doc, source_url: seedPrompt.source_url, taste_score: seedPrompt.score },
   262	  };
   263	}
   264	
   265	export function generate(corpus, taste, opts) {
   266	  const seed = opts.seed ?? (Date.now() & 0xffffffff);
   267	  const rng = rngFrom(seed);
   268	  const pool = candidatePool(corpus, taste, opts.mode || 'taste');
   269	  if (!pool.length) {
   270	    throw new Error(
   271	      'No prompts in the archive match your themes.\n' +
   272	      'Widen taste/themes.md, or relax taste/rejected.md — the negative list may be over-broad.'
   273	    );
   274	  }
   275	
   276	  const out = [];
   277	  const seen = new Set();
   278	  let guard = 0;
   279	  // Ideas are capped by distinct on-taste subjects, so asking for more than exist must terminate
   280	  // rather than spin. The guard scales with the pool, and we stop early once it is exhausted.
   281	  const maxTries = Math.min(opts.count * 40, pool.length * 12 + 200);
   282	  while (out.length < opts.count && guard++ < maxTries) {
   283	    const g = generateOne(corpus, taste, opts, rng, pool);
   284	    if (!g) continue;                     // stub rejected inside generateOne
   285	    if (seen.has(g.dedupKey)) continue;   // one idea per batch, regardless of attribution
   286	    seen.add(g.dedupKey);
   287	    out.push({ ...g, seed });
   288	  }
   289	  return {
   290	    seed,
   291	    prompts: out,
   292	    poolSize: pool.length,
   293	    keptInPool: pool.keptCount || 0,
   294	    drops: pool.drops,          // why candidates were discarded — the veto list ran blind before
   295	    exhausted: out.length < opts.count,
   296	  };
   297	}
```

## prompter/lib/taste-namespace.mjs
```javascript
     1	/**
     2	 * taste-namespace.mjs — a generator-ready taste for ONE memory, built from evidence.
     3	 *
     4	 * WHY (Sean 2026-08-25): "the prompt app that creates prompts based off the Midjourney brain — I hope
     5	 * that's tied into it too." Until now the generator read only Sean's four markdown files and never
     6	 * saw what the courtroom recorded. This module is the tie:
     7	 *   · sean/default  → his markdown taste PLUS the evidence-tier style codes from his grids;
     8	 *   · partner/client → no markdown and NO style codes at all, so the taste is the project's theme
     9	 *     words, the words of the pictures actually chosen, the subjects it refused, and the project's
    10	 *     own kept prompts — labelled `words-only` until real evidence exists.
    11	 *
    12	 *     This paragraph used to end "Style codes then come from the generator's explore path, matched
    13	 *     to those words". That was a live contradiction with the licence law and the code obeyed the
    14	 *     comment, not the law: the explore path scores the whole Midlibrary catalogue, so every prompt
    15	 *     an own-material memory produced carried a corpus `--sref` code (6/6, measured; round-3 panel).
    16	 *     A style code is corpus material — it is the catalogue's index into Sean's licensed archive.
    17	 *     An own-material memory gets NONE. Enforced in generate.mjs `generateOne` via `pool.ownOnly`.
    18	 *
    19	 * Honesty rules: `tasteSource` says what the taste is made of; `confidence` is computed from counts,
    20	 * never asserted. Proposed avoids become generation vetoes ONLY for non-default memories (they have
    21	 * no rejected.md); Sean's stay proposals he copies himself. The only write here is keepFor(): the
    22	 * human's own kept prompt appended to the project's kept.md — the channel Sean's kept.md already is.
    23	 */
    24	import fs from 'node:fs';
    25	import path from 'node:path';
    26	import { loadTaste, parseKept } from './taste.mjs';
    27	import { compileProfile } from './profile.mjs';
    28	import { readProject, projectDir, isDefaultNamespace } from './projects.mjs';
    29	
    30	const STOP = new Set(['the', 'and', 'with', 'from', 'that', 'this', 'into', 'over', 'under', 'near', 'onto', 'their', 'there',
    31	  'have', 'been', 'some', 'very', 'more', 'than', 'also', 'just', 'like', 'photo', 'image', 'picture', 'view', 'shot']);
    32	// Hyphens split: a keyword is a whole word, never a `--parameter` (panel 2026-08-25).
    33	const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
    34	
    35	export function confidenceOf({ positiveCount = 0, kept = 0, keywords = 0 }) {
    36	  return positiveCount >= 15 ? 'strong' : positiveCount >= 5 ? 'partial' : positiveCount > 0 || kept > 0 ? 'weak' : keywords > 0 ? 'words-only' : 'empty';
    37	}
    38	
    39	/**
    40	 * Evidence-tier style codes → generator endorsements. TWO floors exist and they are not the same thing
    41	 * (panel round 2 asked for one; measured against Sean's real 18 judgements, a per-code floor of 2 leaves
    42	 * ZERO endorsements and silently regresses his tie-in to words-only):
    43	 *   · the compiler's DIRECTION floor — ≥2 closest summed over the top codes — decides whether a
    44	 *     direction is evidence-tier;
    45	 *   · a CODE is endorsed by one closest pick with a positive margin, weighted like a 4-star rating
    46	 *     (weight 4); two or more closest read as 5 (weight 9). Explore/exploit keeps surfacing the rest.
    47	 */
    48	export const EVIDENCE_LOVED_MIN = 1;
    49	export function evidenceLoved(profile, corpus) {
    50	  const byCode = new Map((corpus?.sref || []).map((c) => [String(c.code), c]));
    51	  return (profile.srefs || []).filter((r) => r.closest >= EVIDENCE_LOVED_MIN && r.margin > 0).map((r) => ({
    52	    code: String(r.key), style_name: byCode.get(String(r.key))?.style_name || null,
    53	    rating: r.closest >= 2 ? 5 : 4, note: `evidence: ${r.closest} closest, ${r.miss} miss`,
    54	  }));
    55	}
    56	
    57	/** What a taste is made of — one vocabulary for the table, the code and the page (panel round 2). */
    58	export function sourceLabel({ markdown = false, evidence = 0, kept = 0, keywords = 0 }) {
    59	  if (markdown) return evidence ? 'markdown+evidence' : 'markdown';
    60	  if (evidence) return 'evidence';
    61	  if (kept) return 'words+kept';
    62	  return keywords ? 'words' : 'empty';
    63	}
    64	
    65	/** Words the memory has actually chosen: its theme words + the descriptions of picked pictures. */
    66	export function keywordsFrom(themeWords = [], picks = []) {
    67	  const out = new Set();
    68	  for (const w of themeWords) for (const t of words(w)) out.add(t);
    69	  for (const p of picks) for (const t of words(p.title)) out.add(t);
    70	  return [...out];
    71	}
    72	
    73	/** Subjects the memory refused (misses with no closest) → veto words, never overriding a chosen word. */
    74	export function avoidWordsFrom(profile, keywords) {
    75	  const out = new Set();
    76	  for (const r of profile.subjects || []) {
    77	    if (r.closest !== 0 || r.miss < 1) continue;
    78	    for (const t of words(r.key.replace(/^(photo|webb|ml):/, ''))) if (!keywords.includes(t)) out.add(t);
    79	  }
    80	  return [...out];
    81	}
    82	
    83	/**
    84	 * Short scaffolds for turning a memory's own THEME WORDS into something you can actually film or render.
    85	 * A bare "ocean" is a search word, not a subject. These are the only phrasing the brain adds, and they are
    86	 * curated data — the same discipline as the motion table in video.mjs. Nothing here comes from the corpus.
    87	 */
    88	const WORD_SCAFFOLD = [
    89	  (a) => `${a} at first light`, (a) => `${a} under a low sun`, (a) => `${a} seen from directly above`,
    90	  (a) => `the edge of the ${a}`, (a) => `${a} after rain`, (a, b) => `${a} meeting ${b}`,
    91	  (a, b) => `${a} with ${b} behind it`, (a) => `${a} in deep shadow`,
    92	];
    93	
    94	/**
    95	 * The subjects a NON-SEAN memory may build prompts from — its OWN material only, in order of authority:
    96	 *   1. prompts it kept (its strongest signal), 2. the titles of pictures it CHOSE, 3. its theme words,
    97	 *      phrased by the scaffold above.
    98	 *
    99	 * WHY THIS EXISTS (found 2026-08-25 while building the video slice): without it, `candidatePool` fell
   100	 * through to the Midlibrary prompt corpus, so a partner or client memory was handed subjects like
   101	 * "cyberpunk character lit by northern lights" — text from Sean's licensed personal archive, shown to
   102	 * someone the licence says may never see that corpus, and nothing to do with what she asked for.
   103	 */
   104	export function ownSubjects(profile, project, compiled, pj) {
   105	  const out = [];
   106	  const seen = new Set();
   107	  const add = (subject, source_doc, score, isKept = false) => {
   108	    const s = String(subject || '').replace(/\s+/g, ' ').trim();
   109	    const key = s.toLowerCase();
   110	    if (s.split(' ').filter(Boolean).length < 3 || seen.has(key)) return;
   111	    // "forest light at first light" — a scaffold that repeats a word the theme word already carries reads
   112	    // as a stutter, not a subject. Drop it rather than ship it.
   113	    const words = key.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3);
   114	    if (!isKept && new Set(words).size !== words.length) return;
   115	    seen.add(key);
   116	    out.push({ subject: s, prompt: s, source_doc, source_url: null, score, isKept });
   117	  };
   118	  for (const k of readKept(profile, project)) add(subjectOfPrompt(k), 'kept', 1000, true);
   119	  for (const p of compiled?.picks || []) if (!p.generated) add(p.title, 'pictures you chose', 6);
   120	  const words = (pj?.themeWords || []).filter(Boolean);
   121	  words.forEach((w, i) => {
   122	    for (const make of WORD_SCAFFOLD) {
   123	      const other = words[(i + 1) % words.length];
   124	      add(make(w, other && other !== w ? other : 'open water'), 'your words', 2);
   125	    }
   126	  });
   127	  return out;
   128	}
   129	const subjectOfPrompt = (p) => String(p || '').split(/\s--/)[0].trim();
   130	
   131	const keptPath = (profile, project) => path.join(projectDir(profile, project), 'kept.md');
   132	
   133	/** READ a memory's kept prompts. (Renamed from keptFor: keepFor/keptFor was a trap a reviewer fell into.) */
   134	export function readKept(profile, project) {
   135	  const p = keptPath(profile, project);
   136	  return fs.existsSync(p) ? parseKept(fs.readFileSync(p, 'utf8')) : [];
   137	}
   138	
   139	/**
   140	 * Remove a kept prompt from a non-default memory. Keeping is a judgement, and a judgement a human can make
   141	 * is one they must be able to unmake — the same law the `reversal` event encodes for grids. Sean's own
   142	 * kept.md is markdown he edits himself, so it is refused here.
   143	 */
   144	export function unkeepFor(profile, project, prompt) {
   145	  if (isDefaultNamespace(profile, project)) return { ok: false, error: "Sean's kept list is edited in taste/kept.md" };
   146	  if (!readProject(profile, project)) return { ok: false, error: 'unknown project' };
   147	  const p = keptPath(profile, project);
   148	  if (!fs.existsSync(p)) return { ok: false, error: 'nothing kept yet' };
   149	  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
   150	  const md = fs.readFileSync(p, 'utf8');
   151	  if (!parseKept(md).includes(text)) return { ok: false, error: 'that prompt is not in this memory\'s kept list' };
   152	  const out = md.split(/\r?\n/).filter((l) => l.replace(/^\s*[-*]\s+/, '').replace(/^`|`$/g, '').trim() !== text).join('\n');
   153	  fs.writeFileSync(p, out, 'utf8');
   154	  return { ok: true, kept: parseKept(out).length };
   155	}
   156	
   157	/** Append a kept prompt to a non-default memory's kept.md — the compounding channel, on the human's click. */
   158	export function keepFor(profile, project, prompt) {
   159	  if (isDefaultNamespace(profile, project)) return { ok: false, error: 'sean/default keeps through the CLI (taste/kept.md)' };
   160	  if (!readProject(profile, project)) return { ok: false, error: 'unknown project' };
   161	  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
   162	  if (text.split(' ').length < 3) return { ok: false, error: 'prompt must be at least 3 words' };
   163	  if (text.length > 2000) return { ok: false, error: 'prompt must be ≤ 2000 chars' };   // same discipline as validateEvent's MAX_STR (panel round 2)
   164	  // No Midjourney parameters in a non-Sean memory's kept.md. This needs no malice to happen: Sean
   165	  // generates in his own tab (his prompts carry `--sref <corpus code>`), and the text is kept into
   166	  // HER memory from the Kept tab. subjectOfPrompt() strips parameters for GENERATION, so the pool
   167	  // stayed clean and nothing looked wrong — but kept.md is read and PRINTED by the brief, so the
   168	  // corpus code sat in her files outside every provenance guard. Subject text only.
   169	  // (round-3 panel, Kimi K3 P1)
   170	  // Scoped to --sref, NOT to parameters in general: `--ar 16:9 --v 7` is her own framing choice and
   171	  // banning it broke keeping an ordinary generated prompt. Only the style CODE is corpus material.
   172	  if (/\s--sref\b/i.test(text)) return { ok: false, error: 'a kept prompt may not carry a --sref style code' };
   173	  const p = keptPath(profile, project);
   174	  let md = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : `# Kept prompts — ${profile}/${project}\n\n## Kept\n`;
   175	  if (parseKept(md).includes(text)) return { ok: true, duplicate: true, kept: parseKept(md).length };   // line-exact, not substring
   176	  if (!/^## Kept/m.test(md)) md += '\n## Kept\n';
   177	  // Function replacement, NOT a string one. `text` is human input and a replacement STRING expands
   178	  // `$&`, `$1`, `` $` `` and `$'` — so keeping the prompt "price $& quality light" spliced the
   179	  // matched heading back into the middle of the bullet and mangled the file for every later read.
   180	  // A function replacement receives the text verbatim. (round-3 panel, GLM 5.3 finding 6)
   181	  md = md.replace(/(## Kept\n)/, (m) => `${m}- ${text}\n`);
   182	  fs.writeFileSync(p, md, 'utf8');
   183	  return { ok: true, duplicate: false, kept: parseKept(md).length };
   184	}
   185	
   186	/** The taste object generate() consumes, for one memory. Null when the project does not exist. */
   187	export function tasteFor({ profile, project, corpus }) {
   188	  const compiled = compileProfile({ profile, project, write: false });
   189	  if (compiled.error) return null;
   190	  const loved = evidenceLoved(compiled, corpus);
   191	  if (isDefaultNamespace(profile, project)) {
   192	    const base = loadTaste();
   193	    const known = new Set(base.loved.map((l) => l.code));
   194	    const rejected = new Set(base.rejectedSrefs);
   195	    // A stale rejection beats fresh evidence — by law (rejection is the more decisive act) — but never silently.
   196	    const warnings = [...base.warnings, ...loved.filter((l) => rejected.has(l.code)).map((l) => `code ${l.code} is evidence-tier from your grids but rejected in rejected.md — rejection wins; remove it there if your eye has changed`)];
   197	    const merged = [...base.loved, ...loved.filter((l) => !known.has(l.code) && !rejected.has(l.code))];
   198	    const positiveCount = merged.filter((l) => l.rating >= 3 && !rejected.has(l.code)).length;
   199	    return { ...base, warnings, loved: merged, ratedCount: merged.length, positiveCount, evidenceSrefs: loved.length,
   200	      tasteSource: sourceLabel({ markdown: true, evidence: loved.length }),
   201	      confidence: confidenceOf({ positiveCount, kept: base.kept.length, keywords: base.keywords.length }) };
   202	  }
   203	  const pj = readProject(profile, project);
   204	  const kept = readKept(profile, project);
   205	  // Generated pictures (renders) never feed keywords: the generator's vocabulary must not become the memory's.
   206	  const keywords = keywordsFrom(pj.themeWords, (compiled.picks || []).filter((p) => !p.generated));
   207	  const avoidWords = avoidWordsFrom(compiled, keywords);
   208	  return {
   209	    loved, rejectedSrefs: compiled.proposedAvoids || [], kept, identity: pj.themeWords || [], moodsFit: [], moodsAvoid: [],
   210	    // The pool a non-Sean memory generates from: its own kept prompts, its own picks, its own words —
   211	    // never the Midlibrary corpus (licence + it is simply not what she asked for).
   212	    ownSubjects: ownSubjects(profile, project, compiled, pj),
   213	    keywords, avoidWords, warnings: [], ratedCount: loved.length, positiveCount: loved.length, evidenceSrefs: loved.length,
   214	    tasteSource: sourceLabel({ evidence: loved.length, kept: kept.length, keywords: keywords.length }),
   215	    confidence: confidenceOf({ positiveCount: loved.length, kept: kept.length, keywords: keywords.length }),
   216	  };
   217	}
```

## prompter/lib/profile.mjs
```javascript
     1	/**
     2	 * profile.mjs — the tally compiler: taste/events → taste-profile.json → three directions.
     3	 *
     4	 * THE CONTRACT (panel 2026-08-25, Ox O3 / GLM / Grok): this is a TALLY, not a model. Counts are
     5	 * partitioned by outcomeClass so the four kinds of "no" never blur:
     6	 *   style | mixed  → style tallies (reason codes, sref codes, provenance)
     7	 *   content        → subject tallies only (what was pictured, not how)
     8	 *   execution      → ignored (a bad render teaches nothing about taste)
     9	 *   brand-law      → listed, never counted
    10	 * Only `source: 'sean'` events count. Neutral is not a vote. A miss is not a rejection — misses
    11	 * become PROPOSED avoids that Sean can copy into rejected.md; nothing here writes taste/*.md.
    12	 *
    13	 * Every direction carries `tier`: 'evidence' when ≥ EVIDENCE_MIN closest picks back it, else
    14	 * 'prior' (from themes.md). The word "prior" is the cold-start disclosure — day-1 output looks
    15	 * the same as day-30 output unless it says which it is.
    16	 */
    17	import fs from 'node:fs';
    18	import path from 'node:path';
    19	import { VAULT } from './corpus.mjs';
    20	import { readEventsFor, activeEvents, DEFAULT_PROFILE, DEFAULT_PROJECT } from './events.mjs';
    21	import { loadImages } from './images.mjs';
    22	import { readProject, projectDir, isDefaultNamespace, doneFloorFor, poolFor, SHAREABLE_PROVENANCE } from './projects.mjs';
    23	
    24	export const EVIDENCE_MIN = 2;
    25	export const PROFILE_PATH = path.join(VAULT, 'taste', 'taste-profile.json');
    26	const STYLE_CLASSES = new Set(['style', 'mixed']);
    27	
    28	const bump = (map, key, verdict, eventId, sample) => {
    29	  if (!key) return;
    30	  const t = map[key] || (map[key] = { closest: 0, miss: 0, events: [], samples: [] });
    31	  t[verdict === 'closest' ? 'closest' : 'miss']++;
    32	  if (!t.events.includes(eventId)) t.events.push(eventId);
    33	  if (verdict === 'closest' && sample && !t.samples.includes(sample)) t.samples.push(sample);
    34	};
    35	const subjectOfPrompt = (p) => (p || '').split(/\s--/)[0].trim();
    36	const rank = (map, min = 1) => Object.entries(map)
    37	  .map(([k, v]) => ({ key: k, ...v, margin: v.closest - v.miss }))
    38	  .filter((r) => r.closest >= min)
    39	  .sort((a, b) => b.margin - a.margin || b.closest - a.closest || a.key.localeCompare(b.key));
    40	
    41	/** Pure: events + image index → tallies. Exported for the test. */
    42	export function tally(events, images, witness = DEFAULT_PROFILE) {
    43	  const byId = new Map(images.map((r) => [r.id, r]));
    44	  const t = { reasons: {}, srefs: {}, subjects: {}, provenance: {}, collections: {}, brandLaw: [], picks: [], counted: 0, ignoredExecution: 0, grids: 0,
    45	    reversals: events.filter((e) => e.eventType === 'reversal').length, renders: { judged: 0, closest: 0, miss: 0 } };
    46	  // An undone grid (eventType: reversal) is not evidence — activeEvents drops it and its pictures return to the pool.
    47	  for (const e of activeEvents(events)) {
    48	    if (e.source !== witness || e.eventType !== 'grid-selection') continue;
    49	    t.grids++;
    50	    for (const it of e.items || []) {
    51	      if (it.verdict === 'neutral') continue;
    52	      const c = e.candidates.find((x) => x.id === it.id) || {};
    53	      const rec = byId.get(it.id) || {};
    54	      const doc = c.doc || rec.doc || '';
    55	      const generated = (c.provenance || rec.provenance) === 'local-comfy';
    56	      // Subject keys are namespaced by where the picture came from, so a photo theme word, a Webb
    57	      // category, a Midlibrary prompt subject and a render's prompt subject never get ranked as one list.
    58	      const subject = generated ? `render:${subjectOfPrompt(c.prompt || '')}`
    59	        : doc.startsWith('photo/') ? `photo:${doc.slice(6)}`
    60	        : doc.startsWith('webb/') ? `webb:${doc.slice(5)}`
    61	        : rec.prompt ? `ml:${subjectOfPrompt(rec.prompt)}` : null;
    62	      if (it.outcomeClass === 'execution') { t.ignoredExecution++; continue; }
    63	      if (it.outcomeClass === 'brand-law') { t.brandLaw.push({ id: it.id, eventId: e.eventId }); continue; }
    64	      t.counted++;
    65	      if (generated) { t.renders.judged++; t.renders[it.verdict === 'closest' ? 'closest' : 'miss']++; }
    66	      // The pictures actually chosen — IDs + URLs + credits, never bytes — so a brief can show them.
    67	      if (it.verdict === 'closest') {
    68	        t.picks.push({ id: it.id, url: c.url || rec.url || null, credit: c.credit ?? rec.credit ?? null, pageUrl: c.pageUrl ?? rec.pageUrl ?? null,
    69	          title: c.title ?? rec.title ?? null, provenance: c.provenance || rec.provenance || null, doc, generated,
    70	          kind: c.kind ?? null, prompt: generated ? c.prompt ?? null : undefined,
    71	          reasonCode: it.reasonCode, outcomeClass: it.outcomeClass, eventId: e.eventId });
    72	      }
    73	      bump(t.subjects, subject, it.verdict, e.eventId);
    74	      if (it.outcomeClass === 'content') continue;
    75	      // A judged RENDER counts toward subjects (what she wants pictured) and its own tally — never toward
    76	      // style codes or reasons: the generator does not grade its own homework (panel round 2, two seats: 0, not 0.5).
    77	      if (generated) continue;
    78	      bump(t.reasons, it.reasonCode, it.verdict, e.eventId);
    79	      // STYLE CODES ARE THE OWNER'S ALONE — the fourth corpus door, and the one that was open longest.
    80	      // The picks filter in compileProfile exists because "/brief prints these"; srefs, proposedAvoids
    81	      // and the `dir:midjourney-srefs` direction were printed from this tally UNFILTERED, so a
    82	      // non-Sean memory's compiled profile and printed brief could carry corpus codes plus a sample
    83	      // prompt built from corpus text. Two inputs reached it: a midlibrary row written before the
    84	      // writer-side law existed (nothing scrubs history), and a crafted candidate that simply lies
    85	      // about provenance while still carrying `sref`. Gating HERE fixes both at once, retroactively
    86	      // and without a migration, because every read recompiles from events.
    87	      // A non-Sean memory still learns subjects, reasons and collections — those are hers.
    88	      // (round-3 panel, Kimi K3 P0)
    89	      if (witness === DEFAULT_PROFILE) {
    90	        // The sample prompt is the PICTURE HE CHOSE, not the article's first example of that code.
    91	        bump(t.srefs, c.sref || rec.sref, it.verdict, e.eventId, rec.prompt ? `${subjectOfPrompt(rec.prompt)} --sref ${c.sref || rec.sref} --ar 16:9` : null);
    92	      }
    93	      bump(t.provenance, c.provenance || rec.provenance, it.verdict, e.eventId);
    94	      bump(t.collections, doc.split('/')[0], it.verdict, e.eventId);
    95	    }
    96	  }
    97	  return t;
    98	}
    99	
   100	/** Prompt for a code: the picture he chose if we have it, else the corpus's first example. */
   101	const promptFor = (row, images) => {
   102	  if (row.samples?.length) return row.samples[0];
   103	  const rec = images.find((r) => r.sref === row.key && r.prompt);
   104	  return rec ? `${subjectOfPrompt(rec.prompt)} --sref ${row.key} --ar 16:9` : null;
   105	};
   106	const strip = (k) => k.replace(/^(photo|webb|ml):/, '');
   107	
   108	/** Pure: tallies → exactly three directions, evidence-tier first, prior-tier fills. */
   109	export function directions(t, images, themesMd = '', themeWords = [], witness = DEFAULT_PROFILE) {
   110	  const out = [];
   111	  // NOT CHANGED, deliberately — flagged for Sean rather than decided here. Kimi K3 (round 3, P2)
   112	  // argues that EVIDENCE_MIN = 2 closest picks was measured against Sean's own 18 judgements, and
   113	  // that labelling a stranger's directions `tier: 'evidence'` off a SINGLE grid overclaims while
   114	  // `progress.done` still says she is 20% started. That is a fair reading. But requiring the backing
   115	  // to span two grids changes what the sales-practice brief shows after one round, which is a product
   116	  // decision about what "evidence" should mean to a second user — not a defect to be patched by a
   117	  // reviewer. `witness` is threaded through so the change is one line if Sean wants it:
   118	  //   && (witness === DEFAULT_PROFILE || new Set(rows.flatMap((r) => r.events)).size >= 2)
   119	  const backed = (rows) => rows.reduce((n, r) => n + r.closest, 0) >= EVIDENCE_MIN;
   120	  const reasons = rank(t.reasons);
   121	  const srefs = rank(t.srefs);
   122	  const subjects = rank(t.subjects);
   123	  const because = reasons.slice(0, 3).map((r) => r.key);
   124	  const evidenceOf = (rows) => [...new Set(rows.flatMap((r) => r.events))];
   125	
   126	  const topSrefs = srefs.filter((s) => s.margin > 0).slice(0, 3);
   127	  if (backed(topSrefs)) {
   128	    out.push({ id: 'dir:midjourney-srefs', tier: 'evidence', title: 'Style codes you keep choosing',
   129	      because, srefs: topSrefs.map((s) => s.key), prompts: topSrefs.map((s) => promptFor(s, images)).filter(Boolean),
   130	      evidenceEventIds: evidenceOf(topSrefs) });
   131	  }
   132	  const photoSubjects = subjects.filter((s) => s.margin > 0 && s.key.startsWith('photo:')).slice(0, 4);
   133	  if (backed(photoSubjects)) {
   134	    out.push({ id: 'dir:photographic-subjects', tier: 'evidence', title: 'Photographic subjects that read as yours',
   135	      because, themeWords: photoSubjects.map((s) => strip(s.key)), evidenceEventIds: evidenceOf(photoSubjects) });
   136	  }
   137	  const webbRows = subjects.filter((s) => s.margin > 0 && s.key.startsWith('webb:'));
   138	  if (backed(webbRows)) {
   139	    out.push({ id: 'dir:cosmic-scale', tier: 'evidence', title: 'Cosmic scale (Webb)', because,
   140	      themeWords: webbRows.map((s) => strip(s.key)), evidenceEventIds: evidenceOf(webbRows) });
   141	  }
   142	  // Prior-tier fill from themes.md "Core visual identity" bullets — labelled so nobody mistakes it.
   143	  const priors = [...themesMd.matchAll(/^- \*\*([^*]+)\*\*/gm)].map((m) => m[1].replace(/\.$/, '').trim());
   144	  for (const p of priors) {
   145	    if (out.length >= 3) break;
   146	    out.push({ id: `dir:prior:${p.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, tier: 'prior', title: p,
   147	      because: [], note: 'from themes.md — not yet backed by your picks', evidenceEventIds: [] });
   148	  }
   149	  // A fresh project has no themes.md: its own theme words stand in as labelled priors until picks arrive.
   150	  for (const w of themeWords) {
   151	    if (out.length >= 3) break;
   152	    out.push({ id: `dir:prior:word:${w.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, tier: 'prior', title: w,
   153	      because: [], note: "from this project's own theme words — not yet backed by picks", evidenceEventIds: [] });
   154	  }
   155	  return out.slice(0, 3);
   156	}
   157	
   158	/**
   159	 * Read one namespace's events, compile, optionally write its taste-profile.json (machine-owned).
   160	 * sean/default reads taste/events + themes.md exactly as before. Any other namespace reads only
   161	 * its own events, counts only its own witness, and takes its priors from its own theme words —
   162	 * Sean's themes.md never leaks into the partner's or a client's directions.
   163	 */
   164	export function compileProfile({ profile = DEFAULT_PROFILE, project = DEFAULT_PROJECT, write = true } = {}) {
   165	  const images = loadImages();
   166	  const isDefault = isDefaultNamespace(profile, project);
   167	  const pj = readProject(profile, project);
   168	  if (!pj) return { error: 'unknown project', profileId: profile, projectId: project, directions: [] };
   169	  const events = readEventsFor(profile, project);
   170	  const themesPath = path.join(VAULT, 'taste/themes.md');
   171	  const themesMd = isDefault && fs.existsSync(themesPath) ? fs.readFileSync(themesPath, 'utf8') : '';
   172	  const t = tally(events, images, profile);
   173	  // Defence in depth for the licence law: anyone but Sean only ever gets shareable pictures back, even
   174	  // if a project file were hand-edited — /brief prints these, and a printed brief leaves the machine.
   175	  if (profile !== DEFAULT_PROFILE) t.picks = t.picks.filter((p) => SHAREABLE_PROVENANCE.has(p.provenance) || p.generated);   // her own renders are hers
   176	  const floor = doneFloorFor(profile);
   177	  const out = {
   178	    generatedAt: new Date().toISOString(), generator: 'prompter/lib/profile.mjs (tally, not a model)',
   179	    profileId: profile, projectId: project, witness: profile, title: pj.title, themeWords: pj.themeWords || [], pool: poolFor(profile, project, []).pool,
   180	    grids: t.grids, judgements: t.counted, ignoredExecution: t.ignoredExecution, brandLaw: t.brandLaw, reversals: t.reversals, renders: t.renders,
   181	    progress: { grids: t.grids, judgements: t.counted, gridsTarget: floor.grids, judgementsTarget: floor.judgements, done: t.grids >= floor.grids && t.counted >= floor.judgements },
   182	    reasons: rank(t.reasons, 0), srefs: rank(t.srefs, 0), subjects: rank(t.subjects, 0), provenance: rank(t.provenance, 0), collections: rank(t.collections, 0),
   183	    picks: t.picks,
   184	    proposedAvoids: rank(t.srefs, 0).filter((s) => s.closest === 0 && s.miss >= 1).map((s) => s.key),
   185	    directions: directions(t, images, themesMd, pj.themeWords || [], profile),
   186	  };
   187	  if (write) fs.writeFileSync(isDefault ? PROFILE_PATH : path.join(projectDir(profile, project), 'taste-profile.json'), JSON.stringify(out, null, 1));
   188	  return out;
   189	}
```

## prompter/lib/projects.mjs
```javascript
     1	/**
     2	 * projects.mjs — a project is ONE design memory: who is judging (profile) × what it is for.
     3	 *
     4	 * WHY (Sean 2026-08-25): "whenever we want to design new sites or assets … it will always start a
     5	 * new memory for designs, so the designs she's using will be unique based on what she chooses in
     6	 * those pictures." So a project is created EMPTY — nothing is copied from Sean's memory or from
     7	 * her last project — and it is the unit the compiler reads. Sean's own memory is the implicit
     8	 * `sean/default` namespace and needs no project file.
     9	 *
    10	 * Two household modes ride this one mechanism:
    11	 *   partner  — Sean's partner designing for herself (her own business). Fresh memory per project.
    12	 *   client   — the prospect's view: Sean's sales-practice mode (his partner plays the client) and,
    13	 *              later, a real client. Shareable pool ONLY, always — Midlibrary is never shown to a
    14	 *              client (handoff §3 law 6). A bundle that leaves the machine is shareable-only too.
    15	 *
    16	 * The only free text a project stores is a title and up to 8 theme words. Never a person's name,
    17	 * never a school's name — that is the partner lane's ONE RULE boundary, and project.json is a
    18	 * file agents read.
    19	 */
    20	import fs from 'node:fs';
    21	import path from 'node:path';
    22	import { VAULT } from './corpus.mjs';
    23	import { PROFILES, DEFAULT_PROFILE, DEFAULT_PROJECT, isProjectId, eventsDirFor } from './events.mjs';
    24	import { DEFAULT_MIX } from './probe.mjs';
    25	
    26	export const POOLS = ['shareable', 'full'];
    27	/** Photos + Webb only: what may leave the machine or be seen by anyone but Sean. */
    28	export const SHAREABLE_MIX = { photo: 9, webb: 3 };
    29	export const SHAREABLE_COLLECTIONS = new Set(['photo', 'webb']);
    30	export const SHAREABLE_PROVENANCE = new Set(['unsplash', 'pexels', 'esa-webb-ccby', 'nasa-public-domain']);
    31	/** Judgement floor before a namespace's directions mean much (handoff §5: a stranger's taste ≈ 8 grids). */
    32	export const DONE_FLOOR = { sean: { grids: 2, judgements: 8 }, partner: { grids: 8, judgements: 40 }, client: { grids: 8, judgements: 40 } };
    33	const MAX_THEME_WORDS = 8;
    34	const THEME_WORD = /^[a-z0-9][a-z0-9 -]{0,39}$/;
    35	
    36	export const isDefaultNamespace = (profile, project) => profile === DEFAULT_PROFILE && project === DEFAULT_PROJECT;
    37	export const projectDir = (profile, project) => path.dirname(eventsDirFor(profile, project));
    38	const projectFile = (profile, project) => path.join(projectDir(profile, project), 'project.json');
    39	
    40	export function readProject(profile, project) {
    41	  if (isDefaultNamespace(profile, project)) {
    42	    return { profileId: profile, projectId: project, title: "Sean's taste", themeWords: [], pool: 'full', implicit: true };
    43	  }
    44	  if (!PROFILES.includes(profile) || !isProjectId(project)) return null;
    45	  const p = projectFile(profile, project);
    46	  if (!fs.existsSync(p)) return null;
    47	  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
    48	}
    49	
    50	export function listProjects(profile) {
    51	  if (!PROFILES.includes(profile)) return [];
    52	  const out = profile === DEFAULT_PROFILE ? [readProject(profile, DEFAULT_PROJECT)] : [];
    53	  const root = path.join(VAULT, 'taste', 'profiles', profile);
    54	  if (fs.existsSync(root)) {
    55	    for (const d of fs.readdirSync(root).sort()) { const pj = readProject(profile, d); if (pj) out.push(pj); }
    56	  }
    57	  return out;
    58	}
    59	
    60	export function normaliseThemeWords(words) {
    61	  const list = Array.isArray(words) ? words : String(words ?? '').split(/[,\n]/);
    62	  // Hyphens collapse and never lead: a "theme word" can never smuggle a `--parameter` (panel 2026-08-25).
    63	  return [...new Set(list.map((w) => String(w).trim().toLowerCase().replace(/\s+/g, ' ').replace(/-+/g, '-').replace(/^-|-$/g, '')).filter(Boolean))];
    64	}
    65	
    66	/** Validate + create an EMPTY project. Returns { ok, project } or { ok:false, errors }. */
    67	export function createProject({ profileId, projectId, title, themeWords = [], pool } = {}) {
    68	  const errors = [];
    69	  if (!PROFILES.includes(profileId)) errors.push(`profileId must be one of ${PROFILES.join('|')}`);
    70	  if (!isProjectId(projectId)) errors.push('projectId must be a slug: a-z, 0-9, hyphens, ≤40 chars — never a name');
    71	  if (isDefaultNamespace(profileId, projectId)) errors.push('sean/default is implicit and cannot be created');
    72	  const words = normaliseThemeWords(themeWords);
    73	  if (words.length > MAX_THEME_WORDS) errors.push(`at most ${MAX_THEME_WORDS} theme words`);
    74	  if (words.some((w) => !THEME_WORD.test(w))) errors.push('theme words: letters, digits, spaces, hyphens only, ≤40 chars each');
    75	  const wantPool = pool ?? 'shareable';
    76	  if (!POOLS.includes(wantPool)) errors.push(`pool must be one of ${POOLS.join('|')}`);
    77	  // Panel 2026-08-25 (four seats): the licence says Midlibrary is shown to the OWNER on loopback and to
    78	  // nobody else — a partner opt-in was a relaxation of that law, and /brief prints picks. Removed.
    79	  if (wantPool !== 'shareable' && profileId !== DEFAULT_PROFILE) errors.push('only Sean may open the full pool — Midlibrary is never shown to anyone else');
    80	  if (errors.length) return { ok: false, errors };
    81	  const file = projectFile(profileId, projectId);
    82	  if (fs.existsSync(file)) return { ok: false, errors: ['project already exists'] };
    83	  const project = {
    84	    profileId, projectId, title: String(title || projectId).trim().slice(0, 80) || projectId,
    85	    themeWords: words, pool: wantPool, createdAt: new Date().toISOString(),
    86	  };
    87	  fs.mkdirSync(eventsDirFor(profileId, projectId), { recursive: true });
    88	  fs.writeFileSync(file, JSON.stringify(project, null, 1));
    89	  return { ok: true, project };
    90	}
    91	
    92	/**
    93	 * The pictures a namespace may be shown: the image LIST and the quota mix together, so a shareable
    94	 * pool can never be back-filled from Midlibrary when a quota runs short. Only Sean's own memories see
    95	 * the full pool, and only on loopback — computed here from the PROFILE, so a hand-edited project.json
    96	 * cannot open it for anyone else.
    97	 */
    98	export function poolFor(profile, project, images) {
    99	  const pj = readProject(profile, project);
   100	  const full = profile === DEFAULT_PROFILE && (isDefaultNamespace(profile, project) || pj?.pool === 'full');
   101	  if (full) return { pool: 'full', images, mix: DEFAULT_MIX };
   102	  return { pool: 'shareable', images: images.filter((r) => SHAREABLE_COLLECTIONS.has(r.collection)), mix: SHAREABLE_MIX };
   103	}
   104	
   105	export const doneFloorFor = (profile) => DONE_FLOOR[profile] || DONE_FLOOR.client;
```

## prompter/lib/probe.mjs
```javascript
     1	/**
     2	 * probe.mjs — coverage-stratified picture selection for the Taste Discovery probe.
     3	 *
     4	 * THE RULE THIS ENCODES (panel 2026-08-25, GLM + Grok): the first visual act must not be
     5	 * "predicted fits" — there is no fitted predictor at session one, so "predicted" would just be
     6	 * the canon prior wearing a costume. Instead the grid is stratified by SOURCE COLLECTION: one
     7	 * picture per article, articles shuffled by seed, so twelve pictures span twelve different
     8	 * curatorial contexts (manga srefs, brutalist architecture, painterly portraits, ...). If Sean's
     9	 * picks land on styles he could not have named, the discovery thesis is proven. If they all land
    10	 * on the two things he already rates, we learn that too — and that is the point of the probe.
    11	 *
    12	 * Preference order inside a stratum: an image WITH a --sref code beats one without, because a
    13	 * choice that resolves to a catalog ID is worth more downstream than a choice that resolves to
    14	 * "some picture in an article". Rejected srefs (taste/rejected.md) are excluded — asking him to
    15	 * re-judge something he already refused is fatigue, not evidence.
    16	 *
    17	 * Deterministic: same seed → same grid, so a session can be reproduced from its event line.
    18	 */
    19	import { rngFrom } from './generate.mjs';
    20	
    21	const DEFAULT_N = 12;
    22	
    23	/**
    24	 * Hosts that actually render when the browser hotlinks them. Measured 2026-08-25 in a real
    25	 * headless browser: `cdn.prod.website-files.com` (5,296 images, 703 with --sref) → 200;
    26	 * `static.midlibrary.io` (262 images) → 403 Forbidden. A grid with four grey boxes is a grid
    27	 * Sean judges with four fewer pictures, so unrenderable hosts never enter the pool.
    28	 * Re-measure before extending this list; do not extend it on hope.
    29	 */
    30	export const RENDERABLE_HOSTS = new Set(['cdn.prod.website-files.com', 'cdn.esawebb.org', 'images.unsplash.com', 'images.pexels.com']);
    31	/** Quotas per extra collection; Midlibrary fills whatever is left. Sean 2026-08-25: 6 ML + 4 photo + 2 Webb. */
    32	export const DEFAULT_MIX = { webb: 2, photo: 4 };
    33	export const isRenderable = (url) => { try { return RENDERABLE_HOSTS.has(new URL(url).host); } catch { return false; } };
    34	
    35	function shuffle(arr, rng) {
    36	  const a = arr.slice();
    37	  for (let i = a.length - 1; i > 0; i--) {
    38	    const j = Math.floor(rng() * (i + 1));
    39	    [a[i], a[j]] = [a[j], a[i]];
    40	  }
    41	  return a;
    42	}
    43	
    44	/**
    45	 * @param {object} o
    46	 * @param {Array} o.images        records from images.mjs
    47	 * @param {number} [o.n]          grid size (default 12)
    48	 * @param {number} [o.seed]       reproducibility seed
    49	 * @param {string[]} [o.excludeSrefs]  codes never to show (rejected)
    50	 * @param {string[]} [o.excludeIds]    image ids never to show (already judged this session)
    51	 * @returns {{ seed:number, candidates:Array, strata:Array }}
    52	 */
    53	export function selectProbe({ images, n = DEFAULT_N, seed, excludeSrefs = [], excludeIds = [], mix = DEFAULT_MIX }) {
    54	  const s = Number.isFinite(seed) ? seed : Math.floor(Math.random() * 2 ** 31);
    55	  const rng = rngFrom(s);
    56	  const badSref = new Set(excludeSrefs.map(String));
    57	  const badId = new Set(excludeIds);
    58	  const usable = images.filter((r) => isRenderable(r.url) && !badId.has(r.id) && !(r.sref && badSref.has(r.sref)));
    59	
    60	  // Quota per extra collection (Webb pictures, Sean 2026-08-25), then Midlibrary fills the rest.
    61	  // Each collection is stratified by its own docs; positions are shuffled so the Webb pictures
    62	  // are not always slots 1-3 (positional bias is recorded on the event, not baked into the grid).
    63	  const quota = Object.entries(mix || {}).filter(([, v]) => v > 0);
    64	  const extras = [];
    65	  let left = n;
    66	  for (const [collection, want] of quota) {
    67	    const got = pickStratified(usable.filter((r) => r.collection === collection), Math.min(want, left), rng);
    68	    extras.push(...got);
    69	    left -= got.length;
    70	  }
    71	  const quotaNames = new Set(quota.map(([k]) => k));
    72	  const rest = pickStratified(usable.filter((r) => !quotaNames.has(r.collection)), left, rng);
    73	  const ordered = shuffle([...extras, ...rest], rng).map((c, i) => ({ ...c, gridPosition: i }));
    74	  const strata = ordered.map((c) => ({ position: c.gridPosition, doc: c.doc, collection: c.collection, hasSref: Boolean(c.sref) }));
    75	  return { seed: s, candidates: ordered, strata };
    76	}
    77	
    78	/** One picture per doc, docs that carry a --sref example first, round-robin until `want`. */
    79	function pickStratified(pool, want, rng) {
    80	  if (want <= 0 || !pool.length) return [];
    81	  const byDoc = new Map();
    82	  for (const r of pool) {
    83	    if (!byDoc.has(r.doc)) byDoc.set(r.doc, []);
    84	    byDoc.get(r.doc).push(r);
    85	  }
    86	  // Within a doc: sref-bearing first, then shuffled. Between docs: articles that carry at least
    87	  // one --sref example come first (shuffled), then the rest (shuffled) — so a 12-up drawn from a
    88	  // 78-article archive resolves to catalog IDs instead of to "a picture in an essay", while still
    89	  // covering twelve distinct curatorial contexts.
    90	  const srefDocs = [...byDoc.keys()].filter((d) => byDoc.get(d).some((r) => r.sref));
    91	  const plainDocs = [...byDoc.keys()].filter((d) => !srefDocs.includes(d));
    92	  const docs = [...shuffle(srefDocs, rng), ...shuffle(plainDocs, rng)];
    93	  // Ordered ONCE per doc, not once per round. This used to be re-shuffled inside the round loop and
    94	  // then indexed by `round`, so round 1's `ordered[1]` was drawn from a DIFFERENT permutation than
    95	  // round 0's `ordered[0]` — the same picture could be dealt twice into one grid whenever `want`
    96	  // exceeded the doc count (a thin archive, or a shareable pool with few photo/webb docs). The
    97	  // never-show-twice law lives at the writer and compares ACROSS events, so it never saw a
    98	  // within-grid duplicate. Indexing a stable permutation is what `round` always meant.
    99	  // (round-3 panel, GLM 5.3 finding 7)
   100	  const orderings = new Map(docs.map((doc) => {
   101	    const list = byDoc.get(doc);
   102	    return [doc, [...shuffle(list.filter((r) => r.sref), rng), ...shuffle(list.filter((r) => !r.sref), rng)]];
   103	  }));
   104	  const picked = [];
   105	  const seen = new Set();   // belt and braces: one record can only be dealt once per grid
   106	  let round = 0;
   107	  while (picked.length < want && round < 4) {
   108	    for (const doc of docs) {
   109	      if (picked.length >= want) break;
   110	      const pick = orderings.get(doc)[round];
   111	      if (!pick || seen.has(pick)) continue;
   112	      seen.add(pick);
   113	      picked.push(pick);
   114	    }
   115	    round++;
   116	  }
   117	  return picked;
   118	}
```

## prompter/lib/video.mjs
```javascript
     1	/**
     2	 * video.mjs — motion prompts from the same memory that steers the stills.
     3	 *
     4	 * WHY (Sean's north star): "Midjourney + ChatGPT for images AND video." The 5090 renders video (MiniMax H3),
     5	 * the schema has carried `medium: 'film'` and the film reason codes (motion / pacing / edit-rhythm / sound)
     6	 * since day one, and the judging well plays clips — the only missing piece was a prompt worth rendering.
     7	 *
     8	 * THE RULE THIS KEEPS: the brain does not invent, it RECOMBINES. Subjects come from the same on-taste pool
     9	 * the still generator uses (`candidatePool` — kept prompts first, then theme-matched corpus subjects, avoid
    10	 * words vetoed), and the motion vocabulary below is a small curated table, not model prose. A video prompt is
    11	 * therefore as much "his" as a still prompt is, and it is reproducible from a seed.
    12	 *
    13	 * NO MIDJOURNEY PARAMETERS. `--sref/--ar/--v` steer Midjourney; a video graph takes natural language, and
    14	 * pasting MJ params into it puts literal junk in the clip's conditioning. Aspect and length belong to the
    15	 * ComfyUI graph Sean captured, not to the sentence.
    16	 */
    17	import { weightedPick, subjectOf } from './corpus.mjs';
    18	import { candidatePool, rngFrom } from './generate.mjs';
    19	
    20	/** What the subject does. Deliberately physical and short — a clip is 4-8 seconds, not a story. */
    21	export const SUBJECT_MOTION = [
    22	  'drifting slowly across frame', 'breaking apart and settling', 'rising through the frame',
    23	  'turning slowly into the light', 'holding still while everything around it moves',
    24	  'sweeping past the lens', 'sinking and resurfacing', 'unfurling', 'closing in on itself',
    25	];
    26	/** How the camera behaves. One move per clip; a shot that does three things reads as three shots. */
    27	export const CAMERA = [
    28	  'slow push in', 'slow pull back', 'locked-off tripod', 'drifting handheld', 'slow orbit to the left',
    29	  'crane down to eye level', 'macro dolly across the surface', 'tracking alongside at walking pace',
    30	];
    31	/** The beat that makes it a shot rather than a photograph: one thing changes. */
    32	export const BEAT = [
    33	  'the light shifts from cold to warm', 'a cloud passes and the shadow crosses the frame',
    34	  'mist thins and the far edge appears', 'sun breaks through in the last second',
    35	  'the surface stills and the reflection resolves', 'the wind drops and everything settles',
    36	];
    37	/** How it should be cut — the film axes the courtroom already judges. */
    38	export const PACING = [
    39	  'one continuous shot, no cuts', 'a single unbroken take, patient',
    40	  'slow build, nothing hurried', 'steady rhythm, no sudden moves',
    41	];
    42	
    43	const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim().replace(/[.,;]+$/, '');
    44	
    45	/**
    46	 * One video prompt. Pure apart from `rng`. Returns null when the subject is too thin to build a shot on.
    47	 * @param {object} pool   candidatePool(corpus, taste, mode) — the SAME pool the still generator draws from
    48	 */
    49	export function videoOne(pool, rng, { pacing = true } = {}) {
    50	  const seed = weightedPick(pool.map((p) => ({ ...p, weight: p.isKept ? 12 : 1 + Math.min(p.score, 8) / 4 })), rng);
    51	  // Strip any Midjourney parameters and trailing attribution: a video graph wants the thing, not the flags.
    52	  const subject = clean(subjectOf(seed.subject || seed.prompt || '').replace(/\s+by\s+[A-Z][\w'’.\- ]{2,40}$/, ''));
    53	  if (subject.split(/\s+/).filter(Boolean).length < 3) return null;
    54	  const motion = SUBJECT_MOTION[Math.floor(rng() * SUBJECT_MOTION.length)];
    55	  const camera = CAMERA[Math.floor(rng() * CAMERA.length)];
    56	  const beat = BEAT[Math.floor(rng() * BEAT.length)];
    57	  const pace = PACING[Math.floor(rng() * PACING.length)];
    58	  const prompt = `${subject}, ${motion}. ${camera}. ${beat}.${pacing ? ` ${pace}.` : ''}`;
    59	  return {
    60	    prompt, subject, motion, camera, beat, pacing: pacing ? pace : null,
    61	    kind: 'video', medium: 'film', grammar: 'shot',
    62	    dedupKey: subject.toLowerCase(),
    63	    lineage: { source_doc: seed.source_doc, source_url: seed.source_url ?? null, taste_score: seed.score },
    64	  };
    65	}
    66	
    67	/**
    68	 * A batch of video prompts from one memory's taste. Same contract as generate(): seeded, deduped by idea,
    69	 * terminates rather than spinning when the memory's words reach only a few subjects.
    70	 */
    71	export function generateVideo(corpus, taste, opts = {}) {
    72	  const seed = opts.seed ?? (Date.now() & 0xffffffff);
    73	  const rng = rngFrom(seed);
    74	  const pool = candidatePool(corpus, taste, opts.mode || 'taste');
    75	  if (!pool.length) {
    76	    throw new Error('No subjects match this memory yet.\nAdd theme words, judge a few grids, or keep a prompt — then the shots have something to be about.');
    77	  }
    78	  const out = [];
    79	  const seen = new Set();
    80	  const count = Math.min(Math.max(opts.count || 5, 1), 50);
    81	  const maxTries = Math.min(count * 40, pool.length * 12 + 200);
    82	  let guard = 0;
    83	  while (out.length < count && guard++ < maxTries) {
    84	    const v = videoOne(pool, rng, { pacing: opts.pacing !== false });
    85	    if (!v || seen.has(v.dedupKey)) continue;
    86	    seen.add(v.dedupKey);
    87	    out.push({ ...v, seed });
    88	  }
    89	  return { seed, prompts: out, poolSize: pool.length, keptInPool: pool.keptCount || 0, drops: pool.drops, exhausted: out.length < count };
    90	}
```

## prompter/lib/renders.mjs
```javascript
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
    26	import { PROFILES, DEFAULT_PROFILE, DEFAULT_PROJECT, isProjectId } from './events.mjs';
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
    77	  if (errors.length) return { ok: false, errors };
    78	  const token = tokenFor(profileId, projectId, text, seed, sref);
    79	  const existing = readIntents(profileId, projectId);
    80	  const dup = existing.find((i) => i.token === token);
    81	  if (dup) return { ok: true, duplicate: true, token, prefix: `${RENDER_SUBDIR}/${token}`, intent: dup };
    82	  if (existing.length >= MAX_INTENTS) return { ok: false, errors: [`this memory holds ${MAX_INTENTS} render intents — prune: node prompter/fetch-renders.mjs --profile ${profileId} --project ${projectId} --prune`] };
    83	  const intent = { token, prompt: text, seed: seed ?? null, sref: sref ? String(sref) : null, createdAt: new Date().toISOString() };
    84	  const p = intentsPath(profileId, projectId);
    85	  fs.mkdirSync(path.dirname(p), { recursive: true });
    86	  fs.appendFileSync(p, JSON.stringify(intent) + '\n', 'utf8');
    87	  return { ok: true, duplicate: false, token, prefix: `${RENDER_SUBDIR}/${token}`, intent };
    88	}
    89	
    90	/** Scan the render dir and join to THIS memory's intents. Unknown tokens — other memories, stray files — are ignored. */
    91	export function listRenders(profile, project, { base = 'http://127.0.0.1:7331' } = {}) {
    92	  if (!nsOk(profile, project)) return { ok: false, error: 'unknown memory', renders: [] };
    93	  const av = available();
    94	  const dir = renderDir();
    95	  if (!av.ok || !fs.existsSync(dir)) return { ok: true, available: false, reason: av.ok ? `no renders yet — ComfyUI has not written to ${dir}` : av.reason, renders: [] };
    96	  const intents = new Map(readIntents(profile, project).map((i) => [i.token, i]));
    97	  const renders = [];
    98	  for (const name of fs.readdirSync(dir)) {
    99	    const m = FILE.exec(name);
   100	    if (!m) continue;
   101	    const intent = intents.get(m[1]);
   102	    if (!intent) continue;
   103	    let st;
   104	    try { st = fs.lstatSync(path.join(dir, name)); } catch { continue; }
   105	    if (!st.isFile()) continue;   // lstat: a symlink is not a file — nothing outside the render dir is ever listed or served
   106	    const ext = m[3].toLowerCase(), n = Number(m[2]);
   107	    renders.push({
   108	      id: `render:${m[1]}:${n}`, token: m[1], n, kind: KIND[ext], mime: MIME[ext],
   109	      url: `${base}/renders/${profile}/${project}/${m[1]}/${n}`,
   110	      prompt: intent.prompt, seed: intent.seed, sref: intent.sref, createdAt: intent.createdAt, sizeBytes: st.size,
   111	      provenance: 'local-comfy', collection: 'render', generated: true, doc: `render/${m[1]}`,
   112	      title: intent.prompt.split(/\s--/)[0].slice(0, 140), credit: null, pageUrl: null,
   113	    });
   114	  }
   115	  renders.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.n - b.n);
   116	  return { ok: true, available: true, renders, dir };
   117	}
   118	
   119	/** Resolve one render to a file, safely: every segment validated, the path composed here, prefix-checked. */
   120	export function renderFile(profile, project, token, n) {
   121	  if (!nsOk(profile, project) || !TOKEN.test(String(token)) || !/^\d{1,5}$/.test(String(n))) return null;
   122	  if (!readIntents(profile, project).some((i) => i.token === token)) return null;
   123	  const dir = path.resolve(renderDir());
   124	  if (!fs.existsSync(dir)) return null;
   125	  const want = `${token}_${String(Number(n)).padStart(5, '0')}_.`;   // ComfyUI zero-pads its counter to 5
   126	  const name = fs.readdirSync(dir).find((f) => f.toLowerCase().startsWith(want) && FILE.test(f));
   127	  if (!name) return null;
   128	  const full = path.resolve(dir, name);
   129	  if (!full.startsWith(dir + path.sep)) return null;
   130	  const ext = name.split('.').pop().toLowerCase();
   131	  let st;
   132	  try { st = fs.lstatSync(full); } catch { return null; }
   133	  if (!st.isFile()) return null;   // symlinks refused (lstat), same as the listing
   134	  return { path: full, kind: KIND[ext], mime: MIME[ext], sizeBytes: st.size };
   135	}
   136	
   137	/** Magic bytes → mime, or null. The serve route refuses a file that does not sniff as what its name says. */
   138	export function sniff(buf) {
   139	  if (buf.length >= 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return 'image/png';
   140	  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
   141	  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
   142	  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') return 'video/mp4';
   143	  if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';
   144	  return null;
   145	}
   146	
   147	/** Drop intents older than `days` that never produced a file. Rewrites the file; returns counts. */
   148	export function pruneIntents(profile, project, { days = 30 } = {}) {
   149	  if (!nsOk(profile, project)) return { ok: false, error: 'unknown memory' };
   150	  const intents = readIntents(profile, project);
   151	  const have = new Set(listRenders(profile, project).renders.map((r) => r.token));
   152	  const cutoff = Date.now() - days * 86400_000;
   153	  const keep = intents.filter((i) => have.has(i.token) || Date.parse(i.createdAt) >= cutoff);
   154	  if (keep.length !== intents.length) fs.writeFileSync(intentsPath(profile, project), keep.map((i) => JSON.stringify(i)).join('\n') + (keep.length ? '\n' : ''), 'utf8');
   155	  return { ok: true, before: intents.length, after: keep.length, pruned: intents.length - keep.length };
   156	}
```

## prompter/lib/routes-renders.mjs
```javascript
     1	/**
     2	 * routes-renders.mjs — the render loop's three routes.
     3	 *
     4	 *   POST /api/intent   {profileId, projectId, prompt, seed?, sref?} → { token, prefix }   (a WRITE: sits behind the origin gate)
     5	 *   GET  /api/renders  ?profile=&project=                          → this memory's renders (read; scans, never writes)
     6	 *   GET  /renders/<profile>/<project>/<token>/<n>                  → the file, sniffed, size-capped, seekable
     7	 *   HEAD /renders/…                                                → the same headers, no body (players probe with this)
     8	 *
     9	 * The client never names a path. Every URL segment is validated; the file is found by the server from a
    10	 * directory listing and prefix-checked before a byte is read. A file that does not sniff as its extension
    11	 * is refused (415); one over the cap is refused (413). Byte ranges are honoured (lib/range.mjs) so a clip
    12	 * can be scrubbed in the judging well. Loopback only, like everything on this server.
    13	 */
    14	import fs from 'node:fs';
    15	import { namespaceFrom } from './routes-modes.mjs';
    16	import { mintIntent, listRenders, renderFile, sniff, SIZE_CAP } from './renders.mjs';
    17	import { parseRange, partialHeaders, wholeHeaders } from './range.mjs';
    18	
    19	const RENDER_URL = /^\/renders\/([a-z]+)\/([a-z0-9-]+)\/([a-f0-9]{12})\/(\d{1,5})$/;
    20	
    21	export async function handleRenderRoutes({ url, req, res, json, readBody, base }) {
    22	  const p = url.pathname;
    23	  if (p === '/api/intent' && req.method === 'POST') {
    24	    const r = mintIntent(await readBody(req));
    25	    json(res, r.ok ? 200 : 400, r);
    26	    return true;
    27	  }
    28	  if (p === '/api/renders' && req.method === 'GET') {
    29	    const ns = namespaceFrom(url);
    30	    if (ns.error) { json(res, 400, { error: ns.error }); return true; }
    31	    const out = listRenders(ns.profile, ns.project, { base });
    32	    json(res, out.ok ? 200 : 404, out);
    33	    return true;
    34	  }
    35	  const m = RENDER_URL.exec(p);
    36	  if (m && (req.method === 'GET' || req.method === 'HEAD')) {
    37	    const f = renderFile(m[1], m[2], m[3], m[4]);
    38	    if (!f) { json(res, 404, { error: 'no such render' }); return true; }
    39	    if (f.sizeBytes > SIZE_CAP[f.kind]) { json(res, 413, { error: `render exceeds the ${f.kind} size cap` }); return true; }
    40	    // Sniff before anything is served: the name says .png, the bytes must agree.
    41	    const head = Buffer.alloc(16);
    42	    const fd = fs.openSync(f.path, 'r');
    43	    try { fs.readSync(fd, head, 0, 16, 0); } finally { fs.closeSync(fd); }
    44	    const mime = sniff(head);
    45	    if (!mime || mime !== f.mime) { json(res, 415, { error: 'file does not sniff as its extension' }); return true; }
    46	    const r = parseRange(req.headers?.range, f.sizeBytes);
    47	    if (r.kind === 'unsatisfiable') {
    48	      res.writeHead(416, { 'content-range': `bytes */${f.sizeBytes}`, 'accept-ranges': 'bytes', 'content-length': 0 });
    49	      return res.end(), true;
    50	    }
    51	    // `.pipe()` does NOT forward a source error to the destination, and an unhandled 'error' on a
    52	    // ReadStream is an uncaught exception — which takes the whole server down, mid-judging, for all
    53	    // four tabs. This is not hypothetical here: renders live under SWAN_COMFY_OUTPUT, which is
    54	    // designed for a mapped network drive (Z:). A drive that drops mid-transfer, or a file ComfyUI
    55	    // overwrites between the lstat above and the read, emits EIO/ENOENT on the stream. Destroy the
    56	    // response instead: headers are already sent, so a truncated body is the only honest answer.
    57	    // (round-3 panel, GLM 5.3 blocker 3)
    58	    const send = (opts) => {
    59	      const s = fs.createReadStream(f.path, opts);
    60	      s.on('error', () => res.destroy());
    61	      s.pipe(res);
    62	      return true;
    63	    };
    64	    if (r.kind === 'range') {
    65	      res.writeHead(206, partialHeaders(r, f.sizeBytes, mime));
    66	      if (req.method === 'HEAD') return res.end(), true;
    67	      return send({ start: r.start, end: r.end });
    68	    }
    69	    res.writeHead(200, wholeHeaders(f.sizeBytes, mime));   // `accept-ranges` advertised even on a whole body
    70	    if (req.method === 'HEAD') return res.end(), true;
    71	    return send(undefined);
    72	  }
    73	  return false;
    74	}
```

## prompter/lib/routes-modes.mjs
```javascript
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
    76	  const excludeSrefs = profile === DEFAULT_PROFILE ? loadTaste().rejectedSrefs : [];
    77	  const out = selectProbe({ images: pool.images, n, seed, excludeSrefs, excludeIds, mix: mix ?? pool.mix });
    78	  // Pool exhaustion is a stated state, not a silent short grid (panel 2026-08-25).
    79	  const exhausted = out.candidates.length < n;
    80	  return {
    81	    profileId: profile, projectId: project, pool: pool.pool, excludedCount: excludeIds.length, exhausted,
    82	    hint: exhausted ? `this memory has judged nearly every picture in its ${pool.pool} pool (${out.candidates.length} left for this grid) — grow it: node prompter/fetch-photos.mjs --project ${profile}/${project}` : null,
    83	    seed: out.seed, strata: out.strata,
    84	    candidates: out.candidates.map((c) => ({
    85	      id: c.id, url: c.url, sref: c.sref, doc: c.doc, collection: c.collection, title: c.title,
    86	      provenance: c.provenance, credit: c.credit ?? null, pageUrl: c.pageUrl ?? null, gridPosition: c.gridPosition,
    87	    })),
    88	  };
    89	}
    90	
    91	/**
    92	 * @returns {Promise<boolean>} true when the request was handled.
    93	 * `here` = the prompter directory; `json` / `readBody` are serve.mjs's helpers.
    94	 */
    95	export async function handleModeRoutes({ url, req, res, json, readBody, here, base }) {
    96	  const p = url.pathname;
    97	  if (req.method === 'GET' && SHELL[p]) {
    98	    const html = readFileSync(path.join(here, 'app.html'), 'utf8').replace('data-tab="make"', `data-tab="${SHELL[p]}"`);
    99	    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
   100	    res.end(html);
   101	    return true;
   102	  }
   103	  if (req.method === 'GET' && STATIC[p]) {
   104	    const [file, type] = STATIC[p];
   105	    res.writeHead(200, { 'content-type': type });
   106	    res.end(readFileSync(path.join(here, file), 'utf8'));
   107	    return true;
   108	  }
   109	  if (p === '/api/projects' && req.method === 'GET') {
   110	    const profiles = {};
   111	    for (const pr of PROFILES) profiles[pr] = listProjects(pr);
   112	    json(res, 200, { profiles });
   113	    return true;
   114	  }
   115	  if (p === '/api/projects' && req.method === 'POST') {
   116	    const r = createProject(await readBody(req));
   117	    json(res, r.ok ? 200 : 400, r);
   118	    return true;
   119	  }
   120	  if (p === '/api/probe' && req.method === 'GET') {
   121	    const ns = namespaceFrom(url);
   122	    if (ns.error) { json(res, 400, { error: ns.error }); return true; }
   123	    const n = Math.min(24, Math.max(2, Number(url.searchParams.get('n') ?? 12) || 12));
   124	    const seedRaw = url.searchParams.get('seed');
   125	    const seed = seedRaw && /^\d+$/.test(seedRaw) ? Number(seedRaw) : undefined;
   126	    if (url.searchParams.get('pool') === 'renders') {   // an explicit choice — real pictures stay the default
   127	      const out = renderProbeFor({ ...ns, n, seed, base });
   128	      json(res, out.error ? 404 : 200, out);
   129	      return true;
   130	    }
   131	    // Manual quota overrides (Sean's experiments). A shareable pool has no Midlibrary to fall back to.
   132	    const q = (k) => { const v = url.searchParams.get(k); return v !== null && /^\d+$/.test(v) ? Math.min(Number(v), n) : undefined; };
   133	    const webb = q('webb'), photo = q('photo');
   134	    const mix = webb === undefined && photo === undefined ? undefined
   135	      : { ...poolFor(ns.profile, ns.project, []).mix, ...(webb !== undefined ? { webb } : {}), ...(photo !== undefined ? { photo } : {}) };
   136	    const out = probeFor({ ...ns, n, seed, mix });
   137	    json(res, out.error ? 404 : 200, out);
   138	    return true;
   139	  }
   140	  // The pictures a memory has already judged — so a bundle import can be checked whole before one line is written.
   141	  if (p === '/api/judged' && req.method === 'GET') {
   142	    const ns = namespaceFrom(url);
   143	    if (ns.error) { json(res, 400, { error: ns.error }); return true; }
   144	    if (!readProject(ns.profile, ns.project)) { json(res, 404, { error: 'unknown project' }); return true; }
   145	    const events = readEventsFor(ns.profile, ns.project);
   146	    json(res, 200, { profileId: ns.profile, projectId: ns.project, ids: judgedIds(events), eventIds: events.map((e) => e.eventId).filter(Boolean) });
   147	    return true;
   148	  }
   149	  // The kept list — the compounding channel, finally visible. Sean's own list is markdown he edits himself.
   150	  if (p === '/api/kept' && req.method === 'GET') {
   151	    const ns = namespaceFrom(url);
   152	    if (ns.error) { json(res, 400, { error: ns.error }); return true; }
   153	    const pj = readProject(ns.profile, ns.project);
   154	    if (!pj) { json(res, 404, { error: 'unknown project' }); return true; }
   155	    const isDefault = ns.profile === DEFAULT_PROFILE && ns.project === DEFAULT_PROJECT;
   156	    json(res, 200, { profileId: ns.profile, projectId: ns.project, title: pj.title, readOnly: isDefault, kept: isDefault ? loadTaste().kept : readKept(ns.profile, ns.project) });
   157	    return true;
   158	  }
   159	  if (p === '/api/profile' && req.method === 'GET') {
   160	    const ns = namespaceFrom(url);
   161	    if (ns.error) { json(res, 400, { error: ns.error }); return true; }
   162	    const out = compileProfile({ ...ns, write: false });
   163	    json(res, out.error ? 404 : 200, out);
   164	    return true;
   165	  }
   166	  return false;
   167	}
```

## prompter/lib/routes-make.mjs
```javascript
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
```javascript
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

## prompter/lib/taste.mjs
```javascript
     1	/**
     2	 * Taste loader — reads the half of the vault that encodes JUDGEMENT.
     3	 *
     4	 * Everything here is Sean's, and everything here is optional: the prompter must degrade
     5	 * honestly when taste is thin rather than pretending its output is personalised. A generator
     6	 * that silently behaves identically with and without ratings is lying about what it knows.
     7	 */
     8	import fs from 'node:fs';
     9	import path from 'node:path';
    10	import { VAULT } from './corpus.mjs';
    11	
    12	const TASTE = path.join(VAULT, 'taste');
    13	const read = (f) => {
    14	  const p = path.join(TASTE, f);
    15	  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    16	};
    17	
    18	/** Markdown table rows → objects. Skips the header and the `|---|` rule. */
    19	function tableRows(md, heading) {
    20	  const sec = heading
    21	    ? (md.split(/^##\s+/m).find((s) => s.toLowerCase().startsWith(heading.toLowerCase())) || '')
    22	    : md;
    23	  return sec.split('\n')
    24	    .filter((l) => l.trim().startsWith('|') && !/^\|\s*-+/.test(l.trim()))
    25	    .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
    26	    .filter((cells) => cells.some((c) => c && !/^(style|--sref|rating|note|why not|sref)/i.test(c)));
    27	}
    28	
    29	/** Bullets under a given `## heading`. */
    30	function bullets(md, heading) {
    31	  const sec = md.split(/^##\s+/m).find((s) => s.toLowerCase().startsWith(heading.toLowerCase()));
    32	  if (!sec) return [];
    33	  return sec.split('\n')
    34	    .filter((l) => /^\s*[-*]\s+/.test(l))
    35	    .map((l) => l.replace(/^\s*[-*]\s+/, '').replace(/\*\*/g, '').trim())
    36	    .filter((l) => l && !/^\(add|^\(log/i.test(l));
    37	}
    38	
    39	/** Free-text lines under a heading that are not bullets (the "moods" prose lists). */
    40	function inlineList(md, heading) {
    41	  const sec = md.split(/^##\s+/m).find((s) => s.toLowerCase().startsWith(heading.toLowerCase()));
    42	  if (!sec) return [];
    43	  return sec.split('\n').slice(1)
    44	    .filter((l) => l.includes('·'))
    45	    .flatMap((l) => l.split('·'))
    46	    .map((s) => s.trim())
    47	    .filter(Boolean);
    48	}
    49	
    50	/**
    51	 * Kept prompts from kept.md — ONLY the bullets under `## Kept`. The file also holds `## Killed`
    52	 * (prompts that disappointed) and `## How to add` (an example bullet); reading every bullet in the
    53	 * file once meant a killed prompt would re-enter generation as an exemplar. Exported for testing.
    54	 */
    55	export function parseKept(keptMd) {
    56	  const sec = keptMd.split(/^##\s+/m).find((s) => /^kept\b/i.test(s));
    57	  if (!sec) return [];
    58	  return sec.split('\n').slice(1)
    59	    .filter((l) => /^\s*[-*]\s+/.test(l))
    60	    .map((l) => l.replace(/^\s*[-*]\s+/, '').replace(/^`|`$/g, '').trim())
    61	    .filter((l) => l && !/^\(/.test(l));
    62	}
    63	
    64	export function loadTaste() {
    65	  const themesMd = read('themes.md');
    66	  const lovedMd = read('loved-srefs.md');
    67	  const rejectedMd = read('rejected.md');
    68	  const keptMd = read('kept.md');
    69	
    70	  const warnings = [];
    71	
    72	  // --- SREF ratings -------------------------------------------------------
    73	  const loved = [];
    74	  const seenCodes = new Set();
    75	  for (const r of tableRows(lovedMd, 'How to rate')) {
    76	    const code = (r[0] || '').replace(/[`\s]/g, '');
    77	    const rating = parseInt(r[2], 10);
    78	    if (!/^\d{5,12}$/.test(code)) continue;
    79	    if (!(rating >= 1 && rating <= 5)) {
    80	      warnings.push(`loved-srefs.md: code ${code} has unparseable rating "${r[2]}" — row ignored`);
    81	      continue;
    82	    }
    83	    if (seenCodes.has(code)) {
    84	      warnings.push(`loved-srefs.md: code ${code} rated more than once — later row ignored`);
    85	      continue;
    86	    }
    87	    seenCodes.add(code);
    88	    loved.push({ code, style_name: r[1] || null, rating, note: r[3] || '' });
    89	  }
    90	
    91	  // Rejected codes live in two files; rejection always wins over a rating, because a rejection is
    92	  // the more recent and more decisive act. Without a stated precedence the two files can disagree
    93	  // and the generator silently picks one.
    94	  const rejectedSrefs = [...new Set([
    95	    ...tableRows(lovedMd, 'Rejected').map((r) => (r[0] || '').replace(/[`\s]/g, '')),
    96	    ...tableRows(rejectedMd, 'Rejected SREF codes').map((r) => (r[0] || '').replace(/[`\s]/g, '')),
    97	  ])].filter((c) => /^\d{5,12}$/.test(c));
    98	
    99	  for (const l of loved) {
   100	    if (rejectedSrefs.includes(l.code)) {
   101	      warnings.push(`code ${l.code} is both rated ${l.rating}/5 and rejected — rejection wins`);
   102	    }
   103	  }
   104	
   105	  // --- Themes -------------------------------------------------------------
   106	  const identity = bullets(themesMd, 'Core visual identity');
   107	  const moodsFit = inlineList(themesMd, 'Moods that fit');
   108	  const moodsAvoid = inlineList(themesMd, 'Moods that do not');
   109	
   110	  // Keywords drive semantic steering over the real prompt corpus.
   111	  const STOP = new Set(['the', 'and', 'a', 'an', 'of', 'is', 'not', 'with', 'that', 'for', 'over',
   112	    'than', 'over', 'from', 'into', 'their', 'them', 'this', 'it', 'as', 'on', 'in', 'to', 'by',
   113	    'be', 'are', 'or', 'default', 'rather', 'never', 'should', 'feel', 'like', 'first', 'own',
   114	    'sitting', 'reads', 'emerges', 'sits', 'behind', 'moment', 'lens', 'still', 'something']);
   115	  /**
   116	   * Extract keywords from free-text bullets, skipping words that are NEGATED in place.
   117	   * "Dark-first, luxury depth" should yield `depth`; "no depth cue" must not, or a word from Sean's
   118	   * own identity ends up on the veto list and silently kills every prompt that contains it.
   119	   * (That exact collision was live: `depth` appeared in both files.)
   120	   */
   121	  const extract = (lines) => {
   122	    const out = new Set();
   123	    for (const line of lines) {
   124	      const words = line.toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/\s+/).filter(Boolean);
   125	      for (let i = 0; i < words.length; i++) {
   126	        const w = words[i];
   127	        if (w.length <= 3 || STOP.has(w)) continue;
   128	        const prev = words[i - 1];
   129	        const prev2 = words[i - 2];
   130	        if (prev === 'no' || prev === 'without' || prev === 'never'
   131	            || prev2 === 'no' || prev2 === 'without') continue;   // negated in place
   132	        out.add(w);
   133	      }
   134	    }
   135	    return [...out];
   136	  };
   137	
   138	  const keywords = extract([...identity, ...moodsFit]);
   139	  const avoidRaw = extract([
   140	    ...moodsAvoid,
   141	    ...bullets(rejectedMd, 'Looks to avoid'),
   142	    ...bullets(rejectedMd, 'Subjects to avoid'),
   143	  ]);
   144	  // A positive theme always beats an incidentally-extracted negative: the identity file is the
   145	  // deliberate statement, the avoid file is prose that happens to contain the same token.
   146	  const avoidWords = avoidRaw.filter((w) => !keywords.includes(w));
   147	
   148	  // Collisions are now resolved in favour of the theme, but say so — a word Sean believes he is
   149	  // vetoing while it is in fact boosting is worth knowing about.
   150	  for (const c of avoidRaw.filter((w) => keywords.includes(w))) {
   151	    warnings.push(`"${c}" appears in both themes.md and rejected.md — treated as a THEME (positive). `
   152	      + `If you meant to reject it, remove it from themes.md.`);
   153	  }
   154	
   155	  // --- Kept prompts: the compounding channel ------------------------------
   156	  // Prompts Sean kept re-enter generation as exemplars. Without this, "filling the brain" changes
   157	  // nothing about what gets generated: rating style codes only reweights decoration, while subject
   158	  // selection stays frozen against a corpus written by somebody else.
   159	  const kept = parseKept(keptMd);
   160	
   161	  // Only ratings >= 3 count as endorsement. Counting 1-2 star ratings toward the decay would let
   162	  // twenty *dislikes* drive exploration to its floor while the exploit pool holds only dislikes.
   163	  const positiveCount = loved.filter((l) => l.rating >= 3 && !rejectedSrefs.includes(l.code)).length;
   164	
   165	  return {
   166	    loved,
   167	    rejectedSrefs,
   168	    kept,
   169	    identity,
   170	    moodsFit,
   171	    moodsAvoid,
   172	    keywords,
   173	    avoidWords,
   174	    warnings,
   175	    ratedCount: loved.length,
   176	    positiveCount,
   177	    /** Honest self-assessment — the CLI surfaces this so output is never oversold. */
   178	    confidence:
   179	      positiveCount >= 15 ? 'strong'
   180	        : positiveCount >= 5 ? 'partial'
   181	          : positiveCount > 0 || kept.length ? 'weak'
   182	            : 'themes-only',
   183	  };
   184	}
   185	
   186	/** Whole-word match. Substring matching made "art" fire on "cartoon"/"heart" and "cat" veto
   187	 *  "delicate" — false hits on the positive side and invisible vetoes on the negative side. */
   188	const wordRe = new Map();
   189	function hasWord(text, word) {
   190	  let re = wordRe.get(word);
   191	  if (!re) {
   192	    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
   193	    // \b fails around hyphens, so allow hyphen/underscore as boundaries too.
   194	    re = new RegExp(`(^|[^a-z0-9])${esc}(s|es)?($|[^a-z0-9])`, 'i');
   195	    wordRe.set(word, re);
   196	  }
   197	  return re.test(text);
   198	}
   199	
   200	/**
   201	 * Score text against Sean's taste.
   202	 *
   203	 * An avoid-word is a VETO, not a penalty. Additive scoring let two theme hits outbid one avoid hit
   204	 * (+2 +2 −3 = +1 → emitted), so "cartoon swan on a lake" passed while "cartoon" sat on the never
   205	 * list. 111 avoid keywords are 73% of the taste signal; they cannot be advisory.
   206	 *
   207	 * Returns { score, vetoedBy, matched } so callers can report WHY something was dropped.
   208	 */
   209	export function tasteScoreDetail(text, taste) {
   210	  const t = text.toLowerCase();
   211	  const vetoedBy = taste.avoidWords.filter((k) => hasWord(t, k));
   212	  if (vetoedBy.length) return { score: -Infinity, vetoedBy, matched: [] };
   213	  const matched = taste.keywords.filter((k) => hasWord(t, k));
   214	  return { score: matched.length * 2, vetoedBy: [], matched };
   215	}
   216	
   217	/** Convenience wrapper for callers that only need the number. */
   218	export const tasteScore = (text, taste) => tasteScoreDetail(text, taste).score;
```

## prompter/lib/corpus.mjs
```javascript
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

Lead with your answer to the actual question: **has this run dry, or is there a fifth corpus door?**
Then a ranked list (P0/P1/P2) with file, function, concrete failing input, and the smallest fix.
Label anything you cannot reproduce SPECULATIVE — four seats have already been through this file, so
the cheap findings are gone and a plausible-but-wrong one costs more than it is worth.

Then **"What I checked and found sound"**, naming the specific attack you tried.

End with **APPROVE / REVISE / REJECT**.
