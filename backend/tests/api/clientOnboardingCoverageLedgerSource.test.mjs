import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

describe('client onboarding coverage ledger source contract', () => {
  it('persists the coverage ledger with the expected statuses and uniqueness', () => {
    const modelSource = read('models/ClientOnboardingCoverageItem.mjs');
    const migrationSource = read('migrations/20260628070000-create-client-onboarding-coverage-items.cjs');
    const followUpMigrationSource = read('migrations/20260628080500-add-client-onboarding-follow-up-timestamps.cjs');

    for (const status of ['known', 'unknown', 'trainer_pending', 'client_requested', 'not_applicable', 'blocked']) {
      expect(modelSource).toContain(status);
      expect(migrationSource).toContain(status);
    }

    expect(modelSource).toContain("tableName: 'client_onboarding_coverage_items'");
    expect(modelSource).toContain("fields: ['clientId', 'coverageKey']");
    expect(migrationSource).toContain("'client_onboarding_coverage_items'");
    expect(migrationSource).toContain("['clientId', 'coverageKey']");
    expect(migrationSource).toContain('unique: true');
    expect(modelSource).toContain('requestedFromClientAt');
    expect(modelSource).toContain('resolvedAt');
    expect(followUpMigrationSource).toContain('requestedFromClientAt');
    expect(followUpMigrationSource).toContain('resolvedAt');
  });

  it('registers the model in the central model cache and associations', () => {
    const indexSource = read('models/index.mjs');
    const associationsSource = read('models/associations.mjs');

    expect(indexSource).toContain("getClientOnboardingCoverageItem = () => getModel('ClientOnboardingCoverageItem')");
    expect(associationsSource).toContain("import('./ClientOnboardingCoverageItem.mjs')");
    expect(associationsSource).toContain('onboardingCoverageItems');
    expect(associationsSource).toContain('markedOnboardingCoverageItems');
    expect(associationsSource).toContain('ClientOnboardingCoverageItem');
  });


  it('keeps client follow-up notifications in-app and sensitive-safe', () => {
    const followUpSource = read('services/clientOnboardingFollowUpNotificationService.mjs');

    expect(followUpSource).toContain("type: 'client'");
    expect(followUpSource).toContain('secure onboarding follow-up');
    expect(followUpSource).not.toContain('sendEmail');
    expect(followUpSource).not.toContain('sendSMS');
    expect(followUpSource).not.toContain('smsBody');
  });
  it('keeps workout logging independent from coverage completeness', () => {
    const workoutServiceSource = read('services/workout/aiWorkoutDailyFormService.mjs');
    const workoutDispatcherSource = read('services/ai/dispatchers/workoutLogWriteDispatcher.mjs');
    const approvalServiceSource = read('services/ai/coachActionProposalApprovalService.mjs');

    expect(workoutServiceSource).not.toContain('ClientOnboardingCoverage');
    expect(workoutServiceSource).not.toContain('clientOnboardingCoverage');
    expect(workoutDispatcherSource).not.toContain('ClientOnboardingCoverage');
    expect(workoutDispatcherSource).not.toContain('clientOnboardingCoverage');
    expect(approvalServiceSource).not.toContain('ClientOnboardingCoverage');
    expect(approvalServiceSource).not.toContain('clientOnboardingCoverage');
  });
});
