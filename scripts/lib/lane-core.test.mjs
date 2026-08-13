#!/usr/bin/env node
/**
 * lane-core.test.mjs — the regression fixture for the Coordination Ledger parser
 * =============================================================================
 * WHY THIS EXISTS. Six hostile-review rounds on this module produced a measured
 * pattern: the code written to fix a review finding contained the next defect.
 * Three of six rounds had a defect caused by two of my own fixes disagreeing —
 * quoted-path support versus whitespace splitting, idle-awareness versus consumer
 * unification. Every one of those was found by a reviewer or a manual probe, never
 * by a test, because there were no tests.
 *
 * Kimi K3's round-6 prescription was blunt and correct: a fixture corpus of real
 * lane shapes is the only thing that breaks that cycle. Each case below is a defect
 * that actually shipped. If you change the parser and one of these flips, you have
 * reintroduced a bug that already cost a review round.
 *
 * Run: node scripts/lib/lane-core.test.mjs
 * Exit: 0 all pass · 1 any failure. No framework — this is Node tooling, not app code.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseLane, activeLocks, lockMatches, ledgerDir, identity, safeRef, normPath, samePath, siblingLanes } from './lane-core.mjs';

let pass = 0;
let fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass += 1; } else {
    fail += 1;
    console.error(`FAIL  ${name}\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`);
  }
};
const P = (body) => parseLane(`## EDITING NOW\n${body}\n`).locks;

/* ── Section discovery ────────────────────────────────────────────────────── */
eq('fenced block (a real lane used this; it parsed to ZERO)',
  P('```\nDockerfile\nbackend/x.mjs\n```'), ['Dockerfile', 'backend/x.mjs']);
eq('multiple locks, LF', P('- a.ts\n- b.ts\n- c.ts'), ['a.ts', 'b.ts', 'c.ts']);
eq('multiple locks, CRLF', parseLane('## EDITING NOW\r\n- a.ts\r\n- b.ts\r\n').locks, ['a.ts', 'b.ts']);
eq('heading suffix tolerated', parseLane('## EDITING NOW — exact files\n- a.ts\n').locks, ['a.ts']);
eq('sub-headings do NOT end the section',
  parseLane('## EDITING NOW\n### backend\n- a.mjs\n### frontend\n- b.tsx\n').locks, ['a.mjs', 'b.tsx']);
eq('same-level heading DOES end it',
  parseLane('## EDITING NOW\n- a.ts\n## Other\n- b.ts\n').locks, ['a.ts']);
eq('"editing now" inside the Task line does not hijack the anchor',
  parseLane('Task: stop editing now buttons\n\n## EDITING NOW\n- real.ts\n').locks, ['real.ts']);
eq('no heading at all', parseLane('# l\nprose\n- x.ts\n').locks, []);

/* ── Bullet dialects ──────────────────────────────────────────────────────── */
eq('asterisk bullets', P('* a.ts\n* b.ts'), ['a.ts', 'b.ts']);
eq('plus bullets', P('+ a.ts'), ['a.ts']);
eq('numbered', P('1. a.ts\n2. b.ts'), ['a.ts', 'b.ts']);
eq('checkboxes', P('- [ ] a.ts\n- [x] b.ts'), ['a.ts', 'b.ts']);

/* ── Path shapes ──────────────────────────────────────────────────────────── */
eq('extensionless (Dockerfile is in the deploy-executed list)', P('- Dockerfile'), ['Dockerfile']);
eq('./ prefix stripped', P('- ./src/app.js'), ['src/app.js']);
eq('quoted path containing spaces', P('- "backend/migrations/014 add col.sql"'), ['backend/migrations/014 add col.sql']);
eq('comma-separated', P('- a.ts, b.ts'), ['a.ts', 'b.ts']);
eq('space-separated', P('- a.ts b.ts c.ts'), ['a.ts', 'b.ts', 'c.ts']);
eq('token order preserved (quoted must not hoist)', P('- plain.ts "q p.ts"'), ['plain.ts', 'q p.ts']);

/* ── Prose must never mint a lock ─────────────────────────────────────────── */
eq('prose with no path', P('- I work in an isolated worktree and rebase'), []);
eq('prose with a LEADING path', P('- origin/main is my upstream'), []);
eq('prose after a dash is still prose',
  P('- audit-write-paths.mjs — those belong to the other branch entirely'), []);
eq('bold Nothing', P('- **Nothing.** Every slice is pushed.'), []);
eq('released placeholder', P('- (released)'), []);
eq('none-declared placeholder', P('- (none declared yet)'), []);

/* ── Path + commentary ────────────────────────────────────────────────────── */
eq('bracketed comment', P('- docs/x.md (new, mine only)'), ['docs/x.md']);
eq('single trailing word', P('- backend/routes/x.mjs WIP'), ['backend/routes/x.mjs']);
eq('short dash note', P('- docs/x.md — new file'), ['docs/x.md']);
eq('quoted path + plain note (quoting is an explicit lock signal)',
  P('- "backend/migrations/014 add col.sql" adds the stripe column'), ['backend/migrations/014 add col.sql']);
eq('path + quoted note', P('- backend/a.ts "do not touch, see PR"'), ['backend/a.ts']);

/* ── Globs ────────────────────────────────────────────────────────────────── */
eq('** survives bold-stripping', P('- **/migrations/**'), ['**/migrations/**']);
eq('glob + bracketed comment', P('- docs/design-brain/** (all)'), ['docs/design-brain/**']);

/* ── idle scoping — the round-6 headline ──────────────────────────────────── */
eq('sibling block idle does NOT suppress live locks',
  activeLocks(['# lane', '## DONE earlier', 'Status: idle', '', '## EDITING NOW', '- live.ts'].join('\n')), ['live.ts']);
eq('same-block idle DOES suppress', activeLocks('Status: idle\n## EDITING NOW\n- a.ts\n'), []);
eq('status inside the section wins',
  activeLocks('# l\nStatus: in-progress\n## EDITING NOW\nStatus: idle\n- a.ts\n'), []);
eq('tool-written lane, in-progress',
  activeLocks('# vs-claude — Live Lane\nUpdated: x\nStatus: in-progress\n\n## EDITING NOW\n- a.ts\n'), ['a.ts']);
eq('status match is anchored ("released pending" is not released)',
  activeLocks('Status: released pending review\n## EDITING NOW\n- a.ts\n'), ['a.ts']);

/* ── lockMatches ──────────────────────────────────────────────────────────── */
eq('exact', lockMatches('a/b.ts', 'a/b.ts'), true);
eq('backslash lock normalised', lockMatches('src/db/foo.ts', 'src\\db\\foo.ts'), true);
eq('case-insensitive', lockMatches('src/index.ts', 'Src/Index.ts'), true);
eq('directory covers its tree', lockMatches('backend/routes/x.mjs', 'backend'), true);
eq('prefix must not false-positive', lockMatches('backendother/x.mjs', 'backend'), false);
eq('** crosses directories', lockMatches('src/a/b.ts', 'src/**'), true);
eq('single * does NOT cross directories', lockMatches('src/a/b.ts', 'src/*'), false);
eq('single * matches a direct child', lockMatches('src/b.ts', 'src/*'), true);
eq('extension constraint survives', lockMatches('src/a.ts', 'src/*.js'), false);
eq('filename prefix glob', lockMatches('services/contentStudioJobs.mjs', 'services/contentStudio*'), true);
eq('./ lock matches a repo-relative path', lockMatches('src/app.js', './src/app.js'), true);

/* ── identity, safeRef, normPath, samePath ───────────────────────────────────
 * These were NOT covered by the first version of this fixture, which is a hole worth
 * naming: the round-4 CRITICAL — two concurrent sessions in one worktree sharing a
 * lane file — lived in identity(), and safeRef() is the guard against interpolating a
 * shell-active refname. The functions whose defects cost the most were the ones with
 * no assertions at all. */
const withEnv = (env, fn) => {
  const saved = {};
  for (const k of Object.keys(env)) { saved[k] = process.env[k]; if (env[k] === undefined) delete process.env[k]; else process.env[k] = env[k]; }
  try { return fn(); } finally {
    for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
  }
};

const idA = withEnv({ CLAUDE_CODE_SESSION_ID: 'aaaaaaaa-1111', SWAN_AGENT_SURFACE: 'vs-claude' }, () => identity());
const idB = withEnv({ CLAUDE_CODE_SESSION_ID: 'bbbbbbbb-2222', SWAN_AGENT_SURFACE: 'vs-claude' }, () => identity());
eq('identity: two sessions in ONE worktree get different lanes (the round-4 critical)',
  idA.laneName !== idB.laneName, true);
eq('identity: same session is stable across calls',
  withEnv({ CLAUDE_CODE_SESSION_ID: 'aaaaaaaa-1111', SWAN_AGENT_SURFACE: 'vs-claude' }, () => identity()).laneName,
  idA.laneName);
eq('identity: agent name reaches the lane name',
  withEnv({ CLAUDE_CODE_SESSION_ID: 'cccccccc-3333', SWAN_AGENT_SURFACE: 'vs-codex' }, () => identity()).laneName.startsWith('vs-codex--'),
  true);
eq('identity: CLAUDE_AGENT is honoured when SWAN_AGENT_SURFACE is absent',
  withEnv({ SWAN_AGENT_SURFACE: undefined, CLAUDE_AGENT: 'codex', CLAUDE_CODE_SESSION_ID: 'dddddddd-4444' }, () => identity()).agent,
  'codex');
eq('identity: lane name always ends .lane.md', /\.lane\.md$/.test(idA.laneName), true);

eq('safeRef: ordinary branch', safeRef('feature/my-branch_1.2'), 'feature/my-branch_1.2');
eq('safeRef: command substitution refused', safeRef('x$(touch pwned)'), null);
eq('safeRef: backtick refused', safeRef('x`id`'), null);
eq('safeRef: semicolon refused', safeRef('x;rm -rf /'), null);
eq('safeRef: parent-dir traversal refused', safeRef('a/../b'), null);
eq('safeRef: non-string refused', safeRef(null), null);

eq('normPath: backslashes', normPath('src\\a\\b.ts'), 'src/a/b.ts');
eq('normPath: MSYS drive form', normPath('/c/repo/.git'), 'C:/repo/.git');
eq('normPath: already-Windows form untouched', normPath('C:/repo/.git'), 'C:/repo/.git');
eq('samePath: case-insensitive', samePath('C:/Repo/A', 'c:/repo/a'), true);
eq('samePath: separator-insensitive', samePath('C:/repo\\a', 'C:/repo/a'), true);
eq('samePath: genuinely different', samePath('C:/repo/a', 'C:/repo/b'), false);

/* ── Adversarial: the shapes that shipped as bugs ────────────────────────────
 * Round 7 found a P1 the previous fixture PINNED IN: it asserted the happy path for
 * quoted paths and had no case for a quoted bare noun, so "quoting = deliberate lock"
 * shipped green while turning `- "backend" is where I work` into a lock on the whole
 * tree. A suite that only encodes intended behaviour ratifies whatever the code does
 * with everything else. These are the adversarial shapes. */
const ROOT = process.cwd();
const PR = (body) => parseLane(`## EDITING NOW\n${body}\n`, ROOT).locks;

eq('quoted bare noun in prose does NOT mint a tree lock', PR('- "backend" is where I work'), []);
eq('quoted bare noun, second shape', PR('- "scripts" needs a rebase'), []);
eq('quoted extensionless file in prose', PR('- "Dockerfile" is next on my list'), []);
eq('quoted path WITH a space is still a lock', PR('- "a b.ts" adds the stripe column'), ['a b.ts']);
eq('quoted path WITH a slash is still a lock', PR('- "backend/a.ts" adds a column here'), ['backend/a.ts']);
eq('quoted bare noun + single word survives the commentary rule', PR('- "Dockerfile" WIP'), ['Dockerfile']);
eq('unterminated quote still yields the path', PR('- "backend/a.ts'), ['backend/a.ts']);

/* idle scoping — every hole round 7 named */
eq('a Status nested under a DEEPER heading does not govern this section',
  activeLocks(['# lane', '#### Notes', 'Status: idle', '## EDITING NOW', '- live.ts'].join('\n')), ['live.ts']);
eq('a non-idle Status beats a stale idle in the same block (bias to showing locks)',
  activeLocks(['# l', 'Status: idle', 'Status: in-progress', '', '## EDITING NOW', '- a.ts'].join('\n')), ['a.ts']);
eq('all-idle still suppresses', activeLocks('# l\nStatus: idle\n\n## EDITING NOW\n- a.ts\n'), []);

/* siblingLanes — was untestable while it lived in lane.mjs */
eq('a worktree named main-sandbox is NOT a session sibling of main',
  siblingLanes('vs-claude--main-sa1b2c3d4.lane.md', ['vs-claude--main-sandbox.lane.md']), []);
eq('a real session sibling IS matched',
  siblingLanes('vs-claude--main-sa1b2c3d4.lane.md', ['vs-claude--main-sf9e8d7c6.lane.md']),
  ['vs-claude--main-sf9e8d7c6.lane.md']);
eq('a pre-session lane IS matched',
  siblingLanes('vs-claude--main-sa1b2c3d4.lane.md', ['vs-claude--main.lane.md']), ['vs-claude--main.lane.md']);
eq('a different worktree is not a sibling',
  siblingLanes('vs-claude--main-sa1b2c3d4.lane.md', ['vs-claude--apex-s11112222.lane.md']), []);

/* task — parseLane returns three fields and the suite exercised two */
eq('task comes from the Task: line', parseLane('Task: rebuild the thing\n## EDITING NOW\n- a.ts\n').task, 'rebuild the thing');
eq('task falls back to a heading that is not the section',
  parseLane('# My lane title\n## EDITING NOW\n- a.ts\n').task, 'My lane title');
eq('task has a floor', parseLane('## EDITING NOW\n- a.ts\n').task, '(no task stated)');
eq('task is truncated to 90 chars', parseLane(`Task: ${'x'.repeat(200)}\n## EDITING NOW\n- a.ts\n`).task.length, 90);

/* ── Real ledger corpus ──────────────────────────────────────────────────────
 * The previous version asserted only that parsing does not throw — every lane could
 * have parsed to [] and the suite would still be green, which is total lock
 * suppression passing as health. It also skipped silently on a fresh clone, because
 * the ledger is gitignored. Now: a count, a no-throw check, and a real assertion that
 * SOMETHING parses, with the skip stated out loud rather than hidden. */
const ledger = ledgerDir();
if (ledger && existsSync(ledger)) {
  const files = readdirSync(ledger).filter((f) => f.endsWith('.lane.md'));
  let totalLocks = 0;
  for (const f of files) {
    try {
      totalLocks += activeLocks(readFileSync(resolve(ledger, f), 'utf8'), resolve(ledger, '..', '..')).length;
    } catch (err) {
      fail += 1;
      console.error(`FAIL  real lane ${f} threw: ${err.message}`);
    }
  }
  eq('real corpus: at least one lane file present', files.length > 0, true);
  console.log(`      (corpus: ${files.length} lanes, ${totalLocks} locks parsed)`);
  if (totalLocks === 0 && files.length > 2) {
    console.warn('WARN  every real lane parsed to ZERO locks — plausible, but it is also what total suppression looks like.');
  }
} else {
  console.log('      (corpus SKIPPED: the ledger is gitignored and absent here — synthetic cases above still ran)');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
