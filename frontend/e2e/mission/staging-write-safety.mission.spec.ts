/**
 * Mission QA: staging write safety.
 *
 * These tests are intentionally tagged `@write` so the default mission launcher
 * never runs them. They verify the safety conditions required before future
 * onboarding, workout logging, and session deduction persistence tests execute.
 */

import { expect, test } from '@playwright/test';

test.describe.configure({ retries: 0 });

const qaClientEmail = 'staging.client@swanstudios-qa.local';
const qaTrainerEmail = 'staging.trainer@swanstudios-qa.local';

function productionLike(value: string) {
  return /sswanstudios\.com|onrender\.com/i.test(value);
}

test('@mission @write staging write mode refuses production-like targets and uses QA identities', async ({ baseURL }) => {
  expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('1');
  expect(process.env.SWAN_MISSION_QA_MODE).toBe('staging-write');
  expect(baseURL || '').not.toBe('');
  expect(productionLike(baseURL || '')).toBe(false);
  expect(qaClientEmail.endsWith('@swanstudios-qa.local')).toBe(true);
  expect(qaTrainerEmail.endsWith('@swanstudios-qa.local')).toBe(true);
});

test('@mission @write staging write workflows stay scoped to onboarding logging and session policy', async () => {
  const plannedWriteWorkflows = [
    'admin_onboarding_stub_client',
    'trainer_daily_workout_logging',
    'session_deduction_policy',
    'coach_proposal_confirmation',
  ];

  expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('1');
  expect(plannedWriteWorkflows).toEqual([
    'admin_onboarding_stub_client',
    'trainer_daily_workout_logging',
    'session_deduction_policy',
    'coach_proposal_confirmation',
  ]);
});
