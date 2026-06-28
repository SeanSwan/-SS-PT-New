/**
 * coachProfileCoverageProposalType.test.mjs
 * =========================================
 * Source and classifier guards for P4 existing-client profile coverage updates.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COACH_PROPOSAL_TYPE } from '../../services/ai/coachActionProposalService.mjs';
import { classifyActionBlock } from '../../services/ai/coachActionProposalClassifier.mjs';
import { appendCoachActionProposalContract } from '../../services/ai/coachActionProposalPromptContract.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const src = (path) => readFileSync(resolve(__dirname, path), 'utf8');

const APPROVAL_SRC = src('../../services/ai/coachActionProposalApprovalService.mjs');
const DETAIL_SRC = src('../../services/ai/coachActionProposalDetailService.mjs');
const TOKEN_SRC = src('../../services/ai/coachProposalReviewTokenService.mjs');
const MIGRATION_SRC = src('../../migrations/20260628073000-add-client-profile-coverage-proposal-type.cjs');

describe('client_profile_coverage_update proposal type', () => {
  it('is exposed to Coach prompt, classifier, review gate, detail sanitizer, approval service, and DB constraint', () => {
    const prompt = appendCoachActionProposalContract('BEHAVIOR:\nCoach behavior copy.', {
      role: 'trainer',
      context: 'client_onboarding',
    });

    expect(COACH_PROPOSAL_TYPE.CLIENT_PROFILE_COVERAGE_UPDATE).toBe('client_profile_coverage_update');
    expect(prompt).toContain('client_profile_coverage_update');
    expect(TOKEN_SRC).toMatch(/client_profile_coverage_update/);
    expect(DETAIL_SRC).toMatch(/profileCoverageUpdate/);
    expect(APPROVAL_SRC).toMatch(/approveClientProfileCoverageUpdateProposal/);
    expect(MIGRATION_SRC).toMatch(/client_profile_coverage_update/);
  });

  it('classifies existing-client profile coverage payloads without client creation', () => {
    const result = classifyActionBlock({
      action: 'coach_action_proposal',
      schema_version: '2026-05-07',
      proposal_type: 'client_profile_coverage_update',
      evidence_refs: ['seg_03'],
      safety_flags: ['trainer_approval_required'],
      payload: {
        clientId: 42,
        profileFields: { fitnessGoal: 'Build strength' },
        questionnaireResponses: { primaryGoal: 'Build strength' },
        coverageUpdates: [{ key: 'health_concerns', status: 'ask_client_later' }],
      },
    }, { targetUserId: 42 }, {
      proposalTypes: COACH_PROPOSAL_TYPE,
      schemaVersion: '2026-05-07',
    });

    expect(result.type).toBe(COACH_PROPOSAL_TYPE.CLIENT_PROFILE_COVERAGE_UPDATE);
    expect(result.payload.clientId).toBe(42);
    expect(result.payload.coverageUpdates[0]).toEqual(expect.objectContaining({
      fieldKey: 'health_concerns',
      coverageKey: 'health_concerns',
      status: 'client_requested',
    }));
    expect(result.payload.proposalMeta.evidenceRefs).toEqual(['seg_03']);
  });
});