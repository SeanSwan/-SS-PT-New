/**
 * clientRecord.test.mjs — regression suite for record writing + the privacy path jail.
 * Run: node --test scripts/hermes/clientNotes/clientRecord.test.mjs
 *
 * The jail tests are the point: client data must be structurally incapable of landing in the repo
 * or anywhere the vault indexer would sweep it. Several tests encode failures found by the
 * 2026-07-20 hostile review — each comment names the failure it pins down.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  resolveRecordRoot, ensureRecordRoot, clientFileName, formatExercise, formatSessionBlock,
  appendSession, readRecord, normalizeDateIso, sessionExists, writeIndex,
} from './clientRecord.mjs';

function tmpRoot() { return mkdtempSync(join(tmpdir(), 'swan-notes-')); }
const REPO = '/fake/repo';

// ── PRIVACY JAIL ────────────────────────────────────────────────────────────
test('JAIL: refuses to write inside the given repo path', () => {
  assert.throws(() => resolveRecordRoot(join(REPO, 'client-notes'), REPO), /inside the git repo/);
  assert.throws(() => resolveRecordRoot(REPO, REPO), /inside the git repo/);
});

test('JAIL: refuses paths under the Hermes vault or a collections dir', () => {
  assert.throws(() => resolveRecordRoot('/home/u/hermes2/brain-vault/notes', REPO), /brain-vault/);
  assert.throws(() => resolveRecordRoot('/home/u/data/collections/clients', REPO), /collections/);
});

test('JAIL: refuses an empty/missing root rather than defaulting silently', () => {
  assert.throws(() => resolveRecordRoot('', REPO), /record root is required/);
  assert.throws(() => resolveRecordRoot(undefined, REPO), /record root is required/);
});

test('JAIL: a safe root outside the repo is accepted', () => {
  const root = tmpRoot();
  try { assert.equal(typeof resolveRecordRoot(root, REPO), 'string'); }
  finally { rmSync(root, { recursive: true, force: true }); }
});

/**
 * REGRESSION (hostile review 2026-07-20): the original jail compared only against the repoRoot
 * PARAMETER (default cwd). Run from a subdirectory, a target elsewhere inside the same repo passed.
 * The jail now walks every ancestor for a `.git` marker — "never inside ANY git repo" is structural.
 */
test('REGRESSION JAIL: any ancestor .git refuses the root, regardless of repoRoot param', () => {
  const fake = tmpRoot();
  try {
    mkdirSync(join(fake, 'project', '.git'), { recursive: true });
    assert.throws(
      () => resolveRecordRoot(join(fake, 'project', 'data', 'notes'), '/somewhere/else'),
      /\.git repository is an ancestor/,
    );
    // A sibling with no .git ancestor is still fine.
    assert.equal(typeof resolveRecordRoot(join(fake, 'clean', 'notes'), '/somewhere/else'), 'string');
  } finally { rmSync(fake, { recursive: true, force: true }); }
});

/**
 * REGRESSION (hostile review 2026-07-20): a symlink/junction root pointing back into a repo
 * validated only its lexical path. existsSync follows links, so the ancestor walk catches it.
 * Junction creation can fail without privileges — skip rather than false-fail.
 */
test('REGRESSION JAIL: junction/symlink into a repo is refused', (t) => {
  const fake = tmpRoot();
  const linkBase = tmpRoot();
  try {
    mkdirSync(join(fake, 'repo', '.git'), { recursive: true });
    mkdirSync(join(fake, 'repo', 'inner'), { recursive: true });
    const link = join(linkBase, 'link');
    try {
      symlinkSync(join(fake, 'repo', 'inner'), link, 'junction');
    } catch {
      t.skip('cannot create junction on this system');
      return;
    }
    assert.throws(() => resolveRecordRoot(join(link, 'notes'), '/somewhere/else'), /\.git repository is an ancestor/);
  } finally {
    rmSync(linkBase, { recursive: true, force: true });
    rmSync(fake, { recursive: true, force: true });
  }
});

test('JAIL: root creation drops a `*` .gitignore so it can never become tracked', () => {
  const root = tmpRoot();
  try {
    ensureRecordRoot(root, REPO);
    const gi = readFileSync(join(root, '.gitignore'), 'utf8');
    assert.match(gi, /^\*$/m, '.gitignore must ignore everything');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// ── timestamps ──────────────────────────────────────────────────────────────
/**
 * REGRESSION (hostile review 2026-07-20): Hermes `messages.timestamp` is a UNIX EPOCH — the dry run
 * printed `[1784228678]` as a "date", and the old formatter would have written `## 1784228678` as a
 * day heading into a client's record.
 */
test('REGRESSION: normalizeDateIso handles epoch seconds, epoch millis, ISO, and refuses garbage', () => {
  assert.match(normalizeDateIso(1784228678), /^2026-07-1\d/, 'epoch seconds');
  assert.match(normalizeDateIso('1784228678'), /^2026-07-1\d/, 'epoch seconds as string');
  assert.match(normalizeDateIso(1784228678000), /^2026-07-1\d/, 'epoch millis');
  assert.equal(normalizeDateIso('2026-07-20T10:00:00Z'), '2026-07-20T10:00:00.000Z', 'ISO passthrough');
  assert.throws(() => normalizeDateIso('not a date'), /unusable timestamp/);
  assert.throws(() => normalizeDateIso(''), /missing timestamp/);
  assert.throws(() => normalizeDateIso(null), /missing timestamp/);
});

test('REGRESSION: formatSessionBlock renders a real day heading from an epoch input', () => {
  const block = formatSessionBlock({
    dateIso: 1784228678,
    exercises: [{ name: 'squat', sets: 5, reps: 5, weight: 135, unit: 'lb' }],
  });
  assert.match(block, /## 2026-07-1\d/, 'must be a calendar day, not an epoch number');
  assert.doesNotMatch(block, /1784228678/);
});

// ── naming ──────────────────────────────────────────────────────────────────
test('clientFileName: ids and names produce stable distinct files', () => {
  assert.equal(clientFileName({ kind: 'id', value: '84' }), 'client-84.md');
  assert.equal(clientFileName({ kind: 'name', value: 'Sarah M' }), 'client-name-sarah-m.md');
});

test('clientFileName: rejects a name that slugifies to nothing', () => {
  assert.throws(() => clientFileName({ kind: 'name', value: '!!!' }), /empty slug/);
});

// ── formatting ──────────────────────────────────────────────────────────────
test('formatExercise: load shown when present, omitted for bodyweight', () => {
  assert.equal(formatExercise({ name: 'bench', sets: 3, reps: 8, weight: 95, unit: 'lb' }), '- bench — 3×8 @ 95lb');
  assert.equal(formatExercise({ name: 'pushups', sets: 3, reps: 15, weight: null, unit: null }), '- pushups — 3×15');
});

/** REGRESSION: trailing dictation captured as `note` must survive into the record. */
test('REGRESSION: formatExercise prints the preserved note', () => {
  assert.equal(
    formatExercise({ name: 'bench', sets: 3, reps: 8, weight: 95, unit: 'lb', note: 'felt heavy' }),
    '- bench — 3×8 @ 95lb (felt heavy)',
  );
});

test('formatSessionBlock: preserves unparsed notes verbatim', () => {
  const block = formatSessionBlock({
    dateIso: '2026-07-20T10:00:00Z',
    exercises: [{ name: 'squat', sets: 5, reps: 5, weight: 135, unit: 'lb' }],
    unparsed: ['left knee felt tight'],
  });
  assert.match(block, /## 2026-07-20/);
  assert.match(block, /- squat — 5×5 @ 135lb/);
  assert.match(block, /left knee felt tight/);
});

// ── append behaviour ────────────────────────────────────────────────────────
test('appendSession: creates the file with a privacy header, then appends', () => {
  const root = tmpRoot();
  try {
    const ref = { kind: 'id', value: '84' };
    const r1 = appendSession({
      root, repoRoot: REPO, clientRef: ref, dateIso: '2026-07-20T10:00:00Z',
      exercises: [{ name: 'bench', sets: 3, reps: 8, weight: 95, unit: 'lb' }],
    });
    assert.equal(r1.skipped, false);
    assert.ok(existsSync(r1.file));
    let body = readFileSync(r1.file, 'utf8');
    assert.match(body, /privacy: LOCAL ONLY/);
    assert.match(body, /# Client 84 — training record/);

    appendSession({
      root, repoRoot: REPO, clientRef: ref, dateIso: '2026-07-21T10:00:00Z',
      exercises: [{ name: 'squat', sets: 5, reps: 5, weight: 135, unit: 'lb' }],
    });
    body = readFileSync(r1.file, 'utf8');
    assert.equal((body.match(/# Client 84 — training record/g) || []).length, 1, 'header written once only');
    assert.match(body, /## 2026-07-20/);
    assert.match(body, /## 2026-07-21/, 'second session appended, first retained');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/**
 * REGRESSION (hostile review 2026-07-20): re-running export+ingest --apply appended duplicate
 * session blocks. The sourceRef is the idempotency key — the same double-award class the
 * gamification gotcha warns about, applied to training records.
 */
test('REGRESSION: same sourceRef twice → skipped, exactly one block written', () => {
  const root = tmpRoot();
  try {
    const args = {
      root, repoRoot: REPO, clientRef: { kind: 'id', value: '84' },
      dateIso: '2026-07-20T10:00:00Z',
      exercises: [{ name: 'bench', sets: 3, reps: 8, weight: 95, unit: 'lb' }],
      sourceRef: 'hermes msg 123 (telegram)',
    };
    const r1 = appendSession(args);
    assert.equal(r1.skipped, false);
    assert.equal(sessionExists(args), true);

    const r2 = appendSession(args);
    assert.equal(r2.skipped, true, 'second write with the same sourceRef must be skipped');
    const body = readFileSync(r1.file, 'utf8');
    assert.equal((body.match(/hermes msg 123/g) || []).length, 1, 'exactly one block');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('appendSession: refuses a session with no exercises', () => {
  const root = tmpRoot();
  try {
    assert.throws(() => appendSession({
      root, repoRoot: REPO, clientRef: { kind: 'id', value: '84' },
      dateIso: '2026-07-20T10:00:00Z', exercises: [],
    }), /no exercises/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('readRecord: returns null for an unknown client', () => {
  const root = tmpRoot();
  try {
    assert.equal(readRecord({ root, repoRoot: REPO, clientRef: { kind: 'id', value: '999' } }), null);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// ── index ───────────────────────────────────────────────────────────────────
/** REGRESSION (round 3): writeIndex on a fresh, never-written root must create it, not ENOENT. */
test('REGRESSION: writeIndex on an empty fresh root creates the dir and an empty index', () => {
  const base = tmpRoot();
  const root = join(base, 'never-created');
  try {
    const { file, clients } = writeIndex({ root, repoRoot: REPO });
    assert.equal(clients, 0);
    assert.ok(existsSync(file));
  } finally { rmSync(base, { recursive: true, force: true }); }
});

test('writeIndex: one row per client, counts sessions, skips non-client files', () => {
  const root = tmpRoot();
  try {
    appendSession({
      root, repoRoot: REPO, clientRef: { kind: 'id', value: '84' }, dateIso: '2026-07-20T10:00:00Z',
      exercises: [{ name: 'bench', sets: 3, reps: 8, weight: 95, unit: 'lb' }],
    });
    appendSession({
      root, repoRoot: REPO, clientRef: { kind: 'id', value: '84' }, dateIso: '2026-07-21T10:00:00Z',
      exercises: [{ name: 'squat', sets: 5, reps: 5, weight: 135, unit: 'lb' }],
    });
    appendSession({
      root, repoRoot: REPO, clientRef: { kind: 'name', value: 'Sarah' }, dateIso: '2026-07-19T10:00:00Z',
      exercises: [{ name: 'rdl', sets: 3, reps: 10, weight: 95, unit: 'lb' }],
    });
    const { file, clients } = writeIndex({ root, repoRoot: REPO });
    assert.equal(clients, 2);
    const body = readFileSync(file, 'utf8');
    assert.match(body, /client-84\.md \| 2 \| 2026-07-21/);
    assert.match(body, /client-name-sarah\.md \| 1 \| 2026-07-19/);
    assert.doesNotMatch(body, /INDEX\.md \|/, 'must not index itself');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
