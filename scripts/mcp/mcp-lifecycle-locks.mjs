/**
 * ============================================================================
 * FILE: mcp-lifecycle-locks.mjs
 * PURPOSE: Serialize exact-owner MCP lifecycle state transitions.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides the temporary V1 file-lock implementation.
 * HOW IT FITS IN THE APP: Lease wrappers -> owner lock primitive.
 * KEY DECISIONS: This primitive stays audit-only until OS mutex fencing lands.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

import { closeSync, mkdirSync, openSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const WAIT_ARRAY = new Int32Array(new SharedArrayBuffer(4));

/** Run one action under the legacy owner file lock; never use it to authorize enforcement. */
export function withOwnerFileLock(root, ownerHash, purpose, action, waitMs) {
  mkdirSync(root, { recursive: true });
  const path = join(root, `owner-${ownerHash}-${purpose}.lock`);
  const deadline = Date.now() + waitMs;
  let handle = null;
  while (handle === null && Date.now() < deadline) {
    try {
      handle = openSync(path, 'wx', 0o600);
      writeFileSync(handle, `${process.pid}\n`, 'utf8');
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      Atomics.wait(WAIT_ARRAY, 0, 0, 50);
    }
  }
  if (handle === null) throw new Error('owner lifecycle lock unavailable');
  try { return action(); }
  finally { closeSync(handle); rmSync(path, { force: true }); }
}
