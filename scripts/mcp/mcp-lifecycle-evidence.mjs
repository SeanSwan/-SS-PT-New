/**
 * ============================================================================
 * FILE: mcp-lifecycle-evidence.mjs
 * PURPOSE: Persist bounded inactive MCP lifecycle evidence.
 * AUTHOR: Codex | LAST MODIFIED: 2026-08-09
 * AI VILLAGE VALIDATED: Not run (permission-gated)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Atomically writes sanitized evidence and rotates oldest
 * inactive records after validating every candidate as a bounded regular file.
 * HOW IT FITS IN THE APP: Lease persistence -> evidence/quarantine directories.
 * KEY DECISIONS: Active authority fails closed; inactive evidence rotates FIFO.
 * NASM PROTOCOL CONTEXT: Not applicable; this is agent infrastructure.
 */

import {
  lstatSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

function evidenceFiles(directory) {
  mkdirSync(directory, { recursive: true });
  return readdirSync(directory).filter((name) => name.endsWith('.json')).map((name) => {
    const path = join(directory, name);
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.size > 64 * 1024) throw new Error('invalid inactive evidence');
    return { name, path, mtimeMs: stat.mtimeMs };
  });
}

/** Rotate oldest validated inactive JSON records to a strict count bound. */
export function rotateEvidenceDirectory(directory, maxFiles = 256) {
  if (!Number.isInteger(maxFiles) || maxFiles < 1 || maxFiles > 256) {
    throw new Error('invalid evidence bound');
  }
  const files = evidenceFiles(directory).sort((left, right) =>
    left.mtimeMs - right.mtimeMs || left.name.localeCompare(right.name));
  for (const item of files.slice(0, Math.max(0, files.length - maxFiles))) {
    rmSync(item.path, { force: true });
  }
}

/** Atomically persist one sanitized record, then enforce the inactive bound. */
export function writeBoundedEvidence(directory, filename, value, maxFiles = 256) {
  if (!/^[a-zA-Z0-9._-]+\.json$/.test(filename)) throw new Error('invalid evidence name');
  mkdirSync(directory, { recursive: true });
  const target = join(directory, filename);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    const text = `${JSON.stringify(value)}\n`;
    if (Buffer.byteLength(text) > 64 * 1024) throw new Error('inactive evidence too large');
    writeFileSync(temporary, text, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    renameSync(temporary, target);
  } finally {
    rmSync(temporary, { force: true });
  }
  rotateEvidenceDirectory(directory, maxFiles);
}
