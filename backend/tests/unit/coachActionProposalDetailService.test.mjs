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
});
