import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CoachSessionDraftProvider } from './CoachSessionDraftContext';
import { useCoachSessionDraft } from './useCoachSessionDraft';
import { useCoachWorkoutDraftSubmit } from './useCoachWorkoutDraftSubmit';
import { createCoachWorkoutDraft } from '../../../../services/coachProposalService';

vi.mock('../../../../services/coachProposalService', () => ({
  createCoachWorkoutDraft: vi.fn(),
}));

const createDraft = vi.mocked(createCoachWorkoutDraft);

describe('G04b submitted workout transport', () => {
  it('reuses the frozen request envelope for a transport retry', async () => {
    createDraft.mockResolvedValue({ success: true, intentId: 'intent-1', proposalId: 'proposal-1', idempotent: false });
    const wrapper = ({ children }: { children: ReactNode }) => createElement(
      CoachSessionDraftProvider,
      { actorId: 7, actorRole: 'trainer', children },
    );
    const { result } = renderHook(() => ({ draft: useCoachSessionDraft(), submit: useCoachWorkoutDraftSubmit() }), { wrapper });
    let scope: string | null = null;
    act(() => { scope = result.current.draft.begin(42, 'workout'); });
    act(() => {
      result.current.draft.edit(scope as string, 0, {
        content: {
          date: '2026-09-08',
          exercises: [{ exerciseInstanceId: 'instance-1', exerciseId: '33333333-3333-4333-8333-333333333333', exerciseName: 'Back Squat', unit: 'lb', sets: [{ setNumber: 1, reps: 5, weight: 135 }] }],
        },
      });
    });
    act(() => {
      result.current.draft.freezeForSubmit(scope as string, 1);
    });
    await act(async () => {
      await result.current.submit.submit();
      await result.current.submit.submit();
    });
    expect(createDraft).toHaveBeenCalledTimes(2);
    expect(createDraft.mock.calls[0]?.[0]).toEqual(createDraft.mock.calls[1]?.[0]);
    expect(createDraft.mock.calls[0]?.[0]).toMatchObject({ requestKey: expect.any(String), draftRevision: 1, targetUserId: 42 });
  });
});
