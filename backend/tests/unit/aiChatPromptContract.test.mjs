/**
 * aiChatPromptContract.test.mjs
 * ==============================
 * Locks Swan Coach onto the structured proposal contract. The model prepares
 * drafts; deterministic backend services own approval and final writes.
 */
import { describe, expect, it } from 'vitest';
import {
  enrichWithUserData,
  getCoachClientProfileSessionsLabel,
  getCoachClientProfileSourceLabel,
  getCoachRosterClientSessionsLabel,
  getCoachRosterClientSourceLabel,
  getSystemPrompt,
} from '../../services/aiChatService.mjs';
import { readFileSync } from 'node:fs';

function createPromptSequelize({ roster = [], workoutPlans = [] } = {}) {
  return {
    QueryTypes: { SELECT: 'SELECT' },
    async query(sql) {
      if (sql.includes('FROM client_trainer_assignments cta') && sql.includes('JOIN "Users" u')) {
        return roster;
      }
      if (sql.includes('FROM workout_plans')) {
        return workoutPlans;
      }
      if (sql.includes('SELECT "firstName", "lastName", email, phone FROM "Users"')) {
        return [{
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          phone: '555-111-2222',
        }];
      }
      if (sql.includes('FROM "Users" WHERE id = :userId LIMIT 1')) {
        return [{
          role: 'client',
          createdAt: '2026-01-01T00:00:00.000Z',
          fitnessGoal: 'Build strength',
          weight: 180,
          height: '5ft 10in',
          dateOfBirth: '1990-01-01',
          gender: 'Not specified',
          trainingExperience: 'intermediate',
          availableSessions: 6,
          clientSource: 'swanstudios',
          accountStatus: 'active',
        }];
      }
      return [];
    },
  };
}

describe('Swan Coach prompt contract', () => {
  it('teaches admin Coach to emit structured approval proposals', () => {
    const prompt = getSystemPrompt('admin', 'coach_assistant', 'concise');

    expect(prompt).toContain('coach_action_proposal');
    expect(prompt).toContain('schema_version');
    expect(prompt).toContain('proposal_type');
    expect(prompt).toContain('evidence_refs');
    expect(prompt).toContain('safety_flags');
    expect(prompt).toContain('deterministic approval');
    expect(prompt).toContain('Do not emit legacy create_client');
  });

  it('teaches command-center onboarding prompts every supported client-source policy', () => {
    const prompt = getSystemPrompt('admin', 'coach_assistant', 'concise');

    expect(prompt).toContain('swanstudios');
    expect(prompt).toContain('move_fitness');
    expect(prompt).toContain('external');
    expect(prompt).toContain('free-tracking');
    expect(prompt).toContain('No session deduction');
    expect(prompt).toContain('move_fitness|external|swanstudios');
  });

  it('teaches workout-log proposals to mark historical backfills with a source', () => {
    const prompt = getSystemPrompt('admin', 'coach_assistant', 'concise');

    expect(prompt).toContain('source: "historical_import"');
    expect(prompt).toContain('source: "move_fitness_historical_import"');
    expect(prompt).toContain('AI-estimated historical filler');
  });

  it('teaches trainer Coach the same structured proposal contract', () => {
    const prompt = getSystemPrompt('trainer', 'coach_assistant', 'concise');

    expect(prompt).toContain('coach_action_proposal');
    expect(prompt).toContain('trainer approval required');
    expect(prompt).toContain('Final writes belong to deterministic backend services');
  });

  it('anchors proposal drafting to NASM OPT while allowing standards cross-checks', () => {
    const prompt = getSystemPrompt('admin', 'coach_assistant', 'concise');

    expect(prompt).toContain('NASM');
    expect(prompt).toContain('OPT');
    expect(prompt).toContain('Never invent NASM OPT phases');
    expect(prompt).toContain('Apply NASM credential domains');
    expect(prompt).toContain('Cross-check the plan against ACSM');
    expect(prompt.indexOf('Apply NASM credential domains')).toBeLessThan(
      prompt.indexOf('Cross-check the plan against ACSM')
    );
    expect(prompt).not.toContain('American College of Sports Medicine');
  });

  it('removes legacy positive write-action instructions from privileged Coach prompts', () => {
    for (const role of ['admin', 'trainer']) {
      const prompt = getSystemPrompt(role, 'coach_assistant', 'concise');

      expect(prompt).not.toContain('generate a create_client action block');
      expect(prompt).not.toContain('"action": "create_client"');
      expect(prompt).not.toContain('generate import_workout_log action blocks');
      expect(prompt).not.toContain('"action": "import_workout_log"');
      expect(prompt).toContain('use a coach_action_proposal block');
      expect(prompt).not.toContain('FULL read-write access');
      if (role === 'admin') {
        expect(prompt).toContain('proposal-preparation access');
      }
    }
  });

  it('keeps dedicated onboarding prompts on review-gated client onboarding proposals', () => {
    for (const role of ['admin', 'trainer']) {
      const prompt = getSystemPrompt(role, 'client_onboarding', 'concise');

      expect(prompt).toContain('coach_action_proposal');
      expect(prompt).toContain('"proposal_type": "client_onboarding"');
      expect(prompt).toContain('trainingGoal');
      expect(prompt).toContain('limitations');
      expect(prompt).toContain('painNotes');
      expect(prompt).toContain('equipmentAccess');
      expect(prompt).toContain('availability');
      expect(prompt).toContain('firstSessionPriorities');
      expect(prompt).not.toContain('ONBOARD_CLIENT_INTENT');
      expect(prompt).not.toContain('"action": "ONBOARD_CLIENT"');
      expect(prompt).not.toContain('generateClaimCode');
      expect(prompt).not.toContain('generates a code/URL');
    }
  });

  it('teaches dedicated onboarding prompts all supported client-source policies', () => {
    for (const role of ['admin', 'trainer']) {
      const prompt = getSystemPrompt(role, 'client_onboarding', 'concise');

      expect(prompt).toContain('clientSource');
      expect(prompt).toContain('move_fitness');
      expect(prompt).toContain('external');
      expect(prompt).toContain('swanstudios');
      expect(prompt).toContain('move_fitness|external|swanstudios');
      expect(prompt).toContain('free-tracking');
      expect(prompt).toContain('No session deduction');
      expect(prompt).not.toContain('clientSource": "move_fitness|swanstudios"');
      expect(prompt).not.toContain('Move Fitness clients should remain 0 unless policy changes');
    }
  });

  it('does not inject proposal instructions into normal client chat', () => {
    const prompt = getSystemPrompt('client', 'general', 'concise');

    expect(prompt).not.toContain('coach_action_proposal');
    expect(prompt).not.toContain('Do not emit legacy create_client');
  });

  it('describes external roster clients as free tracking without stale paid-session inventory', () => {
    expect(getCoachRosterClientSourceLabel('external')).toBe(' [External - FREE TRACKING]');
    expect(getCoachRosterClientSourceLabel(' External ')).toBe(' [External - FREE TRACKING]');
    expect(getCoachRosterClientSessionsLabel({
      clientSource: 'external',
      availableSessions: 12,
    })).toBe('free tracking/no paid-session deduction');
  });

  it('describes human-formatted Move Fitness source values as free tracking in Coach context', () => {
    expect(getCoachRosterClientSourceLabel(' Move Fitness ')).toBe(' [Move Fitness - FREE TRACKING]');
    expect(getCoachClientProfileSourceLabel('move-fitness')).toBe(
      'Move Fitness (free tracking - no billing, session packages, or SwanStudios pricing discussion)'
    );
  });

  it('keeps SwanStudios roster clients on paid session inventory labels', () => {
    expect(getCoachRosterClientSourceLabel('swanstudios')).toBe(' [SwanStudios - PAID]');
    expect(getCoachRosterClientSessionsLabel({
      clientSource: 'swanstudios',
      availableSessions: 7,
    })).toBe('7 sessions');
    expect(getCoachRosterClientSessionsLabel({
      clientSource: 'swanstudios',
      availableSessions: 7.8,
    })).toBe('7 sessions');
    expect(getCoachRosterClientSessionsLabel({
      clientSource: 'swanstudios',
      availableSessions: 'unknown',
    })).toBe('0 sessions');
  });

  it('keeps selected external client profiles out of paid session context', () => {
    expect(getCoachClientProfileSourceLabel('external')).toBe(
      'External (free tracking - no billing, session packages, or SwanStudios pricing discussion)'
    );
    expect(getCoachClientProfileSourceLabel(' External ')).toBe(
      'External (free tracking - no billing, session packages, or SwanStudios pricing discussion)'
    );
    expect(getCoachClientProfileSessionsLabel({
      clientSource: 'external',
      availableSessions: 11,
    })).toBe('Free tracking/no paid-session deduction');
  });

  it('normalizes SwanStudios selected-client session inventory before injecting Coach context', () => {
    expect(getCoachClientProfileSessionsLabel({
      clientSource: 'swanstudios',
      availableSessions: 9.6,
    })).toBe('9');
    expect(getCoachClientProfileSessionsLabel({
      clientSource: 'swanstudios',
      availableSessions: 'unknown',
    })).toBe('0');
  });

  it('keeps trainer assigned-client roster identity-blind in Coach enrichment', async () => {
    const context = await enrichWithUserData(
      7,
      'trainer',
      'coach_assistant',
      createPromptSequelize({
        roster: [{
          id: 42,
          firstName: 'Jane',
          lastName: 'Doe',
          availableSessions: 8,
          fitnessGoal: 'Build strength',
          clientSource: 'move_fitness',
          accountStatus: 'active',
          assignmentStatus: 'active',
          totalWorkouts: 12,
          lastWorkoutDate: '2026-06-01T00:00:00.000Z',
        }],
      })
    );

    expect(context).toContain('Client #42');
    expect(context).toContain('Move Fitness - FREE TRACKING');
    expect(context).toContain('Use Client #ID');
    expect(context).not.toContain('Jane');
    expect(context).not.toContain('Doe');
    expect(context).not.toContain('match to the client roster above');
  });

  it('does not retain the legacy active-plan title fallback in Coach enrichment source', () => {
    const source = readFileSync(new URL('../../services/aiChatService.mjs', import.meta.url), 'utf8');

    expect(source).not.toContain('Plan: "${plan.title}"');
  });
});
