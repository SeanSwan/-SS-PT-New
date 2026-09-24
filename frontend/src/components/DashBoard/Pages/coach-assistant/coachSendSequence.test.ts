/**
 * brain-v4 hostile review #4: a client switch or re-admission aborted an in-flight
 * send WITHOUT superseding it, so its refusal notice landed in the new scope with
 * the previous client's words (restored, with Retry). A scope change supersedes.
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { beginCoachSend, isLatestCoachSend, useSupersedeCoachSendsOnScope } from './coachSendSequence';

describe('useSupersedeCoachSendsOnScope', () => {
  it('a scope change supersedes the send in flight', () => {
    const key = {};
    const { rerender } = renderHook(({ scope }) => useSupersedeCoachSendsOnScope(key, scope), { initialProps: { scope: '12:1' } });
    const token = beginCoachSend(key);
    rerender({ scope: '14:2' });
    expect(isLatestCoachSend(key, token)).toBe(false);
  });

  it('CONTROL: mount and same-scope renders do not supersede', () => {
    const key = {};
    const token = beginCoachSend(key);
    const { rerender } = renderHook(({ scope }) => useSupersedeCoachSendsOnScope(key, scope), { initialProps: { scope: '12:1' } });
    rerender({ scope: '12:1' });
    expect(isLatestCoachSend(key, token)).toBe(true);
  });
});
