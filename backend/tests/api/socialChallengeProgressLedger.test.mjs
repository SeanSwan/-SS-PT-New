import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(resolve(process.cwd(), 'routes/social/challenges.mjs'), 'utf8');
const participantSource = readFileSync(
  resolve(process.cwd(), 'models/social/ChallengeParticipant.mjs'),
  'utf8',
);

describe('social challenge progress ledger contract', () => {
  it('writes positive point deltas through the canonical idempotent ledger in the row-lock transaction', () => {
    expect(routeSource).toContain('calculateChallengeProgressAward({');
    expect(routeSource).toContain('await GamificationPointsService.recordLedgerEntry({');
    expect(routeSource).toContain("source: 'challenge_completion'");
    expect(routeSource).toContain("idempotencyKey: 'challenge-progress:' + participation.id + ':' + cumulativePoints");
    expect(routeSource).toContain('}, t);');
  });

  it('rejects invalid progress and persists completion truth', () => {
    expect(routeSource).toContain("error.message === 'Progress must be a finite non-negative number'");
    expect(routeSource).toContain('participation.isCompleted = true;');
    expect(routeSource).toContain('participation.completedAt = new Date();');
  });

  it('does not retain the dormant direct User.increment point writer', () => {
    expect(participantSource).not.toContain('ChallengeParticipant.prototype.updateProgress');
    expect(participantSource).not.toContain("source: 'challenge_progress'");
    expect(participantSource).not.toContain("db.models.User.increment('points'");
  });
});
