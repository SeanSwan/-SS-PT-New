import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readBackend = (relativePath) => readFileSync(resolve(__dirname, '../..', relativePath), 'utf8');

describe('badge and gamification event connection', () => {
  it('routes workout completion badges through a bridge after the workout ledger commits', () => {
    const source = readBackend('controllers/gamificationController.mjs');
    const start = source.indexOf('recordWorkoutCompletion: async');
    const end = source.indexOf('markNotificationAsRead:', start);
    const slice = source.slice(start, end);

    expect(source).toContain("import { checkBadgesForGamificationEvent } from '../services/badgeGamificationBridge.mjs';");
    expect(slice).toContain('await transaction.commit();');
    expect(slice).toContain('checkBadgesForGamificationEvent');
    expect(slice.indexOf('await transaction.commit();')).toBeLessThan(slice.indexOf('checkBadgesForGamificationEvent'));
    expect(slice).toContain('badgesEarned');
  });

  it('routes challenge completion badges through the same bridge after completion XP commits', () => {
    const source = readBackend('controllers/challengeController.mjs');
    const start = source.indexOf('updateChallengeProgress: async');
    const end = source.indexOf('getChallengeLeaderboard', start);
    const slice = source.slice(start, end);

    expect(source).toContain("import { checkBadgesForGamificationEvent } from '../services/badgeGamificationBridge.mjs';");
    expect(slice).toContain('checkBadgesForGamificationEvent');
    expect(slice).toContain("type: 'challenge_completion'");
    expect(slice).toContain('badgesEarned');
  });

  it('routes social engagement badges through the social point award helper', () => {
    const source = readBackend('routes/social/posts.mjs');
    const start = source.indexOf('async function awardSocialPoints');
    const end = source.indexOf('async function awardEngagementReceivedPoints', start);
    const slice = source.slice(start, end);

    expect(source).toContain("import { checkBadgesForGamificationEvent } from '../../services/badgeGamificationBridge.mjs';");
    expect(slice).toContain('checkBadgesForGamificationEvent');
    expect(slice).toContain("type: 'social_action'");
    expect(slice).toContain('badgesEarned');
  });
});
