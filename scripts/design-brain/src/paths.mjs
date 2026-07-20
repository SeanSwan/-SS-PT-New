/**
 * paths.mjs — data-root jail for the design-brain engine.
 * ========================================================
 * The engine's data root holds receipts, claims, batches, and the audit ledger. Like client records,
 * this corpus must be structurally incapable of landing anywhere it could be committed or swept into
 * a search index by accident. Same three guarantees as the proven clientNotes jail:
 *   1. never inside ANY git repository (every ancestor walked for `.git`; existsSync follows
 *      junctions, so symlinked roots are caught at their target too);
 *   2. never under a vault/collections path where an indexer would sweep it;
 *   3. explicit root only — no silent default.
 *
 * @module design-brain/paths
 */
import { existsSync, realpathSync } from 'node:fs';
import { resolve, dirname, join, sep } from 'node:path';

const FORBIDDEN_SEGMENTS = ['brain-vault', 'collections', 'node_modules', '.git'];

function hasGitAncestor(absPath) {
  let cur = resolve(absPath);
  for (;;) {
    if (existsSync(join(cur, '.git'))) return true;
    const parent = dirname(cur);
    if (parent === cur) return false;
    cur = parent;
  }
}

function realExistingPath(absPath) {
  let cur = resolve(absPath);
  while (!existsSync(cur)) {
    const parent = dirname(cur);
    if (parent === cur) return cur;
    cur = parent;
  }
  try { return realpathSync(cur); } catch { return cur; }
}

function assertSafe(abs) {
  const segments = abs.split(/[\\/]+/).map((s) => s.toLowerCase());
  for (const bad of FORBIDDEN_SEGMENTS) {
    if (segments.includes(bad)) {
      throw new Error(`design-brain: refusing root under a "${bad}" path (${abs})`);
    }
  }
  if (hasGitAncestor(abs)) {
    throw new Error(`design-brain: refusing — a .git repository is an ancestor of ${abs}`);
  }
}

/** Resolve and validate the engine data root. Throws rather than accepting an unsafe location. */
export function resolveDataRoot(root = process.env.SWAN_DESIGN_BRAIN_ROOT) {
  if (!root || !String(root).trim()) {
    throw new Error('design-brain: data root required (set SWAN_DESIGN_BRAIN_ROOT or pass --root)');
  }
  const abs = resolve(String(root));
  assertSafe(abs);
  const real = realExistingPath(abs);
  if (real !== abs) assertSafe(real);
  return abs;
}

/** True when `child` is inside `root` (used by the writer to jail every write). */
export function isInside(root, child) {
  const r = resolve(root);
  const c = resolve(child);
  return c === r || c.startsWith(r + sep);
}
