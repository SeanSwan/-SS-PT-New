import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  resolve(process.cwd(), 'routes/social/challenges.mjs'),
  'utf8',
);

describe('legacy social challenge creation policy', () => {
  it('blocks new global challenges while preserving scoped individual and team creation', () => {
    expect(routeSource).toContain("const ALLOWED_SOCIAL_CHALLENGE_TYPES = new Set(['individual', 'team']);");
    expect(routeSource).toContain('if (!ALLOWED_SOCIAL_CHALLENGE_TYPES.has(challengeType))');
    expect(routeSource).toContain('Global challenge leaderboards are disabled for new challenges');
    expect(routeSource).toContain('type: challengeType,');
    expect(routeSource).not.toContain("type = 'individual'");
  });

  it('blocks legacy global challenge leaderboard reads before ranking branches', () => {
    const leaderboardRouteStart = routeSource.indexOf("router.get('/:challengeId/leaderboard'");
    expect(leaderboardRouteStart).toBeGreaterThan(-1);

    const globalGuard = routeSource.indexOf("if (challenge.type === 'global')", leaderboardRouteStart);
    const teamBranch = routeSource.indexOf("if (challenge.type === 'team')", leaderboardRouteStart);

    expect(globalGuard).toBeGreaterThan(leaderboardRouteStart);
    expect(routeSource.slice(globalGuard, teamBranch)).toContain(
      'Global challenge leaderboards are disabled for this legacy challenge',
    );
    expect(globalGuard).toBeLessThan(teamBranch);
  });
  it('suppresses embedded leaderboard data for legacy global challenge details', () => {
    const detailsRouteStart = routeSource.indexOf("router.get('/:challengeId',");
    const leaderboardRouteStart = routeSource.indexOf("router.get('/:challengeId/leaderboard'");

    expect(detailsRouteStart).toBeGreaterThan(-1);
    expect(leaderboardRouteStart).toBeGreaterThan(detailsRouteStart);

    const detailsRouteSource = routeSource.slice(detailsRouteStart, leaderboardRouteStart);
    const suppressionStart = detailsRouteSource.indexOf('let leaderboard = [];');
    const participantLoad = detailsRouteSource.indexOf('ChallengeParticipant.findAll');

    expect(suppressionStart).toBeGreaterThan(-1);
    expect(detailsRouteSource.indexOf("if (challenge.type !== 'global') {")).toBeLessThan(participantLoad);
    expect(participantLoad).toBeGreaterThan(suppressionStart);
    expect(detailsRouteSource).toContain('leaderboard,');
  });
});
