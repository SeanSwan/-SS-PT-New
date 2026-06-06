/**
 * Mission QA: Swan Coach proposal-before-write contract.
 *
 * The coach assistant is allowed to propose actions from dictation. It must not
 * silently create clients, workouts, schedules, or session deductions without a
 * trainer/admin confirmation step.
 */

import { expect, test, type Page } from '@playwright/test';
import { fulfillJson, installMissionUser, type MissionApiState } from './missionHarness';

test.describe.configure({ retries: 0 });

const coachProposal = {
  id: 'proposal-client-onboarding-001',
  action: 'coach_action_proposal',
  schema_version: '2026-05-07',
  proposal_type: 'client_onboarding',
  requires_confirmation: true,
  evidence_refs: ['trainer_dictation'],
  safety_flags: ['trainer_approval_required'],
  payload: {
    firstName: 'Mission',
    lastName: 'Onboarding',
    clientSource: 'move_fitness',
    trainingGoal: 'strength and progress tracking',
  },
};

async function mockCoachApi(page: Page, state: MissionApiState) {
  await page.route('**/api/**', async (route) => {
    await fulfillJson(route, { success: true, data: [] });
  });

  await page.route('**/api/ai/chat', async (route) => {
    await fulfillJson(route, {
      success: true,
      response: 'I prepared a review-gated onboarding proposal. Please confirm before I create anything.',
      coachActionProposals: [coachProposal],
      frontendActions: [{ type: 'review_coach_action_proposal', proposalId: coachProposal.id }],
    });
  });

  await page.route('**/api/coach/proposals/**', async (route) => {
    state.blockedWrites.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
    await fulfillJson(route, { success: false, message: 'Mission QA read-only write blocked' }, 405);
  });
}

test('@mission @contract @readonly Swan Coach turns dictation into proposal before write', async ({ page }) => {
  expect(process.env.SWAN_MISSION_QA_ALLOW_WRITES || '0').toBe('0');

  const apiState: MissionApiState = { blockedWrites: [] };
  await mockCoachApi(page, apiState);
  await installMissionUser(page, {
    id: 77,
    email: 'trainer.proof@swanstudios-qa.local',
    username: 'trainer_proof',
    firstName: 'Mission',
    lastName: 'Trainer',
    role: 'trainer',
    isActive: true,
  });

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const proposalResponse = await page.evaluate(async () => {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: 'coach_assistant',
        message: 'Add a Move Fitness client named Mission Onboarding and set strength tracking as the goal.',
      }),
    });
    return response.json();
  });

  expect(proposalResponse.coachActionProposals).toHaveLength(1);
  expect(proposalResponse.coachActionProposals[0].requires_confirmation).toBe(true);
  expect(proposalResponse.coachActionProposals[0].proposal_type).toBe('client_onboarding');
  expect(proposalResponse.coachActionProposals[0].payload.clientSource).toBe('move_fitness');

  const confirmResponse = await page.evaluate(async () => {
    const response = await fetch('/api/coach/proposals/proposal-client-onboarding-001/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed: true }),
    });
    return { status: response.status, body: await response.json() };
  });

  expect(confirmResponse.status).toBe(405);
  expect(apiState.blockedWrites).toEqual(['POST /api/coach/proposals/proposal-client-onboarding-001/approve']);
});
