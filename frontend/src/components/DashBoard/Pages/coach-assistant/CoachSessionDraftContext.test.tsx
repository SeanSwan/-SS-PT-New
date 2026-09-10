import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CoachSessionDraftProvider } from './CoachSessionDraftContext';
import { useCoachSessionDraft } from './useCoachSessionDraft';

const wrapper = ({ children }: { children: ReactNode }) => (
  <CoachSessionDraftProvider actorId="42" actorRole="trainer">{children}</CoachSessionDraftProvider>
);

describe('CoachSessionDraftProvider', () => {
  it('exposes one shared shell-lifetime owner with no persistence boundary', () => {
    const { result } = renderHook(() => useCoachSessionDraft(), { wrapper });
    let token: string | null = null;
    act(() => { token = result.current.begin(7, 'talk'); });
    expect(token).toBeTruthy();
    expect(result.current.draft?.targetUserId).toBe(7);
    expect(result.current.draft?.actorId).toBe(42);
    expect(result.current.submitted).toBeNull();
  });

  it('fails closed without an authenticated actor', () => {
    const noActorWrapper = ({ children }: { children: ReactNode }) => (
      <CoachSessionDraftProvider actorId={null} actorRole={null}>{children}</CoachSessionDraftProvider>
    );
    const { result } = renderHook(() => useCoachSessionDraft(), { wrapper: noActorWrapper });
    expect(result.current.begin(7, 'talk')).toBeNull();
    expect(result.current.draft).toBeNull();
  });
});
