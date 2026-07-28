/**
 * writer.mjs — the ONLY code path that writes into the design-brain data root.
 * ============================================================================
 * Hardening (each rule pins a hostile scenario from the Pass B/C review):
 *   - PATH JAIL: every write must land inside the validated data root (paths.mjs). A path that
 *     escapes (absolute elsewhere, ../ traversal) is refused.
 *   - SYMLINK REFUSAL (lstat, not stat): writing THROUGH a symlinked file or parent directory is
 *     refused — a link pointing back into the repo or vault must not receive engine data.
 *   - BINARY REFUSAL (magic bytes + NUL sniff): the corpus is text/JSONL/markdown only. "A screenshot
 *     stored under a false .md extension" was a named hostile scenario; content that starts with a
 *     known binary magic or carries NUL bytes in its head is refused regardless of extension.
 *   - ATOMIC WRITES: full-file writes go to a temp sibling then rename, so a crash never leaves a
 *     half-written record.
 *   - APPEND-ONLY AUDIT: every successful write appends one line to ledger/writes.jsonl.
 *
 * @module design-brain/writer
 */
import {
  writeFileSync, appendFileSync, renameSync, mkdirSync, existsSync, lstatSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { isInside } from './paths.mjs';

const BINARY_MAGICS = [
  [0x89, 0x50, 0x4e, 0x47], // PNG
  [0xff, 0xd8, 0xff],       // JPEG
  [0x47, 0x49, 0x46, 0x38], // GIF
  [0x25, 0x50, 0x44, 0x46], // %PDF
  [0x50, 0x4b, 0x03, 0x04], // ZIP/OOXML
  [0x1f, 0x8b],             // GZIP
];

/** Throws when content looks binary (magic prefix or NUL in the first 512 bytes). */
export function assertTextContent(content, label = 'content') {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
  for (const magic of BINARY_MAGICS) {
    if (buf.length >= magic.length && magic.every((b, i) => buf[i] === b)) {
      throw new Error(`design-brain: refusing binary ${label} (magic-byte match) — the corpus is text only`);
    }
  }
  const head = buf.subarray(0, 512);
  if (head.includes(0)) {
    throw new Error(`design-brain: refusing ${label} with NUL bytes — the corpus is text only`);
  }
}

/** Throws when the target file or any existing ancestor inside the root is a symlink. */
function assertNoSymlink(root, target) {
  let cur = resolve(target);
  const stop = resolve(root);
  for (;;) {
    if (existsSync(cur)) {
      const st = lstatSync(cur);
      if (st.isSymbolicLink()) {
        throw new Error(`design-brain: refusing to write through a symlink (${cur})`);
      }
    }
    if (cur === stop) break;
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
}

function preflight(root, target, content, label) {
  if (!isInside(root, target)) {
    throw new Error(`design-brain: write escapes the data root (${target})`);
  }
  assertNoSymlink(root, target);
  assertTextContent(content, label);
}

function audit(root, action, target, bytes) {
  const ledger = join(root, 'ledger', 'writes.jsonl');
  mkdirSync(dirname(ledger), { recursive: true });
  appendFileSync(ledger, JSON.stringify({
    ts: new Date().toISOString(), action, target: String(target), bytes,
  }) + '\n');
}

/** Atomic full-file write (temp sibling + rename), jailed + audited. */
export function safeWriteText(root, target, content) {
  preflight(root, target, content, `write to ${target}`);
  mkdirSync(dirname(resolve(target)), { recursive: true });
  const tmp = resolve(target) + '.tmp-' + process.pid;
  writeFileSync(tmp, content);
  renameSync(tmp, resolve(target));
  audit(root, 'write', target, Buffer.byteLength(String(content)));
  return resolve(target);
}

/** Append one JSON object as a JSONL line, jailed + audited. */
export function appendJsonl(root, target, obj) {
  const line = JSON.stringify(obj) + '\n';
  preflight(root, target, line, `append to ${target}`);
  mkdirSync(dirname(resolve(target)), { recursive: true });
  appendFileSync(resolve(target), line);
  audit(root, 'append', target, Buffer.byteLength(line));
  return resolve(target);
}
