/**
 * tools.test.mjs — bounded read-only investigation tool suite (Phase 4 slice 1).
 * Run: node --test scripts/context-gateway/tests/tools.test.mjs
 *
 * The security tests matter most: the interactive loop must not become a ceiling bypass (T10),
 * must not fan out past its call budget (T8), must never leak content into the audit, and must
 * keep every read inside the safeRead jail (T1/T2/T5).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { gitTrackedFiles } from '../src/safeRead.mjs';
import { createToolSession, ToolError } from '../src/tools.mjs';

function fixtureRepo() {
  const root = join(mkdtempSync(join(tmpdir(), 'swan-tools-')), 'repo');
  mkdirSync(join(root, 'backend', 'middleware'), { recursive: true });
  mkdirSync(join(root, 'frontend', 'src', 'components'), { recursive: true });
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { stdio: 'pipe' });
  git('init', '-q');
  writeFileSync(join(root, 'backend', 'middleware', 'authMiddleware.mjs'), 'export function requireAuth(req){\n  return verifyToken(req);\n}\nverifyToken();\n'); // sensitive by path
  writeFileSync(join(root, 'frontend', 'src', 'components', 'GlowButton.tsx'), 'export const GlowButton = () => {\n  return renderGlow();\n};\nrenderGlow();\nGlowButton();\n');
  writeFileSync(join(root, 'backend', 'routes.mjs'), "router.post('/api/workout/sessions', saveWorkout);\n// mentions /api/workout/sessions in a comment\n");
  // CRLF-content file: git grep -n emits its lines with trailing \r — the grepDetailed parse
  // must survive it (regression for the 2026-07-22 CRLF bug found by live-probing).
  writeFileSync(join(root, 'backend', 'crlfRoutes.mjs'), "router.get('/crlf-probe', crlfHandler);\r\ncrlfHandler();\r\n");
  writeFileSync(join(root, '.env'), 'SECRET=nope');
  git('add', '-A'); git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'fixtures');
  return { root, tracked: gitTrackedFiles(root) };
}

const { root, tracked } = fixtureRepo();
const std = () => createToolSession({ root, tracked });
const design = () => createToolSession({ root, tracked, ceiling: 'design' });

// ---------- T8: call budget ----------
test('T8: call budget refuses fan-out past the cap', () => {
  const s = createToolSession({ root, tracked, callBudget: 2 });
  s.repo_search('render'); s.repo_search('render');
  assert.equal(s.callsRemaining(), 0);
  assert.throws(() => s.repo_search('render'), (e) => e.code === 'BUDGET');
});

// ---------- T10: ceiling ----------
test('T10: design session withholds sensitive paths from search, reports count', () => {
  const r = design().repo_search('verifyToken');
  assert.ok(!r.files.some((f) => /authMiddleware/.test(f)), 'sensitive path withheld');
  assert.equal(r.withheldByCeiling, 1);
});

test('T10: design session hard-refuses repo_open of a sensitive path', () => {
  assert.throws(() => design().repo_open('backend/middleware/authMiddleware.mjs', 1, 3), (e) => e.code === 'CEILING');
});

test('T10: standard session may open sensitive paths', () => {
  const w = std().repo_open('backend/middleware/authMiddleware.mjs', 1, 2);
  assert.ok(w.content.includes('requireAuth'));
});

test('T10: design trace_symbol excludes sensitive hits but returns design hits', () => {
  const r = design().trace_symbol('renderGlow');
  assert.ok(r.definitions.length + r.references.length >= 1);
  assert.ok([...r.definitions, ...r.references].every((h) => !/authMiddleware/.test(h.path)));
});

test('T10: design trace results carry NO line text (a line can mention sensitive code)', () => {
  const d = design().trace_symbol('renderGlow');
  assert.equal(d.textRedacted, true);
  assert.ok([...d.definitions, ...d.references].every((h) => !('text' in h) && h.path && h.line), 'design hits are path+line only');
  const s = std().trace_symbol('renderGlow');
  assert.equal(s.textRedacted, false);
  assert.ok([...s.definitions, ...s.references].every((h) => typeof h.text === 'string'), 'standard hits keep text');
  const api = design().trace_api_path('/api/workout/sessions');
  assert.ok([...api.routes, ...api.mentions].every((h) => !('text' in h)), 'design api hits are path+line only');
});

// ---------- jail still enforced (T1/T5) ----------
test('repo_open: caps result size and flags truncation (no context blowout in the loop)', () => {
  const { root, tracked } = (() => {
    const r = join(mkdtempSync(join(tmpdir(), 'swan-cap-')), 'repo');
    mkdirSync(r, { recursive: true });
    const git = (...a) => execFileSync('git', ['-C', r, ...a], { stdio: 'pipe' });
    git('init', '-q');
    writeFileSync(join(r, 'big.mjs'), Array.from({ length: 500 }, (_, i) => `// filler line ${i} xxxxxxxxxxxxxxxxxxxx`).join('\n') + '\n');
    git('add', '-A'); git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'big');
    return { root: r, tracked: gitTrackedFiles(r) };
  })();
  const s = createToolSession({ root, tracked, maxResultChars: 500 });
  const w = s.repo_open('big.mjs', 1, 500);
  assert.ok(w.content.length <= 500, `capped: ${w.content.length}`);
  assert.equal(w.truncated, true);
});

test('jail: repo_open refuses traversal and DENY paths through the tool', () => {
  assert.throws(() => std().repo_open('../outside.txt'), (e) => e.code === 'OUTSIDE_ROOT' || e.code === 'NOT_TRACKED');
  assert.throws(() => std().repo_open('.env'), (e) => e.code === 'DENY_PATTERN');
});

// ---------- behavior ----------
test('trace_symbol: splits definitions from references', () => {
  const r = std().trace_symbol('requireAuth');
  assert.ok(r.definitions.some((h) => /export function requireAuth/.test(h.text)), 'def found');
});

test('trace_api_path: route-defining lines rank as routes, comments as mentions', () => {
  const r = std().trace_api_path('/api/workout/sessions');
  assert.ok(r.routes.some((h) => /router\.post/.test(h.text)), 'route line classified');
  assert.ok(r.mentions.some((h) => /comment/.test(h.text)), 'comment classified as mention');
});

test('trace_api_path: refuses a non-path arg', () => {
  assert.throws(() => std().trace_api_path('workout'), (e) => e.code === 'BAD_ARGS');
});

test('trace_api_path: segment fallback finds a split-mounted route', () => {
  // The fixture registers the FULL literal, but a caller may ask with an extra mount prefix
  // that only matches on a trailing segment — the fallback must still find it and say so.
  const r = std().trace_api_path('/api/v2/workout/sessions');
  assert.ok(r.routes.length >= 1, 'route found via trailing-segment fallback');
  assert.ok(r.matchedPattern.endsWith('/workout/sessions'), `matched via ${r.matchedPattern}`);
});

test('git_context: returns commit subjects and refuses traversal', () => {
  const r = std().git_context(['backend/routes.mjs']);
  assert.ok(r.commits.length >= 1 && /fixtures/.test(r.commits[0]));
  assert.throws(() => std().git_context(['../etc/passwd']), (e) => e.code === 'BAD_ARGS');
  assert.throws(() => std().git_context(['/etc/passwd']), (e) => e.code === 'BAD_ARGS');
});

test('git_context: T10 — refuses DENY paths and (design) sensitive-path history (bypass fix)', () => {
  assert.throws(() => std().git_context(['.env']), (e) => e.code === 'BAD_ARGS'); // DENY even in std
  assert.throws(() => design().git_context(['backend/middleware/authMiddleware.mjs']), (e) => e.code === 'CEILING');
  // a design session may still read history of a non-sensitive path
  assert.ok(design().git_context(['frontend/src/components/GlowButton.tsx']).commits.length >= 0);
});

test('repo_search: scope filter narrows results', () => {
  const all = std().repo_search('export');
  const scoped = std().repo_search('export', { scope: 'frontend/' });
  assert.ok(scoped.files.every((f) => f.startsWith('frontend/')));
  assert.ok(all.files.length >= scoped.files.length);
});

// ---------- audit ----------
test('audit: logs every call, ok flag, and summary — never file content', () => {
  const s = std();
  s.repo_open('backend/middleware/authMiddleware.mjs', 1, 2);
  try { s.repo_open('.env'); } catch { /* refusal logged */ }
  const a = s.getAudit();
  assert.equal(a.length, 2);
  assert.equal(a[0].tool, 'repo_open');
  assert.equal(a[0].ok, true);
  assert.equal(a[1].ok, false);
  assert.equal(a[1].summary.reason, 'DENY_PATTERN');
  const blob = JSON.stringify(a);
  assert.ok(!blob.includes('requireAuth') && !blob.includes('verifyToken'), 'no file content in audit');
});

test('CRLF regression: grepDetailed-backed tools parse CRLF-content files', () => {
  const r = std().trace_api_path('/crlf-probe');
  assert.ok(r.routes.some((h) => /crlfHandler/.test(h.text)), 'CRLF route line parsed, not dropped');
  const sym = std().trace_symbol('crlfHandler');
  assert.ok(sym.definitions.length + sym.references.length >= 1, 'CRLF symbol lines parsed');
});

test('errors are typed', () => {
  assert.ok(new ToolError('BUDGET', 'x') instanceof Error);
  assert.throws(() => std().repo_search(''), (e) => e.code === 'BAD_ARGS');
});
