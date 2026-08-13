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
import { parseLane, activeLocks, lockMatches, ledgerDir } from './lane-core.mjs';

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

/* ── Real ledger snapshot (advisory: the ledger is gitignored) ────────────── */
const ledger = ledgerDir();
if (ledger && existsSync(ledger)) {
  const files = readdirSync(ledger).filter((f) => f.endsWith('.lane.md'));
  let parsed = 0;
  for (const f of files) {
    try { activeLocks(readFileSync(resolve(ledger, f), 'utf8'), resolve(ledger, '..', '..')); parsed += 1; } catch (err) {
      fail += 1;
      console.error(`FAIL  real lane ${f} threw: ${err.message}`);
    }
  }
  console.log(`      (advisory: parsed ${parsed}/${files.length} real lanes without throwing)`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
