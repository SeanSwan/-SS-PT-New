import { describe, expect, it } from 'vitest';
import { classifyActionBlock } from '../../services/ai/coachActionProposalClassifier.mjs';
import { COACH_PROPOSAL_TYPE } from '../../services/ai/coachActionProposalService.mjs';

describe('coachActionProposalClassifier client onboarding payloads', () => {
  it('passes broad onboarding data while normalizing ask-client-later coverage statuses', () => {
    const result = classifyActionBlock({
      action: 'coach_action_proposal',
      schema_version: '2026-05-07',
      proposal_type: 'client_onboarding',
      evidence_refs: ['seg_01'],
      safety_flags: ['trainer_approval_required'],
      payload: {
        firstName: 'Nia',
        lastName: 'Price',
        clientSource: 'move_fitness',
        communicationStyle: 'direct and encouraging',
        nutritionPrefs: { allergies: ['shellfish'] },
        questionnaireResponses: { primaryGoal: 'Build consistency' },
        coverageUpdates: [
          { fieldKey: 'health_concerns', status: 'ask_client_later', category: 'health_injury_risk' },
          { fieldKey: 'equipment_access', status: 'known', value: 'Move Fitness' },
        ],
      },
    }, { targetUserId: null }, {
      proposalTypes: COACH_PROPOSAL_TYPE,
      schemaVersion: '2026-05-07',
    });

    expect(result.type).toBe(COACH_PROPOSAL_TYPE.CLIENT_ONBOARDING);
    expect(result.payload.communicationStyle).toBe('direct and encouraging');
    expect(result.payload.nutritionPrefs).toEqual({ allergies: ['shellfish'] });
    expect(result.payload.questionnaireResponses.primaryGoal).toBe('Build consistency');
    expect(result.payload.coverageUpdates[0].status).toBe('client_requested');
    expect(result.payload.proposalMeta.evidenceRefs).toEqual(['seg_01']);
  });
});
