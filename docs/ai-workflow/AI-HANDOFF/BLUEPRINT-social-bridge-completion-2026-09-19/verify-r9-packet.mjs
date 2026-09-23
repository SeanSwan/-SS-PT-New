import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

/**
 * verify-r9-packet.mjs — is every inlined artifact still the file it claims to be?
 *
 * WHAT IT CHECKS. Each `#### \`path\`` block in the packet carries a sha256 and a line count,
 * computed at build time from the exact bytes embedded below it. This re-reads the file on disk
 * and compares. A mismatch means the packet is describing bytes that are no longer on disk —
 * which is worth knowing BEFORE a reviewer reads it and AFTER a fix lands.
 *
 * WHY IT ALSO REDACT-CHECKS (added when the packet became redacted). The builder rewrites the
 * operator's absolute paths to `<REPO>` / `<HOME>` / `<OPERATOR>` before inlining, because
 * `scripts/scan-secrets.sh` correctly flags `operator-identity` on an absolute path and its
 * stated remedy is to rewrite the path rather than allowlist it. The consequence is that for any
 * artifact containing such a path, the embedded bytes are deliberately NOT byte-identical to
 * disk. Comparing raw hashes would report a permanent false mismatch.
 *
 * So a block may be verified in one of two ways, and the result says which:
 *
 *   EXACT     disk bytes ARE the embedded bytes
 *   REDACTED  disk bytes, with the same redaction applied, are the embedded bytes
 *
 * A block that satisfies neither is a MISMATCH. This keeps the check meaningful: redaction is
 * accepted only when applying the documented redaction actually reproduces the hash.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
// Walk up to the repo marker, exactly as the builder does.
const REPO = (() => {
  let d = HERE;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(d, 'backend', 'package.json')) && fs.existsSync(path.join(d, '.git'))) return d;
    d = path.resolve(d, '..');
  }
  throw new Error('repo root not found from ' + HERE);
})();
const PACKET = path.join(HERE, "R1-REVIEW-ROUND-9-PACKET.md");
const text = fs.readFileSync(PACKET, 'utf8');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// MUST stay identical to `redactOperatorPaths` in build-round9-packet.mjs. If the builder's
// redaction changes and this does not, REDACTED blocks start reporting as MISMATCH — a loud
// failure, which is the correct direction for this pair to drift.
function redactOperatorPaths(t) {
  return t
    .replace(/C:\\Users\\[^\\\s"']+\\Desktop\\@Everything\\quick-pt\\SS-PT/g, '<REPO>')
    .replace(/C:\\Users\\[^\\\s"']+(?=\\|$)/g, '<HOME>')
    .replace(/C:\/Users\/[^/\s"']+\/Desktop\/@Everything\/quick-pt\/SS-PT/g, '<REPO>')
    .replace(/(Users|home)[^A-Za-z0-9]+BigotSmasher/g, '<HOME>/<OPERATOR>');
}

const re = /^#### `([^`]+)`\n\nsha256 `([0-9a-f]{64})` · (\d+) lines[\s\S]*?\n```[a-z]*\n([\s\S]*?)\n```$/gm;
let checked = 0, mismatch = 0, absent = 0, redacted = 0;
for (const m of text.matchAll(re)) {
  const [, rel, claimed, claimedLines, body] = m;
  let disk = null;
  for (const base of [REPO, 'Z:/HostileReviews']) {
    const p = path.isAbsolute(rel) ? rel : path.join(base, rel);
    if (fs.existsSync(p)) { disk = fs.readFileSync(p, 'utf8'); break; }
  }
  if (disk === null) { absent++; console.log('  ABSENT   ' + rel); continue; }
  checked++;

  // The builder embeds `text.replace(/\s+$/, '')`; mirror that before hashing.
  const embed = (s) => s.replace(/\s+$/, '');
  if (sha(embed(disk)) === claimed) continue;
  if (sha(embed(redactOperatorPaths(disk))) === claimed) { redacted++; continue; }

  mismatch++;
  console.log('  MISMATCH ' + rel);
}
console.log('');
console.log('repo root resolved: ' + REPO);
console.log('verified against disk: ' + checked + ' | mismatched: ' + mismatch + ' | absent: ' + absent);
if (redacted) console.log('  (' + redacted + ' verified only after applying the documented path redaction)');
process.exit(mismatch ? 1 : 0);
