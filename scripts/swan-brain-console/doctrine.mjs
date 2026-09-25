/**
 * doctrine — read-only view of the Design Brain's doctrine surface.
 * @module scripts/swan-brain-console/doctrine
 *
 * The console's Doctrine tab must never hold its own copy of the design system, or
 * it becomes a tenth theme (see the standing lesson: "two successors beside the
 * original is how a tenth theme appears"). This module reads the real files and
 * reports what is actually there, including the archetype routing table the
 * atelier loop says to consult first.
 *
 * Counts are computed at read time. A number that a human maintains by hand is a
 * number that goes stale invisibly — that was the finding that motivated this
 * console in the first place.
 *
 * BOUNDS: reads files under docs/ and scripts/design-brain/. No network, no writes.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DESIGN_BRAIN = 'docs/ai-workflow/design-brain';
const ARCHETYPES = `${DESIGN_BRAIN}/archetypes`;
const ENGINE_CONFIG = 'scripts/design-brain/config';

/** Canonical doctrine documents, in load order. */
export const DOCTRINE_FILES = [
  { id: 'design', path: `${DESIGN_BRAIN}/design.md`, role: 'tokens, modes, components, states' },
  { id: 'motion', path: `${DESIGN_BRAIN}/motion.md`, role: 'motion tiers, GPU-safe rules' },
  { id: 'components', path: `${DESIGN_BRAIN}/components.md`, role: 'component pattern index' },
  { id: 'anti-patterns', path: `${DESIGN_BRAIN}/anti-patterns.md`, role: 'the banned list with WHY' },
  { id: 'qa-gates', path: `${DESIGN_BRAIN}/qa-gates.md`, role: 'responsive + a11y gates' },
  { id: 'cinematic-pages', path: `${DESIGN_BRAIN}/cinematic-pages.md`, role: 'story-arc page generation' },
  { id: 'website-archetypes', path: `${DESIGN_BRAIN}/website-archetypes.md`, role: 'archetype recipes (monolith)' },
  { id: 'external-reference-mcp', path: `${DESIGN_BRAIN}/external-reference-mcp.md`, role: 'Mobbin reference gate' },
  { id: 'worlds', path: `${DESIGN_BRAIN}/worlds.md`, role: 'named visual worlds' },
  { id: 'style-taxonomy', path: `${DESIGN_BRAIN}/style-taxonomy.md`, role: 'style classification' },
];

function tryRead(path) {
  try {
    return existsSync(path) ? readFileSync(path, 'utf8') : null;
  } catch {
    return null;
  }
}

/** Line and heading counts for one doctrine file, without dumping its body. */
function describe(repo, entry) {
  const text = tryRead(join(repo, entry.path));
  if (text === null) return { ...entry, present: false, lines: 0, headings: 0 };
  const headings = text.split('\n').filter((l) => /^#{1,3}\s/.test(l)).length;
  return { ...entry, present: true, lines: text.split('\n').length, headings };
}

/**
 * The archetype routing table — the atelier loop's first read (A7 recall contract).
 *
 * THREE NAMED STATES, AND `status` IS THE ONE TO READ (round 11, finding F17).
 *
 * This used to report a parse failure as `{ present: true, count: 0, error: … }`, and the
 * renderer keyed its warning off `present`. So a CORRUPT catalogue and a HEALTHY one looked
 * identical on screen: the panel read `Archetypes | 0 | generated from undefined` — no warning,
 * no error, and a number that an operator would read as "the routing table is empty" rather than
 * "the routing table could not be parsed". Astra reproduced that, and separately showed a missing
 * config directory rendering as `Spec mode | undefined`.
 *
 * `missing` and `invalid` are different facts with different fixes (restore the file vs repair
 * it), so they are different values rather than one falsy flag. `count` is still always present,
 * because a caller should not have to branch to get a number.
 */
function readArchetypes(repo) {
  const raw = tryRead(join(repo, ARCHETYPES, 'index.json'));
  const blank = {
    count: 0, generatedFrom: null, relevant: [], sample: [], error: null,
  };
  if (raw === null) {
    return { ...blank, status: 'missing', error: `${ARCHETYPES}/index.json is not present` };
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...blank, status: 'invalid', error: 'index.json is not valid JSON' };
  }
  if (!Array.isArray(parsed?.archetypes)) {
    // Parsed, but not the shape the loop reads. Distinct from both above: the file is fine and
    // the CONTRACT has changed, which is the failure a `try/catch` alone would have called "ok".
    return { ...blank, status: 'invalid', generatedFrom: parsed?.generated_from ?? null, error: 'index.json has no `archetypes` array' };
  }
  const list = parsed.archetypes;
  return {
    ...blank,
    status: 'ok',
    generatedFrom: parsed.generated_from ?? 'unknown',
    count: list.length,
    // The two that matter for a front-page fleet.
    relevant: list
      .filter((a) => ['cinematic-3d-scroll-website', 'fitness-coaching-website'].includes(a.id))
      .map((a) => ({ n: a.n, id: a.id, motion: a.motion, thesis: a.thesis })),
    sample: list.slice(0, 5).map((a) => `${String(a.n).padStart(2, '0')} ${a.id}`),
  };
}

/** Engine config surface, so the console can show what the loop is allowed to do. */
function readEngineConfig(repo) {
  const dir = join(repo, ENGINE_CONFIG);
  /*
   * `specModeEnabled` IS ALWAYS PRESENT, and `null` means "unknown" (round 11, finding F17).
   * Returning `{ present: false, files: [] }` with the key absent made the renderer read
   * `undefined`, which it printed as the literal string `undefined` — a missing config directory
   * displayed as a value. `null` is a statement; a missing key is an accident.
   */
  if (!existsSync(dir)) return { present: false, files: [], specModeEnabled: null };
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  const specMode = tryRead(join(dir, 'spec-mode.json'));
  let enabled = null;
  if (specMode) {
    try { enabled = JSON.parse(specMode).enabled ?? null; } catch { enabled = null; }
  }
  return { present: true, files, specModeEnabled: enabled };
}

/** Everything the Doctrine tab renders. */
export function readDoctrine(repo) {
  const files = DOCTRINE_FILES.map((e) => describe(repo, e));
  const present = files.filter((f) => f.present);
  return {
    files,
    presentCount: present.length,
    declaredCount: files.length,
    totalLines: present.reduce((n, f) => n + f.lines, 0),
    archetypes: readArchetypes(repo),
    engineConfig: readEngineConfig(repo),
  };
}
