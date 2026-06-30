import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const loggerSource = read('src/components/WorkoutLogger/WorkoutLogger.tsx');
const workoutsPageSource = read('src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsPage.tsx');

describe('WorkoutLogger challenge receipt source wiring', () => {
  it('keeps the receipt on logger flows that do not navigate away', () => {
    expect(loggerSource).toContain("import WorkoutLoggerChallengeReceipt from './WorkoutLoggerChallengeReceipt'");
    expect(loggerSource).toContain('lastChallengeProgress');
    expect(loggerSource).toContain('setLastChallengeProgress(response.data.challengeProgress ?? null)');
    expect(loggerSource).toContain('<WorkoutLoggerChallengeReceipt progress={lastChallengeProgress} />');
  });

  it('carries the same backend challengeProgress receipt through client self-route navigation', () => {
    expect(loggerSource).toMatch(/navigate\('\/dashboard\/client\/workouts'[\s\S]*?workoutChallengeProgress:\s*formData\.challengeProgress/);
    expect(workoutsPageSource).toContain('useLocation');
    expect(workoutsPageSource).toContain('workoutChallengeProgress');
    expect(workoutsPageSource).toContain('<WorkoutLoggerChallengeReceipt progress={workoutChallengeProgress} />');
  });
});
