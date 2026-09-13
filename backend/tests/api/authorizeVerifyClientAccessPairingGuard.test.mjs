/**
 * ============================================================================
 * FILE: authorizeVerifyClientAccessPairingGuard.test.mjs
 * PURPOSE: Repo-level regression guard for the `'user'`-role defect class.
 * RULES OBSERVED: rule 4 (under the 300-line cap; detector lives in
 *                 tests/helpers/authorizePairingScan.mjs), rule 20 (sibling
 *                 sweep), rule 51 (confidence tags below).
 * ============================================================================
 *
 * THE CLASS — found in THREE independent passes, so this guard exists to end it.
 *
 * `'user'` is the DEFAULT role minted by public self-registration
 * (models/User.mjs:135) and is client-equivalent (utils/clientAccess.mjs:23).
 * The defect signature is NOT "a role list mentions 'client'". It is a route
 * that PAIRS two guards that disagree about whether a `'user'` account owns its
 * own record:
 *
 *   authorize([... 'client' ...])       -> literal roles.includes()
 *                                          (authMiddleware.mjs:459-493);
 *                                          no client-equivalence -> 403
 *   verifyClientAccessByUserId({...})   -> assertAssignmentOrAdmin
 *                                          (verifyClientAccess.mjs:91-93)
 *                                          maps 'user' -> self: true
 *
 * `authorize` denies the account before the ownership guard can admit it. The
 * falsifiable condition is therefore: PAIRED, and the list contains 'client',
 * and the list does NOT contain 'user'. That is what this guard fails on.
 *
 * WHY THIS SHAPE AND NOT A GENERAL SWEEP. A "no requester-side role === 'client'"
 * sweep also matches legitimate TARGET-side checks (is the *subject* a client?)
 * and cannot separate them without data-flow analysis, so it would be noisy and
 * get ignored. The pairing is mechanically checkable and IS the disagreement.
 * Two earlier implementations of this class were pinned by tests asserting the
 * BROKEN strings verbatim (clientDataOverviewPrivacy.test.mjs,
 * painEntryRoutesAccessGuard.test.mjs); those pins are why the class survived two
 * sweeps. This file pins no route text — it sweeps the tree.
 *
 * WHAT THIS GUARD DOES NOT COVER (stated, not implied):
 * - A single guard on a SELF-SCOPED route that omits the default role with no
 *   ownership guard to pair with. That is the shape of
 *   clientProgressRoutes.mjs:21-24 (`currentClientAccess`) and it is invisible
 *   here by construction; tests/api/clientProgressSelfAccessExecution.test.mjs
 *   covers it behaviourally. [VERIFIED two ways: (1) the pre-fix scan found that
 *   group UNPAIRED while `clientReadAccess` in the same file was paired;
 *   (2) reverting just that list to ['client','admin'] turns the behavioural
 *   suite red (2 tests) while THIS guard stays green — the gap is measured.]
 * - Target-side role checks (is the target's stored role 'client'?), a different
 *   question.
 * - Indirection deeper than one named-array hop.
 * - An `authorize(` call whose role list is not a literal array: reported by the
 *   coverage test below, which FAILS rather than silently skipping it.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  findPairedClientAuthorizeGuards,
  findUnreadableAuthorizeArgs,
  isPairingViolation,
} from '../helpers/authorizePairingScan.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = resolve(__dirname, '../..');
const ROUTES_DIR = join(BACKEND_DIR, 'routes');

/**
 * Exemptions for genuinely correct pairings.
 *
 * Every entry MUST carry: `file` (e.g. 'backend/routes/x.mjs'), `scope` (a
 * literal substring of the flagged guard group, so the exemption is pinned to
 * the route it was reviewed for) and `reason` (why 'client'-without-'user' is
 * correct there). An entry that suppresses nothing is a FAILURE — the list
 * cannot rot into a blanket. Empty is the expected state; see the sweep test.
 */
const PAIRING_ALLOWLIST = [
  // {
  //   file: 'backend/routes/example.mjs',
  //   scope: "router.get('/:clientId/thing'",
  //   reason: 'why a client-equivalent caller must be excluded here',
  // },
];

// ---------------------------------------------------------------------------
// Synthetic cases — the detector must be able to FIRE, or the sweep is theatre
// ---------------------------------------------------------------------------

const SAME_LINE = [
  "import { protect, authorize } from '../middleware/authMiddleware.mjs';",
  "import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';",
  'const router = express.Router();',
  "router.post('/:userId/:entryId', authorize(['admin', 'trainer', 'client']), verifyClientAccessByUserId({ paramName: 'userId' }), handler);",
].join('\n');

const ARRAY_LITERAL = [
  "import { protect, authorize } from '../middleware/authMiddleware.mjs';",
  "import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';",
  'const clientReadAccess = [',
  '  protect,',
  "  authorize(['client', 'trainer', 'admin']),",
  "  verifyClientAccessByUserId({ paramName: 'clientId' }),",
  '];',
  "router.get('/:clientId/goals', ...clientReadAccess, getClientGoals);",
].join('\n');

const NAMED_INDIRECTION = [
  "import { protect, authorize } from '../middleware/authMiddleware.mjs';",
  "import { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';",
  'const roleOnly = [protect, ',
  "  authorize(['admin', 'trainer', 'client'])];",
  "router.get('/:userId', ...roleOnly, verifyClientAccessByUserId({ paramName: 'userId' }), handler);",
].join('\n');

const SYNTHETIC = 'backend/routes/synthetic.mjs';

describe('pairing detector can fire (a guard that cannot fail is not a guard)', () => {
  const violationCases = [
    ['same-line pairing', SAME_LINE],
    ['named array literal pairing', ARRAY_LITERAL],
    ['named array spread into a paired route', NAMED_INDIRECTION],
  ];

  it.each(violationCases)('detects and FLAGS a violation: %s', (_label, source) => {
    const findings = findPairedClientAuthorizeGuards(source, SYNTHETIC);
    expect(findings).toHaveLength(1);
    expect(findings[0].roles).toContain('client');
    expect(isPairingViolation(findings[0])).toBe(true);
  });

  const nonViolationCases = [
    ['pairing already carrying the default role', SAME_LINE.replace("'client']", "'client', 'user']")],
    ['client list with NO ownership guard', SAME_LINE.replace(/, verifyClientAccessByUserId\(\{ paramName: 'userId' \}\)/, '')],
    ['staff-only list with an ownership guard', SAME_LINE.replace("'admin', 'trainer', 'client'", "'admin', 'trainer'")],
    ['unpaired list in a separate statement', "import { protect, authorize } from '../middleware/authMiddleware.mjs';\nimport { verifyClientAccessByUserId } from '../middleware/verifyClientAccess.mjs';\nconst g = [protect, authorize(['admin', 'trainer', 'client'])];\nrouter.get('/a', ...g, h);\nrouter.get('/b/:userId', verifyClientAccessByUserId({ paramName: 'userId' }), h);"],
    ['commented-out pairing', `// ${SAME_LINE.split('\n')[3]}`],
  ];

  it.each(nonViolationCases)('reports NO violation: %s', (_label, source) => {
    expect(findPairedClientAuthorizeGuards(source, SYNTHETIC).filter(isPairingViolation)).toEqual([]);
  });

  it('still recognises a role-carrying pairing as a pairing (not just "any client list")', () => {
    const source = SAME_LINE.replace("'client']", "'client', 'user']");
    expect(findPairedClientAuthorizeGuards(source, SYNTHETIC)).toHaveLength(1);
  });

  it('flags an authorize() call whose role list the sweep cannot read', () => {
    const source = "import { protect, authorize } from '../middleware/authMiddleware.mjs';\nconst ROLES = ['admin'];\nrouter.get('/x', authorize(ROLES), h);";
    expect(findUnreadableAuthorizeArgs(source, SYNTHETIC)).toHaveLength(1);
  });

  it('ignores a file that does not import the authorize middleware', () => {
    const source = "async function authorize(req, res) { return { allowed: true }; }\nconst access = await authorize(req, res);";
    expect(findUnreadableAuthorizeArgs(source, SYNTHETIC)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Live repo sweep
// ---------------------------------------------------------------------------

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const full = join(dir, name);
  if (statSync(full).isDirectory()) return walk(full);
  return full.endsWith('.mjs') ? [full] : [];
});

const label = (abs) => `backend/${relative(BACKEND_DIR, abs).split(sep).join('/')}`;

describe('backend/routes pairing guard (repo-wide sweep)', () => {
  const files = walk(ROUTES_DIR);
  const sources = files.map((abs) => ({ file: label(abs), text: readFileSync(abs, 'utf8') }));
  const pairings = sources.flatMap(({ file, text }) => findPairedClientAuthorizeGuards(text, file));
  const violations = pairings.filter(isPairingViolation);
  const unreadable = sources.flatMap(({ file, text }) => findUnreadableAuthorizeArgs(text, file));

  it('swept the whole routes tree rather than a hand-picked list', () => {
    // Anti-silence: a broken cwd or a moved directory must FAIL, not pass empty.
    expect(files.length).toBeGreaterThan(150);
    expect(pairings.length).toBeGreaterThan(0);
  });

  it('read the role list of every authorize() call it claims to have checked', () => {
    expect(unreadable.map((u) => `${u.file}:${u.line}`).join('\n')).toBe('');
  });

  it('keeps every allowlist entry reasoned and live', () => {
    const problems = [];
    for (const entry of PAIRING_ALLOWLIST) {
      if (!entry.reason || !String(entry.reason).trim()) problems.push(`missing reason: ${entry.file}`);
      if (!entry.file || !entry.scope) problems.push(`incomplete entry: ${JSON.stringify(entry)}`);
      if (!violations.some((v) => v.file === entry.file && v.guard.includes(entry.scope))) {
        problems.push(`stale (suppresses nothing): ${entry.file} :: ${entry.scope}`);
      }
    }
    expect(problems.join('\n')).toBe('');
  });

  it('has NO route pairing authorize([...client...]) with verifyClientAccessByUserId', () => {
    const unallowed = violations.filter((v) => !PAIRING_ALLOWLIST.some(
      (entry) => entry.file === v.file && v.guard.includes(entry.scope),
    ));
    // A failure here is a REAL defect: the two guards disagree about `'user'`, so
    // the default self-registration role is denied by `authorize` before the
    // ownership guard can admit it to its own record. Fix by adding 'user' to the
    // list (preferred), or add an allowlist entry WITH A REASON.
    expect(unallowed.map((v) => `${v.file}:${v.line} roles=[${v.roles.join(',')}] :: ${v.guard}`).join('\n')).toBe('');
  });
});
