/**
 * Regression tests for the verdict logic.
 *
 * The sensitivity-floor tests exist because the guard was written as a helper
 * and never wired into assignVerdict -- the first live run labelled a branch
 * named "storefront-special-leak" (3 absent commits touching cartRoutes.mjs and
 * v2PaymentRoutes.mjs) as [ARCHIVE] unmergeable-by-cost. These lock that shut.
 *
 * Run: node --test scripts/recon/rank.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignVerdict, VERDICT, neverAgeOut, pathSensitivity, rankScore } from './rank.mjs';
import { EQUIV, CONF } from './equivalence.mjs';

const WEEKS_6 = Math.floor(Date.now() / 1000) - 6 * 7 * 86400;

const rec = (over = {}) => ({
  equivalence: EQUIV.ABSENT,
  confidence: CONF.HIGH,
  realCommits: 3,
  behind: 1815,
  files: [],
  signals: [],
  ...over,
});

const item = (over = {}) => ({
  ref: 'claude/some-branch',
  lastCommitAt: WEEKS_6,
  laneLocked: false,
  inWorktree: false,
  ...over,
});

test('THE REGRESSION: money-path branch is never archived by age', () => {
  const r = rec({ files: ['backend/routes/cartRoutes.mjs', 'backend/routes/v2PaymentRoutes.mjs'] });
  const i = item({ ref: 'claude/fix-hr007-storefront-special-leak-20260705' });
  const v = assignVerdict(r, i, { subjects: [] });
  assert.equal(v, VERDICT.CONFLICTING, 'money-path absent work must escalate to human');
  assert.notEqual(v, VERDICT.COST);
  assert.notEqual(v, VERDICT.LANDED);
  assert.notEqual(v, VERDICT.EXPERIMENTAL);
});

test('sensitivity floor covers each sensitive surface', () => {
  const surfaces = [
    'backend/middleware/auth.mjs',
    'backend/routes/adminRoutes.mjs',
    'backend/routes/v2PaymentRoutes.mjs',
    'backend/routes/cartRoutes.mjs',
    'backend/services/checkoutService.mjs',
    'backend/routes/stripeWebhook.mjs',
    'backend/middleware/session.mjs',
    'backend/lib/permissions.mjs',
  ];
  for (const f of surfaces) {
    const v = assignVerdict(rec({ files: [f] }), item(), { subjects: [] });
    assert.equal(v, VERDICT.CONFLICTING, `${f} must escalate, got ${v}`);
  }
});

test('sensitivity floor does NOT fire when nothing is genuinely absent', () => {
  // Already-landed work is content-proven on main; retiring the branch loses nothing.
  const r = rec({ equivalence: EQUIV.LANDED, realCommits: 0, files: ['backend/routes/cartRoutes.mjs'] });
  assert.equal(assignVerdict(r, item(), { subjects: [] }), VERDICT.LANDED);
});

test('non-sensitive, far-behind, tiny delta still archives by cost', () => {
  const r = rec({ files: ['docs/notes.md', 'README.md'], realCommits: 1 });
  assert.equal(assignVerdict(r, item(), { subjects: [] }), VERDICT.COST);
});

test('active lane and worktree beat every other signal', () => {
  const r = rec({ files: ['backend/routes/cartRoutes.mjs'] });
  assert.equal(assignVerdict(r, item({ laneLocked: true }), {}), VERDICT.ACTIVE_LANE);
  assert.equal(assignVerdict(r, item({ inWorktree: true }), {}), VERDICT.ACTIVE_LANE);
});

test('commits under 48h are in-flight, not stranded', () => {
  const fresh = item({ lastCommitAt: Math.floor(Date.now() / 1000) - 3600 });
  assert.equal(assignVerdict(rec(), fresh, {}), VERDICT.ACTIVE_LANE);
});

test('unknown equivalence and low confidence never become actionable', () => {
  assert.equal(assignVerdict(rec({ equivalence: EQUIV.UNKNOWN }), item(), {}), VERDICT.UNKNOWN);
  assert.equal(assignVerdict(rec({ confidence: CONF.LOW }), item(), {}), VERDICT.UNKNOWN);
});

test('WIP needs two independent signals, not one', () => {
  const r = rec({ files: ['docs/x.md'], behind: 10 });
  assert.notEqual(assignVerdict(r, item(), { subjects: ['wip: half done'] }), VERDICT.WIP);
  assert.equal(
    assignVerdict(r, item(), { subjects: ['wip: half done', 'slice 2 of 4'] }),
    VERDICT.WIP,
  );
});

test('pathSensitivity counts only sensitive files', () => {
  assert.equal(pathSensitivity(['README.md', 'docs/a.md']), 0);
  assert.equal(pathSensitivity(['backend/middleware/auth.mjs', 'README.md']), 1);
});

test('neverAgeOut fires on branch name even with no file evidence', () => {
  assert.equal(neverAgeOut(rec({ files: [] }), item({ ref: 'claude/equipment-p0-safety' })), true);
  assert.equal(neverAgeOut(rec({ files: [] }), item({ ref: 'claude/docs-tidy' })), false);
});

test('rank score never reads untrustedAhead', () => {
  const i1 = item({ untrustedAhead: 9999 });
  const i2 = item({ untrustedAhead: 0 });
  const r = rec({ files: ['docs/a.md'], realCommits: 2 });
  assert.equal(rankScore(r, i1), rankScore(r, i2), 'upstream:track must not influence ranking');
});
