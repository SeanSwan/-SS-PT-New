#!/usr/bin/env node
/**
 * build-round10-packet.mjs — assemble the round-10 review packet.
 *
 * WHAT IT DOES. Reads the artifacts under review, renders each into a fenced block with a sha256
 * and a line count, and hands the rendered blocks to `round10-packet-template.mjs`, which owns the
 * prose. The split keeps a prose edit from changing a hash.
 *
 * THE ONE INVARIANT THAT MATTERS. The sha256 and the line count in a block's header MUST describe
 * the exact bytes embedded in that block's fence. Round 9's builder violated this: it hashed the
 * raw text and embedded the stripped text, so 11 of 11 headers described a string that appears
 * nowhere in the packet. `normalise()` below exists so the strip happens ONCE, before anything is
 * measured. Do not reintroduce a second strip after the measurement.
 *
 * PATHS ARE REDACTED. `scripts/scan-secrets.sh` flags `operator-identity` on an absolute path, and
 * its stated remedy is to rewrite the path rather than allowlist it. Redaction is applied to the
 * TEXT THAT GETS EMBEDDED, and the sha256 is computed from those same bytes — the same discipline
 * as `normalise()`, for the same reason. `verify-r10-packet.mjs` mirrors this function; if the two
 * drift, redacted blocks start reporting as MISMATCH, which is the correct direction to fail.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { renderRound10Packet } from './round10-packet-template.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const REPO = (() => {
  let d = HERE;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(d, 'backend', 'package.json')) && fs.existsSync(path.join(d, '.git'))) return d;
    d = path.resolve(d, '..');
  }
  throw new Error(`could not locate the repo root by walking up from ${HERE}`);
})();

// The commit that re-landed the round-9 fixes after their original commits were lost from the
// store. Resolved at build time so the packet cannot claim a commit that is not there.
const TARGET_COMMIT = '14833065a';

const OUT = path.join(HERE, 'R1-REVIEW-ROUND-10-PACKET.md');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');
const lines = (s) => s.split('\n').length - 1;

/**
 * REDACT THE OPERATOR'S ABSOLUTE PATHS FROM INLINED EVIDENCE.
 * MUST stay identical to `redactOperatorPaths` in verify-r10-packet.mjs.
 */
function redactOperatorPaths(t) {
  return t
    .replace(/C:\\Users\\[^\\\s"']+\\Desktop\\@Everything\\quick-pt\\SS-PT/g, '<REPO>')
    .replace(/C:\\Users\\[^\\\s"']+(?=\\|$)/g, '<HOME>')
    .replace(/C:\/Users\/[^/\s"']+\/Desktop\/@Everything\/quick-pt\/SS-PT/g, '<REPO>')
    .replace(/(Users|home)[^A-Za-z0-9]+BigotSmasher/g, '<HOME>/<OPERATOR>');
}

/**
 * STRIP ONCE, THEN DESCRIBE WHAT YOU EMBED.
 * The body of every block is emitted stripped, so the header must describe the STRIPPED bytes.
 * Hashing before stripping makes the header a claim about a string that is nowhere in the packet.
 */
const normalise = (s) => s.replace(/\s+$/, '');

function block(label, text, { lang = 'mjs', note } = {}) {
  const body = normalise(text);
  return [
    `#### \`${label}\``, '',
    `sha256 \`${sha256(body)}\` · ${lines(body)} lines`,
    ...(note ? ['', note] : []), '',
    '```' + lang, body, '```', '',
  ].join('\n');
}

/** A file inside the repo, inlined whole. */
function fenced(rel, opts = {}) {
  return block(rel, redactOperatorPaths(read(rel)), opts);
}

/** A file OUTSIDE the repo (Rule 86 files reviews under Z:\), addressed absolutely. */
function fencedAbs(absPath, opts = {}) {
  let text;
  try {
    text = redactOperatorPaths(fs.readFileSync(absPath, 'utf8'));
  } catch (err) {
    text = `(COULD NOT BE READ AT BUILD TIME: ${err.code} — ${absPath})\n\n`
      + 'This is reported rather than omitted: the reviewer should know the evidence is absent.';
  }
  return block(opts.label || absPath, text, opts);
}

// ── The artifacts under review ────────────────────────────────────────────────────────────────

const SOURCES = [
  ['backend/services/ipv6LiteralSyntax.mjs',
    'NEW in round 9. The syntax/policy split required by ban #50: `isValidIPv6` and `expandIPv6`. C1.'],
  ['backend/services/addressClassification.mjs',
    'The allowlist classifier. Round 9 inverted this from a denylist; C1 and C7 live here.'],
  ['backend/services/spotlightImageDecode.mjs',
    'NEW in round 9 — extracted when the finding-2 comment pushed spotlightImageFetch.mjs to 300 lines. C8.'],
  ['backend/services/spotlightImageFetch.mjs',
    'The finding-2 fix — `reader.cancel()`, not `body.cancel()`. C2, C3, C4.'],
  ['backend/services/applaudAudioFetcher.mjs',
    'The SHARED consumer. Its own suite is the regression gate for the extraction. C8.'],
  ['backend/services/spotlightImageUrlPolicy.mjs',
    'The pinned lookup/dispatcher factories the transport tests exercise. C2, C5.'],
];

const TESTS = [
  ['backend/tests/unit/ipv6LiteralSyntax.test.mjs',
    'NEW in round 9 — direct tests of the syntax primitives. Exists because mutation M1 SURVIVED. C1, C5.'],
  ['backend/tests/unit/addressClassificationR9.test.mjs',
    'NEW in round 9 — the regression gate, including the blocks added to kill M4 and M6. C1, C5, C7.'],
  ['backend/tests/unit/spotlightImageLifecycle.test.mjs',
    'The finding-2/3 test. The assertion quoted in §3.6 lives here. C3, C4.'],
  ['backend/tests/helpers/spotlightImageFixtures.mjs',
    'The recording harness. Settlement is recorded AFTER the await; three distinct events. C4.'],
  ['backend/tests/unit/spotlightImageTransportPin.test.mjs',
    'The transport pin test, with round 9\'s `pinned[0]` attribution corrected. C5.'],
  ['backend/tests/unit/spotlightImageDnsPin.test.mjs',
    'The pre-existing pin suite. C5.'],
  ['backend/tests/unit/spotlightImageAdmission.test.mjs',
    'The admission-layer regression cases. C5, C8.'],
];

/** A git commit in full, generated at build time so it cannot drift from the repo. */
function commitPatch(rev, note) {
  let patch;
  try {
    // FULL patch, not --stat: C6 asks whether anything was REMOVED, and a stat cannot answer that.
    patch = execFileSync('git', ['show', rev, '--format=commit %H%nparent %P%nauthor %an%ndate %ad%nsubject %s'], {
      cwd: REPO, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
    });
    patch = redactOperatorPaths(patch);
  } catch (err) {
    // A commit that cannot be shown is reported as such rather than silently omitted.
    patch = `(this commit could not be read from the object store: ${(err.stderr || err.message).trim()})`;
  }
  return [`### ${note}`, '', '```diff', normalise(patch), '```', ''].join('\n');
}

const ROUND9_REVIEW = 'Z:/HostileReviews/2026-09-21-212053-social-bridge-spotlight-round-9-astra-classifier.md';

// ── Assemble ──────────────────────────────────────────────────────────────────────────────────

const sources = SOURCES.map(([rel, note]) => fenced(rel, { note })).join('\n');
const tests = TESTS.map(([rel, note]) => fenced(rel, { note })).join('\n');

const commits = [
  commitPatch(TARGET_COMMIT,
    `\`${TARGET_COMMIT}\` — the round-9 fixes, RE-LANDED. The originals (67de00ee0, 7a23939cf) and their parent (6cca20594) are absent from this store; this commit carries the same content. C2, C3, C6.`),
].join('\n');

const round9Review = fencedAbs(ROUND9_REVIEW, {
  lang: 'markdown',
  note: 'Filed under Rule 86. This is the review whose findings round 9 fixed and round 10 is adjudicating.',
});

const MUTATION_RECORD_TEXT = `
ROUND 9 MUTATION RECORD — the classifier and the stream release
==============================================================
Method: apply exactly one edit, run the affected suites, capture the failure, restore the source
        from a SHA-verified pristine snapshot, re-run, and confirm the failure is gone.
Every mutation below was REVERTED before the next one. Three of the six initially SURVIVED.

--- Mutation M1 — delete the syntax gate in isPubliclyRoutableIPv6 ---------------------------------
EDIT:  if (!isValidIPv6(addr)) return false;   ->   (removed entirely)

FIRST RUN: THE MUTATION SURVIVED. All suites green.
Root cause: the syntax check was REDUNDANT on the classifier's own path — the classifier already
rejected those inputs, so removing the gate changed nothing observable. This was a defect against
the TESTS, not the source: nothing tested \`isValidIPv6\` directly.
FIX: backend/tests/unit/ipv6LiteralSyntax.test.mjs was created (31 tests) to test the primitives.
RE-RUN: 4 RED.

--- Mutation M2 — the dotted-quad fill count ignores the dotted tail ------------------------------
EDIT:  head = dottedTail[1];   ->   head = dottedTail[1].replace(/:$/, '');   (REVERSED)

FIRST RUN: SURVIVED — no suite could see it, because every fixture used a dotted tail whose head
had no separator colon. The greedy \`(.*:)\` captures that colon, so removal shifts the fill count.
FIX: cases added for \`::ffff:127.0.0.1\` and \`1:2:3:4:5:6:1.2.3.4\` (Node accepts both).
RE-RUN: 5 RED.

--- Mutation M3 — classify without validating ----------------------------------------------------
EDIT:  validate-then-classify   ->   classify directly

RESULT: 9 RED. Detected on the first run.

--- Mutation M4 — decode embedded IPv4 by STRING SHAPE instead of bit position --------------------
EDIT:  the expanded-form bit-position decode   ->   a regex over the textual form

FIRST RUN: detected only after a CRLF normalisation bug in the harness was fixed; before that the
mutation was reported as "anchor not found", which is NOT the same as "survived" and was corrected.
RE-RUN: 6 RED.

--- Mutation M5 — reverse the reader release -----------------------------------------------------
EDIT:  await reader?.cancel('stream read failed')   ->   (the call removed)

RESULT: 2 RED. Detected on the first run.

--- Mutation M6 — drop the 2000::/3 allowlist ----------------------------------------------------
EDIT:  the positive global-unicast recognition   ->   (falls through to the private default)

FIRST RUN: THE MUTATION SURVIVED. \`4000::1\`, \`8000::1\` and \`e000::1\` classified PUBLIC with the
whole suite GREEN. This was the most serious of the three survivors: the allowlist is the entire
mechanism C1 claims, and nothing tested an address OUTSIDE 2000::/3 but still valid.
FIX: an allowlist block was added asserting those three classify PRIVATE.
RE-RUN: 13 RED.

--- Baseline -------------------------------------------------------------------------------------
No mutation applied: 6 suites, 126 tests, all passing.

--- What this record does NOT claim ---------------------------------------------------------------
- It does not claim the suite is now mutation-proof. It claims three demonstrated holes were closed.
- It does not claim coverage of the OTHER five suites; the mutations target the classifier and the
  stream release only.
- The mutation surface is the classifier, the syntax primitives, and the reader release. No mutation
  was applied to the pin/dispatcher factories in this round.
- Two earlier harness defects are recorded because they nearly produced FALSE claims: a "SURVIVED"
  verdict inferred from a missing summary line (conflating a crash with survival), and ANSI colour
  codes making every summary unparseable. Both were found by instrumenting the harness.
`;

// The mutation record is authored here rather than read from disk, because round 9's mutations were
// run in-session and only exist as prose. Labelled as author-authored in §5.
const mutationRecord = [
  '#### The six round-9 mutations, reproduced verbatim from the author\'s session record',
  '',
  'sha256 is not given for this block: it is authored prose, not an artifact read from disk. It is',
  'labelled as such deliberately — a record that looks like evidence but is not is worse than one',
  'that says what it is.',
  '',
  '```markdown',
  normalise(MUTATION_RECORD_TEXT),
  '```',
  '',
].join('\n');

const BUILT = new Date().toISOString();

const packet = renderRound10Packet({
  sources, tests, commits, round9Review, mutationRecord, builtUtc: BUILT, targetCommit: TARGET_COMMIT,
});

const claims = [...packet.matchAll(/^sha256 `([0-9a-f]{64})` · (\d+) lines$/gm)];
fs.writeFileSync(OUT, packet, 'utf8');
console.log(`wrote ${path.relative(REPO, OUT)}`);
console.log(`  ${lines(packet)} lines · ${Buffer.byteLength(packet)} bytes`);
console.log(`  sha256 ${sha256(packet)}`);
console.log(`  ${claims.length} hashed blocks · target commit ${TARGET_COMMIT}`);
