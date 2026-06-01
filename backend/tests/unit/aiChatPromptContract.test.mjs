/**
 * aiChatPromptContract.test.mjs
 * ==============================
 * Locks Swan Coach onto the structured proposal contract. The model prepares
 * drafts; deterministic backend services own approval and final writes.
 */
import { describe, expect, it } from 'vitest';
import {
  getCoachClientProfileSessionsLabel,
  getCoachClientProfileSourceLabel,
  getCoachRosterClientSessionsLabel,
  getCoachRosterClientSourceLabel,
  getSystemPrompt,
} from '../../services/aiChatService.mjs';

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

  it('teaches trainer Coach the same structured proposal contract', () => {
    const prompt = getSystemPrompt('trainer', 'coach_assistant', 'concise');

    expect(prompt).toContain('coach_action_proposal');
    expect(prompt).toContain('trainer approval required');
    expect(prompt).toContain('Final writes belong to deterministic backend services');
  });

  it('anchors proposal drafting to NASM OPT instead of ACSM assumptions', () => {
    const prompt = getSystemPrompt('admin', 'coach_assistant', 'concise');

    expect(prompt).toContain('NASM');
    expect(prompt).toContain('OPT');
    expect(prompt).toContain('Never invent NASM OPT phases');
    expect(prompt).not.toContain('ACSM');
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
    expect(getCoachRosterClientSessionsLabel({
      clientSource: 'external',
      availableSessions: 12,
    })).toBe('free tracking/no paid-session deduction');
  });

  it('keeps SwanStudios roster clients on paid session inventory labels', () => {
    expect(getCoachRosterClientSourceLabel('swanstudios')).toBe(' [SwanStudios - PAID]');
    expect(getCoachRosterClientSessionsLabel({
      clientSource: 'swanstudios',
      availableSessions: 7,
    })).toBe('7 sessions');
  });

  it('keeps selected external client profiles out of paid session context', () => {
    expect(getCoachClientProfileSourceLabel('external')).toBe(
      'External (free tracking - no billing, session packages, or SwanStudios pricing discussion)'
    );
    expect(getCoachClientProfileSessionsLabel({
      clientSource: 'external',
      availableSessions: 11,
    })).toBe('Free tracking/no paid-session deduction');
  });
});
