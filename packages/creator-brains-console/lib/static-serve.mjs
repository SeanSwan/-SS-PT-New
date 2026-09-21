/**
 * static-serve.mjs — serving files out of the web build, extracted from `http.mjs`
 * when that file crossed the 300-line cap (Rule 4) adding real-path containment.
 *
 * This cluster is self-contained: the web root constant, the MIME table, the resolver,
 * and the two readers. `http.mjs` re-exports the same names, so no import site changes.
 *
 * The containment record lives on `resolveStatic` below — the junction defect is the
 * reason this file is worth keeping whole rather than trimming.
 *
 * @module creator-brains-console/lib/static-serve
 */

import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { join, dirname, extname, resolve, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** The web build's output dir. Absent until slice S1 — handled, not assumed. */
export const WEB_DIST = join(HERE, '..', 'web', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};
/**
 * Resolve a URL path to a file inside WEB_DIST, or null.
 *
 * Containment is checked on the RESOLVED absolute path, not on the raw string —
 * string-prefix checks on the request URL are defeated by encodings and by
 * Windows separator handling. Anything that escapes resolves to null, so the
 * caller falls through to the status page rather than the filesystem.
 *
 * THE CHECK IS ON THE REAL PATH, NOT ONLY THE PATH STRING (round 9, Astra P2 #2).
 * `readStatic()` FOLLOWS a link, so a junction at `dist/linked -> ../outside` made
 * every lexical test pass while the read left the root — measured: the resolver
 * returned `...\dist\linked\secret.txt`, `escapes()` called it INSIDE, and the read
 * returned the outside file's contents. No spelling-based test can catch that, which
 * is why `lib/containment.mjs` exists; this mirrors `containedPath`, except that the
 * contract here is `null` rather than a throw. The realpath check runs AFTER the
 * existsSync test because `realpathSync` raises ENOENT for an absent target, and an
 * absent target is the ordinary "no such static file" path, not a containment event.
 */
export function resolveStatic(urlPath, dist = WEB_DIST) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null; // malformed percent-encoding
  }
  const clean = normalize(decoded).replace(/^([.][.][/\\])+/, '');
  const base = resolve(dist);
  const target = resolve(join(base, clean === '/' || clean === '\\' ? 'index.html' : clean));

  if (target !== base && !target.startsWith(base + sep)) return null;
  if (!existsSync(target)) return null;

  // The lexical test above cannot see a link. Resolve both sides and re-check.
  // A resolution FAILURE is refused rather than skipped: `containment.mjs` records
  // that treating an unanticipated error as "cannot check" is a guard that switches
  // itself off, and this is an egress surface.
  let realTarget;
  let realBase;
  try {
    realTarget = realpathSync(target);
    realBase = realpathSync(base);
  } catch {
    return null;
  }
  if (realTarget !== realBase && !realTarget.startsWith(realBase + sep)) return null;
  return target;
}

export function contentTypeFor(file) {
  return MIME[extname(file)] || 'application/octet-stream';
}

export function readStatic(file) {
  return readFileSync(file);
}
