# Round 2 — Swan Taste Brain: verify the round-1 fixes, attack the P2 render-loop contract before it is built

**Board:** SWA-186 · **Date:** 2026-08-25 · **Author:** Fable 5 (Final Decider; not on the panel) · **Same five seats as round 1.** · **Privacy:** IDs and roles only; the second user is "the partner"; no names, keys, image bytes, or Midlibrary corpus text.

**Round-1 lesson applied here:** I quoted `validateEvent` without its first guard and two seats spent a P1 on a hole that did not exist. In this packet every gate under review is the **whole function**, spliced from the live files at the commit named. Files: `swan-taste-brain` commits `7f1850d` (laws) · `322dc0d` (tie-in) · `d6a58d7` (undo/UX), after `a2862dc`.

## 0. What you are asked to do

1. **Verify your own round-1 findings are closed** — for each, say CLOSED / STILL OPEN / REGRESSED with file:symbol from §2.
2. **Find what the fixes broke or opened** — a writer-level law, an undo path and a merged taste are new attack surface.
3. **Attack the P2 contract (§4) on paper.** It has not been built. Wrong order, missing invariant, security hole, evidence-integrity leak, daily-loop friction — say it now, with the exact input that breaks it.
4. Same output shape as round 1 (verdict, blockers with file:symbol + reproduction, attacks, highest risk, confidence). ~1,500 words of substance.

## 1. Round 1 → what happened (disposition, so you can check it)

| Round-1 finding | Seats | Disposition |
|---|---|---|
| Partner "include Midlibrary" opt-in breaks the licence law; `/brief` prints picks | DeepSeek, HY3, Ox, GLM | **Fixed.** Opt-in removed. `poolFor` computes full-pool from the **profile** (Sean only), so a hand-edited `project.json` cannot open it; `createProject` refuses `pool: full` for anyone but Sean; `compileProfile` filters non-Sean picks to shareable provenance. Tests: tampered file → shareable; probeFor zero Midlibrary. |
| Unknown / absent `source` bypasses the witness law | Ox B1, Kimi B1 | **Refuted** — the enum check precedes the branch (see `validateEvent` below, line 3 of the source checks). Adjacent real point (GLM B5): fixture-flag sources could target household memories → **fixed**: non-human sources only ever `sean/default`. |
| `/api/event` not behind the origin gate | Ox, GLM, Kimi (hypotheses) | **Refuted as a bug** (gate runs before every POST route in `serve.mjs`); **accepted as missing proof** → browser proof now POSTs from a foreign Origin to `/api/event`, `/api/keep`, `/api/projects` → 403 each. |
| `eventId` includes client `presentedAt` → replay double-counts; bundle planned before page grids → same picture judged twice | Ox B2, HY3 B3, GLM B3, Kimi B5 | **Fixed at the root:** never-show-twice is enforced in `appendEvent` (a grid whose pictures this memory already judged is refused; exact re-send stays a duplicate). Replay with a new timestamp → refused. Bundle overlap → refused at import with the reason printed. |
| No correction path; a locked misclick is permanent; Who mis-click | Kimi B4, DeepSeek, Ox | **Fixed:** `reversal` wired (validated `reversalOf`, must name a grid in this memory, cannot reverse a reversal); `activeEvents` drops undone grids from the tally and frees their pictures; **Undo last grid** on the page and in the bundle; active-memory pill + "Done — record for <Who>". |
| Pool exhaustion unspecified | Ox, Kimi | **Fixed:** `probeFor` returns `exhausted` + a hint; page shows it. |
| P1 empty for partner/client; generator ignores the compiled profile | GLM, DeepSeek | **Fixed (honestly):** `lib/taste-namespace.mjs` — Sean = markdown + evidence-tier codes (7 in play → confidence `partial`); partner/client = theme words + words of chosen pictures + refused subjects as vetoes + own kept prompts, labelled `words-only` until evidence. `/api/prompt?profile=&project=`, `/api/keep` per memory, `/api/rate` refused for non-Sean; the prompt page shares the Who · Memory bar. |
| P2 `file://` contradicts the schema; closed-loop generator bias; Comfy keep lands in Sean's file | Ox, Kimi, GLM | **Accepted as design** → §4. |
| Theme words can smuggle `--parameters` | Ox | **Fixed:** hyphens collapse and never lead; keyword splitter drops hyphens. |
| Append race; HMAC bundles; server-issued sessionId; styled-components rules | HY3, Kimi, GLM, HY3 | **Refuted / rejected:** sync fs in one tick; household trust + writer laws bound tampering; loopback tool is outside the SaaS component rules (ruling recorded). |

## 2. The gates as they are now (whole functions, spliced from the files)

Proof for this state: `test-modes.mjs` 69 PASS · `test-taste-namespace.mjs` 23 · `test-bundle.mjs` 25 · `test-probe.mjs` 81 · `test.mjs` 52 · headless-Chromium 41/41 (undo → pictures freed; foreign-Origin 403 by route; prompt page generating from a client memory; Keep into her own `kept.md`; 414 px clean; owner's memory unchanged 3/18).

### lib/events.mjs — validateEvent (whole), activeEvents, judgedIds, appendEvent (whole)
```js
export const SOURCES = ['sean', 'partner', 'client', 'agent-placeholder', 'imported', 'inferred'];
export const PROFILES = ['sean', 'partner', 'client'];
export const DEFAULT_PROFILE = 'sean';
export const DEFAULT_PROJECT = 'default';
export const CHANNELS = ['page', 'bundle'];
const PROJECT_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
export const isProjectId = (s) => PROJECT_ID.test(String(s ?? ''));
export const profileOf = (e) => e?.profileId ?? DEFAULT_PROFILE;
export const projectOf = (e) => e?.projectId ?? DEFAULT_PROJECT;
const allowNonSean = () => process.env.SWAN_TASTE_ALLOW_NONSEAN === '1';

export function validateEvent(e) {
  const errors = [];
  const need = (cond, msg) => { if (!cond) errors.push(msg); };
  need(e && typeof e === 'object', 'event must be an object');
  if (errors.length) return { ok: false, errors };
  need(e.schemaVersion === SCHEMA_VERSION, `schemaVersion must be ${SCHEMA_VERSION}`);
  need(EVENT_TYPES.includes(e.eventType), `eventType must be one of ${EVENT_TYPES.join('|')}`);
  need(SOURCES.includes(e.source), `source must be one of ${SOURCES.join('|')}`);
  if (e.profileId !== undefined) need(PROFILES.includes(e.profileId), `profileId must be one of ${PROFILES.join('|')}`);
  if (e.projectId !== undefined) need(isProjectId(e.projectId), 'projectId must be a slug (a-z, 0-9, hyphens, ≤40) — never a name');
  if (e.channel !== undefined) need(CHANNELS.includes(e.channel), `channel must be one of ${CHANNELS.join('|')}`);
  if (PROFILES.includes(e.source)) {
    need(e.source === profileOf(e), `source '${e.source}' cannot write into profile '${profileOf(e)}' — a witness writes only its own memory`);
  } else if (SOURCES.includes(e.source)) {
    // Non-human sources exist for fixtures only, under the test flag, and only in sean/default —
    // never in a household memory (panel 2026-08-25: the flag predated multi-profile).
    if (!allowNonSean()) errors.push(`source '${e.source}' refused: only a human witness (${PROFILES.join('|')}) may write in production`);
    else if (!(profileOf(e) === DEFAULT_PROFILE && projectOf(e) === DEFAULT_PROJECT)) errors.push(`source '${e.source}' may never write into ${profileOf(e)}/${projectOf(e)}`);
  }
  need(SESSION_ID.test(String(e.sessionId ?? '')), 'sessionId must be opaque hex (8-32 chars)');
  need(typeof e.presentedAt === 'string' && !Number.isNaN(Date.parse(e.presentedAt)), 'presentedAt must be an ISO date');
  need(MEDIA.includes(e.medium), `medium must be one of ${MEDIA.join('|')}`);
  need(BRAND_CONTEXTS.includes(e.brandContext), `brandContext must be one of ${BRAND_CONTEXTS.join('|')}`);
  need(GENERATORS.includes(e.generatorDistribution), `generatorDistribution must be one of ${GENERATORS.join('|')}`);
  need(Array.isArray(e.candidates) && e.candidates.length > 0, 'candidates must be a non-empty array');
  const ids = new Set();
  for (const c of e.candidates || []) {
    need(c && typeof c.id === 'string' && c.id.length > 0, 'candidate.id required');
    if (c?.url !== undefined) need(/^https?:\/\//.test(c.url) && !BYTES_RE.test(c.url), 'candidate.url must be http(s), never bytes');
    if (c?.provenance !== undefined) need(PROVENANCES.includes(c.provenance), `candidate.provenance must be one of ${PROVENANCES.join('|')}`);
    if (c?.id) ids.add(c.id);
  }
  const raw = JSON.stringify(e);
  need(!BYTES_RE.test(raw), 'image bytes are refused in events');
  need(raw.length < 64_000, 'event too large');
  for (const k of ['notePublic', 'notePrivate', 'dependsContext']) {
    if (e[k] !== undefined) need(typeof e[k] === 'string' && e[k].length <= MAX_STR, `${k} must be a string ≤ ${MAX_STR} chars`);
  }
  if (e.eventType === 'pair') {
    need(RESPONSES.includes(e.response), `response must be one of ${RESPONSES.join('|')}`);
    need(OUTCOMES.includes(e.outcomeClass), 'outcomeClass required on pair events');
    if (e.reasonCode !== undefined) need(REASONS.includes(e.reasonCode), 'reasonCode not in enum');
    if (e.response === 'depends') need(typeof e.dependsContext === 'string' && e.dependsContext.length > 0, 'dependsContext required when response is depends');
  }
  if (e.eventType === 'grid-selection') {
    need(Array.isArray(e.items) && e.items.length === (e.candidates || []).length, 'grid items must cover every candidate');
    for (const it of e.items || []) {
      need(ids.has(it?.id), 'grid item id must be a candidate id');
      need(VERDICTS.includes(it?.verdict), 'grid item verdict must be closest|miss|neutral');
      if (it?.verdict !== 'neutral') {
        need(REASONS.includes(it?.reasonCode), 'reasonCode required on closest/miss items');
        need(OUTCOMES.includes(it?.outcomeClass), 'outcomeClass required on closest/miss items');
        need(it?.reasonLockedBeforeReveal === true, 'reason must be locked before the label is revealed');
      }
    }
  }
  if (e.eventType === 'reversal') {
    need(/^[a-f0-9]{24}$/.test(String(e.reversalOf ?? '')), 'reversalOf must be the 24-hex eventId being undone');
  }
  return { ok: errors.length === 0, errors };
}

export function activeEvents(events) {
  const reversed = new Set(events.filter((e) => e.eventType === 'reversal' && e.reversalOf).map((e) => e.reversalOf));
  return events.filter((e) => e.eventType !== 'reversal' && !reversed.has(e.eventId));
}
export function judgedIds(events) {
  const ids = new Set();
  for (const e of activeEvents(events)) for (const c of e.candidates || []) if (c?.id) ids.add(c.id);
  return [...ids];
}

export function eventIdFor(e) {
  const ids = (e.candidates || []).map((c) => c.id).sort().join(',');
  return createHash('sha256').update(`${e.sessionId}|${e.eventType}|${ids}|${e.presentedAt}`).digest('hex').slice(0, 24);
}

export function appendEvent(e, dir) {
  const v = validateEvent(e);
  if (!v.ok) return { ok: false, errors: v.errors };
  dir = dir ?? eventsDirFor(profileOf(e), projectOf(e));
  const eventId = eventIdFor(e);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${e.sessionId}.jsonl`);
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(`"eventId":"${eventId}"`)) {
    return { ok: true, eventId, duplicate: true };
  }
  // The never-show-twice law lives at the WRITER, not only at presentation (panel 2026-08-25): a grid
  // whose pictures this memory already judged — from the page, a bundle planned before those grids, or
  // a replay with a fresh timestamp — is refused, never counted twice. Undo the earlier grid first.
  const existing = readEvents(dir);
  if (e.eventType === 'grid-selection') {
    const seen = new Set(judgedIds(existing));
    const again = (e.candidates || []).filter((c) => seen.has(c.id)).length;
    if (again) return { ok: false, errors: [`refused: ${again} of these pictures were already judged in this memory (never-show-twice) — undo that grid first`] };
  }
  if (e.eventType === 'reversal' && !existing.some((x) => x.eventId === e.reversalOf && x.eventType !== 'reversal')) {
    return { ok: false, errors: ['reversalOf does not name a grid in this memory'] };
  }
  const line = JSON.stringify({ ...e, eventId, recordedAt: new Date().toISOString() });
  fs.appendFileSync(file, line + '\n', 'utf8');
  return { ok: true, eventId, duplicate: false };
}
```

### lib/projects.mjs — pool law (whole functions)
```js
export const POOLS = ['shareable', 'full'];
export const SHAREABLE_MIX = { photo: 9, webb: 3 };
export const SHAREABLE_COLLECTIONS = new Set(['photo', 'webb']);
export const SHAREABLE_PROVENANCE = new Set(['unsplash', 'pexels', 'esa-webb-ccby', 'nasa-public-domain']);
export const DONE_FLOOR = { sean: { grids: 2, judgements: 8 }, partner: { grids: 8, judgements: 40 }, client: { grids: 8, judgements: 40 } };
const MAX_THEME_WORDS = 8;
const THEME_WORD = /^[a-z0-9][a-z0-9 -]{0,39}$/;

export function normaliseThemeWords(words) {
  const list = Array.isArray(words) ? words : String(words ?? '').split(/[,\n]/);
  // Hyphens collapse and never lead: a "theme word" can never smuggle a `--parameter` (panel 2026-08-25).
  return [...new Set(list.map((w) => String(w).trim().toLowerCase().replace(/\s+/g, ' ').replace(/-+/g, '-').replace(/^-|-$/g, '')).filter(Boolean))];
}

export function createProject({ profileId, projectId, title, themeWords = [], pool } = {}) {
  const errors = [];
  if (!PROFILES.includes(profileId)) errors.push(`profileId must be one of ${PROFILES.join('|')}`);
  if (!isProjectId(projectId)) errors.push('projectId must be a slug: a-z, 0-9, hyphens, ≤40 chars — never a name');
  if (isDefaultNamespace(profileId, projectId)) errors.push('sean/default is implicit and cannot be created');
  const words = normaliseThemeWords(themeWords);
  if (words.length > MAX_THEME_WORDS) errors.push(`at most ${MAX_THEME_WORDS} theme words`);
  if (words.some((w) => !THEME_WORD.test(w))) errors.push('theme words: letters, digits, spaces, hyphens only, ≤40 chars each');
  const wantPool = pool ?? 'shareable';
  if (!POOLS.includes(wantPool)) errors.push(`pool must be one of ${POOLS.join('|')}`);
  // Panel 2026-08-25 (four seats): the licence says Midlibrary is shown to the OWNER on loopback and to
  // nobody else — a partner opt-in was a relaxation of that law, and /brief prints picks. Removed.
  if (wantPool !== 'shareable' && profileId !== DEFAULT_PROFILE) errors.push('only Sean may open the full pool — Midlibrary is never shown to anyone else');
  if (errors.length) return { ok: false, errors };
  const file = projectFile(profileId, projectId);
  if (fs.existsSync(file)) return { ok: false, errors: ['project already exists'] };
  const project = {
    profileId, projectId, title: String(title || projectId).trim().slice(0, 80) || projectId,
    themeWords: words, pool: wantPool, createdAt: new Date().toISOString(),
  };
  fs.mkdirSync(eventsDirFor(profileId, projectId), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(project, null, 1));
  return { ok: true, project };
}

export function poolFor(profile, project, images) {
  const pj = readProject(profile, project);
  const full = profile === DEFAULT_PROFILE && (isDefaultNamespace(profile, project) || pj?.pool === 'full');
  if (full) return { pool: 'full', images, mix: DEFAULT_MIX };
  return { pool: 'shareable', images: images.filter((r) => SHAREABLE_COLLECTIONS.has(r.collection)), mix: SHAREABLE_MIX };
}
```

### lib/taste-namespace.mjs — the tie-in (whole functions)
```js
export function evidenceLoved(profile, corpus) {
  const byCode = new Map((corpus?.sref || []).map((c) => [String(c.code), c]));
  return (profile.srefs || []).filter((r) => r.closest >= 1 && r.margin > 0).map((r) => ({
    code: String(r.key), style_name: byCode.get(String(r.key))?.style_name || null,
    rating: r.closest >= 2 ? 5 : 4, note: `evidence: ${r.closest} closest, ${r.miss} miss`,
  }));
}
export function keywordsFrom(themeWords = [], picks = []) {
  const out = new Set();
  for (const w of themeWords) for (const t of words(w)) out.add(t);
  for (const p of picks) for (const t of words(p.title)) out.add(t);
  return [...out];
}
export function avoidWordsFrom(profile, keywords) {
  const out = new Set();
  for (const r of profile.subjects || []) {
    if (r.closest !== 0 || r.miss < 1) continue;
    for (const t of words(r.key.replace(/^(photo|webb|ml):/, ''))) if (!keywords.includes(t)) out.add(t);
  }
  return [...out];
}
export function keepFor(profile, project, prompt) {
  if (isDefaultNamespace(profile, project)) return { ok: false, error: 'sean/default keeps through the CLI (taste/kept.md)' };
  if (!readProject(profile, project)) return { ok: false, error: 'unknown project' };
  const text = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (text.split(' ').length < 3) return { ok: false, error: 'prompt must be at least 3 words' };
  const p = keptPath(profile, project);
  let md = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : `# Kept prompts — ${profile}/${project}\n\n## Kept\n`;
  if (md.includes(`- ${text}\n`)) return { ok: true, duplicate: true, kept: parseKept(md).length };
  if (!/^## Kept/m.test(md)) md += '\n## Kept\n';
  md = md.replace(/(## Kept\n)/, `$1- ${text}\n`);
  fs.writeFileSync(p, md, 'utf8');
  return { ok: true, duplicate: false, kept: parseKept(md).length };
}

export function tasteFor({ profile, project, corpus }) {
  const compiled = compileProfile({ profile, project, write: false });
  if (compiled.error) return null;
  const loved = evidenceLoved(compiled, corpus);
  if (isDefaultNamespace(profile, project)) {
    const base = loadTaste();
    const known = new Set(base.loved.map((l) => l.code));
    const rejected = new Set(base.rejectedSrefs);
    const merged = [...base.loved, ...loved.filter((l) => !known.has(l.code) && !rejected.has(l.code))];
    const positiveCount = merged.filter((l) => l.rating >= 3 && !rejected.has(l.code)).length;
    return { ...base, loved: merged, ratedCount: merged.length, positiveCount, evidenceSrefs: loved.length, tasteSource: 'markdown+evidence',
      confidence: confidenceOf({ positiveCount, kept: base.kept.length, keywords: base.keywords.length }) };
  }
  const pj = readProject(profile, project);
  const kept = keptFor(profile, project);
  const keywords = keywordsFrom(pj.themeWords, compiled.picks);
  const avoidWords = avoidWordsFrom(compiled, keywords);
  return {
    loved, rejectedSrefs: compiled.proposedAvoids || [], kept, identity: pj.themeWords || [], moodsFit: [], moodsAvoid: [],
    keywords, avoidWords, warnings: [], ratedCount: loved.length, positiveCount: loved.length, evidenceSrefs: loved.length,
    tasteSource: 'evidence', confidence: confidenceOf({ positiveCount: loved.length, kept: kept.length, keywords: keywords.length }),
  };
}
```

### lib/profile.mjs — the compiler's witness/undo/pick filters (excerpt)
```js
import { readEventsFor, activeEvents, DEFAULT_PROFILE, DEFAULT_PROJECT } from './events.mjs';
import { readProject, projectDir, isDefaultNamespace, doneFloorFor, poolFor, SHAREABLE_PROVENANCE } from './projects.mjs';
export function tally(events, images, witness = DEFAULT_PROFILE) {
    reversals: events.filter((e) => e.eventType === 'reversal').length };
  // An undone grid (eventType: reversal) is not evidence — activeEvents drops it and its pictures return to the pool.
  for (const e of activeEvents(events)) {
    if (e.source !== witness || e.eventType !== 'grid-selection') continue;
 * its own events, counts only its own witness, and takes its priors from its own theme words —
```

### lib/routes-modes.mjs — probeFor (whole) · serve.mjs — the POST gate and /api/prompt, /api/keep (excerpt)
```js
export function probeFor({ profile, project, n = 12, seed, mix, images }) {
  const pj = readProject(profile, project);
  if (!pj) return { error: 'unknown project' };
  const pool = poolFor(profile, project, images ?? loadImages());
  const excludeIds = judgedIds(readEventsFor(profile, project));
  // Sean's own refusals are his; a partner or client judges every code fresh.
  const excludeSrefs = profile === DEFAULT_PROFILE ? loadTaste().rejectedSrefs : [];
  const out = selectProbe({ images: pool.images, n, seed, excludeSrefs, excludeIds, mix: mix ?? pool.mix });
  // Pool exhaustion is a stated state, not a silent short grid (panel 2026-08-25).
  const exhausted = out.candidates.length < n;
  return {
    profileId: profile, projectId: project, pool: pool.pool, excludedCount: excludeIds.length, exhausted,
    hint: exhausted ? `this memory has judged nearly every picture in its ${pool.pool} pool (${out.candidates.length} left for this grid) — grow it: node prompter/fetch-photos.mjs --project ${profile}/${project}` : null,
    seed: out.seed, strata: out.strata,
    candidates: out.candidates.map((c) => ({
      id: c.id, url: c.url, sref: c.sref, doc: c.doc, collection: c.collection, title: c.title,
      provenance: c.provenance, credit: c.credit ?? null, pageUrl: c.pageUrl ?? null, gridPosition: c.gridPosition,
    })),
  };
}

    if (req.method === 'POST') {
      const gate = checkWriteRequest(req.headers, PORT);
      if (!gate.ok) return json(res, 403, { error: gate.reason });
    }
    if (url.pathname === '/api/prompt' && req.method === 'GET') {
      // One memory's taste (lib/taste-namespace.mjs): Sean's markdown + his evidence codes, or a
      // partner/client project's words, picks and kept prompts. ?profile=&project= — defaults to Sean.
      const ns = namespaceFrom(url);
      if (ns.error) return json(res, 400, { error: ns.error });
      const taste = tasteFor({ ...ns, corpus });
      if (!taste) return json(res, 404, { error: 'unknown project' });
      const n = Math.min(50, Math.max(1, Number(url.searchParams.get('n') ?? 5) || 5));
      const mode = url.searchParams.get('mode') === 'surprise' ? 'surprise' : 'taste';
      const ar = /^\d{1,2}:\d{1,2}$/.test(url.searchParams.get('ar') ?? '') ? url.searchParams.get('ar') : '16:9';
      const seedRaw = url.searchParams.get('seed');
      const seed = seedRaw && /^\d+$/.test(seedRaw) ? Number(seedRaw) : undefined;

      let pool = corpus;
      if (url.searchParams.get('cinematic') === '1') {
        const sref = corpus.sref.filter((c) =>
          /cinematic|film|movie|noir/i.test(`${c.source_title} ${c.style_name} ${c.example_prompt}`));
        if (sref.length) pool = { ...corpus, sref };
      }

      const tasteMeta = { source: taste.tasteSource, evidenceSrefs: taste.evidenceSrefs, keywords: taste.keywords.length, kept: taste.kept.length, confidence: taste.confidence };
    if (url.pathname === '/api/keep' && req.method === 'POST') {
      const body = await readBody(req);
      if (typeof body.prompt !== 'string' || body.prompt.split(/\s+/).length < 3) {
        return json(res, 400, { error: 'prompt must be a string of at least 3 words' });
      }
      const profile = body.profileId ?? DEFAULT_PROFILE, project = body.projectId ?? DEFAULT_PROJECT;
      if (!(profile === DEFAULT_PROFILE && project === DEFAULT_PROJECT)) {
        // A partner/client memory keeps into its own kept.md — never into Sean's.
        const r = keepFor(profile, project, body.prompt);
        return json(res, r.ok ? 200 : 400, r.ok ? { ok: true, duplicate: r.duplicate, message: r.duplicate ? 'Already kept.' : `Kept. ${r.kept} exemplar${r.kept === 1 ? '' : 's'} now steering ${profile}/${project}.` } : { error: r.error });
      }
      return json(res, 200, { ok: true, message: cli(['--keep', body.prompt]) });
```

## 3. Known residuals the author already sees (go past these)

iOS Safari `localStorage` on `file://` for the bundle is unverified (results file still works) · the Who select is household trust (now salient + undoable) · no version stamp in the bundle payload yet · `appendEvent(e, dir)` keeps a test-only `dir` seam (no server caller uses it) · `avoidWordsFrom` turns a content-class miss into a veto word for that memory — possibly over-eager on tiny memories · `keywordsFrom` lifts words from photo descriptions, which are noisy · the ComfyUI `Keep` node still has no profile/project input (§4 fixes it).

## 4. P2 — the render loop: the contract to attack (NOT built)

**Goal.** The Midjourney-like loop, fully local, per memory, one click per step: *make → look → judge → the memory sharpens → make again.* The 5090 desktop runs ComfyUI at `127.0.0.1:8188`; the brain runs at `127.0.0.1:7331`. The brain NEVER stores image bytes and NEVER drives ComfyUI in v1 — ComfyUI pulls from the brain (the existing node pattern), the brain remembers what it handed out and reads the results back.

1. **Intent (mint).** `GET /api/prompt?profile=&project=&n=&seed=` gains `&intent=1`: for every prompt returned, the server mints `{ token: 12-hex, prompt, seed, sref, profileId, projectId, createdAt }` into `<namespace>/renders/intents.jsonl` (sean/default → `taste/renders/intents.jsonl`) and returns `prefix: 'swan-<token>'` with each prompt. The ComfyUI `SwanPrompt` node gains `profile` + `project` inputs and a `prefix` output wired into `SaveImage.filename_prefix`. Minting is a write → behind the origin gate; a browser page mints only for the memory it is on.
2. **Render.** ComfyUI writes `swan-<token>_00001_.png` (its own counter) into its output directory (`SWAN_COMFY_OUTPUT` env or `prompter/comfy.local.json`, gitignored; default `C:\ComfyUI\output`). Nothing else changes in Sean's workflow.
3. **Ingest.** `GET /api/renders?profile=&project=` (and `node prompter/fetch-renders.mjs`) scans the output dir for files matching `^swan-([a-f0-9]{12})_(\d+)_\.png$`, joins on token to that memory's intents — **unknown tokens are ignored, other memories' tokens are ignored** — and writes `<namespace>/renders/index.json` rows `{ id: 'render:<token>:<n>', token, n, prompt, seed, sref, createdAt, bytes }`. Files are never moved or copied.
4. **Serve.** `GET /renders/<token>/<n>` streams the PNG only if `<token>` is in *some* intents file the requesting namespace owns and the composed filename matches the strict pattern — the client never supplies a path; the server composes it from two validated tokens. Loopback only; `content-type: image/png`; size-capped; no directory listing.
5. **Judge.** `GET /api/probe?profile=&project=&pool=renders` → a grid of that memory's own renders (`collection: 'render'`, `provenance: 'local-comfy'`, `url: /renders/<token>/<n>`), same neutral-gray well, same never-show-twice, same lock-before-reveal — the label revealed after lock is the prompt + seed + sref. Events carry `generatorDistribution: 'local-comfy'`. **Real-picture grids remain the default**; renders are an explicit "Judge my renders" button, so real pictures stay in rotation permanently.
6. **Tally partition (generator bias must not become taste bias).** In `tally`, a judgement on a `local-comfy` candidate counts **0.5 toward reasons and srefs (style)**, **1.0 toward subjects**, and is also counted in a separate `renders: { judged, closest, miss }`; `picks` carry `generated: true`; the evidence floor (2 closest) is unchanged, so two render-closests ≈ one real. The brief shows "renders you liked" apart from "pictures you chose". Generated candidates never enter a bundle (bundles stay photos + Webb) and never carry Midlibrary (a prompt may contain a public `--sref` code; that is not the corpus).
7. **Re-roll / vary / keep on the prompt page.** Re-roll = same direction, new seed (one click; mints an intent). Vary = same subject, next evidence sref. Keep = `/api/keep` for that memory (exists). v2 (not this slice): "Make 4" pushes a workflow to ComfyUI's `/prompt` API from a template Sean exports once (`prompter/comfy-workflow.local.json`, gitignored) — the brain would then drive the render; v1 stays pull-only.
8. **Tests planned.** Filename/token strictness (`../`, absolute paths, wrong token, right token wrong namespace → 404); ingest ignores unknown tokens; serve streams only PNG magic bytes and caps size; renders pool never mixes with real pictures; tally 0.5/1.0 partition; never-show-twice + undo across render grids; the Python node's contract exercised against the live server (prefix out, profile/project in). Suites use PNGs written by a tiny zlib PNG writer into a scratch output dir; the browser proof renders them through `/renders/` (naturalWidth > 0).

## 5. What we want back

1. **Round-1 closure check** — each of your findings: CLOSED / STILL OPEN / REGRESSED, with file:symbol from §2.
2. **What the fixes opened** — the writer-level never-show-twice vs legitimate flows ("Same grid" before recording, undo then re-judge, bundle import after a page session); reversal abuse (undo someone else's grid in a shared memory, undo storms); `tasteFor` merge semantics for Sean (markdown rating vs evidence code conflict); over-eager vetoes from `avoidWordsFrom`; `keepFor` and `/api/keep` on a client memory; the prompt page's shared `localStorage` memory choice.
3. **Attack the P2 contract** — pull-vs-push order; token minting by any loopback process (household trust — is that enough for renders?); serving files from the ComfyUI output dir (content sniffing, non-PNG with the right name, size); whether ANY generated judgement should touch style tallies (0.5? 0?); whether never-show-twice means anything for unique renders; what a daily "make → judge" loop needs that this misses (batch size, latency, where "vary" really lives, how the brief shows it); what to NOT build.
4. **The first P2 slice** you would ship, and its proof command.

Rules of evidence: quote §2 or name file:symbol; no findings about files you have not seen; mark what you could not verify as a hypothesis. Do not propose cloud upload, vector search, or a hosted client route. Do not paste Midlibrary text back. ~1,500 words of substance.
