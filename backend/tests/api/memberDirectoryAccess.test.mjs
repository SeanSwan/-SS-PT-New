/**
 * Member directory access policy — the class guard.
 * =================================================
 *
 * Four review rounds fixed this same five-part defect on three sibling
 * endpoints, and a fourth (`/gamification/discover-users`) still had every part
 * of it — 60 lines below the route that had just been hardened, in the same
 * routes file. Per-endpoint tests could not see that, because each pinned its
 * own handler.
 *
 * This pins the POLICY. Any member-facing directory surface that hand-rolls its
 * own attribute list, offset or count is re-opening the hole.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  MEMBER_MAX_ROWS,
  STORABLE_TIER_KEYS,
  directoryAttributes,
  directoryLimit,
  directoryOffset,
  directoryTotal,
  isKnownTier,
  isStaffViewer,
  scopeToMembers,
  scopeToRankable,
} from '../../utils/memberDirectoryAccess.mjs';
import { RANK_TITLES } from '../../utils/levelingAlgorithm.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(resolve(here, '../..', rel), 'utf8');

const member = { id: 42, role: 'user' };
const client = { id: 43, role: 'client' };
const trainer = { id: 9, role: 'trainer' };
const admin = { id: 1, role: 'admin' };

describe('member directory policy', () => {
  it('withholds surnames from members and clients, keeps them for staff', () => {
    expect(directoryAttributes(member)).not.toContain('lastName');
    expect(directoryAttributes(client)).not.toContain('lastName');
    expect(directoryAttributes(trainer)).toContain('lastName');
    expect(directoryAttributes(admin)).toContain('lastName');
    expect(directoryAttributes(member)).toContain('firstName');
  });

  it('gives members no paging at all — the top of a slice is all there is', () => {
    // Capping page DEPTH was not enough: the reachable set is the union over
    // tier x metric x timeframe, so a bounded offset still walked every slice.
    for (const rawOffset of [0, 100, 4900, 49900]) {
      expect(directoryOffset(member, rawOffset)).toBe(0);
    }
    expect(directoryOffset(admin, 49900)).toBe(49900);
  });

  it('caps a member page below the staff page', () => {
    expect(directoryLimit(member, 500)).toBeLessThanOrEqual(MEMBER_MAX_ROWS);
    expect(directoryLimit(admin, 500)).toBe(500);
  });

  it('never reports the population to a member', () => {
    // A per-slice headcount is an oracle, and it hands an enumerator the page
    // count to walk. Clamping to a constant is not enough — any count BELOW
    // the clamp is still disclosed exactly.
    expect(directoryTotal(member, 5000, 20)).toBe(20);
    expect(directoryTotal(member, 37, 20)).toBe(20);
    expect(directoryTotal(admin, 5000, 20)).toBe(5000);
  });

  it('scopes a member-facing query to member roles only', () => {
    const scoped = scopeToMembers(member, { active: true });
    const roleClause = scoped.role;
    const allowed = Object.getOwnPropertySymbols(roleClause)
      .map((symbol) => roleClause[symbol])
      .flat();

    expect(allowed).toContain('user');
    expect(allowed).toContain('client');
    expect(allowed).not.toContain('trainer');
    expect(allowed).not.toContain('admin');
    expect(scoped.active).toBe(true);
    expect(scopeToMembers(admin, { active: true }).role).toBeUndefined();
  });

  it('allowlists tiers against every value the system can STORE', () => {
    // A hand-copied list from the legacy ALIAS map covered 6 of ~100 storable
    // values, so every member past level 10 had their filter silently dropped
    // while the code claimed to validate it.
    // Union of what getTier() writes AND the legacy aliases still on rows.
    expect(STORABLE_TIER_KEYS.size).toBeGreaterThanOrEqual(RANK_TITLES.length);
    // The DB default is an ALIAS, not a rank key — the commonest stored value.
    expect(isKnownTier('bronze_forge')).toBe(true);
    for (const rank of RANK_TITLES) {
      expect(isKnownTier(rank.key)).toBe(true);
    }
    expect(isKnownTier('definitely_not_a_tier')).toBe(false);
    expect(isKnownTier(undefined)).toBe(false);
  });

  it('cannot be bypassed by the ARRAY form, which renders as SELECT col AS alias', () => {
    // `[['lastName','ln']]` becomes `SELECT "lastName" AS "ln"`. The previous
    // filter read field[1] — the caller-chosen ALIAS — so this leaked while the
    // plain string form was correctly blocked.
    const injected = directoryAttributes(
      { role: 'user' },
      [['lastName', 'ln'], ['email', 'e'], ['points', 'p']],
    );

    expect(JSON.stringify(injected)).not.toContain('lastName');
    expect(JSON.stringify(injected)).not.toContain('email');
    expect(JSON.stringify(injected)).toContain('points');
  });

  it('rejects fn()/literal()/col() objects and a non-array `extra`', () => {
    expect(JSON.stringify(directoryAttributes({ role: 'user' }, [[{ col: 'lastName' }, 'x']])))
      .not.toContain('lastName');
    expect(JSON.stringify(directoryAttributes({ role: 'user' }, [{ fn: 'now' }])))
      .not.toContain('fn');
    // A bare string used to throw `extra.filter is not a function` -> 500.
    expect(() => directoryAttributes({ role: 'user' }, 'lastName')).not.toThrow();
    expect(directoryAttributes({ role: 'user' }, 'lastName')).not.toContain('lastName');
  });

  it('cannot be bypassed by injecting a staff field through `extra`', () => {
    // A reviewer defeated the previous version in ONE line: the staff gate ran,
    // then `extra` was spread straight past it, and the guard suite stayed
    // 11/11 green. An escape hatch that is not filtered is not a policy.
    const injected = directoryAttributes(
      { role: 'user' },
      ['lastName', 'email', 'phone', 'healthConcerns', 'points'],
    );

    expect(injected).not.toContain('lastName');
    expect(injected).not.toContain('email');
    expect(injected).not.toContain('phone');
    expect(injected).not.toContain('healthConcerns');
    // ...while a legitimate extra still comes through.
    expect(injected).toContain('points');
  });

  it('still lets staff request the fields they are entitled to', () => {
    const staffView = directoryAttributes({ role: 'admin' }, ['email', 'phone']);

    expect(staffView).toContain('email');
    expect(staffView).toContain('phone');
  });

  it('keeps an opted-out member off a member-facing ranking', () => {
    // `leaderboardOptIn` existed and was honoured by TWO unmounted leaderboard
    // implementations, while the only one actually served ignored it.
    expect(scopeToRankable({ role: 'user' }).leaderboardOptIn).toBe(true);
    expect(scopeToRankable({ role: 'client' }).leaderboardOptIn).toBe(true);
    // Staff boards are administrative and still show everyone.
    expect(scopeToRankable({ role: 'admin' }).leaderboardOptIn).toBeUndefined();
  });

  it('classifies viewers correctly', () => {
    expect(isStaffViewer(member)).toBe(false);
    expect(isStaffViewer(client)).toBe(false);
    expect(isStaffViewer(trainer)).toBe(true);
    expect(isStaffViewer(admin)).toBe(true);
    expect(isStaffViewer(undefined)).toBe(false);
  });
});

describe('every member-facing directory surface uses the policy', () => {
  const socialSource = read('controllers/socialController.mjs');
  const progressSource = read('controllers/progressController.mjs');
  const challengeSource = read('controllers/challengeController.mjs');

  it('ships no ungated surname from the social directory surfaces', () => {
    // discover-users, followers, following and the social feed all returned
    // 'lastName' unconditionally to any authenticated account.
    expect(socialSource).not.toContain("'lastName'");
  });

  it('ships no ungated surname from the challenge surfaces', () => {
    const ungated = socialSource.match(/'lastName'/g) || [];
    expect(ungated).toHaveLength(0);
    // challengeController keeps lastName only inside a staff conditional.
    for (const match of challengeSource.matchAll(/'lastName'/g)) {
      const context = challengeSource.slice(Math.max(0, match.index - 120), match.index);
      expect(context).toMatch(/isStaffViewer|role === 'admin'/);
    }
  });

  it('routes discover-users through the shared policy', () => {
    const handler = socialSource.slice(socialSource.indexOf('discoverUsers: async'));
    expect(handler).toContain('scopeToMembers(');
    expect(handler).toContain('directoryAttributes(');
    expect(handler).toContain('directoryOffset(');
    expect(handler).toContain('directoryTotal(');
    expect(handler).toContain('isKnownTier(');
  });

  it('keeps staff contact details out of the trainer dropdown', () => {
    const sessionService = read('services/sessions/session.service.mjs');
    const handler = sessionService.slice(
      sessionService.indexOf('async getTrainers('),
      sessionService.indexOf('async getTrainers(') + 900,
    );
    // Was: ['id','firstName','lastName','email','phone',...] to any member.
    expect(handler).toContain('directoryAttributes(viewer');
    expect(handler).not.toContain("'email'");
    expect(handler).not.toContain("'phone'");
  });

  it('caps and scopes the friend-suggestion feed', () => {
    const friendships = read('routes/social/friendships.mjs');
    expect(friendships).toContain('directoryAttributes(req.user');
    expect(friendships).toContain('Math.min(requestedLimit, 50)');
  });

  it('keeps the leaderboard on the same policy', () => {
    // Two implementations of one rule is how this class kept re-opening.
    expect(progressSource).toContain("from '../utils/memberDirectoryAccess.mjs'");
    expect(progressSource).toContain('directoryOffset(req.user, rawOffset)');
    expect(progressSource).toContain('scopeToRankable(req.user)');
    expect(progressSource).toContain('isKnownTier(tier)');
  });
});
