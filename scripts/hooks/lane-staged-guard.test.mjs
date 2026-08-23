#!/usr/bin/env node
/**
 * lane-staged-guard.test.mjs — the guard that now sits in every commit.
 * =====================================================================
 * WHY THIS EXISTS, and why it exists NOW: the guard was written, described as
 * "built, tested" in a handoff, and had no test file — the "tests" were ad-hoc
 * controls run once in the session that wrote it. Five of six hostile panel seats
 * named untested coordination tooling as this program's meta-defect, and wiring the
 * guard into .githooks/pre-commit promoted it from an advisory script to something
 * standing between every agent and every commit. Untested code in that position is
 * the risk, not the protection.
 *
 * THE ASYMMETRY THAT DECIDES EVERY CASE BELOW:
 *   a FALSE NEGATIVE leaks one file into the wrong commit — recoverable, and the
 *     thing that already happens today without any guard at all;
 *   a FALSE POSITIVE blocks a correct commit — and a pre-commit hook that blocks
 *     correct commits is removed within a week, taking the protection with it.
 * So the false-positive cases are the load-bearing ones, and they are tested hardest.
 *
 * Run: node scripts/hooks/lane-staged-guard.test.mjs   (exit 0 = pass)
 */
import { norm, claimedFiles, isCovered } from '../lane-staged-guard.mjs';

let pass = 0;
const failures = [];
const check = (name, cond, detail = '') => {
  if (cond) { pass++; return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};

const lane = (...lines) => lines.join('\n');

// ---- 1. norm(): Windows is case-blind and writes backslashes ---------------
{
  check('1a backslashes', norm('scripts\\hooks\\a.mjs') === 'scripts/hooks/a.mjs');
  check('1b leading ./', norm('./scripts/a.mjs') === 'scripts/a.mjs');
  check('1c case folded', norm('Scripts/A.MJS') === 'scripts/a.mjs');
  check('1d whitespace', norm('  scripts/a.mjs  ') === 'scripts/a.mjs');
  check('1e null-ish', norm(null) === '' && norm(undefined) === '');
}

// ---- 2. claimedFiles(): the EDITING NOW block ------------------------------
{
  const l = lane('# vs-claude', '## 🔒 EDITING NOW', '- scripts/a.mjs', '- `scripts/b.mjs`', '', '## Notes', '- not/a/claim.mjs');
  const c = claimedFiles(l);
  check('2a reads the block', c.includes('scripts/a.mjs') && c.includes('scripts/b.mjs'), JSON.stringify(c));
  check('2b stops at the next heading', !c.includes('not/a/claim.mjs'), JSON.stringify(c));

  check('2c trailing note is stripped',
    claimedFiles(lane('## EDITING NOW', '- scripts/x.mjs (restoring from origin/main)')).includes('scripts/x.mjs'));
  check('2d released markers ignored',
    claimedFiles(lane('## EDITING NOW', '- (released)', '- —')).length === 0);
  check('2e no block at all -> no claims', claimedFiles(lane('# lane', '## Notes', '- x')).length === 0);
  check('2f empty/garbage input', claimedFiles('').length === 0 && claimedFiles(null).length === 0);
  check('2g CRLF lanes parse', claimedFiles('## EDITING NOW\r\n- scripts/a.mjs\r\n').includes('scripts/a.mjs'));
  check('2h unlocked emoji variant', claimedFiles(lane('## 🔓 EDITING NOW', '- scripts/a.mjs')).includes('scripts/a.mjs'));
}

// ---- 3. THE DUPLICATE-BLOCK FALSE POSITIVE (open item 6.5) -----------------
// A lane file with two `EDITING NOW` sections is a state that has actually occurred
// in this ledger (fable.lane.md). Reading only the first makes every file claimed in
// the second invisible — and since the guard now runs in pre-commit, invisible means
// a BLOCKED CORRECT COMMIT with a message telling the agent to claim a file it has
// already claimed. That is the precise shape of a gate people delete.
{
  const two = lane(
    '## 🔒 EDITING NOW', '- scripts/a.mjs', '',
    '## Notes', 'something', '',
    '## 🔒 EDITING NOW', '- scripts/b.mjs', '',
  );
  const c = claimedFiles(two);
  check('3a first block still read', c.includes('scripts/a.mjs'), JSON.stringify(c));
  check('3b SECOND block also read', c.includes('scripts/b.mjs'), JSON.stringify(c));
  check('3c both covered', isCovered('scripts/a.mjs', c) && isCovered('scripts/b.mjs', c));

  // Three blocks, and a duplicate path across two of them.
  const three = lane('## EDITING NOW', '- a.mjs', '', '## X', '', '## EDITING NOW', '- b.mjs', '', '## Y', '', '## EDITING NOW', '- a.mjs', '- c.mjs');
  const c3 = claimedFiles(three);
  check('3d all three blocks unioned', ['a.mjs', 'b.mjs', 'c.mjs'].every((p) => c3.includes(p)), JSON.stringify(c3));
  check('3e duplicates collapse', c3.filter((p) => p === 'a.mjs').length === 1, JSON.stringify(c3));
}

// ---- 4. isCovered(): directory and glob claims -----------------------------
{
  const c = claimedFiles(lane('## EDITING NOW', '- scripts/hooks/**', '- docs/notes', '- scripts/one.mjs'));
  check('4a glob covers descendants', isCovered('scripts/hooks/a.mjs', c));
  check('4b glob covers deep descendants', isCovered('scripts/hooks/deep/b.mjs', c));
  check('4c bare dir covers descendants', isCovered('docs/notes/x.md', c));
  check('4d bare dir covers itself', isCovered('docs/notes', c));
  check('4e exact file', isCovered('scripts/one.mjs', c));
  check('4f Windows-spelled staged path', isCovered('scripts\\hooks\\a.mjs', c));
  check('4g case-insensitive', isCovered('Scripts/Hooks/A.mjs', c));

  // The false-negative direction: a sibling prefix must NOT be swept in.
  check('4h prefix is not substring-matched', !isCovered('scripts/hooks-extra/a.mjs', c),
    'scripts/hooks-extra must not be covered by scripts/hooks/**');
  check('4i unrelated file uncovered', !isCovered('backend/routes/x.mjs', c));
  check('4j no claims covers nothing', !isCovered('scripts/a.mjs', []));
}

// ---- 5. A bare `**` claim must NOT become a silent opt-out ------------------
// This case was first written asserting the opposite — that `- **` covers
// everything — on the assumption that it expresses "I am editing the whole repo".
// That is the wrong property to want. If `**` covered everything, any agent could
// neutralise the guard permanently by writing two characters in its lane, and
// nothing would ever report that the guard had stopped guarding. Silent opt-out is
// the one outcome this entire program exists to make impossible.
//
// Covering NOTHING fails closed and loudly instead: the commit is blocked, the
// message names the files, and --allow-foreign remains the deliberate, greppable
// way through. Pinned so a future "usability" fix cannot quietly invert it.
{
  const c = claimedFiles(lane('## EDITING NOW', '- **'));
  check('5a bare ** does NOT silently cover everything', !isCovered('any/file.mjs', c), JSON.stringify(c));
  check('5b a real directory glob still works', isCovered('scripts/x.mjs', claimedFiles(lane('## EDITING NOW', '- scripts/**'))));
}

if (failures.length) {
  console.error(`FAIL ${failures.length} of ${pass + failures.length}`);
  for (const f of failures) console.error('  ✗ ' + f);
  process.exit(1);
}
console.log(`lane-staged-guard: ${pass}/${pass} pass`);
