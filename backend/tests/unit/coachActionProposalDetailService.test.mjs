/**
 * coachActionProposalDetailService.test.mjs
 * =========================================
 * Regression coverage for proposal detail sanitization before UI review.
 */
import { describe, expect, it } from 'vitest';
import { sanitizeProposalDetail } from '../../services/ai/coachActionProposalDetailService.mjs';

describe('coachActionProposalDetailService', () => {
  it('withholds unsafe split-plan evidence refs before review details reach the UI', () => {
    const detail = sanitizeProposalDetail({
      row: { proposal_type: 'split_plan' },
      proposal: {
        payload: {
          proposalMeta: { evidenceRefs: ['seg_04'], safetyFlags: [] },
          splits: [
            {
              title: 'Morning lower body',
              date: '2026-05-05',
              evidenceRefs: ['clip_1_meta', 'client sean phone 555-0101'],
              rawTranscript: 'do not send this to the UI',
            },
          ],
        },
      },
    });

    expect(detail.splitPlan.splits[0]).toMatchObject({
      title: 'Morning lower body',
      date: '2026-05-05',
      evidenceRefs: ['clip_1_meta'],
      redactedEvidenceRefCount: 1,
    });
    expect(JSON.stringify(detail)).not.toContain('555-0101');
    expect(JSON.stringify(detail)).not.toContain('rawTranscript');
  });

  it('does not coerce malformed workout or client-data detail IDs', () => {
    const workoutDetail = sanitizeProposalDetail({
      row: { proposal_type: 'workout_log' },
      proposal: {
        payload: {
          clientId: ' 42',
          date: '2026-05-05',
          exercises: [{ name: 'Squat' }],
        },
        targetUserId: null,
      },
    });
    const updateDetail = sanitizeProposalDetail({
      row: { proposal_type: 'client_data_update' },
      proposal: {
        payload: {
          targetUserId: ' 42',
          updates: [{ field: 'trainingNotes', value: 'Keep current plan.' }],
        },
        targetUserId: null,
      },
    });

    expect(workoutDetail.workout.clientId).toBeNull();
    expect(updateDetail.clientDataUpdate.clientId).toBeNull();
  });
});
