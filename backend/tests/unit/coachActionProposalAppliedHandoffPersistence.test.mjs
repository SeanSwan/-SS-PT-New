/**
 * coachActionProposalAppliedHandoffPersistence.test.mjs
 * ====================================================
 * Locks applied Coach onboarding proposal receipts to the stored access handoff.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  loadOwnedProposal,
  mapProposalRow,
} from '../../services/ai/coachActionProposalPersistenceService.mjs';

const appliedOnboardingRow = {
  id: '22222222-2222-2222-2222-222222222222',
  created_by_user_id: 7,
  proposal_type: 'client_onboarding',
  status: 'APPLIED',
  summary_json: { title: 'Review client onboarding draft' },
  created_at: '2026-06-30T12:00:00.000Z',
  applied_result_json: {
    client: { id: 88, firstName: 'Norma', lastName: 'Patton' },
    accessHandoff: {
      credentialMode: 'claim_link_ready',
      claimCode: 'SWAN-ABCD2345',
      claimUrl: 'https://sswanstudios.com/claim/SWAN-ABCD2345',
      claimExpiresAt: '2026-07-28T12:00:00.000Z',
    },
  },
};

describe('coach action proposal applied access handoff persistence', () => {
  it('selects and maps stored claim-link handoff data for applied onboarding receipts', async () => {
    const db = {
      query: vi.fn(async () => [appliedOnboardingRow]),
    };

    const row = await loadOwnedProposal({
      id: appliedOnboardingRow.id,
      userId: appliedOnboardingRow.created_by_user_id,
      db,
    });
    const sql = db.query.mock.calls[0][0];
    const mapped = mapProposalRow(row);

    expect(sql).toContain('applied_result_json');
    expect(mapped).toMatchObject({
      id: appliedOnboardingRow.id,
      status: 'APPLIED',
      client: appliedOnboardingRow.applied_result_json.client,
      accessHandoff: appliedOnboardingRow.applied_result_json.accessHandoff,
    });
  });
});