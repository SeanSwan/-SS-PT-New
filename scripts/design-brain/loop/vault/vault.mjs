/**
 * vault/vault.mjs — the exemplar vault: "good" as pictures, not adjectives (S5).
 * =============================================================================
 * BLUEPRINT: DESIGN-BRAIN-UPGRADE-BLUEPRINT-2026-08-21.md §S5 (SWA-185).
 *
 * The panel's positive bar. Every prior attempt to steer this system used
 * doctrine adjectives ("cinematic", "crystalline") which a generator resolves
 * into glow + blur — the exact slop the loop exists to refuse. The vault
 * replaces the adjective with a ranked picture: Sean marks pages/plates
 * win | fail | borderline, and THOSE become the steering signal.
 *
 * Two laws are enforced here and nowhere else:
 *   1. LICENSING — `source` is a closed enum and `scraped` is not in it. A
 *      scraped exemplar is a legal liability wearing a training signal's
 *      clothes; the validator names it rather than silently dropping it.
 *   2. FIXTURES ARE NOT TASTE — placeholder exemplars committed so the
 *      validator and its consumers can be tested are marked `source: fixture`
 *      and are EXCLUDED from consumption unless a caller opts in explicitly.
 *      The opt-in is recorded downstream, so a run steered by fixtures is
 *      visibly not a production run.
 *
 * Pure functions over a directory tree; no network, no LLM (deterministic
 * tier — blueprint §1.7). `validateX(obj) -> defects[]` house style.
 */
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const VERDICTS = Object.freeze(['win', 'fail', 'borderline']);

/** Closed source enum. `scraped` is deliberately ABSENT — see law 1 above. */
export const SOURCES = Object.freeze(['first-party', 'licensed', 'fixture']);

const IMAGE_EXT = Object.freeze(['.png', '.jpg', '.jpeg', '.webp']);

export const REQUIRED_FIELDS = Object.freeze([
  'id', 'verdict', 'skeleton_family', 'signature_moment', 'why', 'source', 'ranked_by', 'ranked_at',
]);

const isStr = (v) => typeof v === 'string' && v.length > 0;

/**
 * Validate one sidecar. `verdictDir` is the directory it was found in — a
 * sidecar whose verdict disagrees with its folder is a filing error that would
 * silently invert the training signal, so it is a defect, not a warning.
 */
export function validateSidecar(s, { verdictDir, imagePresent } = {}) {
  const bad = [];
  if (!s || typeof s !== 'object') return ['sidecar is not an object'];
  for (const f of REQUIRED_FIELDS) {
    if (!isStr(s[f])) bad.push(`${s.id ?? '<no id>'}: ${f} required`);
  }
  if (s.verdict && !VERDICTS.includes(s.verdict)) bad.push(`${s.id}: verdict must be ${VERDICTS.join('|')} (got "${s.verdict}")`);
  if (verdictDir && s.verdict && s.verdict !== verdictDir) {
    bad.push(`${s.id}: verdict "${s.verdict}" contradicts its folder "${verdictDir}" — a misfiled exemplar inverts the signal`);
  }
  if (s.source && !SOURCES.includes(s.source)) {
    const why = s.source === 'scraped'
      ? 'scraped exemplars are refused outright (licensing) — re-shoot it first-party or license it'
      : `source must be ${SOURCES.join('|')}`;
    bad.push(`${s.id}: ${why} (got "${s.source}")`);
  }
  if (imagePresent === false) bad.push(`${s.id ?? '<no id>'}: sidecar has no image file beside it — a ranking with no picture is an adjective again`);
  return bad;
}

/** Read one verdict directory into {exemplars, defects}. Pairs images <-> sidecars both ways. */
function readVerdictDir(root, verdict) {
  const dir = join(root, verdict);
  const out = { exemplars: [], defects: [] };
  if (!existsSync(dir)) return out;
  // statSync throws on a broken symlink, which would break this function's
  // "never throws" contract and take the whole run down over one bad link.
  const entries = readdirSync(dir).filter((f) => {
    try { return statSync(join(dir, f)).isFile(); } catch { return false; }
  });
  const images = entries.filter((f) => IMAGE_EXT.includes(extname(f).toLowerCase()));
  const sidecars = entries.filter((f) => extname(f).toLowerCase() === '.json');
  const stem = (f) => basename(f, extname(f));
  const sidecarStems = new Set(sidecars.map(stem));

  for (const img of images) {
    if (!sidecarStems.has(stem(img))) {
      out.defects.push(`${verdict}/${img}: image has no sidecar — an unranked picture cannot steer anything`);
    }
  }
  for (const side of sidecars) {
    const s = stem(side);
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(join(dir, side), 'utf8'));
    } catch (err) {
      out.defects.push(`${verdict}/${side}: unreadable sidecar (${err.message})`);
      continue;
    }
    const image = images.find((f) => stem(f) === s) ?? null;
    const defects = validateSidecar(parsed, { verdictDir: verdict, imagePresent: Boolean(image) });
    if (defects.length) { out.defects.push(...defects.map((d) => `${verdict}/${side}: ${d}`)); continue; }
    out.exemplars.push({ ...parsed, image_path: join(dir, image), rel: `${verdict}/${image}` });
  }
  return out;
}

/**
 * Read the whole vault. Never throws — returns defects so the caller decides
 * whether a defective vault is fatal (materials: yes) or reportable (CLI: yes).
 */
export function readVault(root) {
  const all = { exemplars: [], defects: [], root };
  if (!existsSync(root)) return { ...all, defects: [`vault root does not exist: ${root}`] };
  for (const v of VERDICTS) {
    const part = readVerdictDir(root, v);
    all.exemplars.push(...part.exemplars);
    all.defects.push(...part.defects);
  }
  const seen = new Map();
  for (const e of all.exemplars) {
    if (seen.has(e.id)) all.defects.push(`duplicate exemplar id "${e.id}" (${seen.get(e.id)} and ${e.rel})`);
    seen.set(e.id, e.rel);
  }
  return all;
}

/**
 * The consumption gate. Fixtures are excluded unless a caller opts in loudly.
 * `ranked_by` must name a human — a self-ranked exemplar is the system grading
 * its own homework, which is how a taste loop learns to like its own slop.
 */
export function consumable(exemplars, { allowFixtures = false } = {}) {
  return exemplars.filter((e) => (e.source !== 'fixture' || allowFixtures) && e.ranked_by !== 'system');
}

/** Family of a mechanics string — matches ir.mjs's family() so vault and IR agree on "family". */
export const familyOf = (s) => String(s ?? '').toLowerCase().split('-').slice(0, 2).join('-');

/**
 * Select steering exemplars for a direction. Exact family match first, then
 * any-family fallback of the same verdict — a `win` from another family still
 * carries more signal than an adjective. Returns [] rather than throwing;
 * refusing to render is the CALLER's decision (materials.mjs owns that gate).
 */
export function selectExemplars(exemplars, { skeleton_family, verdict = 'win', limit = 3 } = {}) {
  const fam = familyOf(skeleton_family);
  const sameVerdict = exemplars.filter((e) => e.verdict === verdict);
  const exact = sameVerdict.filter((e) => familyOf(e.skeleton_family) === fam);
  return [...exact, ...sameVerdict.filter((e) => !exact.includes(e))].slice(0, limit);
}

// ---------------------------------------------------------------------------
// CLI: `node scripts/design-brain/loop/vault/vault.mjs [--root <dir>]`
// Exit 0 = vault is consumable. Exit 2 = defects (named, one per line).
// ---------------------------------------------------------------------------
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const i = process.argv.indexOf('--root');
  const root = i >= 0 ? process.argv[i + 1] : join(dirname(fileURLToPath(import.meta.url)), 'exemplars', 'swan');
  const v = readVault(root);
  const real = consumable(v.exemplars);
  const counts = VERDICTS.map((k) => `${k} ${v.exemplars.filter((e) => e.verdict === k).length}`).join(' · ');
  console.log(`[vault] ${root}`);
  console.log(`[vault] ${v.exemplars.length} exemplar(s): ${counts}`);
  console.log(`[vault] consumable (fixtures excluded): ${real.length}`);
  if (!real.length) console.log('[vault] NOTE: no real exemplars yet — awe_photo surfaces will fail loudly until Sean ranks. That is the designed behaviour, not a bug.');
  if (v.defects.length) {
    console.error(`[vault] ${v.defects.length} defect(s):`);
    for (const d of v.defects) console.error(`  - ${d}`);
    process.exit(2);
  }
  console.log('[vault] OK');
}
