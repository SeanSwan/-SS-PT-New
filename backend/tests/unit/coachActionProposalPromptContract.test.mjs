/**
 * coachActionProposalPromptContract.test.mjs
 * ==========================================
 * Locks Swan Coach onboarding prompt guidance to the progress-first client
 * context that deterministic approval now preserves.
 */
import { describe, expect, it } from 'vitest';
import { appendCoachActionProposalContract } from '../../services/ai/coachActionProposalPromptContract.mjs';

describe('coachActionProposalPromptContract', () => {
  it('guides client onboarding toward progress-critical training context fields', () => {
    const prompt = appendCoachActionProposalContract(
      [
        'CLIENT CREATION (NEW CLIENT ONBOARDING):',
        'Legacy client creation copy.',
        '',
        'HISTORICAL WORKOUT LOG IMPORT:',
        'Legacy workout import copy.',
        '',
        'BEHAVIOR:',
        'Coach behavior copy.',
      ].join('\n'),
      { role: 'admin', context: 'coach_assistant' },
    );

    expect(prompt).toContain('trainingGoal');
    expect(prompt).toContain('limitations');
    expect(prompt).toContain('painNotes');
    expect(prompt).toContain('equipmentAccess');
    expect(prompt).toContain('availability');
    expect(prompt).toContain('firstSessionPriorities');
  });
});
