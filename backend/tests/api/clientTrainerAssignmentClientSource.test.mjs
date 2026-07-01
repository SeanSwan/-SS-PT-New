import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = readFileSync(
  resolve(__dirname, '../../routes/clientTrainerAssignmentRoutes.mjs'),
  'utf8'
);

describe('client trainer assignment clientSource contract', () => {
  it('returns clientSource with assigned client rows so UI can distinguish paid vs free-tracking clients', () => {
    const clientAttributeLists = source.match(/attributes:\s*\[[^\]]*'availableSessions'[^\]]*\]/g) || [];

    expect(clientAttributeLists.length).toBeGreaterThanOrEqual(4);
    for (const list of clientAttributeLists) {
      expect(list).toContain("'clientSource'");
    }
  });

  it('returns trainer card profile facts that already exist on the User model', () => {
    const trainerClientRouteStart = source.indexOf("router.get('/trainer/:trainerId'");
    const trainerClientRouteEnd = source.indexOf("router.get('/client/:clientId'");
    const trainerClientRoute = source.slice(trainerClientRouteStart, trainerClientRouteEnd);

    expect(trainerClientRouteStart).toBeGreaterThan(-1);
    expect(trainerClientRouteEnd).toBeGreaterThan(trainerClientRouteStart);
    expect(trainerClientRoute).toContain("'fitnessGoal'");
    expect(trainerClientRoute).toContain("'trainingExperience'");
    expect(trainerClientRoute).toContain("'accountStatus'");
    expect(trainerClientRoute).toContain("'forcePasswordChange'");
  });

  it('derives onboarding readiness for trainer client cards without relying on a fake model column', () => {
    expect(source).toContain('calculateCompletionPercentage');
    expect(source).toContain('ClientOnboardingQuestionnaire');
    expect(source).toContain('onboardingCompletionPercentage');
    expect(source).toContain('responsesJson');
    expect(source).not.toContain("'completionPercentage'");
  });
});
