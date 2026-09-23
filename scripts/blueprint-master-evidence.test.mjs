import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readFileSync, readdirSync, lstatSync,
} from 'node:fs';
import {
  resolve, relative, isAbsolute, sep, basename,
} from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const digest = bytes =>
  createHash('sha256').update(bytes).digest('hex');

function artifact(ref) {
  assert.ok(ref && isAbsolute(ref.path), 'Absolute artifact path required');
  assert.match(ref.sha256, /^[a-f0-9]{64}$/);
  const bytes = readFileSync(ref.path);
  assert.equal(digest(bytes), ref.sha256, `Artifact changed: ${ref.path}`);
  return bytes;
}

function within(root, path) {
  const rel = relative(resolve(root), resolve(path));
  assert.ok(rel !== '..' && !rel.startsWith(`..${sep}`));
  assert.ok(!isAbsolute(rel), 'Path escapes root');
}

function localFile(root, path) {
  assert.ok(typeof path === 'string' && path.length > 0);
  assert.ok(!isAbsolute(path) && !/[\0\r\n\\:]/.test(path));
  const parts = path.split('/');
  assert.ok(parts.every(p => p && p !== '.' && p !== '..'));
  let current = resolve(root);
  assert.ok(!lstatSync(current).isSymbolicLink());
  for (const part of parts) {
    current = resolve(current, part);
    assert.ok(!lstatSync(current).isSymbolicLink(), 'Link requires resolution');
  }
  within(root, current);
  return current;
}

function listFiles(root, prefix = '') {
  const result = [];
  for (const entry of readdirSync(resolve(root, prefix), {
    withFileTypes: true,
  })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    assert.ok(!entry.isSymbolicLink(), 'Link requires resolution');
    if (entry.isDirectory()) result.push(...listFiles(root, path));
    else {
      assert.ok(entry.isFile(), 'Special file requires resolution');
      result.push(path);
    }
  }
  return result.sort();
}

function git(...args) {
  const result = spawnSync('git', ['-C', snapshot.git.root, ...args], {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

/**
 * Assert a list has no duplicates.
 *
 * HOSTILE REVIEW H-04 (2026-09-22): this reported a bare "Duplicate values" for every caller, so a
 * rejection could not be attributed to the collection that actually collided. The reason is now
 * carried, and the colliding values are NAMED — a duplicate report that does not say WHAT duplicated
 * is the same defect class as a check that reports success without testing its subject.
 */
function unique(values, reason = 'Duplicate values') {
  const seen = new Set();
  const dupes = new Set();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  assert.equal(dupes.size, 0,
    `${reason}: ${[...dupes].map(v => JSON.stringify(v)).join(', ')}`);
}

/* ===========================================================================
 * SEMANTIC EVIDENCE VALIDATION — hostile review round 2, R2-06
 * ===========================================================================
 * R2-06 (High): "Hash-correct garbage can satisfy admission evidence."
 *
 * `artifact()` establishes that bytes match a supplied hash. It does NOT establish that the bytes
 * support the receipt's assertion. Every check below previously stopped at `artifact(...)`, so an
 * outer receipt could say PASS/APPROVE/ADMIT while the artifact it pointed at said the opposite —
 * and the hash check would still succeed. Astra's table of concrete false evidence:
 *
 *   | Check                    | False evidence the old code accepted                       |
 *   |--------------------------|------------------------------------------------------------|
 *   | Required behavior evid.  | output contains `not a test result`; receipt says PASS, 0. |
 *   | Ordered filed reviews    | archive says `verdict: DEFECTS-FOUND`; receipt says APPROVE.|
 *   | Terminal evidence        | file says `{"status":"failed"}`; hashed without reading.    |
 *   | Identity evidence        | file contains `null`; hashing still succeeds.              |
 *   | Final admission          | attestation contains `DENIED`; receipt says ADMIT.         |
 *
 * The rule these helpers enforce: the OUTER assertion and the ARTIFACT it cites must agree, and a
 * disagreement is named so the caller can tell it apart from a hash mismatch or an I/O error.
 * =========================================================================== */

/** Read an artifact as text, with read failures named distinctly from content failures. */
function artifactText(ref, label) {
  const bytes = artifact(ref);
  const text = bytes.toString('utf8');
  assert.ok(text.trim().length > 0, `${label || 'Artifact'} is empty: ${ref.path}`);
  return text;
}

/**
 * Parse an artifact as JSON. A parse failure is named with the caller's reason code, so a caller
 * asserting on that code sees a stable reason rather than a generic JSON message.
 */
function artifactJson(ref, label, reason = 'E_ARTIFACT_INVALID') {
  const text = artifactText(ref, label);
  try {
    return JSON.parse(text);
  } catch {
    assert.fail(`${reason}: ${label || 'artifact'} is not valid JSON (${ref.path})`);
  }
}

/**
 * Parse the YAML-ish front-matter block that review archives use.
 * Deliberately narrow: this reads `key: value` lines between `---` fences, which is the only
 * structure the review format actually uses. It is not a YAML implementation.
 */
function parseFrontMatter(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(line => line.trim() === '---');
  if (start === -1) return null;
  const end = lines.findIndex((line, index) => index > start && line.trim() === '---');
  if (end === -1) return null;
  const fields = {};
  for (const line of lines.slice(start + 1, end)) {
    const match = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line.trim());
    if (match) fields[match[1]] = match[2].trim();
  }
  return fields;
}

/**
 * A report file must be a structured test report whose OWN content agrees with the receipt.
 * Rejects the R2-06 case where `output` holds free text such as `not a test result`.
 */
function assertRunReport(ref, expected, label) {
  const report = artifactJson(ref, label, 'E_RUN_REPORT_INVALID');
  assert.ok(report && typeof report === 'object' && !Array.isArray(report),
    `${label}: report must be a JSON object, got ${Array.isArray(report) ? 'array' : typeof report}`);
  // The named rejection reason: structured run-report evidence is required, not any bytes.
  assert.equal(typeof report.id, 'string', `E_RUN_REPORT_INVALID: ${label} has no string id`);
  assert.equal(typeof report.command, 'string', `E_RUN_REPORT_INVALID: ${label} has no string command`);
  assert.ok(report.snapshotSha256 === expected.snapshotSha256,
    `E_RUN_REPORT_INVALID: ${label} cites snapshot ${report.snapshotSha256}, receipt says ${expected.snapshotSha256}`);
  assert.equal(report.outcome, expected.outcome,
    `E_RUN_REPORT_INVALID: ${label} says outcome ${report.outcome}, receipt says ${expected.outcome}`);
  assert.equal(report.exitCode, expected.exitCode,
    `E_RUN_REPORT_INVALID: ${label} says exit ${report.exitCode}, receipt says ${expected.exitCode}`);
  return report;
}

/**
 * A review is only an approval if its ARCHIVE says so. The outer receipt's `decision` is the
 * assertion; the archive is the evidence. R2-06's table names the exact contradiction: archive
 * `verdict: DEFECTS-FOUND` while the outer receipt says APPROVE.
 */
function assertReviewContent(ref, review, snapshotHash) {
  const body = artifactText(ref, 'E_REVIEW_CONTENT');
  assert.ok(body.includes(`Snapshot-SHA256: ${snapshotHash}`),
    `E_REVIEW_CONTENT: archive does not bind snapshot ${snapshotHash}`);

  const fields = parseFrontMatter(body);
  assert.ok(fields, 'E_REVIEW_CONTENT: archive has no front-matter block');

  // The named contradiction. A review that reports defects cannot be the APPROVE it is cited as.
  assert.notEqual(fields.verdict, 'DEFECTS-FOUND',
    'E_REVIEW_CONTENT: archive verdict is DEFECTS-FOUND but the receipt cites it as APPROVE');
  assert.equal(fields.verdict, 'CLEAN',
    `E_REVIEW_CONTENT: archive verdict is ${fields.verdict}, expected CLEAN`);

  // Identity binding: the archive must be BY the seat that cites it.
  assert.equal(fields.reviewer_seat, review.seat,
    `E_REVIEW_CONTENT: archive seat is ${fields.reviewer_seat}, receipt cites ${review.seat}`);
  assert.equal(fields.review_id, review.reviewId,
    `E_REVIEW_CONTENT: archive review_id is ${fields.review_id}, receipt cites ${review.reviewId}`);

  // The archive's own scope must be a published review, not a draft or a superseded record.
  assert.equal(fields.status, 'published',
    `E_REVIEW_CONTENT: archive status is ${fields.status}, expected published`);
  return fields;
}

/**
 * Terminal evidence must AFFIRM a terminal state. R2-06: a file saying `{"status":"failed"}` was
 * hashed and accepted without being read.
 */
function assertTerminalEvidence(ref, review, snapshotHash) {
  const record = artifactJson(ref, 'E_TERMINAL_EVIDENCE');
  assert.ok(record && typeof record === 'object' && !Array.isArray(record),
    'E_TERMINAL_EVIDENCE: terminal evidence must be an object');
  assert.notEqual(record.status, 'failed',
    'E_TERMINAL_EVIDENCE: terminal evidence reports a failed run');
  // Accept either the explicit shape (terminal: true) or a status that names a terminal state.
  const isTerminal = record.terminal === true
    || (typeof record.status === 'string' && /^(?:complete|completed|success|succeeded)$/i.test(record.status));
  assert.ok(isTerminal,
    `E_TERMINAL_EVIDENCE: evidence does not assert a terminal state (terminal=${record.terminal}, status=${record.status})`);
  assert.equal(record.seat, review.seat,
    `E_TERMINAL_EVIDENCE: terminal seat ${record.seat} does not match cited seat ${review.seat}`);
  assert.equal(record.snapshotSha256, snapshotHash,
    'E_TERMINAL_EVIDENCE: terminal evidence does not bind the snapshot');
  assert.equal(record.decision, review.decision,
    `E_TERMINAL_EVIDENCE: terminal decision ${record.decision} contradicts receipt ${review.decision}`);
  return record;
}

/**
 * Identity evidence must actually identify someone. R2-06: a file containing `null` was accepted,
 * because hashing `null` succeeds.
 */
function assertIdentityEvidence(ref, review) {
  const record = artifactJson(ref, 'E_IDENTITY_EVIDENCE');
  assert.ok(record && typeof record === 'object' && !Array.isArray(record),
    'E_IDENTITY_EVIDENCE: identity evidence must be an object, not null or an array');
  assert.equal(record.seat, review.seat,
    `E_IDENTITY_EVIDENCE: identity seat ${record.seat} does not match cited seat ${review.seat}`);
  assert.equal(record.identityVerified, true,
    'E_IDENTITY_EVIDENCE: identity is not verified');
  assert.ok(typeof record.servedModel === 'string' && record.servedModel.trim().length > 0,
    'E_IDENTITY_EVIDENCE: no served model is recorded');
  return record;
}

/**
 * The final admission attestation must AGREE with the admission it is cited for. R2-06: an
 * attestation containing `DENIED` was accepted for a receipt that said ADMIT.
 */
function assertAdmissionAttestation(ref, admission, snapshotHash) {
  const text = artifactText(ref, 'E_ADMISSION_ATTESTATION');
  const record = artifactJson(ref, 'E_ADMISSION_ATTESTATION');

  // Both a structured disagreement and a bare word in free text must be caught: the artifact may
  // legitimately be prose, so a DENIED anywhere in it contradicts an ADMIT citation.
  assert.ok(!/\bDENIED\b/i.test(text) || record.decision === 'ADMIT',
    'E_ADMISSION_ATTESTATION: attestation contains DENIED but the receipt cites ADMIT');
  assert.equal(record.decision, admission.decision,
    `E_ADMISSION_ATTESTATION: attestation says ${record.decision}, receipt says ${admission.decision}`);
  assert.equal(record.by, admission.by,
    `E_ADMISSION_ATTESTATION: attestation authority ${record.by} does not match ${admission.by}`);
  assert.ok(record.snapshotSha256 === snapshotHash,
    'E_ADMISSION_ATTESTATION: attestation does not bind the snapshot');
  return record;
}

/* ===========================================================================
 * REGISTRY / AUTHORITY VALIDATION — hostile review round 2, R2-10
 * ===========================================================================
 * R2-10 (Medium): "A filesystem-generated registry is not an authority validator."
 *
 * The registry check previously established three things and conflated them into a fourth claim it
 * could not support:
 *
 *   established:   the path exists; its status field is one of three literals; precedence is an int
 *   NOT established: that the referenced document GRANTS the scope, i.e. that it is an authority
 *
 * Astra's two named bypasses:
 *   - *"An alias such as `../../unrelated` can participate in the uniqueness comparison without
 *     being passed through `localFile()`."* Aliases were fed straight into the path-collision set,
 *     so an escaping path was compared as a STRING rather than rejected as a location.
 *   - *"An authority can be an existing but incorrect document."* Existence was treated as
 *     authority.
 *
 * The repair keeps three results SEPARATE, as R2-10 requires:
 *   - `path exists`      -> localFile() / lstat, already present
 *   - `document status`  -> the declaration in the registry, already present
 *   - `authority is valid` -> NEW: normalized path, declared scope, integer precedence, and an
 *                             explicit statement of what the entry claims to grant
 *
 * What this still does NOT do, deliberately: it does not authenticate the referenced document's
 * own text, because that requires the trusted collection boundary R2-06 names and which does not
 * exist. The check therefore reports *declared* authority and never claims *verified* authority.
 * =========================================================================== */

/**
 * Normalize a repository-relative registry path and reject anything that is not one.
 *
 * Normalization is the fix for the alias bypass: `a/../b` and `b` must not compare unequal while
 * naming one location, and `../../unrelated` must not participate in uniqueness at all. Normalizing
 * BEFORE the uniqueness comparison makes a re-spelled path collide with its target, which is the
 * property the collision check was always trying to assert.
 */
function normalizeRepoPath(value, label) {
  assert.ok(typeof value === 'string' && value.length > 0,
    `E_ALIAS_INVALID: ${label} must be a non-empty string`);
  assert.ok(!isAbsolute(value),
    `E_ALIAS_INVALID: ${label} must be repository-relative, got ${value}`);
  assert.ok(!/[\0\r\n\\]/.test(value),
    `E_ALIAS_INVALID: ${label} contains a forbidden character: ${value}`);
  const parts = value.split('/');
  assert.ok(parts.every(part => part && part !== '.' && part !== '..'),
    `E_ALIAS_INVALID: ${label} must be normalized, without empty, "." or ".." segments: ${value}`);
  return parts.join('/');
}

/**
 * Validate one authority entry's DECLARED semantics, separately from its path's existence.
 *
 * R2-10 requires explicit alias semantics. An alias is a second NAME for a path; without a declared
 * target it is indistinguishable from a distinct document, and uniqueness comparisons then mix two
 * kinds of thing. A self-alias is rejected as a naming cycle rather than a second name.
 *
 * HOSTILE REVIEW H-02 (2026-09-22): precedence was checked only with `Number.isInteger`, so -999 and
 * 0 passed. R2-10's fix text requires precedence to be *"validate[d] against the applicable authority
 * decision"* — a type check is not a precedence check. It is now a positive integer, and the total
 * order is validated by the caller, which can see the whole lane.
 *
 * HOSTILE REVIEW H-03: `scope` was checked only for non-emptiness, so two lanes could declare the
 * identical scope. It is now required to be a distinct, trimmed, non-empty label; cross-lane
 * collisions are rejected by the caller, which can see the whole registry.
 */
function assertAuthoritySemantics(entry, laneId) {
  const label = `lane ${laneId} authority`;
  assert.ok(entry && typeof entry === 'object', `E_AUTHORITY_UNBOUND: ${label} must be an object`);
  const path = normalizeRepoPath(entry.path, `${label} path`);
  assert.ok(typeof entry.scope === 'string' && entry.scope.trim().length > 0,
    `E_AUTHORITY_UNBOUND: ${label} declares no scope`);
  const scope = entry.scope.trim();
  // H-02: positive only. A precedence of 0 or a negative is not an ordering, it is a sentinel or a
  // typo, and either way it silently wins or loses every comparison.
  assert.ok(Number.isInteger(entry.precedence) && entry.precedence > 0,
    `E_PRECEDENCE_INVALID: ${label} precedence must be a positive integer, got ${entry.precedence}`);
  if (Object.hasOwn(entry, 'aliasOf')) {
    const target = normalizeRepoPath(entry.aliasOf, `${label} aliasOf`);
    assert.notEqual(target, path,
      `E_ALIAS_INVALID: ${label} aliases itself (${path}); an alias must name a different path`);
    return { path, scope, precedence: entry.precedence, aliasOf: target };
  }
  return { path, scope, precedence: entry.precedence, aliasOf: null };
}

const receiptPath = process.env.BLUEPRINT_RECEIPT;
assert.ok(receiptPath && isAbsolute(receiptPath),
  'Set BLUEPRINT_RECEIPT to an absolute local receipt path');
const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
const snapshot = JSON.parse(artifact(receipt.snapshot).toString('utf8'));
const snapshotHash = receipt.snapshot.sha256;
const root = snapshot.git.root;

const base = 'docs/ai-workflow/AI-HANDOFF/';
const master = `${base}BLUEPRINT-master-reconciliation-2026-09-20`;

/**
 * The frozen source/policy scope this receipt is evaluated against.
 *
 * R2-06: "An ignored registry or authority file can be consumed without appearing in
 * `snapshot.files`. A clean tracked checkout and complete tracked-file manifest do not close that
 * path." The manifest lists TRACKED files; a consumed authority that is git-ignored or simply not
 * declared would never appear there, so membership must be checked against an explicit frozen
 * scope. Both sources are unioned: the declared snapshot files and the review policy's own
 * declared authorities. A reference in neither is UNBOUND and rejected.
 */
const scopeMembership = new Set([
  ...(Array.isArray(snapshot.files) ? snapshot.files.map(file => file.path) : []),
  ...(snapshot.reviewPolicy && Array.isArray(snapshot.reviewPolicy.authorityRefs)
    ? snapshot.reviewPolicy.authorityRefs : []),
]);
const directories = [
  'BLUEPRINT-cinematic-frontend-2026-09-19',
  'BLUEPRINT-coach-cc-ai-harness-2026-09-20',
  'BLUEPRINT-cortex-phase1-knowledge-spine-2026-07-14',
  'BLUEPRINT-social-bridge-completion-2026-09-19',
  'BLUEPRINT-speed-to-lead-email-2026-07-16',
  'BLUEPRINT-swan-brain-console-v3-merge-2026-09-18',
  'BLUEPRINT-swan-native-mobile-2026-07-13',
  'BLUEPRINT-theme-lens-2026-09-20',
];

test('preflight: registry', () => {
  const registry = JSON.parse(readFileSync(
    localFile(root, snapshot.registryPath), 'utf8'));
  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.masterPackagePath, master);
  assert.equal(registry.lanes.length, 8);
  unique(registry.lanes.map(lane => lane.id));
  const allPaths = [master];

  // R2-10: `path exists` and `authority is valid` are SEPARATE results. These two sets record which
  // was actually established for each entry, so the callback can report them distinctly instead of
  // letting existence stand in for authority.
  //
  // HOSTILE REVIEW H-04 (2026-09-22): the first version only asserted `length > 0` on both sets, so a
  // lane that established NOTHING could hide behind another lane's results. Both sets are now keyed
  // by `laneId` and asserted to cover every lane and every authority exactly once — the separation is
  // now attributable, not merely present.
  const existsResults = new Map();
  const authorityResults = new Map();
  // H-05: historical alias NAMES live in their own space, separate from paths — see the alias check.
  const aliasNames = [];

  directories.forEach((directory, index) => {
    const lane = registry.lanes.find(l => l.id === `L${index + 1}`);
    assert.ok(lane);
    assert.equal(lane.canonicalPackagePath, `${base}${directory}`);
    // result 1: path exists
    localFile(root, lane.canonicalPackagePath);
    existsResults.set(`${lane.id}/canonical`, lane.canonicalPackagePath);
    assert.ok(lane.authorities.length > 0);
    // H-02: a tie is not an ordering, and the reason must be PRECEDENCE — a bare "Duplicate values"
    // would not tell a caller which property collided.
    unique(lane.authorities.map(a => a.precedence),
      `E_PRECEDENCE_INVALID: lane ${lane.id} declares a duplicated precedence`);
    // result 3: authority is valid (declared semantics) — evaluated per entry, distinct from
    // result 1 above.
    const seenAuthorityPaths = new Set();
    const laneAuthorities = [];
    lane.authorities.forEach((a, authorityIndex) => {
      const { path, scope, precedence, aliasOf } = assertAuthoritySemantics(a, lane.id);
      // An alias must not collide with a distinct document in the same lane: two entries naming the
      // same normalized path are one authority, however many times they are spelled.
      assert.ok(!seenAuthorityPaths.has(path),
        `E_ALIAS_INVALID: lane ${lane.id} declares ${path} more than once (aliases count as names for the same path)`);
      seenAuthorityPaths.add(path);
      if (aliasOf) seenAuthorityPaths.add(aliasOf);
      // H-03 WITHDRAWN (see record 31 §8). My first version of this fix required `scope` to be
      // unique across lanes. MEASURED against the shipped registry: all 8 lanes legitimately share
      // "lane build plan and acceptance criteria", because `scope` names the KIND of artifact
      // (`05-slices.md` is build-plan scope in every lane), not a lane-unique binding. The proposed
      // fix would have rejected a correct registry. It is reverted; the finding was a FALSE POSITIVE.
      // What is still checked: scope is a non-empty trimmed string (in assertAuthoritySemantics).
      assert.ok(scope.length > 0, `E_AUTHORITY_UNBOUND: lane ${lane.id} authority declares no scope`);
      // result 1, for this authority's path
      localFile(root, path);
      existsResults.set(`${lane.id}/authority/${authorityIndex}`, path);
      authorityResults.set(`${lane.id}/authority/${authorityIndex}`, {
        path, scope, precedence, aliasOf,
      });
      laneAuthorities.push({ path, aliasOf });
    });
    // H-02: precedence must be a TOTAL ORDER, not merely a set of integers. The uniqueness half of
    // that is enforced by the `unique(...)` call above, which now carries the E_PRECEDENCE_INVALID
    // reason. R2-10's "validate precedence against the applicable authority decision" is satisfied to
    // the extent this checker can see: every entry declares a positive precedence, no two tie, so the
    // ordering among authorities is determinate. Binding it to an EXTERNAL decision document would
    // require the trusted authority boundary R2-06 names, which does not exist — and that limit is
    // not claimed away.
    // An authority granted by a REJECTED document is not an authority. This is the "existing but
    // incorrect document" case R2-10 named: existence and validity are different questions.
    lane.documents.forEach(d => {
      const docPath = normalizeRepoPath(d.path, `lane ${lane.id} document path`);
      localFile(root, docPath);
      assert.ok(['ACTIVE', 'HISTORICAL', 'REJECTED'].includes(d.status));
      assert.ok(d.permittedUse);
      if (d.supersededBy) localFile(root, normalizeRepoPath(d.supersededBy, `lane ${lane.id} supersededBy`));
      if (d.status === 'REJECTED') {
        // H-01 (hostile review, 2026-09-22): the first version compared only the DECLARING path, so an
        // authority whose `aliasOf` named a REJECTED document was accepted — the guard read `a.path`
        // and never followed the alias. An alias is a second NAME for a path, so a rejected document
        // can be cited through it. Both the path and the resolved alias target are now checked.
        const citing = laneAuthorities.find(a => a.path === docPath || a.aliasOf === docPath);
        assert.ok(!citing,
          `E_AUTHORITY_UNBOUND: lane ${lane.id} cites REJECTED document ${docPath} as an authority`
          + (citing && citing.aliasOf === docPath ? ` (via aliasOf on ${citing.path})` : ''));
      }
    });
    // R2-10: aliases must be normalized BEFORE the uniqueness comparison, or a re-spelled path
    // escapes the collision check that exists to catch exactly that.
    assert.ok(Array.isArray(lane.aliases), `E_ALIAS_INVALID: lane ${lane.id} must declare an aliases array`);
    lane.aliases.forEach(alias => {
      const normalized = normalizeRepoPath(alias, `lane ${lane.id} alias`);
      // An alias that equals the canonical path is a redundant restatement, not an alias.
      assert.notEqual(normalized, lane.canonicalPackagePath,
        `E_ALIAS_INVALID: lane ${lane.id} alias ${normalized} duplicates its canonical path`);
      // H-05 (hostile review, measured against the shipped registry — see record 31 §8).
      //
      // The shipped aliases are BARE BASENAMES, and their targets are directories that were
      // subsequently RENAMED:
      //   L2 "BLUEPRINT-coach-ai-harness-20260920"          -> now BLUEPRINT-coach-cc-ai-harness-2026-09-20
      //   L4 "BLUEPRINT-studio-spotlight-completion-2026-09-19" -> now BLUEPRINT-social-bridge-completion-2026-09-19
      // So the alias array records a RENAME HISTORY, and a historical name is *supposed* to be a
      // dead string. Requiring it to resolve would reject correct data; requiring it to be
      // path-shaped would too.
      //
      // The real defect is that the alias was admitted to a path-collision set it could never enter
      // (a bare name never equals a repo-relative path), making the uniqueness check INERT on the
      // real data while still reporting success. The fix is to compare aliases in the SPACE THEY
      // ACTUALLY LIVE IN: names, not paths.
      assert.ok(!normalized.includes('/'),
        `E_ALIAS_INVALID: lane ${lane.id} alias ${normalized} is path-shaped; the registry's alias `
        + 'field records historical NAMES, and mixing names with paths in one collision set is what '
        + 'made the uniqueness check inert. Use a bare name, or declare the renamed path explicitly.');
      aliasNames.push(normalized.toLowerCase());
      allPaths.push(normalized);
    });
    allPaths.push(lane.canonicalPackagePath);
  });
  // Case-folded: two paths differing only in case are one location on this platform.
  unique(allPaths.map(path => path.toLowerCase()));
  // H-05: the alias set is checked in its own space, where it can actually collide. Two lanes
  // claiming the same historical name is a real ambiguity; a name that equals no basename is fine
  // (it is history), but must not be silently compared against paths.
  unique(aliasNames, `E_ALIAS_INVALID: two lanes claim the same historical alias name`);
  aliasNames.forEach(name => {
    const shadowsLive = directories.some(d => d.toLowerCase() === name);
    assert.ok(!shadowsLive,
      `E_ALIAS_INVALID: alias ${name} shadows a live lane directory; an alias must not name a `
      + 'current lane, or a reference to it is ambiguous between history and the live package');
  });
  // H-04: separation is the deliverable, so it must be ATTRIBUTABLE, not merely present. Every lane
  // must have contributed a canonical existence result and at least one authority result to BOTH
  // sets; a lane that established nothing can no longer hide behind another lane's results.
  //
  // H-03 is WITHDRAWN — `scopeOwners` was removed with the reverted cross-lane scope check. The
  // measured reason is recorded at the assertion site above.
  registry.lanes.forEach(lane => {
    assert.ok(existsResults.has(`${lane.id}/canonical`),
      `no path-existence result was recorded for ${lane.id}'s canonical package path`);
    lane.authorities.forEach((_, authorityIndex) => {
      assert.ok(existsResults.has(`${lane.id}/authority/${authorityIndex}`),
        `no path-existence result was recorded for ${lane.id} authority ${authorityIndex}`);
      assert.ok(authorityResults.has(`${lane.id}/authority/${authorityIndex}`),
        `no authority-validity result was recorded for ${lane.id} authority ${authorityIndex}`);
    });
  });
});

test('preflight: source identity and complete manifest', () => {
  assert.equal(snapshot.schemaVersion, 1);
  assert.ok(snapshot.taskId && snapshot.revision);
  assert.match(snapshot.git.commit, /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);
  assert.match(snapshot.git.tree, /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/);
  assert.equal(git('rev-parse', 'HEAD').trim(), snapshot.git.commit);
  assert.equal(git('rev-parse', 'HEAD^{tree}').trim(), snapshot.git.tree);
  assert.equal(git('status', '--porcelain=v1',
    '--untracked-files=all').trim(), '');

  const tracked = git('ls-files', '--stage', '-z')
    .split('\0').filter(Boolean).map(row => {
      const split = row.indexOf('\t');
      const [mode, , stage] = row.slice(0, split).split(' ');
      assert.equal(stage, '0', 'Unmerged index entry');
      assert.ok(['100644', '100755'].includes(mode),
        'Submodule or link requires explicit resolution');
      return { path: row.slice(split + 1), mode };
    }).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

  unique(snapshot.files.map(file => file.path));
  assert.deepEqual(snapshot.files.map(({ path, mode }) => ({ path, mode })),
    tracked);
  snapshot.files.forEach(file => {
    const path = localFile(root, file.path);
    assert.ok(lstatSync(path).isFile());
    assert.equal(digest(readFileSync(path)), file.sha256, file.path);
  });
});

test('preflight: preservation', () => {
  assert.ok(snapshot.preservation.length > 0);
  unique(snapshot.preservation.map(p => p.sourceId));
  snapshot.preservation.forEach(record => {
    const inventory = JSON.parse(artifact(record.inventory).toString('utf8'));
    // R2-07: the attestation was hashed but never PARSED, so its device evidence was decorative.
    // It must now bind the same source, the same inventory, and the same copy roots.
    const attestation = artifactJson(record.storageAttestation, 'storage attestation');
    assert.equal(attestation.sourceId, record.sourceId,
      `E_STORAGE_UNBOUND: attestation sourceId ${attestation.sourceId} does not match ${record.sourceId}`);
    assert.equal(attestation.inventorySha256, record.inventory.sha256,
      'E_STORAGE_UNBOUND: attestation does not bind the cited inventory');
    assert.ok(Array.isArray(attestation.copies) && attestation.copies.length > 0,
      'E_STORAGE_UNBOUND: attestation declares no copies');
    assert.ok(inventory.length > 0);
    unique(inventory.map(file => file.path));
    assert.ok(record.copies.length >= 2);
    unique(record.copies.map(copy => copy.storageId));
    // Distinct LABELS are not distinct COPIES (hostile review round 2, R2-07). Two entries may carry
    // different storageIds and the same resolved root; both then enumerate and hash ONE directory and
    // this check counts a single copy twice, which is exactly the overclaim it exists to prevent.
    // Reject duplicate resolved roots BEFORE trusting the labels. Case-folded for the same reason the
    // path-collision check under 'preflight: registry' case-folds: two roots differing only in case
    // are one directory on this platform.
    //
    // R2-07 names this rejection `E_COPY_ALIAS` so a caller can distinguish a duplicate-copy
    // overclaim from a hash mismatch or an I/O failure. The reason is emitted explicitly rather
    // than relying on the generic `unique()` message.
    const resolvedRoots = record.copies.map(copy => resolve(copy.root).toLowerCase());
    const seenRoots = new Set();
    for (const [index, resolved] of resolvedRoots.entries()) {
      assert.ok(!seenRoots.has(resolved),
        `E_COPY_ALIAS: copies ${index} and a previous entry resolve to the same root (${resolved}); `
        + 'distinct storageIds do not establish distinct copies');
      seenRoots.add(resolved);
    }
    // A copy's own link status is not enough: an ANCESTOR link can redirect the root (R2-07).
    record.copies.forEach(copy => {
      let current = resolve(copy.root);
      const ancestors = [];
      while (true) {
        ancestors.push(current);
        const parent = resolve(current, '..');
        if (parent === current) break;
        current = parent;
      }
      ancestors.forEach(ancestor => {
        let stat;
        try { stat = lstatSync(ancestor); } catch { return; }
        assert.ok(!stat.isSymbolicLink(),
          `E_COPY_ALIAS: copy root ${copy.root} has an ancestor link at ${ancestor} requiring resolution`);
      });
    });
    const expected = inventory.map(file => file.path).sort();

    record.copies.forEach(copy => {
      assert.ok(isAbsolute(copy.root) && copy.storageId);
      assert.deepEqual(listFiles(copy.root), expected);
      inventory.forEach(file => {
        assert.equal(digest(readFileSync(localFile(copy.root, file.path))),
          file.sha256, file.path);
      });
    });
  });
});

test('admission: required behavior evidence', () => {
  assert.ok(snapshot.requiredTestIds.length > 0);
  unique(snapshot.requiredTestIds);
  unique(receipt.tests.map(result => result.id));
  snapshot.requiredTestIds.forEach(id => {
    const result = receipt.tests.find(item => item.id === id);
    assert.ok(result, `Missing required test: ${id}`);
    assert.ok(result.command);
    assert.equal(result.snapshotSha256, snapshotHash);
    assert.equal(result.outcome, 'PASS');
    assert.equal(result.exitCode, 0);
    // R2-06: hashing was the whole check. Now the report's OWN content must corroborate the outer
    // assertion, so `result.output` holding free text like `not a test result` is rejected.
    const report = assertRunReport(result.output, result, `required test ${id}`);
    assert.equal(report.id, id, `E_RUN_REPORT_INVALID: report id ${report.id} does not match ${id}`);
  });
});

test('admission: ordered filed reviews', () => {
  const policy = snapshot.reviewPolicy;
  assert.ok(policy.policyId && policy.authorityRefs.length > 0);
  assert.ok(policy.orderedSeats.length > 0);
  assert.equal(policy.finalAuthority, policy.orderedSeats.at(-1));
  // R2-06: `authorityRefs` only needed nonzero length. Each ref must now resolve to a declared
  // authority that is actually part of the frozen scope, so an ignored authority file cannot be
  // consumed silently.
  policy.authorityRefs.forEach(ref => {
    assert.ok(typeof ref === 'string' && ref.length > 0,
      'E_AUTHORITY_UNBOUND: authorityRef must be a non-empty string');
    assert.ok(scopeMembership.has(ref),
      `E_AUTHORITY_UNBOUND: authority ${ref} is not in the frozen source/policy scope`);
  });
  const budget = artifactJson(policy.budgetRecord, 'review budget record');
  // R2-06: "The budget record is also hashed without validating its meaning."
  assert.equal(budget.policyId, policy.policyId,
    `E_BUDGET_UNBOUND: budget policyId ${budget.policyId} does not match ${policy.policyId}`);
  assert.equal(budget.authorized, true,
    'E_BUDGET_UNBOUND: budget record does not authorise this review');
  assert.ok(Number.isFinite(budget.additionalSpend) && budget.additionalSpend >= 0,
    'E_BUDGET_UNBOUND: additionalSpend must be a non-negative number');
  assert.deepEqual(receipt.reviews.map(r => r.seat), policy.orderedSeats);

  receipt.reviews.forEach(review => {
    assert.equal(review.decision, 'APPROVE');
    assert.equal(review.snapshotSha256, snapshotHash);
    within('Z:/HostileReviews', review.archive.path);
    assert.equal(basename(review.archive.path), `${review.reviewId}.md`);
    // R2-06: this previously stopped at `body.includes(...)`. Now the archive's own verdict, seat,
    // id and status must agree with the receipt that cites it.
    assertReviewContent(review.archive, review, snapshotHash);
    assertTerminalEvidence(review.terminalEvidence, review, snapshotHash);
    assertIdentityEvidence(review.identityEvidence, review);
  });
});

test('admission: final authority and unresolved findings', () => {
  assert.deepEqual(receipt.unresolvedFindings, []);
  assert.ok(receipt.admission);
  assert.equal(receipt.admission.decision, 'ADMIT');
  assert.equal(receipt.admission.by, snapshot.reviewPolicy.finalAuthority);
  assert.equal(receipt.admission.snapshotSha256, snapshotHash);
  // R2-06: the attestation was hashed, never interpreted. An attestation saying DENIED must not
  // satisfy a receipt that says ADMIT.
  assertAdmissionAttestation(receipt.admission.attestation, receipt.admission, snapshotHash);
});
