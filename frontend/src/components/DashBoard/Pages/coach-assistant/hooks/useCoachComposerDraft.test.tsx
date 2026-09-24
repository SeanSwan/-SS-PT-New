/**
 * Regression (v2 P1.4): composer drafts survive interruptions per thread key
 * and clear when the text is sent (composer empties).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCoachComposerDraft, coachDraftKey } from './useCoachComposerDraft';
import type { PublicationBinding, PublicationSnapshot } from '../../../../../hooks/coachPublicationScope';

describe('useCoachComposerDraft', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('saves a debounced draft and clears it when the composer empties', () => {
    let text = 'log bench for 84';
    const setText = vi.fn();
    const { rerender } = renderHook(({ value }) => useCoachComposerDraft(7, value, setText), {
      initialProps: { value: text },
    });
    act(() => vi.advanceTimersByTime(500));
    expect(window.sessionStorage.getItem(coachDraftKey(7))).toBe('log bench for 84');

    text = '';
    rerender({ value: text });
    act(() => vi.advanceTimersByTime(500));
    expect(window.sessionStorage.getItem(coachDraftKey(7))).toBeNull();
  });

  it('restores a saved draft into an empty composer on mount, never over typed text', () => {
    window.sessionStorage.setItem(coachDraftKey('new'), 'draft text');
    const setText = vi.fn();
    renderHook(() => useCoachComposerDraft(null, '', setText));
    const updater = setText.mock.calls[0][0] as (c: string) => string;
    expect(updater('')).toBe('draft text');
    expect(updater('already typing')).toBe('already typing');
  });
});

/* ============================================================================
 * Plan 55 C4 (G04BC-R05, G04BC-T14) — the composer draft store is keyed
 * actor:client:thread, but the KEY is only as good as the admission that
 * produced the client. While the mounted Coach holds a live publication
 * binding that does not admit (actor, client), the composer must neither
 * restore a stored draft into the shared textarea nor write the textarea's
 * contents into the tab store. Each assertion is paired with an admitted
 * control so a blanket deny cannot pass.
 * ========================================================================= */

const COMPOSER_ACTOR = 7;
const COMPOSER_CLIENT = 84;
const COMPOSER_SCOPE = { actorId: COMPOSER_ACTOR, clientId: COMPOSER_CLIENT };

function composerSnapshot(overrides: Partial<PublicationSnapshot> = {}): PublicationSnapshot {
  return Object.freeze({
    actorId: COMPOSER_ACTOR,
    rawRole: 'trainer',
    audienceRole: 'client',
    generation: 1,
    targetUserId: COMPOSER_CLIENT,
    threadId: null,
    enabled: true,
    ...overrides,
  });
}

function composerBinding(getSnapshot: () => PublicationSnapshot | null): PublicationBinding {
  return { getSnapshot };
}

describe('useCoachComposerDraft admission boundary (plan 55 C4)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('does not restore a stored draft into the composer while the selection is not admitted', () => {
    window.sessionStorage.setItem(coachDraftKey(null, COMPOSER_SCOPE), 'draft text');
    const setText = vi.fn();

    renderHook(() => useCoachComposerDraft(null, '', setText, {
      ...COMPOSER_SCOPE,
      binding: composerBinding(() => composerSnapshot({ enabled: false })),
    }));

    expect(setText).not.toHaveBeenCalled();
  });

  it('CONTROL: restores the same stored draft when the selection IS admitted', () => {
    window.sessionStorage.setItem(coachDraftKey(null, COMPOSER_SCOPE), 'draft text');
    const setText = vi.fn();

    renderHook(() => useCoachComposerDraft(null, '', setText, {
      ...COMPOSER_SCOPE,
      binding: composerBinding(() => composerSnapshot()),
    }));

    expect(setText).toHaveBeenCalledTimes(1);
    const updater = setText.mock.calls[0][0] as (c: string) => string;
    expect(updater('')).toBe('draft text');
  });

  it('does not write the composer into the tab store while the selection is not admitted', () => {
    const setText = vi.fn();

    renderHook(({ value }) => useCoachComposerDraft(null, value, setText, {
      ...COMPOSER_SCOPE,
      binding: composerBinding(() => composerSnapshot({ enabled: false })),
    }), { initialProps: { value: 'private note about the client' } });
    act(() => vi.advanceTimersByTime(500));

    expect(window.sessionStorage.getItem(coachDraftKey(null, COMPOSER_SCOPE))).toBeNull();
  });

  it('CONTROL: writes the same composer text once the selection IS admitted', () => {
    const setText = vi.fn();

    renderHook(({ value }) => useCoachComposerDraft(null, value, setText, {
      ...COMPOSER_SCOPE,
      binding: composerBinding(() => composerSnapshot()),
    }), { initialProps: { value: 'private note about the client' } });
    act(() => vi.advanceTimersByTime(500));

    expect(window.sessionStorage.getItem(coachDraftKey(null, COMPOSER_SCOPE))).toBe('private note about the client');
  });

  it('resumes restore and persistence once the same scope is admitted again (not a permanent lock)', () => {
    window.sessionStorage.setItem(coachDraftKey(null, COMPOSER_SCOPE), 'draft text');
    const live = { current: composerSnapshot({ enabled: false }) as PublicationSnapshot | null };
    const setText = vi.fn();

    const { rerender } = renderHook(({ tick }: { tick: number }) => {
      void tick;
      return useCoachComposerDraft(null, '', setText, {
        ...COMPOSER_SCOPE,
        binding: composerBinding(() => live.current),
      });
    }, { initialProps: { tick: 0 } });

    expect(setText).not.toHaveBeenCalled();

    live.current = composerSnapshot({ generation: 2 });
    rerender({ tick: 1 });

    expect(setText).toHaveBeenCalledTimes(1);
    const updater = setText.mock.calls[0][0] as (c: string) => string;
    expect(updater('')).toBe('draft text');
  });
});
