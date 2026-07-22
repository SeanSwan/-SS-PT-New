/**
 * safeRead.mjs — repo-jailed evidence reader for the Swan Context Gateway.
 * =========================================================================
 * The INVERSE of the design-brain jail (scripts/design-brain/src/paths.mjs): that jail keeps a
 * data root OUT of every git repository; this one keeps every read INSIDE exactly one repository
 * checkout. Threat rows T1/T2/T5 of SWAN-CONTEXT-GATEWAY-PHASE0-2026-07-21.md are enforced here:
 *
 *   T1 traversal / sibling-prefix — containment is decided with path.relative on REAL paths,
 *      never a bare startsWith(resolve(ROOT)) (which lets `SS-PT-evil` pass a `SS-PT` root).
 *   T2 symlink / junction escape — the fully-resolved realpath of the target (and of the root)
 *      must still be contained; a symlink whose target leaves the root is refused even though
 *      its lexical path looks inside.
 *   T5 binary / giant file — NUL-byte sniff over the head of the file plus a byte-size cap;
 *      the read universe is the caller-supplied tracked-file set (git ls-files), so untracked
 *      strays, submodule payloads, and .git internals are outside the universe by construction.
 *
 * DENY-class paths (Rule 59 secret carriers) are refused by name pattern before any open().
 * The module is dependency-free and side-effect-free except for reads; nothing here ever
 * writes, network-calls, or spawns.
 *
 * @module context-gateway/safeRead
 */
import { readFileSync, realpathSync, statSync, lstatSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, relative, isAbsolute, sep } from 'node:path';

/** Rule 59 secret-bearing name patterns — refused unconditionally, even if tracked. */
export const DENY_PATTERNS = [
  /(^|[\\/])\.env($|\.)/i,
  /(^|[\\/])(secrets?|credentials?)($|\.|[\\/])/i,
  /\.(pem|key|p12|pfx|jks|secret|secrets)$/i,
  /(^|[\\/])id_(rsa|ed25519)/i,
  /(^|[\\/])\.(aws|ssh)([\\/]|$)/i,
];

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB cap per evidence source
const SNIFF_BYTES = 8192;

export class SafeReadError extends Error {
  constructor(code, message) {
    super(`[${code}] ${message}`);
    this.code = code; // DENY_PATTERN | OUTSIDE_ROOT | SYMLINK | NOT_TRACKED | BINARY | TOO_LARGE | NOT_FOUND | BAD_RANGE
  }
}

/** True when `child` (absolute, resolved) is inside `parent` (absolute, resolved). Separator-aware. */
export function isContained(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel) && !rel.startsWith(`..${sep}`));
}

/** List tracked files for a repo root via git ls-files (NUL-delimited; no shell). */
export function gitTrackedFiles(root) {
  const out = execFileSync('git', ['-C', root, 'ls-files', '-z'], { maxBuffer: 64 * 1024 * 1024 });
  return new Set(out.toString('utf8').split('\0').filter(Boolean).map((p) => p.replaceAll('\\', '/')));
}

/**
 * Create a reader jailed to one repo checkout.
 * @param {object} opts
 * @param {string} opts.root          absolute path of the repo checkout (must contain .git)
 * @param {Set<string>} opts.tracked  tracked-file universe, repo-relative POSIX paths (git ls-files)
 * @param {number} [opts.maxBytes]    per-file size cap (default 2 MB)
 */
export function createSafeReader({ root, tracked, maxBytes = DEFAULT_MAX_BYTES }) {
  if (!root || !isAbsolute(resolve(root))) throw new SafeReadError('OUTSIDE_ROOT', 'absolute repo root required');
  const rootAbs = resolve(root);
  if (!existsSync(rootAbs) || !existsSync(resolve(rootAbs, '.git'))) {
    throw new SafeReadError('OUTSIDE_ROOT', `root is not a git checkout: ${rootAbs}`);
  }
  const rootReal = realpathSync(rootAbs);
  if (!(tracked instanceof Set)) throw new SafeReadError('NOT_TRACKED', 'tracked-file Set required');

  /** Validate a repo-relative path; returns { rel, abs } or throws SafeReadError. */
  function assertReadable(relPath) {
    const relPosix = String(relPath).replaceAll('\\', '/');
    for (const pat of DENY_PATTERNS) {
      if (pat.test(relPosix)) throw new SafeReadError('DENY_PATTERN', `secret-bearing path refused: ${relPosix}`);
    }
    if (relPosix.split('/').includes('..') || isAbsolute(relPosix)) {
      throw new SafeReadError('OUTSIDE_ROOT', `traversal refused: ${relPosix}`);
    }
    if (!tracked.has(relPosix)) throw new SafeReadError('NOT_TRACKED', `not in tracked universe: ${relPosix}`);
    const abs = resolve(rootReal, relPosix);
    if (!isContained(rootReal, abs)) throw new SafeReadError('OUTSIDE_ROOT', `escapes root: ${relPosix}`);
    if (!existsSync(abs)) throw new SafeReadError('NOT_FOUND', `missing on disk: ${relPosix}`);
    if (lstatSync(abs).isSymbolicLink()) throw new SafeReadError('SYMLINK', `symlink refused: ${relPosix}`);
    const real = realpathSync(abs);
    if (!isContained(rootReal, real)) throw new SafeReadError('SYMLINK', `resolves outside root: ${relPosix}`);
    return { rel: relPosix, abs: real };
  }

  /** Read a 1-indexed inclusive line window. Whole file when start/end omitted. */
  function readWindow(relPath, startLine, endLine) {
    const { rel, abs } = assertReadable(relPath);
    const size = statSync(abs).size;
    if (size > maxBytes) throw new SafeReadError('TOO_LARGE', `${rel} is ${size} bytes (cap ${maxBytes})`);
    const buf = readFileSync(abs);
    if (buf.subarray(0, SNIFF_BYTES).includes(0)) throw new SafeReadError('BINARY', `NUL byte in ${rel}`);
    const lines = buf.toString('utf8').split(/\r?\n/);
    const start = startLine ?? 1;
    const end = endLine ?? lines.length;
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || start > lines.length) {
      throw new SafeReadError('BAD_RANGE', `${rel}: L${start}-L${end} outside 1-${lines.length}`);
    }
    return { path: rel, startLine: start, endLine: Math.min(end, lines.length), content: lines.slice(start - 1, Math.min(end, lines.length)).join('\n'), totalLines: lines.length };
  }

  return { root: rootReal, assertReadable, readWindow };
}
