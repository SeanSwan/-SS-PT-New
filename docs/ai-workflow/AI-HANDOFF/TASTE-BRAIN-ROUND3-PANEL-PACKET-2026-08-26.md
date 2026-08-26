---
decision: "Round-3 hostile review of the Swan Taste Brain — the half of the session that has NEVER been panel-reviewed (the render loop, Make/Make 4, HTTP Range, the one-shell app, video shots, and the own-material fix)."
status: open
supersedes: none
board: SWA-186
date: 2026-08-26
privacy: IDs and roles only. The second user is "the partner". No names, no keys, no PII.
---

# Swan Taste Brain — round-3 hostile review packet

## Your remit

You are a **hostile reviewer**. Your job is to find defects that ship, not to praise the design.
Rank every finding **P0 / P1 / P2** and give, for each: the **file**, the **exact function or line
region**, a **concrete failure scenario with inputs**, and the **smallest fix**. If you cannot name a
concrete input that produces the failure, mark the finding SPECULATIVE and say so — a plausible-sounding
finding that does not reproduce costs more than it is worth.

**Read this first — it changes where you should look.**

This tool has already survived **two hostile panels** (same seat lineup, 2026-08-25). Those rounds fixed
the licence law, the never-show-twice law, the undo path, the bundle import, and the taste-source labels.
**Do not re-litigate those.** They are listed under "Already fixed — do not re-report" below, and a
finding that lands there will be scored as noise.

**The gap you are being hired to close:** round 2 attacked the render-loop *contract on paper, before any
code was written*. Everything from commit 9 onward — the render-loop engine, the ComfyUI output scan, the
path-composed file server, Make and Make 4, HTTP Range, the one-shell four-tab app, video shot prompts,
and the own-material generation fix — **has never been reviewed by anyone but its author.** That is
roughly half the session and it is where the security surface lives (a file server, a byte-range handler,
an outbound POST to a local ComfyUI, and a JSON graph mutated from user input).

Attack that. Specifically, in this order:

1. **The file server + Range handler** (`lib/routes-renders.mjs`, `lib/renders.mjs`, `lib/range.mjs`,
   `lib/png.mjs`). Path composition, traversal, symlinks, sniffing, size caps, namespace binding,
   malformed/negative/overlapping Range headers, integer overflow in offsets.
2. **Make / Make 4** (`lib/workflow.mjs`, `lib/routes-make.mjs`). The graph is Sean's own captured JSON
   and three fields are substituted into it. What input makes the substitution hit the wrong node, hit
   more than three fields, silently hit zero, or corrupt the graph? What happens with a graph shape the
   capture never saw? What does Make 4 do when one of the four fails halfway?
3. **The own-material law** (`lib/taste-namespace.mjs` `ownSubjects`, `lib/generate.mjs` `pool.ownOnly`).
   This is the fix for the session's worst defect: a partner memory was generating prompt text lifted from
   Sean's licensed Midjourney corpus. **Try to find a second door into the corpus** — any path by which a
   non-Sean profile can end up with corpus-derived words, artists, srefs, or subjects, including through
   kept prompts, imported bundles, judged renders, video shots, or the printed brief.
4. **The cross-memory boundary** generally (`lib/projects.mjs`, `lib/events.mjs`, `lib/profile.mjs`,
   `lib/routes-modes.mjs`). One memory is `profile × project`. Find a way to read or write across that
   line — via slug handling, path composition, the registry, undo/reversal, or the bundle round-trip.
5. **The origin gate and loopback assumption** (`serve.mjs`, `lib/origin.mjs`). The server is
   unauthenticated by design and binds 127.0.0.1. What still reaches it — DNS rebinding, a hostile page in
   Sean's own browser, a form post, a preflight-exempt content type, WebSocket, redirects?
6. **Correctness of the taste maths** (`lib/profile.mjs` `tally`, `lib/taste-namespace.mjs`). A render
   judgement must count toward *subjects only* and **zero** toward style codes. Find an input where a
   render leaks into style, or where a reversal fails to undo a tally, or where two floors disagree.

Also welcome, lower priority: dead code, a law asserted in a comment but not enforced anywhere, a test
that cannot fail, and any place the README or the laws table describes behaviour the code does not have.

## Already fixed — do NOT re-report

- The partner "include Midlibrary" opt-in (removed; the pool is computed from the profile).
- Replay/overlap double-counting of judgements (never-show-twice now enforced at the writer, for grids
  **and** pairs).
- No correction path for a misclick (undo is now an idempotent `reversal` event).
- Silent pool exhaustion (now stated).
- The generator ignoring the compiled profile (the tie-in landed).
- Minting on a GET behind a POST-only gate (fixed before code).
- `tasteSource` claiming "evidence" for a words-only memory.
- Non-atomic bundle import (now all-or-nothing).
- `keptFor` vs `keepFor` naming confusion (the read helper is now `readKept`).

Two findings from earlier rounds were **refuted with evidence** and should not return unless you can
show code that contradicts the refutation: "an unknown source bypasses the witness law" (the enum check
runs first) and "`/api/event` is ungated" (the origin gate runs before every POST).

## Ground truth you can rely on

- **9 test suites, 404 checks, all passing** at the commit under review (`fb052c3`), run from the repo
  root. The suites are `prompter/test*.mjs`; they resolve fixtures relative to the **repo root**, not
  `prompter/`.
- The server binds **127.0.0.1 only** and is unauthenticated by design.
- `swan-taste-brain` is a **local git repo with no remote**, deliberately: it contains a third-party
  copyrighted corpus (Midlibrary) that must never be committed, pushed, or served to anyone but Sean.

## The laws the code is supposed to enforce

| Law | Where it is supposed to live |
|---|---|
| A witness writes only its own memory (`source` must equal `profileId`) | `lib/events.mjs` `validateEvent` |
| Never-show-twice, enforced at the **writer**, for every judgement kind | `lib/events.mjs` `appendEvent` |
| Undo is a `reversal` event (idempotent); an undone grid frees its pictures | `events.mjs` + `profile.mjs` `activeEvents` |
| **Midlibrary is Sean's alone** — the full pool is computed from the PROFILE; never a partner, a client, a bundle, or a printed brief | `lib/projects.mjs` `poolFor`, `profile.mjs` picks filter |
| **A non-Sean memory generates only from its own material** (kept, picks, theme words) — never the corpus, never a corpus artist | `lib/taste-namespace.mjs` `ownSubjects`, `generate.mjs` `pool.ownOnly` |
| A judged **render** counts toward subjects only — **zero** toward style codes | `lib/profile.mjs` `tally` |
| Video prompts carry **no Midjourney parameters** | `lib/video.mjs` |
| Make substitutes exactly three fields and proves it (self-diff + field-map validation) | `lib/workflow.mjs` `applyTo` |
| Loopback only; every write behind the origin gate; renders sniffed, size-capped, namespace-bound | `serve.mjs`, `lib/routes-renders.mjs` |
| Tests may never write the production workflow path (`SWAN_COMFY_WORKFLOW`) | `lib/workflow.mjs` |

## The system in one screen

```
node prompter/serve.mjs   ->   http://127.0.0.1:7331   (loopback only, unauthenticated by design)

ONE PAGE, FOUR TABS  (app.html + app-shell.js + app-{make,judge,directions,kept}.js)
  Make        generate prompts (Stills | Video) -> Make / Make 4 / Keep / Copy / Prefix
  Judge       12-up grid on a neutral-gray well (Pictures | My renders)
  Directions  three tier-labelled directions + the pictures chosen + "Renders you liked"
  Kept        the prompts this memory kept

ONE MEMORY = profile x project      profile in {sean, partner, client}   ·   project = a slug, never a name
  sean/default -> taste/events/                     (Sean's own, 3 grids / 18 judgements)
  everything else -> taste/profiles/<profile>/<project>/{project.json, events/, kept.md, renders/, taste-profile.json}
  Created EMPTY. Nothing is ever copied in from another memory.

THE RENDER LOOP (ComfyUI pulls; the brain never drives it and never stores image bytes)
  Swan Prompt node (profile · project · mint) -> GET /api/prompt -> POST /api/intent -> prefix swan/<token>
  -> prefix wired into SaveImage/SaveVideo -> <output>/swan/<token>_00001_.png|mp4
  -> GET /api/probe?pool=renders -> judge -> the memory sharpens
  Make / Make 4 do the same from the page: substitute prompt + seed + prefix into SEAN'S captured graph
  and POST it to ComfyUI's /prompt.
```

---

# THE SOURCE UNDER REVIEW

Everything below is the current state at commit `fb052c3`. Line numbers are per-file.

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
    45	    // Local page + ComfyUI (a different origin on the same host) both call this.
    46	    'access-control-allow-origin': '*',
    47	    'access-control-allow-headers': 'content-type',
    48	  });
    49	  res.end(payload);
    50	};
    51	
    52	const readBody = (req) => new Promise((resolve, reject) => {
    53	  let raw = '';
    54	  req.on('data', (c) => {
    55	    raw += c;
    56	    if (raw.length > 64_000) { reject(new Error('body too large')); req.destroy(); }
    57	  });
    58	  req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('invalid json')); } });
    59	  req.on('error', reject);
    60	});
    61	
    62	/** Delegate writes to the CLI so there is exactly one implementation of "rate" and "keep". */
    63	function cli(args) {
    64	  return execFileSync(process.execPath, [path.join(HERE, 'swan-prompt.mjs'), ...args], {
    65	    encoding: 'utf8', timeout: 20_000,
    66	  }).trim();
    67	}
    68	
    69	const server = http.createServer(async (req, res) => {
    70	  const url = new URL(req.url, `http://${HOST}:${PORT}`);
    71	
    72	  if (req.method === 'OPTIONS') {
    73	    res.writeHead(204, {
    74	      'access-control-allow-origin': '*',
    75	      'access-control-allow-methods': 'GET,POST,OPTIONS',
    76	      'access-control-allow-headers': 'content-type',
    77	    });
    78	    return res.end();
    79	  }
    80	
    81	  try {
    82	    // The PAGE is one shell with four tabs (Make · Judge · Directions · Kept), served by
    83	    // lib/routes-modes.mjs at `/` and at every legacy path (/probe → Judge, /brief → Directions), so old
    84	    // bookmarks land on the right tab and there is exactly ONE implementation of each surface.
    85	    // Pictures are CDN URLs the BROWSER loads; this process never fetches image bytes.
    86	
    87	    // /api/probe, /api/profile, /api/projects, /probe.js, the shell and its modules live in routes-modes:
    88	    // the same probe, addressed to one memory (profile × project). Sean's default is unchanged.
    89	
    90	    if (url.pathname === '/api/stats' && req.method === 'GET') {
    91	      const taste = loadTaste();
    92	      return json(res, 200, {
    93	        srefCodes: corpus.srefCount,
    94	        prompts: corpus.prompts.length,
    95	        artists: corpus.artists.length,
    96	        rated: taste.ratedCount,
    97	        endorsed: taste.positiveCount,
    98	        kept: taste.kept.length,
    99	        rejected: taste.rejectedSrefs.length,
   100	        confidence: taste.confidence,
   101	        warnings: taste.warnings,
   102	      });
   103	    }
   104	
   105	    if (url.pathname === '/api/prompt' && req.method === 'GET') {
   106	      // One memory's taste (lib/taste-namespace.mjs): Sean's markdown + his evidence codes, or a
   107	      // partner/client project's words, picks and kept prompts. ?profile=&project= — defaults to Sean.
   108	      const ns = namespaceFrom(url);
   109	      if (ns.error) return json(res, 400, { error: ns.error });
   110	      const taste = tasteFor({ ...ns, corpus });
   111	      if (!taste) return json(res, 404, { error: 'unknown project' });
   112	      const n = Math.min(50, Math.max(1, Number(url.searchParams.get('n') ?? 5) || 5));
   113	      const mode = url.searchParams.get('mode') === 'surprise' ? 'surprise' : 'taste';
   114	      const ar = /^\d{1,2}:\d{1,2}$/.test(url.searchParams.get('ar') ?? '') ? url.searchParams.get('ar') : '16:9';
   115	      const seedRaw = url.searchParams.get('seed');
   116	      const seed = seedRaw && /^\d+$/.test(seedRaw) ? Number(seedRaw) : undefined;
   117	
   118	      let pool = corpus;
   119	      if (url.searchParams.get('cinematic') === '1') {
   120	        const sref = corpus.sref.filter((c) =>
   121	          /cinematic|film|movie|noir/i.test(`${c.source_title} ${c.style_name} ${c.example_prompt}`));
   122	        if (sref.length) pool = { ...corpus, sref };
   123	      }
   124	
   125	      const tasteMeta = { source: taste.tasteSource, evidenceSrefs: taste.evidenceSrefs, keywords: taste.keywords.length, kept: taste.kept.length, confidence: taste.confidence };
   126	      // medium=video → motion prompts from the SAME taste (lib/video.mjs). No Midjourney params: a video
   127	      // graph takes natural language, and aspect/length live in the ComfyUI graph, not in the sentence.
   128	      if (url.searchParams.get('medium') === 'video') {
   129	        let v;
   130	        try { v = generateVideo(pool, taste, { count: n, mode, seed }); } catch (err) {
   131	          return json(res, 200, { seed: null, mode, medium: 'video', profileId: ns.profile, projectId: ns.project, taste: tasteMeta, confidence: taste.confidence, exhausted: true, poolSize: 0, vetoed: 0, prompts: [], hint: String(err.message).split('\n')[0] });
   132	        }
   133	        return json(res, 200, {
   134	          seed: v.seed, mode, medium: 'video', profileId: ns.profile, projectId: ns.project, taste: tasteMeta,
   135	          confidence: taste.confidence, exhausted: v.exhausted, poolSize: v.poolSize, vetoed: v.drops?.vetoed ?? 0,
   136	          prompts: v.prompts.map((p) => ({ prompt: p.prompt, subject: p.subject, grammar: p.grammar, kind: 'video', camera: p.camera, motion: p.motion, sref: null, styleName: null, rating: null, isNew: false })),
   137	        });
   138	      }
   139	      let out;
   140	      try { out = generate(pool, taste, { count: n, mode, ar, seed }); } catch (err) {
   141	        // A fresh memory whose words reach nothing in the corpus is an honest empty, not a 500.
   142	        return json(res, 200, { seed: null, mode, profileId: ns.profile, projectId: ns.project, taste: tasteMeta, confidence: taste.confidence, exhausted: true, poolSize: 0, vetoed: 0, prompts: [], hint: String(err.message).split('\n')[0] });
   143	      }
   144	      return json(res, 200, {
   145	        seed: out.seed,
   146	        mode,
   147	        profileId: ns.profile, projectId: ns.project, taste: tasteMeta,
   148	        confidence: taste.confidence,
   149	        exhausted: out.exhausted,
   150	        poolSize: out.poolSize,
   151	        vetoed: out.drops?.vetoed ?? 0,
   152	        prompts: out.prompts.map((p) => ({
   153	          prompt: p.prompt,
   154	          subject: p.subject,
   155	          grammar: p.grammar,
   156	          sref: p.sref?.code ?? null,
   157	          styleName: p.sref?.style_name ?? null,
   158	          rating: p.sref?.rating ?? null,
   159	          isNew: Boolean(p.sref?.isNew),
   160	        })),
   161	      });
   162	    }
   163	
   164	    // Writes: refuse drive-by browser requests before reading a byte of body (lib/origin.mjs).
   165	    if (req.method === 'POST') {
   166	      const gate = checkWriteRequest(req.headers, PORT);
   167	      if (!gate.ok) return json(res, 403, { error: gate.reason });
   168	    }
   169	
   170	    // Namespace-aware routes (reads + the project write, which sits behind the gate above).
   171	    const base = `http://${HOST}:${PORT}`;
   172	    if (await handleModeRoutes({ url, req, res, json, readBody, here: HERE, base })) return;
   173	    // The render loop: POST /api/intent (gated above), GET /api/renders, GET /renders/<p>/<j>/<token>/<n>.
   174	    if (await handleRenderRoutes({ url, req, res, json, readBody, base })) return;
   175	    // "Make": queue renders in Sean's own ComfyUI graph (POST is gated above).
   176	    if (await handleMakeRoutes({ url, req, res, json, readBody })) return;
   177	
   178	    if (url.pathname === '/api/keep' && req.method === 'POST') {
   179	      const body = await readBody(req);
   180	      if (typeof body.prompt !== 'string' || body.prompt.split(/\s+/).length < 3) {
   181	        return json(res, 400, { error: 'prompt must be a string of at least 3 words' });
   182	      }
   183	      const profile = body.profileId ?? DEFAULT_PROFILE, project = body.projectId ?? DEFAULT_PROJECT;
   184	      // Route-level slug validation (defence in depth; readProject/eventsDirFor already refuse bad ids).
   185	      if (!PROFILES.includes(profile) || !isProjectId(project)) return json(res, 400, { error: 'profileId/projectId must name a memory (slugs only)' });
   186	      if (!(profile === DEFAULT_PROFILE && project === DEFAULT_PROJECT)) {
   187	        // A partner/client memory keeps into its own kept.md — never into Sean's.
   188	        const r = keepFor(profile, project, body.prompt);
   189	        return json(res, r.ok ? 200 : 400, r.ok ? { ok: true, duplicate: r.duplicate, message: r.duplicate ? 'Already kept.' : `Kept. ${r.kept} exemplar${r.kept === 1 ? '' : 's'} now steering ${profile}/${project}.` } : { error: r.error });
   190	      }
   191	      return json(res, 200, { ok: true, message: cli(['--keep', body.prompt]) });
   192	    }
   193	
   194	    if (url.pathname === '/api/unkeep' && req.method === 'POST') {
   195	      const body = await readBody(req);
   196	      const profile = body.profileId ?? DEFAULT_PROFILE, project = body.projectId ?? DEFAULT_PROJECT;
   197	      if (!PROFILES.includes(profile) || !isProjectId(project)) return json(res, 400, { error: 'profileId/projectId must name a memory (slugs only)' });
   198	      const r = unkeepFor(profile, project, body.prompt);
   199	      return json(res, r.ok ? 200 : 400, r);
   200	    }
   201	
   202	    if (url.pathname === '/api/rate' && req.method === 'POST') {
   203	      const body = await readBody(req);
   204	      if (body.profileId && !(body.profileId === DEFAULT_PROFILE && (body.projectId ?? DEFAULT_PROJECT) === DEFAULT_PROJECT)) {
   205	        return json(res, 400, { error: "star ratings are Sean's markdown channel — a project's taste comes from the pictures it judges" });
   206	      }
   207	      const code = String(body.code ?? '');
   208	      const rating = Number(body.rating);
   209	      if (!/^\d{5,12}$/.test(code)) return json(res, 400, { error: 'code must be 5-12 digits' });
   210	      if (!(rating >= 1 && rating <= 5)) return json(res, 400, { error: 'rating must be 1-5' });
   211	      const note = typeof body.note === 'string' ? body.note.slice(0, 200) : '';
   212	      return json(res, 200, { ok: true, message: cli(['--rate', code, String(rating), note]) });
   213	    }
   214	
   215	    // THE single writer of taste/events/*.jsonl. grill-me and every agent POST here; nobody
   216	    // opens the file. Validation + provenance refusal + idempotency live in lib/events.mjs.
   217	    if (url.pathname === '/api/event' && req.method === 'POST') {
   218	      const body = await readBody(req);
   219	      const r = appendEvent(body);
   220	      return json(res, r.ok ? 200 : 400, r);
   221	    }
   222	
   223	    return json(res, 404, { error: 'not found', routes: ['/', '/probe', '/brief', '/api/prompt', '/api/probe', '/api/profile', '/api/projects', '/api/judged', '/api/stats', '/api/keep', '/api/rate', '/api/event', '/api/intent', '/api/renders', '/api/make', '/api/make/status', '/renders/<profile>/<project>/<token>/<n>'] });
   224	  } catch (err) {
   225	    return json(res, 500, { error: String(err.message).slice(0, 200) });
   226	  }
   227	});
   228	
   229	server.listen(PORT, HOST, () => {
   230	  const t = loadTaste();
   231	  console.log(`\nswan-prompt  →  http://${HOST}:${PORT}`);
   232	  console.log(`  corpus : ${corpus.srefCount} sref codes · ${corpus.prompts.length} prompts · ${corpus.artists.length} artists`);
   233	  console.log(`  taste  : ${t.kept.length} kept · ${t.ratedCount} rated (${t.positiveCount} endorsed) · confidence ${t.confidence}`);
   234	  if (t.warnings.length) t.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
   235	  console.log(`\n  page     http://${HOST}:${PORT}/`);
   236	  console.log(`  probe    http://${HOST}:${PORT}/probe      ← Taste Discovery: 12 pictures, pick closest/miss (mode bar: Sean · Partner · Client)`);
   237	  console.log(`  brief    http://${HOST}:${PORT}/brief      ← the readout for one memory (?profile=&project=)`);
   238	  console.log(`  api      curl '${`http://${HOST}:${PORT}/api/prompt?n=3&mode=surprise`}'`);
   239	  console.log(`  vault    ${VAULT}\n`);
   240	});
```

## prompter/lib/origin.mjs
```javascript
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
    93	    if (c?.id) ids.add(c.id);
    94	  }
    95	  const raw = JSON.stringify(e);
    96	  need(!BYTES_RE.test(raw), 'image bytes are refused in events');
    97	  need(raw.length < 64_000, 'event too large');
    98	  for (const k of ['notePublic', 'notePrivate', 'dependsContext']) {
    99	    if (e[k] !== undefined) need(typeof e[k] === 'string' && e[k].length <= MAX_STR, `${k} must be a string ≤ ${MAX_STR} chars`);
   100	  }
   101	  if (e.eventType === 'pair') {
   102	    need(RESPONSES.includes(e.response), `response must be one of ${RESPONSES.join('|')}`);
   103	    need(OUTCOMES.includes(e.outcomeClass), 'outcomeClass required on pair events');
   104	    if (e.reasonCode !== undefined) need(REASONS.includes(e.reasonCode), 'reasonCode not in enum');
   105	    if (e.response === 'depends') need(typeof e.dependsContext === 'string' && e.dependsContext.length > 0, 'dependsContext required when response is depends');
   106	  }
   107	  if (e.eventType === 'grid-selection') {
   108	    need(Array.isArray(e.items) && e.items.length === (e.candidates || []).length, 'grid items must cover every candidate');
   109	    for (const it of e.items || []) {
   110	      need(ids.has(it?.id), 'grid item id must be a candidate id');
   111	      need(VERDICTS.includes(it?.verdict), 'grid item verdict must be closest|miss|neutral');
   112	      if (it?.verdict !== 'neutral') {
   113	        need(REASONS.includes(it?.reasonCode), 'reasonCode required on closest/miss items');
   114	        need(OUTCOMES.includes(it?.outcomeClass), 'outcomeClass required on closest/miss items');
   115	        need(it?.reasonLockedBeforeReveal === true, 'reason must be locked before the label is revealed');
   116	      }
   117	    }
   118	  }
   119	  if (e.eventType === 'reversal') {
   120	    need(/^[a-f0-9]{24}$/.test(String(e.reversalOf ?? '')), 'reversalOf must be the 24-hex eventId being undone');
   121	  }
   122	  return { ok: errors.length === 0, errors };
   123	}
   124	
   125	/** Events minus those a later `reversal` undid — the compiler and the never-show-twice set read only these. */
   126	export function activeEvents(events) {
   127	  const reversed = new Set(events.filter((e) => e.eventType === 'reversal' && e.reversalOf).map((e) => e.reversalOf));
   128	  return events.filter((e) => e.eventType !== 'reversal' && !reversed.has(e.eventId));
   129	}
   130	
   131	/** Idempotent id: same session, same candidates, same presentation → same id. */
   132	export function eventIdFor(e) {
   133	  const ids = (e.candidates || []).map((c) => c.id).sort().join(',');
   134	  return createHash('sha256').update(`${e.sessionId}|${e.eventType}|${ids}|${e.presentedAt}`).digest('hex').slice(0, 24);
   135	}
   136	
   137	export function readEvents(dir = EVENTS_DIR) {
   138	  if (!fs.existsSync(dir)) return [];
   139	  const out = [];
   140	  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.jsonl')).sort()) {
   141	    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
   142	      if (!line.trim()) continue;
   143	      try { out.push(JSON.parse(line)); } catch { out.push({ _corrupt: true, file: f }); }
   144	    }
   145	  }
   146	  return out;
   147	}
   148	
   149	/** Where a namespace keeps its events. Sean's default memory stays exactly where it always was. */
   150	export function eventsDirFor(profile = DEFAULT_PROFILE, project = DEFAULT_PROJECT) {
   151	  if (profile === DEFAULT_PROFILE && project === DEFAULT_PROJECT) return EVENTS_DIR;
   152	  if (!PROFILES.includes(profile) || !isProjectId(project)) throw new Error(`invalid namespace ${profile}/${project}`);
   153	  return path.join(VAULT, 'taste', 'profiles', profile, project, 'events');
   154	}
   155	export const readEventsFor = (profile, project) => readEvents(eventsDirFor(profile, project));
   156	
   157	/** Every picture a namespace has already judged — one memory never sees the same picture twice. An undone grid frees its pictures. */
   158	export function judgedIds(events) {
   159	  const ids = new Set();
   160	  for (const e of activeEvents(events)) for (const c of e.candidates || []) if (c?.id) ids.add(c.id);
   161	  return [...ids];
   162	}
   163	
   164	/**
   165	 * Validate, stamp, dedupe, append. Returns { ok, eventId, duplicate } or { ok:false, errors }.
   166	 * One file per session so parallel sessions never share a file. The directory is derived from the
   167	 * event's own namespace (profileId/projectId) — a caller cannot aim an event at another memory.
   168	 */
   169	export function appendEvent(e, dir) {
   170	  const v = validateEvent(e);
   171	  if (!v.ok) return { ok: false, errors: v.errors };
   172	  dir = dir ?? eventsDirFor(profileOf(e), projectOf(e));
   173	  const eventId = eventIdFor(e);
   174	  fs.mkdirSync(dir, { recursive: true });
   175	  const file = path.join(dir, `${e.sessionId}.jsonl`);
   176	  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(`"eventId":"${eventId}"`)) {
   177	    return { ok: true, eventId, duplicate: true };
   178	  }
   179	  // The never-show-twice law lives at the WRITER, not only at presentation (panel 2026-08-25): a grid
   180	  // whose pictures this memory already judged — from the page, a bundle planned before those grids, or
   181	  // a replay with a fresh timestamp — is refused, never counted twice. Undo the earlier grid first.
   182	  const existing = readEvents(dir);
   183	  if (e.eventType === 'grid-selection' || e.eventType === 'pair') {   // every judgement kind, not only grids (panel round 2)
   184	    const seen = new Set(judgedIds(existing));
   185	    const again = (e.candidates || []).filter((c) => seen.has(c.id)).length;
   186	    if (again) return { ok: false, errors: [`refused: ${again} of these pictures were already judged in this memory (never-show-twice) — undo that judgement first`] };
   187	  }
   188	  if (e.eventType === 'reversal') {
   189	    if (!existing.some((x) => x.eventId === e.reversalOf && x.eventType !== 'reversal')) return { ok: false, errors: ['reversalOf does not name a judgement in this memory'] };
   190	    if (existing.some((x) => x.eventType === 'reversal' && x.reversalOf === e.reversalOf)) return { ok: true, eventId, duplicate: true, note: 'already undone' };
   191	  }
   192	  const line = JSON.stringify({ ...e, eventId, recordedAt: new Date().toISOString() });
   193	  fs.appendFileSync(file, line + '\n', 'utf8');
   194	  return { ok: true, eventId, duplicate: false };
   195	}
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
    79	      // The sample prompt is the PICTURE HE CHOSE, not the article's first example of that code.
    80	      bump(t.srefs, c.sref || rec.sref, it.verdict, e.eventId, rec.prompt ? `${subjectOfPrompt(rec.prompt)} --sref ${c.sref || rec.sref} --ar 16:9` : null);
    81	      bump(t.provenance, c.provenance || rec.provenance, it.verdict, e.eventId);
    82	      bump(t.collections, doc.split('/')[0], it.verdict, e.eventId);
    83	    }
    84	  }
    85	  return t;
    86	}
    87	
    88	/** Prompt for a code: the picture he chose if we have it, else the corpus's first example. */
    89	const promptFor = (row, images) => {
    90	  if (row.samples?.length) return row.samples[0];
    91	  const rec = images.find((r) => r.sref === row.key && r.prompt);
    92	  return rec ? `${subjectOfPrompt(rec.prompt)} --sref ${row.key} --ar 16:9` : null;
    93	};
    94	const strip = (k) => k.replace(/^(photo|webb|ml):/, '');
    95	
    96	/** Pure: tallies → exactly three directions, evidence-tier first, prior-tier fills. */
    97	export function directions(t, images, themesMd = '', themeWords = []) {
    98	  const out = [];
    99	  const reasons = rank(t.reasons);
   100	  const srefs = rank(t.srefs);
   101	  const subjects = rank(t.subjects);
   102	  const because = reasons.slice(0, 3).map((r) => r.key);
   103	  const evidenceOf = (rows) => [...new Set(rows.flatMap((r) => r.events))];
   104	
   105	  const topSrefs = srefs.filter((s) => s.margin > 0).slice(0, 3);
   106	  if (topSrefs.reduce((n, s) => n + s.closest, 0) >= EVIDENCE_MIN) {
   107	    out.push({ id: 'dir:midjourney-srefs', tier: 'evidence', title: 'Style codes you keep choosing',
   108	      because, srefs: topSrefs.map((s) => s.key), prompts: topSrefs.map((s) => promptFor(s, images)).filter(Boolean),
   109	      evidenceEventIds: evidenceOf(topSrefs) });
   110	  }
   111	  const photoSubjects = subjects.filter((s) => s.margin > 0 && s.key.startsWith('photo:')).slice(0, 4);
   112	  if (photoSubjects.reduce((n, s) => n + s.closest, 0) >= EVIDENCE_MIN) {
   113	    out.push({ id: 'dir:photographic-subjects', tier: 'evidence', title: 'Photographic subjects that read as yours',
   114	      because, themeWords: photoSubjects.map((s) => strip(s.key)), evidenceEventIds: evidenceOf(photoSubjects) });
   115	  }
   116	  const webbRows = subjects.filter((s) => s.margin > 0 && s.key.startsWith('webb:'));
   117	  if (webbRows.reduce((n, s) => n + s.closest, 0) >= EVIDENCE_MIN) {
   118	    out.push({ id: 'dir:cosmic-scale', tier: 'evidence', title: 'Cosmic scale (Webb)', because,
   119	      themeWords: webbRows.map((s) => strip(s.key)), evidenceEventIds: evidenceOf(webbRows) });
   120	  }
   121	  // Prior-tier fill from themes.md "Core visual identity" bullets — labelled so nobody mistakes it.
   122	  const priors = [...themesMd.matchAll(/^- \*\*([^*]+)\*\*/gm)].map((m) => m[1].replace(/\.$/, '').trim());
   123	  for (const p of priors) {
   124	    if (out.length >= 3) break;
   125	    out.push({ id: `dir:prior:${p.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, tier: 'prior', title: p,
   126	      because: [], note: 'from themes.md — not yet backed by your picks', evidenceEventIds: [] });
   127	  }
   128	  // A fresh project has no themes.md: its own theme words stand in as labelled priors until picks arrive.
   129	  for (const w of themeWords) {
   130	    if (out.length >= 3) break;
   131	    out.push({ id: `dir:prior:word:${w.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, tier: 'prior', title: w,
   132	      because: [], note: "from this project's own theme words — not yet backed by picks", evidenceEventIds: [] });
   133	  }
   134	  return out.slice(0, 3);
   135	}
   136	
   137	/**
   138	 * Read one namespace's events, compile, optionally write its taste-profile.json (machine-owned).
   139	 * sean/default reads taste/events + themes.md exactly as before. Any other namespace reads only
   140	 * its own events, counts only its own witness, and takes its priors from its own theme words —
   141	 * Sean's themes.md never leaks into the partner's or a client's directions.
   142	 */
   143	export function compileProfile({ profile = DEFAULT_PROFILE, project = DEFAULT_PROJECT, write = true } = {}) {
   144	  const images = loadImages();
   145	  const isDefault = isDefaultNamespace(profile, project);
   146	  const pj = readProject(profile, project);
   147	  if (!pj) return { error: 'unknown project', profileId: profile, projectId: project, directions: [] };
   148	  const events = readEventsFor(profile, project);
   149	  const themesPath = path.join(VAULT, 'taste/themes.md');
   150	  const themesMd = isDefault && fs.existsSync(themesPath) ? fs.readFileSync(themesPath, 'utf8') : '';
   151	  const t = tally(events, images, profile);
   152	  // Defence in depth for the licence law: anyone but Sean only ever gets shareable pictures back, even
   153	  // if a project file were hand-edited — /brief prints these, and a printed brief leaves the machine.
   154	  if (profile !== DEFAULT_PROFILE) t.picks = t.picks.filter((p) => SHAREABLE_PROVENANCE.has(p.provenance) || p.generated);   // her own renders are hers
   155	  const floor = doneFloorFor(profile);
   156	  const out = {
   157	    generatedAt: new Date().toISOString(), generator: 'prompter/lib/profile.mjs (tally, not a model)',
   158	    profileId: profile, projectId: project, witness: profile, title: pj.title, themeWords: pj.themeWords || [], pool: poolFor(profile, project, []).pool,
   159	    grids: t.grids, judgements: t.counted, ignoredExecution: t.ignoredExecution, brandLaw: t.brandLaw, reversals: t.reversals, renders: t.renders,
   160	    progress: { grids: t.grids, judgements: t.counted, gridsTarget: floor.grids, judgementsTarget: floor.judgements, done: t.grids >= floor.grids && t.counted >= floor.judgements },
   161	    reasons: rank(t.reasons, 0), srefs: rank(t.srefs, 0), subjects: rank(t.subjects, 0), provenance: rank(t.provenance, 0), collections: rank(t.collections, 0),
   162	    picks: t.picks,
   163	    proposedAvoids: rank(t.srefs, 0).filter((s) => s.closest === 0 && s.miss >= 1).map((s) => s.key),
   164	    directions: directions(t, images, themesMd, pj.themeWords || []),
   165	  };
   166	  if (write) fs.writeFileSync(isDefault ? PROFILE_PATH : path.join(projectDir(profile, project), 'taste-profile.json'), JSON.stringify(out, null, 1));
   167	  return out;
   168	}
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
     8	 *   · partner/client → no markdown and (on the shareable pool) no style codes at all, so the taste is
     9	 *     the project's theme words, the words of the pictures actually chosen, the subjects it refused,
    10	 *     and the project's own kept prompts. Style codes then come from the generator's explore path,
    11	 *     matched to those words — labelled `words-only` until real evidence exists.
    12	 *
    13	 * Honesty rules: `tasteSource` says what the taste is made of; `confidence` is computed from counts,
    14	 * never asserted. Proposed avoids become generation vetoes ONLY for non-default memories (they have
    15	 * no rejected.md); Sean's stay proposals he copies himself. The only write here is keepFor(): the
    16	 * human's own kept prompt appended to the project's kept.md — the channel Sean's kept.md already is.
    17	 */
    18	import fs from 'node:fs';
    19	import path from 'node:path';
    20	import { loadTaste, parseKept } from './taste.mjs';
    21	import { compileProfile } from './profile.mjs';
    22	import { readProject, projectDir, isDefaultNamespace } from './projects.mjs';
    23	
    24	const STOP = new Set(['the', 'and', 'with', 'from', 'that', 'this', 'into', 'over', 'under', 'near', 'onto', 'their', 'there',
    25	  'have', 'been', 'some', 'very', 'more', 'than', 'also', 'just', 'like', 'photo', 'image', 'picture', 'view', 'shot']);
    26	// Hyphens split: a keyword is a whole word, never a `--parameter` (panel 2026-08-25).
    27	const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w));
    28	
    29	export function confidenceOf({ positiveCount = 0, kept = 0, keywords = 0 }) {
    30	  return positiveCount >= 15 ? 'strong' : positiveCount >= 5 ? 'partial' : positiveCount > 0 || kept > 0 ? 'weak' : keywords > 0 ? 'words-only' : 'empty';
    31	}
    32	
    33	/**
    34	 * Evidence-tier style codes → generator endorsements. TWO floors exist and they are not the same thing
    35	 * (panel round 2 asked for one; measured against Sean's real 18 judgements, a per-code floor of 2 leaves
    36	 * ZERO endorsements and silently regresses his tie-in to words-only):
    37	 *   · the compiler's DIRECTION floor — ≥2 closest summed over the top codes — decides whether a
    38	 *     direction is evidence-tier;
    39	 *   · a CODE is endorsed by one closest pick with a positive margin, weighted like a 4-star rating
    40	 *     (weight 4); two or more closest read as 5 (weight 9). Explore/exploit keeps surfacing the rest.
    41	 */
    42	export const EVIDENCE_LOVED_MIN = 1;
    43	export function evidenceLoved(profile, corpus) {
    44	  const byCode = new Map((corpus?.sref || []).map((c) => [String(c.code), c]));
    45	  return (profile.srefs || []).filter((r) => r.closest >= EVIDENCE_LOVED_MIN && r.margin > 0).map((r) => ({
    46	    code: String(r.key), style_name: byCode.get(String(r.key))?.style_name || null,
    47	    rating: r.closest >= 2 ? 5 : 4, note: `evidence: ${r.closest} closest, ${r.miss} miss`,
    48	  }));
    49	}
    50	
    51	/** What a taste is made of — one vocabulary for the table, the code and the page (panel round 2). */
    52	export function sourceLabel({ markdown = false, evidence = 0, kept = 0, keywords = 0 }) {
    53	  if (markdown) return evidence ? 'markdown+evidence' : 'markdown';
    54	  if (evidence) return 'evidence';
    55	  if (kept) return 'words+kept';
    56	  return keywords ? 'words' : 'empty';
    57	}
    58	
    59	/** Words the memory has actually chosen: its theme words + the descriptions of picked pictures. */
    60	export function keywordsFrom(themeWords = [], picks = []) {
    61	  const out = new Set();
    62	  for (const w of themeWords) for (const t of words(w)) out.add(t);
    63	  for (const p of picks) for (const t of words(p.title)) out.add(t);
    64	  return [...out];
    65	}
    66	
    67	/** Subjects the memory refused (misses with no closest) → veto words, never overriding a chosen word. */
    68	export function avoidWordsFrom(profile, keywords) {
    69	  const out = new Set();
    70	  for (const r of profile.subjects || []) {
    71	    if (r.closest !== 0 || r.miss < 1) continue;
    72	    for (const t of words(r.key.replace(/^(photo|webb|ml):/, ''))) if (!keywords.includes(t)) out.add(t);
    73	  }
    74	  return [...out];
    75	}
    76	
    77	/**
    78	 * Short scaffolds for turning a memory's own THEME WORDS into something you can actually film or render.
    79	 * A bare "ocean" is a search word, not a subject. These are the only phrasing the brain adds, and they are
    80	 * curated data — the same discipline as the motion table in video.mjs. Nothing here comes from the corpus.
    81	 */
    82	const WORD_SCAFFOLD = [
    83	  (a) => `${a} at first light`, (a) => `${a} under a low sun`, (a) => `${a} seen from directly above`,
    84	  (a) => `the edge of the ${a}`, (a) => `${a} after rain`, (a, b) => `${a} meeting ${b}`,
    85	  (a, b) => `${a} with ${b} behind it`, (a) => `${a} in deep shadow`,
    86	];
    87	
    88	/**
    89	 * The subjects a NON-SEAN memory may build prompts from — its OWN material only, in order of authority:
    90	 *   1. prompts it kept (its strongest signal), 2. the titles of pictures it CHOSE, 3. its theme words,
    91	 *      phrased by the scaffold above.
    92	 *
    93	 * WHY THIS EXISTS (found 2026-08-25 while building the video slice): without it, `candidatePool` fell
    94	 * through to the Midlibrary prompt corpus, so a partner or client memory was handed subjects like
    95	 * "cyberpunk character lit by northern lights" — text from Sean's licensed personal archive, shown to
    96	 * someone the licence says may never see that corpus, and nothing to do with what she asked for.
    97	 */
    98	export function ownSubjects(profile, project, compiled, pj) {
    99	  const out = [];
   100	  const seen = new Set();
   101	  const add = (subject, source_doc, score, isKept = false) => {
   102	    const s = String(subject || '').replace(/\s+/g, ' ').trim();
   103	    const key = s.toLowerCase();
   104	    if (s.split(' ').filter(Boolean).length < 3 || seen.has(key)) return;
   105	    // "forest light at first light" — a scaffold that repeats a word the theme word already carries reads
   106	    // as a stutter, not a subject. Drop it rather than ship it.
   107	    const words = key.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3);
   108	    if (!isKept && new Set(words).size !== words.length) return;
   109	    seen.add(key);
   110	    out.push({ subject: s, prompt: s, source_doc, source_url: null, score, isKept });
   111	  };
   112	  for (const k of readKept(profile, project)) add(subjectOfPrompt(k), 'kept', 1000, true);
   113	  for (const p of compiled?.picks || []) if (!p.generated) add(p.title, 'pictures you chose', 6);
   114	  const words = (pj?.themeWords || []).filter(Boolean);
   115	  words.forEach((w, i) => {
   116	    for (const make of WORD_SCAFFOLD) {
   117	      const other = words[(i + 1) % words.length];
   118	      add(make(w, other && other !== w ? other : 'open water'), 'your words', 2);
   119	    }
   120	  });
   121	  return out;
   122	}
   123	const subjectOfPrompt = (p) => String(p || '').split(/\s--/)[0].trim();
   124	
   125	const keptPath = (profile, project) => path.join(projectDir(profile, project), 'kept.md');
   126	
   127	/** READ a memory's kept prompts. (Renamed from keptFor: keepFor/keptFor was a trap a reviewer fell into.) */
   128	export function readKept(profile, project) {
   129	  const p = keptPath(profile, project);
   130	  return fs.existsSync(p) ? parseKept(fs.readFileSync(p, 'utf8')) : [];
   131	}
   132	
   133	/**
   134	 * Remove a kept prompt from a non-default memory. Keeping is a judgement, and a judgement a human can make
   135	 * is one they must be able to unmake — the same law the `reversal` event encodes for grids. Sean's own
   136	 * kept.md is markdown he edits himself, so it is refused here.
   137	 */
   138	export function unkeepFor(profile, project, prompt) {
   139	  if (isDefaultNamespace(profile, project)) return { ok: false, error: "Sean's kept list is edited in taste/kept.md" };
   140	  if (!readProject(profile, project)) return { ok: false, error: 'unknown project' };
   141	  const p = keptPath(profile, project);
   142	  if (!fs.existsSync(p)) return { ok: false, error: 'nothing kept yet' };
   143	  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
   144	  const md = fs.readFileSync(p, 'utf8');
   145	  if (!parseKept(md).includes(text)) return { ok: false, error: 'that prompt is not in this memory\'s kept list' };
   146	  const out = md.split(/\r?\n/).filter((l) => l.replace(/^\s*[-*]\s+/, '').replace(/^`|`$/g, '').trim() !== text).join('\n');
   147	  fs.writeFileSync(p, out, 'utf8');
   148	  return { ok: true, kept: parseKept(out).length };
   149	}
   150	
   151	/** Append a kept prompt to a non-default memory's kept.md — the compounding channel, on the human's click. */
   152	export function keepFor(profile, project, prompt) {
   153	  if (isDefaultNamespace(profile, project)) return { ok: false, error: 'sean/default keeps through the CLI (taste/kept.md)' };
   154	  if (!readProject(profile, project)) return { ok: false, error: 'unknown project' };
   155	  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
   156	  if (text.split(' ').length < 3) return { ok: false, error: 'prompt must be at least 3 words' };
   157	  if (text.length > 2000) return { ok: false, error: 'prompt must be ≤ 2000 chars' };   // same discipline as validateEvent's MAX_STR (panel round 2)
   158	  const p = keptPath(profile, project);
   159	  let md = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : `# Kept prompts — ${profile}/${project}\n\n## Kept\n`;
   160	  if (parseKept(md).includes(text)) return { ok: true, duplicate: true, kept: parseKept(md).length };   // line-exact, not substring
   161	  if (!/^## Kept/m.test(md)) md += '\n## Kept\n';
   162	  md = md.replace(/(## Kept\n)/, `$1- ${text}\n`);
   163	  fs.writeFileSync(p, md, 'utf8');
   164	  return { ok: true, duplicate: false, kept: parseKept(md).length };
   165	}
   166	
   167	/** The taste object generate() consumes, for one memory. Null when the project does not exist. */
   168	export function tasteFor({ profile, project, corpus }) {
   169	  const compiled = compileProfile({ profile, project, write: false });
   170	  if (compiled.error) return null;
   171	  const loved = evidenceLoved(compiled, corpus);
   172	  if (isDefaultNamespace(profile, project)) {
   173	    const base = loadTaste();
   174	    const known = new Set(base.loved.map((l) => l.code));
   175	    const rejected = new Set(base.rejectedSrefs);
   176	    // A stale rejection beats fresh evidence — by law (rejection is the more decisive act) — but never silently.
   177	    const warnings = [...base.warnings, ...loved.filter((l) => rejected.has(l.code)).map((l) => `code ${l.code} is evidence-tier from your grids but rejected in rejected.md — rejection wins; remove it there if your eye has changed`)];
   178	    const merged = [...base.loved, ...loved.filter((l) => !known.has(l.code) && !rejected.has(l.code))];
   179	    const positiveCount = merged.filter((l) => l.rating >= 3 && !rejected.has(l.code)).length;
   180	    return { ...base, warnings, loved: merged, ratedCount: merged.length, positiveCount, evidenceSrefs: loved.length,
   181	      tasteSource: sourceLabel({ markdown: true, evidence: loved.length }),
   182	      confidence: confidenceOf({ positiveCount, kept: base.kept.length, keywords: base.keywords.length }) };
   183	  }
   184	  const pj = readProject(profile, project);
   185	  const kept = readKept(profile, project);
   186	  // Generated pictures (renders) never feed keywords: the generator's vocabulary must not become the memory's.
   187	  const keywords = keywordsFrom(pj.themeWords, (compiled.picks || []).filter((p) => !p.generated));
   188	  const avoidWords = avoidWordsFrom(compiled, keywords);
   189	  return {
   190	    loved, rejectedSrefs: compiled.proposedAvoids || [], kept, identity: pj.themeWords || [], moodsFit: [], moodsAvoid: [],
   191	    // The pool a non-Sean memory generates from: its own kept prompts, its own picks, its own words —
   192	    // never the Midlibrary corpus (licence + it is simply not what she asked for).
   193	    ownSubjects: ownSubjects(profile, project, compiled, pj),
   194	    keywords, avoidWords, warnings: [], ratedCount: loved.length, positiveCount: loved.length, evidenceSrefs: loved.length,
   195	    tasteSource: sourceLabel({ evidence: loved.length, kept: kept.length, keywords: keywords.length }),
   196	    confidence: confidenceOf({ positiveCount: loved.length, kept: kept.length, keywords: keywords.length }),
   197	  };
   198	}
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
   200	  const sref = chooseSref(corpus, taste, rng, mode);
   201	
   202	  let subject = seedPrompt.subject;
   203	  // Trim a trailing "by <artist>" so we control attribution explicitly per grammar shape.
   204	  const byMatch = /^(.+?)\s+by\s+([A-Z][\w'’.\- ]{2,40})$/.exec(subject);
   205	  const bareSubject = byMatch ? byMatch[1].trim() : subject;
   206	  const seedArtist = byMatch ? byMatch[2].trim() : null;
   207	
   208	  // Some corpus entries are "<Subject> by <Artist>" where the subject alone is too thin to stand
   209	  // as a prompt ("Nick Cave by Nan Goldin" → "Nick Cave"). When dropping attribution would leave
   210	  // a stub, keep the attribution instead of emitting a two-word prompt.
   211	  const subjectTooThin = bareSubject.split(/\s+/).filter(Boolean).length < 3;
   212	  const effGrammar = subjectTooThin && seedArtist ? 'by_artist' : grammar;
   213	
   214	  let text;
   215	  switch (effGrammar) {
   216	    case 'by_artist': {
   217	      const artist = seedArtist || pick(corpus.artists, rng);
   218	      text = `${bareSubject} by ${artist}`;
   219	      break;
   220	    }
   221	    case 'style_of': {
   222	      const artist = seedArtist || pick(corpus.artists, rng);
   223	      text = `${bareSubject} in the style of ${artist}`;
   224	      break;
   225	    }
   226	    case 'fragment': {
   227	      // Cutting at a fixed word count lands mid-phrase and leaves a dangling function word:
   228	      // "glacier calving into black water at" — which reads as a truncation bug to anyone
   229	      // looking at it, and is one to Midjourney too, since the trailing preposition promises
   230	      // an object that never arrives. Trim back to the last word that can end a phrase.
   231	      const DANGLING = /^(a|an|the|of|in|on|at|to|by|for|with|from|into|over|under|and|or|as|its|his|her|their)$/i;
   232	      const words = bareSubject.split(/\s+/).slice(0, 6);
   233	      while (words.length > 3 && DANGLING.test(words[words.length - 1])) words.pop();
   234	      text = words.join(' ');
   235	      break;
   236	    }
   237	    default:
   238	      text = bareSubject;
   239	  }
   240	  if (text.split(/\s+/).filter(Boolean).length < 3) return null;   // reject stubs outright
   241	
   242	  const params = buildParams(rng, mode, sref);
   243	  const full = `${text} --ar ${ar} ${params.join(' ')}`.replace(/\s+/g, ' ').trim();
   244	
   245	  return {
   246	    prompt: full,
   247	    subject: text,
   248	    /** Dedup key: the subject WITHOUT attribution, so "X" and "X by Someone" count as one idea.
   249	     *  Keying on the finished text let the same seed subject appear twice in a batch. */
   250	    dedupKey: bareSubject.toLowerCase(),
   251	    grammar,
   252	    sref,
   253	    mode,
   254	    lineage: { source_doc: seedPrompt.source_doc, source_url: seedPrompt.source_url, taste_score: seedPrompt.score },
   255	  };
   256	}
   257	
   258	export function generate(corpus, taste, opts) {
   259	  const seed = opts.seed ?? (Date.now() & 0xffffffff);
   260	  const rng = rngFrom(seed);
   261	  const pool = candidatePool(corpus, taste, opts.mode || 'taste');
   262	  if (!pool.length) {
   263	    throw new Error(
   264	      'No prompts in the archive match your themes.\n' +
   265	      'Widen taste/themes.md, or relax taste/rejected.md — the negative list may be over-broad.'
   266	    );
   267	  }
   268	
   269	  const out = [];
   270	  const seen = new Set();
   271	  let guard = 0;
   272	  // Ideas are capped by distinct on-taste subjects, so asking for more than exist must terminate
   273	  // rather than spin. The guard scales with the pool, and we stop early once it is exhausted.
   274	  const maxTries = Math.min(opts.count * 40, pool.length * 12 + 200);
   275	  while (out.length < opts.count && guard++ < maxTries) {
   276	    const g = generateOne(corpus, taste, opts, rng, pool);
   277	    if (!g) continue;                     // stub rejected inside generateOne
   278	    if (seen.has(g.dedupKey)) continue;   // one idea per batch, regardless of attribution
   279	    seen.add(g.dedupKey);
   280	    out.push({ ...g, seed });
   281	  }
   282	  return {
   283	    seed,
   284	    prompts: out,
   285	    poolSize: pool.length,
   286	    keptInPool: pool.keptCount || 0,
   287	    drops: pool.drops,          // why candidates were discarded — the veto list ran blind before
   288	    exhausted: out.length < opts.count,
   289	  };
   290	}
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
    23	  });
    24	  const body = await r.json().catch(() => ({}));
    25	  if (!r.ok) return { ok: false, error: body?.error?.message || `ComfyUI HTTP ${r.status}`, nodeErrors: body?.node_errors ?? null };
    26	  return { ok: true, promptId: body.prompt_id ?? null, number: body.number ?? null };
    27	}
    28	
    29	/** Everything the page needs to decide what to show, in one read. */
    30	export async function makeStatus({ profile, project }) {
    31	  const api = comfyApi();
    32	  const t = readTemplate();
    33	  const d = describe(t);
    34	  const out = {
    35	    profileId: profile, projectId: project, api,
    36	    workflow: t ? { captured: true, ready: d.ok, capturedAt: d.capturedAt, nodes: d.nodes, classes: d.classes, steers: d.steers, reason: d.reason }
    37	      : { captured: false, ready: false, reason: 'no workflow captured yet — run your workflow once in ComfyUI, then: node prompter/capture-workflow.mjs' },
    38	    comfy: { reachable: false, queue: null, reason: api ? null : 'ComfyUI endpoint must be loopback' },
    39	  };
    40	  if (api) {
    41	    try {
    42	      const r = await fetch(`${api}/prompt`, { signal: AbortSignal.timeout(4000) });   // GET /prompt = queue info
    43	      if (r.ok) { const q = await r.json(); out.comfy = { reachable: true, queue: q.exec_info?.queue_remaining ?? null, reason: null }; }
    44	      else out.comfy.reason = `ComfyUI HTTP ${r.status}`;
    45	    } catch (err) { out.comfy.reason = `ComfyUI not reachable at ${api} — start it (Swan Local Video 5090.cmd)`; }
    46	  }
    47	  const lr = listRenders(profile, project);
    48	  const intents = readIntents(profile, project);
    49	  const have = new Set(lr.renders.map((r) => r.token));
    50	  out.renders = { files: lr.renders.length, intents: intents.length, waiting: intents.filter((i) => !have.has(i.token)).length, available: lr.available !== false, reason: lr.reason ?? null };
    51	  return out;
    52	}
    53	
    54	export async function handleMakeRoutes({ url, req, res, json, readBody }) {
    55	  const p = url.pathname;
    56	  if (p === '/api/make/status' && req.method === 'GET') {
    57	    const ns = namespaceFrom(url);
    58	    if (ns.error) { json(res, 400, { error: ns.error }); return true; }
    59	    json(res, 200, await makeStatus(ns));
    60	    return true;
    61	  }
    62	  if (p === '/api/make' && req.method === 'POST') {
    63	    const body = await readBody(req);
    64	    const api = comfyApi();
    65	    const template = readTemplate();
    66	    const d = describe(template);
    67	    if (!api) { json(res, 400, { error: 'ComfyUI endpoint must be loopback' }); return true; }
    68	    if (!d.ok) { json(res, 409, { error: d.reason || 'no workflow captured yet', hint: 'run your workflow once in ComfyUI, then: node prompter/capture-workflow.mjs' }); return true; }
    69	    // "Make 4" = one prompt, `count` seeds. Expanding here (not in the page) keeps one batch law in one place:
    70	    // every variation is its own intent, its own token, its own file — so each can be judged and undone alone.
    71	    let list = Array.isArray(body?.prompts) ? body.prompts : [];
    72	    const count = Number.isInteger(body?.count) ? Math.min(Math.max(body.count, 1), MAX_BATCH) : 1;
    73	    if (list.length === 1 && count > 1) {
    74	      const base = list[0];
    75	      // Seeds are derived from the caller's seed when given (reproducible: seed, seed+1, …), random otherwise.
    76	      list = Array.from({ length: count }, (_, i) => ({ ...base, seed: Number.isInteger(base?.seed) ? (base.seed + i) >>> 0 : undefined }));
    77	    }
    78	    list = list.slice(0, MAX_BATCH);
    79	    if (!list.length) { json(res, 400, { error: `prompts must be a non-empty array (max ${MAX_BATCH})` }); return true; }
    80	    const results = [];
    81	    for (const item of list) {
    82	      const seed = Number.isInteger(item?.seed) ? item.seed : Math.floor(Math.random() * 2 ** 31);
    83	      const mint = mintIntent({ profileId: body.profileId, projectId: body.projectId, prompt: item?.prompt, seed, sref: item?.sref });
    84	      if (!mint.ok) { results.push({ ok: false, prompt: String(item?.prompt ?? '').slice(0, 80), errors: mint.errors }); continue; }
    85	      const built = applyTo(template, { prompt: mint.intent.prompt, seed, prefix: mint.prefix });
    86	      if (!built.ok) { results.push({ ok: false, token: mint.token, errors: built.errors }); continue; }
    87	      const posted = await comfyPost(api, built.graph, `swan-${mint.token}`).catch((err) => ({ ok: false, error: String(err.message) }));
    88	      results.push(posted.ok
    89	        ? { ok: true, token: mint.token, prefix: mint.prefix, seed, promptId: posted.promptId, duplicate: mint.duplicate, changed: built.changed }
    90	        : { ok: false, token: mint.token, errors: [posted.error], nodeErrors: posted.nodeErrors ?? null });
    91	    }
    92	    const queued = results.filter((r) => r.ok).length;
    93	    json(res, queued ? 200 : 502, { ok: queued > 0, queued, failed: results.length - queued, results });
    94	    return true;
    95	  }
    96	  return false;
    97	}
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
    51	    if (r.kind === 'range') {
    52	      res.writeHead(206, partialHeaders(r, f.sizeBytes, mime));
    53	      if (req.method === 'HEAD') return res.end(), true;
    54	      fs.createReadStream(f.path, { start: r.start, end: r.end }).pipe(res);
    55	      return true;
    56	    }
    57	    res.writeHead(200, wholeHeaders(f.sizeBytes, mime));   // `accept-ranges` advertised even on a whole body
    58	    if (req.method === 'HEAD') return res.end(), true;
    59	    fs.createReadStream(f.path).pipe(res);
    60	    return true;
    61	  }
    62	  return false;
    63	}
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
    70	  if (seed !== undefined && seed !== null && !(Number.isInteger(seed) && seed >= 0)) errors.push('seed must be a non-negative integer');
    71	  if (sref !== undefined && sref !== null && !/^\d{5,12}$/.test(String(sref))) errors.push('sref must be 5-12 digits');
    72	  if (errors.length) return { ok: false, errors };
    73	  const token = tokenFor(profileId, projectId, text, seed, sref);
    74	  const existing = readIntents(profileId, projectId);
    75	  const dup = existing.find((i) => i.token === token);
    76	  if (dup) return { ok: true, duplicate: true, token, prefix: `${RENDER_SUBDIR}/${token}`, intent: dup };
    77	  if (existing.length >= MAX_INTENTS) return { ok: false, errors: [`this memory holds ${MAX_INTENTS} render intents — prune: node prompter/fetch-renders.mjs --profile ${profileId} --project ${projectId} --prune`] };
    78	  const intent = { token, prompt: text, seed: seed ?? null, sref: sref ? String(sref) : null, createdAt: new Date().toISOString() };
    79	  const p = intentsPath(profileId, projectId);
    80	  fs.mkdirSync(path.dirname(p), { recursive: true });
    81	  fs.appendFileSync(p, JSON.stringify(intent) + '\n', 'utf8');
    82	  return { ok: true, duplicate: false, token, prefix: `${RENDER_SUBDIR}/${token}`, intent };
    83	}
    84	
    85	/** Scan the render dir and join to THIS memory's intents. Unknown tokens — other memories, stray files — are ignored. */
    86	export function listRenders(profile, project, { base = 'http://127.0.0.1:7331' } = {}) {
    87	  if (!nsOk(profile, project)) return { ok: false, error: 'unknown memory', renders: [] };
    88	  const av = available();
    89	  const dir = renderDir();
    90	  if (!av.ok || !fs.existsSync(dir)) return { ok: true, available: false, reason: av.ok ? `no renders yet — ComfyUI has not written to ${dir}` : av.reason, renders: [] };
    91	  const intents = new Map(readIntents(profile, project).map((i) => [i.token, i]));
    92	  const renders = [];
    93	  for (const name of fs.readdirSync(dir)) {
    94	    const m = FILE.exec(name);
    95	    if (!m) continue;
    96	    const intent = intents.get(m[1]);
    97	    if (!intent) continue;
    98	    let st;
    99	    try { st = fs.lstatSync(path.join(dir, name)); } catch { continue; }
   100	    if (!st.isFile()) continue;   // lstat: a symlink is not a file — nothing outside the render dir is ever listed or served
   101	    const ext = m[3].toLowerCase(), n = Number(m[2]);
   102	    renders.push({
   103	      id: `render:${m[1]}:${n}`, token: m[1], n, kind: KIND[ext], mime: MIME[ext],
   104	      url: `${base}/renders/${profile}/${project}/${m[1]}/${n}`,
   105	      prompt: intent.prompt, seed: intent.seed, sref: intent.sref, createdAt: intent.createdAt, sizeBytes: st.size,
   106	      provenance: 'local-comfy', collection: 'render', generated: true, doc: `render/${m[1]}`,
   107	      title: intent.prompt.split(/\s--/)[0].slice(0, 140), credit: null, pageUrl: null,
   108	    });
   109	  }
   110	  renders.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.n - b.n);
   111	  return { ok: true, available: true, renders, dir };
   112	}
   113	
   114	/** Resolve one render to a file, safely: every segment validated, the path composed here, prefix-checked. */
   115	export function renderFile(profile, project, token, n) {
   116	  if (!nsOk(profile, project) || !TOKEN.test(String(token)) || !/^\d{1,5}$/.test(String(n))) return null;
   117	  if (!readIntents(profile, project).some((i) => i.token === token)) return null;
   118	  const dir = path.resolve(renderDir());
   119	  if (!fs.existsSync(dir)) return null;
   120	  const want = `${token}_${String(Number(n)).padStart(5, '0')}_.`;   // ComfyUI zero-pads its counter to 5
   121	  const name = fs.readdirSync(dir).find((f) => f.toLowerCase().startsWith(want) && FILE.test(f));
   122	  if (!name) return null;
   123	  const full = path.resolve(dir, name);
   124	  if (!full.startsWith(dir + path.sep)) return null;
   125	  const ext = name.split('.').pop().toLowerCase();
   126	  let st;
   127	  try { st = fs.lstatSync(full); } catch { return null; }
   128	  if (!st.isFile()) return null;   // symlinks refused (lstat), same as the listing
   129	  return { path: full, kind: KIND[ext], mime: MIME[ext], sizeBytes: st.size };
   130	}
   131	
   132	/** Magic bytes → mime, or null. The serve route refuses a file that does not sniff as what its name says. */
   133	export function sniff(buf) {
   134	  if (buf.length >= 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return 'image/png';
   135	  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
   136	  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
   137	  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') return 'video/mp4';
   138	  if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';
   139	  return null;
   140	}
   141	
   142	/** Drop intents older than `days` that never produced a file. Rewrites the file; returns counts. */
   143	export function pruneIntents(profile, project, { days = 30 } = {}) {
   144	  if (!nsOk(profile, project)) return { ok: false, error: 'unknown memory' };
   145	  const intents = readIntents(profile, project);
   146	  const have = new Set(listRenders(profile, project).renders.map((r) => r.token));
   147	  const cutoff = Date.now() - days * 86400_000;
   148	  const keep = intents.filter((i) => have.has(i.token) || Date.parse(i.createdAt) >= cutoff);
   149	  if (keep.length !== intents.length) fs.writeFileSync(intentsPath(profile, project), keep.map((i) => JSON.stringify(i)).join('\n') + (keep.length ? '\n' : ''), 'utf8');
   150	  return { ok: true, before: intents.length, after: keep.length, pruned: intents.length - keep.length };
   151	}
```

## prompter/lib/range.mjs
```javascript
     1	/**
     2	 * range.mjs — HTTP byte ranges, so a clip in the judging well can be scrubbed.
     3	 *
     4	 * WHY (Sean 2026-08-25): ComfyUI on the 5090 renders VIDEO, and a `<video>` element cannot seek in a
     5	 * response that arrives as one whole body — the browser needs `Accept-Ranges` and 206 replies. Without
     6	 * this, judging a clip means watching it from the top, every time.
     7	 *
     8	 * Deliberately the small, safe subset of RFC 9110 §14: a SINGLE `bytes=` range. Multipart ranges are the
     9	 * part of the spec that grows attack surface (boundary generation, N file handles) for no benefit here —
    10	 * no browser asks for them when playing media. Anything else is answered as a normal 200, which is legal.
    11	 *
    12	 * Every branch is total: an unsatisfiable range gets 416 with the real size, a malformed header is
    13	 * ignored rather than guessed at, and `end` is always clamped to the last byte that exists.
    14	 */
    15	
    16	/**
    17	 * @param {string|undefined} header  raw `Range:` value
    18	 * @param {number} size              file size in bytes
    19	 * @returns {{kind:'none'}|{kind:'invalid'}|{kind:'unsatisfiable'}|{kind:'range', start:number, end:number, length:number}}
    20	 */
    21	export function parseRange(header, size) {
    22	  if (header === undefined || header === null || header === '') return { kind: 'none' };
    23	  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim());
    24	  if (!m) return { kind: 'invalid' };                 // multipart, other units, or junk → serve the whole thing
    25	  const [, rawStart, rawEnd] = m;
    26	  if (rawStart === '' && rawEnd === '') return { kind: 'invalid' };
    27	  if (!Number.isFinite(size) || size <= 0) return { kind: 'unsatisfiable' };
    28	  let start, end;
    29	  if (rawStart === '') {
    30	    // `bytes=-N` — the LAST n bytes. N greater than the file means the whole file, per spec.
    31	    const n = Number(rawEnd);
    32	    if (!Number.isSafeInteger(n) || n <= 0) return { kind: 'invalid' };
    33	    start = Math.max(0, size - n);
    34	    end = size - 1;
    35	  } else {
    36	    start = Number(rawStart);
    37	    if (!Number.isSafeInteger(start) || start < 0) return { kind: 'invalid' };
    38	    if (start >= size) return { kind: 'unsatisfiable' };
    39	    end = rawEnd === '' ? size - 1 : Number(rawEnd);
    40	    if (!Number.isSafeInteger(end) || end < start) return { kind: 'invalid' };
    41	    end = Math.min(end, size - 1);                    // clamp: a browser may ask past the end
    42	  }
    43	  return { kind: 'range', start, end, length: end - start + 1 };
    44	}
    45	
    46	/** Response headers for a 206, given a parsed range. */
    47	export const partialHeaders = (r, size, mime) => ({
    48	  'content-type': mime, 'content-length': r.length, 'content-range': `bytes ${r.start}-${r.end}/${size}`,
    49	  'accept-ranges': 'bytes', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
    50	});
    51	
    52	/** Response headers for a whole-body 200 that still advertises range support. */
    53	export const wholeHeaders = (size, mime) => ({
    54	  'content-type': mime, 'content-length': size, 'accept-ranges': 'bytes',
    55	  'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
    56	});
```

## prompter/lib/png.mjs
```javascript
     1	/**
     2	 * png.mjs — a minimal PNG encoder (solid colour, 8-bit RGB) for test fixtures and proofs.
     3	 *
     4	 * The render loop's suites and the headless-browser proof need real image files that ComfyUI would have
     5	 * written, without ComfyUI running. Twenty lines of zlib + CRC beat a binary fixture in the repo.
     6	 */
     7	import zlib from 'node:zlib';
     8	
     9	const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
    10	const crc32 = (buf) => { let crc = 0xffffffff; for (let i = 0; i < buf.length; i++) crc = TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; };
    11	function chunk(type, data) {
    12	  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    13	  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    14	  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    15	  return Buffer.concat([len, td, crc]);
    16	}
    17	
    18	/** @returns {Buffer} a valid PNG of w×h filled with rgb */
    19	export function png(w = 64, h = 40, rgb = [127, 127, 127]) {
    20	  const ihdr = Buffer.alloc(13);
    21	  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
    22	  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;   // 8-bit, RGB, deflate, no filter, no interlace
    23	  const row = w * 3 + 1;
    24	  const raw = Buffer.alloc(row * h);
    25	  for (let y = 0; y < h; y++) { raw[y * row] = 0; for (let x = 0; x < w; x++) { const o = y * row + 1 + x * 3; raw[o] = rgb[0]; raw[o + 1] = rgb[1]; raw[o + 2] = rgb[2]; } }
    26	  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
    27	}
    28	
    29	/** A tiny buffer that sniffs as MP4 (an `ftyp` box) — enough to prove the serve route's type discipline. */
    30	export const fakeMp4 = () => Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom', 'ascii'), Buffer.alloc(16)]);
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
    93	  const picked = [];
    94	  let round = 0;
    95	  while (picked.length < want && round < 4) {
    96	    for (const doc of docs) {
    97	      if (picked.length >= want) break;
    98	      const list = byDoc.get(doc);
    99	      const ordered = [...shuffle(list.filter((r) => r.sref), rng), ...shuffle(list.filter((r) => !r.sref), rng)];
   100	      const pick = ordered[round];
   101	      if (pick) picked.push(pick);
   102	    }
   103	    round++;
   104	  }
   105	  return picked;
   106	}
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

## prompter/lib/images.mjs
```javascript
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

## prompter/capture-workflow.mjs
```javascript
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

---

## How to answer

Return a ranked list. For each finding:

```
### P0 — <one-line claim>
File: prompter/lib/x.mjs   Where: functionName(), lines N-M
Failure: <concrete inputs -> what actually happens>
Why it matters: <the user-visible or licence/security consequence>
Smallest fix: <the minimal change>
```

Then a short section **"What I checked and found sound"** — naming the specific attack you tried and why
it failed. That section is worth as much as the findings: it tells the Final Decider which doors are
already closed and stops the next round re-walking them.

End with an overall verdict: **APPROVE** / **REVISE** / **REJECT**.
