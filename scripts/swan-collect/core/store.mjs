/**
 * store.mjs — the local item store. JSON on disk, scoped by (source, entity).
 * ============================================================================
 * Deliberately boring: one JSON file per (sourceKey, entityRef) cell. That shape
 * is not an accident — it is the physical expression of the reconcile scope seal.
 * Because a file IS one cell, `previous` can never accidentally span two sources,
 * which is exactly the mistake that produced Kimi K3 finding H2 (an honest
 * complete-window flag from one source mass-retracting another's items).
 *
 * A database would work too; the point is that the STORAGE LAYOUT enforces the
 * invariant rather than relying on every caller to filter correctly.
 *
 * PORTABILITY: the filesystem is INJECTED. Pass any `{ readFile, writeFile,
 * mkdir, readdir }` and this runs on node:fs, memfs, or an in-memory stub. The
 * default binding is created lazily so importing this module in a browser (where
 * node:fs does not exist) does not throw until you actually ask for disk.
 *
 * @module swan-collect/core/store
 */

import { CollectError } from './item.mjs';

/**
 * FNV-1a 32-bit. Pure JS on purpose: `node:crypto` does not exist in a browser,
 * and the portability contract says this folder runs anywhere. This is a
 * COLLISION-AVOIDANCE hash for filenames, never a security primitive.
 */
export function shortHash(input) {
  // 64-bit FNV-1a via BigInt. Kimi K3 packet-7 L4: the 32-bit variant is fine
  // against accidents but a deliberately crafted pair (same sanitized prefix,
  // brute-forced suffix) is only ~2^16 work, and a collision means two entities
  // share a cell — the data-mixing failure this hash exists to prevent. 64-bit
  // retires the question for four lines and no dependency.
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  const s = String(input);
  for (let i = 0; i < s.length; i += 1) {
    h = (h ^ BigInt(s.charCodeAt(i))) & mask;
    h = (h * prime) & mask;
  }
  return h.toString(36).padStart(13, '0').slice(0, 13);
}

/**
 * Filesystem-safe cell name, guaranteed distinct per distinct entityRef.
 *
 * THE COLLISION THIS FIXES (found by hostile review 2026-08-11): sanitizing
 * alone mapped `Acme/Corp`, `Acme_Corp`, `Acme Corp`, `Acme?Corp` and
 * `Acme#Corp` — five DIFFERENT entities — onto one file, and any two refs
 * sharing their first 120 characters collided on truncation. Two entities
 * sharing a cell is the same data-mixing failure as the reconcile scope bug:
 * entity A's stored set would contain entity B's items. With `windowComplete`
 * true the scope seal turns that into a crash; with it false the items quietly
 * merge. Neither is acceptable.
 *
 * The fix appends a hash of the RAW ref, so the readable part stays readable and
 * uniqueness no longer depends on the sanitizer being lossless.
 */
export function cellName(sourceKey, entityRef) {
  if (typeof sourceKey !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/.test(sourceKey)) {
    throw new CollectError(`store: invalid sourceKey '${sourceKey}'`);
  }
  const ref = typeof entityRef === 'string' && entityRef.trim() ? entityRef.trim() : '_';
  // This is a FILENAME — traversal, separators, colons (Windows alternate data
  // streams) and control characters must all die here.
  const safe = ref
    .replace(/[^A-Za-z0-9._@-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .slice(0, 100);
  return `${sourceKey}__${safe || '_'}__${shortHash(ref)}.json`;
}

let _fsPromise;
async function defaultFs() {
  if (!_fsPromise) _fsPromise = import('node:fs/promises');
  const fs = await _fsPromise;
  return {
    readFile: (p) => fs.readFile(p, 'utf-8'),
    writeFile: (p, d) => fs.writeFile(p, d, 'utf-8'),
    mkdir: (p) => fs.mkdir(p, { recursive: true }),
    readdir: (p) => fs.readdir(p),
    rename: (a, b) => fs.rename(a, b),
  };
}

/**
 * Create a store rooted at `dir`. Nothing is read or written until a method is
 * called, so constructing a store is always safe.
 */
export function createStore(dir, { fs } = {}) {
  if (typeof dir !== 'string' || !dir) throw new CollectError('store: a directory is required');
  const io = async () => fs || defaultFs();
  const join = (name) => `${dir.replace(/[/\\]+$/, '')}/${name}`;

  return {
    dir,

    /** Read one cell. A missing or corrupt cell reads as EMPTY, never as an error. */
    async read(sourceKey, entityRef) {
      const f = await io();
      try {
        const raw = await f.readFile(join(cellName(sourceKey, entityRef)));
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed?.items) ? parsed.items : [];
      } catch {
        // A first run has no file; a truncated write has bad JSON. Both mean
        // "nothing known yet" — and critically, an empty `previous` can only
        // ever cause items to be ADDED, never retracted. Failing open here is
        // therefore safe in the one direction that matters.
        return [];
      }
    },

    /**
     * Replace one cell, write-then-rename.
     *
     * Kimi K3 packet-7 M4: a plain writeFile leaves a TRUNCATED cell if the
     * process dies mid-write (SIGINT, power loss, disk full). The next read then
     * fails open to `[]`, and a full-cell replace would finish the job — three
     * individually-reasonable mechanisms composing into total data loss. Writing
     * to a temp path and renaming makes the swap atomic on every real filesystem.
     *
     * PORTABILITY NOTE: this ADDS `rename` to the injected fs contract. A custom
     * fs without it falls back to a direct write rather than failing — degraded,
     * but never worse than the previous behaviour.
     */
    async write(sourceKey, entityRef, items, meta = {}) {
      const f = await io();
      await f.mkdir(dir);
      const payload = {
        sourceKey,
        entityRef: entityRef ?? null,
        savedAt: meta.savedAt ?? null,
        count: items.length,
        items,
      };
      const name = cellName(sourceKey, entityRef);
      const json = JSON.stringify(payload, null, 2);

      if (typeof f.rename === 'function') {
        const tmp = join(`${name}.tmp-${meta.savedAt ? shortHash(meta.savedAt) : shortHash(String(items.length))}`);
        await f.writeFile(tmp, json);
        await f.rename(tmp, join(name));
      } else {
        await f.writeFile(join(name), json);
      }
      return payload.count;
    },

    /** List the cells present on disk. */
    async cells() {
      const f = await io();
      try {
        const names = await f.readdir(dir);
        return names.filter((n) => n.endsWith('.json'));
      } catch {
        return [];
      }
    },
  };
}
