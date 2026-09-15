#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/manifest.mjs
 * PURPOSE: What this engine has published, per creator namespace — the record
 *          that lets stale artifacts be reaped from HISTORY.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR08/HR25)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY THIS IS NOT IN store.mjs:
 *   `export.mjs` needs the manifest and must NOT be able to reach Lane B. When
 *   these functions lived in `store.mjs`, export had to import that module — and
 *   a test asserting "export.mjs does not import the Lane B reader" failed,
 *   correctly. The import-graph property is a real defence in depth even though
 *   the PRIMARY control is now the fidelity gate over published bytes (the
 *   reviewer's HR09 note: an import check "is not a content/trust boundary").
 *   Moving the manifest out restores the property without pretending it is the
 *   whole boundary.
 *
 * @module creator-brains/manifest
 */

import { paths, readJson, writeJsonAtomic } from './paths.mjs';

/**
 * The published-artifact manifest.
 *
 * Returns `{ version, artifacts, generations }` where `artifacts` maps an
 * absolute staged path to `{ writtenAt }`. Cleanup reads THIS rather than the
 * current creator list, because a renamed or removed creator leaves no trace in
 * that list — which is exactly the case cleanup exists for (review HR08).
 */
export function readManifest(r) {
  const doc = readJson(paths(r).manifest, null);
  if (!doc || typeof doc !== 'object' || typeof doc.artifacts !== 'object') {
    return { version: 1, artifacts: {}, generations: {} };
  }
  return { version: 1, artifacts: doc.artifacts || {}, generations: doc.generations || {} };
}

export function saveManifest(manifest, r) {
  return writeJsonAtomic(paths(r).manifest, {
    version: 1,
    artifacts: manifest.artifacts || {},
    generations: manifest.generations || {},
  });
}

/** Paths this engine is recorded as having written. */
export function ownedPaths(manifest) {
  return new Set(Object.keys((manifest && manifest.artifacts) || {}));
}
