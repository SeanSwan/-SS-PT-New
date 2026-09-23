#!/usr/bin/env node
/**
 * verify-r10-packet.mjs — is every inlined artifact still the file it claims to be?
 *
 * WHAT IT CHECKS. Each `#### \`path\`` block carries a sha256 and a line count, computed at build
 * time from the exact bytes embedded below it. This re-reads the file on disk and compares.
 *
 * WHY IT ALSO REDACT-CHECKS. The builder rewrites the operator's absolute paths to <REPO>/<HOME>/
 * <OPERATOR>, because scan-secrets.sh flags `operator-identity` on an absolute path and its stated
 * remedy is to rewrite the path rather than allowlist it. So for any artifact containing such a
 * path the embedded bytes are deliberately NOT byte-identical to disk. Comparing raw hashes only
 * would report a permanent false mismatch — and a check that always fails is a check nobody reads.
 *
 * A block may therefore be verified two ways, and the result says which:
 *   EXACT     disk bytes ARE the embedded bytes
 *   REDACTED  disk bytes, with the same redaction applied, are the embedded bytes
 * A block satisfying neither is a MISMATCH. Redaction is accepted only when applying the documented
 * redaction actually reproduces the header, so the check keeps its teeth.
 *
 * WHY THE STRIP ORDER IS THE WHOLE BALLGAME. The builder emits `normalise(text)` in the fence, so
 * the header must describe the STRIPPED bytes. Round 9's builder hashed the raw text and embedded
 * the stripped text, and reported 11 of 11 blocks MISMATCH for it — including files no fix had
 * touched. This verifier mirrors the builder EXACTLY: strip first, then hash. Any divergence between
 * this file and build-round10-packet.mjs shows up as a loud failure, which is the correct direction.
 *
 * ── WHY THIS FILE DOES NOT NORMALISE CRLF GLOBALLY, AND THE DEFECT THAT TAUGHT IT ────────────────
 * An earlier hardening pass read the packet and applied `.replace(/\r\n/g, '\n')` to the WHOLE text
 * before matching. That fixed the real problem it was aimed at (a `^...$`-anchored regex silently
 * matching nothing on CRLF, reporting "blocks found: 0" and a naive PASS) but introduced a worse
 * one: it also rewrote the LINE ENDINGS INSIDE EVERY EMBEDDED BODY, so the bytes being hashed were
 * no longer the bytes the headers were computed over.
 *
 * Measured, on the round-10 packet:
 *   - This file is materialised CRLF on Windows checkout, so all 14 embedded bodies end CRLF.
 *   - Eleven of the thirteen sourced artifacts are LF on disk; their headers were hashed from LF.
 *   - TWO are CRLF on disk (`addressClassification.mjs`, `spotlightImageFetch.mjs`); their headers
 *     were hashed from CRLF.
 * So the two CRLF-sourced blocks agree with their header only under RAW comparison, and the eleven
 * LF-sourced blocks agree only under LF-normalised comparison. NO SINGLE GLOBAL NORMALISATION CAN
 * VERIFY BOTH — one rule is always wrong for half the packet, and it reports the honest half as
 * lies. That is not a packet defect; it is a verifier defect, and it is the same defect class this
 * round exists to hunt: an instrument whose verdict depends on REPRESENTATION rather than on bytes.
 *
 * The fix is to stop deciding globally and let each block nominate the representation under which
 * its header is true, then require the DISK to agree under the SAME representation. A block passes
 * only if one representation satisfies BOTH checks; a header that is true in one representation
 * while the disk is true in the other is still a failure.
 *
 * Fence-delimiter matching tolerates `\r?\n` so the block regex works on either checkout.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = (() => {
  let d = HERE;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(d, 'backend', 'package.json')) && fs.existsSync(path.join(d, '.git'))) return d;
    d = path.resolve(d, '..');
  }
  throw new Error('repo root not found from ' + HERE);
})();

const PACKET = path.join(HERE, 'R1-REVIEW-ROUND-10-PACKET.md');

// Read RAW. Do NOT normalise line endings here: the embedded bodies must be measured as they are.
const text = fs.readFileSync(PACKET, 'utf8');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// MUST stay identical to `redactOperatorPaths` in build-round10-packet.mjs.
function redactOperatorPaths(t) {
  return t
    .replace(/C:\\Users\\[^\\\s"']+\\Desktop\\@Everything\\quick-pt\\SS-PT/g, '<REPO>')
    .replace(/C:\\Users\\[^\\\s"']+(?=\\|$)/g, '<HOME>')
    .replace(/C:\/Users\/[^/\s"']+\/Desktop\/@Everything\/quick-pt\/SS-PT/g, '<REPO>')
    .replace(/(Users|home)[^A-Za-z0-9]+BigotSmasher/g, '<HOME>/<OPERATOR>');
}

// MUST stay identical to `normalise` in build-round10-packet.mjs.
const normalise = (s) => s.replace(/\s+$/, '');
const lf = (s) => s.replace(/\r\n/g, '\n');
const countLines = (s) => s.split('\n').length - 1;

// Fence delimiters may be LF or CRLF; the body keeps whatever line endings it has.
const re = /^#### `([^`]+)`\r?\n\r?\nsha256 `([0-9a-f]{64})` · (\d+) lines[\s\S]*?\r?\n```[a-z]*\r?\n([\s\S]*?)\r?\n```$/gm;

/**
 * TWO INDEPENDENT CHECKS, AND BOTH MUST PASS — UNDER ONE AGREED REPRESENTATION.
 *
 *   (A) HEADER vs BODY — does the header describe the bytes embedded in the fence?
 *   (B) BODY vs DISK   — do the embedded bytes match the file on disk (exact, or under redaction)?
 *
 * Check (A) is not optional, and its absence was a real defect. An earlier version destructured
 * `body` and never used it, comparing only the DISK against the claimed header. That verifier could
 * not detect the thing a verifier exists to detect: it reported `14 verified | 0 mismatched` on a
 * packet whose embedded body had been altered with its header left intact. A tampered body that
 * keeps its header is invisible to a disk-only comparison, because the disk was never the thing
 * being tampered with.
 *
 * A block is verified under the first representation (raw, then LF) in which check (A) holds, and
 * then check (B) must ALSO hold in that same representation — including the line count. Requiring
 * both under one representation is what keeps the pair from being satisfiable by accident.
 */
let verified = 0, mismatch = 0, absent = 0, redacted = 0, stale = 0;
const lines = [];

for (const m of text.matchAll(re)) {
  const [, rel, claimed, claimedLinesRaw, body] = m;
  const claimedLines = Number(claimedLinesRaw);

  let disk = null;
  for (const base of [REPO, 'Z:/HostileReviews']) {
    const p = path.isAbsolute(rel) ? rel : path.join(base, rel);
    if (fs.existsSync(p)) { disk = fs.readFileSync(p, 'utf8'); break; }
  }

  // Candidate representations, in order of preference. A block passes on the first that works.
  const reps = [
    ['exact', (s) => s],
    ['lf', lf],
  ];

  let ok = null;
  for (const [name, norm] of reps) {
    const embedded = normalise(norm(body));
    // (A) header vs body, in this representation
    if (sha(embedded) !== claimed) continue;
    if (countLines(embedded) !== claimedLines) continue;
    // (B) body vs disk, in the SAME representation
    if (disk !== null) {
      if (normalise(norm(disk)) === embedded) { ok = [name, 'exact']; break; }
      if (normalise(redactOperatorPaths(norm(disk))) === embedded) { ok = [name, 'redacted']; break; }
      continue;
    }
    ok = [name, disk === null ? 'disk-absent' : 'exact'];
    break;
  }

  if (ok === null) {
    mismatch++;
    if (disk === null) {
      absent++;
      lines.push('  ABSENT   ' + rel + ' — no such file in the repo or under Z:/HostileReviews.');
      continue;
    }
    stale++;
    lines.push('  STALE/LIES ' + rel);
    lines.push('           claimed      ' + claimed + ' (' + claimedLines + ' lines)');
    const embRaw = normalise(body), embLf = normalise(lf(body));
    lines.push('           body raw     ' + sha(embRaw) + ' (' + countLines(embRaw) + ' lines)');
    lines.push('           body lf      ' + sha(embLf) + ' (' + countLines(embLf) + ' lines)');
    lines.push('           disk raw     ' + sha(normalise(disk)));
    lines.push('           disk lf      ' + sha(normalise(lf(disk))));
    lines.push('           disk raw red ' + sha(normalise(redactOperatorPaths(disk))));
    lines.push('           no representation satisfies (header==body) AND (body==disk).');
    continue;
  }

  verified++;
  if (ok[1] === 'redacted') redacted++;
  if (ok[1] === 'disk-absent') absent++;
}

const total = verified + mismatch;

console.log('');
console.log('repo root resolved: ' + REPO);
console.log('packet line endings: ' + (text.includes('\r\n') ? 'CRLF' : 'LF'));
console.log('blocks found: ' + total);
console.log('  verified : ' + verified);
console.log('  problems : ' + mismatch);
if (redacted) console.log('  (' + redacted + ' verified only after applying the documented path redaction)');
if (absent) console.log('  (' + absent + ' verified against an artifact that could not be read)');
if (lines.length) { console.log(''); lines.forEach((l) => console.log(l)); }

// A ZERO-BLOCK RESULT IS A FAILURE, NOT A PASS. "I found nothing to check" and "everything
// checked out" are opposite conclusions, and conflating them is how a verifier becomes theatre.
// This repository has already produced one instance: a CRLF checkout made the block regex match
// nothing, and the run reported success.
if (total === 0) {
  console.log('');
  console.log('PACKET FAILED — no blocks were found, so nothing was verified. A zero-block result is');
  console.log('  a FLAW IN THIS CHECK OR IN THE PACKET, never a pass.');
  process.exit(1);
}

// The packet must carry exactly as many blocks as the builder inlines. A silent drop is a failure.
const EXPECTED_BLOCKS = 14;
if (total !== EXPECTED_BLOCKS) {
  console.log('');
  console.log('PACKET FAILED — expected ' + EXPECTED_BLOCKS + ' hashed blocks, found ' + total + '.');
  console.log('  A block that vanished is not a pass; recount before trusting this run.');
  process.exit(1);
}

console.log('');
console.log(total !== 0 && mismatch === 0 ? 'PACKET OK' : 'PACKET FAILED — ' + mismatch + ' problem block(s)');
process.exit(mismatch ? 1 : 0);
