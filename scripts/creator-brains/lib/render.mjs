#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/render.mjs
 * PURPOSE: Render a built brain, VALIDATE it against its sources, and publish
 *          it as an immutable generation behind an atomic pointer.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR07/08/09/25)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * THREE DEFECTS THIS REWRITE CLOSES:
 *
 *   HR07 — the storage namespace is the CHANNEL ID, never a display name.
 *     Two channels both called "Common Name" wrote the same `brains/common-name/`
 *     directory and the second erased the first. The old guard only handled
 *     titles that `slugify` could not transliterate, which is a different
 *     problem. Names are LABELS now; `brains/<channelId>/` is identity.
 *
 *   HR08/HR25 — publication is a GENERATION, not four loose files.
 *     The old renderer wrote four files one at a time. A kill between them left
 *     index.md from the new build beside timeline.md from the old — a mixture
 *     that reads as a coherent brain and is not one. Now the files are built in
 *     memory, validated, written into a new `gen-NNNN/` directory, and only then
 *     does an atomic `current.json` swap make them live. An interrupted build
 *     leaves the PREVIOUS generation intact and current.
 *
 *   HR09 — the fidelity gate runs over the FINAL BYTES of every file.
 *     Not over one field in one function: over everything that will be published,
 *     after rendering, including titles, labels and gap reasons. A generation
 *     that fails is quarantined with a diagnosis instead of published.
 *
 * @module creator-brains/render
 */

import { join } from 'node:path';
import { ensureDir, listDir, paths, readJson, writeJsonAtomic, writeTextAtomic } from './paths.mjs';
import { checkGeneration, MAX_SHARED_RUN } from './fidelity.mjs';
// What THIS module's own code needs (pointer schema, capped titles, the map).
import { BRAIN_SCHEMA_VERSION, safeTitle, RENDERERS } from './renderers.mjs';

// What callers may keep importing from here — the filesystem-free renderers now
// live in renderers.mjs, and this module stays their import surface.
export {
  MAX_TITLE_WORDS, BRAIN_SCHEMA_VERSION, safeTitle, RENDERERS, esc,
  renderIndex, renderTopics, renderTimeline, renderRules,
} from './renderers.mjs';

/** Lane C title budget. A first-line control only; the fidelity gate is the real
 *  one, because it also covers fields this module never sees. */

// ─────────────────────────────────────────────────────────────────────────────
// Publication
// ─────────────────────────────────────────────────────────────────────────────

export const brainDir = (r, namespace) => join(paths(r).brainsDir, namespace);
export const pointerPath = (r, namespace) => join(brainDir(r, namespace), 'current.json');

export function readPointer(r, namespace) {
  return readJson(pointerPath(r, namespace), null);
}

/** Every published brain pointer, with its live generation directory. */
export function listPublished(r) {
  const base = paths(r).brainsDir;
  const out = [];
  for (const ns of listDir(base)) {
    const ptr = readJson(join(base, ns, 'current.json'), null);
    if (ptr && ptr.generation) out.push({ namespace: ns, dir: join(base, ns, ptr.generation), pointer: ptr });
  }
  return out;
}

function nextGeneration(dir) {
  const existing = listDir(dir).filter((n) => /^gen-\d{4}$/.test(n)).sort();
  const last = existing.length ? Number(existing[existing.length - 1].slice(4)) : 0;
  return `gen-${String(last + 1).padStart(4, '0')}`;
}

/**
 * Render, validate and publish one brain generation.
 *
 * @param brain    the object `buildBrain` produced
 * @param sources  raw transcript texts it was derived from — the corpus the
 *                 fidelity gate compares against. Lane B never leaves this call.
 * @returns { ok, generation, files, dir, quarantined, failures }
 */
export function publishBrain(brain, { r, sources = [], now = null, maxRun = MAX_SHARED_RUN } = {}) {
  const at = typeof now === 'function' ? now() : (now || Date.now());
  const ns = brain.namespace || brain.creatorId;
  const dir = brainDir(r, ns);
  ensureDir(dir);

  // 1. Render to memory. Nothing touches the published tree yet.
  const files = Object.entries(RENDERERS).map(([name, fn]) => ({ name, text: fn(brain, at) }));

  // 2. Validate the FINAL BYTES against the source corpus (HR09).
  const verdict = checkGeneration(files, sources, { maxRun });
  if (!verdict.ok) {
    const qDir = ensureDir(join(dir, 'quarantine'));
    const qPath = join(qDir, `${new Date(at).toISOString().replace(/[:.]/g, '-')}-${verdict.failures[0].name}.json`);
    writeJsonAtomic(qPath, {
      at: new Date(at).toISOString(),
      creatorId: ns,
      reason: 'fidelity_gate',
      limit: maxRun,
      failures: verdict.failures,
      // The offending text is deliberately NOT stored here: a quarantine file is
      // a diagnostic, not a second unvalidated copy of what we rejected.
      fileSizes: files.map((f) => ({ name: f.name, bytes: f.text.length })),
    });
    return { ok: false, generation: null, dir, files: [], quarantined: qPath, failures: verdict.failures };
  }

  // 3. Write the new generation into its own directory.
  const generation = nextGeneration(dir);
  const genDir = ensureDir(join(dir, generation));
  for (const f of files) writeTextAtomic(join(genDir, f.name), f.text);

  // 4. Swap the pointer LAST. Until this succeeds the previous generation is
  //    what readers see, so an interrupted publish is invisible.
  const pointer = {
    schema_version: BRAIN_SCHEMA_VERSION,
    creator_id: ns,
    label: brain.slug,
    title: safeTitle(brain.title),
    generation,
    files: files.map((f) => f.name),
    publishedAt: new Date(at).toISOString(),
    stats: {
      videos: brain.timeline.length,
      claims: brain.claims.length,
      doctrine: brain.doctrine.length,
      gaps: (brain.gaps || []).length,
      invalidDocs: (brain.invalidDocs || []).length,
    },
  };
  writeJsonAtomic(pointerPath(r, ns), pointer);

  return {
    ok: true, generation, pointer, dir: genDir, files: files.map((f) => join(genDir, f.name)), quarantined: null, failures: [],
  };
}

/** Publish an explicitly EMPTY generation — used when a creator's documents
 *  disappeared, so the brain says "nothing" rather than leaving a stale previous
 *  generation readable (review HR08). */
export function publishEmpty(r, { channelId, title = null, slug = null, reason = 'no documents', now = null } = {}) {
  const brain = {
    namespace: channelId,
    creatorId: channelId,
    title: title || channelId,
    slug: slug || channelId,
    handle: null,
    generatedAt: new Date(typeof now === 'function' ? now() : (now || Date.now())).toISOString(),
    docCount: 0,
    claims: [],
    topics: [],
    doctrine: [],
    timeline: [],
    gaps: [{ videoId: '-', state: 'no_documents', reason }],
    invalidDocs: [],
    dropped: 0,
  };
  return publishBrain(brain, { r, sources: [], now });
}

/**
 * Store-backed publication under the previous NAME.
 *
 *   `renderBrain(brain, { r })` still works, and it is strictly SAFER than the
 *   version that carried that name: it reads the creator's documents through the
 *   validating reader, so the fidelity gate has a real source corpus to compare
 *   against. A caller that already holds validated documents should call
 *   `publishBrain` and pass them; this overload exists so an instrument written
 *   against the old API is not forced to change its call site to get the new
 *   guarantees.
 */
export function renderBrain(brain, { r, now = null, maxRun = MAX_SHARED_RUN } = {}) {
  const namespace = brain.namespace || brain.creatorId;
  const dir = join(paths(r).docsDir, namespace);
  const sources = [];
  for (const file of listDir(dir)) {
    if (!file.endsWith('.json')) continue;
    const doc = readJson(join(dir, file), null);
    if (doc && typeof doc.text === 'string') sources.push(doc.text);
  }
  return publishBrain(brain, { r, sources, now, maxRun });
}
