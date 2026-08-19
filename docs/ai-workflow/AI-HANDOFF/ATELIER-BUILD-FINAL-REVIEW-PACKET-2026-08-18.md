# ATELIER STUDIO BUILD — FINAL PRE-PUSH HOSTILE REVIEW PACKET

- Date: 2026-08-18 · Builder: Claude Fable 5 · Branch: feat/swan-atelier-studio (cut from origin/main @ acc2f8cdd)
- You are reviewing BUILT WORK, pre-push. Verdict requested: APPROVE / REVISE (with exact defects) / REJECT.
- All plan docs were reviewed in 2 prior rounds; do NOT re-litigate the rulings. Attack the IMPLEMENTATION.

## Commits on the branch
aa253cfee feat(atelier): slice 7 — A0b interpolation spike RAN LIVE, criteria 1+2 PASS, text legible on first-pass vision review
e138a3373 feat(atelier): slices 5+6 — swan-atelier-studio skill + three-place licensing plumbing
be2004551 feat(atelier): slice 4 — A5 kill-order log: ONE artifact, schema-enforced, instrument no longer ships empty
a1e4c1740 feat(atelier): slice 3 — archetype #22 construction/trades (R3's own worked example was uncovered)
bf3d65278 feat(atelier): slice 2 — A7 recall layer: generated splits + routing table + skill contracts
258cc1edd feat(atelier): slice 1 — smoke test PASSES the divergence hard gate

## Files changed
 docs/ai-workflow/design-brain/index.md             |   1 +
 docs/ai-workflow/design-brain/rejection-log.jsonl  |   1 +
 .../ai-workflow/design-brain/website-archetypes.md |  23 ++++
 package.json                                       |   2 +
 scripts/design-brain/atelier/.gitignore            |   1 +
 scripts/design-brain/atelier/fingerprint.mjs       |  50 +++++++++
 scripts/design-brain/atelier/interpolate-spike.mjs |  95 ++++++++++++++++
 .../design-brain/atelier/smoke/CoverIssue.dc.html  |  59 ++++++++++
 scripts/design-brain/atelier/smoke/Ledger.dc.html  |  69 ++++++++++++
 scripts/design-brain/atelier/smoke/Main.dc.html    |  65 +++++++++++
 .../design-brain/atelier/smoke/OpenRoad.dc.html    |  66 ++++++++++++
 scripts/design-brain/atelier/smoke/canvas.json     |  16 +++
 .../atelier/smoke/plates/plate-hero.svg            |  17 +++
 .../atelier/smoke/plates/plate-proof.svg           |   9 ++
 .../atelier/smoke/plates/plate-texture.svg         |  12 +++
 scripts/design-brain/atelier/smoke/skeletons.json  |  44 ++++++++
 .../atelier/tests/fingerprint.test.mjs             |  38 +++++++
 scripts/design-brain/build-archetype-index.mjs     | 119 +++++++++++++++++++++
 scripts/design-brain/check-brain-links.mjs         |  10 +-
 scripts/design-brain/log-atelier-session.mjs       |  78 ++++++++++++++
 .../design-brain/tests/archetype-index.test.mjs    |  74 +++++++++++++
 scripts/design-brain/tests/atelier-log.test.mjs    |  61 +++++++++++
 scripts/design-brain/tests/redact-urls.test.mjs    |  23 ++++
 scripts/redact-urls.mjs                            |  52 +++++++++
 53 files changed, 1650 insertions(+), 1 deletion(-)

## Verification evidence (all executed this session)
- design-brain suite: 89/89 pass (73 pre-existing preserved + 16 new) · atelier suites 21/21
- brain:links CLEAN (0 defects) · brain:archetypes:check CLEAN @ 4fb0805d87dd (22 archetypes)
- fingerprint on smoke skeletons: DIVERGENT; positive controls fired live: exit-2 (collision), exit-3 (tame wildcard)
- rogue hand-written file in archetypes/ still FAILS the D2 gate (exemption proven narrow, live)
- kill-log refusal path fired live (exit 2, 10 defects enumerated); real smoke session logged as pending
- A0b spike RAN: minterpolate 30->60fps, C1 PASS (fps=60.00, dur 2.00->1.95s), C2 SSIM 0.998, C3 EYES-REQUIRED with first-pass vision review: glyphs crisp at 420px/s
- 4-up canvas PUBLISHED: claude.ai/code/artifact/ba1bff9a-718b-4670-abe9-91542d85b2a4
- Rule 42 backend audit: 0 untracked, 0 modified (no backend files touched)

## Honest disclosures (attack these first)
1. A4 graft + A6 drift-diff are DOCTRINE-ONLY in v1 — executable tooling deferred until real production variants exist. The generation-time contract (shared custom-property names) IS in the smoke artboards.
2. Lever-enum filtering from the rejection log is doctrine-only (log has 1 pending entry; nothing to filter yet).
3. index.json is 4.01KB vs the 2KB estimate — thesis field kept; gutting it to hit a round number judged metric-chasing. WARN left in permanently.
4. The A0 Plate Forge as a GENERATOR (brief->plate briefs->image gen) is not built — the smoke pack was hand-made SVG. The pack LAW and schema hooks (plate_pack_id required) are enforced.
5. No CI hook runs the design-brain tests automatically; staleness is caught by tests only when tests run.

---
## ARTIFACT 1 — the skill doctrine (.claude/skills/swan-atelier-studio/SKILL.md)
---
name: swan-atelier-studio
description: The N-up parallel design engine — Sean talks, the Studio diverges into 4-5 structurally distinct rendered directions on ONE canvas, he judges side-by-side with live tweak levers, grafts (never "merges"), and every pick is logged as the taste instrument. Use when Sean wants design options for a page/surface ("give me directions", "show me options", "atelier this", "/swan-atelier-studio"), for any net-new surface after grill-me/design-dialogue, or for the front-page C13 refactor. Differentiates from Claude Design by design - it converges on ONE artifact; the Studio diverges first, then converges. Module B11 on the Atelier spine; governed by SWAN-ATELIER-STUDIO-R2-RULINGS-2026-08-18.
---

# Swan Atelier Studio — diverge in a fleet, judge on one canvas, graft by contract

**The thesis:** Claude Design converges on one artifact iteratively. The Studio **diverges into a fleet, judges side-by-side, and grafts.** Generate the material once, diverge on **structure** not style, judge **≤5** with live levers, **graft — never "merge"** — and let the picking itself be the measurement instrument.

**Authority chain:** `SWAN-CINEMATIC-DESIGN-SYSTEM.md` > `design-brain/design.md` > this skill. The Studio APPLIES the design system. Rule 40's concept-breadth law and `swan-design-router` remain in force — the Studio is the *rendering and judging engine* downstream of them. Rulings of record: `docs/ai-workflow/AI-HANDOFF/SWAN-ATELIER-STUDIO-R2-RULINGS-2026-08-18.md`.

## The run loop (A-modules in execution order)

### A1 · Brief — draft-first, hard cap 5 questions
Route `design-dialogue` (propose alternatives) → `grill-me` (gaps only). **Propose a brief DRAFT and let Sean edit the diff — never interview-first.** Hard cap: **5 questions** before the first visual exists. The 40-question interview Sean abandons at question 12 is this module's named failure mode.
**Recall contract (A7):** step 1 is always `read docs/ai-workflow/design-brain/archetypes/index.json`, then load **≤3** matching `archetypes/<nn>-<id>.md` splits. Never bulk-load the 61KB monolith. Consult `rejection-log.jsonl` so variants are not born into known-rejected space.

### A0 · Plate Forge — assets FIRST (the transcript's step most people miss)
Generate **one shared pack of 3–5 plates** BEFORE any divergence. Each plate carries a **role** (hero-bleed / texture / proof / negative-space) and an aspect; roles must be filled consistently so material stays a controlled variable. Run the **pack consistency check** (shared palette + type direction across plates), then the **pack gate: Sean thumbs-up the pack (5 seconds) before divergence begins.** Wrong material caught here costs one regeneration; caught after divergence it costs five.

**THE SAME-PACK LAW (hard):** all variants in a round compose from the same plate pack. A variant needing material the pack lacks **logs the need and composes around the gap — never generates bespoke material mid-divergence.** (Same material, different composition IS the divergence experiment; bespoke plates confound it invisibly.)

### A2 · Divergence — constrain the SKELETON, free the style
Each variant gets a **distinct hand-specified skeleton contract** (structured data, not prose):
`{id, nav_model, hero_mechanics, chapter_count, grid, anti_specs[], wildcard}`
- **anti_specs are negatives aimed at the modal layout:** "no top nav bar", "hero is NOT full-bleed image + centered text". Negative constraints break priors better than positive ones.
- **One wildcard** seeded from an alien archetype ("construction site as editorial magazine"). Its levers exist but its *defaults stay alien*.
- **"Hero mechanics" means interaction model (structural). Motion is NOT a v1 seed axis** — motion enters winner-only, post-treatment. (A static artboard judges a motion seed with the motion removed — the seed biases the judge against itself.)
- Variants are generated by **blind parallel subagents** — no variant sees another.

### A2b · Fingerprint — dedupe once, never regenerate post-Sean
`node scripts/design-brain/atelier/fingerprint.mjs <skeletons.json>` — fingerprint = **the skeleton-contract fields themselves** (nav_model | hero_mechanics | grid). Exit 2 = collision (**HARD GATE: halt, report, build nothing on top**). Exit 3 = wildcard not alien (re-roll it — **pre-Sean fingerprint-driven re-rolls are legal;** what is banned is post-Sean taste-driven regeneration).

### A3 · Judgment Surface — one canvas, ≤5 artboards, honest captions, style-only levers
- **N = 4 default (2×2, every position equal); 5 for awe surfaces rendered 2×3 with a ghost cell** listing the shared plate manifest ("what all five hold constant").
- Publish via the `design` skill: every variant an artboard, **tournament rounds are canvas pages**, wildcard bottom-right.
- **Captions are sticky notes and every artboard MUST state ≥1 tradeoff** — a set where only your favorite gets a case made for it is a rigged vote. Refuse to seed a canvas with an empty tradeoff field.
- **Levers (`data-props` tweak chips) are STYLE/TOKEN-LEVEL ONLY** — accent, density, spacing, dark. A structural lever is a regeneration wearing a chip costume. Levers on ALL variants (asymmetric levers confound comparison); **defaults = as-designed state; reset-before-compare** is the convention. Lever enums draw from rejection-log-filtered space.
- **Two-pass judging:** a 3-second kill pass at thumbnail zoom (structure survives thumbnailing), then a deep pass on survivors.
- Size budget asserts: ≤2 MiB/entry, ≤16 MiB/document — shared plates stored once, referenced N times.

### A5 · Convergence — cap 3 rounds, null-winner is a first-class path
- Sean picks → branch from the winner. **Hard cap 3 rounds**, then escalate two finalists.
- **Wave 2 (≤3 variants, a new canvas page):** re-roll **execution-killed lineages only** ("nice structure, wrong density") — idea-killed concepts stay dead. Survivors are **frozen** (never re-rendered; lever state at pick recorded in the caption).
- **Null-winner (the MODAL outcome at 30–50% per-generation satisfaction):** all bad → log it with `axes_to_flip[]` and re-diverge carrying the learning. Never ship the least-bad.
- **Log every session:** `node scripts/design-brain/log-atelier-session.mjs --session <session.json>` — winner, kill order, reason codes (`idea|execution|style|structure|unknown`), lever deltas, measured `cost_usd`/`wall_s` (numbers or null — **never adjectives**). Heavy lever exploration on a killed variant = right direction, wrong calibration — that signal is free once logged. **This log IS the measurement instrument.** No separate sieve, no taste rubric — mechanical gates only (Rule 1, 300-line cap, taxonomy BANNED list).

### A4 · Graft & Re-tokenize — never say "merge"
- **Token/palette swap:** real and cheap — requires A2's generation-time contract: **identical custom-property names across all variants**.
- **Section graft:** real but fragile — sections self-scoped with a declared interface. **Run the token-compatibility check BEFORE attempting a graft**, not after it breaks.
- **Layout transfer: out of scope, permanently named as regeneration.** "Take 3's layout with 5's palette" executes as: regenerate variant 3 with variant 5's token manifest — say so.

### A6 · Handover — fidelity is measured, not vibed
Canvas → React with Swan tokens (Rule 1 no-MUI, Rule 6 token-with-fallback, Rule 4 ≤300 lines). **Drift budget:** screenshot-diff winning artboard vs built page at 2–3 breakpoints, threshold-gated, mismatches enumerated. Sean arbitrates only above-threshold diffs. "Looks faithful" is not a measurement.

## Licensing (three-place model — RULED, extends Fable D4 2026-07-25)
1. **Lifted component code** (21st.dev / Aceternity / ReactBits / any snippet) = dependency hygiene: verify the license **per component** (aggregators are heterogeneous), carry attribution in `THIRD_PARTY_NOTICES.md` (license, copyright line, pinned version/commit, verification date). **MIT attribution survives token-adaptation.**
2. **Reference URLs:** threads are **archive, not memory** — no skill loads thread archives as context; URLs are **mechanically redacted** when handoff docs quote threads (`node scripts/redact-urls.mjs`).
3. **The ledger takes judgments, never transcriptions** of third-party structure. Provenance shape: `aceternity/shimmer-button · MIT · verified 2026-08-18`.

## v1 fence — do NOT build
Taste sieve (v2 may *run the shadow study* on ≥~30 logged sessions; v3 builds only if the study earns it) · per-variant material budgets (the shared pack is the control group) · motion-seeded variants (blocked on the A0b interpolation spike + the motion-on-static judging problem) · layout transfer · multi-judge (a second judge invalidates every kill-reason code).

## Worked example (committed, live)
`scripts/design-brain/atelier/smoke/` — 4 artboards from one 3-plate pack, toy brief on archetype #4, fingerprint DIVERGENT, published canvas: `claude.ai/code/artifact/ba1bff9a-718b-4670-abe9-91542d85b2a4`. Session logged as `pending` in `rejection-log.jsonl`.

---
## ARTIFACT 2 — fingerprint.mjs (A2b hard gate)
```js
#!/usr/bin/env node
/**
 * fingerprint.mjs — A2b structural fingerprint for Swan Atelier Studio.
 * Fingerprint = the skeleton-contract fields themselves (R2 ruling; Kimi's fix).
 * Collision: two skeletons identical on (nav_model, hero_mechanics, grid).
 * Wildcard-alienness (GLM R2): the wildcard must differ from EVERY non-wildcard
 * on at least two of the three fingerprint fields.
 * Exit 0 = divergent. Exit 2 = COLLISION (HARD GATE: halt the build).
 * Exit 3 = wildcard not alien enough (re-roll pre-Sean; legal per E9 carve-out).
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function fingerprint(s) { return [s.nav_model, s.hero_mechanics, s.grid].join('|'); }
export function collisions(list) {
  const seen = new Map(); const out = [];
  for (const s of list) {
    const fp = fingerprint(s);
    if (seen.has(fp)) out.push([seen.get(fp), s.id]);
    else seen.set(fp, s.id);
  }
  return out;
}
export function wildcardAlien(list) {
  const wc = list.filter(s => s.wildcard); const rest = list.filter(s => !s.wildcard);
  return wc.every(w => rest.every(r => {
    let diff = 0;
    if (w.nav_model !== r.nav_model) diff++;
    if (w.hero_mechanics !== r.hero_mechanics) diff++;
    if (w.grid !== r.grid) diff++;
    return diff >= 2;
  }));
}

// CLI entry — only when executed directly, never on import (tests import the pure functions).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const file = process.argv[2];
  if (!file) { console.error('usage: fingerprint.mjs <skeletons.json>'); process.exit(1); }
  const { skeletons } = JSON.parse(readFileSync(file, 'utf8'));
  const dupes = collisions(skeletons);
  if (dupes.length) {
    console.error(`COLLISION — HARD GATE TRIPPED. Halt the build. Pairs: ${JSON.stringify(dupes)}`);
    process.exit(2);
  }
  if (!wildcardAlien(skeletons)) {
    console.error('WILDCARD NOT ALIEN — re-roll the wildcard before Sean sees it (pre-Sean re-roll is legal).');
    process.exit(3);
  }
  console.log(`DIVERGENT — ${skeletons.length} skeletons, 0 collisions, wildcard alien. Proceed.`);
}
```

## ARTIFACT 3 — log-atelier-session.mjs (A5 instrument)
```js
#!/usr/bin/env node
/**
 * log-atelier-session.mjs — A5 kill-order log: the session-write API into the
 * ONE rejection-log artifact (R2 ruling E1/E2/E6 — no second log; this JSONL is
 * the structured form of the design-dialogue rejection log going forward).
 *
 * Without this line the "picking is the instrument" claim ships empty (Kimi R2).
 * Schema (GLM R2, adopted verbatim + `pending` for sessions awaiting Sean's pass):
 *   {ts, brief_id, archetype_ids[], plate_pack_id,
 *    variants:[{id, skeleton_id, outcome: killed|survived|winner, kill_rank?, pass?,
 *               reason_code?: idea|execution|style|structure|unknown, lever_deltas?}],
 *    null_winner, pending?, axes_to_flip?, rounds, wave2_used, cost_usd|null, wall_s|null}
 *
 * Usage: node scripts/design-brain/log-atelier-session.mjs --session <session.json>
 *        (validates, then appends ONE line to docs/ai-workflow/design-brain/rejection-log.jsonl)
 */
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const LOG_PATH = join(ROOT, 'docs', 'ai-workflow', 'design-brain', 'rejection-log.jsonl');

const OUTCOMES = new Set(['killed', 'survived', 'winner']);
const REASONS = new Set(['idea', 'execution', 'style', 'structure', 'unknown']);

/** Validate a session object. Returns [] when valid, else a list of defects. */
export function validate(s) {
  const bad = [];
  if (!s || typeof s !== 'object') return ['session is not an object'];
  if (!s.ts || Number.isNaN(Date.parse(s.ts))) bad.push('ts must be an ISO timestamp');
  if (!s.brief_id) bad.push('brief_id required');
  if (!Array.isArray(s.archetype_ids) || !s.archetype_ids.length) bad.push('archetype_ids[] required');
  if (!s.plate_pack_id) bad.push('plate_pack_id required (same-pack law: one pack per round)');
  if (!Array.isArray(s.variants) || s.variants.length < 2) bad.push('variants[] requires >=2 entries');
  const winners = (s.variants || []).filter(v => v.outcome === 'winner');
  for (const v of s.variants || []) {
    if (!v.id) bad.push('variant missing id');
    if (!v.skeleton_id) bad.push(`variant ${v.id}: skeleton_id required (structural seed provenance)`);
    if (!OUTCOMES.has(v.outcome)) bad.push(`variant ${v.id}: outcome must be killed|survived|winner`);
    if (v.outcome === 'killed') {
      if (!REASONS.has(v.reason_code)) bad.push(`variant ${v.id}: killed requires reason_code idea|execution|style|structure|unknown`);
      if (!Number.isInteger(v.kill_rank) || v.kill_rank < 1) bad.push(`variant ${v.id}: killed requires kill_rank >= 1`);
    }
    if (v.lever_deltas !== undefined && (typeof v.lever_deltas !== 'object' || Array.isArray(v.lever_deltas)))
      bad.push(`variant ${v.id}: lever_deltas must be an object`);
  }
  if (typeof s.null_winner !== 'boolean') bad.push('null_winner boolean required');
  if (s.null_winner) {
    if (winners.length) bad.push('null_winner=true forbids a winner variant');
    if (!Array.isArray(s.axes_to_flip) || !s.axes_to_flip.length)
      bad.push('null_winner=true requires axes_to_flip[] (the re-diverge learning — a vibe is not an artifact)');
  } else if (!s.pending && winners.length !== 1) {
    bad.push(`exactly one winner required (got ${winners.length}) unless null_winner or pending`);
  }
  if (s.pending && (winners.length || s.null_winner)) bad.push('pending=true means no verdict yet — no winner, null_winner=false');
  if (!Number.isInteger(s.rounds) || s.rounds < 1 || s.rounds > 3) bad.push('rounds must be 1..3 (hard cap)');
  if (typeof s.wave2_used !== 'boolean') bad.push('wave2_used boolean required');
  if (!('cost_usd' in s)) bad.push('cost_usd required (number or null — never an adjective)');
  if (!('wall_s' in s)) bad.push('wall_s required (number or null)');
  return bad;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const i = process.argv.indexOf('--session');
  const file = i >= 0 ? process.argv[i + 1] : null;
  if (!file || !existsSync(file)) { console.error('usage: log-atelier-session.mjs --session <session.json>'); process.exit(1); }
  const session = JSON.parse(readFileSync(file, 'utf8'));
  const defects = validate(session);
  if (defects.length) {
    console.error(`[atelier-log] REFUSED — ${defects.length} schema defect(s):`);
    for (const d of defects) console.error(`  - ${d}`);
    process.exit(2);
  }
  appendFileSync(LOG_PATH, JSON.stringify(session) + '\n');
  const n = readFileSync(LOG_PATH, 'utf8').trim().split('\n').length;
  console.log(`[atelier-log] appended session ${session.brief_id} (${session.variants.length} variants) — log now ${n} line(s)`);
}
```

## ARTIFACT 4 — build-archetype-index.mjs (A7 recall)
```js
#!/usr/bin/env node
/**
 * build-archetype-index.mjs — A7 recall generator for the Swan Atelier Studio.
 *
 * Generates, from the CANONICAL monolith `website-archetypes.md`:
 *   1. archetypes/<nn>-<id>.md   — one generated split per numbered archetype
 *   2. archetypes/index.json     — a compact routing table (target ≤2KB)
 *
 * DOCTRINE (R2 rulings, 2026-08-18 — reconciled with the monolith's own
 * consolidation note): the monolith REMAINS the canonical, hand-edited source.
 * The splits and index are GENERATED BUILD ARTIFACTS for agent recall — they
 * cannot rot against the source because they carry its hash and are never
 * hand-edited. Hand edits go to the monolith ONLY; then re-run this script.
 *
 * Usage:  node scripts/design-brain/build-archetype-index.mjs [--check]
 *   --check: verify generated artifacts match the current monolith (exit 2 on drift)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE = join(ROOT, 'docs', 'ai-workflow', 'design-brain', 'website-archetypes.md');
const OUT_DIR = join(ROOT, 'docs', 'ai-workflow', 'design-brain', 'archetypes');

export function parseMonolith(text) {
  const srcSha = createHash('sha256').update(text).digest('hex').slice(0, 12);
  // Numbered archetype sections: "## <n>. <title>"
  const re = /^## (\d+)\. (.+)$/gm;
  const heads = [];
  let m;
  while ((m = re.exec(text)) !== null) heads.push({ n: Number(m[1]), title: m[2].trim(), at: m.index });
  const sections = heads.map((h, i) => {
    const end = i + 1 < heads.length ? heads[i + 1].at : text.indexOf('\n## Closing rules') !== -1 ? text.indexOf('\n## Closing rules') : text.length;
    return { ...h, body: text.slice(h.at, end).trim() };
  });
  return { srcSha, sections };
}

export function slug(title) {
  return title.toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-').slice(0, 4).join('-');
}

export function extractMeta(section) {
  // Thesis: the "Use when:" line, tightly clipped.
  const use = section.body.match(/\*\*Use when:\*\*\s*([^\n]+)/);
  let thesis = use ? use[1].replace(/\s+/g, ' ').trim() : section.title;
  // First sentence if it fits; else word-boundary clip. Keep the index tiny.
  const firstSentence = thesis.match(/^.{10,72}?[.!?](?=\s|$)/);
  if (firstSentence) thesis = firstSentence[0].replace(/[.!?]$/, '');
  if (thesis.length > 72) thesis = thesis.slice(0, 69).replace(/\s+\S*$/, '') + '...';
  // Motion budget: first M0-M3 mention.
  const motion = (section.body.match(/\bM[0-3](?:[–-]M?[0-3])?\b/) || [null])[0];
  // Triggers: distinctive title words + a few from "Use when".
  const stop = new Set(['the', 'a', 'an', 'or', 'and', 'of', 'for', 'any', 'own', 'with', 'site', 'website', 'page', 'surface', 'mode']);
  const words = (section.title + ' ' + (use ? use[1] : ''))
    .toLowerCase().replace(/[^a-z0-9\s/-]/g, ' ').split(/[\s/]+/)
    .filter(w => w.length > 2 && !stop.has(w));
  const triggers = [...new Set(words)].slice(0, 3);
  return { thesis, motion, triggers };
}

export function generate(text) {
  const { srcSha, sections } = parseMonolith(text);
  const files = sections.map(s => {
    const id = slug(s.title);
    const name = `${String(s.n).padStart(2, '0')}-${id}.md`;
    const meta = extractMeta(s);
    const content = [
      `<!-- GENERATED from website-archetypes.md @ ${srcSha} — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->`,
      '',
      s.body,
      '',
    ].join('\n');
    return { name, id, n: s.n, content, ...meta };
  });
  const index = {
    generated_from: 'website-archetypes.md',
    source_sha: srcSha,
    note: 'GENERATED routing table. Read this first; load <=3 matching splits. File = <nn>-<id>.md (zero-padded n). Monolith stays canonical.',
    archetypes: files.map(f => ({ n: f.n, id: f.id, thesis: f.thesis, motion: f.motion, triggers: f.triggers })),
  };
  return { srcSha, files, index };
}

function main() {
  const check = process.argv.includes('--check');
  const text = readFileSync(SOURCE, 'utf8');
  const { srcSha, files, index } = generate(text);
  const indexJson = JSON.stringify(index);

  if (check) {
    const idxPath = join(OUT_DIR, 'index.json');
    if (!existsSync(idxPath)) { console.error('[archetype-index] DRIFT: index.json missing — run the generator'); process.exit(2); }
    const existing = JSON.parse(readFileSync(idxPath, 'utf8'));
    if (existing.source_sha !== srcSha) {
      console.error(`[archetype-index] DRIFT: index @ ${existing.source_sha} != monolith @ ${srcSha} — re-run the generator`);
      process.exit(2);
    }
    console.log(`[archetype-index] CLEAN — index matches monolith @ ${srcSha} (${existing.archetypes.length} archetypes)`);
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  // Remove stale generated splits (renames leave orphans otherwise).
  for (const f of readdirSync(OUT_DIR)) if (f.endsWith('.md')) rmSync(join(OUT_DIR, f));
  for (const f of files) writeFileSync(join(OUT_DIR, f.name), f.content);
  writeFileSync(join(OUT_DIR, 'index.json'), indexJson);
  const kb = (Buffer.byteLength(indexJson) / 1024).toFixed(2);
  console.log(`[archetype-index] generated ${files.length} splits + index.json (${kb} KB) from monolith @ ${srcSha}`);
  if (Buffer.byteLength(indexJson) > 2048) console.warn(`[archetype-index] WARN: index.json is ${kb} KB — over the 2KB routing-table target`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
```

## ARTIFACT 5 — the check-brain-links D2 exemption (diff)
```diff
diff --git a/scripts/design-brain/check-brain-links.mjs b/scripts/design-brain/check-brain-links.mjs
index 0e5e52180..320229168 100644
--- a/scripts/design-brain/check-brain-links.mjs
+++ b/scripts/design-brain/check-brain-links.mjs
@@ -339,7 +339,15 @@ const listedExact = new Set(
 // Compare on the corpus-relative PATH where the index gives one, falling back to basename.
 // Basename-only collapsing let all four index.md files be satisfied by the single root listing.
 const listedPaths = new Set([...indexText.matchAll(/`([A-Za-z0-9._/-]+\.md)`/g)].map((m) => m[1].toLowerCase()));
-const unindexed = mdFiles.filter((f) => !IGNORE.has(f) && !isBackup(f)
+// GENERATED artifacts (archetype splits) are exempt from the index law: they are
+// build outputs of build-archetype-index.mjs, hash-stamped against their source and
+// policed for rot by `--check` + archetype-index.test.mjs — a STRONGER freshness proof
+// than an index row. Hand-listing 21 generated names would re-create the exact rot
+// class this gate kills (regeneration renames -> stale index rows). The exemption is
+// deliberately narrow: archetypes/ dir AND the literal generated-marker first line.
+const isGenerated = (f) => f.startsWith('archetypes/')
+  && readFileSync(join(BRAIN, f), 'utf8').startsWith('<!-- GENERATED from website-archetypes.md');
+const unindexed = mdFiles.filter((f) => !IGNORE.has(f) && !isBackup(f) && !isGenerated(f)
   && !listedPaths.has(f.toLowerCase()) && !(f.indexOf("/") === -1 && listedExact.has(basename(f).toLowerCase())));
 // index.md legitimately cites docs OUTSIDE this folder (the source-of-truth design system,
 // the world-factory skill). Those are cross-references, not orphans — resolve any listed
```

## ARTIFACT 6 — skill-contract lines added (diff)
```diff
diff --git a/.claude/skills/create-with-context/SKILL.md b/.claude/skills/create-with-context/SKILL.md
index 5dc99705d..1bdc09188 100644
--- a/.claude/skills/create-with-context/SKILL.md
+++ b/.claude/skills/create-with-context/SKILL.md
@@ -30,6 +30,12 @@ status, or corrections. Bias to skipping on small work — this is for creation,
 
 ## The five steps
 
+> **A7 recall contract (R2 ruling 2026-08-18):** before proposing any page/surface
+> layout, read `docs/ai-workflow/design-brain/archetypes/index.json` (a ~4KB routing
+> table) and load **≤3** matching `archetypes/<nn>-<id>.md` splits — never the 61KB
+> monolith. A capability is reachable only if the skill that needs it loads it by
+> contract; this line is that contract.
+
 ### 1. GROUND — find what exists, then make it BETTER
 Audit the **real current state** before designing anything. Spawn an `Explore`/audit
 agent (or run `canonical-surface-audit`) to establish: what's actually shipped, what's
diff --git a/.claude/skills/design-dialogue/SKILL.md b/.claude/skills/design-dialogue/SKILL.md
index a7f30f0cc..47649a9a8 100644
--- a/.claude/skills/design-dialogue/SKILL.md
+++ b/.claude/skills/design-dialogue/SKILL.md
@@ -30,6 +30,11 @@ The gap it leaves is a difference in KIND, not degree:
 the reply is *not* "got it" — it is "here is what I think you mean, here is a different way to
 get the same outcome, and here is why you might prefer it."
 
+> **A7 recall contract (R2 ruling 2026-08-18):** before proposing layout alternatives,
+> read `docs/ai-workflow/design-brain/archetypes/index.json` and load **≤3** matching
+> `archetypes/<nn>-<id>.md` splits — the routing table is how proposals stay grounded
+> in the 21 shipped archetypes instead of the model's prior.
+
 ## The method
 
 **1. Reflect the intent back, sharper than he said it.**
```

## ARTIFACT 7 — one smoke skeleton contract + one artboard head (S4 wildcard)
```json
{
  "brief_id": "smoke-apex-stride-2026-08-18",
  "archetype_base": "fitness-coaching (#4, covered)",
  "plate_pack_id": "pack-smoke-01",
  "skeletons": [
    {
      "id": "S1-field-report",
      "nav_model": "side-rail-left",
      "hero_mechanics": "split-asymmetric-text-left-plate-right",
      "chapter_count": 3,
      "grid": "12col-asymmetric-7-5",
      "anti_specs": ["no top nav bar", "hero is NOT full-bleed image with centered text"],
      "wildcard": false
    },
    {
      "id": "S2-open-road",
      "nav_model": "none-anchor-dots-right",
      "hero_mechanics": "full-bleed-plate-overlay-type-baseline-left",
      "chapter_count": 5,
      "grid": "single-column-editorial-680px",
      "anti_specs": ["no navigation bar of any kind", "no card grids anywhere"],
      "wildcard": false
    },
    {
      "id": "S3-ledger",
      "nav_model": "top-bar-dense",
      "hero_mechanics": "no-hero-kpi-strip",
      "chapter_count": 4,
      "grid": "2col-data-grid",
      "anti_specs": ["no hero section at all", "no full-bleed imagery"],
      "wildcard": false
    },
    {
      "id": "S4-cover-issue",
      "nav_model": "masthead-centered",
      "hero_mechanics": "magazine-cover-composite",
      "chapter_count": 3,
      "grid": "cover-plus-2col-features",
      "anti_specs": ["nothing that reads as a SaaS landing page", "no CTA above the fold"],
      "wildcard": true,
      "alien_archetype": "editorial-magazine (fitness studio as a magazine issue)"
    }
  ]
}
```

## REVIEW QUESTIONS
1. Any defect in the built code (logic, edge case, Windows/posix, encoding)? Cite the artifact + line.
2. Does any implementation CONTRADICT an R2 ruling? (The rulings are binding; the code must serve them.)
3. Are the 5 disclosures acceptable v1 scope cuts, or does any make a shipped promise false?
4. The D2 exemption in check-brain-links: is it as narrow as claimed? How would you defeat it?
5. The kill-log schema: what session shape would validate() wrongly accept or wrongly refuse?
6. VERDICT: APPROVE / REVISE / REJECT + the single most important fix if not APPROVE.
