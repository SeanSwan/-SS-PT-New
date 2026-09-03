/**
 * token-registry-check.test.mjs — coverage for --added-only (CLAUDE.md Rule 6).
 * Run: node scripts/hooks/token-registry-check.test.mjs
 *
 * WHY --added-only EXISTS, AND WHY IT NEEDS THIS TEST
 * ---------------------------------------------------
 * G4 in frontend-guards proves a raw hex sits in the FALLBACK POSITION of
 * var(--token, #hex). It cannot prove the token exists. `var(--bg-elevatd, #141419)`
 * — one transposed letter — passes G4 and renders its fallback forever.
 *
 * The obvious wiring (--strict at commit time) is unusable: measured 2026-08-21, the
 * standing backlog is 831 undefined token uses across 1,735 sites plus 610 drift
 * findings, and --strict blocked a sampled 32% of frontend files on debt their author
 * never wrote. A gate that fails on inherited debt gets switched off (Rule 34).
 *
 * So --added-only carries the entire safety argument: it MUST block a token introduced
 * on an added line, and it MUST NOT block the same token when it was already there.
 * If that distinction breaks, the gate either stops catching typos or starts blocking
 * innocent commits — and both failures are silent. Hence a real git fixture per case
 * rather than a unit test over a parsed string.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, appendFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'token-registry-check.mjs');

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

/**
 * A disposable repo laid out like the real one: frontend/src plus a stylesheet that
 * DEFINES a token, so "defined" and "undefined" are both genuinely exercised. The
 * script resolves ROOT relative to cwd, so it must run with cwd = the sandbox.
 */
function sandbox() {
  const dir = mkdtempSync(join(tmpdir(), 'tokreg-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'pipe' });
  mkdirSync(join(dir, 'frontend', 'src', 'styles'), { recursive: true });
  writeFileSync(
    join(dir, 'frontend', 'src', 'styles', 'theme.css'),
    ':root {\n  --bg-elevated: #141419;\n  --accent-primary: #60C0F0;\n}\n',
  );
  git('init', '-q');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'test');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  return {
    dir,
    git,
    file(rel, contents) {
      writeFileSync(join(dir, 'frontend', 'src', rel), contents);
      return `frontend/src/${rel}`;
    },
    append(rel, contents) {
      appendFileSync(join(dir, 'frontend', 'src', rel), contents);
      return `frontend/src/${rel}`;
    },
    /** Run the checker with cwd = sandbox, exactly as the pre-commit hook does. */
    run(args) {
      const r = spawnSync('node', [SCRIPT, ...args], { cwd: dir, encoding: 'utf8' });
      return { code: r.status, out: `${r.stdout}${r.stderr}` };
    },
    cleanup() { rmSync(dir, { recursive: true, force: true }); },
  };
}

// ── the case the gate exists for ────────────────────────────────────────────────
t('undefined token on an ADDED line → blocks, names the token and the file:line', () => {
  const s = sandbox();
  try {
    const f = s.file('a.ts', 'export const a = `color: var(--totally-made-up, #fff);`;\n');
    s.git('add', f);
    const r = s.run(['--added-only', '--file', f]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /BLOCKING/);
    assert.match(r.out, /--totally-made-up/);
    assert.match(r.out, /a\.ts:1/);
  } finally { s.cleanup(); }
});

// ── the case that makes it shippable where --strict was not ─────────────────────
t('SAME undefined token, already committed, untouched line → does NOT block', () => {
  const s = sandbox();
  try {
    const f = s.file('b.ts', 'export const a = `color: var(--totally-made-up, #fff);`;\n');
    s.git('add', f);
    s.git('commit', '-q', '-m', 'inherited debt');
    s.append('b.ts', 'export const b = 1; // unrelated new line\n');
    s.git('add', f);
    const r = s.run(['--added-only', '--file', f]);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /not blocking: 1 pre-existing/);
  } finally { s.cleanup(); }
});

t('added line using a DEFINED token → does not block', () => {
  const s = sandbox();
  try {
    const f = s.file('c.ts', 'export const c = `color: var(--bg-elevated, #141419);`;\n');
    s.git('add', f);
    const r = s.run(['--added-only', '--file', f]);
    assert.equal(r.code, 0, r.out);
  } finally { s.cleanup(); }
});

t('inherited debt AND a new bad token in one commit → blocks, and only on the new one', () => {
  const s = sandbox();
  try {
    const f = s.file('d.ts', 'export const a = `var(--old-missing, #fff);`;\n');
    s.git('add', f);
    s.git('commit', '-q', '-m', 'inherited');
    s.append('d.ts', 'export const b = `var(--new-missing, #000);`;\n');
    s.git('add', f);
    const r = s.run(['--added-only', '--file', f]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /--new-missing/);
    const blocking = r.out.slice(r.out.indexOf('BLOCKING'), r.out.indexOf('not blocking'));
    assert.doesNotMatch(blocking, /--old-missing/, 'inherited token must not be in the BLOCKING list');
  } finally { s.cleanup(); }
});

t('file staged with NO diff hunks (unchanged) → does not block', () => {
  const s = sandbox();
  try {
    const f = s.file('e.ts', 'export const a = `var(--totally-made-up, #fff);`;\n');
    s.git('add', f);
    s.git('commit', '-q', '-m', 'committed');
    const r = s.run(['--added-only', '--file', f]);
    assert.equal(r.code, 0, r.out);
  } finally { s.cleanup(); }
});

// ── the pre-existing modes must be untouched by this change ─────────────────────
t('token bound to a const and set via setProperty(VAR) is DEFINED, not undefined', () => {
  // The false positive that would have blocked f73663109, a commit already on main.
  // Caught by replaying real history against the gate; fixtures never produced this shape.
  const s = sandbox();
  try {
    s.file('slider.ts', "export const SLIDER_POSITION_VAR = '--swan-slider-pos';\n"
      + 'export const set = (el, v) => el.style.setProperty(SLIDER_POSITION_VAR, v);\n');
    const f = s.file('use.ts', 'export const a = `left: var(--swan-slider-pos, 50%);`;\n');
    s.git('add', '-A');
    const r = s.run(['--added-only', '--file', f]);
    assert.equal(r.code, 0, r.out);
  } finally { s.cleanup(); }
});

t('indirection does NOT excuse a token that is never bound anywhere', () => {
  // The other half: the widening must not turn the gate off. --accent-warm was a REAL
  // defect on main (used with a hardcoded fallback, defined nowhere) and must still fail.
  const s = sandbox();
  try {
    const f = s.file('warm.ts', 'export const a = `background: var(--accent-warm, #ff6b35);`;\n');
    s.git('add', f);
    const r = s.run(['--added-only', '--file', f]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /--accent-warm/);
  } finally { s.cleanup(); }
});

t('CACHE: a second run returns the identical verdict (cache hit changes nothing)', () => {
  const s = sandbox();
  try {
    const f = s.file('cache-a.ts', 'export const a = `var(--totally-made-up, #fff);`;\n');
    s.git('add', f);
    const first = s.run(['--added-only', '--file', f]);
    const second = s.run(['--added-only', '--file', f]);
    assert.equal(first.code, 1, first.out);
    assert.equal(second.code, first.code, 'cached run disagreed with the fresh run');
    assert.match(second.out, /--totally-made-up/);
  } finally { s.cleanup(); }
});

t('CACHE: defining a token AFTER the cache was warmed stops the block', () => {
  // The staleness case that matters. If the cache could veto this, the gate would reject a
  // commit whose token plainly exists — the false-block class the whole design forbids.
  const s = sandbox();
  try {
    const f = s.file('cache-b.ts', 'export const a = `var(--defined-later, #fff);`;\n');
    s.git('add', f);
    const before = s.run(['--added-only', '--file', f]);
    assert.equal(before.code, 1, 'sanity: should block while genuinely undefined');

    s.file('styles/late.css', ':root { --defined-later: #123456; }\n');
    s.git('add', '-A');
    const after = s.run(['--added-only', '--file', f]);
    assert.equal(after.code, 0, `stale cache wrongly blocked a defined token:\n${after.out}`);
  } finally { s.cleanup(); }
});

t('REGRESSION: default mode still never fails, even with undefined tokens', () => {
  const s = sandbox();
  try {
    const f = s.file('f.ts', 'export const a = `var(--totally-made-up, #fff);`;\n');
    s.git('add', f);
    const r = s.run(['--file', f]);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /advisory/);
  } finally { s.cleanup(); }
});

t('REGRESSION: --strict still fails on inherited debt (unchanged behaviour)', () => {
  const s = sandbox();
  try {
    const f = s.file('g.ts', 'export const a = `var(--totally-made-up, #fff);`;\n');
    s.git('add', f);
    s.git('commit', '-q', '-m', 'inherited');
    const r = s.run(['--strict', '--file', f]);
    assert.equal(r.code, 1, r.out);
  } finally { s.cleanup(); }
});

t('REGRESSION: a nonexistent --file path still refuses to report CLEAN (exit 2)', () => {
  const s = sandbox();
  try {
    const r = s.run(['--added-only', '--file', 'frontend/src/does-not-exist.ts']);
    assert.equal(r.code, 2, r.out);
  } finally { s.cleanup(); }
});

// ---- X3: during a merge, "added" is measured against origin/main ----------
// `git diff --cached` is against HEAD, and during a merge HEAD is the PRE-merge tip — so
// every line carried in from origin/main reads as newly added by this commit. Blocking on
// those is blocking on already-deployed inherited debt, which is the exact case that made
// this gate --added-only rather than --strict (Rule 34).

/** A REAL merge: origin/main carries a file with an undefined token; this branch diverges
 *  without touching it. `git update-ref MERGE_HEAD` is refused as a pseudoref, so the merge
 *  is actually performed — and the fixture ASSERTS that it happened, because a fixture that
 *  silently fails to merge quietly tests the non-merge path instead and proves nothing. */
function mergeSandbox() {
  const s = sandbox();
  const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: s.dir, encoding: 'utf8' }).trim();
  const base = head();
  const rel = s.file('carried.ts', 'export const a = `var(--never-defined, #fff);`;\n');
  s.git('add', rel);
  s.git('commit', '-q', '-m', 'main adds a file carrying inherited token debt');
  s.git('update-ref', 'refs/remotes/origin/main', head());
  s.git('checkout', '-q', '-b', 'side', base);
  writeFileSync(join(s.dir, 'unrelated.txt'), 'side\n');
  s.git('add', 'unrelated.txt');
  s.git('commit', '-q', '-m', 'side');
  spawnSync('git', ['merge', '--no-commit', '--no-ff', 'refs/remotes/origin/main'], { cwd: s.dir, encoding: 'utf8' });
  const merging = spawnSync('git', ['rev-parse', '-q', '--verify', 'MERGE_HEAD'], { cwd: s.dir, encoding: 'utf8' });
  assert.equal(merging.status, 0, 'fixture must leave a REAL merge in progress');
  return { s, rel };
}

t('X3: a verbatim carry from origin/main during a merge does NOT block', () => {
  const { s, rel } = mergeSandbox();
  try {
    const r = s.run(['--added-only', '--file', rel]);
    assert.equal(r.code, 0, `carried inherited debt must not block a merge: ${r.out}`);
    assert.match(r.out, /added lines measured against origin\/main/);
  } finally { s.cleanup(); }
});

t('X3 does NOT blanket-pass: a token the MERGE itself adds still blocks', () => {
  const { s, rel } = mergeSandbox();
  try {
    s.append('carried.ts', 'export const b = `var(--authored-by-the-merge, #000);`;\n');
    s.git('add', rel);
    const r = s.run(['--added-only', '--file', rel]);
    assert.equal(r.code, 1, `a token this merge authored must still block: ${r.out}`);
    assert.match(r.out, /--authored-by-the-merge/);
    const blocking = r.out.slice(r.out.indexOf('BLOCKING'));
    assert.doesNotMatch(blocking, /--never-defined/, 'the carried token must not be in the BLOCKING list');
  } finally { s.cleanup(); }
});

t('X3 FAILS CLOSED: merge in progress but origin/main missing => baseline stays HEAD', () => {
  const { s, rel } = mergeSandbox();
  try {
    s.git('update-ref', '-d', 'refs/remotes/origin/main');
    const r = s.run(['--added-only', '--file', rel]);
    assert.equal(r.code, 1, 'without origin/main the HEAD baseline must judge the carry as added');
    assert.doesNotMatch(r.out, /measured against origin\/main/);
  } finally { s.cleanup(); }
});

// ---- A5: the diff must FAIL CLOSED, never silently report zero added lines ----
// The catch here used to swallow every git failure into `diff = ''`, which means the file
// contributes no added lines and is never judged — a guard reporting green on work it never
// looked at. The call also had no maxBuffer, so Node's 1 MiB default turned a large diff into
// exactly that silent pass, and basing the diff on origin/main made large diffs MORE likely.
// (GLM 5.3 + Flash, R8, A5 — independently reported, verified: no maxBuffer existed anywhere.)
t('A5 FAILS CLOSED: a git diff that errors BLOCKS instead of reporting clean', () => {
  // running outside a git repo makes `git diff` exit non-zero — the cheapest real throw
  const d = mkdtempSync(join(tmpdir(), 'tokreg-nogit-'));
  try {
    mkdirSync(join(d, 'frontend', 'src', 'styles'), { recursive: true });
    writeFileSync(join(d, 'frontend', 'src', 'styles', 'theme.css'), ':root{--a:#fff;}');
    writeFileSync(join(d, 'frontend', 'src', 'x.ts'), 'export const a = `var(--never, #fff);`;');
    const r = spawnSync('node', [SCRIPT, '--added-only', '--file', 'frontend/src/x.ts'], { cwd: d, encoding: 'utf8' });
    const out = `${r.stdout}${r.stderr}`;
    assert.equal(r.status, 1, `an unreadable diff must BLOCK, not pass: ${out}`);
    assert.match(out, /could not diff/);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

console.log(`\ntoken-registry-check: ${pass} passed, ${fail.length} failed`);
if (fail.length) process.exit(1);
