import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildHomeBadgeShowcase,
  buildHomeLiveActivity,
  selectActiveChallengeSummary,
} from './HomeTabLiveWidgetViewModel';

const VIEW_MODEL_SOURCE = readFileSync(resolve(__dirname, './HomeTabLiveWidgetViewModel.ts'), 'utf8');
const RIGHT_RAIL_SOURCE = readFileSync(resolve(__dirname, './HomeTabVisionRightRail.tsx'), 'utf8');

describe('User Dashboard home widget truth states', () => {
  it('does not manufacture a current-user leaderboard row when the API returns no leaderboard data', () => {
    const result = buildHomeBadgeShowcase({
      achievements: [],
      leaderboard: [],
      currentUserName: 'Sean',
      currentUserPoints: 9999,
    });

    expect(result.leaderboardRows).toEqual([]);
    expect(VIEW_MODEL_SOURCE).not.toContain("id: 'current-user'");
    expect(VIEW_MODEL_SOURCE).not.toContain("name: currentUserName");
  });

  it('normalizes real leaderboard entries without fake competitive names', () => {
    const result = buildHomeBadgeShowcase({
      achievements: [],
      leaderboard: [
        { id: 'one', user: { firstName: 'Ada' }, points: 1200 },
        { id: 'two', username: 'Lifter77', totalPoints: '850' },
        { id: 'three', score: 'bad-number' },
      ],
      currentUserName: 'Sean',
      currentUserPoints: 9999,
    });

    expect(result.leaderboardRows).toEqual([
      { id: 'one', name: 'Ada', points: 1200 },
      { id: 'two', name: 'Lifter77', points: 850 },
      { id: 'three', name: 'Community Member', points: 0 },
    ]);
    expect(JSON.stringify(result.leaderboardRows)).not.toMatch(/SwanCreator|SwanAthlete|IronPhoenix|CoreCrusher/i);
  });

  it('returns no active challenge when API data is marked demo data', () => {
    expect(selectActiveChallengeSummary({
      isDemoData: true,
      challenges: [{ id: 'demo', status: 'active', title: 'Demo Challenge' }],
    })).toBeNull();
  });

  it('uses real live events or real feed posts for activity but returns empty when both are absent', () => {
    expect(buildHomeLiveActivity({ events: [], feedPosts: [], displayName: 'Sean' })).toEqual([]);

    expect(buildHomeLiveActivity({
      events: [{ id: 'evt-1', type: 'workout_completed', userName: 'Client A', createdAt: new Date().toISOString() }],
      feedPosts: [],
      displayName: 'Sean',
    })[0]).toMatchObject({ id: 'evt-1', user: 'Client A', action: 'completed a workout', source: 'live' });
  });

  it('renders an honest empty leaderboard CTA in the right rail instead of a silent blank panel', () => {
    expect(RIGHT_RAIL_SOURCE).toContain('No leaderboard entries yet. Log a workout, join a challenge, or share honest progress to start the board.');
    expect(RIGHT_RAIL_SOURCE).toContain('Find a Challenge');
    expect(RIGHT_RAIL_SOURCE).not.toContain('SwanCreator');
    expect(RIGHT_RAIL_SOURCE).not.toContain('current-user');
  });
});
