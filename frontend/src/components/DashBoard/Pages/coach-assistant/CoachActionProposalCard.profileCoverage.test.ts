/**
 * CoachActionProposalCard.profileCoverage.test
 * ============================================
 * P4 review-card contract for existing-client profile coverage proposals.
 */
import { describe, expect, it } from 'vitest';
import { buildDetailRows, proposalTypeLabel } from './CoachActionProposalDetailRows';

describe('client_profile_coverage_update proposal review rendering', () => {
  it('labels and summarizes existing-client profile coverage updates', () => {
    expect(proposalTypeLabel('client_profile_coverage_update')).toBe('Profile coverage update');

    const rows = buildDetailRows({
      profileCoverageUpdate: {
        clientId: 42,
        profileFields: { phone: '555-0100', fitnessGoal: 'Build strength' },
        questionnaireResponses: { primaryGoal: 'Build strength' },
        coverageUpdates: [
          { coverageKey: 'health_concerns', status: 'client_requested' },
          { coverageKey: 'nutrition_hydration', status: 'known' },
        ],
      },
      approvalGate: { confirmationMode: 'trainer_approval_required', writer: 'deterministic' },
    });
    const flat = rows.map((row) => `${row[0]}: ${row[1]}`).join('\n');

    expect(flat).toContain('Client: #42');
    expect(flat).toContain('Profile fields: 2');
    expect(flat).toContain('Questionnaire fields: 1');
    expect(flat).toContain('Coverage updates: 2 coverage updates available');
    expect(flat).toContain('Approval: Trainer approval required');
  });
});