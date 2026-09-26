/**
 * worlds.mjs — the World Engine catalog READER.
 *
 * `brain.worlds()` returns "18 DNA recipes + seeded roulette", so there are two
 * halves. This module is the reader: it parses
 * `docs/ai-workflow/design-brain/worlds.md` into families and worlds. The
 * algorithm half — the catalog's own `world-roulette.v1` — lives in the sibling
 * `worldRoulette.mjs`, which imports this module.
 *
 * THE SPLIT IS ONE-DIRECTIONAL ON PURPOSE. The house overflow pattern is to split
 * a module into a sibling, import it for local use, AND re-export it so the old
 * import surface keeps working. That is deliberately NOT done here: the sibling
 * needs `readWorlds`, so re-exporting the sibling from this file would close an
 * import cycle. Callers import the reader from here and the roulette from
 * `worldRoulette.mjs`. A cycle that happens to work is still a cycle.
 *
 * FIELDS ARE LOCATED BY LABEL, NEVER BY LINE OFFSET. An earlier version read the
 * palette law from `lines[i + 2]`; the document actually places it at `i + 4`
 * (heading, meta, DNA, audience, palette), so every world silently received
 * `paletteLaw: 'unspecified'` and the `swan-brand` licence filter then rejected
 * all 18 worlds. A filter that could not read its input was indistinguishable
 * from a filter that rejected everything. A field the document does not carry is
 * now `null` and is reported as unevaluated — never a default that quietly decides.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './paths.mjs';

export const WORLDS_PATH = join(REPO_ROOT, 'docs', 'ai-workflow', 'design-brain', 'worlds.md');

const FAMILY_RE = /^## Family (\d+) — (.+)$/;
const WORLD_RE = /^### (\d+)\. (.+)$/;
const LABEL_RE = /^- \*\*(.+?):\*\* (.*)$/;
const FIELD_META = 'Name + family · Stable ID + retrieval keys · Mood words';
const FIELD_PALETTE = 'Palette law + world palette';

/**
 * Parse the catalog. Read-only, no caching — the file is canon and a cache is a
 * second copy that can disagree with it.
 *
 * @returns {{catalogVersion: string, families: object[], worlds: object[], counts: object}}
 */
export function readWorlds(path = WORLDS_PATH) {
  const text = readFileSync(path, 'utf8');
  // `worlds.md` is CRLF on disk (293 CR / 293 LF, measured). Split on `/\r?\n/`
  // rather than `'\n'`: JavaScript's `.` does NOT match `\r`, so a line that
  // still carries its trailing `\r` cannot satisfy `(.+)$` — `.+` will not
  // consume the CR and `$` will not match before it. Every anchored pattern in
  // this file failed on every line for exactly this reason, and the symptom was
  // a silent `0 families / 0 worlds` rather than an error. Normalise once, here,
  // at the read boundary — not in four separate regexes.
  const lines = text.split(/\r?\n/);

  const versionLine = lines.find((l) => l.includes('**Catalog version:**'));
  const catalogVersion = /`([^`]+)`/.exec(versionLine || '')?.[1] ?? 'unknown';

  const families = [];
  const worlds = [];
  let family = null;
  let entry = null;

  lines.forEach((line) => {
    const f = FAMILY_RE.exec(line);
    if (f) {
      family = { ordinal: Number(f[1]), name: f[2].trim(), worlds: [] };
      families.push(family);
      entry = null;
      return;
    }
    const w = WORLD_RE.exec(line);
    if (w && family) {
      entry = {
        ordinal: Number(w[1]),
        heading: w[2].trim(),
        familyOrdinal: family.ordinal,
        family: family.name,
        fields: {},
      };
      worlds.push(entry);
      family.worlds.push(entry);
      return;
    }
    if (!entry) return;
    const labelled = LABEL_RE.exec(line);
    if (labelled) entry.fields[labelled[1].trim()] = labelled[2].trim();
  });

  for (const w of worlds) {
    const meta = w.fields[FIELD_META];
    const parts = meta ? meta.split('·').map((s) => s.trim()) : [];
    const palette = w.fields[FIELD_PALETTE] ?? null;
    Object.assign(w, {
      name: parts[0] || w.heading.split('—')[0].trim(),
      stableId: parts.find((p) => /^`world\./.test(p))?.replace(/`/g, '') ?? null,
      retrievalKeys: parts.find((p) => /^`[a-z0-9-]+`,/.test(p))?.replace(/`/g, '') ?? null,
      moodWords: parts.length > 1 ? parts[parts.length - 1] : null,
      paletteLaw: palette ? (palette.split(/[.;]/)[0].trim() || null) : null,
      // Measured, not assumed. `null` means the document carried no palette line;
      // a licence we could not read is NOT a licence that failed.
      lawA: palette === null ? null : /Law A/.test(palette),
    });
    delete w.fields;
  }

  return {
    catalogVersion,
    families,
    worlds,
    counts: {
      families: families.length,
      worlds: worlds.length,
      declaredWorlds: 18,
      // A count the catalog declares and the parse disagrees with is the finding,
      // not a rounding error. Reported so the surface can say so.
      matchesDeclared: worlds.length === 18,
      // Surfaced so a partial parse is visible rather than looking like a small catalog.
      unlabelledFields: worlds.filter((w) => w.paletteLaw === null).map((w) => w.stableId),
    },
  };
}
