/**
 * buildIdentity — which code the RUNNING server process actually loaded.
 * @module scripts/swan-brain-console/buildIdentity
 *
 * THE DEFECT (round 12, 2026-09-20 — Astra F15).
 * `verifyTarget.mjs` proved "THIS build" by comparing served bytes to disk bytes. Astra graded
 * the claim precisely: the probes cover the BROWSER's files and one registry, and **nothing about
 * the running server's own logic**. Editing `gateClassify.mjs` changes no browser asset and no
 * registry, so a process started before that edit serves byte-identical assets while computing
 * DIFFERENT gate statuses — and the identity gate reports "this build" for every one of them.
 *
 * THE FIX, AND THE ONE DECISION THAT MAKES IT WORK.
 * The server publishes a fingerprint of its BACKEND CLOSURE. The fingerprint is computed when
 * this module is LOADED — that is, at process start — and then held in memory. It therefore
 * identifies the code the running process HAS, not the code on disk now.
 *
 * That ordering is the whole point, and it is worth stating because the obvious implementation
 * is wrong: re-reading the files on each request would make a stale process report the CURRENT
 * fingerprint, and the probe would pass against exactly the case it exists to catch.
 *
 * THE CLOSURE IS WALKED, NOT LISTED. A hand-written list beside the modules it must agree with is
 * the drift class this round keeps finding — it would go stale the first time a module is added,
 * and the fingerprint would then be a fingerprint of something that is no longer the backend.
 * `backendClosure()` follows relative imports from `server.mjs`, so `gateClassify.mjs` is reached
 * through `snapshot.mjs → gateHealth.mjs` without anyone having to remember it.
 *
 * BOUNDS: reads files under its own directory. No network, no writes, no clock beyond the boot
 * stamp.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** The process whose code this fingerprint describes. */
export const ENTRY = 'server.mjs';

/*
 * Relative ESM specifiers only. A bare specifier (`node:http`) is runtime, not build: it is not
 * part of this tree and hashing it would make the fingerprint depend on the Node version.
 */
const RELATIVE_SPECIFIER = /(?:^|\n)[ \t]*(?:import|export)\s+(?:[^;'"]*?\sfrom\s+)?['"](\.[^'"]+)['"]/g;

/**
 * Every module reachable from `entry` by relative import, as forward-slashed paths relative to
 * `root`. Sorted, so the result does not depend on directory order.
 */
export function backendClosure(root = HERE, entry = ENTRY) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    let src;
    try {
      src = readFileSync(join(root, file), 'utf8');
    } catch {
      continue; // Unreadable is not a crash: the fingerprint records that it was unreadable.
    }
    for (const m of src.matchAll(RELATIVE_SPECIFIER)) {
      queue.push(join(dirname(file), m[1]).split(sep).join('/'));
    }
  }
  return [...seen].sort();
}

/**
 * A stable digest over `files`' names AND bytes.
 *
 * SORTED HERE, NOT BY THE CALLER. The default argument is already sorted, but a digest whose
 * value depends on the order its caller happened to pass is a trap: two callers with the same
 * tree would disagree about the build, and the failure would look like a stale server. Ordering
 * is part of this function's contract, so it is enforced here — a test passes the same files
 * reversed and requires the same digest.
 *
 * The name is hashed alongside the content so that moving code between two files changes the
 * fingerprint even when the concatenated bytes would not — a rename is a different build.
 */
export function fingerprint(root = HERE, files = backendClosure(root)) {
  const hash = createHash('sha256');
  for (const file of [...files].sort()) {
    hash.update(file);
    hash.update('\0');
    try {
      hash.update(readFileSync(join(root, file)));
    } catch {
      hash.update('<unreadable>');
    }
    hash.update('\0');
  }
  return hash.digest('hex');
}

/* ── Computed once, at module load — see the header for why this is load-bearing. ────────── */
export const BACKEND_FILES = Object.freeze(backendClosure());
export const BUILD_FINGERPRINT = fingerprint(HERE, BACKEND_FILES);
export const BOOTED_AT = new Date().toISOString();

/**
 * Answer `/api/build`, or return `false` so the caller carries on routing.
 *
 * `res` and `json` arrive as parameters rather than being imported: this module is part of the
 * fingerprint, and keeping it free of `node:http` keeps it loadable from a test and from a
 * browser-side tool without dragging the server in.
 */
export function serveBuildIdentity(path, res, json) {
  if (path !== '/api/build') return false;
  json(res, 200, {
    fingerprint: BUILD_FINGERPRINT,
    files: BACKEND_FILES.length,
    entry: ENTRY,
    bootedAt: BOOTED_AT,
  });
  return true;
}
