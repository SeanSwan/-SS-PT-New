/**
 * compile.test.mjs — compiler front-half suite: anchors, authority, retrieval, end-to-end compile.
 * Run: node --test scripts/context-gateway/tests/compile.test.mjs
 *
 * The end-to-end fixtures encode the Phase 0 regression classes: superseded docs excluded (T6),
 * catalog rows treated as pointers (source docs opened, not quoted), budget exclusions reported
 * (no silent caps), sibling tests recalled, deterministic manifests (same repo ⇒ same evidence).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { extractAnchors, anchorNeedles } from '../src/anchors.mjs';
import { parseCatalog, resolveAuthority } from '../src/authority.mjs';
import { searchFiles, findTests, searchCatalog, mergeWindows } from '../src/retrieve.mjs';
import { gitTrackedFiles } from '../src/safeRead.mjs';
import { compileContext } from '../src/compile.mjs';

// ---------- anchors ----------
test('anchors: extracts paths, routes, issues, symbols, quoted, terms', () => {
  const a = extractAnchors('Audit the workoutLogger save path in backend/routes/workoutRoutes.mjs for SWA-123 — "/api/workout/sessions" returns 404, see `coachDraftKey` scoping');
  assert.deepEqual(a.paths, ['backend/routes/workoutRoutes.mjs']);
  assert.deepEqual(a.issues, ['SWA-123']);
  assert.ok(a.routes.includes('/api/workout/sessions'));
  assert.ok(a.symbols.includes('workoutLogger'));
  assert.ok(a.quoted.includes('coachDraftKey'));
  assert.ok(a.terms.includes('sessions') || a.terms.includes('scoping'));
  assert.equal(anchorNeedles(a)[0], 'backend/routes/workoutRoutes.mjs'); // most specific first
});

test('anchors: deterministic and stopworded', () => {
  const q = 'What did we decide about the catalog?';
  assert.deepEqual(extractAnchors(q), extractAnchors(q));
  assert.ok(!extractAnchors(q).terms.includes('what'));
});

// ---------- authority ----------
const CAT = parseCatalog([
  '| path | date | author | decision | status | source-SHA12 |',
  '|---|---|---|---|---|---|',
  '| OLD-PLAN.md | 2026-04-19 | claude | old plan | superseded | aaaaaaaaaaaa |',
  '| SHIPPED-THING.md | 2026-07-01 | fable | shipped receipt | shipped | bbbbbbbbbbbb |',
  '| OPEN-PLAN.md | 2026-07-20 | fable | open proposal | open | cccccccccccc |',
].join('\n'));

test('authority: pinned A1 beats structural rules', () => {
  assert.equal(resolveAuthority('docs/brain/REALITY.md', CAT).tier, 'A1');
  assert.equal(resolveAuthority('CLAUDE.md', CAT).tier, 'A1');
  assert.equal(resolveAuthority('docs/ai-workflow/references/PRIVACY-PROXY.md', CAT).tier, 'A1');
});

test('authority: code A0, catalog A4, brainstorms A5, handoff refined by status', () => {
  assert.equal(resolveAuthority('backend/routes/x.mjs', CAT).tier, 'A0');
  assert.equal(resolveAuthority('docs/ai-workflow/CATALOG.md', CAT).tier, 'A4');
  assert.equal(resolveAuthority('docs/ai-workflow/brainstorms/idea.md', CAT).tier, 'A5');
  assert.equal(resolveAuthority('docs/ai-workflow/AI-HANDOFF/SHIPPED-THING.md', CAT).tier, 'A2');
  assert.equal(resolveAuthority('docs/ai-workflow/AI-HANDOFF/OPEN-PLAN.md', CAT).tier, 'A3');
  const sup = resolveAuthority('docs/ai-workflow/AI-HANDOFF/OLD-PLAN.md', CAT);
  assert.equal(sup.superseded, true);
});

test('authority: stale catalog row detected via sha mismatch (T6)', () => {
  const shas = new Map([['docs/ai-workflow/AI-HANDOFF/SHIPPED-THING.md', 'ffffffffffff']]);
  const r = resolveAuthority('docs/ai-workflow/AI-HANDOFF/SHIPPED-THING.md', CAT, shas);
  assert.equal(r.stale, true);
  assert.equal(r.tier, 'A3'); // stale row's status is NOT trusted for the A2 upgrade
});

// ---------- retrieval helpers ----------
test('mergeWindows: overlapping and near windows merge, distant stay apart', () => {
  assert.deepEqual(mergeWindows([{ start: 30, end: 50 }, { start: 45, end: 70 }, { start: 100, end: 110 }]),
    [{ start: 30, end: 70 }, { start: 100, end: 110 }]);
});

test('searchCatalog: term overlap ranks rows, pointers only', () => {
  const { rows } = searchCatalog(CAT, ['shipped', 'receipt']);
  assert.equal(rows[0].file, 'SHIPPED-THING.md');
});

// ---------- end-to-end fixture repo ----------
function fixtureRepo() {
  const root = join(mkdtempSync(join(tmpdir(), 'swan-gwc-')), 'repo');
  mkdirSync(root, { recursive: true });
  const git = (...a) => execFileSync('git', ['-C', root, ...a], { stdio: 'pipe' });
  git('init', '-q');
  mkdirSync(join(root, 'backend', 'routes'), { recursive: true });
  mkdirSync(join(root, 'backend', 'tests'), { recursive: true });
  mkdirSync(join(root, 'docs', 'ai-workflow', 'AI-HANDOFF'), { recursive: true });
  writeFileSync(join(root, 'backend', 'routes', 'workoutRoutes.mjs'),
    Array.from({ length: 60 }, (_, i) => (i === 30 ? "router.post('/api/workout/sessions', saveWorkout);" : `// line ${i + 1}`)).join('\n'));
  writeFileSync(join(root, 'backend', 'tests', 'workoutRoutes.test.mjs'), 'test("saveWorkout", () => {});\n');
  writeFileSync(join(root, 'docs', 'ai-workflow', 'AI-HANDOFF', 'WORKOUT-FIX.md'), '# workout save receipt\nsessions endpoint decision\n');
  writeFileSync(join(root, 'docs', 'ai-workflow', 'AI-HANDOFF', 'OLD-WORKOUT-PLAN.md'), '# stale workout plan\nsessions endpoint old idea\n');
  git('add', '-A');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'fixtures');
  // Catalog rows must carry REAL blob sha12s — a wrong sha marks the row stale and its
  // status (incl. superseded) is rightly untrusted (T6). Stamp from git, then commit.
  const sha12 = (p) => execFileSync('git', ['-C', root, 'ls-files', '-s', p]).toString().split(' ')[1].slice(0, 12);
  writeFileSync(join(root, 'docs', 'ai-workflow', 'CATALOG.md'), [
    '| path | date | author | decision | status | source-SHA12 |', '|---|---|---|---|---|---|',
    `| WORKOUT-FIX.md | 2026-07-01 | fable | workout sessions save fix shipped | shipped | ${sha12('docs/ai-workflow/AI-HANDOFF/WORKOUT-FIX.md')} |`,
    `| OLD-WORKOUT-PLAN.md | 2026-04-01 | claude | workout sessions old plan | superseded | ${sha12('docs/ai-workflow/AI-HANDOFF/OLD-WORKOUT-PLAN.md')} |`,
  ].join('\n'));
  git('add', '-A');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'catalog');
  return root;
}

test('compile: end-to-end — code + receipt + sibling test in, superseded out, deterministic', () => {
  const root = fixtureRepo();
  const tracked = gitTrackedFiles(root);
  const opts = { root, question: 'Audit the workout save path — /api/workout/sessions in workoutRoutes', tracked, originatingModel: 'claude-fable-5', issue: 'SWA-1' };
  const { manifest, report } = compileContext(opts);

  const paths = manifest.evidence.map((e) => e.path);
  assert.ok(paths.includes('backend/routes/workoutRoutes.mjs'), 'code hit recalled');
  assert.ok(paths.includes('backend/tests/workoutRoutes.test.mjs'), 'sibling test recalled');
  assert.ok(paths.includes('docs/ai-workflow/AI-HANDOFF/WORKOUT-FIX.md'), 'catalog pointer opened source doc');
  assert.ok(!paths.includes('docs/ai-workflow/AI-HANDOFF/OLD-WORKOUT-PLAN.md'), 'superseded doc excluded');
  assert.ok(report.excluded.some((e) => e.reason === 'SUPERSEDED'), 'exclusion reported, not silent');
  assert.equal(manifest.evidence[0].tier, 'A0', 'code ranks first');
  assert.equal(manifest.originatingModel, 'claude-fable-5');

  const second = compileContext(opts);
  assert.deepEqual(second.manifest.evidence, manifest.evidence, 'same repo state ⇒ same manifest');
});

test('compile: budget exclusions are explicit, never silent', () => {
  const root = fixtureRepo();
  const { manifest, report } = compileContext({ root, question: 'workout sessions save', tracked: gitTrackedFiles(root), originatingModel: 'm', budgetChars: 300 });
  assert.ok(report.excluded.some((e) => e.reason === 'BUDGET'), 'budget overflow reported');
  assert.ok(report.spentChars <= 300);
  assert.ok(manifest.evidenceCount >= 1, 'top-ranked evidence still included');
});

test('compile: Linear issue notes become A3 evidence under a virtual path (Phase 3)', () => {
  const root = fixtureRepo();
  const { manifest } = compileContext({
    root, question: 'workout sessions save', tracked: gitTrackedFiles(root), originatingModel: 'm',
    issue: 'SWA-42', issueNotes: 'Title: fix save path\nStatus: In Progress\nDecision: idempotency required',
  });
  const lin = manifest.evidence.find((e) => e.path === 'linear/SWA-42.md');
  assert.ok(lin, 'linear evidence present');
  assert.equal(lin.tier, 'A3');
  assert.equal(lin.id, 'E001', 'issue notes lead the packet');
  const noIssue = compileContext({ root, question: 'workout sessions save', tracked: gitTrackedFiles(root), originatingModel: 'm', issueNotes: 'orphan notes' });
  assert.ok(!noIssue.manifest.evidence.some((e) => e.path.startsWith('linear/')), 'notes without --issue are ignored');
});

test('compile: window content actually contains the hit line', () => {
  const root = fixtureRepo();
  const { packet, manifest } = compileContext({ root, question: 'trace /api/workout/sessions', tracked: gitTrackedFiles(root), originatingModel: 'm' });
  const ev = packet.getEvidence().find((e) => e.path === 'backend/routes/workoutRoutes.mjs');
  assert.ok(ev, 'route file present');
  assert.ok(ev.content.includes("router.post('/api/workout/sessions'"), 'hit line inside window');
  assert.ok(ev.startLine <= 31 && ev.endLine >= 31, `window ${ev.startLine}-${ev.endLine} covers line 31`);
  assert.ok(manifest.headSha.length === 40);
});
