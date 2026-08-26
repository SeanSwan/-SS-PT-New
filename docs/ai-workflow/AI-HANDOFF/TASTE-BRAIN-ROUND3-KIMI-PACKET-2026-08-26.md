---
decision: "Kimi K3's single round-3 review — of the code AFTER four other seats' findings were fixed. Find what the fixes broke, and what all of us still missed."
status: open
board: SWA-186
date: 2026-08-26
privacy: IDs and roles only. The second user is "the partner". No names, no keys, no PII.
---

# Swan Taste Brain — Kimi K3, round 3 (post-fix)

You get **one** call on this workstream, so it is deliberately aimed at the highest-value question.
Four other seats (GLM 5.3, Ox Alpha, HY3, Qwen 3.8) already reviewed this code and their findings are
**already fixed and committed**. You are looking at the result. Your job is the two things they cannot
now do: **audit the fixes themselves**, and **find what all five of us missed.**

Do not re-report the fixed list below — that is spent effort. If you think one of the fixes is *wrong*
or *incomplete*, that IS in scope and is the most valuable thing you can tell me.

## What this is

A local, loopback-only creative tool. It shows the owner ("Sean") real photographs, records which ones
he would ship, compiles that into design "directions", and generates Midjourney/video prompts in his
taste. It now serves a **second user** — his partner — where each design gets a **fresh memory** that
must never mix with his. One memory = `profile × project`, profile ∈ `sean | partner | client`.

The load-bearing constraint: the tool contains a **third-party copyrighted corpus** (Midlibrary, which
Sean subscribes to). It may be used for HIS memory and **must never reach a partner or client memory,
a shared bundle, or a printed brief** — not the images, not the artists, not the style codes, not the
prompt text. Two of the three defects fixed this round were breaches of exactly that.

## What was just fixed (do NOT re-report; DO attack the fix)

| # | Defect | Fix |
|---|---|---|
| 1 | A partner memory generated a Midlibrary `--sref` code on **6 of 6** prompts. `generateOne` gated grammar/subjects on `pool.ownOnly` but called `chooseSref()` unconditionally. | `const sref = pool.ownOnly ? null : chooseSref(...)` in `generate.mjs` |
| 2 | `access-control-allow-origin: '*'` on **every** JSON response made every read endpoint cross-origin readable — any page in the owner's browser could fetch the corpus and the partner's kept prompts in one pageload. Its stated justification ("ComfyUI is another origin") was false: that consumer is Python `urllib`, which ignores CORS. | both ACAO headers deleted from `json()` and the OPTIONS reply in `serve.mjs` |
| 3 | The event writer accepted `provenance: 'midlibrary-reference'` candidates into a **non-Sean** memory. `profile.mjs` filters `t.picks` by shareable provenance but **not** `t.srefs`, so the code still ranked and was promoted into her directions. | refused in `validateEvent` (`events.mjs`) |
| 4 | An unhandled `ReadStream` 'error' killed the whole server mid-session (the render dir is designed for a mapped network drive). | error handler → `res.destroy()` in `routes-renders.mjs` |
| 5 | `$&` in a kept prompt expanded in a replacement STRING and spliced the heading into the bullet. | function replacement in `taste-namespace.mjs` `keepFor` |
| 6 | Sean's `/api/keep` branch had **no length cap** while every project memory enforced 2000 chars. | cap added in `serve.mjs` |
| 7 | The event writer could `mkdir` a namespace the project registry never created — invisible judgements that go live later. | existence check in `appendEvent` |
| 8 | A seed ≥ 2³² was recorded by `mintIntent` then silently truncated by `applyTo`'s `>>> 0`, so the intent described a render nobody made. | ceiling `0..0xFFFFFFFF` in `renders.mjs` |
| 9 | A **thin** pool dealt the same picture twice into one grid (**38 of 60** grids, reproduced) — `ordered` was re-shuffled every round then indexed by `round`. | ordered once per doc + a seen-set in `probe.mjs` |
| 10 | A malformed request target threw outside the try and killed the process. | `new URL` moved inside a guard → 400 |
| 11 | `comfyPost` followed redirects, so a 302 could carry the captured ComfyUI graph off-machine. | `redirect: 'error'` in `routes-make.mjs` |

Also: `/api/make/status` now reports when a graph has several seed or prompt fields, because `applyTo`
sets all of them in lockstep and the drift proof cannot see it (behaviour deliberately unchanged — no
graph is captured on this machine yet, and guessing which seed is "the" seed would silently change
which renders come out).

## Where to aim

1. **Audit fix 1.** `pool.ownOnly ? null : chooseSref(...)`. Is `ownOnly` set on every path that
   should be own-material? Can a partner/client memory ever get a pool where `ownOnly` is falsy — via
   a hand-edited `project.json`, an imported bundle, a judged render, the video path, `mode=surprise`,
   the `cinematic=1` filter, or a memory that has accumulated kept prompts? Trace `candidatePool`.
2. **Audit fix 3.** Is `validateEvent` the only door into a memory's evidence? What about the bundle
   import path, `taste-profile.json` written by the compiler, `intents.jsonl`, or `kept.md` — can
   corpus-derived text or a style code enter a non-Sean memory through any of those instead?
3. **Find the fourth corpus door.** Three have now been found in three different layers (generation,
   the writer, and the read API). Assume there is another. Where?
4. **Did any fix break something?** Fix 3 refuses events that used to be accepted; fix 7 refuses
   writes that used to succeed; fix 2 removed headers something might have depended on; fix 9 changed
   grid composition. What legitimate flow now fails?
5. **The taste maths.** A judged render must count toward **subjects only** and **zero** toward style
   codes. Reversal must fully undo a tally. Two different "floors" exist (`DONE_FLOOR` vs the evidence
   minimum) — do they disagree anywhere that matters?

## Ground truth

- **442 checks across 10 suites, all passing** at the commit under review. Suites resolve fixtures
  relative to the **repo root**.
- `prompter/test-round3.mjs` is the new regression file; **19 of its checks fail against the pre-fix
  code**, which is how each fix above was proven rather than asserted.
- The server binds `127.0.0.1` only and is unauthenticated by design; the repo is local with no remote.

---

# THE SOURCE (post-fix)

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
   164	  const p = keptPath(profile, project);
   165	  let md = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : `# Kept prompts — ${profile}/${project}\n\n## Kept\n`;
   166	  if (parseKept(md).includes(text)) return { ok: true, duplicate: true, kept: parseKept(md).length };   // line-exact, not substring
   167	  if (!/^## Kept/m.test(md)) md += '\n## Kept\n';
   168	  // Function replacement, NOT a string one. `text` is human input and a replacement STRING expands
   169	  // `$&`, `$1`, `` $` `` and `$'` — so keeping the prompt "price $& quality light" spliced the
   170	  // matched heading back into the middle of the bullet and mangled the file for every later read.
   171	  // A function replacement receives the text verbatim. (round-3 panel, GLM 5.3 finding 6)
   172	  md = md.replace(/(## Kept\n)/, (m) => `${m}- ${text}\n`);
   173	  fs.writeFileSync(p, md, 'utf8');
   174	  return { ok: true, duplicate: false, kept: parseKept(md).length };
   175	}
   176	
   177	/** The taste object generate() consumes, for one memory. Null when the project does not exist. */
   178	export function tasteFor({ profile, project, corpus }) {
   179	  const compiled = compileProfile({ profile, project, write: false });
   180	  if (compiled.error) return null;
   181	  const loved = evidenceLoved(compiled, corpus);
   182	  if (isDefaultNamespace(profile, project)) {
   183	    const base = loadTaste();
   184	    const known = new Set(base.loved.map((l) => l.code));
   185	    const rejected = new Set(base.rejectedSrefs);
   186	    // A stale rejection beats fresh evidence — by law (rejection is the more decisive act) — but never silently.
   187	    const warnings = [...base.warnings, ...loved.filter((l) => rejected.has(l.code)).map((l) => `code ${l.code} is evidence-tier from your grids but rejected in rejected.md — rejection wins; remove it there if your eye has changed`)];
   188	    const merged = [...base.loved, ...loved.filter((l) => !known.has(l.code) && !rejected.has(l.code))];
   189	    const positiveCount = merged.filter((l) => l.rating >= 3 && !rejected.has(l.code)).length;
   190	    return { ...base, warnings, loved: merged, ratedCount: merged.length, positiveCount, evidenceSrefs: loved.length,
   191	      tasteSource: sourceLabel({ markdown: true, evidence: loved.length }),
   192	      confidence: confidenceOf({ positiveCount, kept: base.kept.length, keywords: base.keywords.length }) };
   193	  }
   194	  const pj = readProject(profile, project);
   195	  const kept = readKept(profile, project);
   196	  // Generated pictures (renders) never feed keywords: the generator's vocabulary must not become the memory's.
   197	  const keywords = keywordsFrom(pj.themeWords, (compiled.picks || []).filter((p) => !p.generated));
   198	  const avoidWords = avoidWordsFrom(compiled, keywords);
   199	  return {
   200	    loved, rejectedSrefs: compiled.proposedAvoids || [], kept, identity: pj.themeWords || [], moodsFit: [], moodsAvoid: [],
   201	    // The pool a non-Sean memory generates from: its own kept prompts, its own picks, its own words —
   202	    // never the Midlibrary corpus (licence + it is simply not what she asked for).
   203	    ownSubjects: ownSubjects(profile, project, compiled, pj),
   204	    keywords, avoidWords, warnings: [], ratedCount: loved.length, positiveCount: loved.length, evidenceSrefs: loved.length,
   205	    tasteSource: sourceLabel({ evidence: loved.length, kept: kept.length, keywords: keywords.length }),
   206	    confidence: confidenceOf({ positiveCount: loved.length, kept: kept.length, keywords: keywords.length }),
   207	  };
   208	}
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
   104	    if (c?.id) ids.add(c.id);
   105	  }
   106	  const raw = JSON.stringify(e);
   107	  need(!BYTES_RE.test(raw), 'image bytes are refused in events');
   108	  need(raw.length < 64_000, 'event too large');
   109	  for (const k of ['notePublic', 'notePrivate', 'dependsContext']) {
   110	    if (e[k] !== undefined) need(typeof e[k] === 'string' && e[k].length <= MAX_STR, `${k} must be a string ≤ ${MAX_STR} chars`);
   111	  }
   112	  if (e.eventType === 'pair') {
   113	    need(RESPONSES.includes(e.response), `response must be one of ${RESPONSES.join('|')}`);
   114	    need(OUTCOMES.includes(e.outcomeClass), 'outcomeClass required on pair events');
   115	    if (e.reasonCode !== undefined) need(REASONS.includes(e.reasonCode), 'reasonCode not in enum');
   116	    if (e.response === 'depends') need(typeof e.dependsContext === 'string' && e.dependsContext.length > 0, 'dependsContext required when response is depends');
   117	  }
   118	  if (e.eventType === 'grid-selection') {
   119	    need(Array.isArray(e.items) && e.items.length === (e.candidates || []).length, 'grid items must cover every candidate');
   120	    for (const it of e.items || []) {
   121	      need(ids.has(it?.id), 'grid item id must be a candidate id');
   122	      need(VERDICTS.includes(it?.verdict), 'grid item verdict must be closest|miss|neutral');
   123	      if (it?.verdict !== 'neutral') {
   124	        need(REASONS.includes(it?.reasonCode), 'reasonCode required on closest/miss items');
   125	        need(OUTCOMES.includes(it?.outcomeClass), 'outcomeClass required on closest/miss items');
   126	        need(it?.reasonLockedBeforeReveal === true, 'reason must be locked before the label is revealed');
   127	      }
   128	    }
   129	  }
   130	  if (e.eventType === 'reversal') {
   131	    need(/^[a-f0-9]{24}$/.test(String(e.reversalOf ?? '')), 'reversalOf must be the 24-hex eventId being undone');
   132	  }
   133	  return { ok: errors.length === 0, errors };
   134	}
   135	
   136	/** Events minus those a later `reversal` undid — the compiler and the never-show-twice set read only these. */
   137	export function activeEvents(events) {
   138	  const reversed = new Set(events.filter((e) => e.eventType === 'reversal' && e.reversalOf).map((e) => e.reversalOf));
   139	  return events.filter((e) => e.eventType !== 'reversal' && !reversed.has(e.eventId));
   140	}
   141	
   142	/** Idempotent id: same session, same candidates, same presentation → same id. */
   143	export function eventIdFor(e) {
   144	  const ids = (e.candidates || []).map((c) => c.id).sort().join(',');
   145	  return createHash('sha256').update(`${e.sessionId}|${e.eventType}|${ids}|${e.presentedAt}`).digest('hex').slice(0, 24);
   146	}
   147	
   148	export function readEvents(dir = EVENTS_DIR) {
   149	  if (!fs.existsSync(dir)) return [];
   150	  const out = [];
   151	  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.jsonl')).sort()) {
   152	    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
   153	      if (!line.trim()) continue;
   154	      try { out.push(JSON.parse(line)); } catch { out.push({ _corrupt: true, file: f }); }
   155	    }
   156	  }
   157	  return out;
   158	}
   159	
   160	/** Where a namespace keeps its events. Sean's default memory stays exactly where it always was. */
   161	export function eventsDirFor(profile = DEFAULT_PROFILE, project = DEFAULT_PROJECT) {
   162	  if (profile === DEFAULT_PROFILE && project === DEFAULT_PROJECT) return EVENTS_DIR;
   163	  if (!PROFILES.includes(profile) || !isProjectId(project)) throw new Error(`invalid namespace ${profile}/${project}`);
   164	  return path.join(VAULT, 'taste', 'profiles', profile, project, 'events');
   165	}
   166	export const readEventsFor = (profile, project) => readEvents(eventsDirFor(profile, project));
   167	
   168	/** Every picture a namespace has already judged — one memory never sees the same picture twice. An undone grid frees its pictures. */
   169	export function judgedIds(events) {
   170	  const ids = new Set();
   171	  for (const e of activeEvents(events)) for (const c of e.candidates || []) if (c?.id) ids.add(c.id);
   172	  return [...ids];
   173	}
   174	
   175	/**
   176	 * Validate, stamp, dedupe, append. Returns { ok, eventId, duplicate } or { ok:false, errors }.
   177	 * One file per session so parallel sessions never share a file. The directory is derived from the
   178	 * event's own namespace (profileId/projectId) — a caller cannot aim an event at another memory.
   179	 */
   180	export function appendEvent(e, dir) {
   181	  const v = validateEvent(e);
   182	  if (!v.ok) return { ok: false, errors: v.errors };
   183	  if (dir === undefined) {
   184	    // The event writer must not be able to INVENT a memory. `mkdirSync(recursive)` below happily
   185	    // created taste/profiles/<profile>/<any-slug>/events/ for a namespace the project registry had
   186	    // never heard of: every read then refused it and /api/projects never listed it, so the
   187	    // judgements sat on disk invisible — and went live the moment someone created a real project
   188	    // with that slug. Reads cannot invent a namespace; the writer could. (round-3, GLM 5.3 #5)
   189	    // Checked with fs rather than readProject() to avoid a projects.mjs <-> events.mjs import cycle.
   190	    // An explicitly-passed `dir` stays the documented test seam and is unaffected.
   191	    const isDefault = profileOf(e) === DEFAULT_PROFILE && projectOf(e) === DEFAULT_PROJECT;
   192	    if (!isDefault) {
   193	      const pj = path.join(path.dirname(eventsDirFor(profileOf(e), projectOf(e))), 'project.json');
   194	      if (!fs.existsSync(pj)) return { ok: false, errors: [`unknown memory ${profileOf(e)}/${projectOf(e)} — create the project first`] };
   195	    }
   196	  }
   197	  dir = dir ?? eventsDirFor(profileOf(e), projectOf(e));
   198	  const eventId = eventIdFor(e);
   199	  fs.mkdirSync(dir, { recursive: true });
   200	  const file = path.join(dir, `${e.sessionId}.jsonl`);
   201	  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(`"eventId":"${eventId}"`)) {
   202	    return { ok: true, eventId, duplicate: true };
   203	  }
   204	  // The never-show-twice law lives at the WRITER, not only at presentation (panel 2026-08-25): a grid
   205	  // whose pictures this memory already judged — from the page, a bundle planned before those grids, or
   206	  // a replay with a fresh timestamp — is refused, never counted twice. Undo the earlier grid first.
   207	  const existing = readEvents(dir);
   208	  if (e.eventType === 'grid-selection' || e.eventType === 'pair') {   // every judgement kind, not only grids (panel round 2)
   209	    const seen = new Set(judgedIds(existing));
   210	    const again = (e.candidates || []).filter((c) => seen.has(c.id)).length;
   211	    if (again) return { ok: false, errors: [`refused: ${again} of these pictures were already judged in this memory (never-show-twice) — undo that judgement first`] };
   212	  }
   213	  if (e.eventType === 'reversal') {
   214	    if (!existing.some((x) => x.eventId === e.reversalOf && x.eventType !== 'reversal')) return { ok: false, errors: ['reversalOf does not name a judgement in this memory'] };
   215	    if (existing.some((x) => x.eventType === 'reversal' && x.reversalOf === e.reversalOf)) return { ok: true, eventId, duplicate: true, note: 'already undone' };
   216	  }
   217	  // A `pair` that gets this far would be WRITTEN — and writing it is pure loss. judgedIds() counts
   218	  // the candidates of every active event, so the pictures are burned out of this memory forever by
   219	  // never-show-twice, while tally() skips anything that is not a grid-selection, so the opinion is
   220	  // never counted. The visible symptom is a pool that exhausts early for no reason. No surface emits
   221	  // pairs today (grepped: no page, no lib, no CLI), so refusing costs nothing and stops the silent
   222	  // loss; validateEvent still accepts the shape, and the schema and its tests stay intact, so
   223	  // compiling pairs remains a feature someone can land later.
   224	  // Placed AFTER never-show-twice on purpose: an already-judged pair keeps its more specific error.
   225	  // (round-3 panel — GLM 5.3 finding 9 and Ox Alpha P2, independently)
   226	  if (e.eventType === 'pair') {
   227	    return { ok: false, errors: ['pair judgements are not compiled yet — recording one would burn these pictures out of this memory without counting the opinion'] };
   228	  }
   229	  const line = JSON.stringify({ ...e, eventId, recordedAt: new Date().toISOString() });
   230	  fs.appendFileSync(file, line + '\n', 'utf8');
   231	  return { ok: true, eventId, duplicate: false };
   232	}
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
   132	      const seed = seedRaw && /^\d+$/.test(seedRaw) ? Number(seedRaw) : undefined;
   133	
   134	      let pool = corpus;
   135	      if (url.searchParams.get('cinematic') === '1') {
   136	        const sref = corpus.sref.filter((c) =>
   137	          /cinematic|film|movie|noir/i.test(`${c.source_title} ${c.style_name} ${c.example_prompt}`));
   138	        if (sref.length) pool = { ...corpus, sref };
   139	      }
   140	
   141	      const tasteMeta = { source: taste.tasteSource, evidenceSrefs: taste.evidenceSrefs, keywords: taste.keywords.length, kept: taste.kept.length, confidence: taste.confidence };
   142	      // medium=video → motion prompts from the SAME taste (lib/video.mjs). No Midjourney params: a video
   143	      // graph takes natural language, and aspect/length live in the ComfyUI graph, not in the sentence.
   144	      if (url.searchParams.get('medium') === 'video') {
   145	        let v;
   146	        try { v = generateVideo(pool, taste, { count: n, mode, seed }); } catch (err) {
   147	          return json(res, 200, { seed: null, mode, medium: 'video', profileId: ns.profile, projectId: ns.project, taste: tasteMeta, confidence: taste.confidence, exhausted: true, poolSize: 0, vetoed: 0, prompts: [], hint: String(err.message).split('\n')[0] });
   148	        }
   149	        return json(res, 200, {
   150	          seed: v.seed, mode, medium: 'video', profileId: ns.profile, projectId: ns.project, taste: tasteMeta,
   151	          confidence: taste.confidence, exhausted: v.exhausted, poolSize: v.poolSize, vetoed: v.drops?.vetoed ?? 0,
   152	          prompts: v.prompts.map((p) => ({ prompt: p.prompt, subject: p.subject, grammar: p.grammar, kind: 'video', camera: p.camera, motion: p.motion, sref: null, styleName: null, rating: null, isNew: false })),
   153	        });
   154	      }
   155	      let out;
   156	      try { out = generate(pool, taste, { count: n, mode, ar, seed }); } catch (err) {
   157	        // A fresh memory whose words reach nothing in the corpus is an honest empty, not a 500.
   158	        return json(res, 200, { seed: null, mode, profileId: ns.profile, projectId: ns.project, taste: tasteMeta, confidence: taste.confidence, exhausted: true, poolSize: 0, vetoed: 0, prompts: [], hint: String(err.message).split('\n')[0] });
   159	      }
   160	      return json(res, 200, {
   161	        seed: out.seed,
   162	        mode,
   163	        profileId: ns.profile, projectId: ns.project, taste: tasteMeta,
   164	        confidence: taste.confidence,
   165	        exhausted: out.exhausted,
   166	        poolSize: out.poolSize,
   167	        vetoed: out.drops?.vetoed ?? 0,
   168	        prompts: out.prompts.map((p) => ({
   169	          prompt: p.prompt,
   170	          subject: p.subject,
   171	          grammar: p.grammar,
   172	          sref: p.sref?.code ?? null,
   173	          styleName: p.sref?.style_name ?? null,
   174	          rating: p.sref?.rating ?? null,
   175	          isNew: Boolean(p.sref?.isNew),
   176	        })),
   177	      });
   178	    }
   179	
   180	    // Writes: refuse drive-by browser requests before reading a byte of body (lib/origin.mjs).
   181	    if (req.method === 'POST') {
   182	      const gate = checkWriteRequest(req.headers, PORT);
   183	      if (!gate.ok) return json(res, 403, { error: gate.reason });
   184	    }
   185	
   186	    // Namespace-aware routes (reads + the project write, which sits behind the gate above).
   187	    const base = `http://${HOST}:${PORT}`;
   188	    if (await handleModeRoutes({ url, req, res, json, readBody, here: HERE, base })) return;
   189	    // The render loop: POST /api/intent (gated above), GET /api/renders, GET /renders/<p>/<j>/<token>/<n>.
   190	    if (await handleRenderRoutes({ url, req, res, json, readBody, base })) return;
   191	    // "Make": queue renders in Sean's own ComfyUI graph (POST is gated above).
   192	    if (await handleMakeRoutes({ url, req, res, json, readBody })) return;
   193	
   194	    if (url.pathname === '/api/keep' && req.method === 'POST') {
   195	      const body = await readBody(req);
   196	      if (typeof body.prompt !== 'string' || body.prompt.split(/\s+/).length < 3) {
   197	        return json(res, 400, { error: 'prompt must be a string of at least 3 words' });
   198	      }
   199	      // The same 2000-char discipline keepFor() applies to every project memory. Sean's own branch
   200	      // below goes straight to the CLI and checked WORD COUNT only, so a 60 KB single "prompt"
   201	      // (under the 64 KB body cap) landed as one bullet in taste/kept.md and steered his generator
   202	      // from then on. Two keep channels must not have two validation contracts.
   203	      // (round-3 panel, GLM 5.3 finding 4)
   204	      if (body.prompt.length > 2000) return json(res, 400, { error: 'prompt must be ≤ 2000 chars' });
   205	      const profile = body.profileId ?? DEFAULT_PROFILE, project = body.projectId ?? DEFAULT_PROJECT;
   206	      // Route-level slug validation (defence in depth; readProject/eventsDirFor already refuse bad ids).
   207	      if (!PROFILES.includes(profile) || !isProjectId(project)) return json(res, 400, { error: 'profileId/projectId must name a memory (slugs only)' });
   208	      if (!(profile === DEFAULT_PROFILE && project === DEFAULT_PROJECT)) {
   209	        // A partner/client memory keeps into its own kept.md — never into Sean's.
   210	        const r = keepFor(profile, project, body.prompt);
   211	        return json(res, r.ok ? 200 : 400, r.ok ? { ok: true, duplicate: r.duplicate, message: r.duplicate ? 'Already kept.' : `Kept. ${r.kept} exemplar${r.kept === 1 ? '' : 's'} now steering ${profile}/${project}.` } : { error: r.error });
   212	      }
   213	      return json(res, 200, { ok: true, message: cli(['--keep', body.prompt]) });
   214	    }
   215	
   216	    if (url.pathname === '/api/unkeep' && req.method === 'POST') {
   217	      const body = await readBody(req);
   218	      const profile = body.profileId ?? DEFAULT_PROFILE, project = body.projectId ?? DEFAULT_PROJECT;
   219	      if (!PROFILES.includes(profile) || !isProjectId(project)) return json(res, 400, { error: 'profileId/projectId must name a memory (slugs only)' });
   220	      const r = unkeepFor(profile, project, body.prompt);
   221	      return json(res, r.ok ? 200 : 400, r);
   222	    }
   223	
   224	    if (url.pathname === '/api/rate' && req.method === 'POST') {
   225	      const body = await readBody(req);
   226	      if (body.profileId && !(body.profileId === DEFAULT_PROFILE && (body.projectId ?? DEFAULT_PROJECT) === DEFAULT_PROJECT)) {
   227	        return json(res, 400, { error: "star ratings are Sean's markdown channel — a project's taste comes from the pictures it judges" });
   228	      }
   229	      const code = String(body.code ?? '');
   230	      const rating = Number(body.rating);
   231	      if (!/^\d{5,12}$/.test(code)) return json(res, 400, { error: 'code must be 5-12 digits' });
   232	      if (!(rating >= 1 && rating <= 5)) return json(res, 400, { error: 'rating must be 1-5' });
   233	      const note = typeof body.note === 'string' ? body.note.slice(0, 200) : '';
   234	      return json(res, 200, { ok: true, message: cli(['--rate', code, String(rating), note]) });
   235	    }
   236	
   237	    // THE single writer of taste/events/*.jsonl. grill-me and every agent POST here; nobody
   238	    // opens the file. Validation + provenance refusal + idempotency live in lib/events.mjs.
   239	    if (url.pathname === '/api/event' && req.method === 'POST') {
   240	      const body = await readBody(req);
   241	      const r = appendEvent(body);
   242	      return json(res, r.ok ? 200 : 400, r);
   243	    }
   244	
   245	    return json(res, 404, { error: 'not found', routes: ['/', '/probe', '/brief', '/api/prompt', '/api/probe', '/api/profile', '/api/projects', '/api/judged', '/api/stats', '/api/keep', '/api/rate', '/api/event', '/api/intent', '/api/renders', '/api/make', '/api/make/status', '/renders/<profile>/<project>/<token>/<n>'] });
   246	  } catch (err) {
   247	    return json(res, 500, { error: String(err.message).slice(0, 200) });
   248	  }
   249	});
   250	
   251	server.listen(PORT, HOST, () => {
   252	  const t = loadTaste();
   253	  console.log(`\nswan-prompt  →  http://${HOST}:${PORT}`);
   254	  console.log(`  corpus : ${corpus.srefCount} sref codes · ${corpus.prompts.length} prompts · ${corpus.artists.length} artists`);
   255	  console.log(`  taste  : ${t.kept.length} kept · ${t.ratedCount} rated (${t.positiveCount} endorsed) · confidence ${t.confidence}`);
   256	  if (t.warnings.length) t.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
   257	  console.log(`\n  page     http://${HOST}:${PORT}/`);
   258	  console.log(`  probe    http://${HOST}:${PORT}/probe      ← Taste Discovery: 12 pictures, pick closest/miss (mode bar: Sean · Partner · Client)`);
   259	  console.log(`  brief    http://${HOST}:${PORT}/brief      ← the readout for one memory (?profile=&project=)`);
   260	  console.log(`  api      curl '${`http://${HOST}:${PORT}/api/prompt?n=3&mode=surprise`}'`);
   261	  console.log(`  vault    ${VAULT}\n`);
   262	});
```

---

## How to answer

Lead with the single most important thing you found. Then a ranked list; for each finding:

```
### P0 — <one-line claim>
File / where: prompter/lib/x.mjs, functionName(), lines N-M
Failure: <concrete inputs -> what actually happens>
Consequence: <licence breach / data loss / crash / wrong output>
Smallest fix: <the minimal change>
```

If you cannot name inputs that produce the failure, label it SPECULATIVE. A plausible finding that
does not reproduce costs more than it is worth — four seats have already been through this file and
the remaining defects are the subtle ones.

Then: **"Fixes I audited and believe are correct"** — name each fix you checked and the specific
attack you tried against it. And **"What I would look at with a second call"**, in priority order.

End with **APPROVE / REVISE / REJECT**.
