---
decision: "Round-7 dry check — after thirty-six fixes and six closed corpus doors, is anything left?"
status: open
board: SWA-186
date: 2026-08-26
privacy: IDs and roles only. The second user is "the partner". No names, no keys, no PII.
---

# Swan Taste Brain — round 7: the dry check

Five hostile rounds have taken **thirty-six** real defects out of this tool and closed **six doors**
through which a licensed corpus could reach a second user's memory. **495 checks across 10 suites,
all passing**, with a regression file whose checks fail against the pre-fix code at every round.

**The question is whether this is finally dry.** If it is, say so and name the attacks you tried
that failed — that is the finding. If it is not, one more defect is worth more than ten plausible ones.

## The law

A **third-party copyrighted corpus** (Midlibrary, which the owner subscribes to) may be used for
**`sean/default` only** — the owner's memory, named as a namespace, not as a profile — and must never
reach a partner or client memory, a shared bundle, or a printed brief: not the images, not the
artists, not the style codes, not the prompt text.

## The six doors, and the five shapes they kept taking

| # | Layer | How the corpus arrived |
|---|---|---|
| 1 | generation | `chooseSref()` ran unconditionally — 6 of 6 prompts carried a code |
| 2 | the read API | `access-control-allow-origin: '*'` made every read cross-origin readable |
| 3 | the event writer | candidates could declare `provenance: 'midlibrary-reference'` |
| 4 | the compiler's output | `tally()` bumped style codes regardless of witness |
| 5 | the index join | a candidate declaring **nothing** passed, and the compiler back-filled from the index |
| 6 | the claim | a candidate naming a corpus id or CDN url while **claiming** a shareable provenance |

**The five recurring shapes — look for a further instance of each:**

1. **A law enforced at one layer.** Six instances.
2. **Absence is not innocence.** A guard written `if (field !== undefined) refuse(...)` is bypassed by
   sending no field.
3. **A guard that cannot fire.** Three shipped: a literal backspace where `\b` was meant; `\s--sref`
   that cannot match a leading flag; a tripwire matching `ml:img:` inside the wider `ml:` namespace.
4. **A fix applied to one writer, not the class.** `$&` expansion was fixed in one of four markdown
   writers; the corpus marker lived in the export writer and not the event writer; the "never aim a
   bundle at the owner" law lived in the importer and not the writer.
5. **A containment fix that breaks the legitimate case.** Three: judging your own renders, keeping an
   ordinary generated prompt, Undo — plus one caught in review (blocking the index fallback also
   threw away legitimate photo titles).

## What is enforced now

- One owner memory: `sean/default`. Every gate uses the same namespace predicate.
- A non-owner candidate must **declare** an allowed provenance, must not carry `sref` (except its own
  render, whose id must match `render:<12-hex>:<n>`), and must not name the corpus in **any** field —
  `CORPUS_MARKER` is one exported definition shared by the event writer and the export writer.
- The **index is ground truth**: a candidate the index knows as corpus is dropped by the compiler for
  a non-owner memory, whatever the event claims.
- `tally()` gates style codes, the `ml:` subject fallback and index-derived provenance on the owner.
- `keepFor` and `mintIntent` refuse `--sref` anywhere, anchored `(^|\s)`.
- A bundle event may never be recorded into the owner's memory — at the **writer**.
- Every request is Host-gated (DNS rebinding); no CORS headers at all.
- Every markdown writer uses a function replacement, asserted structurally.
- Both tabs discard a response whose memory changed mid-fetch.

## Also worth attacking

- **The test suite.** 495 checks pass. Which cannot fail? Which assert a shape instead of a
  behaviour? Is there a guard with no negative test?
- Anything the enforcement list claims that the code does not actually do.
- The remaining unreviewed files: `lib/routes-modes.mjs`, `lib/probe.mjs`, `lib/images.mjs`,
  `lib/corpus.mjs`, `capture-workflow.mjs`, `bundle.html`.

---

# THE SOURCE (current)

## prompter/lib/events.mjs
```
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
    50	/** What a picture in a NON-OWNER memory is allowed to be: freely-licensed sources, or her own render.
    51	 *  Declared here rather than imported from projects.mjs, which imports this module (cycle). Kept in
    52	 *  step with projects.mjs SHAREABLE_PROVENANCE, plus 'local-comfy' for her own renders. */
    53	export const NON_OWNER_PROVENANCES = new Set(['unsplash', 'pexels', 'esa-webb-ccby', 'nasa-public-domain', 'local-comfy']);
    54	/** The marker for "this string came from the corpus". Defined HERE, once, and imported by
    55	 *  export-bundle.mjs — it used to live only in the export writer, so the event writer (the asset
    56	 *  that is never rewritten) had no equivalent check at all. Four rounds of this review found the
    57	 *  same shape four times: a fix applied to one writer instead of to the class.
    58	 *  (round-6 panel, GLM 5.3 P1) */
    59	export const CORPUS_MARKER = /ml:|website-files\.com|midlibrary-reference|midlibrary\.io/i;
    60	
    61	const SESSION_ID = /^[a-f0-9]{8,32}$/;
    62	/** A project slug names a design, never a person or a school (the partner lane's ONE RULE boundary). */
    63	const PROJECT_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
    64	export const isProjectId = (s) => PROJECT_ID.test(String(s ?? ''));
    65	export const profileOf = (e) => e?.profileId ?? DEFAULT_PROFILE;
    66	/** The law names ONE owner memory: sean/default. Gating on the profile alone made every
    67	 *  sean/<other-project> an owner too. (round-6 panel, Ox Alpha P1) */
    68	export const isOwnerMemory = (profile, project) => profile === DEFAULT_PROFILE && project === DEFAULT_PROJECT;
    69	const eventIsOwner = (e) => isOwnerMemory(profileOf(e), projectOf(e));
    70	export const projectOf = (e) => e?.projectId ?? DEFAULT_PROJECT;
    71	const MAX_STR = 2000;
    72	const BYTES_RE = /data:image|base64,/i;
    73	
    74	const allowNonSean = () => process.env.SWAN_TASTE_ALLOW_NONSEAN === '1';
    75	
    76	/** @returns {{ ok: boolean, errors: string[] }} */
    77	export function validateEvent(e) {
    78	  const errors = [];
    79	  const need = (cond, msg) => { if (!cond) errors.push(msg); };
    80	  need(e && typeof e === 'object', 'event must be an object');
    81	  if (errors.length) return { ok: false, errors };
    82	  need(e.schemaVersion === SCHEMA_VERSION, `schemaVersion must be ${SCHEMA_VERSION}`);
    83	  need(EVENT_TYPES.includes(e.eventType), `eventType must be one of ${EVENT_TYPES.join('|')}`);
    84	  need(SOURCES.includes(e.source), `source must be one of ${SOURCES.join('|')}`);
    85	  if (e.profileId !== undefined) need(PROFILES.includes(e.profileId), `profileId must be one of ${PROFILES.join('|')}`);
    86	  if (e.projectId !== undefined) need(isProjectId(e.projectId), 'projectId must be a slug (a-z, 0-9, hyphens, ≤40) — never a name');
    87	  if (e.channel !== undefined) need(CHANNELS.includes(e.channel), `channel must be one of ${CHANNELS.join('|')}`);
    88	  // A bundle is something someone ELSE filled in and sent back. Round 5 put that law in the importer
    89	  // — which a direct POST to /api/event simply walks past. The writer is the only place it can live.
    90	  // (round-6 panel, GLM 5.3 P1 — the same "one writer, not the class" shape, again.)
    91	  if (e.channel === 'bundle' && eventIsOwner(e)) errors.push("a bundle event may never be recorded into the owner's own memory");
    92	  if (PROFILES.includes(e.source)) {
    93	    need(e.source === profileOf(e), `source '${e.source}' cannot write into profile '${profileOf(e)}' — a witness writes only its own memory`);
    94	  } else if (SOURCES.includes(e.source)) {
    95	    // Non-human sources exist for fixtures only, under the test flag, and only in sean/default —
    96	    // never in a household memory (panel 2026-08-25: the flag predated multi-profile).
    97	    if (!allowNonSean()) errors.push(`source '${e.source}' refused: only a human witness (${PROFILES.join('|')}) may write in production`);
    98	    else if (!(profileOf(e) === DEFAULT_PROFILE && projectOf(e) === DEFAULT_PROJECT)) errors.push(`source '${e.source}' may never write into ${profileOf(e)}/${projectOf(e)}`);
    99	  }
   100	  need(SESSION_ID.test(String(e.sessionId ?? '')), 'sessionId must be opaque hex (8-32 chars)');
   101	  need(typeof e.presentedAt === 'string' && !Number.isNaN(Date.parse(e.presentedAt)), 'presentedAt must be an ISO date');
   102	  need(MEDIA.includes(e.medium), `medium must be one of ${MEDIA.join('|')}`);
   103	  need(BRAND_CONTEXTS.includes(e.brandContext), `brandContext must be one of ${BRAND_CONTEXTS.join('|')}`);
   104	  need(GENERATORS.includes(e.generatorDistribution), `generatorDistribution must be one of ${GENERATORS.join('|')}`);
   105	  need(Array.isArray(e.candidates) && e.candidates.length > 0, 'candidates must be a non-empty array');
   106	  const ids = new Set();
   107	  for (const c of e.candidates || []) {
   108	    need(c && typeof c.id === 'string' && c.id.length > 0, 'candidate.id required');
   109	    if (c?.url !== undefined) need(/^https?:\/\//.test(c.url) && !BYTES_RE.test(c.url), 'candidate.url must be http(s), never bytes');
   110	    if (c?.provenance !== undefined) need(PROVENANCES.includes(c.provenance), `candidate.provenance must be one of ${PROVENANCES.join('|')}`);
   111	    // The witness law binds WHO writes; nothing bound WHAT CATALOGUE the candidates may name. A
   112	    // crafted event, an agent, or a buggy bundle importer could therefore write a
   113	    // `midlibrary-reference` candidate — sref code and all — into a partner or client memory.
   114	    // profile.mjs filters t.picks by shareable provenance for a non-Sean memory, but t.srefs is NOT
   115	    // filtered, so the corpus code still ranked and evidenceLoved promoted it into her directions.
   116	    // Same blind spot as the artist/sref fixes: the pictures were guarded, the style codes were not.
   117	    // Events are the one asset that is never rewritten, so this has to be refused at the writer.
   118	    // (round-3 panel, Ox Alpha P1 — independent of GLM's two P0s)
   119	    if (c?.provenance === 'midlibrary-reference' && !eventIsOwner(e)) {
   120	      errors.push(`candidate ${c.id}: midlibrary-reference may never enter ${profileOf(e)}/${projectOf(e)} — the corpus is the owner's alone`);
   121	    }
   122	    // ...and the code itself, whatever the candidate CLAIMS its provenance is. Checking provenance
   123	    // alone was bypassable in one field: `{ provenance: 'unsplash', sref: '123456789' }` passed and
   124	    // still bumped the style tally. A sref IS the catalogue identifier, so a shareable picture has no
   125	    // business carrying one. (round-3 panel, Kimi K3 P0 — the hole in the fix directly above.)
   126	    // ...EXCEPT on her own render. A `local-comfy` candidate is a picture SHE made, and its sref is
   127	    // her own intent's, so refusing it broke judging your own renders — the core of the render loop.
   128	    // Safe to allow: tally() hits `if (generated) continue` BEFORE the style bump, so a render's code
   129	    // never reaches the style tallies anyway. (Caught by test-renders when the first cut was blanket.)
   130	    if (c?.sref !== undefined && c?.sref !== null && !eventIsOwner(e) && c?.provenance !== 'local-comfy') {
   131	      errors.push(`candidate ${c.id}: a style code may never enter ${profileOf(e)}/${projectOf(e)}`);
   132	    }
   133	    // ABSENCE IS NOT INNOCENCE. Both checks above are conditional on the field being PRESENT, so a
   134	    // candidate carrying nothing but an `id` sailed through — and then the compiler joined that id
   135	    // against the Midlibrary image index and back-filled doc, prompt and provenance from it. A
   136	    // partner memory ended up with corpus prompt text as her own subjects and `midlibrary-reference`
   137	    // in her provenance tally, from an event that never mentioned either. Doors 3 and 4 checked what
   138	    // the candidate CLAIMS; this is what the INDEX says about it. So a non-Sean memory must state a
   139	    // provenance, and it must be one that is allowed to be there.
   140	    // (round-4 panel, Ox Alpha P1 — reproduced: 3 corpus subjects + the provenance row)
   141	    // 'local-comfy' is the one provenance allowed to carry a style code and free prompt text, on the
   142	    // grounds that it is HER OWN render. Nothing checked that the candidate actually looked like one,
   143	    // so a crafted event could claim local-comfy on any id and put arbitrary text into her picks and
   144	    // printed brief. renders.mjs mints these ids as `render:<12-hex token>:<n>`; requiring that shape
   145	    // costs a legitimate render nothing and removes the exemption as a free-text channel. Checked as a
   146	    // SHAPE rather than by resolving the intent, because renders.mjs imports this module.
   147	    // (round-6 panel, HY3 — its "style codes leak" claim is refuted, tally() skips generated
   148	    // candidates before the style bump and picks carries no sref, but the exemption was still wider
   149	    // than the thing it was written to permit.)
   150	    if (c?.provenance === 'local-comfy' && !/^render:[a-f0-9]{12}:\d{1,5}$/.test(String(c?.id ?? ''))) {
   151	      errors.push(`candidate ${c.id}: only a real render id may claim local-comfy provenance`);
   152	    }
   153	    // The declared provenance is checked below, but a DECLARATION is not the truth. A candidate can
   154	    // name a corpus CDN url, title, credit or doc while claiming 'pexels', and the compiler's index
   155	    // join then back-fills the rest — so the partner's brief printed a Midlibrary image, an artist
   156	    // credit and a midlibrary.io link, and `ownSubjects` absorbed the corpus title into her
   157	    // generator. The export writer already refused exactly these strings; the event writer, "the one
   158	    // asset never rewritten", had no equivalent. Same marker, both writers, one definition.
   159	    // (round-6 panel, GLM 5.3 P1 — the case Ox's index-side fix does not reach, because the id need
   160	    // not resolve in the index at all.)
   161	    if (!eventIsOwner(e)) {
   162	      const smells = [c?.id, c?.url, c?.credit, c?.pageUrl, c?.title, c?.doc].find((v) => typeof v === 'string' && CORPUS_MARKER.test(v));
   163	      if (smells) errors.push(`candidate ${c.id}: "${String(smells).slice(0, 60)}" names the corpus, which may never enter ${profileOf(e)}/${projectOf(e)}`);
   164	    }
   165	    if (!eventIsOwner(e) && !NON_OWNER_PROVENANCES.has(c?.provenance)) {
   166	      errors.push(`candidate ${c.id}: every picture in ${profileOf(e)}/${projectOf(e)} must declare a shareable provenance (${[...NON_OWNER_PROVENANCES].join('|')})`);
   167	    }
   168	    if (c?.id) ids.add(c.id);
   169	  }
   170	  const raw = JSON.stringify(e);
   171	  need(!BYTES_RE.test(raw), 'image bytes are refused in events');
   172	  need(raw.length < 64_000, 'event too large');
   173	  for (const k of ['notePublic', 'notePrivate', 'dependsContext']) {
   174	    if (e[k] !== undefined) need(typeof e[k] === 'string' && e[k].length <= MAX_STR, `${k} must be a string ≤ ${MAX_STR} chars`);
   175	  }
   176	  if (e.eventType === 'pair') {
   177	    need(RESPONSES.includes(e.response), `response must be one of ${RESPONSES.join('|')}`);
   178	    need(OUTCOMES.includes(e.outcomeClass), 'outcomeClass required on pair events');
   179	    if (e.reasonCode !== undefined) need(REASONS.includes(e.reasonCode), 'reasonCode not in enum');
   180	    if (e.response === 'depends') need(typeof e.dependsContext === 'string' && e.dependsContext.length > 0, 'dependsContext required when response is depends');
   181	  }
   182	  if (e.eventType === 'grid-selection') {
   183	    need(Array.isArray(e.items) && e.items.length === (e.candidates || []).length, 'grid items must cover every candidate');
   184	    for (const it of e.items || []) {
   185	      need(ids.has(it?.id), 'grid item id must be a candidate id');
   186	      need(VERDICTS.includes(it?.verdict), 'grid item verdict must be closest|miss|neutral');
   187	      if (it?.verdict !== 'neutral') {
   188	        need(REASONS.includes(it?.reasonCode), 'reasonCode required on closest/miss items');
   189	        need(OUTCOMES.includes(it?.outcomeClass), 'outcomeClass required on closest/miss items');
   190	        need(it?.reasonLockedBeforeReveal === true, 'reason must be locked before the label is revealed');
   191	      }
   192	    }
   193	  }
   194	  if (e.eventType === 'reversal') {
   195	    need(/^[a-f0-9]{24}$/.test(String(e.reversalOf ?? '')), 'reversalOf must be the 24-hex eventId being undone');
   196	  }
   197	  return { ok: errors.length === 0, errors };
   198	}
   199	
   200	/** Events minus those a later `reversal` undid — the compiler and the never-show-twice set read only these. */
   201	export function activeEvents(events) {
   202	  const reversed = new Set(events.filter((e) => e.eventType === 'reversal' && e.reversalOf).map((e) => e.reversalOf));
   203	  return events.filter((e) => e.eventType !== 'reversal' && !reversed.has(e.eventId));
   204	}
   205	
   206	/** Idempotent id: same session, same candidates, same presentation → same id. */
   207	export function eventIdFor(e) {
   208	  const ids = (e.candidates || []).map((c) => c.id).sort().join(',');
   209	  return createHash('sha256').update(`${e.sessionId}|${e.eventType}|${ids}|${e.presentedAt}`).digest('hex').slice(0, 24);
   210	}
   211	
   212	export function readEvents(dir = EVENTS_DIR) {
   213	  if (!fs.existsSync(dir)) return [];
   214	  const out = [];
   215	  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.jsonl')).sort()) {
   216	    for (const line of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
   217	      if (!line.trim()) continue;
   218	      try { out.push(JSON.parse(line)); } catch { out.push({ _corrupt: true, file: f }); }
   219	    }
   220	  }
   221	  return out;
   222	}
   223	
   224	/** Where a namespace keeps its events. Sean's default memory stays exactly where it always was. */
   225	export function eventsDirFor(profile = DEFAULT_PROFILE, project = DEFAULT_PROJECT) {
   226	  if (profile === DEFAULT_PROFILE && project === DEFAULT_PROJECT) return EVENTS_DIR;
   227	  if (!PROFILES.includes(profile) || !isProjectId(project)) throw new Error(`invalid namespace ${profile}/${project}`);
   228	  return path.join(VAULT, 'taste', 'profiles', profile, project, 'events');
   229	}
   230	export const readEventsFor = (profile, project) => readEvents(eventsDirFor(profile, project));
   231	
   232	/** Every picture a namespace has already judged — one memory never sees the same picture twice. An undone grid frees its pictures. */
   233	export function judgedIds(events) {
   234	  const ids = new Set();
   235	  for (const e of activeEvents(events)) for (const c of e.candidates || []) if (c?.id) ids.add(c.id);
   236	  return [...ids];
   237	}
   238	
   239	/**
   240	 * Validate, stamp, dedupe, append. Returns { ok, eventId, duplicate } or { ok:false, errors }.
   241	 * One file per session so parallel sessions never share a file. The directory is derived from the
   242	 * event's own namespace (profileId/projectId) — a caller cannot aim an event at another memory.
   243	 */
   244	export function appendEvent(e, dir) {
   245	  const v = validateEvent(e);
   246	  if (!v.ok) return { ok: false, errors: v.errors };
   247	  if (dir === undefined) {
   248	    // The event writer must not be able to INVENT a memory. `mkdirSync(recursive)` below happily
   249	    // created taste/profiles/<profile>/<any-slug>/events/ for a namespace the project registry had
   250	    // never heard of: every read then refused it and /api/projects never listed it, so the
   251	    // judgements sat on disk invisible — and went live the moment someone created a real project
   252	    // with that slug. Reads cannot invent a namespace; the writer could. (round-3, GLM 5.3 #5)
   253	    // Checked with fs rather than readProject() to avoid a projects.mjs <-> events.mjs import cycle.
   254	    // An explicitly-passed `dir` stays the documented test seam and is unaffected.
   255	    const isDefault = profileOf(e) === DEFAULT_PROFILE && projectOf(e) === DEFAULT_PROJECT;
   256	    if (!isDefault) {
   257	      const pj = path.join(path.dirname(eventsDirFor(profileOf(e), projectOf(e))), 'project.json');
   258	      if (!fs.existsSync(pj)) return { ok: false, errors: [`unknown memory ${profileOf(e)}/${projectOf(e)} — create the project first`] };
   259	    }
   260	  }
   261	  dir = dir ?? eventsDirFor(profileOf(e), projectOf(e));
   262	  const eventId = eventIdFor(e);
   263	  fs.mkdirSync(dir, { recursive: true });
   264	  const file = path.join(dir, `${e.sessionId}.jsonl`);
   265	  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(`"eventId":"${eventId}"`)) {
   266	    return { ok: true, eventId, duplicate: true };
   267	  }
   268	  // The never-show-twice law lives at the WRITER, not only at presentation (panel 2026-08-25): a grid
   269	  // whose pictures this memory already judged — from the page, a bundle planned before those grids, or
   270	  // a replay with a fresh timestamp — is refused, never counted twice. Undo the earlier grid first.
   271	  const existing = readEvents(dir);
   272	  if (e.eventType === 'grid-selection' || e.eventType === 'pair') {   // every judgement kind, not only grids (panel round 2)
   273	    const seen = new Set(judgedIds(existing));
   274	    const again = (e.candidates || []).filter((c) => seen.has(c.id)).length;
   275	    if (again) return { ok: false, errors: [`refused: ${again} of these pictures were already judged in this memory (never-show-twice) — undo that judgement first`] };
   276	  }
   277	  if (e.eventType === 'reversal') {
   278	    if (!existing.some((x) => x.eventId === e.reversalOf && x.eventType !== 'reversal')) return { ok: false, errors: ['reversalOf does not name a judgement in this memory'] };
   279	    if (existing.some((x) => x.eventType === 'reversal' && x.reversalOf === e.reversalOf)) return { ok: true, eventId, duplicate: true, note: 'already undone' };
   280	  }
   281	  // A `pair` that gets this far would be WRITTEN — and writing it is pure loss. judgedIds() counts
   282	  // the candidates of every active event, so the pictures are burned out of this memory forever by
   283	  // never-show-twice, while tally() skips anything that is not a grid-selection, so the opinion is
   284	  // never counted. The visible symptom is a pool that exhausts early for no reason. No surface emits
   285	  // pairs today (grepped: no page, no lib, no CLI), so refusing costs nothing and stops the silent
   286	  // loss; validateEvent still accepts the shape, and the schema and its tests stay intact, so
   287	  // compiling pairs remains a feature someone can land later.
   288	  // Placed AFTER never-show-twice on purpose: an already-judged pair keeps its more specific error.
   289	  // (round-3 panel — GLM 5.3 finding 9 and Ox Alpha P2, independently)
   290	  if (e.eventType === 'pair') {
   291	    return { ok: false, errors: ['pair judgements are not compiled yet — recording one would burn these pictures out of this memory without counting the opinion'] };
   292	  }
   293	  const line = JSON.stringify({ ...e, eventId, recordedAt: new Date().toISOString() });
   294	  fs.appendFileSync(file, line + '\n', 'utf8');
   295	  return { ok: true, eventId, duplicate: false };
   296	}
```

## prompter/lib/profile.mjs
```
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
    42	export function tally(events, images, witness = DEFAULT_PROFILE, project = DEFAULT_PROJECT) {
    43	  // The law names sean/default, not the whole 'sean' profile. (round-6 panel, Ox Alpha P1)
    44	  const isOwner = witness === DEFAULT_PROFILE && project === DEFAULT_PROJECT;
    45	  const byId = new Map(images.map((r) => [r.id, r]));
    46	  const t = { reasons: {}, srefs: {}, subjects: {}, provenance: {}, collections: {}, brandLaw: [], picks: [], counted: 0, ignoredExecution: 0, grids: 0,
    47	    reversals: events.filter((e) => e.eventType === 'reversal').length, renders: { judged: 0, closest: 0, miss: 0 } };
    48	  // An undone grid (eventType: reversal) is not evidence — activeEvents drops it and its pictures return to the pool.
    49	  for (const e of activeEvents(events)) {
    50	    if (e.source !== witness || e.eventType !== 'grid-selection') continue;
    51	    t.grids++;
    52	    for (const it of e.items || []) {
    53	      if (it.verdict === 'neutral') continue;
    54	      const c = e.candidates.find((x) => x.id === it.id) || {};
    55	      const rec = byId.get(it.id) || {};
    56	      const doc = c.doc || rec.doc || '';
    57	      const generated = (c.provenance || rec.provenance) === 'local-comfy';
    58	      // DOOR 6: THE INDEX IS GROUND TRUTH, NOT THE CLAIM. The writer requires a non-owner candidate
    59	      // to DECLARE a shareable provenance — but it never verified the declaration. A candidate naming
    60	      // a real Midlibrary image id while claiming 'unsplash' passed every writer check, and then this
    61	      // join back-filled url, title, credit and pageUrl from the corpus index. The picks filter tests
    62	      // `c.provenance || rec.provenance`, so the LIE won the tie and the corpus image URL, title and
    63	      // artist credit reached her Directions tab and her printed brief. Round 4 made the claim
    64	      // mandatory; it never made it true. If the index knows this picture as corpus, it is corpus —
    65	      // whatever the event says — and it does not belong in a non-owner memory at all.
    66	      // (round-6 panel, Ox Alpha P0 — recurrence class 1: the writer declares, the compiler trusts.)
    67	      if (!isOwner && rec.provenance === 'midlibrary-reference') continue;
    68	      // Subject keys are namespaced by where the picture came from, so a photo theme word, a Webb
    69	      // category, a Midlibrary prompt subject and a render's prompt subject never get ranked as one list.
    70	      // The `ml:` branch reads the CORPUS prompt out of the image index. For a non-owner memory that
    71	      // is corpus text arriving through the join rather than through the event, so it is gated on the
    72	      // witness as well — the writer now refuses such candidates, and this makes any row already on
    73	      // disk inert too, the same way the style-code gate did. (round-4 panel, Ox Alpha P1)
    74	      const subject = generated ? `render:${subjectOfPrompt(c.prompt || '')}`
    75	        : doc.startsWith('photo/') ? `photo:${doc.slice(6)}`
    76	        : doc.startsWith('webb/') ? `webb:${doc.slice(5)}`
    77	        : (rec.prompt && isOwner) ? `ml:${subjectOfPrompt(rec.prompt)}` : null;
    78	      if (it.outcomeClass === 'execution') { t.ignoredExecution++; continue; }
    79	      if (it.outcomeClass === 'brand-law') { t.brandLaw.push({ id: it.id, eventId: e.eventId }); continue; }
    80	      t.counted++;
    81	      if (generated) { t.renders.judged++; t.renders[it.verdict === 'closest' ? 'closest' : 'miss']++; }
    82	      // The pictures actually chosen — IDs + URLs + credits, never bytes — so a brief can show them.
    83	      if (it.verdict === 'closest') {
    84	        // The rec.* fallback stays. The index holds the shareable PHOTOS as well as the corpus, and
    85	        // a photo's title and credit are exactly what her brief is meant to print — an earlier cut of
    86	        // this fix blocked the whole fallback and threw those away. What makes it safe is the
    87	        // `continue` above: for a non-owner memory a candidate the index knows as corpus never
    88	        // reaches here at all. (round-6 panel, GLM 5.3 P1 + Ox Alpha P0)
    89	        t.picks.push({ id: it.id, url: c.url || rec.url || null, credit: c.credit ?? rec.credit ?? null, pageUrl: c.pageUrl ?? rec.pageUrl ?? null,
    90	          title: c.title ?? rec.title ?? null, provenance: c.provenance || rec.provenance || null, doc, generated,
    91	          kind: c.kind ?? null, prompt: generated ? c.prompt ?? null : undefined,
    92	          reasonCode: it.reasonCode, outcomeClass: it.outcomeClass, eventId: e.eventId });
    93	      }
    94	      bump(t.subjects, subject, it.verdict, e.eventId);
    95	      if (it.outcomeClass === 'content') continue;
    96	      // A judged RENDER counts toward subjects (what she wants pictured) and its own tally — never toward
    97	      // style codes or reasons: the generator does not grade its own homework (panel round 2, two seats: 0, not 0.5).
    98	      if (generated) continue;
    99	      bump(t.reasons, it.reasonCode, it.verdict, e.eventId);
   100	      // STYLE CODES ARE THE OWNER'S ALONE — the fourth corpus door, and the one that was open longest.
   101	      // The picks filter in compileProfile exists because "/brief prints these"; srefs, proposedAvoids
   102	      // and the `dir:midjourney-srefs` direction were printed from this tally UNFILTERED, so a
   103	      // non-Sean memory's compiled profile and printed brief could carry corpus codes plus a sample
   104	      // prompt built from corpus text. Two inputs reached it: a midlibrary row written before the
   105	      // writer-side law existed (nothing scrubs history), and a crafted candidate that simply lies
   106	      // about provenance while still carrying `sref`. Gating HERE fixes both at once, retroactively
   107	      // and without a migration, because every read recompiles from events.
   108	      // A non-Sean memory still learns subjects, reasons and collections — those are hers.
   109	      // (round-3 panel, Kimi K3 P0)
   110	      if (isOwner) {
   111	        // The sample prompt is the PICTURE HE CHOSE, not the article's first example of that code.
   112	        bump(t.srefs, c.sref || rec.sref, it.verdict, e.eventId, rec.prompt ? `${subjectOfPrompt(rec.prompt)} --sref ${c.sref || rec.sref} --ar 16:9` : null);
   113	      }
   114	      // Same reason: `rec.provenance` comes from the corpus index, so a non-owner memory takes only
   115	      // what the candidate itself declared — which the writer has already constrained.
   116	      bump(t.provenance, isOwner ? (c.provenance || rec.provenance) : c.provenance, it.verdict, e.eventId);
   117	      bump(t.collections, doc.split('/')[0], it.verdict, e.eventId);
   118	    }
   119	  }
   120	  return t;
   121	}
   122	
   123	/** Prompt for a code: the picture he chose if we have it, else the corpus's first example. */
   124	const promptFor = (row, images) => {
   125	  if (row.samples?.length) return row.samples[0];
   126	  const rec = images.find((r) => r.sref === row.key && r.prompt);
   127	  return rec ? `${subjectOfPrompt(rec.prompt)} --sref ${row.key} --ar 16:9` : null;
   128	};
   129	const strip = (k) => k.replace(/^(photo|webb|ml):/, '');
   130	
   131	/** Pure: tallies → exactly three directions, evidence-tier first, prior-tier fills. */
   132	export function directions(t, images, themesMd = '', themeWords = [], witness = DEFAULT_PROFILE) {
   133	  const out = [];
   134	  // NOT CHANGED, deliberately — flagged for Sean rather than decided here. Kimi K3 (round 3, P2)
   135	  // argues that EVIDENCE_MIN = 2 closest picks was measured against Sean's own 18 judgements, and
   136	  // that labelling a stranger's directions `tier: 'evidence'` off a SINGLE grid overclaims while
   137	  // `progress.done` still says she is 20% started. That is a fair reading. But requiring the backing
   138	  // to span two grids changes what the sales-practice brief shows after one round, which is a product
   139	  // decision about what "evidence" should mean to a second user — not a defect to be patched by a
   140	  // reviewer. `witness` is threaded through so the change is one line if Sean wants it:
   141	  //   && (witness === DEFAULT_PROFILE || new Set(rows.flatMap((r) => r.events)).size >= 2)
   142	  const backed = (rows) => rows.reduce((n, r) => n + r.closest, 0) >= EVIDENCE_MIN;
   143	  const reasons = rank(t.reasons);
   144	  const srefs = rank(t.srefs);
   145	  const subjects = rank(t.subjects);
   146	  const because = reasons.slice(0, 3).map((r) => r.key);
   147	  const evidenceOf = (rows) => [...new Set(rows.flatMap((r) => r.events))];
   148	
   149	  const topSrefs = srefs.filter((s) => s.margin > 0).slice(0, 3);
   150	  if (backed(topSrefs)) {
   151	    out.push({ id: 'dir:midjourney-srefs', tier: 'evidence', title: 'Style codes you keep choosing',
   152	      because, srefs: topSrefs.map((s) => s.key), prompts: topSrefs.map((s) => promptFor(s, images)).filter(Boolean),
   153	      evidenceEventIds: evidenceOf(topSrefs) });
   154	  }
   155	  const photoSubjects = subjects.filter((s) => s.margin > 0 && s.key.startsWith('photo:')).slice(0, 4);
   156	  if (backed(photoSubjects)) {
   157	    out.push({ id: 'dir:photographic-subjects', tier: 'evidence', title: 'Photographic subjects that read as yours',
   158	      because, themeWords: photoSubjects.map((s) => strip(s.key)), evidenceEventIds: evidenceOf(photoSubjects) });
   159	  }
   160	  const webbRows = subjects.filter((s) => s.margin > 0 && s.key.startsWith('webb:'));
   161	  if (backed(webbRows)) {
   162	    out.push({ id: 'dir:cosmic-scale', tier: 'evidence', title: 'Cosmic scale (Webb)', because,
   163	      themeWords: webbRows.map((s) => strip(s.key)), evidenceEventIds: evidenceOf(webbRows) });
   164	  }
   165	  // Prior-tier fill from themes.md "Core visual identity" bullets — labelled so nobody mistakes it.
   166	  const priors = [...themesMd.matchAll(/^- \*\*([^*]+)\*\*/gm)].map((m) => m[1].replace(/\.$/, '').trim());
   167	  for (const p of priors) {
   168	    if (out.length >= 3) break;
   169	    out.push({ id: `dir:prior:${p.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, tier: 'prior', title: p,
   170	      because: [], note: 'from themes.md — not yet backed by your picks', evidenceEventIds: [] });
   171	  }
   172	  // A fresh project has no themes.md: its own theme words stand in as labelled priors until picks arrive.
   173	  for (const w of themeWords) {
   174	    if (out.length >= 3) break;
   175	    out.push({ id: `dir:prior:word:${w.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`, tier: 'prior', title: w,
   176	      because: [], note: "from this project's own theme words — not yet backed by picks", evidenceEventIds: [] });
   177	  }
   178	  return out.slice(0, 3);
   179	}
   180	
   181	/**
   182	 * Read one namespace's events, compile, optionally write its taste-profile.json (machine-owned).
   183	 * sean/default reads taste/events + themes.md exactly as before. Any other namespace reads only
   184	 * its own events, counts only its own witness, and takes its priors from its own theme words —
   185	 * Sean's themes.md never leaks into the partner's or a client's directions.
   186	 */
   187	export function compileProfile({ profile = DEFAULT_PROFILE, project = DEFAULT_PROJECT, write = true } = {}) {
   188	  const images = loadImages();
   189	  const isDefault = isDefaultNamespace(profile, project);
   190	  const pj = readProject(profile, project);
   191	  if (!pj) return { error: 'unknown project', profileId: profile, projectId: project, directions: [] };
   192	  const events = readEventsFor(profile, project);
   193	  const themesPath = path.join(VAULT, 'taste/themes.md');
   194	  const themesMd = isDefault && fs.existsSync(themesPath) ? fs.readFileSync(themesPath, 'utf8') : '';
   195	  const t = tally(events, images, profile, project);
   196	  // Defence in depth for the licence law: anyone but Sean only ever gets shareable pictures back, even
   197	  // if a project file were hand-edited — /brief prints these, and a printed brief leaves the machine.
   198	  // Namespace, not profile — and the tally has already dropped anything the INDEX knows as corpus,
   199	  // so this filter is now a genuine second line rather than the only one. (round-6, Ox Alpha P0/P1)
   200	  if (!isDefaultNamespace(profile, project)) t.picks = t.picks.filter((p) => SHAREABLE_PROVENANCE.has(p.provenance) || p.generated);   // her own renders are hers
   201	  const floor = doneFloorFor(profile);
   202	  const out = {
   203	    generatedAt: new Date().toISOString(), generator: 'prompter/lib/profile.mjs (tally, not a model)',
   204	    profileId: profile, projectId: project, witness: profile, title: pj.title, themeWords: pj.themeWords || [], pool: poolFor(profile, project, []).pool,
   205	    grids: t.grids, judgements: t.counted, ignoredExecution: t.ignoredExecution, brandLaw: t.brandLaw, reversals: t.reversals, renders: t.renders,
   206	    progress: { grids: t.grids, judgements: t.counted, gridsTarget: floor.grids, judgementsTarget: floor.judgements, done: t.grids >= floor.grids && t.counted >= floor.judgements },
   207	    reasons: rank(t.reasons, 0), srefs: rank(t.srefs, 0), subjects: rank(t.subjects, 0), provenance: rank(t.provenance, 0), collections: rank(t.collections, 0),
   208	    picks: t.picks,
   209	    proposedAvoids: rank(t.srefs, 0).filter((s) => s.closest === 0 && s.miss >= 1).map((s) => s.key),
   210	    directions: directions(t, images, themesMd, pj.themeWords || [], profile),
   211	  };
   212	  if (write) fs.writeFileSync(isDefault ? PROFILE_PATH : path.join(projectDir(profile, project), 'taste-profile.json'), JSON.stringify(out, null, 1));
   213	  return out;
   214	}
```

## prompter/lib/generate.mjs
```
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
```
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
   172	  // Anchored with (^|\s), not \s. Requiring whitespace BEFORE the flag meant a prompt that STARTED
   173	  // with it walked straight through — '--sref 123456 calm ocean dawn' was accepted and stored. That
   174	  // is the second time this one guard shipped unable to fire; the first was a literal backspace where
   175	  // \b was meant. (round-4 panel, Ox Alpha P1 — reproduced.)
   176	  if (/(^|\s)--sref\b/i.test(text)) return { ok: false, error: 'a kept prompt may not carry a --sref style code' };
   177	  const p = keptPath(profile, project);
   178	  let md = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : `# Kept prompts — ${profile}/${project}\n\n## Kept\n`;
   179	  if (parseKept(md).includes(text)) return { ok: true, duplicate: true, kept: parseKept(md).length };   // line-exact, not substring
   180	  if (!/^## Kept/m.test(md)) md += '\n## Kept\n';
   181	  // Function replacement, NOT a string one. `text` is human input and a replacement STRING expands
   182	  // `$&`, `$1`, `` $` `` and `$'` — so keeping the prompt "price $& quality light" spliced the
   183	  // matched heading back into the middle of the bullet and mangled the file for every later read.
   184	  // A function replacement receives the text verbatim. (round-3 panel, GLM 5.3 finding 6)
   185	  md = md.replace(/(## Kept\n)/, (m) => `${m}- ${text}\n`);
   186	  fs.writeFileSync(p, md, 'utf8');
   187	  return { ok: true, duplicate: false, kept: parseKept(md).length };
   188	}
   189	
   190	/** The taste object generate() consumes, for one memory. Null when the project does not exist. */
   191	export function tasteFor({ profile, project, corpus }) {
   192	  const compiled = compileProfile({ profile, project, write: false });
   193	  if (compiled.error) return null;
   194	  const loved = evidenceLoved(compiled, corpus);
   195	  if (isDefaultNamespace(profile, project)) {
   196	    const base = loadTaste();
   197	    const known = new Set(base.loved.map((l) => l.code));
   198	    const rejected = new Set(base.rejectedSrefs);
   199	    // A stale rejection beats fresh evidence — by law (rejection is the more decisive act) — but never silently.
   200	    const warnings = [...base.warnings, ...loved.filter((l) => rejected.has(l.code)).map((l) => `code ${l.code} is evidence-tier from your grids but rejected in rejected.md — rejection wins; remove it there if your eye has changed`)];
   201	    const merged = [...base.loved, ...loved.filter((l) => !known.has(l.code) && !rejected.has(l.code))];
   202	    const positiveCount = merged.filter((l) => l.rating >= 3 && !rejected.has(l.code)).length;
   203	    return { ...base, warnings, loved: merged, ratedCount: merged.length, positiveCount, evidenceSrefs: loved.length,
   204	      tasteSource: sourceLabel({ markdown: true, evidence: loved.length }),
   205	      confidence: confidenceOf({ positiveCount, kept: base.kept.length, keywords: base.keywords.length }) };
   206	  }
   207	  const pj = readProject(profile, project);
   208	  const kept = readKept(profile, project);
   209	  // Generated pictures (renders) never feed keywords: the generator's vocabulary must not become the memory's.
   210	  const keywords = keywordsFrom(pj.themeWords, (compiled.picks || []).filter((p) => !p.generated));
   211	  const avoidWords = avoidWordsFrom(compiled, keywords);
   212	  return {
   213	    loved, rejectedSrefs: compiled.proposedAvoids || [], kept, identity: pj.themeWords || [], moodsFit: [], moodsAvoid: [],
   214	    // The pool a non-Sean memory generates from: its own kept prompts, its own picks, its own words —
   215	    // never the Midlibrary corpus (licence + it is simply not what she asked for).
   216	    ownSubjects: ownSubjects(profile, project, compiled, pj),
   217	    keywords, avoidWords, warnings: [], ratedCount: loved.length, positiveCount: loved.length, evidenceSrefs: loved.length,
   218	    tasteSource: sourceLabel({ evidence: loved.length, kept: kept.length, keywords: keywords.length }),
   219	    confidence: confidenceOf({ positiveCount: loved.length, kept: kept.length, keywords: keywords.length }),
   220	  };
   221	}
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
    77	  // The render-intent channel is a WRITER too, and it had no namespace law at all: a partner intent
    78	  // could carry a corpus code either as the `sref` field or inside the prompt text, and listRenders
    79	  // then handed both back to her page, while the judged render's candidate is 'local-comfy' — which
    80	  // validateEvent deliberately exempts, on the reasoning that a render's code is her own intent's.
    81	  // That reasoning only holds if intents cannot carry corpus codes. This is what makes it hold.
    82	  // Her own Make batches mint sref: null, so nothing legitimate is refused.
    83	  // (round-4 panel: Ox Alpha P2, GLM 5.3 P1 and HY3 blocker 1 — three seats, same door.)
    84	  // Namespace, not profile: sean/side-project is not the owner memory. (round-6, Ox Alpha P1)
    85	  if (!(profileId === DEFAULT_PROFILE && projectId === DEFAULT_PROJECT)) {
    86	    if (sref !== undefined && sref !== null) errors.push('a style code may never enter a non-owner memory');
    87	    if (/(^|\s)--sref\b/i.test(text)) errors.push('a render prompt for a non-owner memory may not carry a --sref style code');
    88	  }
    89	  if (errors.length) return { ok: false, errors };
    90	  const token = tokenFor(profileId, projectId, text, seed, sref);
    91	  const existing = readIntents(profileId, projectId);
    92	  const dup = existing.find((i) => i.token === token);
    93	  if (dup) return { ok: true, duplicate: true, token, prefix: `${RENDER_SUBDIR}/${token}`, intent: dup };
    94	  if (existing.length >= MAX_INTENTS) return { ok: false, errors: [`this memory holds ${MAX_INTENTS} render intents — prune: node prompter/fetch-renders.mjs --profile ${profileId} --project ${projectId} --prune`] };
    95	  const intent = { token, prompt: text, seed: seed ?? null, sref: sref ? String(sref) : null, createdAt: new Date().toISOString() };
    96	  const p = intentsPath(profileId, projectId);
    97	  fs.mkdirSync(path.dirname(p), { recursive: true });
    98	  fs.appendFileSync(p, JSON.stringify(intent) + '\n', 'utf8');
    99	  return { ok: true, duplicate: false, token, prefix: `${RENDER_SUBDIR}/${token}`, intent };
   100	}
   101	
   102	/** Scan the render dir and join to THIS memory's intents. Unknown tokens — other memories, stray files — are ignored. */
   103	export function listRenders(profile, project, { base = 'http://127.0.0.1:7331' } = {}) {
   104	  if (!nsOk(profile, project)) return { ok: false, error: 'unknown memory', renders: [] };
   105	  const av = available();
   106	  const dir = renderDir();
   107	  if (!av.ok || !fs.existsSync(dir)) return { ok: true, available: false, reason: av.ok ? `no renders yet — ComfyUI has not written to ${dir}` : av.reason, renders: [] };
   108	  const intents = new Map(readIntents(profile, project).map((i) => [i.token, i]));
   109	  const renders = [];
   110	  for (const name of fs.readdirSync(dir)) {
   111	    const m = FILE.exec(name);
   112	    if (!m) continue;
   113	    const intent = intents.get(m[1]);
   114	    if (!intent) continue;
   115	    let st;
   116	    try { st = fs.lstatSync(path.join(dir, name)); } catch { continue; }
   117	    if (!st.isFile()) continue;   // lstat: a symlink is not a file — nothing outside the render dir is ever listed or served
   118	    const ext = m[3].toLowerCase(), n = Number(m[2]);
   119	    renders.push({
   120	      id: `render:${m[1]}:${n}`, token: m[1], n, kind: KIND[ext], mime: MIME[ext],
   121	      url: `${base}/renders/${profile}/${project}/${m[1]}/${n}`,
   122	      prompt: intent.prompt, seed: intent.seed, sref: intent.sref, createdAt: intent.createdAt, sizeBytes: st.size,
   123	      provenance: 'local-comfy', collection: 'render', generated: true, doc: `render/${m[1]}`,
   124	      title: intent.prompt.split(/\s--/)[0].slice(0, 140), credit: null, pageUrl: null,
   125	    });
   126	  }
   127	  renders.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.n - b.n);
   128	  return { ok: true, available: true, renders, dir };
   129	}
   130	
   131	/** Resolve one render to a file, safely: every segment validated, the path composed here, prefix-checked. */
   132	export function renderFile(profile, project, token, n) {
   133	  if (!nsOk(profile, project) || !TOKEN.test(String(token)) || !/^\d{1,5}$/.test(String(n))) return null;
   134	  if (!readIntents(profile, project).some((i) => i.token === token)) return null;
   135	  const dir = path.resolve(renderDir());
   136	  if (!fs.existsSync(dir)) return null;
   137	  const want = `${token}_${String(Number(n)).padStart(5, '0')}_.`;   // ComfyUI zero-pads its counter to 5
   138	  const name = fs.readdirSync(dir).find((f) => f.toLowerCase().startsWith(want) && FILE.test(f));
   139	  if (!name) return null;
   140	  const full = path.resolve(dir, name);
   141	  if (!full.startsWith(dir + path.sep)) return null;
   142	  const ext = name.split('.').pop().toLowerCase();
   143	  let st;
   144	  try { st = fs.lstatSync(full); } catch { return null; }
   145	  if (!st.isFile()) return null;   // symlinks refused (lstat), same as the listing
   146	  return { path: full, kind: KIND[ext], mime: MIME[ext], sizeBytes: st.size };
   147	}
   148	
   149	/** Magic bytes → mime, or null. The serve route refuses a file that does not sniff as what its name says. */
   150	export function sniff(buf) {
   151	  if (buf.length >= 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return 'image/png';
   152	  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
   153	  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
   154	  if (buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp') return 'video/mp4';
   155	  if (buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';
   156	  return null;
   157	}
   158	
   159	/** Drop intents older than `days` that never produced a file. Rewrites the file; returns counts. */
   160	export function pruneIntents(profile, project, { days = 30 } = {}) {
   161	  if (!nsOk(profile, project)) return { ok: false, error: 'unknown memory' };
   162	  const intents = readIntents(profile, project);
   163	  // An UNREACHABLE drive is not an empty one. listRenders returns `renders: []` with
   164	  // `available: false` when the output directory cannot be read — and that directory is designed for
   165	  // a mapped network drive (Z:), so "temporarily not mounted" is a normal state, not an exception.
   166	  // Pruning against that empty list made every intent older than `days` look as though it never
   167	  // produced a file, and rewrote its token, prompt and seed out of existence while the renders
   168	  // themselves sat safely on the unmounted drive. Refuse rather than destroy.
   169	  // (round-4 panel, Ox Alpha P2)
   170	  const lr = listRenders(profile, project);
   171	  if (lr.available === false) return { ok: false, error: `render directory unreachable (${lr.reason || 'not mounted'}) — refusing to prune, because every intent would look unrendered` };
   172	  const have = new Set(lr.renders.map((r) => r.token));
   173	  const cutoff = Date.now() - days * 86400_000;
   174	  const keep = intents.filter((i) => have.has(i.token) || Date.parse(i.createdAt) >= cutoff);
   175	  if (keep.length !== intents.length) fs.writeFileSync(intentsPath(profile, project), keep.map((i) => JSON.stringify(i)).join('\n') + (keep.length ? '\n' : ''), 'utf8');
   176	  return { ok: true, before: intents.length, after: keep.length, pruned: intents.length - keep.length };
   177	}
```

## prompter/lib/projects.mjs
```
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
```
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

## prompter/serve.mjs
```
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
    26	import { checkWriteRequest, checkHost } from './lib/origin.mjs';
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
    97	  // EVERY request, read or write. Loopback binding plus no CORS stops an ordinary cross-origin page
    98	  // from reading a response — but DNS rebinding (attacker.example re-resolving to 127.0.0.1) makes the
    99	  // attacker's page same-origin in the browser's eyes, so CORS never applies and the read succeeds,
   100	  // handing them the licensed corpus. The Host header still names the attacker's hostname, which the
   101	  // write gate already refuses; it simply was never applied to reads. Every HTTP client sends Host, so
   102	  // curl, the CLI and ComfyUI's Python node are unaffected. (round-5 panel, Ox Alpha P1)
   103	  const hostGate = checkHost(req.headers, PORT);
   104	  if (!hostGate.ok) {
   105	    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
   106	    return res.end(hostGate.reason);
   107	  }
   108	
   109	  try {
   110	    // The PAGE is one shell with four tabs (Make · Judge · Directions · Kept), served by
   111	    // lib/routes-modes.mjs at `/` and at every legacy path (/probe → Judge, /brief → Directions), so old
   112	    // bookmarks land on the right tab and there is exactly ONE implementation of each surface.
   113	    // Pictures are CDN URLs the BROWSER loads; this process never fetches image bytes.
   114	
   115	    // /api/probe, /api/profile, /api/projects, /probe.js, the shell and its modules live in routes-modes:
   116	    // the same probe, addressed to one memory (profile × project). Sean's default is unchanged.
   117	
   118	    if (url.pathname === '/api/stats' && req.method === 'GET') {
   119	      const taste = loadTaste();
   120	      return json(res, 200, {
   121	        srefCodes: corpus.srefCount,
   122	        prompts: corpus.prompts.length,
   123	        artists: corpus.artists.length,
   124	        rated: taste.ratedCount,
   125	        endorsed: taste.positiveCount,
   126	        kept: taste.kept.length,
   127	        rejected: taste.rejectedSrefs.length,
   128	        confidence: taste.confidence,
   129	        warnings: taste.warnings,
   130	      });
   131	    }
   132	
   133	    if (url.pathname === '/api/prompt' && req.method === 'GET') {
   134	      // One memory's taste (lib/taste-namespace.mjs): Sean's markdown + his evidence codes, or a
   135	      // partner/client project's words, picks and kept prompts. ?profile=&project= — defaults to Sean.
   136	      const ns = namespaceFrom(url);
   137	      if (ns.error) return json(res, 400, { error: ns.error });
   138	      const taste = tasteFor({ ...ns, corpus });
   139	      if (!taste) return json(res, 404, { error: 'unknown project' });
   140	      const n = Math.min(50, Math.max(1, Number(url.searchParams.get('n') ?? 5) || 5));
   141	      const mode = url.searchParams.get('mode') === 'surprise' ? 'surprise' : 'taste';
   142	      const ar = /^\d{1,2}:\d{1,2}$/.test(url.searchParams.get('ar') ?? '') ? url.searchParams.get('ar') : '16:9';
   143	      const seedRaw = url.searchParams.get('seed');
   144	      // Bounded like the intent seed (renders.mjs): rngFrom() folds to 32 bits, so ?seed=4294967297
   145	      // and ?seed=1 drew the SAME batch while the response reported different seeds — two "different"
   146	      // recorded seeds naming one draw is the same lie the intent ceiling exists to stop.
   147	      // (round-3 panel, Kimi K3 P2)
   148	      const seed = seedRaw && /^\d+$/.test(seedRaw) && Number(seedRaw) <= 0xFFFFFFFF ? Number(seedRaw) : undefined;
   149	
   150	      let pool = corpus;
   151	      if (url.searchParams.get('cinematic') === '1') {
   152	        const sref = corpus.sref.filter((c) =>
   153	          /cinematic|film|movie|noir/i.test(`${c.source_title} ${c.style_name} ${c.example_prompt}`));
   154	        if (sref.length) pool = { ...corpus, sref };
   155	      }
   156	
   157	      const tasteMeta = { source: taste.tasteSource, evidenceSrefs: taste.evidenceSrefs, keywords: taste.keywords.length, kept: taste.kept.length, confidence: taste.confidence };
   158	      // medium=video → motion prompts from the SAME taste (lib/video.mjs). No Midjourney params: a video
   159	      // graph takes natural language, and aspect/length live in the ComfyUI graph, not in the sentence.
   160	      if (url.searchParams.get('medium') === 'video') {
   161	        let v;
   162	        try { v = generateVideo(pool, taste, { count: n, mode, seed }); } catch (err) {
   163	          return json(res, 200, { seed: null, mode, medium: 'video', profileId: ns.profile, projectId: ns.project, taste: tasteMeta, confidence: taste.confidence, exhausted: true, poolSize: 0, vetoed: 0, prompts: [], hint: String(err.message).split('\n')[0] });
   164	        }
   165	        return json(res, 200, {
   166	          seed: v.seed, mode, medium: 'video', profileId: ns.profile, projectId: ns.project, taste: tasteMeta,
   167	          confidence: taste.confidence, exhausted: v.exhausted, poolSize: v.poolSize, vetoed: v.drops?.vetoed ?? 0,
   168	          prompts: v.prompts.map((p) => ({ prompt: p.prompt, subject: p.subject, grammar: p.grammar, kind: 'video', camera: p.camera, motion: p.motion, sref: null, styleName: null, rating: null, isNew: false })),
   169	        });
   170	      }
   171	      let out;
   172	      try { out = generate(pool, taste, { count: n, mode, ar, seed }); } catch (err) {
   173	        // A fresh memory whose words reach nothing in the corpus is an honest empty, not a 500.
   174	        return json(res, 200, { seed: null, mode, profileId: ns.profile, projectId: ns.project, taste: tasteMeta, confidence: taste.confidence, exhausted: true, poolSize: 0, vetoed: 0, prompts: [], hint: String(err.message).split('\n')[0] });
   175	      }
   176	      return json(res, 200, {
   177	        seed: out.seed,
   178	        mode,
   179	        profileId: ns.profile, projectId: ns.project, taste: tasteMeta,
   180	        confidence: taste.confidence,
   181	        exhausted: out.exhausted,
   182	        poolSize: out.poolSize,
   183	        vetoed: out.drops?.vetoed ?? 0,
   184	        prompts: out.prompts.map((p) => ({
   185	          prompt: p.prompt,
   186	          subject: p.subject,
   187	          grammar: p.grammar,
   188	          sref: p.sref?.code ?? null,
   189	          styleName: p.sref?.style_name ?? null,
   190	          rating: p.sref?.rating ?? null,
   191	          isNew: Boolean(p.sref?.isNew),
   192	        })),
   193	      });
   194	    }
   195	
   196	    // Writes: refuse drive-by browser requests before reading a byte of body (lib/origin.mjs).
   197	    if (req.method === 'POST') {
   198	      const gate = checkWriteRequest(req.headers, PORT);
   199	      if (!gate.ok) return json(res, 403, { error: gate.reason });
   200	    }
   201	
   202	    // Namespace-aware routes (reads + the project write, which sits behind the gate above).
   203	    const base = `http://${HOST}:${PORT}`;
   204	    if (await handleModeRoutes({ url, req, res, json, readBody, here: HERE, base })) return;
   205	    // The render loop: POST /api/intent (gated above), GET /api/renders, GET /renders/<p>/<j>/<token>/<n>.
   206	    if (await handleRenderRoutes({ url, req, res, json, readBody, base })) return;
   207	    // "Make": queue renders in Sean's own ComfyUI graph (POST is gated above).
   208	    if (await handleMakeRoutes({ url, req, res, json, readBody })) return;
   209	
   210	    if (url.pathname === '/api/keep' && req.method === 'POST') {
   211	      const body = await readBody(req);
   212	      if (typeof body.prompt !== 'string' || body.prompt.split(/\s+/).length < 3) {
   213	        return json(res, 400, { error: 'prompt must be a string of at least 3 words' });
   214	      }
   215	      // The same 2000-char discipline keepFor() applies to every project memory. Sean's own branch
   216	      // below goes straight to the CLI and checked WORD COUNT only, so a 60 KB single "prompt"
   217	      // (under the 64 KB body cap) landed as one bullet in taste/kept.md and steered his generator
   218	      // from then on. Two keep channels must not have two validation contracts.
   219	      // (round-3 panel, GLM 5.3 finding 4)
   220	      if (body.prompt.length > 2000) return json(res, 400, { error: 'prompt must be ≤ 2000 chars' });
   221	      const profile = body.profileId ?? DEFAULT_PROFILE, project = body.projectId ?? DEFAULT_PROJECT;
   222	      // Route-level slug validation (defence in depth; readProject/eventsDirFor already refuse bad ids).
   223	      if (!PROFILES.includes(profile) || !isProjectId(project)) return json(res, 400, { error: 'profileId/projectId must name a memory (slugs only)' });
   224	      if (!(profile === DEFAULT_PROFILE && project === DEFAULT_PROJECT)) {
   225	        // A partner/client memory keeps into its own kept.md — never into Sean's.
   226	        const r = keepFor(profile, project, body.prompt);
   227	        return json(res, r.ok ? 200 : 400, r.ok ? { ok: true, duplicate: r.duplicate, message: r.duplicate ? 'Already kept.' : `Kept. ${r.kept} exemplar${r.kept === 1 ? '' : 's'} now steering ${profile}/${project}.` } : { error: r.error });
   228	      }
   229	      // Normalised here as well as in the CLI: two writers, one contract. keepFor() has always done
   230	      // this for a project memory; Sean's own branch passed the body straight through.
   231	      return json(res, 200, { ok: true, message: cli(['--keep', body.prompt.replace(/\s+/g, ' ').trim()]) });
   232	    }
   233	
   234	    if (url.pathname === '/api/unkeep' && req.method === 'POST') {
   235	      const body = await readBody(req);
   236	      const profile = body.profileId ?? DEFAULT_PROFILE, project = body.projectId ?? DEFAULT_PROJECT;
   237	      if (!PROFILES.includes(profile) || !isProjectId(project)) return json(res, 400, { error: 'profileId/projectId must name a memory (slugs only)' });
   238	      const r = unkeepFor(profile, project, body.prompt);
   239	      return json(res, r.ok ? 200 : 400, r);
   240	    }
   241	
   242	    if (url.pathname === '/api/rate' && req.method === 'POST') {
   243	      const body = await readBody(req);
   244	      if (body.profileId && !(body.profileId === DEFAULT_PROFILE && (body.projectId ?? DEFAULT_PROJECT) === DEFAULT_PROJECT)) {
   245	        return json(res, 400, { error: "star ratings are Sean's markdown channel — a project's taste comes from the pictures it judges" });
   246	      }
   247	      const code = String(body.code ?? '');
   248	      const rating = Number(body.rating);
   249	      if (!/^\d{5,12}$/.test(code)) return json(res, 400, { error: 'code must be 5-12 digits' });
   250	      if (!(rating >= 1 && rating <= 5)) return json(res, 400, { error: 'rating must be 1-5' });
   251	      // Leading dashes are stripped because swan-prompt.mjs builds the note with
   252	      // `argv.slice(i + 3).filter((a) => !a.startsWith('--'))` — so any word starting with `--` is
   253	      // silently DROPPED from the recorded note. Sean writes "--sneaky note text" and the file keeps
   254	      // "note text", with nothing to say a word went missing. Not an injection (cli() uses
   255	      // execFileSync with an argv array, no shell — Qwen's arbitrary-command-execution finding is
   256	      // refuted on that point), just a note that quietly loses words.
   257	      // (round-4 panel, Ox Alpha SPECULATIVE — confirmed against the CLI's own argv handling.)
   258	      const note = typeof body.note === 'string' ? body.note.replace(/(^|\s)-+/g, '$1').slice(0, 200) : '';
   259	      return json(res, 200, { ok: true, message: cli(['--rate', code, String(rating), note]) });
   260	    }
   261	
   262	    // THE single writer of taste/events/*.jsonl. grill-me and every agent POST here; nobody
   263	    // opens the file. Validation + provenance refusal + idempotency live in lib/events.mjs.
   264	    if (url.pathname === '/api/event' && req.method === 'POST') {
   265	      const body = await readBody(req);
   266	      const r = appendEvent(body);
   267	      return json(res, r.ok ? 200 : 400, r);
   268	    }
   269	
   270	    return json(res, 404, { error: 'not found', routes: ['/', '/probe', '/brief', '/api/prompt', '/api/probe', '/api/profile', '/api/projects', '/api/judged', '/api/stats', '/api/keep', '/api/rate', '/api/event', '/api/intent', '/api/renders', '/api/make', '/api/make/status', '/renders/<profile>/<project>/<token>/<n>'] });
   271	  } catch (err) {
   272	    return json(res, 500, { error: String(err.message).slice(0, 200) });
   273	  }
   274	});
   275	
   276	server.listen(PORT, HOST, () => {
   277	  const t = loadTaste();
   278	  console.log(`\nswan-prompt  →  http://${HOST}:${PORT}`);
   279	  console.log(`  corpus : ${corpus.srefCount} sref codes · ${corpus.prompts.length} prompts · ${corpus.artists.length} artists`);
   280	  console.log(`  taste  : ${t.kept.length} kept · ${t.ratedCount} rated (${t.positiveCount} endorsed) · confidence ${t.confidence}`);
   281	  if (t.warnings.length) t.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
   282	  console.log(`\n  page     http://${HOST}:${PORT}/`);
   283	  console.log(`  probe    http://${HOST}:${PORT}/probe      ← Taste Discovery: 12 pictures, pick closest/miss (mode bar: Sean · Partner · Client)`);
   284	  console.log(`  brief    http://${HOST}:${PORT}/brief      ← the readout for one memory (?profile=&project=)`);
   285	  console.log(`  api      curl '${`http://${HOST}:${PORT}/api/prompt?n=3&mode=surprise`}'`);
   286	  console.log(`  vault    ${VAULT}\n`);
   287	});
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
    10	 * READS are gated too, by Host only. Binding to loopback plus removing CORS stops an ordinary
    11	 * cross-origin page from reading a response — but DNS rebinding (attacker.example re-resolving to
    12	 * 127.0.0.1) makes the attacker's page SAME-origin in the browser's eyes, so CORS never applies and
    13	 * the read succeeds. The Host header still names the attacker's hostname, which is exactly what the
    14	 * write gate already refuses; it simply was not applied to reads. Every HTTP client sends Host, so
    15	 * curl, the CLI and ComfyUI's Python node are unaffected. (round-5 panel, Ox Alpha P1)
    16	 *
    17	 * Rule: a write is trusted when
    18	 *   - the Host header names this server (defeats DNS rebinding: attacker.example → 127.0.0.1), AND
    19	 *   - there is NO Origin header (curl, the CLI, ComfyUI's Python nodes — non-browser callers),
    20	 *     OR the Origin is this server's own page.
    21	 * Everything else is refused. Reads stay open; they write nothing.
    22	 */
    23	export function trustedOrigins(port) {
    24	  return new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
    25	}
    26	
    27	export function trustedHosts(port) {
    28	  return new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    29	}
    30	
    31	/**
    32	 * @param {{ origin?: string, host?: string }} headers  raw request headers (lower-case keys)
    33	 * @param {number} port
    34	 * @returns {{ ok: true } | { ok: false, reason: string }}
    35	 */
    36	/** Host-only check, for reads. Defeats DNS rebinding without touching non-browser callers. */
    37	export function checkHost(headers, port) {
    38	  const host = String(headers.host ?? '').trim().toLowerCase();
    39	  return trustedHosts(port).has(host) ? { ok: true } : { ok: false, reason: 'host header does not name this server' };
    40	}
    41	
    42	export function checkWriteRequest(headers, port) {
    43	  const host = String(headers.host ?? '').trim().toLowerCase();
    44	  if (!trustedHosts(port).has(host)) return { ok: false, reason: 'host header does not name this server' };
    45	  const origin = headers.origin;
    46	  if (origin === undefined || origin === null || origin === '') return { ok: true };
    47	  if (trustedOrigins(port).has(String(origin).trim().toLowerCase())) return { ok: true };
    48	  return { ok: false, reason: 'cross-origin writes are refused' };
    49	}
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
    27	import { readEventsFor, judgedIds, PROFILES, isProjectId, CORPUS_MARKER } from './lib/events.mjs';
    28	import { readProject, createProject, SHAREABLE_MIX, SHAREABLE_COLLECTIONS } from './lib/projects.mjs';
    29	
    30	const HERE = path.dirname(fileURLToPath(import.meta.url));
    31	export const OUT_DIR = path.join(VAULT, 'prompter', 'out', 'bundles');
    32	// One definition, in lib/events.mjs, shared with the event writer. It lived only here, which is why
    33	// the event writer had no equivalent check for four rounds. (round-6 panel, GLM 5.3 P1)
    34	const MIDLIBRARY_RE = CORPUS_MARKER;
    35	
    36	/** N grids for a namespace from the SHAREABLE pool only, never repeating a picture. */
    37	export function planGrids({ profile, project, grids = 8, n = 12, seed, images = loadImages() }) {
    38	  const shareable = images.filter((r) => SHAREABLE_COLLECTIONS.has(r.collection));
    39	  const exclude = new Set(judgedIds(readEventsFor(profile, project)));
    40	  const base = Number.isFinite(seed) ? seed : Math.floor(Math.random() * 2 ** 31);
    41	  const out = [];
    42	  for (let i = 0; i < grids; i++) {
    43	    const g = selectProbe({ images: shareable, n, seed: base + i, excludeIds: [...exclude], mix: SHAREABLE_MIX });
    44	    for (const c of g.candidates) exclude.add(c.id);
    45	    out.push({ seed: g.seed, candidates: g.candidates.map((c) => ({
    46	      id: c.id, url: c.url, sref: null, doc: c.doc, collection: c.collection, title: c.title,
    47	      provenance: c.provenance, credit: c.credit ?? null, pageUrl: c.pageUrl ?? null, gridPosition: c.gridPosition,
    48	    })) });
    49	  }
    50	  return { baseSeed: base, grids: out };
    51	}
    52	
    53	/** Build the bundle for an existing project. Returns { html, payload }. Throws rather than leak. */
    54	export function buildBundle({ profile, project, grids = 8, n = 12, seed, images } = {}) {
    55	  if (!PROFILES.includes(profile) || !isProjectId(project)) throw new Error('bad namespace: --profile sean|partner|client, --project <slug>');
    56	  const pj = readProject(profile, project);
    57	  if (!pj) throw new Error(`unknown project ${profile}/${project} — create it on the probe page (New project) or pass --title here`);
    58	  const plan = planGrids({ profile, project, grids, n, seed, images });
    59	  const payload = {
    60	    bundleId: randomBytes(6).toString('hex'), profileId: profile, projectId: project, title: pj.title,
    61	    themeWords: pj.themeWords || [], pool: 'shareable', createdAt: new Date().toISOString(), baseSeed: plan.baseSeed, grids: plan.grids,
    62	  };
    63	  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
    64	  if (MIDLIBRARY_RE.test(json)) throw new Error('refused: the bundle payload would carry Midlibrary — that never leaves the machine');
    65	  const tpl = fs.readFileSync(path.join(HERE, 'bundle.html'), 'utf8');
    66	  const css = fs.readFileSync(path.join(HERE, 'probe.css'), 'utf8');
    67	  const js = fs.readFileSync(path.join(HERE, 'probe.js'), 'utf8');
    68	  const html = tpl.replace('/*__PROBE_CSS__*/', () => css).replace('/*__PROBE_JS__*/', () => js).replace('__BUNDLE_JSON__', () => json);
    69	  return { html, payload };
    70	}
    71	
    72	const arg = (name, dflt) => { const i = process.argv.indexOf(`--${name}`); return i > -1 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : dflt; };
    73	
    74	if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
    75	  const profile = arg('profile'), project = arg('project');
    76	  const grids = Number(arg('grids', 8)), n = Number(arg('n', 12));
    77	  const seedRaw = arg('seed'); const seed = seedRaw !== undefined && /^\d+$/.test(seedRaw) ? Number(seedRaw) : undefined;
    78	  if (!profile || !project) { console.error('usage: node prompter/export-bundle.mjs --profile partner|client --project <slug> [--grids 8] [--title "…" --words "a, b"]'); process.exit(2); }
    79	  if (!readProject(profile, project) && arg('title')) {
    80	    const r = createProject({ profileId: profile, projectId: project, title: arg('title'), themeWords: arg('words', '') });
    81	    if (!r.ok) { console.error(`project not created: ${r.errors.join('; ')}`); process.exit(1); }
    82	    console.log(`created ${profile}/${project} — "${r.project.title}" · words: ${r.project.themeWords.join(', ') || '(none)'} · memory starts empty`);
    83	  }
    84	  let built;
    85	  try { built = buildBundle({ profile, project, grids, n, seed }); } catch (err) { console.error(String(err.message)); process.exit(1); }
    86	  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13);
    87	  const out = arg('out', path.join(OUT_DIR, `${profile}-${project}-${stamp}.html`));
    88	  fs.mkdirSync(path.dirname(out), { recursive: true });
    89	  fs.writeFileSync(out, built.html, 'utf8');
    90	  const pics = built.payload.grids.reduce((a, g) => a + g.candidates.length, 0);
    91	  console.log(`\nwrote ${out}\n  ${built.payload.grids.length} grids · ${pics} pictures · shareable pool only · bundle ${built.payload.bundleId}\n`);
    92	  console.log('  send that ONE file. They open it in any browser (needs internet for the pictures), judge, press');
    93	  console.log('  "Download results", and send back swan-taste-results-*.json. Then, with the server running:');
    94	  console.log(`  node prompter/import-bundle.mjs <that file>      → ${profile}/${project} · brief at /brief?profile=${profile}&project=${project}\n`);
    95	}
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
    21	  // A bundle is something someone else filled in and sent back, so it may never be aimed at the
    22	  // owner's own memory. Nothing stopped a results file declaring profileId 'sean' and recording
    23	  // channel:'bundle' events straight into taste/events — the one memory whose evidence is load-bearing
    24	  // for everything else. The threat is social (he runs an import on a file he was sent), which is
    25	  // why it is cheap to close and worth closing. (round-5 panel, Ox Alpha P2)
    26	  if (results.profileId === 'sean') errors.push("a results bundle may never be imported into the owner's own memory — bundles come from someone else");
    27	  if (!isProjectId(results.projectId)) errors.push('projectId must be a slug');
    28	  if (!Array.isArray(results.events) || !results.events.length) errors.push('events must be a non-empty array');
    29	  (results.events || []).forEach((e, i) => {
    30	    const at = `event ${i + 1}`;
    31	    if (e?.channel !== 'bundle') errors.push(`${at}: channel must be 'bundle'`);
    32	    if (e?.profileId !== results.profileId || e?.projectId !== results.projectId) errors.push(`${at}: namespace does not match the results file`);
    33	    if (e?.source !== results.profileId) errors.push(`${at}: source '${e?.source}' is not the bundle's witness '${results.profileId}'`);
    34	    const v = validateEvent(e);
    35	    if (!v.ok) errors.push(`${at}: ${v.errors.join('; ')}`);
    36	  });
    37	  return { ok: errors.length === 0, errors, events: results.events || [] };
    38	}
    39	
    40	/**
    41	 * Hand every event to the writer — all or nothing by default (panel round 2: a half-applied bundle is worse
    42	 * than a refused one). `judged` = ids the memory has already judged; any overlap refuses the WHOLE file
    43	 * before a line is written, unless `partial` is set. `post(event)` → { ok, eventId?, duplicate?, errors? }.
    44	 */
    45	export async function importResults(results, { post, judged = [], known = [], partial = false }) {
    46	  const c = checkResults(results);
    47	  if (!c.ok) return { ok: false, errors: c.errors, accepted: 0, duplicates: 0, refused: 0 };
    48	  const seen = new Set(judged), knownIds = new Set(known);
    49	  // An event the memory already holds (same eventId) is a duplicate, not a conflict — re-importing the same file is safe.
    50	  const overlaps = c.events.map((e, i) => ({ i, n: knownIds.has(eventIdFor(e)) ? 0 : (e.candidates || []).filter((k) => seen.has(k.id)).length })).filter((o) => o.n);
    51	  if (overlaps.length && !partial) {
    52	    return { ok: false, accepted: 0, duplicates: 0, refused: c.events.length,
    53	      errors: [`refused whole file: ${overlaps.map((o) => `grid ${o.i + 1} (${o.n} picture${o.n === 1 ? '' : 's'})`).join(', ')} already judged in this memory since the bundle was made — undo those on the page, or re-run with --partial to import the rest`] };
    54	  }
    55	  let accepted = 0, duplicates = 0, refused = 0;
    56	  const refusals = [];
    57	  for (const e of c.events) {
    58	    const r = await post(e);
    59	    if (r?.ok && r.duplicate) duplicates++;
    60	    else if (r?.ok) accepted++;
    61	    else { refused++; refusals.push((r?.errors || [r?.error || 'unknown']).join('; ')); }
    62	  }
    63	  return { ok: refused === 0, accepted, duplicates, refused, errors: refusals };
    64	}
    65	
    66	if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
    67	  const file = process.argv[2];
    68	  const si = process.argv.indexOf('--server');
    69	  const server = si > -1 ? process.argv[si + 1] : 'http://127.0.0.1:7331';
    70	  if (!file || !fs.existsSync(file)) { console.error('usage: node prompter/import-bundle.mjs <swan-taste-results-*.json>'); process.exit(2); }
    71	  let results;
    72	  try { results = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { console.error('not a JSON file'); process.exit(1); }
    73	  const pre = checkResults(results);
    74	  if (!pre.ok) { console.error(`refused before sending anything:\n  ${pre.errors.join('\n  ')}`); process.exit(1); }
    75	  const post = async (e) => {
    76	    const r = await fetch(`${server}/api/event`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(e) });
    77	    return r.json();
    78	  };
    79	  let out;
    80	  try {
    81	    const j = await (await fetch(`${server}/api/judged?profile=${results.profileId}&project=${results.projectId}`)).json();
    82	    if (!Array.isArray(j.ids)) { console.error(`cannot read the memory: ${j.error || 'no ids'}`); process.exit(1); }
    83	    out = await importResults(results, { post, judged: j.ids, known: j.eventIds || [], partial: process.argv.includes('--partial') });
    84	  } catch (err) {
    85	    console.error(`could not reach ${server} — start the taste brain first (Swan Prompt Studio.cmd or node prompter/serve.mjs): ${err.message}`);
    86	    process.exit(1);
    87	  }
    88	  console.log(`\n${results.profileId}/${results.projectId} ← bundle ${results.bundleId}: ${out.accepted} grid(s) recorded · ${out.duplicates} already there · ${out.refused} refused`);
    89	  if (out.errors.length) console.log('  ' + out.errors.join('\n  '));
    90	  console.log(`  brief: ${server}/brief?profile=${results.profileId}&project=${results.projectId}\n`);
    91	  process.exit(out.ok ? 0 : 1);
    92	}
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
    51	  // A pipe or a newline in the note forges further TABLE ROWS — "ok |\n| \`99999\` | x | 5 | injected"
    52	  // plants a fabricated 5/5 rating for a code nobody rated, and rated codes steer generation. The
    53	  // function replacement below stops $-expansion; this stops the cell escaping its own row.
    54	  // (round-5 panel, Ox Alpha P2)
    55	  const cell = (v) => String(v ?? '').replace(/[|\r\n]+/g, ' ').trim();
    56	  const row = `| \`${code}\` | ${cell(name)} | ${r} | ${cell(note || '')} |`;
    57	  // insert after the ratings table header rule, before the placeholder empty row if present
    58	  // Function replacement here too. This is the PRIMARY insert; the fallback below was fixed first
    59	  // and this one was missed by reading. The structural check in test-round3 — "no markdown writer
    60	  // interpolates user text into a replacement STRING" — is what found it, which is the argument for
    61	  // asserting the SHAPE of a bug class rather than the one line you happened to notice.
    62	  md = md.replace(/(\| ---\|---\|--:\|---\|\n|\|---\|---\|--:\|---\|\n)/, (m) => `${m}${row}\n`);
    63	  if (!md.includes(row)) {
    64	    // Function replacement. `row` carries a human-written note, and a replacement STRING expands
    65	    // $&, $1, $` and $' — a note containing "$&" spliced the matched heading into the table row
    66	    // ("| 1234567 | 5 | ## How to rate"). Same defect the project keep path was fixed for in round 3;
    67	    // this is the writer that fix did not reach. (round-5 panel, Qwen 3.8)
    68	    md = md.replace(/(## How to rate[\s\S]*?\n)(\n## )/, (m, a, b) => `${a}${row}\n${b}`);
    69	  }
    70	  if (!md.includes(row)) md += `\n${row}\n`;
    71	  md = md.replace(/^\|\s*\|\s*\|\s*\|\s*\|$/m, '').replace(/\n{3,}/g, '\n\n');
    72	  fs.writeFileSync(LOVED, md);
    73	  console.log(`Rated --sref ${code} (${name}) = ${r}/5`);
    74	  const t = loadTaste();
    75	  console.log(`Taste confidence now: ${t.confidence} (${t.ratedCount} rated)`);
    76	}
    77	
    78	function appendRejection(code, why) {
    79	  if (!/^\d{5,12}$/.test(code)) { console.error(`Not a valid SREF code: ${code}`); process.exit(1); }
    80	  let md = fs.readFileSync(LOVED, 'utf8');
    81	  const row = `| \`${code}\` | ${why || 'not my eye'} |`;
    82	  // Same reason as appendRating above: `row` carries a human-written reason.
    83	  md = md.replace(/(## Rejected[\s\S]*?\|---\|---\|\n)/, (m) => `${m}${row}\n`);
    84	  md = md.replace(/^\|\s*\|\s*\|$/m, '').replace(/\n{3,}/g, '\n\n');
    85	  fs.writeFileSync(LOVED, md);
    86	  console.log(`Rejected --sref ${code} — the generator will now avoid it.`);
    87	}
    88	
    89	/** Keep a prompt — the strongest signal available, because it is entirely Sean's. */
    90	function appendKept(text) {
    91	  // Collapse whitespace FIRST. kept.md is a bullet list, so a newline inside the text becomes another
    92	  // bullet — one keep could inject any number of fake exemplars, and a kept prompt is the strongest
    93	  // signal the generator has. The server's project-memory path already normalised; this one did not,
    94	  // and it writes Sean's own file. (round-5 panel, Qwen 3.8)
    95	  text = String(text ?? '').replace(/\s+/g, ' ').trim();
    96	  if (!text || text.split(/\s+/).length < 3) {
    97	    console.error('Give the prompt to keep, e.g.  --keep "glacier calving into black water --ar 16:9 --v 7"');
    98	    process.exit(1);
    99	  }
   100	  const f = path.join(VAULT, 'taste/kept.md');
   101	  let md = fs.readFileSync(f, 'utf8');
   102	  if (md.includes(text.trim())) { console.log('Already kept.'); return; }
   103	  const before = md;
   104	  md = md.replace(/^- \(nothing kept yet[^\n]*\)$/m, '').replace(/(## Kept\n)/, (m) => `${m}\n- ${text.trim()}\n`);
   105	  // A single insertion strategy with no fallback. appendRating has cascading ones precisely because
   106	  // header drift is real — and if the "## Kept" heading ever drifts (a stray \r, a renamed section),
   107	  // this wrote back an UNCHANGED file while still printing "Kept."; the compounding channel, which
   108	  // weights a kept prompt at 12x, would silently drop every input. Say so instead.
   109	  // (round-5 panel, Ox Alpha P2)
   110	  if (md === before) {
   111	    console.error('Could not find the "## Kept" heading in taste/kept.md — nothing was written. Fix the heading, then keep again.');
   112	    process.exit(1);
   113	  }
   114	  fs.writeFileSync(f, md.replace(/\n{3,}/g, '\n\n'));
   115	  const t = loadTaste();
   116	  console.log(`Kept. ${t.kept.length} exemplar${t.kept.length === 1 ? '' : 's'} now steering generation.`);
   117	}
   118	
   119	if (has('--keep')) {
   120	  const i = argv.indexOf('--keep');
   121	  appendKept(argv.slice(i + 1).filter((a) => !a.startsWith('--')).join(' '));
   122	  process.exit(0);
   123	}
   124	if (has('--rate')) {
   125	  const i = argv.indexOf('--rate');
   126	  appendRating(argv[i + 1], argv[i + 2], argv.slice(i + 3).filter((a) => !a.startsWith('--')).join(' '));
   127	  process.exit(0);
   128	}
   129	if (has('--reject')) {
   130	  const i = argv.indexOf('--reject');
   131	  appendRejection(argv[i + 1], argv.slice(i + 2).filter((a) => !a.startsWith('--')).join(' '));
   132	  process.exit(0);
   133	}
   134	
   135	/* ---------------- load ---------------- */
   136	let corpus, taste;
   137	try { corpus = loadCorpus(); taste = loadTaste(); }
   138	catch (e) { console.error(`\n${e.message}\n`); process.exit(1); }
   139	
   140	if (has('--stats')) {
   141	  // How much of the corpus Sean's themes actually reach — the real ceiling on variety.
   142	  const { subjectOf } = await import('./lib/corpus.mjs');
   143	  const { tasteScore } = await import('./lib/taste.mjs');
   144	  const onTaste = [...new Set(corpus.prompts.map((p) => subjectOf(p.prompt)))]
   145	    .filter((s) => tasteScore(s, taste) > 0).length;
   146	
   147	  console.log(`
   148	Swan Taste Brain — corpus status
   149	
   150	  KNOWLEDGE (sources/, replaceable)
   151	    SREF codes          ${corpus.srefCount}
   152	    usable prompts      ${corpus.prompts.length} of ${corpus.promptCount}
   153	    catalog entries     ${corpus.catalogCount}   (Midlibrary library: styles, artists, techniques)
   154	    article headings    ${corpus.vocab.length}   (H2 titles from guides — NOT a styles count)
   155	    named artists       ${corpus.artists.length}
   156	    parameters          ${corpus.params.length}
   157	
   158	  TASTE (taste/, irreplaceable)
   159	    rated SREF codes    ${taste.ratedCount}
   160	    kept prompts        ${taste.kept.length}   (the compounding channel — weight 12 in every batch)
   161	    rejected codes      ${taste.rejectedSrefs.length}
   162	    theme keywords      ${taste.keywords.length}
   163	    avoid keywords      ${taste.avoidWords.length}
   164	    confidence          ${taste.confidence}
   165	
   166	  REACH (how much of the corpus your themes actually touch)
   167	    on-taste subjects   ${onTaste} distinct
   168	    exploration rate    ${Math.round(Math.max(0.25, 1 - taste.ratedCount / 20) * 100)}%
   169	`);
   170	  if (onTaste < 250) {
   171	    console.log(`  Only ${onTaste} distinct subjects match your themes, so subjects will start repeating.
   172	  Variety comes from recombination (subject × ${corpus.artists.length} artists × ${corpus.srefCount} codes),
   173	  but to widen the subject pool itself, add themes to taste/themes.md.\n`);
   174	  }
   175	  if (taste.confidence === 'themes-only') {
   176	    console.log(`  Output is steered by THEMES ONLY — no SREF ratings supplied yet.
   177	  Rate ~15 codes to move this to "strong":  node swan-prompt.mjs --rate <code> <1-5> "why"\n`);
   178	  }
   179	  process.exit(0);
   180	}
   181	
   182	/* ---------------- generate ---------------- */
   183	const opts = {
   184	  count: parseInt(val('-n', val('--count', '5')), 10),
   185	  mode: has('--surprise', '--random') ? 'surprise' : 'taste',
   186	  ar: val('--ar', '16:9'),
   187	  seed: has('--seed') ? parseInt(val('--seed'), 10) : undefined,
   188	};
   189	if (!(opts.count > 0 && opts.count <= 100)) { console.error('--count must be 1-100'); process.exit(1); }
   190	
   191	if (has('--cinematic')) {
   192	  corpus.sref = corpus.sref.filter((c) => /cinematic|film|movie|noir/i.test(`${c.source_title} ${c.style_name} ${c.example_prompt}`));
   193	  if (!corpus.sref.length) { console.error('No cinematic SREF codes matched.'); process.exit(1); }
   194	}
   195	
   196	// Config problems must be loud. A keyword in both taste files, an unparseable rating, or a code
   197	// that is both rated and rejected all fail silently otherwise — and silent failure in a taste file
   198	// is indistinguishable from "the generator just isn't very good".
   199	if (taste.warnings.length) {
   200	  console.log(`\n⚠ ${taste.warnings.length} taste-file problem${taste.warnings.length === 1 ? '' : 's'}:`);
   201	  taste.warnings.forEach((w) => console.log(`   ${w}`));
   202	}
   203	
   204	let seed, prompts, poolSize, keptInPool, drops, exhausted;
   205	try { ({ seed, prompts, poolSize, keptInPool, drops, exhausted } = generate(corpus, taste, opts)); }
   206	catch (e) { console.error(`\n${e.message}\n`); process.exit(1); }
   207	
   208	const label = opts.mode === 'surprise' ? 'SURPRISE (random over your themes)' : 'TASTE-STEERED';
   209	console.log(`\n${label}  ·  seed ${seed}  ·  taste confidence: ${taste.confidence}${has('--cinematic') ? '  ·  cinematic only' : ''}`);
   210	if (taste.confidence === 'themes-only') {
   211	  console.log('themes only — no SREF ratings yet, so style choice is theme-matched, not learned from you');
   212	}
   213	console.log('─'.repeat(78));
   214	
   215	prompts.forEach((p, i) => {
   216	  console.log(`\n${String(i + 1).padStart(2)}. ${p.prompt}`);
   217	  const bits = [`grammar: ${p.grammar}`];
   218	  if (p.sref) {
   219	    // Only claim a style name when one was actually verified; otherwise say so rather than
   220	    // printing the bare code under a "style:" label, which reads as a name and is not one.
   221	    const style = p.sref.style_name ? `style: ${p.sref.style_name}` : 'style: unnamed code';
   222	    const prov = p.sref.rating ? ` (you rated ${p.sref.rating}/5)` : ' ← NEW, rate it';
   223	    bits.push(style + prov);
   224	  }
   225	  console.log(`    ${bits.join('  ·  ')}`);
   226	});
   227	
   228	const fresh = prompts.filter((p) => p.sref?.isNew).length;
   229	const fromKept = prompts.filter((p) => p.lineage?.source_doc === 'taste/kept.md').length;
   230	console.log(`\n${'─'.repeat(78)}`);
   231	if (fromKept) console.log(`${fromKept} of ${prompts.length} built on prompts you kept.`);
   232	if (drops?.vetoed) {
   233	  const top = [...drops.byKeyword.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
   234	  console.log(`Your avoid-list rejected ${drops.vetoed} candidates (top: ${top.map(([k, n]) => `"${k}" ${n}`).join(', ')}).`);
   235	  console.log(`If that feels too aggressive, trim taste/rejected.md — nothing else reports this.`);
   236	}
   237	if (exhausted) {
   238	  console.log(`Asked for ${opts.count}, produced ${prompts.length} — your themes reach ${poolSize} distinct subjects`);
   239	  console.log(`and a batch will not repeat an idea. Add themes to taste/themes.md to widen the pool.`);
   240	}
   241	if (fresh) {
   242	  console.log(`${fresh} of ${prompts.length} use a style you have not judged yet — those are the ones worth rating.`);
   243	}
   244	console.log(`Reproduce this batch:  node swan-prompt.mjs --seed ${seed} -n ${opts.count}${opts.mode === 'surprise' ? ' --surprise' : ''}`);
   245	console.log(`Teach it:              node swan-prompt.mjs --rate <code> <1-5> "why it works"\n`);
   246	
   247	if (has('--json')) {
   248	  const outDir = path.join(VAULT, 'prompter/out');
   249	  fs.mkdirSync(outDir, { recursive: true });
   250	  const f = path.join(outDir, `batch-${seed}.json`);
   251	  fs.writeFileSync(f, JSON.stringify({ seed, mode: opts.mode, confidence: taste.confidence, prompts }, null, 2));
   252	  console.log(`JSON written: ${path.relative(VAULT, f)}\n`);
   253	}
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

## prompter/bundle.html
```
     1	<!doctype html>
     2	<html lang="en">
     3	<head>
     4	<meta charset="utf-8">
     5	<meta name="viewport" content="width=device-width, initial-scale=1">
     6	<meta name="referrer" content="no-referrer">
     7	<title>Swan Taste — judge</title>
     8	<!--
     9	  A Swan Taste bundle: one file, opened anywhere, no server. The pictures load from the
    10	  photographers' sites (Unsplash / Pexels / ESA Webb) in your browser; NOTHING on this page
    11	  uploads anything. Your judgements stay on this page until you press "Download results" and
    12	  send that file back. Generated by prompter/export-bundle.mjs — shareable pool only, by law.
    13	-->
    14	<style>/*__PROBE_CSS__*/</style>
    15	</head>
    16	<body>
    17	<header>
    18	  <h1><span>Swan</span> Taste</h1>
    19	  <div class="mode">
    20	    <span class="pill" id="who"></span>
    21	    <span class="pill" id="prog"></span>
    22	    <button id="download" type="button">Download results so far</button>
    23	    <button id="copy" type="button" title="If your phone blocks the download, copy the results and paste them into a message instead">Copy results</button>
    24	    <button id="undo" type="button" hidden>Undo last grid</button>
    25	  </div>
    26	  <div class="sub" id="sub"></div>
    27	</header>
    28	<main>
    29	  <div class="status" id="status"></div>
    30	  <div class="well"><div class="grid" id="grid"></div></div>
    31	</main>
    32	<footer>
    33	  <span id="count" class="status" style="margin:0"></span>
    34	  <button id="done" class="primary" type="button" disabled>Done — next grid</button>
    35	  <span id="result" class="status" style="margin:0"></span>
    36	</footer>
    37	<script>/*__PROBE_JS__*/</script>
    38	<script id="bundle" type="application/json">__BUNDLE_JSON__</script>
    39	<script>
    40	(() => {
    41	  const $ = (id) => document.getElementById(id);
    42	  const B = JSON.parse($('bundle').textContent);
    43	  const key = `swan-taste-bundle-${B.bundleId}`;
    44	  // Judgements survive a closed tab: kept in this browser only, under the bundle's own id.
    45	  const saved = (() => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } })() || { sessionId: SwanProbe.newSessionId(), events: [] };
    46	  const persist = () => { try { localStorage.setItem(key, JSON.stringify(saved)); } catch {} };
    47	  const copy = SwanProbe.COPY[B.profileId] || SwanProbe.COPY.client;
    48	  let k = saved.events.length; // the next grid to judge
    49	  const judge = SwanProbe.createJudge({ grid: $('grid'), count: $('count'), done: $('done'), notify: (m) => { $('status').textContent = m; }, brandLawLabel: copy.brandLaw });
    50	  $('who').textContent = `${copy.who} · ${B.title}`;
    51	  $('sub').innerHTML = copy.sub;
    52	
    53	  function show() {
    54	    $('prog').textContent = `grid ${Math.min(k + 1, B.grids.length)} of ${B.grids.length}`;
    55	    $('undo').hidden = saved.events.length === 0;
    56	    if (k >= B.grids.length) {
    57	      $('grid').innerHTML = '';
    58	      $('status').innerHTML = `<b>All ${B.grids.length} grids judged.</b> Press "Download results" and send that file back — that is the whole job.`;
    59	      $('done').disabled = true; $('done').textContent = 'All done';
    60	      return;
    61	    }
    62	    judge.load(B.grids[k].candidates);
    63	    $('status').innerHTML = `${B.grids[k].candidates.length} pictures · they load from the photographers' sites in your browser; nothing is uploaded from this page.${saved.events.length ? ` · <b>${saved.events.length}</b> grid${saved.events.length === 1 ? '' : 's'} saved on this page` : ''}`;
    64	    $('done').textContent = k === B.grids.length - 1 ? 'Done — finish' : 'Done — next grid';
    65	  }
    66	  $('done').addEventListener('click', () => {
    67	    const g = B.grids[k];
    68	    saved.events.push(judge.event({ source: B.profileId, profileId: B.profileId, projectId: B.projectId, channel: 'bundle', sessionId: saved.sessionId, notePublic: `bundle ${B.bundleId} grid ${k + 1} seed ${g.seed}` }));
    69	    persist(); k++;
    70	    $('result').textContent = `saved grid ${k} of ${B.grids.length}`;
    71	    show();
    72	  });
    73	  // Undo before sending: nothing has left this page yet, so the last saved grid is simply taken back.
    74	  $('undo').addEventListener('click', () => {
    75	    if (!saved.events.length) return;
    76	    saved.events.pop(); persist(); k = saved.events.length;
    77	    $('result').textContent = `grid ${k + 1} taken back — judge it again`;
    78	    show();
    79	  });
    80	  const results = () => ({ bundleId: B.bundleId, profileId: B.profileId, projectId: B.projectId, title: B.title, exportedAt: new Date().toISOString(), events: saved.events });
    81	  $('copy').addEventListener('click', async () => {
    82	    try { await navigator.clipboard.writeText(JSON.stringify(results())); $('result').textContent = `copied ${saved.events.length} grid${saved.events.length === 1 ? '' : 's'} — paste it into a message and send it back`; }
    83	    catch { $('result').textContent = 'copy blocked by the browser — use Download instead'; }
    84	  });
    85	  $('download').addEventListener('click', () => {
    86	    const out = results();
    87	    const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
    88	    const a = document.createElement('a');
    89	    a.href = URL.createObjectURL(blob); a.download = `swan-taste-results-${B.profileId}-${B.projectId}.json`;
    90	    document.body.append(a); a.click(); a.remove();
    91	    $('result').textContent = `downloaded ${saved.events.length} grid${saved.events.length === 1 ? '' : 's'} — send that file back`;
    92	  });
    93	  show();
    94	})();
    95	</script>
    96	</body>
    97	</html>
```

---

## How to answer

Lead with a direct answer: **dry, or not dry?** Then, if not dry, a ranked list with file, function,
concrete failing input and the smallest fix. Label anything you cannot reproduce SPECULATIVE.

Then **"What I checked and found sound"**, naming the specific attacks you tried. After six rounds
that section is worth as much as a finding — it is what lets this stop.

End with **APPROVE / REVISE / REJECT**.
