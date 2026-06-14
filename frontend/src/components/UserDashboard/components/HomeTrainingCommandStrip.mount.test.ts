import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const homeSource = readFileSync(resolve(__dirname, './HomeTab.tsx'), 'utf8');

describe('HomeTrainingCommandStrip mount', () => {
  it('mounts above the creator/social grid on user Home', () => {
    const stripIndex = homeSource.indexOf('<HomeTrainingCommandStrip');
    const creatorShellIndex = homeSource.indexOf('<CreatorShell>');

    expect(stripIndex).toBeGreaterThanOrEqual(0);
    expect(creatorShellIndex).toBeGreaterThanOrEqual(0);
    expect(stripIndex).toBeLessThan(creatorShellIndex);
  });

  it('gives the Home Ask Coach action a staged training-loop prompt', () => {
    expect(homeSource).toContain("buildUserDashboardTeachCoachRoute(USER_HOME_TRAINING_PROMPT)");
    expect(homeSource).toContain('coachPath={homeTrainingCoachPath}');
    expect(homeSource).not.toContain('coachPath={getSwanCoachDashboardPath(user?.role)}');
  });
});
