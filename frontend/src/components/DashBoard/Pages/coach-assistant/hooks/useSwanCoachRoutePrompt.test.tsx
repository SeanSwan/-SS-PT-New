import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSwanCoachRoutePrompt } from './useSwanCoachRoutePrompt';

describe('useSwanCoachRoutePrompt', () => {
  it('injects teachPrompt once for review without sending', () => {
    const injectInputText = vi.fn();
    const searchParams = new URLSearchParams({
      teachPrompt: 'teach me the client progress workflow',
    });

    const { rerender } = renderHook(
      ({ params }) => useSwanCoachRoutePrompt({ searchParams: params, injectInputText }),
      { initialProps: { params: searchParams } },
    );

    expect(injectInputText).toHaveBeenCalledWith('teach me the client progress workflow');

    rerender({ params: new URLSearchParams({ teachPrompt: 'teach me the client progress workflow' }) });
    expect(injectInputText).toHaveBeenCalledTimes(1);
  });

  it('injects router-state prompts without requiring private draft text in the URL', () => {
    const injectInputText = vi.fn();

    renderHook(() => useSwanCoachRoutePrompt({
      searchParams: new URLSearchParams(),
      routeState: { teachPrompt: "Log today's push workout and explain what changed." },
      injectInputText,
    }));

    expect(injectInputText).toHaveBeenCalledWith("Log today's push workout and explain what changed.");
  });

  it('ignores missing and blank route prompts', () => {
    const injectInputText = vi.fn();

    renderHook(() => useSwanCoachRoutePrompt({
      searchParams: new URLSearchParams({ teachPrompt: '   ' }),
      injectInputText,
    }));
    renderHook(() => useSwanCoachRoutePrompt({
      searchParams: new URLSearchParams(),
      injectInputText,
    }));

    expect(injectInputText).not.toHaveBeenCalled();
  });
});
