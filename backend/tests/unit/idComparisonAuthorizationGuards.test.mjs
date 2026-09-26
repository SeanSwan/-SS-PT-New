/**
 * idComparisonAuthorizationGuards
 * ============================================================================
 * Ratchet for the E-01 / G-series defect class.
 *
 * WHY THIS EXISTS
 * ---------------
 * `protect` sets `req.user.id = toStringId(user.id)` — always a STRING
 * (middleware/authMiddleware.mjs, "Attach user to request"). Sequelize INTEGER
 * primary/foreign keys come back as JS NUMBERS. So any `===` / `!==` between
 * the two is decided by type, not by value:
 *
 *     42 === '42'   ->  false      (equality guards never authorise)
 *     42 !== '42'   ->  true       (deny guards never let the owner through)
 *
 * Two separate sweeps fixed 65 + 9 such sites. This file pins the fixes so a
 * future edit cannot quietly reintroduce the bare form.
 *
 * NOTE ON LEGITIMATE BARE FORMS (do not "fix" these):
 *   - controllers/workoutController.mjs:403, :426, :470 compare
 *     `userId = req.params.userId || req.user.id` — BOTH sides are strings.
 *   - routes/social/posts.mjs:625 compares `req.params.userId` — a string.
 *   - routes/gamificationV1Routes.mjs:577 compares against `undefined`.
 * These are asserted below as intentionally retained.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { idEquals } from '../../utils/idUtils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(__dirname, '../..');

/**
 * Strip comments before asserting on source.
 *
 * The fix comments in these files deliberately quote the OLD broken form
 * ("was `targetUserId === requesterId`") so a reader knows what changed. A
 * naive `not.toContain` therefore matches the documentation rather than the
 * code — the same trap recorded in the §11.1 E-08 note. Assert on code only.
 */
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')      // /* block */ and /** jsdoc */
    .replace(/^\s*\/\/.*$/gm, '')          // whole-line comments
    .replace(/([^:'"`])\/\/[^'"`]*$/gm, '$1'); // trailing comments (keep URLs)

const read = (rel) => stripComments(readFileSync(resolve(backendRoot, rel), 'utf8'));

describe('idEquals — id comparison contract', () => {
  it('matches across the string/number boundary', () => {
    expect(idEquals(42, '42')).toBe(true);
    expect(idEquals('42', 42)).toBe(true);
    expect(idEquals(42, 42)).toBe(true);
    expect(idEquals('42', '42')).toBe(true);
  });

  it('rejects genuinely different ids', () => {
    expect(idEquals(42, 43)).toBe(false);
    expect(idEquals('42', '43')).toBe(false);
    expect(idEquals(42, '042')).toBe(false);
  });

  it('treats a missing identity as unequal, including against another missing identity', () => {
    // Tightened 2026-09-18 (G-08). The previous body short-circuited with
    // `if (!id1 || !id2) return id1 === id2;`, which made idEquals(null, null)
    // true while idEquals(null, undefined) was false — an inconsistent contract
    // on a helper that guards ~60 authorization checks.
    expect(idEquals(null, null)).toBe(false);
    expect(idEquals(undefined, undefined)).toBe(false);
    expect(idEquals(null, undefined)).toBe(false);
    expect(idEquals(undefined, null)).toBe(false);
    expect(idEquals(null, 42)).toBe(false);
    expect(idEquals(42, null)).toBe(false);
    expect(idEquals(undefined, '42')).toBe(false);
  });

  it('preserves the pre-existing falsy-id behaviour for 0 and empty string', () => {
    // These were true before the change and must stay true.
    expect(idEquals(0, 0)).toBe(true);
    expect(idEquals(0, '0')).toBe(true);
    expect(idEquals('', '')).toBe(true);
    expect(idEquals(0, '')).toBe(false);
  });

  it('no longer contains the inconsistent null short-circuit', () => {
    const source = read('utils/idUtils.mjs');
    expect(source).not.toContain('if (!id1 || !id2) return id1 === id2;');
    expect(source).toContain('id1 === null || id1 === undefined || id2 === null || id2 === undefined');
  });
});

describe('authorization guards use idEquals instead of bare strict equality', () => {
  const cases = [
    {
      file: 'routes/gamificationRoutes.mjs',
      gone: ['targetUserId === requesterId'],
      present: ['idEquals(targetUserId, requesterId)'],
      why: 'G-01 — clients were 403d on all 18 gamification routes',
    },
    {
      file: 'routes/sessionRoutes.mjs',
      gone: [
        'session.userId !== userId',
        'user.id !== req.user.id',
        'trainer.id !== req.user.id',
        'session.client.id !== req.user.id',
        'session.trainer.id !== req.user.id',
      ],
      present: ['idEquals(session.userId, userId)'],
      why: 'G-03 / G-10 — feedback + self-notification guards',
    },
    {
      file: 'routes/social/friendships.mjs',
      gone: [
        'recipientIdNum === req.user.id',
        'userIdNum === req.user.id',
        'Number(friendship.recipientId) === req.user.id',
        'Number(existingFriendship.requesterId) === req.user.id',
      ],
      present: [
        'idEquals(recipientIdNum, req.user.id)',
        'idEquals(userIdNum, req.user.id)',
        'idEquals(friendship.recipientId, req.user.id)',
      ],
      why: 'G-09 — self-friend, self-block and the block-direction swap',
    },
    {
      file: 'routes/userManagementRoutes.mjs',
      gone: ['user.id === req.user.id'],
      present: ['idEquals(user.id, req.user.id)'],
      why: 'G-11 — self-deactivation guard never fired',
    },
    {
      file: 'routes/aiBffRoutes.mjs',
      gone: ['req.user.id !== clientId'],
      present: ['idEquals(req.user.id, clientId)'],
      why: 'G-04 — client could not read own AI summary',
    },
    {
      file: 'services/variationEngine.mjs',
      gone: ['log.trainerId !== trainerId'],
      present: ['idEquals(log.trainerId, trainerId)'],
      why: 'G-05 — trainer could never accept a variation',
    },
    {
      file: 'controllers/aiWorkoutController.mjs',
      gone: ['targetUserId !== requesterId'],
      present: ['idEquals(targetUserId, requesterId)'],
      why: 'G-07 — explicit self-reference was 403d',
    },
    {
      file: 'controllers/longHorizonController.mjs',
      gone: ['targetUserId !== requesterId'],
      present: ['idEquals(targetUserId, requesterId)'],
      why: 'G-07 — same class as aiWorkoutController',
    },
    {
      file: 'middleware/authMiddleware.mjs',
      gone: ['req.user.id === ownerId'],
      present: ['idEquals(req.user.id, ownerId)'],
      why: 'G-06 — latent ownerOrAdminOnly defect (no call sites today)',
    },
  ];

  for (const { file, gone, present, why } of cases) {
    it(`${file} — ${why}`, () => {
      const source = read(file);
      for (const snippet of gone) {
        expect(source, `${file} must not contain: ${snippet}`).not.toContain(snippet);
      }
      for (const snippet of present) {
        expect(source, `${file} must contain: ${snippet}`).toContain(snippet);
      }
    });
  }
});

describe('verified-safe bare comparisons are retained deliberately', () => {
  it('workoutController authorization is assignment-backed and type-safe (S1, D-010)', () => {
    // Revised 2026-09-26: the old role-only bare comparison
    // (`userId !== req.user.id && role !== admin && role !== trainer`) was
    // the cross-tenant defect the Astra blueprint flagged (first-mounted
    // shadow path). The gate now routes through canAccessClientData ->
    // idEquals (type-safe across the string/number boundary) +
    // assertAssignmentOrAdmin (active assignment for cross-client).
    const source = read('controllers/workoutController.mjs');
    expect(source).toContain('const userId = req.params.userId || req.user.id;');
    expect(source).toContain('const canAccessClientData = async (targetUserId, reqUser)');
    expect(source).toContain('return assertAssignmentOrAdmin(reqUser.id, reqUser.role, targetUserId);');
    expect(source).not.toContain("if (userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'trainer')");
  });

  it('social posts route param comparison stays bare', () => {
    const source = read('routes/social/posts.mjs');
    expect(source).toContain('const { userId } = req.params;');
    expect(source).toContain('if (userId !== req.user.id) {');
  });
});
