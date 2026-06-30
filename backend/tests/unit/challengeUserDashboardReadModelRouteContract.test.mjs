import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const challengeControllerSource = readFileSync(
  resolve(process.cwd(), 'controllers/challengeController.mjs'),
  'utf8',
);

const clientDashboardRoutesSource = readFileSync(
  resolve(process.cwd(), 'routes/clientDashboardRoutes.mjs'),
  'utf8',
);

describe('challenge dashboard read model route contract', () => {
  it('enhances the active gamification user challenge endpoint with dashboard summaries', () => {
    expect(challengeControllerSource).toContain("from '../services/gamification/challengeDashboardReadModel.mjs'");
    expect(challengeControllerSource).toContain('challenges: userChallenges.rows.map((row) => toChallengeDashboardParticipation(row))');
  });

  it('enhances the client dashboard challenge endpoint with the same read model', () => {
    expect(clientDashboardRoutesSource).toContain("from '../services/gamification/challengeDashboardReadModel.mjs'");
    expect(clientDashboardRoutesSource).toContain('challenges: participations.map((row) => toChallengeDashboardParticipation(row))');
  });
});
