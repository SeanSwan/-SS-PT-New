/**
 * socialChallengeRetirementContract — the SWA-96 merge, pinned (2026-08-13)
 * =========================================================================
 * Sean's canon decision: the PascalCase social challenge family is RETIRED.
 * The canonical family is the root one (`challenges` table, /api/v1/gamification
 * lane, 22 frontend files). This contract is a tripwire against resurrection:
 * the legacy endpoints read/wrote EMPTY twin tables, so anyone re-adding one is
 * re-introducing dead surface area — likely by copy-paste from git history.
 *
 * Replaces (test-delta, class RE-ANCHOR — subjects removed by owner decision,
 * not silenced): socialChallengeCreatePolicy.test.mjs (3 tests),
 * socialChallengeProgressLedger.test.mjs (3), and the social half of
 * challengeEvidenceGateContract.test.mjs (2). The anti-self-report gate those
 * tests defended is now vacuously stronger here: the manual-progress endpoint
 * does not exist at all. The V1 lane's gate keeps its own live assertions.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const here = path.dirname(fileURLToPath(import.meta.url));
const routeSrc = readFileSync(path.resolve(here, '../../routes/social/challenges.mjs'), 'utf8');
const socialIndexSrc = readFileSync(path.resolve(here, '../../models/social/index.mjs'), 'utf8');
const associationsSrc = readFileSync(path.resolve(here, '../../models/associations.mjs'), 'utf8');

describe('social challenge retirement (SWA-96)', () => {
  it('keeps ONLY the canonical /active endpoint', () => {
    const routes = routeSrc.match(/router\.(get|post|put|delete)\(/g) || [];
    expect(routes).toHaveLength(1);
    expect(routeSrc).toContain("router.get('/active'");
  });

  it('serves /active from the canonical registry models, never the social twins', () => {
    expect(routeSrc).toContain("getChallenge, getChallengeParticipant");
    expect(routeSrc).not.toContain("from '../../models/social/index.mjs'");
  });

  it('legacy endpoints stay dead: join/leave/progress/teams/create/leaderboard', () => {
    for (const legacy of ['/join', '/leave', '/progress', '/teams', '/leaderboard', "post('/'"]) {
      expect(routeSrc).not.toContain(legacy);
    }
  });

  it('the social model registry no longer exports the retired trio', () => {
    // Word-boundary shapes so the retirement COMMENTS naming them do not match.
    expect(socialIndexSrc).not.toMatch(/import Challenge from/);
    expect(socialIndexSrc).not.toMatch(/^\s+ChallengeTeam,\s*$/m);
    expect(associationsSrc).not.toContain('SocialChallenge');
  });
});
