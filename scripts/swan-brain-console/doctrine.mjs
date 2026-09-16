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

/** The archetype routing table — the atelier loop's first read (A7 recall contract). */
function readArchetypes(repo) {
  const raw = tryRead(join(repo, ARCHETYPES, 'index.json'));
  if (!raw) return { present: false, count: 0, sample: [] };
  try {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed.archetypes) ? parsed.archetypes : [];
    return {
      present: true,
      generatedFrom: parsed.generated_from ?? 'unknown',
      count: list.length,
      // The two that matter for a front-page fleet.
      relevant: list
        .filter((a) => ['cinematic-3d-scroll-website', 'fitness-coaching-website'].includes(a.id))
        .map((a) => ({ n: a.n, id: a.id, motion: a.motion, thesis: a.thesis })),
      sample: list.slice(0, 5).map((a) => `${String(a.n).padStart(2, '0')} ${a.id}`),
    };
  } catch {
    return { present: true, count: 0, sample: [], error: 'index.json is not valid JSON' };
  }
}

/** Engine config surface, so the console can show what the loop is allowed to do. */
function readEngineConfig(repo) {
  const dir = join(repo, ENGINE_CONFIG);
  if (!existsSync(dir)) return { present: false, files: [] };
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
