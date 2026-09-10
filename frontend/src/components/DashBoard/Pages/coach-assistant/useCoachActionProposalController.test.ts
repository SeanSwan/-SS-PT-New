import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCoachActionProposalController } from './useCoachActionProposalController';
import type { CoachActionProposal } from './SwanCoachTypes';

const proposal = { id: 'proposal-1', type: 'workout_log', status: 'PENDING', summary: {} } as CoachActionProposal;

describe('useCoachActionProposalController', () => {
  it('preserves the existing proposal-card display contract', () => {
    const { result } = renderHook(() => useCoachActionProposalController({
      proposal,
      locationPathname: '/dashboard/trainer/coach-assistant',
    }));
    expect(result.current.approveLabel).toBe('Approve and log');
    expect(result.current.status).toBe('PENDING');
    expect(result.current.rows[0]).toEqual(['Type', expect.any(String)]);
    expect(typeof result.current.runApprove).toBe('function');
    expect(typeof result.current.runReject).toBe('function');
  });
});
